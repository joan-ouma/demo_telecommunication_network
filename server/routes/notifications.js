import express from 'express';
import pool from '../database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get unread notifications for current user
router.get('/', authenticateToken, async (req, res) => {
    try {
        const [notifications] = await pool.query(
            "SELECT * FROM Notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50",
            [req.user.id]
        );

        const unreadCount = notifications.filter(n => !n.is_read).length;

        res.json({
            success: true,
            data: notifications,
            unreadCount
        });
    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch notifications' });
    }
});

// Mark single notification as read
router.put('/:id/read', authenticateToken, async (req, res) => {
    try {
        await pool.query(
            "UPDATE Notifications SET is_read = TRUE WHERE notification_id = ? AND user_id = ?",
            [req.params.id, req.user.id]
        );
        res.json({ success: true });
    } catch (error) {
        console.error('Mark read error:', error);
        res.status(500).json({ success: false, message: 'Failed to mark as read' });
    }
});

// Mark all as read
router.put('/read-all', authenticateToken, async (req, res) => {
    try {
        await pool.query(
            "UPDATE Notifications SET is_read = TRUE WHERE user_id = ?",
            [req.user.id]
        );
        res.json({ success: true });
    } catch (error) {
        console.error('Mark all read error:', error);
        res.status(500).json({ success: false, message: 'Failed to mark all as read' });
    }
});

export default router;
