import express from 'express';
import pool from '../database.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Get all technicians
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { status, specialization } = req.query;
        let query = `
      SELECT t.*, 
             (SELECT COUNT(*) FROM faults f WHERE f.assigned_technician_id = t.id AND f.status IN ('open', 'in_progress')) as active_faults
      FROM technicians t
      WHERE 1=1
    `;
        const params = [];

        if (status) {
            query += ' AND t.status = ?';
            params.push(status);
        }

        if (specialization) {
            query += ' AND t.specialization LIKE ?';
            params.push(`%${specialization}%`);
        }

        query += ' ORDER BY t.name';

        const [technicians] = await pool.query(query, params);

        res.json({
            success: true,
            data: technicians,
            count: technicians.length
        });
    } catch (error) {
        console.error('Get technicians error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch technicians'
        });
    }
});

// Get single technician with workload
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const [technicians] = await pool.query(
            'SELECT * FROM technicians WHERE id = ?',
            [req.params.id]
        );

        if (technicians.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Technician not found'
            });
        }

        // Get assigned faults
        const [assignedFaults] = await pool.query(`
      SELECT f.*, nc.name as component_name 
      FROM faults f 
      LEFT JOIN network_components nc ON f.component_id = nc.id
      WHERE f.assigned_technician_id = ? AND f.status IN ('open', 'in_progress')
      ORDER BY FIELD(f.priority, 'critical', 'high', 'medium', 'low'), f.reported_at DESC
    `, [req.params.id]);

        // Get maintenance history
        const [maintenanceHistory] = await pool.query(`
      SELECT mh.*, nc.name as component_name 
      FROM maintenance_history mh 
      LEFT JOIN network_components nc ON mh.component_id = nc.id
      WHERE mh.technician_id = ? 
      ORDER BY mh.performed_at DESC 
      LIMIT 10
    `, [req.params.id]);

        // Get performance stats
        const [resolvedStats] = await pool.query(`
      SELECT 
        COUNT(*) as total_resolved,
        AVG(response_time_minutes) as avg_resolution_time
      FROM faults 
      WHERE assigned_technician_id = ? AND status IN ('resolved', 'closed')
    `, [req.params.id]);

        res.json({
            success: true,
            data: {
                ...technicians[0],
                assigned_faults: assignedFaults,
                maintenance_history: maintenanceHistory,
                performance: resolvedStats[0]
            }
        });
    } catch (error) {
        console.error('Get technician error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch technician'
        });
    }
});

// Create new technician
router.post('/', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const { user_id, name, email, phone, specialization, status = 'available' } = req.body;

        if (!name || !email) {
            return res.status(400).json({
                success: false,
                message: 'Name and email are required'
            });
        }

        const [result] = await pool.query(
            'INSERT INTO technicians (user_id, name, email, phone, specialization, status) VALUES (?, ?, ?, ?, ?, ?)',
            [user_id, name, email, phone, specialization, status]
        );

        res.status(201).json({
            success: true,
            message: 'Technician created successfully',
            data: { id: result.insertId, name, email, status }
        });
    } catch (error) {
        console.error('Create technician error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create technician'
        });
    }
});

// Update technician status
router.put('/:id/status', authenticateToken, async (req, res) => {
    try {
        const { status } = req.body;
        const validStatuses = ['available', 'busy', 'offline'];

        if (!status || !validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Valid status is required'
            });
        }

        const [result] = await pool.query(
            'UPDATE technicians SET status = ? WHERE id = ?',
            [status, req.params.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Technician not found'
            });
        }

        res.json({
            success: true,
            message: 'Technician status updated'
        });
    } catch (error) {
        console.error('Update technician status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update status'
        });
    }
});

// Update technician
router.put('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const { name, email, phone, specialization, status } = req.body;

        const [result] = await pool.query(
            `UPDATE technicians SET 
       name = COALESCE(?, name),
       email = COALESCE(?, email),
       phone = COALESCE(?, phone),
       specialization = COALESCE(?, specialization),
       status = COALESCE(?, status)
       WHERE id = ?`,
            [name, email, phone, specialization, status, req.params.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Technician not found'
            });
        }

        res.json({
            success: true,
            message: 'Technician updated successfully'
        });
    } catch (error) {
        console.error('Update technician error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update technician'
        });
    }
});

// Delete technician
router.delete('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
    try {
        const [result] = await pool.query(
            'DELETE FROM technicians WHERE id = ?',
            [req.params.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Technician not found'
            });
        }

        res.json({
            success: true,
            message: 'Technician deleted successfully'
        });
    } catch (error) {
        console.error('Delete technician error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete technician'
        });
    }
});

export default router;
