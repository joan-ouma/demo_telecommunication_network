import express from 'express';
import pool from '../database.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { logAction } from '../utils/auditLogger.js';

const router = express.Router();

// Get all faults with filtering
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { status, priority, category, component_id, technician_id, from_date, to_date } = req.query;
        const currentUserId = req.user.id;
        let query = `
      SELECT f.*,
            nc.name as component_name, nc.type as component_type,
            CONCAT(t.first_name, ' ', t.last_name) as technician_name,
            u.username as reported_by_name,
            (SELECT COUNT(*) FROM Fault_Comments fc WHERE fc.fault_id = f.fault_id) as comment_count,
    (SELECT user_id FROM Fault_Comments fc WHERE fc.fault_id = f.fault_id ORDER BY created_at DESC LIMIT 1) as last_comment_user_id
      FROM Faults f
      LEFT JOIN Network_Components nc ON f.component_id = nc.component_id
      LEFT JOIN Users t ON f.assigned_to = t.user_id
      LEFT JOIN Users u ON f.reported_by = u.user_id
      WHERE 1 = 1
    `;
        const params = [];

        if (status) {
            query += ' AND f.status = ?';
            params.push(status);
        }

        if (priority) {
            query += ' AND f.priority = ?';
            params.push(priority);
        }

        if (category) {
            query += ' AND f.category = ?';
            params.push(category);
        }

        if (component_id) {
            query += ' AND f.component_id = ?';
            params.push(component_id);
        }

        if (technician_id) {
            query += ' AND f.assigned_to = ?';
            params.push(technician_id);
        }

        if (from_date) {
            query += ' AND DATE(f.reported_at) >= ?';
            params.push(from_date);
        }

        if (to_date) {
            query += ' AND DATE(f.reported_at) <= ?';
            params.push(to_date);
        }

        // Default sort by reported date (newest first)
        query += ' ORDER BY f.reported_at DESC';

        const [faults] = await pool.query(query, params);

        res.json({
            success: true,
            data: faults,
            count: faults.length
        });
    } catch (error) {
        console.error('Get faults error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch faults'
        });
    }
});

// Get single fault
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const [faults] = await pool.query(`
      SELECT f.*,
    nc.name as component_name, nc.type as component_type, nc.location as component_location,
    CONCAT(t.first_name, ' ', t.last_name) as technician_name, t.email as technician_email, t.phone_number as technician_phone,
    u.username as reported_by_name
      FROM Faults f
      LEFT JOIN Network_Components nc ON f.component_id = nc.component_id
      LEFT JOIN Users t ON f.assigned_to = t.user_id
      LEFT JOIN Users u ON f.reported_by = u.user_id
      WHERE f.fault_id = ?
    `, [req.params.id]);

        if (faults.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Fault not found'
            });
        }

        res.json({
            success: true,
            data: faults[0]
        });
    } catch (error) {
        console.error('Get fault error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch fault'
        });
    }
});

// Create new fault report
router.post('/', authenticateToken, async (req, res) => {
    try {
        const {
            component_id, title, description, category, priority = 'Medium'
        } = req.body;

        if (!title || !category) {
            return res.status(400).json({
                success: false,
                message: 'Title and category are required'
            });
        }

        // New schema uses user_id for reported_by (which is req.user.id in our updated auth middleware logic, 
        // assuming we update the token generation to use user_id too, or mapped it).
        // Let's assume req.user.id holds the user_id.

        const [result] = await pool.query(
            `INSERT INTO Faults(component_id, reported_by, title, description, category, priority)
VALUES(?, ?, ?, ?, ?, ?)`,
            [component_id, req.user.id, title, description, category, priority]
        );

        // Update component status if it's a critical fault
        if (priority === 'Critical' && component_id) {
            await pool.query(
                "UPDATE Network_Components SET status = ? WHERE component_id = ?",
                ['Faulty', component_id]
            );
        }



        // Log fault creation
        await logAction({
            userId: req.user.id,
            action: 'CREATE_FAULT',
            entityType: 'Fault',
            entityId: result.insertId,
            details: { title, priority, status: 'Open' },
            req
        });

        res.status(201).json({
            success: true,
            message: 'Fault reported successfully',
            data: { id: result.insertId, title, priority, status: 'Open' }
        });
    } catch (error) {
        console.error('Create fault error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to report fault'
        });
    }
});

// Assign technician to fault
router.put('/:id/assign', authenticateToken, requireRole('Admin', 'Technician'), async (req, res) => {
    try {
        const { technician_id } = req.body;

        if (!technician_id) {
            return res.status(400).json({
                success: false,
                message: 'Technician ID is required'
            });
        }

        // Verify technician exists (User with role Technician)
        const [technicians] = await pool.query("SELECT user_id FROM Users WHERE user_id = ? AND role = 'Technician'", [technician_id]);
        if (technicians.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Technician not found'
            });
        }

        const [result] = await pool.query(
            `UPDATE Faults SET
assigned_to = ?,
    status = CASE WHEN status = 'Open' THEN 'In Progress' ELSE status END
       WHERE fault_id = ? `,
            [technician_id, req.params.id] // Note: Removed assigned_at update as it's not in new schema definition, but could keep if we alter table. User def didn't include it explicitly in CREATE TABLE provided, but 'reported_at', 'resolved_at' were there.
            // Wait, user provided: "assigned_to INT" ... no assigned_at in the CREATE TABLE Faults provided. So I will skip it.
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Fault not found'
            });
        }

        // Update technician status to busy - NOT APPLICABLE in new schema (no status col on Users)

        // Notify Technician
        await pool.query(
            `INSERT INTO Notifications(user_id, type, message, link)
        VALUES(?, 'fault_assigned', ?, ?)`,
            [technician_id, `You have been assigned fault FLT-${String(req.params.id).padStart(3, '0')}`, `/faults`]
        );

        res.json({
            success: true,
            message: 'Technician assigned successfully'
        });
    } catch (error) {
        console.error('Assign technician error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to assign technician'
        });
    }
});

// Update fault status
router.put('/:id/status', authenticateToken, async (req, res) => {
    try {
        const { status, resolution_notes } = req.body;
        const validStatuses = ['Open', 'In Progress', 'Resolved', 'Closed', 'Pending'];

        if (!status || !validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Valid status is required'
            });
        }

        // Get fault to calculate response time
        const [faults] = await pool.query('SELECT * FROM Faults WHERE fault_id = ?', [req.params.id]);
        if (faults.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Fault not found'
            });
        }

        const fault = faults[0];
        let responseTime = null;

        // Calculate response time when resolving
        if (status === 'Resolved' && fault.status !== 'Resolved') {
            const reportedAt = new Date(fault.reported_at);
            const now = new Date();
            responseTime = Math.round((now - reportedAt) / (1000 * 60)); // minutes
        }

        await pool.query(
            `UPDATE Faults SET
status = ?,
    resolution_notes = COALESCE(?, resolution_notes),
    resolved_at = CASE WHEN ? = 'Resolved' AND resolved_at IS NULL THEN NOW() ELSE resolved_at END,
        started_at = CASE WHEN ? = 'In Progress' AND started_at IS NULL THEN NOW() ELSE started_at END,
            response_time_minutes = COALESCE(?, response_time_minutes)
       WHERE fault_id = ? `,
            [status, resolution_notes, status, status, responseTime, req.params.id]
        );

        // Update component status
        if (status === 'Resolved' || status === 'Closed') {
            if (fault.component_id) {
                // Check if component was Faulty, set to Active
                await pool.query("UPDATE Network_Components SET status = ? WHERE component_id = ? AND status = 'Faulty'", ['Active', fault.component_id]);
            }
        }

        // Notify Reporter
        if (fault.reported_by && fault.reported_by !== req.user.id) {
            await pool.query(
                `INSERT INTO Notifications(user_id, type, message, link)
        VALUES(?, 'status_change', ?, ?)`,
                [fault.reported_by, `Fault FLT-${String(req.params.id).padStart(3, '0')} is now ${status}`, `/faults`]
            );
        }

        // Log status update
        await logAction({
            userId: req.user.id,
            action: 'UPDATE_FAULT_STATUS',
            entityType: 'Fault',
            entityId: req.params.id,
            details: { status, resolution_notes },
            req
        });

        res.json({
            success: true,
            message: 'Fault status updated successfully',
            data: { status, response_time_minutes: responseTime }
        });
    } catch (error) {
        console.error('Update fault status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update fault status'
        });
    }
});

// Schedule fault
router.put('/:id/schedule', authenticateToken, async (req, res) => {
    try {
        const { scheduled_for } = req.body;

        if (!scheduled_for) {
            return res.status(400).json({
                success: false,
                message: 'Scheduled date is required'
            });
        }

        const [result] = await pool.query(
            'UPDATE Faults SET scheduled_for = ? WHERE fault_id = ?',
            [scheduled_for, req.params.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Fault not found'
            });
        }

        res.json({
            success: true,
            message: 'Fault scheduled successfully',
            data: { scheduled_for }
        });
    } catch (error) {
        console.error('Schedule fault error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to schedule fault'
        });
    }
});

// Get fault statistics
router.get('/stats/summary', authenticateToken, async (req, res) => {
    try {
        const [byStatus] = await pool.query(`
      SELECT status, COUNT(*) as count FROM Faults GROUP BY status
    `);

        const [byPriority] = await pool.query(`
      SELECT priority, COUNT(*) as count FROM Faults GROUP BY priority
    `);

        const [byCategory] = await pool.query(`
      SELECT category, COUNT(*) as count FROM Faults GROUP BY category
    `);

        const [avgResolution] = await pool.query(`
      SELECT AVG(response_time_minutes) as avg_time 
      FROM Faults WHERE response_time_minutes IS NOT NULL
    `);

        res.json({
            success: true,
            data: {
                by_status: byStatus,
                by_priority: byPriority,
                by_category: byCategory,
                avg_resolution_time: avgResolution[0].avg_time || 0
            }
        });
    } catch (error) {
        console.error('Get fault stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch fault statistics'
        });
    }
});

// Get comments for a fault
router.get('/:id/comments', authenticateToken, async (req, res) => {
    try {
        const [comments] = await pool.query(`
            SELECT fc.*, CONCAT(u.first_name, ' ', u.last_name) as user_name, u.role as user_role
            FROM Fault_Comments fc
            JOIN Users u ON fc.user_id = u.user_id
            WHERE fc.fault_id = ?
    ORDER BY fc.created_at ASC
        `, [req.params.id]);

        res.json({
            success: true,
            data: comments,
            count: comments.length
        });
    } catch (error) {
        console.error('Get comments error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch comments'
        });
    }
});

// Add comment to a fault
router.post('/:id/comments', authenticateToken, async (req, res) => {
    try {
        const { comment } = req.body;
        const faultId = req.params.id;
        const userId = req.user.id;

        if (!comment || comment.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Comment text is required'
            });
        }

        // Verify fault exists
        const [fault] = await pool.query('SELECT fault_id FROM Faults WHERE fault_id = ?', [faultId]);
        if (fault.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Fault not found'
            });
        }

        const [result] = await pool.query(
            'INSERT INTO Fault_Comments (fault_id, user_id, comment) VALUES (?, ?, ?)',
            [faultId, userId, comment.trim()]
        );

        // Get the inserted comment with user info
        const [newComment] = await pool.query(`
            SELECT fc.*, CONCAT(u.first_name, ' ', u.last_name) as user_name, u.role as user_role
            FROM Fault_Comments fc
            JOIN Users u ON fc.user_id = u.user_id
            WHERE fc.comment_id = ?
    `, [result.insertId]);

        res.status(201).json({
            success: true,
            message: 'Comment added successfully',
            data: newComment[0]
        });
    } catch (error) {
        console.error('Add comment error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to add comment'
        });
    }
});

export default router;
