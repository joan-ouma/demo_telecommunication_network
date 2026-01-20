# Telecommunications Network Management System (MnettyWise)
**Project Submission**
*   **Student Name:** Joan Ouma
*   **Project Title:** MnettyWise - Internal Network Management System
*   **Submission Date:** January 18, 2026

## 🔗 Project Resources
*   **GitHub Repository:** [github.com/joan-ouma/mnettywise](https://github.com/joan-ouma/mnettywise) (Placeholder)
*   **Live Application:** [mnettywise.internal](http://localhost:5173)
*   **Database Schema:** Included in `MnettyWise_SQL_Schema_Guide.md`

---

## 1. Executive Summary
The Telecommunications Network Management System (MnettyWise) is a specialized, internal web-based solution designed to empower the **ICT Department** of the MnettyWise organization. Unlike public service provider tools, this system focuses on the internal enterprise network essential for the company's daily operations.

**Context:**
MnettyWise manufactures high-quality network components, and maintaining operational efficiency across its departments is critical. This system serves the internal IT team, enabling them to ensure that all employees—from the factory floor to the administrative offices—have reliable, functioning network equipment.



**Primary Objectives:**
*   **Internal Asset Management:** Centralized tracking of the organization's routers, switches, and devices used by staff.
*   **Departmental Fault Resolution:** A streamlined ticketing system for the ICT team to address equipment failures reported by internal personnel.
*   **Operational Continuity:** ensuring minimal downtime for critical business units through proactive monitoring.
*   **Resource Optimization:** Efficient allocation of spare parts (inventory) and technician man-hours.
*   **Mobile Field Access:** Enabling on-site technicians to manage repairs directly from the server room or factory floor.

**Deliverables:**
This report documents the successful development of the following deliverables:
1.  **Frontend Application:** A React-based Single Page Application (SPA) offering an intuitive dashboard and management tools.
2.  **Backend API:** A Node.js/Express server providing secure RESTful endpoints.
3.  **Database:** A relational MySQL database ensuring data integrity and efficient retrieval.
4.  **Documentation:** Comprehensive user guides and system architecture documentation.

---

## 2. System Architecture

### 2.1 Technology Stack
The application is built using a modern, scalable technology stack:
*   **Frontend:** React (Vite), Lucide React (Icons), React Leaflet (Mapping), Chart.js (Visualizations).
*   **Backend:** Node.js, Express.js.
*   **Database:** MySQL.
*   **Authentication:** JWT (JSON Web Tokens) & Bcrypt (Password Hashing).
*   **Styling:** Custom CSS with a responsive Design System (variables for colors, spacing, typography).

### 2.2 Database Design
The system utilizes a normalize relational database schema with **11 tables** designed to ensure data integrity and scalability.

### 2.2 Database Design & SQL Implementation
The system utilizes a normalized relational database schema with **11 tables**. Below are the SQL statements used to create the core tables, demonstrating our robust data integrity rules.

#### **Core Table Definitions**

**1. Users Table**
```sql
CREATE TABLE IF NOT EXISTS Users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role ENUM('Admin', 'Technician') DEFAULT 'Technician',
    status ENUM('Active', 'Inactive') DEFAULT 'Active',
    email VARCHAR(100) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**2. Network Components Table**
```sql
CREATE TABLE IF NOT EXISTS Network_Components (
    component_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type ENUM('Router', 'Switch', 'Cable', 'Server', 'Antenna', 'Firewall', 'Access Point') NOT NULL,
    ip_address VARCHAR(45),
    location VARCHAR(100) NOT NULL,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    status ENUM('Active', 'Inactive', 'Maintenance', 'Faulty') DEFAULT 'Active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**3. Faults Table (with Relationships)**
```sql
CREATE TABLE IF NOT EXISTS Faults (
    fault_id INT AUTO_INCREMENT PRIMARY KEY,
    component_id INT NOT NULL,
    reported_by INT NOT NULL,
    assigned_to INT,
    priority ENUM('Critical', 'High', 'Medium', 'Low') DEFAULT 'Medium',
    status ENUM('Open', 'Resolved', 'Closed') DEFAULT 'Open',
    description TEXT NOT NULL,
    resolved_at DATETIME,
    FOREIGN KEY (component_id) REFERENCES Network_Components(component_id) ON DELETE RESTRICT,
    FOREIGN KEY (reported_by) REFERENCES Users(user_id) ON DELETE RESTRICT,
    FOREIGN KEY (assigned_to) REFERENCES Users(user_id) ON DELETE SET NULL
);
```

#### **Design Rationale: Integrity Constraints**
We carefully selected specific `ON DELETE` rules to prevent data loss in a corporate environment:

*   **`ON DELETE RESTRICT` (Used for Faults -> Components)**
    *   *Why?* You cannot delete a Router if it has fault history attached to it. This prevents accidental deletion of critical asset history. To remove a component, you must first archive its faults.

*   **`ON DELETE SET NULL` (Used for Faults -> Assigned Technician)**
    *   *Why?* If a Technician leaves the company and their account is deleted, the Faults they worked on should NOT disappear. Instead, the `assigned_to` field becomes `NULL`, preserving the fault record while acknowledging the user is gone.

*   **`ON DELETE CASCADE` (Used for Comments)**
    *   *Why?* If a Fault is deleted (e.g., it was a mistake), all discussion comments attached to it are irrelevant. `CASCADE` automatically cleans up these orphaned comments to keep the database tidy.

### 2.3 Entity-Relationship Diagram (EER)
*(Insert your generated EER Diagram from MySQL Workbench here)*

> [!NOTE]
> The database schema enforces these relationships using `FOREIGN KEY` constraints with `ON DELETE SET NULL` or `CASCADE` rules to maintain referential integrity.

---

## 3. User Guide

### 3.1 Getting Started
**Login:** Access the system securely. The application enforces role-based access control, meaning the dashboard you see is tailored to your specific responsibilities.

#### **Sample Login Credentials (For Testing)**
To facilitate the evaluation of role-based features, the following sample accounts have been pre-seeded:

| Role | Username | Password | Access Level |
| :--- | :--- | :--- | :--- |
| **Admin** | `jouma` | `admin` | Full System Access (Settings, Users, All Logs) |
| **Technician** | `ywangui` | `tech_001` | Field View (Assigned Faults, Mobile Map) |

*   **Admins:** Have full access to all settings, user management, and sensitive logs.
*   **Technicians:** See a focused view for reporting faults and managing their assigned tasks.

### 3.2 Team Management & Security (Admin Only)
> **Goal:** Ensure the system is protected from outsiders by centrally managing all user accounts.

To maintain high security, **users cannot sign themselves up**. Only an Administrator can create new accounts. This centralization ensures that only authorized ICT staff have access to the system.

**Workflow: Creating a New User**
1.  Navigate to the **Team Management** page from the sidebar.
2.  Click the **"Add Member"** button.
3.  Fill in the staff details (Name, Email, Role).
    *   *Tip:* Assign the "Technician" role for field staff who need mobile access.
    *   *Tip:* Assign the "Admin" role only to senior ICT managers.
4.  The system generates a secure initial password (which should be shared securely with the new member).
5.  **Security Note:** If a staff member leaves the organization, the Admin can immediately **Deactivate** or **Delete** their account here, instantly revoking their access to sensitive network data.

### 3.3 Key Workflows

**1. Infrastructure Management**
*   **Purpose:** Maintain a "Single Source of Truth" for all network assets.
*   **Adding a Device:**
    1.  Go to **Infrastructure**.
    2.  Click **"Add Component"**.
    3.  Enter details like Model Number, IP Address, and critical Config Details (e.g., VLAN ID).
    4.  **Crucial Step:** Enter the exact **Latitude/Longitude**. This ensures the device appears accurately on the Device Map.
*   **Editing:** If a device is moved or re-IP'd, click "Edit" to update its record without losing its history.

**2. Fault Reporting & Resolution Lifecycle**
*   **Step 1: Logging (Anyone):**
    *   Navigate to **Fault Reporting**.
    *   Click "Report New Fault".
    *   Select the faulty component from the dropdown lists.
    *   Assign a **Priority** (Critical/High/Medium/Low) based on impact.
*   **Step 2: Assignment (Admin/Manager):**
    *   The Admin sees the new "Open" fault on the Dashboard.
    *   They can re-assign it to a specific Technician who specializes in that equipment type (e.g., Fiber vs. RF).
*   **Step 3: Resolution (Technician):**
    *   The technician receives the task.
    *   Once fixed, they click **"Resolve"** and enter resolution notes (e.g., "Replaced power supply").
    *   The fault moves to "Resolved" history, contributing to the "Daily Resolution" KPI.

**1. Dashboard**
*   **Purpose:** High-level overview of network health.
*   **Features:** Real-time stats (Uptime, Active Components, Open Faults), charts demonstrating status distribution, and fault priority breakdowns.
> *(Insert Screenshot: Dashboard Overview showing cards and charts here)*

**2. Infrastructure Management**
*   **View & Edit:** A tabular view of all network devices. Admins can Add, Edit, or Delete components.
*   **Export:** Capability to Print or Export the inventory list to CSV for external reporting.
> *(Insert Screenshot: Infrastructure Table or Add Component Form here)*

**3. Device Map**
*   **Geography:** A visual representation of the network topology on a map (focusing on Nairobi CBD).
*   **Status Indicators:** Markers are color-coded (Green=Active, Red=Faulty, Purple=Maintenance) for instant situational awareness.
*   **Interactivity:** Clicking a marker reveals device details and active status.
> *(Insert Screenshot: Device Map with visible markers here)*

**4. Fault Reporting**
*   **Logging:** Staff and Technicians can report new faults, specifying priority and category (Hardware, Software, Connectivity).
*   **Resolution:** Technicians can view detailed fault info and update status (Open -> In Progress -> Resolved).
> *(Insert Screenshot: Fault Reporting Form or Kanban Board here)*

**5. Quality Metrics**
*   **KPIs:** Dedicated page helping management analyze long-term trends like Mean Time To Repair (MTTR) and Daily Fault Frequency.
> *(Insert Screenshot: Quality Metrics Graphs here)*

**6. Mobile Access**
*   The application is fully responsive. Field technicians can access the **Fault Reporting** and **Device Map** modules on their smartphones to locate devices and update tickets on-site.
> *(Insert Screenshot: Mobile View of the App here)*

---

## 4. Testing & Validation

### 4.1 Testing Approach
We employed a mix of Manual and Integration testing to ensure system reliability.

*   **Unit Testing (Logic):** Verified algorithms for KPI calculations (e.g., verifying that "Average Response Time" correctly aggregates data).
*   **Integration Testing (API):** Verified that the Frontend correctly consumes Backend APIs (e.g., clicking "Resolve" on a fault correctly updates the database and refreshes the UI).
*   **System Testing (End-to-End):** Validated full workflows, such as "A user reports a fault -> A technician sees it on the dashboard -> The technician resolves it -> The metrics update".

### 4.2 Validation Results
*   **Data Integrity:** Confirmed that deleting a User does not crash the system (Faults remain, but `assigned_to` becomes NULL).
*   **Input Validation:** Confirmed that the Map prevents a crash if a component has invalid GPS coordinates.
*   **Security:** Verified that non-Admin users cannot access the "Audit Trail" or "Team Management" pages.

### 4.3 User Acceptance Testing (UAT) Checklist
To ensure the system meets all business requirements, we performed the following acceptance tests:

| Test Case ID | Feature | Description | Expected Result | Pass/Fail |
| :--- | :--- | :--- | :--- | :--- |
| **UAT-001** | **Login** | Attempt to login with invalid credentials | System displays "Invalid credentials" error | ✅ **PASS** |
| **UAT-002** | **Login** | Login as Technician with valid ID | Redirects to Technician Dashboard (Restricted View) | ✅ **PASS** |
| **UAT-003** | **Faults** | Create a new fault ticket | Fault appears in "Open Faults" list immediately | ✅ **PASS** |
| **UAT-004** | **Map** | Click on a map marker | Popup shows correct Device Name and IP | ✅ **PASS** |
| **UAT-005** | **Security** | Try to access `/admin/users` as Technician | Redirects to "Access Denied" or Dashboard | ✅ **PASS** |
| **UAT-006** | **Metrics** | Resolve a fault and check MTTR | MTTR metric updates instantly | ✅ **PASS** |

---

## 5. Quality Metrics & Calculations
> **Design Requirement:** Develop algorithms to compute key performance indicators (KPIs).

We implemented precise mathematical logic to track network health. Here is how our system calculates the core metrics:

#### **A. Network Uptime (%)**
*   **Logic:** The percentage of critical infrastructure that is currently "Active".
*   **Formula:** `(Active Components / Total Components) * 100`
*   **Example:** `(7 Active / 10 Total) * 100 = 70% Uptime`

#### **B. Mean Time To Repair (MTTR)**
*   **Logic:** The average time taken to resolve an emergency fault over the last 30 days.
*   **Formula:** `AVG(resolved_at - reported_at) for all resolved faults`
*   **SQL Implementation:**
    ```sql
    SELECT AVG(response_time_minutes) FROM Faults WHERE resolved_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    ```

#### **C. Daily Fault Frequency**
*   **Logic:** The average number of new faults reported per day.
*   **Formula:** `Total Faults (Last 30 Days) / 30`
*   **Relevance:** Helps the ICT Manager staff technicians appropriately for peak failure times.

#### **D. Health Score Algorithm**
We developed a composite "Health Score" for each component (0-100%).
*   **Start:** 100 Points
*   **Penalty:**
    *   -15 points for every Active Fault
    *   -30 points if Status is 'Faulty'
    *   -10 points if Status is 'Maintenance'
    *   -2 points for every historical fault (Reliability history)
*   **Result:** Provides a single, digestible number for non-technical managers to assess risk.

---

## 6. Challenges & Future Enhancements

### 6.1 Challenges Faced
*   **Map Data Visualization:** Displaying multiple devices in close proximity (e.g., a server room) caused marker overlap.
    *   *Solution:* We implemented a "scattering" logic in the seed data to slightly offset coordinates for better visibility at high zoom levels.
*   **Data Consistency:** Ensuring the "Dashboard" numbers matched the actual list of faults.
    *   *Solution:* Refined the SQL queries to strictly define "Open" faults (excluding "Resolved" and "Closed").
*   **Database Deployment & Configuration:**
    *   *Problem:* Setting up a local MySQL instance on every technician's laptop was time-consuming and error-prone (version mismatches, connection errors).
    *   *Solution:* We created a `setup_mysql.sql` script to standardize initialization, but the overhead of managing a local database server remains a friction point for rapid deployment.

### 6.2 Innovation & Unique Features
> **Assessment Criteria:** "Innovation (10%) - Creativity in Problem-Solving"

1.  **Self-Healing Database Module:**
    *   *Problem:* Setting up databases on new machines is error-prone.
    *   *Innovation:* We wrote a "Self-Healing" script in the server. On startup, it checks if tables like `Inventory` exists. If not, it **automatically creates the schema and seeds it** with default tools (Crimpers, Cables). This makes deployment "Zero-Config".

2.  **Geographic "Scatter" Algorithm:**
    *   *Problem:* Multiple devices in a single server room (Same GPS) overlap on the map, making them impossible to click.
    *   *Innovation:* We implemented a randomization jitter (~0.0002 degrees) for devices at the exact same location. This creates a "cluster" visual, allowing technicians to distinguish between the Router, Switch, and UPS in the same rack.

3.  **Composite Health Scoring:**
    *   *Problem:* "Active" or "Faulty" is too binary. A working router with 5 past failures is risky.
4.  **Local Deployment via Ngrok (Secure Tunneling):**
    *   *Problem:* Demonstrating "Mobile Field Access" features (like GPS tracking) requires the app to be accessible on real smartphones, but our server runs on `localhost` behind a firewall.
    *   *Innovation:* We utilized **Ngrok** to create a secure, temporary public URL (HTTPS) tunneling directly to our local machine. This allowed us to perform live, real-world field testing of the "Technician Dashboard" on actual mobile devices without deploying to a costly cloud server.

### 6.3 Future Enhancements
1.  **Real-Time Sockets:** Implement `Socket.io` to push fault updates to the dashboard instantly without refreshing.
2.  **Predictive AI:** Use historical failure data to predict component maintenance needs before they fail.
4.  **Environmental Monitoring (IoT Integration):**
    *   Integrate with Arduino/Raspberry Pi sensors to monitor server room **temperature and humidity**. Overheating is a major cause of hardware failure, and real-time alerts would prevent catastrophe.

5.  **Automated Scheduled Reporting:**
    *   Configure a Cron job to automatically generate the "Weekly Incident Report" PDF and email it to the ICT Manager every Monday morning, removing the need for manual generation.

6.  **Migration to Supabase (Cloud Database):**
    *   *Real-Time Updates:* Leveraging Supabase's real-time subscriptions to push fault updates instantly to the dashboard (replacing manual refreshes).
    *   *Enhanced Security:* Utilizing Supabase Auth for built-in **Email Verification** and Magic Links to further secure technician access.

### 7. Conclusion
The MnettyWise Network Management System successfully streamlines the complex operations of the ICT Department. By moving from manual tracking to a centralized, digital "Single Source of Truth," we have improved response times, increased accountability, and provided management with the data needed to make informed resource decisions. The system is scalable, secure, and ready for immediate deployment.

---

## Appendix A: Glossary of Technical Terms

| Term | Definition | Context in MnettyWise |
| :--- | :--- | :--- |
| **MTTR** | **Mean Time To Repair** | The average time it takes a technician to fix a broken component. Lower is better. |
| **KPI** | **Key Performance Indicator** | Critical metrics (like Uptime) used to measure the success of the ICT department. |
| **CRUD** | **Create, Read, Update, Delete** | The four basic operations of persistent storage. Our detailed "Infrastructure" table allows all four. |
| **VLAN** | **Virtual Local Area Network** | A sub-network method used to group devices. Stored in `config_details` JSON. |
| **IoT** | **Internet of Things** | Network of physical objects (sensors) that can exchange data (Proposed for future environmental monitoring). |
| **RBAC** | **Role-Based Access Control** | A security approach that restricts system access to authorized users (Admin vs. Technician). |
| **EER** | **Enhanced Entity-Relationship** | A diagram modeling the database structure and relationships. |
