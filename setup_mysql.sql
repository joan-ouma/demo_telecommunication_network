-- =======================================================
-- MnettyWise Network Management System
-- Database Setup Script
-- Updated: 2026-01-18
-- =======================================================

-- 1. Database Initialization
-- -------------------------------------------------------
DROP DATABASE IF EXISTS telecom_network_db;
CREATE DATABASE IF NOT EXISTS telecom_network_db;
USE telecom_network_db;

-- 2. User & Privileges (Dev Environment)
-- -------------------------------------------------------
CREATE USER IF NOT EXISTS 'telecom_user'@'localhost' IDENTIFIED BY 'assembly1234';
GRANT ALL PRIVILEGES ON telecom_network_db.* TO 'telecom_user'@'localhost';
FLUSH PRIVILEGES;

-- 3. Table Definitions
-- -------------------------------------------------------

-- Departments
DROP TABLE IF EXISTS `Departments`;
CREATE TABLE `Departments` (
  `department_id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `location` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`department_id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Users
DROP TABLE IF EXISTS `Users`;
CREATE TABLE `Users` (
  `user_id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `first_name` varchar(100) NOT NULL,
  `last_name` varchar(100) NOT NULL,
  `role` enum('Admin','Manager','Technician','Staff') DEFAULT 'Technician',
  `status` enum('Active','Inactive') DEFAULT 'Active',
  `status_reason` varchar(255) DEFAULT NULL,
  `department_id` int(11) DEFAULT NULL,
  `phone_number` varchar(15) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`),
  CONSTRAINT `users_fk_dept` FOREIGN KEY (`department_id`) REFERENCES `Departments` (`department_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Network Components
DROP TABLE IF EXISTS `Network_Components`;
CREATE TABLE `Network_Components` (
  `component_id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `type` enum('Router','Switch','Cable','Server','Antenna','Firewall','Access Point') NOT NULL,
  `department_id` int(11) DEFAULT NULL,
  `model_number` varchar(100) DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `mac_address` varchar(17) DEFAULT NULL,
  `location` varchar(100) NOT NULL,
  `latitude` decimal(10,8) DEFAULT NULL,
  `longitude` decimal(11,8) DEFAULT NULL,
  `status` enum('Active','Inactive','Maintenance','Faulty') DEFAULT 'Active',
  `config_details` text DEFAULT NULL,
  `install_date` date DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`component_id`),
  CONSTRAINT `comp_fk_dept` FOREIGN KEY (`department_id`) REFERENCES `Departments` (`department_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Inventory Items (New)
DROP TABLE IF EXISTS `Inventory_Items`;
CREATE TABLE `Inventory_Items` (
  `item_id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `category` varchar(50) NOT NULL,
  `quantity` int(11) DEFAULT 0,
  `min_level` int(11) DEFAULT 5,
  `unit_cost` decimal(10,2) DEFAULT 0.00,
  `location` varchar(100) DEFAULT NULL,
  `last_updated` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`item_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Audit Logs (New)
DROP TABLE IF EXISTS `Audit_Logs`;
CREATE TABLE `Audit_Logs` (
  `log_id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) DEFAULT NULL,
  `action` varchar(50) NOT NULL,
  `entity_type` varchar(50) DEFAULT NULL,
  `entity_id` int(11) DEFAULT NULL,
  `details` text DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`log_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `audit_logs_fk_user` FOREIGN KEY (`user_id`) REFERENCES `Users` (`user_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Faults
DROP TABLE IF EXISTS `Faults`;
CREATE TABLE `Faults` (
  `fault_id` int(11) NOT NULL AUTO_INCREMENT,
  `component_id` int(11) NOT NULL,
  `reported_by` int(11) NOT NULL,
  `assigned_to` int(11) DEFAULT NULL,
  `priority` enum('Critical','High','Medium','Low') DEFAULT 'Medium',
  `status` enum('Open','In Progress','Resolved','Closed','Pending') DEFAULT 'Open',
  `description` text NOT NULL,
  `title` varchar(255) NOT NULL,
  `category` varchar(50) DEFAULT 'general',
  `reported_at` datetime DEFAULT current_timestamp(),
  `started_at` datetime DEFAULT NULL,
  `scheduled_for` datetime DEFAULT NULL,
  `resolved_at` datetime DEFAULT NULL,
  `response_time_minutes` int(11) DEFAULT NULL,
  `resolution_notes` text DEFAULT NULL,
  PRIMARY KEY (`fault_id`),
  KEY `component_id` (`component_id`),
  KEY `reported_by` (`reported_by`),
  KEY `assigned_to` (`assigned_to`),
  CONSTRAINT `faults_fk_component` FOREIGN KEY (`component_id`) REFERENCES `Network_Components` (`component_id`),
  CONSTRAINT `faults_fk_reporter` FOREIGN KEY (`reported_by`) REFERENCES `Users` (`user_id`),
  CONSTRAINT `faults_fk_asignee` FOREIGN KEY (`assigned_to`) REFERENCES `Users` (`user_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Maintenance Logs
DROP TABLE IF EXISTS `Maintenance_Logs`;
CREATE TABLE `Maintenance_Logs` (
  `log_id` int(11) NOT NULL AUTO_INCREMENT,
  `component_id` int(11) NOT NULL,
  `technician_id` int(11) NOT NULL,
  `activity_date` datetime DEFAULT current_timestamp(),
  `action_taken` text NOT NULL,
  `result` varchar(50) DEFAULT NULL,
  `duration_minutes` int(11) DEFAULT NULL,
  `type` varchar(50) DEFAULT 'scheduled',
  PRIMARY KEY (`log_id`),
  KEY `component_id` (`component_id`),
  KEY `technician_id` (`technician_id`),
  CONSTRAINT `maint_fk_component` FOREIGN KEY (`component_id`) REFERENCES `Network_Components` (`component_id`),
  CONSTRAINT `maint_fk_tech` FOREIGN KEY (`technician_id`) REFERENCES `Users` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Incident Reports
DROP TABLE IF EXISTS `Incident_Reports`;
CREATE TABLE `Incident_Reports` (
  `report_id` int(11) NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL,
  `summary` text DEFAULT NULL,
  `start_time` datetime NOT NULL,
  `end_time` datetime DEFAULT NULL,
  `affected_components_count` int(11) DEFAULT 0,
  `total_faults` int(11) DEFAULT 0,
  `avg_resolution_time` decimal(10,2) DEFAULT NULL,
  `impact_level` enum('minor','major','critical') DEFAULT 'minor',
  `details` longtext DEFAULT NULL,
  `generated_by` int(11) DEFAULT NULL,
  `generated_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`report_id`),
  KEY `generated_by` (`generated_by`),
  CONSTRAINT `ir_fk_user` FOREIGN KEY (`generated_by`) REFERENCES `Users` (`user_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Metrics Snapshots
DROP TABLE IF EXISTS `Metrics_Snapshots`;
CREATE TABLE `Metrics_Snapshots` (
  `snapshot_id` int(11) NOT NULL AUTO_INCREMENT,
  `uptime_percentage` decimal(5,2) DEFAULT NULL,
  `total_faults_today` int(11) DEFAULT 0,
  `resolved_faults_today` int(11) DEFAULT 0,
  `avg_response_time` decimal(10,2) DEFAULT NULL,
  `active_components` int(11) DEFAULT 0,
  `components_in_maintenance` int(11) DEFAULT 0,
  `recorded_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`snapshot_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Fault Comments
DROP TABLE IF EXISTS `Fault_Comments`;
CREATE TABLE `Fault_Comments` (
  `comment_id` int(11) NOT NULL AUTO_INCREMENT,
  `fault_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `comment` text NOT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`comment_id`),
  KEY `fault_id` (`fault_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `fc_fk_fault` FOREIGN KEY (`fault_id`) REFERENCES `Faults` (`fault_id`) ON DELETE CASCADE,
  CONSTRAINT `fc_fk_user` FOREIGN KEY (`user_id`) REFERENCES `Users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Maintenance Comments
DROP TABLE IF EXISTS `Maintenance_Comments`;
CREATE TABLE `Maintenance_Comments` (
  `comment_id` int(11) NOT NULL AUTO_INCREMENT,
  `log_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `comment` text NOT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`comment_id`),
  KEY `log_id` (`log_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `mc_fk_log` FOREIGN KEY (`log_id`) REFERENCES `Maintenance_Logs` (`log_id`) ON DELETE CASCADE,
  CONSTRAINT `mc_fk_user` FOREIGN KEY (`user_id`) REFERENCES `Users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Notifications
DROP TABLE IF EXISTS `Notifications`;
CREATE TABLE `Notifications` (
  `notification_id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `type` enum('fault_assigned', 'status_change', 'low_stock', 'system') NOT NULL,
  `message` text NOT NULL,
  `link` varchar(255) DEFAULT NULL,
  `is_read` boolean DEFAULT FALSE,
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`notification_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `notif_fk_user` FOREIGN KEY (`user_id`) REFERENCES `Users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Initial Data Seeding
-- -------------------------------------------------------

-- Departments
INSERT INTO `Departments` (`name`, `location`) VALUES
('Network Operations', 'HQ Floor 2'),
('Data Center A', 'Building 1'),
('Data Center B', 'Building 2'),
('Field Operations', 'HQ Floor 1'),
('Customer Support', 'HQ Floor 3'),
('Warehouse', 'Logistics Center'),
('HR', 'HQ Floor 4'),
('Finance', 'HQ Floor 4'),
('IT Support', 'HQ Floor 2');
