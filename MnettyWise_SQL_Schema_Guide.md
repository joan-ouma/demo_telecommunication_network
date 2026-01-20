# MnettyWise Network Management System - SQL Schema Guide

This guide contains all SQL statements used in the MnettyWise application. You can execute these step-by-step in MySQL Workbench to recreate the database schema and generate an EER diagram.

---

## 📋 Table of Contents

1. [Database Creation](#1-database-creation)
2. [Table Definitions](#2-table-definitions)
3. [Sample Data Insertion](#3-sample-data-insertion)
4. [Generating EER Diagram](#4-generating-eer-diagram-in-mysql-workbench)
5. [Database Relationships](#5-database-relationships)

---

## 1. Database Creation

```sql
-- Step 1: Create the database
CREATE DATABASE IF NOT EXISTS telecom_network_db;

-- Step 2: Select the database
USE telecom_network_db;
```

---

## 2. Table Definitions

### 2.1 Users Table
Stores all system users including Admins and Technicians.

```sql
CREATE TABLE IF NOT EXISTS Users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role ENUM('Admin', 'Technician', 'Viewer') DEFAULT 'Technician',
    status ENUM('Active', 'Inactive') DEFAULT 'Active',
    phone_number VARCHAR(15),
    email VARCHAR(100) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Key Points:**
- `user_id`: Primary key, auto-incremented
- `username`: Must be unique across all users
- `password_hash`: Stores bcrypt-hashed passwords
- `role`: Controls access permissions (Admin, Technician, Viewer)
- `status`: Supports soft delete (Active/Inactive)
- `created_at`: Tracks when user joined (for tenure display)

---

### 2.2 Network Components Table
Stores all network infrastructure items being monitored.

```sql
CREATE TABLE IF NOT EXISTS Network_Components (
    component_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type ENUM('Router', 'Switch', 'Cable', 'Server', 'Antenna', 'Firewall', 'Access Point') NOT NULL,
    model_number VARCHAR(100),
    ip_address VARCHAR(45),
    mac_address VARCHAR(17),
    location VARCHAR(100) NOT NULL,
    status ENUM('Active', 'Inactive', 'Maintenance', 'Faulty') DEFAULT 'Active',
    config_details TEXT,
    install_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

**Key Points:**
- `component_id`: Primary key, auto-incremented
- `type`: Limited to predefined infrastructure types
- `ip_address`: VARCHAR(45) supports both IPv4 and IPv6
- `status`: Tracks operational state
- `config_details`: Stores JSON configuration data
- `updated_at`: Auto-updates on record modification

---

### 2.3 Faults Table
Tracks all reported issues and their resolution status.

```sql
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
);
```

**Key Points:**
- `component_id`: Links to the affected component (RESTRICT - cannot delete component with faults)
- `reported_by`: User who reported (RESTRICT - cannot delete user if they reported faults)
- `assigned_to`: Technician assigned (SET NULL - user can be deleted, assignment becomes null)
- `scheduled_for`: When technician plans to work on it
- `response_time_minutes`: How long it took to resolve
- `resolved_at`: Timestamp of resolution

---

### 2.4 Maintenance Logs Table
Records all maintenance activities performed on components.

```sql
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
);
```

**Key Points:**
- `component_id`: Links to maintained component (RESTRICT)
- `technician_id`: Technician who performed work (RESTRICT - cannot delete users with maintenance logs)
- `duration_minutes`: Time spent on maintenance
- `type`: Scheduled or emergency maintenance

---

### 2.5 Incident Reports Table
Stores generated incident summary reports.

```sql
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
);
```

**Key Points:**
- `details`: JSON field for flexible report data
- `impact_level`: Categorizes incident severity
- `generated_by`: Admin who created report (SET NULL on user deletion)

---

### 2.6 Metrics Snapshots Table
Stores periodic dashboard metrics for historical tracking.

```sql
CREATE TABLE IF NOT EXISTS Metrics_Snapshots (
    snapshot_id INT AUTO_INCREMENT PRIMARY KEY,
    uptime_percentage DECIMAL(5, 2),
    total_faults_today INT DEFAULT 0,
    resolved_faults_today INT DEFAULT 0,
    avg_response_time DECIMAL(10, 2),
    active_components INT DEFAULT 0,
    components_in_maintenance INT DEFAULT 0,
    recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Key Points:**
- Standalone table (no foreign keys)
- Used for dashboard analytics
- `recorded_at`: Timestamp of snapshot

---

## 3. Sample Data Insertion

### 3.1 Insert Users

> **Note:** Passwords below are bcrypt hashes. In production, generate these using bcrypt with salt rounds of 10.

```sql
-- Password hashes (for reference, use bcrypt to generate these):
-- 'admin' -> $2a$10$... (use bcrypt.hash('admin', 10))
-- 'tech_001' -> $2a$10$...

INSERT INTO Users (username, password_hash, first_name, last_name, role, phone_number, email, status, created_at) 
VALUES 
('jouma', '$2a$10$qwerty123...', 'Joan', 'Ouma', 'Admin', '0712345678', 'joan.ouma@mnettywise.ac.ke', 'Active', '2024-01-15 08:00:00'),
('ywangui', '$2a$10$abcdef456...', 'Yvonne', 'Wangui', 'Technician', '0722123456', 'yvonne.wangui@mnettywise.ac.ke', 'Active', '2024-06-20 09:30:00'),
('mawuor', '$2a$10$ghijkl789...', 'Milany', 'Awuor', 'Technician', '0733987654', 'milany.awuor@mnettywise.ac.ke', 'Active', '2024-11-05 08:45:00'),
('rwanjare', '$2a$10$mnopqr012...', 'Robin', 'Wanjare', 'Technician', '0799887766', 'robin.wanjare@mnettywise.ac.ke', 'Active', '2025-10-18 09:00:00'),
('fkibet', '$2a$10$stuvwx345...', 'Felix', 'Kibet', 'Technician', '0711223344', 'felix.kibet@mnettywise.ac.ke', 'Active', '2026-01-04 08:00:00');
```

---

### 3.2 Insert Network Components

```sql
INSERT INTO Network_Components (name, type, model_number, ip_address, status, location, config_details, install_date) 
VALUES 
('Main Router - Admin Block', 'Router', 'Cisco ISR 4000', '192.168.1.1', 'Active', 'Admin Block Server Room', '{"vlan": 10, "gateway": "192.168.1.254"}', '2024-01-10'),
('Switch - Hall 7', 'Switch', 'Catalyst 9200', '192.168.2.10', 'Faulty', 'Hall 7 Cabinet', '{"ports": 48, "poe": true}', '2023-05-15'),
('Fiber Link - Gate C', 'Cable', 'Single Mode Fiber', NULL, 'Active', 'Gate C Underground', '{"length": "500m", "termination": "LC"}', '2022-11-20'),
('Server- Boardroom', 'Server', 'Dell PowerEdge', '10.0.0.5', 'Maintenance', 'Basement', '{"os": "Ubuntu 22.04", "ram": "64GB"}', '2023-08-30'),
('Firewall - Main Gate', 'Firewall', 'FortiGate 60F', '192.168.1.254', 'Active', 'Server Room', '{"fw_ver": "7.2.5"}', '2023-12-01'),
('Access Point - Reception', 'Access Point', 'Ubiquiti UniFi 6', '192.168.3.10', 'Active', 'Reception Ceiling', '{"ssid": "Guest_WiFi"}', '2024-02-15'),
('Switch - Floor 2', 'Switch', 'Cisco 2960', '192.168.2.20', 'Active', 'Floor 2 Cabinet', '{"ports": 24}', '2021-06-10'),
('Storage NAS', 'Server', 'Synology DS920+', '10.0.0.100', 'Active', 'Server Room', '{"raid": "5", "capacity": "16TB"}', '2023-09-01'),
('Router - Branch Office', 'Router', 'MikroTik RB4011', '192.168.10.1', 'Inactive', 'Branch Office', '{"vpn": "enabled"}', '2022-03-10'),
('Backup Link', 'Cable', 'Cat6 shielded', NULL, 'Active', 'Main Trunk', '{"length": "100m"}', '2022-01-01');
```

---

### 3.3 Insert Faults

```sql
INSERT INTO Faults (component_id, reported_by, assigned_to, title, description, priority, status, category, reported_at, response_time_minutes, resolved_at) 
VALUES 
(2, 2, 5, 'Switch in Hall 7 issue', 'Switch in Hall 7 is not powering up. No lights on front panel.', 'High', 'Open', 'hardware', NOW(), NULL, NULL),
(4, 4, 3, 'Boardroom Server overheating', 'Boardroom Server is overheating. Fans spinning at 100%.', 'Medium', 'In Progress', 'hardware', DATE_SUB(NOW(), INTERVAL 2 DAY), NULL, NULL),
(5, 2, 2, 'Firewall Blocking Traffic', 'Users unable to stream video content', 'Low', 'Resolved', 'software', DATE_SUB(NOW(), INTERVAL 5 DAY), 120, NOW()),
(7, 3, 4, 'Floor 2 Switch Port Error', 'Port 12 flashing orange continuously', 'Medium', 'Open', 'connectivity', DATE_SUB(NOW(), INTERVAL 1 DAY), NULL, NULL),
(6, 5, 2, 'Reception WiFi Slow', 'Signal dropping intermittently', 'Low', 'Pending', 'connectivity', DATE_SUB(NOW(), INTERVAL 7 DAY), NULL, NULL),
(8, 2, 3, 'NAS Storage Full', 'Storage warning at 95% capacity', 'High', 'Closed', 'software', NOW(), 45, NOW());
```

---

### 3.4 Insert Maintenance Logs

```sql
INSERT INTO Maintenance_Logs (component_id, technician_id, activity_date, action_taken, result, duration_minutes) 
VALUES 
(1, 3, DATE_SUB(NOW(), INTERVAL 1 MONTH), 'Updated firmware of the pc at the Admin Block to version 17.3', 'Success', 45),
(2, 4, DATE_SUB(NOW(), INTERVAL 2 MONTH), 'Replaced burnt fuse in power supply room', 'Success', 30),
(5, 2, DATE_SUB(NOW(), INTERVAL 21 DAY), 'Configured firewall rules for new department VLAN', 'Success', 60),
(8, 3, DATE_SUB(NOW(), INTERVAL 5 DAY), 'Cleared temp logs to free up space', 'Success', 30),
(6, 5, DATE_SUB(NOW(), INTERVAL 7 DAY), 'Reset AP settings to default and re-adopted', 'Success', 20);
```

---

## 4. Generating EER Diagram in MySQL Workbench

Follow these steps to generate an Enhanced Entity-Relationship (EER) Diagram:

### Step-by-Step Instructions:

1. **Open MySQL Workbench** and connect to your MySQL server

2. **Create Schema from SQL:**
   - Go to **File → Run SQL Script**
   - Select a file containing all the CREATE TABLE statements above
   - Or paste them directly in a new query tab and execute

3. **Reverse Engineer to EER Model:**
   - Go to **Database → Reverse Engineer**
   - Select your connection and click **Next**
   - Select the `telecom_network_db` schema
   - Click **Next** through the wizard
   - Check all tables to include
   - Click **Execute** → **Finish**

4. **View the Diagram:**
   - The EER diagram will open automatically
   - You can rearrange tables by dragging them
   - Relationships (foreign keys) will be shown as lines between tables

5. **Customize the Diagram:**
   - Right-click on tables to change colors
   - Use the **Arrange → Auto-Layout** option
   - Export as PDF or PNG via **File → Export**

---

## 5. Database Relationships

### Visual Relationship Summary

```
┌─────────────────────┐
│       Users         │
│   (user_id PK)      │
└─────────┬───────────┘
          │
          │ ┌──────────────────────────────────────────┐
          │ │                                          │
          ▼ │                                          ▼
┌──────────────────┐                         ┌─────────────────────┐
│     Faults       │                         │  Maintenance_Logs   │
│ (fault_id PK)    │                         │    (log_id PK)      │
│                  │                         │                     │
│ reported_by FK ──┼── RESTRICT ── Users     │ technician_id FK ───┼── RESTRICT ── Users
│ assigned_to FK ──┼── SET NULL ── Users     │                     │
│ component_id FK ─┼── RESTRICT              │ component_id FK ────┼── RESTRICT
└────────┬─────────┘                         └──────────┬──────────┘
         │                                              │
         │                                              │
         ▼                                              ▼
┌───────────────────────┐                   
│  Network_Components   │◄──────────────────────────────┘
│   (component_id PK)   │
└───────────────────────┘

┌─────────────────────┐         ┌─────────────────────┐
│  Incident_Reports   │         │  Metrics_Snapshots  │
│   (report_id PK)    │         │   (snapshot_id PK)  │
│                     │         │                     │
│ generated_by FK ────┼── SET NULL ── Users   │ (No FK - standalone)│
└─────────────────────┘         └─────────────────────┘
```

### Foreign Key Constraints Explained

| Table | Foreign Key | References | On Delete |
|-------|-------------|------------|-----------|
| Faults | component_id | Network_Components | RESTRICT |
| Faults | reported_by | Users | RESTRICT |
| Faults | assigned_to | Users | SET NULL |
| Maintenance_Logs | component_id | Network_Components | RESTRICT |
| Maintenance_Logs | technician_id | Users | RESTRICT |
| Incident_Reports | generated_by | Users | SET NULL |

### Constraint Behaviors:

- **RESTRICT**: Prevents deletion of parent record if child records exist
  - *Cannot delete a user who has reported faults*
  - *Cannot delete a user who has maintenance logs*
  - *Cannot delete a component with associated faults or logs*

- **SET NULL**: Sets the foreign key to NULL when parent is deleted
  - *If assigned technician is deleted, the fault's assigned_to becomes NULL*
  - *If report generator is deleted, generated_by becomes NULL*

---

## 📌 Quick Reference Commands

```sql
-- View all tables
SHOW TABLES;

-- View table structure
DESCRIBE Users;
DESCRIBE Network_Components;
DESCRIBE Faults;
DESCRIBE Maintenance_Logs;
DESCRIBE Incident_Reports;
DESCRIBE Metrics_Snapshots;

-- View foreign key relationships
SELECT 
    TABLE_NAME,
    COLUMN_NAME,
    CONSTRAINT_NAME,
    REFERENCED_TABLE_NAME,
    REFERENCED_COLUMN_NAME
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = 'telecom_network_db'
AND REFERENCED_TABLE_NAME IS NOT NULL;

-- Count records in each table
SELECT 'Users' as TableName, COUNT(*) as RecordCount FROM Users
UNION ALL
SELECT 'Network_Components', COUNT(*) FROM Network_Components
UNION ALL
SELECT 'Faults', COUNT(*) FROM Faults
UNION ALL
SELECT 'Maintenance_Logs', COUNT(*) FROM Maintenance_Logs
UNION ALL
SELECT 'Incident_Reports', COUNT(*) FROM Incident_Reports
UNION ALL
SELECT 'Metrics_Snapshots', COUNT(*) FROM Metrics_Snapshots;
```

---

## ✅ Execution Order

For clean execution in MySQL Workbench, run in this order:

1. **Database Creation** (Step 1)
2. **Users Table** (Step 2.1)
3. **Network_Components Table** (Step 2.2)
4. **Faults Table** (Step 2.3)
5. **Maintenance_Logs Table** (Step 2.4)
6. **Incident_Reports Table** (Step 2.5)
7. **Metrics_Snapshots Table** (Step 2.6)
8. **Sample Data** (Step 3.1 → 3.4 in order)
9. **Reverse Engineer EER Diagram** (Step 4)

> ⚠️ **Important:** The order matters because of foreign key dependencies. Users and Network_Components must exist before Faults and Maintenance_Logs can reference them.

---

*Generated for MnettyWise Network Management System*
*Last Updated: January 18, 2026*
