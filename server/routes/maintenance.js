import express from 'express';
import pool from '../database.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Get all maintenance logs
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { component_id, technician_id } = req.query;
        let query = `
      SELECT ml.*, 
             nc.name as component_name, nc.type as component_type,
             CONCAT(t.first_name, ' ', t.last_name) as technician_name
      FROM Maintenance_Logs ml
      LEFT JOIN Network_Components nc ON ml.component_id = nc.component_id
      LEFT JOIN Users t ON ml.technician_id = t.user_id
      WHERE 1=1
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
            `INSERT INTO Maintenance_Logs (component_id, technician_id, action_taken, result, duration_minutes, activity_date) 
       VALUES (?, ?, ?, ?, ?, COALESCE(?, NOW()))`,
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

export default router;
