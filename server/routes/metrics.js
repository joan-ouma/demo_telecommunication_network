import express from 'express';
import pool from '../database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get current metrics dashboard
router.get('/dashboard', authenticateToken, async (req, res) => {
    try {
        // Total components and their statuses
        const [componentStats] = await pool.query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN status = 'maintenance' THEN 1 ELSE 0 END) as maintenance,
        SUM(CASE WHEN status = 'faulty' THEN 1 ELSE 0 END) as faulty,
        SUM(CASE WHEN status = 'inactive' THEN 1 ELSE 0 END) as inactive
      FROM network_components
    `);

        // Fault statistics
        const [faultStats] = await pool.query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as open_faults,
        SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
        SUM(CASE WHEN status IN ('resolved', 'closed') THEN 1 ELSE 0 END) as resolved,
        SUM(CASE WHEN priority = 'critical' AND status NOT IN ('resolved', 'closed') THEN 1 ELSE 0 END) as critical_open
      FROM faults
    `);

        // Today's faults
        const [todayFaults] = await pool.query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status IN ('resolved', 'closed') THEN 1 ELSE 0 END) as resolved
      FROM faults 
      WHERE DATE(reported_at) = CURDATE()
    `);

        // Average response time (last 30 days)
        const [avgResponse] = await pool.query(`
      SELECT AVG(response_time_minutes) as avg_time
      FROM faults 
      WHERE response_time_minutes IS NOT NULL 
        AND resolved_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    `);

        // Calculate uptime percentage
        const stats = componentStats[0];
        const uptimePercentage = stats.total > 0
            ? ((stats.active / stats.total) * 100).toFixed(2)
            : 100;

        // Technician availability
        const [techStats] = await pool.query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) as available,
        SUM(CASE WHEN status = 'busy' THEN 1 ELSE 0 END) as busy
      FROM technicians
    `);

        res.json({
            success: true,
            data: {
                uptime_percentage: parseFloat(uptimePercentage),
                components: componentStats[0],
                faults: faultStats[0],
                today: todayFaults[0],
                avg_response_time: Math.round(avgResponse[0].avg_time || 0),
                technicians: techStats[0],
                last_updated: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Get dashboard metrics error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch dashboard metrics'
        });
    }
});

// Get historical metrics
router.get('/history', authenticateToken, async (req, res) => {
    try {
        const { days = 7 } = req.query;

        // Faults per day
        const [faultsPerDay] = await pool.query(`
      SELECT 
        DATE(reported_at) as date,
        COUNT(*) as total,
        SUM(CASE WHEN priority = 'critical' THEN 1 ELSE 0 END) as critical,
        SUM(CASE WHEN priority = 'high' THEN 1 ELSE 0 END) as high,
        SUM(CASE WHEN priority = 'medium' THEN 1 ELSE 0 END) as medium,
        SUM(CASE WHEN priority = 'low' THEN 1 ELSE 0 END) as low
      FROM faults 
      WHERE reported_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
      GROUP BY DATE(reported_at)
      ORDER BY date
    `, [parseInt(days)]);

        // Resolution times per day
        const [resolutionTimes] = await pool.query(`
      SELECT 
        DATE(resolved_at) as date,
        AVG(response_time_minutes) as avg_time,
        MIN(response_time_minutes) as min_time,
        MAX(response_time_minutes) as max_time,
        COUNT(*) as count
      FROM faults 
      WHERE resolved_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
        AND response_time_minutes IS NOT NULL
      GROUP BY DATE(resolved_at)
      ORDER BY date
    `, [parseInt(days)]);

        // Component status over time (from snapshots)
        const [snapshots] = await pool.query(`
      SELECT * FROM metrics_snapshots 
      WHERE recorded_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      ORDER BY recorded_at
    `, [parseInt(days)]);

        res.json({
            success: true,
            data: {
                faults_per_day: faultsPerDay,
                resolution_times: resolutionTimes,
                snapshots: snapshots
            }
        });
    } catch (error) {
        console.error('Get history error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch historical metrics'
        });
    }
});

// Get component health metrics
router.get('/health', authenticateToken, async (req, res) => {
    try {
        const [components] = await pool.query(`
      SELECT 
        nc.id,
        nc.name,
        nc.type,
        nc.status,
        nc.location,
        COUNT(f.id) as total_faults,
        SUM(CASE WHEN f.status NOT IN ('resolved', 'closed') THEN 1 ELSE 0 END) as open_faults,
        AVG(f.response_time_minutes) as avg_resolution_time,
        MAX(f.reported_at) as last_fault_date
      FROM network_components nc
      LEFT JOIN faults f ON nc.id = f.component_id
      GROUP BY nc.id
      ORDER BY open_faults DESC, total_faults DESC
    `);

        // Calculate health score for each component
        const healthData = components.map(comp => {
            let healthScore = 100;

            // Deduct for open faults
            healthScore -= (comp.open_faults || 0) * 15;

            // Deduct for total faults
            healthScore -= Math.min((comp.total_faults || 0) * 2, 20);

            // Deduct for poor resolution time
            if (comp.avg_resolution_time > 120) healthScore -= 10;

            // Deduct for status
            if (comp.status === 'maintenance') healthScore -= 10;
            if (comp.status === 'faulty') healthScore -= 30;
            if (comp.status === 'inactive') healthScore -= 20;

            return {
                ...comp,
                health_score: Math.max(0, Math.min(100, healthScore))
            };
        });

        res.json({
            success: true,
            data: healthData
        });
    } catch (error) {
        console.error('Get health metrics error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch health metrics'
        });
    }
});

// Record metrics snapshot (for scheduled cron jobs)
router.post('/snapshot', authenticateToken, async (req, res) => {
    try {
        const [componentStats] = await pool.query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN status = 'maintenance' THEN 1 ELSE 0 END) as maintenance
      FROM network_components
    `);

        const [faultStats] = await pool.query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status IN ('resolved', 'closed') THEN 1 ELSE 0 END) as resolved
      FROM faults 
      WHERE DATE(reported_at) = CURDATE()
    `);

        const [avgResponse] = await pool.query(`
      SELECT AVG(response_time_minutes) as avg_time
      FROM faults 
      WHERE response_time_minutes IS NOT NULL 
        AND DATE(resolved_at) = CURDATE()
    `);

        const stats = componentStats[0];
        const uptimePercentage = stats.total > 0
            ? ((stats.active / stats.total) * 100).toFixed(2)
            : 100;

        await pool.query(`
      INSERT INTO metrics_snapshots 
      (uptime_percentage, total_faults_today, resolved_faults_today, avg_response_time, active_components, components_in_maintenance)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
            uptimePercentage,
            faultStats[0].total,
            faultStats[0].resolved,
            avgResponse[0].avg_time || 0,
            stats.active,
            stats.maintenance
        ]);

        res.json({
            success: true,
            message: 'Metrics snapshot recorded'
        });
    } catch (error) {
        console.error('Record snapshot error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to record snapshot'
        });
    }
});

// Get KPI summary
router.get('/kpi', authenticateToken, async (req, res) => {
    try {
        // Mean Time To Repair (MTTR) - last 30 days
        const [mttr] = await pool.query(`
      SELECT AVG(response_time_minutes) as mttr
      FROM faults 
      WHERE response_time_minutes IS NOT NULL 
        AND resolved_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    `);

        // Fault frequency (faults per day - last 30 days)
        const [frequency] = await pool.query(`
      SELECT COUNT(*) / 30 as daily_avg
      FROM faults 
      WHERE reported_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    `);

        // First response time (time from report to assignment)
        const [firstResponse] = await pool.query(`
      SELECT AVG(TIMESTAMPDIFF(MINUTE, reported_at, assigned_at)) as avg_first_response
      FROM faults 
      WHERE assigned_at IS NOT NULL 
        AND assigned_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    `);

        // Resolution rate
        const [resolutionRate] = await pool.query(`
      SELECT 
        SUM(CASE WHEN status IN ('resolved', 'closed') THEN 1 ELSE 0 END) / COUNT(*) * 100 as rate
      FROM faults 
      WHERE reported_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    `);

        // Component availability
        const [availability] = await pool.query(`
      SELECT 
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) / COUNT(*) * 100 as rate
      FROM network_components
    `);

        res.json({
            success: true,
            data: {
                mttr_minutes: Math.round(mttr[0].mttr || 0),
                fault_frequency_daily: parseFloat((frequency[0].daily_avg || 0).toFixed(2)),
                avg_first_response_minutes: Math.round(firstResponse[0].avg_first_response || 0),
                resolution_rate_percent: parseFloat((resolutionRate[0].rate || 0).toFixed(2)),
                availability_percent: parseFloat((availability[0].rate || 0).toFixed(2))
            }
        });
    } catch (error) {
        console.error('Get KPI error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch KPIs'
        });
    }
});

export default router;
