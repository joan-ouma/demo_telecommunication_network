const API_URL = 'http://localhost:3000/api';
let adminToken = '';
let itemId = 1; // Assuming INV-001 exists
let techId = 2; // Assuming user 2 is a technician (Yvonne)

async function login() {
    try {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: 'jouma',
                password: 'admin' // Using known password
            })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);

        if (data.data && data.data.token) adminToken = data.data.token;
        else adminToken = data.token;

        console.log('Login successful');
    } catch (error) {
        console.error('Login failed:', error.message);
        process.exit(1);
    }
}

async function verifyIssuance() {
    console.log('\n--- Verifying Inventory Issuance ---');
    try {
        // 1. Get initial stock
        const invRes = await fetch(`${API_URL}/inventory`, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        const invData = await invRes.json();
        const item = invData.data.find(i => i.item_id === itemId);

        if (!item) throw new Error('Item INV-001 not found');
        const initialStock = item.quantity;
        console.log(`Initial Stock for ${item.name}: ${initialStock}`);

        if (initialStock < 1) throw new Error('Not enough stock to test issuance');

        // 2. Issue Item
        const issueRes = await fetch(`${API_URL}/inventory/issue`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${adminToken}`
            },
            body: JSON.stringify({
                item_id: itemId,
                technician_id: techId,
                quantity: 1,
                notes: 'Verification Test'
            })
        });

        const issueData = await issueRes.json();
        if (!issueRes.ok) throw new Error('Issuance failed: ' + issueData.message);

        console.log('Issuance successful:', issueData.message);

        // 3. Verify Stock Deduction
        const invResAfter = await fetch(`${API_URL}/inventory`, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        const invDataAfter = await invResAfter.json();
        const itemAfter = invDataAfter.data.find(i => i.item_id === itemId);

        console.log(`New Stock: ${itemAfter.quantity}`);

        if (itemAfter.quantity === initialStock - 1) {
            console.log('PASS: Stock deducted correctly');
        } else {
            console.error('FAIL: Stock deduction incorrect');
        }

    } catch (error) {
        console.error('Verification failed:', error.message);
    }
}

async function run() {
    await login();
    await verifyIssuance();
}

run();
