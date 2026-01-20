import pool from './server/database.js';

async function createTable() {
    try {
        console.log('Creating Inventory_Issuance_Logs table...');
        await pool.query(`
      CREATE TABLE IF NOT EXISTS Inventory_Issuance_Logs (
        issuance_id int(11) NOT NULL AUTO_INCREMENT,
        item_id int(11) NOT NULL,
        technician_id int(11) NOT NULL,
        issued_by int(11) NOT NULL,
        quantity int(11) NOT NULL,
        notes text DEFAULT NULL,
        issued_at datetime DEFAULT current_timestamp(),
        PRIMARY KEY (issuance_id),
        KEY item_id (item_id),
        KEY technician_id (technician_id),
        KEY issued_by (issued_by),
        CONSTRAINT issuance_fk_item FOREIGN KEY (item_id) REFERENCES Inventory_Items (item_id),
        CONSTRAINT issuance_fk_tech FOREIGN KEY (technician_id) REFERENCES Users (user_id),
        CONSTRAINT issuance_fk_issuer FOREIGN KEY (issued_by) REFERENCES Users (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
        console.log('Table created successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Error creating table:', err);
        process.exit(1);
    }
}

createTable();
