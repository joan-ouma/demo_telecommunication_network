import express from 'express';
import pool from '../database.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { logAction } from '../utils/auditLogger.js';

const router = express.Router();

// Get all network components
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { type, status, search } = req.query;
        let query = `
            SELECT nc.*, d.name as department_name 
            FROM Network_Components nc
            LEFT JOIN Departments d ON nc.department_id = d.department_id
            WHERE 1=1
        `;
        const params = [];

        if (type) {
            query += ' AND nc.type = ?';
            params.push(type);
        }

        if (status) {
            query += ' AND nc.status = ?';
            params.push(status);
        }

        if (search) {
            query += ' AND (nc.name LIKE ? OR nc.location LIKE ? OR d.name LIKE ?)';
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }

        query += ' ORDER BY nc.type ASC, nc.name ASC';

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
            'SELECT * FROM Network_Components WHERE component_id = ?',
            [req.params.id]
        );

        if (components.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Component not found'
            });
        }

        // Get maintenance history - using Maintenance_Logs
        const [maintenance] = await pool.query(
            `SELECT mh.*, t.full_name as technician_name 
       FROM Maintenance_Logs mh 
       LEFT JOIN Users t ON mh.technician_id = t.user_id 
       WHERE mh.component_id = ? 
       ORDER BY mh.activity_date DESC`,
            [req.params.id]
        );

        // Get active faults
        const [faults] = await pool.query(
            `SELECT * FROM Faults WHERE component_id = ? AND status != 'Closed' ORDER BY reported_at DESC`,
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
router.post('/', authenticateToken, requireRole('Admin', 'Technician'), async (req, res) => {
    try {
        const {
            name, type, model_number,
            ip_address, mac_address, location, status = 'Active',
            config_details, install_date, latitude, longitude, department_id
        } = req.body;

        if (!name || !type) {
            return res.status(400).json({
                success: false,
                message: 'Name and type are required'
            });
        }

        // If department_id is provided but location is missing, we could auto-fill location from department?
        // But for now, let's keep location as required or passed from frontend.

        const [result] = await pool.query(
            `INSERT INTO Network_Components 
       (name, type, model_number, ip_address, mac_address, location, status, config_details, install_date, latitude, longitude, department_id) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [name, type, model_number, ip_address, mac_address, location, status,
                config_details, install_date, latitude, longitude, department_id || null]
        );

        res.status(201).json({
            success: true,
            message: 'Component created successfully',
            data: { id: result.insertId, name, type, status }
        });

        // Log component creation
        await logAction({
            userId: req.user.id,
            action: 'CREATE_COMPONENT',
            entityType: 'Component',
            entityId: result.insertId,
            details: { name, type, location },
            req
        });
    } catch (error) {
        console.error('Create component error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create component'
        });
    }
});

// Update component
router.put('/:id', authenticateToken, requireRole('Admin', 'Technician'), async (req, res) => {
    try {
        const {
            name, type, model_number,
            ip_address, mac_address, location, status, config_details, install_date, latitude, longitude, department_id
        } = req.body;

        const [result] = await pool.query(
            `UPDATE Network_Components SET 
       name = COALESCE(?, name),
       type = COALESCE(?, type),
       model_number = COALESCE(?, model_number),
       ip_address = COALESCE(?, ip_address),
       mac_address = COALESCE(?, mac_address),
       location = COALESCE(?, location),
       status = COALESCE(?, status),
       config_details = COALESCE(?, config_details),
       install_date = COALESCE(?, install_date),
       latitude = COALESCE(?, latitude),
       longitude = COALESCE(?, longitude),
       department_id = COALESCE(?, department_id)
       WHERE component_id = ?`,
            [name, type, model_number, ip_address, mac_address, location, status,
                config_details, install_date, latitude, longitude, department_id, req.params.id]
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

        // Log component update
        await logAction({
            userId: req.user.id,
            action: 'UPDATE_COMPONENT',
            entityType: 'Component',
            entityId: req.params.id,
            details: { name, status }, // Logging minimal details, could expand
            req
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
router.delete('/:id', authenticateToken, requireRole('Admin'), async (req, res) => {
    try {
        const [result] = await pool.query(
            'DELETE FROM Network_Components WHERE component_id = ?',
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

        // Log component deletion
        await logAction({
            userId: req.user.id,
            action: 'DELETE_COMPONENT',
            entityType: 'Component',
            entityId: req.params.id,
            details: 'Component deleted',
            req
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
             SUM(CASE WHEN status = 'Active' THEN 1 ELSE 0 END) as active_count
      FROM Network_Components 
      GROUP BY type
    `);

        const [statusStats] = await pool.query(`
      SELECT status, COUNT(*) as count FROM Network_Components GROUP BY status
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
