import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from project root (parent directory)
dotenv.config({ path: join(__dirname, '..', '.env') });

// Create connection pool
export const pool = mysql.createPool({
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
  // Create a connection without database selected to ensure we can create it
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    port: process.env.DB_PORT || 3306
  });

  try {
    // Create database if not exists
    await connection.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME || 'telecom_network_db'}`);
    await connection.query(`USE ${process.env.DB_NAME || 'telecom_network_db'}`);

    // Departments table (New)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS Departments (
        department_id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        location VARCHAR(100)
      )
    `);

    // Users table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS Users (
        user_id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        role ENUM('Admin', 'Manager', 'Technician', 'Staff') DEFAULT 'Technician',
        status ENUM('Active', 'Inactive') DEFAULT 'Active',
        department_id INT,
        phone_number VARCHAR(15),
        email VARCHAR(100) UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (department_id) REFERENCES Departments(department_id) ON DELETE SET NULL
      )
    `);

    // Update Users table if exists
    try {
      await connection.query("ALTER TABLE Users ADD COLUMN department_id INT");
      await connection.query("ALTER TABLE Users ADD CONSTRAINT users_fk_dept FOREIGN KEY (department_id) REFERENCES Departments(department_id) ON DELETE SET NULL");
    } catch (e) { /* Column likely exists */ }

    // Network Components table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS Network_Components (
        component_id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        type ENUM('Router', 'Switch', 'Cable', 'Server', 'Antenna', 'Firewall', 'Access Point') NOT NULL,
        department_id INT,
        model_number VARCHAR(100),
        ip_address VARCHAR(45),
        mac_address VARCHAR(17),
        location VARCHAR(100) NOT NULL,
        status ENUM('Active', 'Inactive', 'Maintenance', 'Faulty') DEFAULT 'Active',
        config_details TEXT,
        install_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (department_id) REFERENCES Departments(department_id) ON DELETE SET NULL
      )
    `);

    // Update Network_Components table if exists
    try {
      await connection.query("ALTER TABLE Network_Components ADD COLUMN department_id INT");
      await connection.query("ALTER TABLE Network_Components ADD CONSTRAINT comp_fk_dept FOREIGN KEY (department_id) REFERENCES Departments(department_id) ON DELETE SET NULL");
    } catch (e) { /* Column likely exists */ }

    // Inventory Items table (missing piece added)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS Inventory_Items (
        item_id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        category VARCHAR(50) NOT NULL,
        quantity INT DEFAULT 0,
        min_level INT DEFAULT 5,
        unit_cost DECIMAL(10, 2) DEFAULT 0.00,
        location VARCHAR(100),
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Add latitude/longitude columns if they don't exist
    try {
      await connection.query("ALTER TABLE Network_Components ADD COLUMN latitude DECIMAL(10, 8)");
    } catch (e) { /* Column likely exists */ }
    try {
      await connection.query("ALTER TABLE Network_Components ADD COLUMN longitude DECIMAL(11, 8)");
    } catch (e) { /* Column likely exists */ }

    // Faults table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS Faults (
        fault_id INT AUTO_INCREMENT PRIMARY KEY,
        component_id INT NOT NULL,
        reported_by INT NOT NULL,
        assigned_to INT,
        priority ENUM('Critical', 'High', 'Medium', 'Low') DEFAULT 'Medium',
        status ENUM('Open', 'In Progress', 'Resolved', 'Closed', 'Pending') DEFAULT 'Open',
        description TEXT NOT NULL,
        title VARCHAR(255) NOT NULL,
        category VARCHAR(50) DEFAULT 'general',
        reported_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        started_at DATETIME,
        scheduled_for DATETIME,
        resolved_at DATETIME,
        response_time_minutes INT,
        resolution_notes TEXT,
        FOREIGN KEY (component_id) REFERENCES Network_Components(component_id) ON DELETE RESTRICT,
        FOREIGN KEY (reported_by) REFERENCES Users(user_id) ON DELETE RESTRICT,
        FOREIGN KEY (assigned_to) REFERENCES Users(user_id) ON DELETE SET NULL
      )
    `);

    // Maintenance Logs table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS Maintenance_Logs (
        log_id INT AUTO_INCREMENT PRIMARY KEY,
        component_id INT NOT NULL,
        technician_id INT NOT NULL,
        activity_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        action_taken TEXT NOT NULL,
        result VARCHAR(50),
        duration_minutes INT,
        type VARCHAR(50) DEFAULT 'scheduled',
        FOREIGN KEY (component_id) REFERENCES Network_Components(component_id) ON DELETE RESTRICT,
        FOREIGN KEY (technician_id) REFERENCES Users(user_id) ON DELETE RESTRICT
      )
    `);

    // Incident Reports table (Added to support reports feature)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS Incident_Reports (
        report_id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        summary TEXT,
        start_time DATETIME NOT NULL,
        end_time DATETIME,
        affected_components_count INT DEFAULT 0,
        total_faults INT DEFAULT 0,
        avg_resolution_time DECIMAL(10, 2),
        impact_level ENUM('minor', 'major', 'critical') DEFAULT 'minor',
        details JSON,
        generated_by INT,
        generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (generated_by) REFERENCES Users(user_id) ON DELETE SET NULL
      )
    `);

    // Metrics Snapshots table (Added to support dashboard metrics)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS Metrics_Snapshots (
        snapshot_id INT AUTO_INCREMENT PRIMARY KEY,
        uptime_percentage DECIMAL(5, 2),
        total_faults_today INT DEFAULT 0,
        resolved_faults_today INT DEFAULT 0,
        avg_response_time DECIMAL(10, 2),
        active_components INT DEFAULT 0,
        components_in_maintenance INT DEFAULT 0,
        recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Fault Comments table (For technician-admin communication)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS Fault_Comments (
        comment_id INT AUTO_INCREMENT PRIMARY KEY,
        fault_id INT NOT NULL,
        user_id INT NOT NULL,
        comment TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (fault_id) REFERENCES Faults(fault_id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
      )
    `);

    // Maintenance Comments table (For technician-admin communication during maintenance)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS Maintenance_Comments (
        comment_id INT AUTO_INCREMENT PRIMARY KEY,
        log_id INT NOT NULL,
        user_id INT NOT NULL,
        comment TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (log_id) REFERENCES Maintenance_Logs(log_id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
      )
    `);

    // Audit Logs table (For tracking user actions)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS Audit_Logs (
        log_id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        action VARCHAR(50) NOT NULL,
        entity_type VARCHAR(50),
        entity_id INT,
        details TEXT,
        ip_address VARCHAR(45),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE SET NULL
      )
    `);

    // Notifications table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS Notifications (
        notification_id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        type ENUM('fault_assigned', 'status_change', 'low_stock', 'system') NOT NULL,
        message TEXT NOT NULL,
        link VARCHAR(255),
        is_read BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
      )
    `);

    console.log('✅ Database schema initialized successfully');

    // Seed sample data
    await seedSampleData(connection);
    await seedInventory(connection); // Call separately to ensure it runs even if users exist

  } catch (error) {
    console.error('❌ Database initialization error:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

// Seed sample data
async function seedSampleData(connection) {
  try {
    // Seed Departments
    const [depts] = await connection.query('SELECT COUNT(*) as count FROM Departments');
    if (depts[0].count === 0) {
      console.log('🏢 Seeding Departments...');
      const deptValues = [
        ['Network Operations', 'HQ Floor 2'],
        ['Data Center A', 'Building 1'],
        ['Data Center B', 'Building 2'],
        ['Field Operations', 'HQ Floor 1'],
        ['Customer Support', 'HQ Floor 3'],
        ['Warehouse', 'Logistics Center'],
        ['HR', 'HQ Floor 4'],
        ['Finance', 'HQ Floor 4'],
        ['IT Support', 'HQ Floor 2']
      ];
      await connection.query('INSERT INTO Departments (name, location) VALUES ?', [deptValues]);
    }

    const [users] = await connection.query('SELECT COUNT(*) as count FROM Users');
    if (users[0].count > 0) {
      console.log('📊 Sample data already exists, skipping seed');
      return;
    }

    // Assign departments to sample users (fetched IDs or hardcoded if sequential)
    // For simplicity in seed, we won't strictly bind IDs here unless we fetch them, 
    // but the column is nullable so it's fine.

    // Seed Users (hashed passwords would typically be done here, but implementing raw for now as requested/implied or hashing them)
    // NOTE: In a real app we MUST hash. I will hash them to match the Auth flow.
    // Seed Users with specific created_at dates
    // 1. Joan Ouma (Admin) - The first employee, started 2 years ago (2024-01-15 08:00:00)
    // 2. Yvonne Wangui - Hired 6 months later (2024-06-20 09:30:00)
    // 3. Milany Awuor - Hired last year (2024-11-05 08:45:00)
    // 4. Robin Wanjare - Hired 3 months ago
    // 5. Felix Kibet - The newest recruit (Hired 2 weeks ago)

    const adminPass = await bcrypt.hash('admin', 10);
    const techPass1 = await bcrypt.hash('tech_001', 10);
    const techPass2 = await bcrypt.hash('techy_002', 10);
    const techPass3 = await bcrypt.hash('techies_003', 10);
    const techPass4 = await bcrypt.hash('teky_004', 10);

    const now = new Date();
    const threeMonthsAgo = new Date(now); threeMonthsAgo.setMonth(now.getMonth() - 3);
    const twoWeeksAgo = new Date(now); twoWeeksAgo.setDate(now.getDate() - 14);

    const userValues = [
      ['jouma', adminPass, 'Joan', 'Ouma', 'Admin', '0712345678', 'joan.ouma@mnettywise.ac.ke', 'Active', '2024-01-15 08:00:00'],
      ['manager', adminPass, 'Alex', 'Mwangi', 'Manager', '0722001122', 'alex.mwangi@mnettywise.ac.ke', 'Active', '2024-02-01 08:00:00'],
      ['ywangui', techPass1, 'Yvonne', 'Wangui', 'Technician', '0722123456', 'yvonne.wangui@mnettywise.ac.ke', 'Active', '2024-06-20 09:30:00'],
      ['mawuor', techPass2, 'Milany', 'Awuor', 'Technician', '0733987654', 'milany.awuor@mnettywise.ac.ke', 'Active', '2024-11-05 08:45:00'],
      ['rwanjare', techPass3, 'Robin', 'Wanjare', 'Technician', '0799887766', 'robin.wanjare@mnettywise.ac.ke', 'Active', threeMonthsAgo],
      ['fkibet', techPass4, 'Felix', 'Kibet', 'Technician', '0711223344', 'felix.kibet@mnettywise.ac.ke', 'Active', twoWeeksAgo]
    ];

    await connection.query(
      `INSERT INTO Users (username, password_hash, first_name, last_name, role, phone_number, email, status, created_at) VALUES ?`,
      [userValues]
    );

    // Seed Network Components (Expanded detailed list)
    const componentValues = [
      // Spreading components out by ~0.002 degrees (~200m) for better map visibility without over-zooming

      // Server Room (Center)
      ['Core Router', 'Router', 'Cisco ISR 4451', '192.168.1.1', 'Active', 'Main Building - Server Room', '{"vlan": 10}', '2024-01-10', -1.2921, 36.8219],

      // Admin Block (North)
      ['Switch', 'Switch', 'Catalyst 9300', '192.168.2.10', 'Active', 'Admin Block', '{"ports": 48}', '2023-05-15', -1.2900, 36.8219],

      // Boardroom (North East)
      ['Access Point', 'Access Point', 'Ubiquiti UniFi 6 Pro', '192.168.3.5', 'Maintenance', 'Boardroom', '{"ssid": "Staff_Secure"}', '2023-08-30', -1.2905, 36.8235],

      // Reception (East)
      ['Access Point', 'Access Point', 'Ubiquiti UniFi 6 Lite', '192.168.3.10', 'Active', 'Main Lobby', '{"ssid": "Guest_WiFi"}', '2024-02-15', -1.2921, 36.8240],

      // Main Gate (South East) - Faulty (Red)
      ['Switch', 'Switch', 'Cisco 2960', '192.168.2.20', 'Faulty', 'Security Gate A', '{"ports": 8, "poe": true}', '2021-06-10', -1.2940, 36.8235],

      // Basement/Power (South)
      ['UPS Monitor', 'Server', 'APC Smart-UPS', '10.0.0.20', 'Active', 'Power Plant', '{"battery": "100%"}', '2022-11-20', -1.2942, 36.8219],

      // East Wing/Annex (South West)
      ['Switch', 'Switch', 'Catalyst 9200', '192.168.2.15', 'Active', 'West Wing Offices', '{"ports": 24}', '2023-01-10', -1.2935, 36.8200],

      // Cafeteria (West)
      ['Access Point', 'Access Point', 'Ubiquiti UniFi 6 LR', '192.168.3.15', 'Active', 'Staff Cafeteria', '{"ssid": "Staff_Common"}', '2023-09-01', -1.2921, 36.8195],

      // HR Dept (North West)
      ['Switch', 'Switch', 'Cisco 3560', '192.168.2.30', 'Active', 'HR Loading Dock', '{"ports": 24}', '2022-03-10', -1.2905, 36.8200],

      // Parking Lot (Far North) - Maintenance (Purple)
      ['Wireless Bridge', 'Antenna', 'Ubiquiti Nanostation', '192.168.4.5', 'Maintenance', 'Parking North', '{"link_quality": "98%"}', '2022-01-01', -1.2885, 36.8219]
    ];

    await connection.query(
      `INSERT INTO Network_Components (name, type, model_number, ip_address, status, location, config_details, install_date, latitude, longitude) VALUES ?`,
      [componentValues]
    );



    // Seed Faults (Expanded list covering more scenarios)
    const oneDayAgo = new Date(now); oneDayAgo.setDate(now.getDate() - 1);
    const twoDaysAgo = new Date(now); twoDaysAgo.setDate(now.getDate() - 2);
    const fiveDaysAgo = new Date(now); fiveDaysAgo.setDate(now.getDate() - 5);
    const oneWeekAgo = new Date(now); oneWeekAgo.setDate(now.getDate() - 7);
    const twoWeeksAgoDate = new Date(now); twoWeeksAgoDate.setDate(now.getDate() - 14);

    // 1. Yvonne (2) reports Faulty Switch (2), assigned to Felix (5)
    // 2. Robin (4) reports Overheating Server (4), assigned to Milany (3)
    const faultValues = [
      [2, 2, 5, 'Switch in Hall 7 issue', 'Switch in Hall 7 is not powering up. No lights on front panel.', 'High', 'Open', 'hardware', twoWeeksAgoDate, null, null],
      [4, 4, 3, 'Boardroom Server overheating', 'Boardroom Server is overheating. Fans spinning at 100%.', 'Medium', 'In Progress', 'hardware', oneWeekAgo, null, null],
      [5, 2, 2, 'Firewall Blocking Traffic', 'Users unable to stream video content', 'Low', 'Resolved', 'software', fiveDaysAgo, 120, new Date()],
      [7, 3, 4, 'Floor 2 Switch Port Error', 'Port 12 flashing orange continuously', 'Medium', 'Open', 'connectivity', twoDaysAgo, null, null],
      [6, 5, 2, 'Reception WiFi Slow', 'Signal dropping intermittently', 'Low', 'Pending', 'connectivity', oneDayAgo, null, null],
      [8, 2, 3, 'NAS Storage Full', 'Storage warning at 95% capacity', 'High', 'Closed', 'software', new Date(), 45, new Date()]
    ];

    await connection.query(
      `INSERT INTO Faults (component_id, reported_by, assigned_to, title, description, priority, status, category, reported_at, response_time_minutes, resolved_at) VALUES ?`,
      [faultValues]
    );

    // Seed Maintenance Logs (Added Duration Minutes)
    const oneMonthAgo = new Date(now); oneMonthAgo.setMonth(now.getMonth() - 1);
    const twoMonthsAgo = new Date(now); twoMonthsAgo.setMonth(now.getMonth() - 2);
    const threeWeeksAgo = new Date(now); threeWeeksAgo.setDate(now.getDate() - 21);

    const logValues = [
      [1, 3, oneMonthAgo, 'Updated firmware of the pc at the Admin Block to version 17.3', 'Success', 45],
      [2, 4, twoMonthsAgo, 'Replaced burnt fuse in power supply room', 'Success', 30],
      [5, 2, threeWeeksAgo, 'Configured firewall rules for new department VLAN', 'Success', 60],
      [8, 3, fiveDaysAgo, 'Cleared temp logs to free up space', 'Success', 30],
      [6, 5, oneWeekAgo, 'Reset AP settings to default and re-adopted', 'Success', 20]
    ];

    await connection.query(
      `INSERT INTO Maintenance_Logs (component_id, technician_id, activity_date, action_taken, result, duration_minutes) VALUES ?`,
      [logValues]
    );

    console.log('✅ Specific sample data seeded successfully');
  } catch (error) {
    console.error('⚠️ Sample data seeding error:', error);
  }
}

export default pool;

async function seedInventory(connection) {
  try {
    const [inventory] = await connection.query('SELECT COUNT(*) as count FROM Inventory_Items');
    if (inventory[0].count === 0) {
      console.log('📦 Seeding Inventory Items...');
      const inventoryItems = [
        ['Cisco 2960 Switch', 'Switches', 5, 2, 45000.00, 'Store Room A'],
        ['Cat6 Ethernet Cable (3m)', 'Cables', 150, 20, 500.00, 'Shelf B2'],
        ['RJ45 Connectors (Pack)', 'Tools', 50, 5, 1200.00, 'Cabinet 1'],
        ['Crimping Tool', 'Tools', 10, 2, 2500.00, 'Toolbox'],
        ['Fiber Patch Cord LC-LC', 'Fiber Optics', 30, 5, 1500.00, 'Shelf C1'],
        ['Ubiquiti UniFi 6 Lite', 'Access Points', 8, 3, 18000.00, 'Store Room A'],
        ['Fluke Network Tester', 'Tools', 2, 1, 85000.00, 'Safe 1']
      ];
      await connection.query('INSERT INTO Inventory_Items (name, category, quantity, min_level, unit_cost, location) VALUES ?', [inventoryItems]);
      console.log('✅ Inventory seeded');
    }
  } catch (e) {
    console.error('Inventory seed error:', e);
  }
}

// Auto-initialize when run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  initializeDatabase()
    .then(() => {
      console.log('🎉 Database setup complete! Pool exported and ready.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Database setup failed:', error);
      process.exit(1);
    });
}

