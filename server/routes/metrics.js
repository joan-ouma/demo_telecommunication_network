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
        SUM(CASE WHEN status = 'Active' THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN status = 'Maintenance' THEN 1 ELSE 0 END) as maintenance,
        SUM(CASE WHEN status = 'Faulty' THEN 1 ELSE 0 END) as faulty,
        SUM(CASE WHEN status = 'Inactive' THEN 1 ELSE 0 END) as inactive
      FROM Network_Components
    `);

    // Fault statistics
    const [faultStats] = await pool.query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'Open' THEN 1 ELSE 0 END) as open_faults,
        SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END) as in_progress,
        SUM(CASE WHEN status IN ('Resolved', 'Closed') THEN 1 ELSE 0 END) as resolved,
        SUM(CASE WHEN priority = 'Critical' AND status NOT IN ('Resolved', 'Closed') THEN 1 ELSE 0 END) as critical_open,
        SUM(CASE WHEN priority = 'High' AND status NOT IN ('Resolved', 'Closed') THEN 1 ELSE 0 END) as high_open,
        SUM(CASE WHEN priority = 'Medium' AND status NOT IN ('Resolved', 'Closed') THEN 1 ELSE 0 END) as medium_open,
        SUM(CASE WHEN priority = 'Low' AND status NOT IN ('Resolved', 'Closed') THEN 1 ELSE 0 END) as low_open
      FROM Faults
    `);

    // Today's faults
    const [todayFaults] = await pool.query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status IN ('Resolved', 'Closed') THEN 1 ELSE 0 END) as resolved
      FROM Faults 
      WHERE DATE(reported_at) = CURDATE()
    `);

    // Average response time (last 30 days)
    const [avgResponse] = await pool.query(`
      SELECT AVG(response_time_minutes) as avg_time
      FROM Faults 
      WHERE response_time_minutes IS NOT NULL 
        AND resolved_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    `);

    // Calculate uptime percentage
    const stats = componentStats[0];
    const uptimePercentage = stats.total > 0
      ? ((stats.active / stats.total) * 100).toFixed(2)
      : 100;

    // Technician availability - Note: New Users table doesn't have 'status' column.
    // We will just count total Technicians. Availability feature is deprecated in new schema unless we infer it.
    const [techStats] = await pool.query(`
      SELECT 
        COUNT(CASE WHEN role = 'Technician' THEN 1 END) as total,
        COUNT(CASE WHEN role = 'Staff' AND status = 'Active' THEN 1 END) as active_staff
      FROM Users
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
        staff_count: techStats[0].active_staff,
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
        SUM(CASE WHEN priority = 'Critical' THEN 1 ELSE 0 END) as critical,
        SUM(CASE WHEN priority = 'High' THEN 1 ELSE 0 END) as high,
        SUM(CASE WHEN priority = 'Medium' THEN 1 ELSE 0 END) as medium,
        SUM(CASE WHEN priority = 'Low' THEN 1 ELSE 0 END) as low
      FROM Faults 
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
      FROM Faults 
      WHERE resolved_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
        AND response_time_minutes IS NOT NULL
      GROUP BY DATE(resolved_at)
      ORDER BY date
    `, [parseInt(days)]);

    // Component status over time (from snapshots)
    const [snapshots] = await pool.query(`
      SELECT * FROM Metrics_Snapshots 
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
        nc.component_id as id,
        nc.name,
        nc.type,
        nc.status,
        nc.location,
        COUNT(f.fault_id) as total_faults,
        SUM(CASE WHEN f.status NOT IN ('Resolved', 'Closed') THEN 1 ELSE 0 END) as open_faults,
        AVG(f.response_time_minutes) as avg_resolution_time,
        MAX(f.reported_at) as last_fault_date
      FROM Network_Components nc
      LEFT JOIN Faults f ON nc.component_id = f.component_id
      GROUP BY nc.component_id
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
      if (comp.status === 'Maintenance') healthScore -= 10;
      if (comp.status === 'Faulty') healthScore -= 30;
      if (comp.status === 'Inactive') healthScore -= 20;

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
        SUM(CASE WHEN status = 'Active' THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN status = 'Maintenance' THEN 1 ELSE 0 END) as maintenance
      FROM Network_Components
    `);

    const [faultStats] = await pool.query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status IN ('Resolved', 'Closed') THEN 1 ELSE 0 END) as resolved
      FROM Faults 
      WHERE DATE(reported_at) = CURDATE()
    `);

    const [avgResponse] = await pool.query(`
      SELECT AVG(response_time_minutes) as avg_time
      FROM Faults 
      WHERE response_time_minutes IS NOT NULL 
        AND DATE(resolved_at) = CURDATE()
    `);

    const stats = componentStats[0];
    const uptimePercentage = stats.total > 0
      ? ((stats.active / stats.total) * 100).toFixed(2)
      : 100;

    await pool.query(`
      INSERT INTO Metrics_Snapshots 
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
    const { time_range = 'monthly' } = req.query;

    let days = 30;
    if (time_range === 'daily') days = 1;
    if (time_range === 'weekly') days = 7;

    // Mean Time To Repair (MTTR)
    const [mttr] = await pool.query(`
      SELECT AVG(response_time_minutes) as mttr
      FROM Faults 
      WHERE response_time_minutes IS NOT NULL 
        AND resolved_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
    `, [days]);

    // Fault frequency (faults per day)
    // For 'daily', it's just total faults today. For others, it's average per day.
    const [frequency] = await pool.query(`
      SELECT COUNT(*) / ? as daily_avg
      FROM Faults 
      WHERE reported_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
    `, [days, days]);

    // Resolution rate
    const [resolutionRate] = await pool.query(`
      SELECT 
        SUM(CASE WHEN status IN ('Resolved', 'Closed') THEN 1 ELSE 0 END) / COUNT(*) * 100 as rate
      FROM Faults 
      WHERE reported_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
    `, [days]);

    // Component availability (This is a current snapshot, time range applies less here, 
    // but users might expect "Average availability over X days" which requires snapshots. 
    // For now, allow it to remain current status or calculate from snapshots if possible.
    // Component availability (Dynamic Calculation)
    const [compCountRes] = await pool.query('SELECT COUNT(*) as total FROM Network_Components');
    const totalComponents = compCountRes[0].total || 1;

    const [downtimeRes] = await pool.query(`
      SELECT SUM(response_time_minutes) as total_downtime
      FROM Faults 
      WHERE resolved_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
    `, [days]);

    const totalDowntime = Number(downtimeRes[0].total_downtime) || 0;
    const totalPossibleMinutes = days * 24 * 60 * totalComponents;

    const availabilityPercent = Math.max(0, ((totalPossibleMinutes - totalDowntime) / totalPossibleMinutes) * 100);

    // Technician Performance Stats
    const [techPerformance] = await pool.query(`
      SELECT 
        u.user_id,
        CONCAT(u.first_name, ' ', u.last_name) as name,
        COUNT(CASE WHEN f.status IN ('Resolved', 'Closed') AND f.resolved_at >= DATE_SUB(NOW(), INTERVAL ? DAY) THEN 1 END) as resolved_count,
        COUNT(CASE WHEN f.assigned_to = u.user_id AND f.reported_at >= DATE_SUB(NOW(), INTERVAL ? DAY) THEN 1 END) as assigned_count,
        AVG(CASE WHEN f.status IN ('Resolved', 'Closed') AND f.resolved_at >= DATE_SUB(NOW(), INTERVAL ? DAY) THEN f.response_time_minutes END) as avg_resolution_time
      FROM Users u
      LEFT JOIN Faults f ON u.user_id = f.assigned_to
      WHERE u.role = 'Technician'
      GROUP BY u.user_id
      ORDER BY resolved_count DESC
    `, [days, days, days]);

    res.json({
      success: true,
      data: {
        mttr_minutes: Math.round(Number(mttr[0].mttr) || 0),
        fault_frequency_daily: parseFloat((Number(frequency[0].daily_avg) || 0).toFixed(2)),
        avg_first_response_minutes: 0,
        resolution_rate_percent: parseFloat((Number(resolutionRate[0].rate) || 0).toFixed(2)),
        availability_percent: parseFloat(availabilityPercent.toFixed(2)),
        technician_performance: techPerformance,
        time_range: time_range
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
