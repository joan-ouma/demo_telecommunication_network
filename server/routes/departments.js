import express from 'express';
import pool from '../database.js';

const router = express.Router();

// Get all departments
router.get('/', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM Departments ORDER BY name');
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching departments:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Create department
router.post('/', async (req, res) => {
    const { name, location } = req.body;
    if (!name) {
        return res.status(400).json({ success: false, message: 'Department name is required' });
    }

    try {
        const [result] = await pool.query(
            'INSERT INTO Departments (name, location) VALUES (?, ?)',
            [name, location || null]
        );
        res.status(201).json({
            success: true,
            data: { department_id: result.insertId, name, location },
            message: 'Department created successfully'
        });
    } catch (error) {
        console.error('Error creating department:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ success: false, message: 'Department name already exists' });
        }
        res.status(500).json({ success: false, message: error.message });
    }
});

export default router;
