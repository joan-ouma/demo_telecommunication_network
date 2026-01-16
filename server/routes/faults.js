import express from 'express';
import pool from '../database.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Get all faults with filtering
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { status, priority, category, component_id, technician_id } = req.query;
        let query = `
      SELECT f.*, 
             nc.name as component_name, nc.type as component_type,
             t.name as technician_name,
             u.username as reported_by_name
      FROM faults f
      LEFT JOIN network_components nc ON f.component_id = nc.id
      LEFT JOIN technicians t ON f.assigned_technician_id = t.id
      LEFT JOIN users u ON f.reported_by = u.id
      WHERE 1=1
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
            query += ' AND f.assigned_technician_id = ?';
            params.push(technician_id);
        }

        query += ' ORDER BY FIELD(f.priority, "critical", "high", "medium", "low"), f.reported_at DESC';

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
             t.name as technician_name, t.email as technician_email, t.phone as technician_phone,
             u.username as reported_by_name
      FROM faults f
      LEFT JOIN network_components nc ON f.component_id = nc.id
      LEFT JOIN technicians t ON f.assigned_technician_id = t.id
      LEFT JOIN users u ON f.reported_by = u.id
      WHERE f.id = ?
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
            component_id, title, description, category, priority = 'medium'
        } = req.body;

        if (!title || !category) {
            return res.status(400).json({
                success: false,
                message: 'Title and category are required'
            });
        }

        const [result] = await pool.query(
            `INSERT INTO faults (component_id, reported_by, title, description, category, priority) 
       VALUES (?, ?, ?, ?, ?, ?)`,
            [component_id, req.user.id, title, description, category, priority]
        );

        // Update component status if it's a critical fault
        if (priority === 'critical' && component_id) {
            await pool.query(
                'UPDATE network_components SET status = ? WHERE id = ?',
                ['faulty', component_id]
            );
        }

        res.status(201).json({
            success: true,
            message: 'Fault reported successfully',
            data: { id: result.insertId, title, priority, status: 'open' }
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
router.put('/:id/assign', authenticateToken, requireRole('admin', 'technician'), async (req, res) => {
    try {
        const { technician_id } = req.body;

        if (!technician_id) {
            return res.status(400).json({
                success: false,
                message: 'Technician ID is required'
            });
        }

        // Verify technician exists
        const [technicians] = await pool.query('SELECT id, status FROM technicians WHERE id = ?', [technician_id]);
        if (technicians.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Technician not found'
            });
        }

        const [result] = await pool.query(
            `UPDATE faults SET 
       assigned_technician_id = ?, 
       assigned_at = NOW(),
       status = CASE WHEN status = 'open' THEN 'in_progress' ELSE status END
       WHERE id = ?`,
            [technician_id, req.params.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Fault not found'
            });
        }

        // Update technician status to busy
        await pool.query('UPDATE technicians SET status = ? WHERE id = ?', ['busy', technician_id]);

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
        const validStatuses = ['open', 'in_progress', 'resolved', 'closed'];

        if (!status || !validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Valid status is required'
            });
        }

        // Get fault to calculate response time
        const [faults] = await pool.query('SELECT * FROM faults WHERE id = ?', [req.params.id]);
        if (faults.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Fault not found'
            });
        }

        const fault = faults[0];
        let responseTime = null;

        // Calculate response time when resolving
        if (status === 'resolved' && fault.status !== 'resolved') {
            const reportedAt = new Date(fault.reported_at);
            const now = new Date();
            responseTime = Math.round((now - reportedAt) / (1000 * 60)); // minutes
        }

        await pool.query(
            `UPDATE faults SET 
       status = ?,
       resolution_notes = COALESCE(?, resolution_notes),
       resolved_at = CASE WHEN ? = 'resolved' AND resolved_at IS NULL THEN NOW() ELSE resolved_at END,
       response_time_minutes = COALESCE(?, response_time_minutes)
       WHERE id = ?`,
            [status, resolution_notes, status, responseTime, req.params.id]
        );

        // Update technician and component status
        if (status === 'resolved' || status === 'closed') {
            if (fault.assigned_technician_id) {
                await pool.query('UPDATE technicians SET status = ? WHERE id = ?', ['available', fault.assigned_technician_id]);
            }
            if (fault.component_id) {
                await pool.query('UPDATE network_components SET status = ? WHERE id = ? AND status = ?', ['active', fault.component_id, 'faulty']);
            }
        }

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

// Get fault statistics
router.get('/stats/summary', authenticateToken, async (req, res) => {
    try {
        const [byStatus] = await pool.query(`
      SELECT status, COUNT(*) as count FROM faults GROUP BY status
    `);

        const [byPriority] = await pool.query(`
      SELECT priority, COUNT(*) as count FROM faults GROUP BY priority
    `);

        const [byCategory] = await pool.query(`
      SELECT category, COUNT(*) as count FROM faults GROUP BY category
    `);

        const [avgResolution] = await pool.query(`
      SELECT AVG(response_time_minutes) as avg_time 
      FROM faults WHERE response_time_minutes IS NOT NULL
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

export default router;
