import express from 'express';
import bcrypt from 'bcryptjs';
import pool from '../database.js';
import { generateToken } from '../middleware/auth.js';

const router = express.Router();

// Register new user
router.post('/register', async (req, res) => {
    try {
        const { username, email, password, first_name, last_name, phone_number, role = 'Viewer' } = req.body;

        if (!username || !email || !password || !first_name || !last_name) {
            return res.status(400).json({
                success: false,
                message: 'Username, email, first name, last name, and password are required'
            });
        }

        // Check if user already exists
        const [existing] = await pool.query(
            'SELECT user_id FROM Users WHERE username = ? OR email = ?',
            [username, email]
        );

        if (existing.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'Username or email already exists'
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert new user
        const [result] = await pool.query(
            'INSERT INTO Users (username, email, password_hash, first_name, last_name, phone_number, role) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [username, email, hashedPassword, first_name, last_name, phone_number, role]
        );

        const token = generateToken({
            id: result.insertId,
            username,
            email,
            role
        });

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            data: {
                user_id: result.insertId,
                username,
                email,
                role,
                token
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Registration failed'
        });
    }
});

// Login user
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: 'Username and password are required'
            });
        }

        // Find user
        const [users] = await pool.query(
            'SELECT * FROM Users WHERE username = ? OR email = ?',
            [username, username]
        );

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        const user = users[0];

        // Verify password
        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        const token = generateToken({
            id: user.user_id,
            username: user.username,
            email: user.email,
            role: user.role
        });

        res.json({
            success: true,
            message: 'Login successful',
            data: {
                user_id: user.user_id,
                username: user.username,
                email: user.email,
                role: user.role,
                first_name: user.first_name,
                last_name: user.last_name,
                name: `${user.first_name} ${user.last_name}`,
                token
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Login failed'
        });
    }
});

// Get current user profile
router.get('/profile', async (req, res) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Access token required'
            });
        }

        const jwt = await import('jsonwebtoken');
        const decoded = jwt.default.verify(token, process.env.JWT_SECRET || 'telecom_network_secret_key_2024');

        const [users] = await pool.query(
            'SELECT user_id, username, email, role, full_name, phone_number, created_at FROM Users WHERE user_id = ?',
            [decoded.id]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            data: users[0]
        });
    } catch (error) {
        console.error('Profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch profile'
        });
    }
});

export default router;
