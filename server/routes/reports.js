import express from 'express';
import pool from '../database.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Get all incident reports
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { impact_level, from_date, to_date } = req.query;
        let query = `
      SELECT ir.*, u.username as generated_by_name
      FROM Incident_Reports ir
      LEFT JOIN Users u ON ir.generated_by = u.user_id
      WHERE 1=1
    `;
        const params = [];

        if (impact_level) {
            query += ' AND ir.impact_level = ?';
            params.push(impact_level);
        }

        if (from_date) {
            query += ' AND ir.start_time >= ?';
            params.push(from_date);
        }

        if (to_date) {
            query += ' AND ir.end_time <= ?';
            params.push(to_date);
        }

        query += ' ORDER BY ir.generated_at DESC';

        const [reports] = await pool.query(query, params);

        res.json({
            success: true,
            data: reports,
            count: reports.length
        });
    } catch (error) {
        // Table might not exist yet if I forgot to restore it. 
        console.error('Get reports error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch reports'
        });
    }
});

// Get single report
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const [reports] = await pool.query(`
      SELECT ir.*, u.username as generated_by_name
      FROM Incident_Reports ir
      LEFT JOIN Users u ON ir.generated_by = u.user_id
      WHERE ir.report_id = ?
    `, [req.params.id]);

        if (reports.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Report not found'
            });
        }

        res.json({
            success: true,
            data: reports[0]
        });
    } catch (error) {
        console.error('Get report error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch report'
        });
    }
});

// Generate new incident report
router.post('/generate', authenticateToken, requireRole('Admin', 'Technician'), async (req, res) => {
    try {
        const { title, start_time, end_time, summary } = req.body;

        if (!title || !start_time || !end_time) {
            return res.status(400).json({
                success: false,
                message: 'Title, start time, and end time are required'
            });
        }

        // Fetch faults within the time range
        const [faults] = await pool.query(`
      SELECT f.*, nc.name as component_name, nc.type as component_type,
             t.full_name as technician_name
      FROM Faults f
      LEFT JOIN Network_Components nc ON f.component_id = nc.component_id
      LEFT JOIN Users t ON f.assigned_to = t.user_id
      WHERE f.reported_at BETWEEN ? AND ?
      ORDER BY FIELD(f.priority, 'Critical', 'High', 'Medium', 'Low'), f.reported_at
    `, [start_time, end_time]);

        // Calculate statistics
        const [avgResolution] = await pool.query(`
      SELECT AVG(response_time_minutes) as avg_time
      FROM Faults 
      WHERE reported_at BETWEEN ? AND ?
        AND response_time_minutes IS NOT NULL
    `, [start_time, end_time]);

        // Get affected components count
        const [affectedComponents] = await pool.query(`
      SELECT COUNT(DISTINCT component_id) as count
      FROM Faults 
      WHERE reported_at BETWEEN ? AND ?
        AND component_id IS NOT NULL
    `, [start_time, end_time]);

        // Determine impact level based on critical faults
        const criticalCount = faults.filter(f => f.priority === 'Critical').length;
        const highCount = faults.filter(f => f.priority === 'High').length;
        let impactLevel = 'minor';
        if (criticalCount > 0) impactLevel = 'critical';
        else if (highCount > 2) impactLevel = 'major';

        // Compile details
        const details = {
            faults: faults.map(f => ({
                id: f.fault_id,
                title: f.title,
                priority: f.priority,
                status: f.status,
                component: f.component_name,
                technician: f.technician_name,
                reported_at: f.reported_at,
                resolved_at: f.resolved_at,
                response_time: f.response_time_minutes
            })),
            statistics: {
                by_priority: {
                    critical: faults.filter(f => f.priority === 'Critical').length,
                    high: faults.filter(f => f.priority === 'High').length,
                    medium: faults.filter(f => f.priority === 'Medium').length,
                    low: faults.filter(f => f.priority === 'Low').length
                },
                by_status: {
                    open: faults.filter(f => f.status === 'Open').length,
                    in_progress: faults.filter(f => f.status === 'In Progress').length,
                    resolved: faults.filter(f => f.status === 'Resolved').length,
                    closed: faults.filter(f => f.status === 'Closed').length
                },
                by_category: faults.reduce((acc, f) => {
                    acc[f.category] = (acc[f.category] || 0) + 1;
                    return acc;
                }, {})
            }
        };

        // Insert report
        const [result] = await pool.query(`
      INSERT INTO Incident_Reports 
      (title, summary, start_time, end_time, affected_components_count, total_faults, avg_resolution_time, impact_level, details, generated_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
            title,
            summary || `Incident report covering ${faults.length} faults from ${start_time} to ${end_time}`,
            start_time,
            end_time,
            affectedComponents[0].count,
            faults.length,
            avgResolution[0].avg_time || 0,
            impactLevel,
            JSON.stringify(details),
            req.user.id
        ]);

        res.status(201).json({
            success: true,
            message: 'Incident report generated successfully',
            data: {
                id: result.insertId,
                title,
                impact_level: impactLevel,
                total_faults: faults.length,
                affected_components: affectedComponents[0].count,
                avg_resolution_time: Math.round(avgResolution[0].avg_time || 0)
            }
        });
    } catch (error) {
        console.error('Generate report error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate report'
        });
    }
});

// Get report trends
router.get('/trends/summary', authenticateToken, async (req, res) => {
    try {
        const { months = 6 } = req.query;

        // Reports per month
        const [reportsPerMonth] = await pool.query(`
      SELECT 
        DATE_FORMAT(generated_at, '%Y-%m') as month,
        COUNT(*) as count,
        SUM(total_faults) as total_faults,
        AVG(avg_resolution_time) as avg_resolution_time,
        SUM(CASE WHEN impact_level = 'critical' THEN 1 ELSE 0 END) as critical_incidents
      FROM Incident_Reports 
      WHERE generated_at >= DATE_SUB(NOW(), INTERVAL ? MONTH)
      GROUP BY DATE_FORMAT(generated_at, '%Y-%m')
      ORDER BY month
    `, [parseInt(months)]);

        // Most affected components
        const [affectedComponents] = await pool.query(`
      SELECT 
        nc.component_id,
        nc.name,
        nc.type,
        COUNT(f.fault_id) as fault_count
      FROM Faults f
      JOIN Network_Components nc ON f.component_id = nc.component_id
      WHERE f.reported_at >= DATE_SUB(NOW(), INTERVAL ? MONTH)
      GROUP BY nc.component_id
      ORDER BY fault_count DESC
      LIMIT 5
    `, [parseInt(months)]);

        // Common fault categories
        const [categories] = await pool.query(`
      SELECT category, COUNT(*) as count
      FROM Faults 
      WHERE reported_at >= DATE_SUB(NOW(), INTERVAL ? MONTH)
      GROUP BY category
      ORDER BY count DESC
    `, [parseInt(months)]);

        res.json({
            success: true,
            data: {
                reports_per_month: reportsPerMonth,
                most_affected_components: affectedComponents,
                fault_categories: categories
            }
        });
    } catch (error) {
        console.error('Get trends error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch trends'
        });
    }
});

// Delete report
router.delete('/:id', authenticateToken, requireRole('Admin'), async (req, res) => {
    try {
        const [result] = await pool.query(
            'DELETE FROM Incident_Reports WHERE report_id = ?',
            [req.params.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Report not found'
            });
        }

        res.json({
            success: true,
            message: 'Report deleted successfully'
        });
    } catch (error) {
        console.error('Delete report error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete report'
        });
    }
});

export default router;
