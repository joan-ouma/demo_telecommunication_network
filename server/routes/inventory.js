import express from 'express';
import pool from '../database.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { logAction } from '../utils/auditLogger.js';

const router = express.Router();

// Get all inventory items
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { category } = req.query;
        let query = 'SELECT * FROM Inventory_Items WHERE 1=1';
        const params = [];

        if (category) {
            query += ' AND category = ?';
            params.push(category);
        }

        query += ' ORDER BY category, name';

        const [items] = await pool.query(query, params);

        // Add low stock flag
        const itemsWithFlags = items.map(item => ({
            ...item,
            low_stock: item.quantity <= item.min_level
        }));

        res.json({
            success: true,
            data: itemsWithFlags,
            count: items.length
        });
    } catch (error) {
        console.error('Get inventory error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch inventory'
        });
    }
});

// Get inventory stats
router.get('/stats', authenticateToken, async (req, res) => {
    try {
        const [[stats]] = await pool.query(`
            SELECT 
                COUNT(*) as total_items,
                SUM(quantity) as total_stock,
                SUM(quantity * unit_cost) as total_value,
                SUM(CASE WHEN quantity <= min_level THEN 1 ELSE 0 END) as low_stock_count
            FROM Inventory_Items
        `);

        res.json({
            success: true,
            data: {
                total_items: stats.total_items || 0,
                total_stock: stats.total_stock || 0,
                total_value: parseFloat(stats.total_value) || 0,
                low_stock_count: stats.low_stock_count || 0
            }
        });
    } catch (error) {
        console.error('Get inventory stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch inventory stats'
        });
    }
});

// Add new item
router.post('/', authenticateToken, requireRole('Admin', 'Manager'), async (req, res) => {
    try {
        const { name, category, quantity, min_level, unit_cost, location } = req.body;

        if (!name || !category) {
            return res.status(400).json({
                success: false,
                message: 'Name and category are required'
            });
        }

        const [result] = await pool.query(
            'INSERT INTO Inventory_Items (name, category, quantity, min_level, unit_cost, location) VALUES (?, ?, ?, ?, ?, ?)',
            [name, category, quantity || 0, min_level || 5, unit_cost || 0, location]
        );

        await logAction({
            userId: req.user.id,
            action: 'CREATE_INVENTORY_ITEM',
            entityType: 'Inventory',
            entityId: result.insertId,
            details: { name, category },
            req
        });

        res.status(201).json({
            success: true,
            message: 'Item added successfully',
            data: { id: result.insertId }
        });
    } catch (error) {
        console.error('Add inventory item error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to add item'
        });
    }
});

// Update item
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const { name, category, quantity, min_level, unit_cost, location } = req.body;

        const [result] = await pool.query(
            'UPDATE Inventory_Items SET name = ?, category = ?, quantity = ?, min_level = ?, unit_cost = ?, location = ? WHERE item_id = ?',
            [name, category, quantity, min_level, unit_cost, location, req.params.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Item not found'
            });
        }

        // Check for low stock and notify Admins/Managers
        if (quantity <= min_level) {
            const [admins] = await pool.query("SELECT user_id FROM Users WHERE role IN ('Admin', 'Manager') AND status = 'Active'");
            for (const admin of admins) {
                // Avoid duplicate low stock notifications for same item today? 
                // For simplicity, we just send it. A more robust system would check recent notifications.
                await pool.query(
                    `INSERT INTO Notifications(user_id, type, message, link)
                     VALUES(?, 'low_stock', ?, ?)`,
                    [admin.user_id, `Low Stock Alert: ${name} is down to ${quantity} units (Min: ${min_level})`, `/inventory`]
                );
            }
        }

        await logAction({
            userId: req.user.id,
            action: 'UPDATE_INVENTORY_ITEM',
            entityType: 'Inventory',
            entityId: req.params.id,
            details: { name, quantity },
            req
        });

        res.json({
            success: true,
            message: 'Item updated successfully'
        });
    } catch (error) {
        console.error('Update inventory item error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update item'
        });
    }
});

// Delete item
router.delete('/:id', authenticateToken, requireRole('Admin'), async (req, res) => {
    try {
        const [result] = await pool.query(
            'DELETE FROM Inventory_Items WHERE item_id = ?',
            [req.params.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Item not found'
            });
        }

        await logAction({
            userId: req.user.id,
            action: 'DELETE_INVENTORY_ITEM',
            entityType: 'Inventory',
            entityId: req.params.id,
            details: {},
            req
        });

        res.json({
            success: true,
            message: 'Item deleted successfully'
        });
    } catch (error) {
        console.error('Delete inventory item error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete item'
        });
    }
});

export default router;
