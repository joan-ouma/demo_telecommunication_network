
import { pool } from './server/database.js';

async function listUsers() {
    try {
        const [users] = await pool.query("SELECT user_id, username, role, email FROM Users");
        console.table(users);
        process.exit(0);
    } catch (error) {
        console.error('Error listing users:', error);
        process.exit(1);
    }
}

listUsers();
