
import { pool } from './server/database.js';

async function createTable() {
    try {
        console.log('--- Creating Inventory_Usage_Logs Table ---');

        await pool.query(`
            CREATE TABLE IF NOT EXISTS Inventory_Usage_Logs (
                log_id INT AUTO_INCREMENT PRIMARY KEY,
                item_id INT NOT NULL,
                user_id INT NOT NULL,
                quantity_used INT NOT NULL,
                reason VARCHAR(255),
                used_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (item_id) REFERENCES Inventory_Items(item_id),
                FOREIGN KEY (user_id) REFERENCES Users(user_id)
            )
        `);

        console.log('✅ Inventory_Usage_Logs table created successfully.');
        process.exit(0);

    } catch (error) {
        console.error('❌ Failed to create table:', error);
        process.exit(1);
    }
}

createTable();
