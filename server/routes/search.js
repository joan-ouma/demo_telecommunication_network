import express from 'express';
import pool from '../database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Global search across faults, components, and technicians
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { q } = req.query;

        if (!q || q.trim().length < 2) {
            return res.json({
                success: true,
                data: { faults: [], components: [], technicians: [] },
                message: 'Search query too short'
            });
        }

        const searchTerm = `%${q.trim()}%`;

        // Search faults
        const [faults] = await pool.query(`
            SELECT f.fault_id, f.title, f.status, f.priority, 
                   nc.name as component_name,
                   'fault' as type
            FROM Faults f
            LEFT JOIN Network_Components nc ON f.component_id = nc.component_id
            WHERE f.title LIKE ? OR f.description LIKE ?
            ORDER BY f.reported_at DESC
            LIMIT 5
        `, [searchTerm, searchTerm]);

        // Search components
        const [components] = await pool.query(`
            SELECT component_id, name, type, status, location,
                   'component' as result_type
            FROM Network_Components
            WHERE name LIKE ? OR location LIKE ? OR model_number LIKE ?
            ORDER BY name ASC
            LIMIT 5
        `, [searchTerm, searchTerm, searchTerm]);

        // Search technicians
        const [technicians] = await pool.query(`
            SELECT user_id, CONCAT(first_name, ' ', last_name) as name, 
                   email, phone_number, status,
                   'technician' as result_type
            FROM Users
            WHERE role = 'Technician'
              AND (first_name LIKE ? OR last_name LIKE ? OR email LIKE ?)
            ORDER BY first_name ASC
            LIMIT 5
        `, [searchTerm, searchTerm, searchTerm]);

        res.json({
            success: true,
            data: {
                faults,
                components,
                technicians
            },
            total: faults.length + components.length + technicians.length
        });

    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({
            success: false,
            message: 'Search failed'
        });
    }
});

export default router;
