import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config();

// Create connection pool
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'telecom_network_db',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Initialize database schema
export async function initializeDatabase() {
    const connection = await pool.getConnection();

    try {
        // Create database if not exists
        await connection.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME || 'telecom_network_db'}`);
        await connection.query(`USE ${process.env.DB_NAME || 'telecom_network_db'}`);

        // Users table
        await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT PRIMARY KEY AUTO_INCREMENT,
        username VARCHAR(100) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role ENUM('admin', 'technician', 'viewer') DEFAULT 'viewer',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

        // Technicians table
        await connection.query(`
      CREATE TABLE IF NOT EXISTS technicians (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(50),
        specialization VARCHAR(100),
        status ENUM('available', 'busy', 'offline') DEFAULT 'available',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

        // Network components table
        await connection.query(`
      CREATE TABLE IF NOT EXISTS network_components (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(255) NOT NULL,
        type ENUM('router', 'switch', 'cable', 'server', 'firewall', 'access_point') NOT NULL,
        model VARCHAR(255),
        manufacturer VARCHAR(255),
        serial_number VARCHAR(100) UNIQUE,
        ip_address VARCHAR(45),
        mac_address VARCHAR(17),
        location VARCHAR(255),
        status ENUM('active', 'inactive', 'maintenance', 'faulty') DEFAULT 'active',
        configuration JSON,
        installed_at DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

        // Faults table
        await connection.query(`
      CREATE TABLE IF NOT EXISTS faults (
        id INT PRIMARY KEY AUTO_INCREMENT,
        component_id INT,
        assigned_technician_id INT,
        reported_by INT,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        category ENUM('hardware', 'software', 'connectivity', 'power', 'security', 'performance') NOT NULL,
        priority ENUM('critical', 'high', 'medium', 'low') DEFAULT 'medium',
        status ENUM('open', 'in_progress', 'resolved', 'closed') DEFAULT 'open',
        reported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        assigned_at TIMESTAMP NULL,
        resolved_at TIMESTAMP NULL,
        resolution_notes TEXT,
        response_time_minutes INT,
        FOREIGN KEY (component_id) REFERENCES network_components(id) ON DELETE SET NULL,
        FOREIGN KEY (assigned_technician_id) REFERENCES technicians(id) ON DELETE SET NULL,
        FOREIGN KEY (reported_by) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

        // Maintenance history table
        await connection.query(`
      CREATE TABLE IF NOT EXISTS maintenance_history (
        id INT PRIMARY KEY AUTO_INCREMENT,
        component_id INT,
        technician_id INT,
        type ENUM('scheduled', 'emergency', 'upgrade', 'inspection') NOT NULL,
        description TEXT,
        performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        duration_minutes INT,
        FOREIGN KEY (component_id) REFERENCES network_components(id) ON DELETE CASCADE,
        FOREIGN KEY (technician_id) REFERENCES technicians(id) ON DELETE SET NULL
      )
    `);

        // Incident reports table
        await connection.query(`
      CREATE TABLE IF NOT EXISTS incident_reports (
        id INT PRIMARY KEY AUTO_INCREMENT,
        title VARCHAR(255) NOT NULL,
        summary TEXT,
        start_time TIMESTAMP NOT NULL,
        end_time TIMESTAMP NULL,
        affected_components_count INT DEFAULT 0,
        total_faults INT DEFAULT 0,
        avg_resolution_time DECIMAL(10, 2),
        impact_level ENUM('critical', 'major', 'minor') DEFAULT 'minor',
        details JSON,
        generated_by INT,
        generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (generated_by) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

        // Metrics snapshots table
        await connection.query(`
      CREATE TABLE IF NOT EXISTS metrics_snapshots (
        id INT PRIMARY KEY AUTO_INCREMENT,
        uptime_percentage DECIMAL(5, 2),
        total_faults_today INT DEFAULT 0,
        resolved_faults_today INT DEFAULT 0,
        avg_response_time DECIMAL(10, 2),
        active_components INT DEFAULT 0,
        components_in_maintenance INT DEFAULT 0,
        recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

        console.log('✅ Database schema initialized successfully');

        // Seed sample data
        await seedSampleData(connection);

    } catch (error) {
        console.error('❌ Database initialization error:', error);
        throw error;
    } finally {
        connection.release();
    }
}

// Seed sample data
async function seedSampleData(connection) {
    try {
        // Check if data already exists
        const [users] = await connection.query('SELECT COUNT(*) as count FROM users');
        if (users[0].count > 0) {
            console.log('📊 Sample data already exists, skipping seed');
            return;
        }

        // Create admin user
        const hashedPassword = await bcrypt.hash('admin123', 10);
        await connection.query(`
      INSERT INTO users (username, email, password, role) VALUES
      ('admin', 'admin@telecom.com', ?, 'admin'),
      ('tech1', 'tech1@telecom.com', ?, 'technician'),
      ('tech2', 'tech2@telecom.com', ?, 'technician'),
      ('viewer', 'viewer@telecom.com', ?, 'viewer')
    `, [hashedPassword, hashedPassword, hashedPassword, hashedPassword]);

        // Create technicians
        await connection.query(`
      INSERT INTO technicians (user_id, name, email, phone, specialization, status) VALUES
      (2, 'John Smith', 'tech1@telecom.com', '+1-555-0101', 'Network Infrastructure', 'available'),
      (3, 'Sarah Johnson', 'tech2@telecom.com', '+1-555-0102', 'Hardware Maintenance', 'available')
    `);

        // Create network components
        await connection.query(`
      INSERT INTO network_components (name, type, model, manufacturer, serial_number, ip_address, location, status, installed_at) VALUES
      ('Core Router 1', 'router', 'Cisco ISR 4451', 'Cisco', 'CR-001-2024', '192.168.1.1', 'Data Center A - Rack 1', 'active', '2024-01-15'),
      ('Core Router 2', 'router', 'Cisco ISR 4451', 'Cisco', 'CR-002-2024', '192.168.1.2', 'Data Center A - Rack 2', 'active', '2024-01-15'),
      ('Distribution Switch 1', 'switch', 'Cisco Catalyst 9300', 'Cisco', 'DS-001-2024', '192.168.2.1', 'Data Center A - Rack 3', 'active', '2024-02-01'),
      ('Distribution Switch 2', 'switch', 'Cisco Catalyst 9300', 'Cisco', 'DS-002-2024', '192.168.2.2', 'Data Center B - Rack 1', 'maintenance', '2024-02-01'),
      ('Edge Firewall', 'firewall', 'Palo Alto PA-3260', 'Palo Alto', 'FW-001-2024', '192.168.0.1', 'Data Center A - Security Zone', 'active', '2024-01-10'),
      ('Backup Server', 'server', 'Dell PowerEdge R750', 'Dell', 'SV-001-2024', '192.168.10.1', 'Data Center B - Rack 2', 'active', '2024-03-01'),
      ('Fiber Backbone A', 'cable', 'Single Mode 100G', 'Corning', 'CB-001-2024', NULL, 'Building A to B', 'active', '2023-12-01'),
      ('Access Point Floor 1', 'access_point', 'Cisco Meraki MR56', 'Cisco', 'AP-001-2024', '192.168.5.1', 'Building A - Floor 1', 'active', '2024-04-01')
    `);

        // Create sample faults
        await connection.query(`
      INSERT INTO faults (component_id, assigned_technician_id, reported_by, title, description, category, priority, status, reported_at) VALUES
      (4, 1, 1, 'Switch intermittent connectivity', 'Distribution Switch 2 experiencing packet loss during peak hours', 'connectivity', 'high', 'in_progress', NOW() - INTERVAL 2 DAY),
      (6, 2, 1, 'Server high CPU usage', 'Backup server showing sustained 95% CPU utilization', 'performance', 'medium', 'open', NOW() - INTERVAL 1 DAY),
      (1, 1, 2, 'Router config backup failed', 'Scheduled configuration backup did not complete', 'software', 'low', 'resolved', NOW() - INTERVAL 5 DAY)
    `);

        // Update resolved fault with resolution details
        await connection.query(`
      UPDATE faults SET resolved_at = NOW() - INTERVAL 4 DAY, 
      resolution_notes = 'Corrected backup script path and verified successful backup',
      response_time_minutes = 45
      WHERE id = 3
    `);

        // Create metrics snapshot
        await connection.query(`
      INSERT INTO metrics_snapshots (uptime_percentage, total_faults_today, resolved_faults_today, avg_response_time, active_components, components_in_maintenance) VALUES
      (99.85, 2, 0, 42.5, 7, 1)
    `);

        console.log('✅ Sample data seeded successfully');
    } catch (error) {
        console.error('⚠️ Sample data seeding error (may already exist):', error.message);
    }
}

export default pool;
