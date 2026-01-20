const API_URL = 'http://localhost:3000/api';
let adminToken = '';

async function login() {
    try {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: 'jouma',
                password: 'admin'
            })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);

        console.log('Login response keys:', Object.keys(data));
        if (data.data && data.data.token) {
            adminToken = data.data.token;
        } else {
            adminToken = data.token;
        }

        console.log('Token received:', adminToken ? adminToken.substring(0, 10) + '...' : 'undefined');

        if (!adminToken) throw new Error('No token found in response');

        console.log('Login successful');
    } catch (error) {
        console.error('Login failed:', error.message);
        process.exit(1);
    }
}

async function verifyMetrics() {
    console.log('\n--- Verifying Metrics API ---');
    try {
        const res = await fetch(`${API_URL}/metrics/kpi?time_range=monthly`, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        const data = await res.json();

        if (!data.success) throw new Error(data.message);

        const stats = data.data.technician_performance;
        console.log('Technician Performance Data (First 2):', stats.slice(0, 2));

        if (stats.length > 0) {
            const first = stats[0];
            if (first.hasOwnProperty('resolved_count') && first.hasOwnProperty('assigned_count')) {
                console.log('PASS: Metrics response contains resolved_count and assigned_count');
            } else {
                console.error('FAIL: Metrics response missing required fields');
            }
        } else {
            console.log('WARN: No technician performance data found (no resolved faults in range?)');
        }
    } catch (error) {
        console.error('Metrics API failed:', error.message);
    }
}

async function verifyTeamPermissions() {
    console.log('\n--- Verifying Team Permissions (Update Staff) ---');
    // 1. Create a dummy staff
    let staffId;
    try {
        const createRes = await fetch(`${API_URL}/technicians`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
            body: JSON.stringify({
                username: 'tempstaff_v2',
                email: 'verify2@staff.com',
                first_name: 'Verify',
                last_name: 'Staff',
                password: 'password123',
                role: 'Staff',
                phone_number: '0000000000'
            })
        });
        const createData = await createRes.json();
        if (!createData.success) throw new Error('Create failed: ' + createData.message);

        staffId = createData.data.id;
        console.log(`Created temp staff ID: ${staffId}`);

        // 2. Update staff using the /technicians/:id route
        const updateRes = await fetch(`${API_URL}/technicians/${staffId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
            body: JSON.stringify({
                phone_number: '1111111111'
            })
        });

        if (updateRes.ok) {
            console.log('PASS: Successfully updated Staff member using Technicians route');
        } else {
            const err = await updateRes.json();
            console.error('FAIL: Update Staff failed:', err);
        }

        // 3. Cleanup
        await fetch(`${API_URL}/technicians/${staffId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        console.log('ID deleted');

    } catch (error) {
        console.error('Team Permissions Check Failed:', error.message);
    }
}

async function run() {
    await login();
    await verifyMetrics();
    await verifyTeamPermissions();
}

run();
