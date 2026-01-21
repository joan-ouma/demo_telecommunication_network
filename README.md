# MnettyWise - Telecommunications Network Management System

![Project Status](https://img.shields.io/badge/Status-Active-brightgreen)
![Version](https://img.shields.io/badge/Version-1.0.0-blue)
![License](https://img.shields.io/badge/License-MIT-yellow)

**MnettyWise** is a comprehensive, internal Network Management System designed for the ICT Department. It serves as the "Single Source of Truth" for managing network infrastructure, tracking faults, and monitoring service quality metrics within the organization.

## 🚀 Features

*   **Infrastructure Management:** CRUD operations for Routers, Switches, Servers, and more.
*   **Interactive Device Map:** Visualization of network topology on a satellite map (Nairobi CBD) with status color-coding.
*   **Fault Reporting:** A complete ticket lifecycle (Open -> Assigned -> Resolved) to track hardware issues.
*   **Quality Metrics:** Automated calculation of KPIs like Uptime, MTTR (Mean Time To Repair), and Daily Fault Frequency.
*   **Field Technician Access:** Mobile-friendly interface for on-site updates.
*   **Role-Based Access:** Secure Login for Admins (Full Control) vs. Technicians (Field View).

## 🛠️ Technology Stack

*   **Frontend:** React (Vite), React Router
*   **Styling:** Custom CSS Design System, Lucide React Icons
*   **Maps:** React Leaflet, OpenStreetMap
*   **Backend:** Node.js, Express.js
*   **Database:** MySQL (Relational)
*   **Security:** JSON Web Tokens (JWT), Bcrypt Password Hashing

## 📋 Prerequisites

Before running this project, ensure you have the following installed:
*   [Node.js](https://nodejs.org/) (v16 or higher)
*   [MySQL Server](https://dev.mysql.com/downloads/mysql/) (v8.0 recommended)
*   [Git](https://git-scm.com/)

## ⚙️ Installation & Setup

### 1. Clone the Repository
```bash
git clone https://github.com/joan-ouma/mnettywise.git
cd mnettywise
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Database Setup
1.  Open **MySQL Workbench** or your terminal.
2.  Login to your local MySQL instance.
3.  Execute the setup script located in the root folder:
    *   Open `setup_mysql.sql`.
    *   Run the entire script to create the database `telecom_network_db` and seed the initial data.

### 4. Configure Environment Variables
Create a `.env` file in the root directory (based on `.env.example` if available) with your database credentials:
```env
DB_HOST=localhost
DB_USER=your_mysql_username
DB_PASSWORD=your_mysql_password
DB_NAME=telecom_network_db
JWT_SECRET=your_secure_secret_key
PORT=3000
```

### 5. Run the Application
Start both the Backend Server and Frontend Client with a single command:
```bash
npm run dev
```
*   **Frontend Check:** Open [http://localhost:5173](http://localhost:5173) in your browser.
*   **Backend Check:** Takes requests on [http://localhost:3000](http://localhost:3000).



## 📂 Project Structure
```
mnettywise/
├── public/              # Static assets
├── server/              # Node.js backend API and Routes
├── src/                 # React Frontend components
│   ├── components/      # Reusable UI components (Sidebar, Tables)
│   ├── pages/           # Main Page Views (Dashboard, Infrastructure)
│   └── styles/          # Global CSS variables & styles
├── MnettyWise_SQL_Schema_Guide.md # Detailed DB Documentation
└── package.json         # Dependencies and Scripts
```

## 📝 License
This project is for educational submission purposes.
