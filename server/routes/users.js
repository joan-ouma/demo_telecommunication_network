
import express from 'express';
import bcrypt from 'bcryptjs';
import pool from '../database.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { logAction } from '../utils/auditLogger.js';

const router = express.Router();

// Get all users (for dropdowns and lists)
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { role, status } = req.query;
        let query = `
            SELECT u.user_id, u.username, u.first_name, u.last_name, u.role, u.email, u.status, u.department_id, d.name as department_name, u.phone_number
            FROM Users u
            LEFT JOIN Departments d ON u.department_id = d.department_id
            WHERE 1=1
        `;
        const params = [];

        if (role) {
            query += ' AND u.role = ?';
            params.push(role);
        }

        if (status) {
            query += ' AND u.status = ?';
            params.push(status);
        }

        query += ' ORDER BY u.first_name, u.last_name';

        const [users] = await pool.query(query, params);

        res.json({
            success: true,
            data: users,
            count: users.length
        });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch users'
        });
    }
});

// Get single user
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const [users] = await pool.query('SELECT user_id, username, first_name, last_name, role, email, phone_number, status, department_id, created_at FROM Users WHERE user_id = ?', [req.params.id]);

        if (users.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.json({
            success: true,
            data: users[0]
        });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch user' });
    }
});

export default router;
