import express from 'express';
import pool from '../database.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Get all network components
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { type, status, search } = req.query;
        let query = 'SELECT * FROM network_components WHERE 1=1';
        const params = [];

        if (type) {
            query += ' AND type = ?';
            params.push(type);
        }

        if (status) {
            query += ' AND status = ?';
            params.push(status);
        }

        if (search) {
            query += ' AND (name LIKE ? OR location LIKE ? OR serial_number LIKE ?)';
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }

        query += ' ORDER BY created_at DESC';

        const [components] = await pool.query(query, params);

        res.json({
            success: true,
            data: components,
            count: components.length
        });
    } catch (error) {
        console.error('Get components error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch components'
        });
    }
});

// Get single component
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const [components] = await pool.query(
            'SELECT * FROM network_components WHERE id = ?',
            [req.params.id]
        );

        if (components.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Component not found'
            });
        }

        // Get maintenance history
        const [maintenance] = await pool.query(
            `SELECT mh.*, t.name as technician_name 
       FROM maintenance_history mh 
       LEFT JOIN technicians t ON mh.technician_id = t.id 
       WHERE mh.component_id = ? 
       ORDER BY mh.performed_at DESC`,
            [req.params.id]
        );

        // Get active faults
        const [faults] = await pool.query(
            `SELECT * FROM faults WHERE component_id = ? AND status != 'closed' ORDER BY reported_at DESC`,
            [req.params.id]
        );

        res.json({
            success: true,
            data: {
                ...components[0],
                maintenance_history: maintenance,
                active_faults: faults
            }
        });
    } catch (error) {
        console.error('Get component error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch component'
        });
    }
});

// Create new component
router.post('/', authenticateToken, requireRole('admin', 'technician'), async (req, res) => {
    try {
        const {
            name, type, model, manufacturer, serial_number,
            ip_address, mac_address, location, status = 'active',
            configuration, installed_at
        } = req.body;

        if (!name || !type) {
            return res.status(400).json({
                success: false,
                message: 'Name and type are required'
            });
        }

        const [result] = await pool.query(
            `INSERT INTO network_components 
       (name, type, model, manufacturer, serial_number, ip_address, mac_address, location, status, configuration, installed_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [name, type, model, manufacturer, serial_number, ip_address, mac_address, location, status,
                configuration ? JSON.stringify(configuration) : null, installed_at]
        );

        res.status(201).json({
            success: true,
            message: 'Component created successfully',
            data: { id: result.insertId, name, type, status }
        });
    } catch (error) {
        console.error('Create component error:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                success: false,
                message: 'Serial number already exists'
            });
        }
        res.status(500).json({
            success: false,
            message: 'Failed to create component'
        });
    }
});

// Update component
router.put('/:id', authenticateToken, requireRole('admin', 'technician'), async (req, res) => {
    try {
        const {
            name, type, model, manufacturer, serial_number,
            ip_address, mac_address, location, status, configuration, installed_at
        } = req.body;

        const [result] = await pool.query(
            `UPDATE network_components SET 
       name = COALESCE(?, name),
       type = COALESCE(?, type),
       model = COALESCE(?, model),
       manufacturer = COALESCE(?, manufacturer),
       serial_number = COALESCE(?, serial_number),
       ip_address = COALESCE(?, ip_address),
       mac_address = COALESCE(?, mac_address),
       location = COALESCE(?, location),
       status = COALESCE(?, status),
       configuration = COALESCE(?, configuration),
       installed_at = COALESCE(?, installed_at)
       WHERE id = ?`,
            [name, type, model, manufacturer, serial_number, ip_address, mac_address, location, status,
                configuration ? JSON.stringify(configuration) : null, installed_at, req.params.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Component not found'
            });
        }

        res.json({
            success: true,
            message: 'Component updated successfully'
        });
    } catch (error) {
        console.error('Update component error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update component'
        });
    }
});

// Delete component
router.delete('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const [result] = await pool.query(
            'DELETE FROM network_components WHERE id = ?',
            [req.params.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Component not found'
            });
        }

        res.json({
            success: true,
            message: 'Component deleted successfully'
        });
    } catch (error) {
        console.error('Delete component error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete component'
        });
    }
});

// Get component statistics
router.get('/stats/summary', authenticateToken, async (req, res) => {
    try {
        const [typeStats] = await pool.query(`
      SELECT type, COUNT(*) as count, 
             SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_count
      FROM network_components 
      GROUP BY type
    `);

        const [statusStats] = await pool.query(`
      SELECT status, COUNT(*) as count FROM network_components GROUP BY status
    `);

        res.json({
            success: true,
            data: {
                by_type: typeStats,
                by_status: statusStats
            }
        });
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch statistics'
        });
    }
});

export default router;
