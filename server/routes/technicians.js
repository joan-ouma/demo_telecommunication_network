import express from 'express';
import pool from '../database.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { logAction } from '../utils/auditLogger.js';

const router = express.Router();

// Get all technicians
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { status, specialization } = req.query;
        // In new schema, we don't have 'specialization' or separate 'status' column for technicians in Users table 
        // effectively, unless we join Maintenance_Logs or similar, but the user didn't specify those cols in Users.
        // The user's provided schema for Users table:
        // user_id, username, password_hash, full_name, role, phone_number, email
        // It DOES NOT have 'status' or 'specialization'.
        // However, the original app used them. I will return basic user info for now.

        let query = `
      SELECT u.user_id as id, CONCAT(u.first_name, ' ', u.last_name) as name, u.email, u.phone_number as phone, u.role, u.created_at, u.status, u.department_id,
             d.name as department_name,
             (SELECT COUNT(*) FROM Faults f WHERE f.assigned_to = u.user_id AND f.status IN ('Open', 'In Progress')) as active_faults
      FROM Users u
      LEFT JOIN Departments d ON u.department_id = d.department_id
      WHERE u.role IN ('Technician', 'Staff', 'Manager')
    `;
        const params = [];

        query += ' ORDER BY u.created_at DESC';

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
            "SELECT user_id as id, CONCAT(first_name, ' ', last_name) as name, email, phone_number as phone, role FROM Users WHERE user_id = ? AND role = 'Technician'",
            [req.params.id]
        );

        if (technicians.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Technician not found'
            });
        }

        // Get assigned faults
        // Note: Field function for priority sorting needs capital values now
        const [assignedFaults] = await pool.query(`
      SELECT f.*, nc.name as component_name 
      FROM Faults f 
      LEFT JOIN Network_Components nc ON f.component_id = nc.component_id
      WHERE f.assigned_to = ? AND f.status IN ('Open', 'In Progress')
      ORDER BY FIELD(f.priority, 'Critical', 'High', 'Medium', 'Low'), f.reported_at DESC
    `, [req.params.id]);

        // Get maintenance history - mapped to correct columns
        const [maintenanceHistory] = await pool.query(`
      SELECT mh.*, nc.name as component_name 
      FROM Maintenance_Logs mh 
      LEFT JOIN Network_Components nc ON mh.component_id = nc.component_id
      WHERE mh.technician_id = ? 
      ORDER BY mh.activity_date DESC 
      LIMIT 10
    `, [req.params.id]);

        // Get performance stats
        const [resolvedStats] = await pool.query(`
      SELECT 
        COUNT(*) as total_resolved,
        AVG(response_time_minutes) as avg_resolution_time
      FROM Faults 
      WHERE assigned_to = ? AND status IN ('Resolved', 'Closed')
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

// Create new technician or staff
router.post('/', authenticateToken, requireRole('Admin', 'Manager'), async (req, res) => {
    try {
        const { username, email, first_name, last_name, phone_number, password, role, department_id } = req.body;
        let userRole = role || 'Technician';

        // Validate role - only allow Technician, Staff, or Manager
        if (!['Technician', 'Staff', 'Manager'].includes(userRole)) {
            userRole = 'Technician';
        }

        // Only Admin can create Manager
        if (userRole === 'Manager' && req.user.role !== 'Admin') {
            return res.status(403).json({
                success: false,
                message: 'Only Admin can create a Manager'
            });
        }

        // Enforce only one Manager constraint
        if (userRole === 'Manager') {
            const [existingManagers] = await pool.query(
                "SELECT COUNT(*) as count FROM Users WHERE role = 'Manager' AND status = 'Active'"
            );
            if (existingManagers[0].count >= 1) {
                return res.status(400).json({
                    success: false,
                    message: 'Only one active Manager is allowed in the system'
                });
            }
        }

        if (!username || !email || !first_name || !last_name || !password) {
            return res.status(400).json({
                success: false,
                message: 'Username, email, first name, last name, and password are required'
            });
        }

        const bcrypt = await import('bcryptjs');
        const hashedPassword = await bcrypt.default.hash(password, 10);

        const [result] = await pool.query(
            'INSERT INTO Users (username, email, password_hash, first_name, last_name, phone_number, role, department_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [username, email, hashedPassword, first_name, last_name, phone_number, userRole, department_id || null]
        );

        res.status(201).json({
            success: true,
            message: `${userRole} created successfully`,
            data: { id: result.insertId, name: `${first_name} ${last_name}`, email, role: userRole }
        });

        // Log creation
        await logAction({
            userId: req.user.id,
            action: `CREATE_${userRole.toUpperCase()}`,
            entityType: 'User',
            entityId: result.insertId,
            details: { username, email, full_name: `${first_name} ${last_name}`, role: userRole },
            req
        });
    } catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create user'
        });
    }
});

// Update technician
router.put('/:id', authenticateToken, requireRole('Admin', 'Manager'), async (req, res) => {
    try {
        const { first_name, last_name, email, phone_number } = req.body;

        const [result] = await pool.query(
            `UPDATE Users SET 
       first_name = COALESCE(?, first_name),
       last_name = COALESCE(?, last_name),
       email = COALESCE(?, email),
       phone_number = COALESCE(?, phone_number)
       WHERE user_id = ?`,
            [first_name, last_name, email, phone_number, req.params.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Technician not found'
            });
        }

        res.json({
            message: 'Technician updated successfully'
        });

        // Log technician update
        await logAction({
            userId: req.user.id,
            action: 'UPDATE_TECHNICIAN',
            entityType: 'User',
            entityId: req.params.id,
            details: { first_name, last_name, email },
            req
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
// NOTE: With RESTRICT foreign keys, this might fail if they have assigned faults/logs
router.delete('/:id', authenticateToken, requireRole('Admin'), async (req, res) => {
    try {
        // First check if technician exists
        const [existing] = await pool.query(
            "SELECT user_id, status FROM Users WHERE user_id = ?",
            [req.params.id]
        );

        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Technician not found'
            });
        }

        // Try to actually delete
        try {
            await pool.query(
                "DELETE FROM Users WHERE user_id = ?",
                [req.params.id]
            );
            res.json({
                message: 'Technician permanently deleted'
            });

            // Log technician deletion
            await logAction({
                userId: req.user.id,
                action: 'DELETE_TECHNICIAN',
                entityType: 'User',
                entityId: req.params.id,
                details: 'Technician deleted',
                req
            });
        } catch (deleteError) {
            // If RESTRICT constraint prevents deletion
            if (deleteError.code === 'ER_ROW_IS_REFERENCED_2' || deleteError.errno === 1451) {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot delete this technician because they have associated faults or maintenance logs. Consider keeping them inactive.'
                });
            }
            throw deleteError;
        }
    } catch (error) {
        console.error('Delete technician error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete technician'
        });
    }
});

// Reset user password
router.put('/:id/password', authenticateToken, requireRole('Admin', 'Manager'), async (req, res) => {
    try {
        const { password } = req.body;

        if (!password) {
            return res.status(400).json({
                success: false,
                message: 'New password is required'
            });
        }

        const bcrypt = await import('bcryptjs');
        const hashedPassword = await bcrypt.default.hash(password, 10);

        // Get user info for audit logging
        const [userInfo] = await pool.query(
            "SELECT user_id, username, first_name, last_name, role FROM Users WHERE user_id = ?",
            [req.params.id]
        );

        if (userInfo.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const [result] = await pool.query(
            "UPDATE Users SET password_hash = ? WHERE user_id = ?",
            [hashedPassword, req.params.id]
        );

        res.json({
            success: true,
            message: 'Password updated successfully'
        });

        // Log password reset
        await logAction({
            userId: req.user.id,
            action: 'PASSWORD_RESET',
            entityType: 'User',
            entityId: req.params.id,
            details: {
                target_user: userInfo[0].username,
                target_role: userInfo[0].role,
                reset_by: req.user.username
            },
            req
        });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to reset password'
        });
    }
});

// Update user status (deactivate/reactivate)
router.put('/:id/status', authenticateToken, requireRole('Admin', 'Manager'), async (req, res) => {
    try {
        const { status, reason } = req.body;

        if (!status || !['Active', 'Inactive'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status. Must be Active or Inactive'
            });
        }

        // Get user info for audit logging
        const [userInfo] = await pool.query(
            "SELECT user_id, username, first_name, last_name, role, status as prev_status FROM Users WHERE user_id = ?",
            [req.params.id]
        );

        if (userInfo.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Update status and reason
        const [result] = await pool.query(
            "UPDATE Users SET status = ?, status_reason = ? WHERE user_id = ?",
            [status, status === 'Inactive' ? (reason || null) : null, req.params.id]
        );

        res.json({
            success: true,
            message: `User status updated to ${status}`
        });

        // Log status change
        await logAction({
            userId: req.user.id,
            action: status === 'Inactive' ? 'DEACTIVATE_USER' : 'REACTIVATE_USER',
            entityType: 'User',
            entityId: req.params.id,
            details: {
                target_user: userInfo[0].username,
                target_role: userInfo[0].role,
                previous_status: userInfo[0].prev_status,
                new_status: status,
                reason: reason || 'No reason provided'
            },
            req
        });
    } catch (error) {
        console.error('Update user status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update status'
        });
    }
});

export default router;
