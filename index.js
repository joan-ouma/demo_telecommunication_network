import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { initializeDatabase } from './server/database.js';

// Import routes
import authRoutes from './server/routes/auth.js';
import componentsRoutes from './server/routes/components.js';
import faultsRoutes from './server/routes/faults.js';
import techniciansRoutes from './server/routes/technicians.js';
import metricsRoutes from './server/routes/metrics.js';
import reportsRoutes from './server/routes/reports.js';
import maintenanceRoutes from './server/routes/maintenance.js';
import searchRoutes from './server/routes/search.js';
import auditRoutes from './server/routes/audit.js';
import inventoryRoutes from './server/routes/inventory.js';
import notificationsRoutes from './server/routes/notifications.js';
import departmentsRoutes from './server/routes/departments.js';
import usersRoutes from './server/routes/users.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files in production
app.use(express.static(path.join(__dirname, 'dist')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/components', componentsRoutes);
app.use('/api/faults', faultsRoutes);
app.use('/api/technicians', techniciansRoutes);
app.use('/api/metrics', metricsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/departments', departmentsRoutes);
app.use('/api/users', usersRoutes);


// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve React app for all other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Initialize database and start server
async function startServer() {
    try {
        await initializeDatabase();
        app.listen(PORT, () => {
            console.log(`Server running on http://localhost:${PORT}`);
            console.log(`API available at http://localhost:${PORT}/api`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();
