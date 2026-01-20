
import fetch from 'node-fetch';
import { pool } from './server/database.js';

const BASE_URL = 'http://localhost:3000/api';

async function verify() {
    try {
        console.log('--- Verifying Inventory Enhancements ---');

        // 1. Check Table
        const [tables] = await pool.query("SHOW TABLES LIKE 'Inventory_Usage_Logs'");
        if (tables.length > 0) {
            console.log('✅ Inventory_Usage_Logs table exists.');
        } else {
            console.error('❌ Inventory_Usage_Logs table missing.');
        }

        // 2. Login as Technician
        console.log('\n--- Testing Usage as Technician ---');
        const loginRes = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'fkibet', password: 'teky_004' }) // Felix Kibet
        });
        const loginData = await loginRes.json();
        const token = loginData.data?.token;

        if (!token) {
            console.error('❌ Login failed');
            return;
        }

        // Get an item to use
        const [items] = await pool.query("SELECT * FROM Inventory_Items WHERE quantity > 10 LIMIT 1");
        if (items.length === 0) {
            console.log('⚠️ No subtable items to test usage.');
            return;
        }
        const item = items[0];
        console.log(`Using item: ${item.name} (Current: ${item.quantity})`);

        // Use item via API
        const useRes = await fetch(`${BASE_URL}/inventory/${item.item_id}/use`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ quantity: 1, reason: 'Automated Test Usage' })
        });
        const useData = await useRes.json();

        if (useData.success) {
            console.log(`✅ Item usage success. New Balance: ${useData.new_quantity}`);
        } else {
            console.error('❌ Item usage failed:', useData);
        }

        // Verify Log
        const [logs] = await pool.query("SELECT * FROM Inventory_Usage_Logs WHERE item_id = ? ORDER BY log_id DESC LIMIT 1", [item.item_id]);
        if (logs.length > 0 && logs[0].reason === 'Automated Test Usage') {
            console.log('✅ Usage log verified in database.');
        } else {
            console.error('❌ Usage log not found.');
        }

    } catch (error) {
        console.error('Verification failed:', error);
    } finally {
        process.exit(0);
    }
}

verify();
