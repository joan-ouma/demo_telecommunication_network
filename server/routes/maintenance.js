import express from 'express';
import pool from '../database.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Get all maintenance logs
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { component_id, technician_id } = req.query;
        const currentUserId = req.user.id;
        let query = `
      SELECT ml.*,
            nc.name as component_name, nc.type as component_type,
            CONCAT(t.first_name, ' ', t.last_name) as technician_name,
            (SELECT COUNT(*) FROM Maintenance_Comments mc WHERE mc.log_id = ml.log_id) as comment_count,
    (SELECT user_id FROM Maintenance_Comments mc WHERE mc.log_id = ml.log_id ORDER BY created_at DESC LIMIT 1) as last_comment_user_id
      FROM Maintenance_Logs ml
      LEFT JOIN Network_Components nc ON ml.component_id = nc.component_id
      LEFT JOIN Users t ON ml.technician_id = t.user_id
      WHERE 1 = 1
    `;
        const params = [];

        if (component_id) {
            query += ' AND ml.component_id = ?';
            params.push(component_id);
        }

        if (technician_id) {
            query += ' AND ml.technician_id = ?';
            params.push(technician_id);
        }

        query += ' ORDER BY ml.activity_date DESC';

        const [logs] = await pool.query(query, params);

        res.json({
            success: true,
            data: logs,
            count: logs.length
        });
    } catch (error) {
        console.error('Get maintenance logs error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch maintenance logs'
        });
    }
});

// Create new maintenance log
router.post('/', authenticateToken, requireRole('Admin', 'Technician'), async (req, res) => {
    try {
        const { component_id, action_taken, result, duration_minutes, activity_date } = req.body;

        if (!component_id || !action_taken) {
            return res.status(400).json({
                success: false,
                message: 'Component ID and action taken are required'
            });
        }

        const [resDb] = await pool.query(
            `INSERT INTO Maintenance_Logs(component_id, technician_id, action_taken, result, duration_minutes, activity_date)
VALUES(?, ?, ?, ?, ?, COALESCE(?, NOW()))`,
            [component_id, req.user.id, action_taken, result || 'Success', duration_minutes, activity_date]
        );

        res.status(201).json({
            success: true,
            message: 'Maintenance log created successfully',
            data: { id: resDb.insertId }
        });
    } catch (error) {
        console.error('Create maintenance log error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create maintenance log'
        });
    }
});

// Get comments for a maintenance log
router.get('/:id/comments', authenticateToken, async (req, res) => {
    try {
        const [comments] = await pool.query(`
            SELECT mc.*, CONCAT(u.first_name, ' ', u.last_name) as user_name, u.role as user_role
            FROM Maintenance_Comments mc
            JOIN Users u ON mc.user_id = u.user_id
            WHERE mc.log_id = ?
    ORDER BY mc.created_at ASC
        `, [req.params.id]);

        res.json({
            success: true,
            data: comments,
            count: comments.length
        });
    } catch (error) {
        console.error('Get maintenance comments error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch comments'
        });
    }
});

// Add comment to a maintenance log
router.post('/:id/comments', authenticateToken, async (req, res) => {
    try {
        const { comment } = req.body;
        const logId = req.params.id;
        const userId = req.user.id;

        if (!comment || comment.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Comment text is required'
            });
        }

        // Verify log exists
        const [log] = await pool.query('SELECT log_id FROM Maintenance_Logs WHERE log_id = ?', [logId]);
        if (log.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Maintenance log not found'
            });
        }

        const [result] = await pool.query(
            'INSERT INTO Maintenance_Comments (log_id, user_id, comment) VALUES (?, ?, ?)',
            [logId, userId, comment.trim()]
        );

        // Get the inserted comment with user info
        const [newComment] = await pool.query(`
            SELECT mc.*, CONCAT(u.first_name, ' ', u.last_name) as user_name, u.role as user_role
            FROM Maintenance_Comments mc
            JOIN Users u ON mc.user_id = u.user_id
            WHERE mc.comment_id = ?
    `, [result.insertId]);

        res.status(201).json({
            success: true,
            message: 'Comment added successfully',
            data: newComment[0]
        });
    } catch (error) {
        console.error('Add maintenance comment error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to add comment'
        });
    }
});

export default router;
