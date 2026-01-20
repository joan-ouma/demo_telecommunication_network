import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env
dotenv.config({ path: join(__dirname, '..', '.env') });

async function resetDatabase() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        // Do not specify database so we can drop it
    });

    try {
        const dbName = process.env.DB_NAME || 'telecom_network_db';
        console.log(`🗑️  Dropping database: ${dbName}...`);
        await connection.query(`DROP DATABASE IF EXISTS ${dbName}`);
        console.log('✅ Database dropped successfully.');
        console.log('🔄 Please restart your server (npm run dev) to re-initialize and seed the database.');
    } catch (error) {
        console.error('❌ Failed to drop database:', error);
    } finally {
        await connection.end();
    }
}

resetDatabase();
