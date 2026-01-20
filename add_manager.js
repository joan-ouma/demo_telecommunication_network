
import { pool } from './server/database.js';
import bcrypt from 'bcryptjs';

async function addManager() {
    try {
        console.log('--- Adding Manager User ---');

        const [existing] = await pool.query("SELECT * FROM Users WHERE role = 'Manager'");
        if (existing.length > 0) {
            console.log('Manager already exists. Skipping.');
            process.exit(0);
        }

        const passwordHash = await bcrypt.hash('admin', 10); // Default password same as admin

        await pool.query(
            "INSERT INTO Users (username, password_hash, first_name, last_name, role, phone_number, email, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            ['manager', passwordHash, 'Alex', 'Mwangi', 'Manager', '0722001122', 'alex.mwangi@mnettywise.ac.ke', 'Active', '2024-02-01 08:00:00']
        );

        console.log('✅ Manager user added successfully.');
        process.exit(0);

    } catch (error) {
        console.error('❌ Failed to add manager:', error);
        process.exit(1);
    }
}

addManager();
