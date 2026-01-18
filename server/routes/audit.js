import express from 'express';
import pool from '../database.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Get all audit logs (Admin only)
router.get('/', authenticateToken, requireRole('Admin'), async (req, res) => {
    try {
        const { entity_type, action, user_id, from_date, to_date } = req.query;

        let query = `
            SELECT al.*, 
                   CONCAT(u.first_name, ' ', u.last_name) as user_name,
                   u.email as user_email
            FROM Audit_Logs al
            LEFT JOIN Users u ON al.user_id = u.user_id
            WHERE 1=1
        `;
        const params = [];

        if (entity_type) {
            query += ' AND al.entity_type = ?';
            params.push(entity_type);
        }
        if (action) {
            query += ' AND al.action = ?';
            params.push(action);
        }
        if (user_id) {
            query += ' AND al.user_id = ?';
            params.push(user_id);
        }
        if (from_date) {
            query += ' AND DATE(al.created_at) >= ?';
            params.push(from_date);
        }
        if (to_date) {
            query += ' AND DATE(al.created_at) <= ?';
            params.push(to_date);
        }

        query += ' ORDER BY al.created_at DESC LIMIT 100'; // Limit to recent 100 logs by default

        const [rows] = await pool.query(query, params);
        res.json(rows);
    } catch (error) {
        console.error('Error fetching audit logs:', error);
        res.status(500).json({ error: 'Failed to fetch audit logs' });
    }
});

export default router;
