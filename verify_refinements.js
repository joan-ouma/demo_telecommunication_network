
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000/api';

async function verify() {
    try {
        console.log('--- Verifying Refinements ---');

        // 1. Login as Admin
        console.log('Logging in as Admin...');
        const loginRes = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'jouma', password: 'admin' })
        });
        const loginData = await loginRes.json();

        if (!loginData.success) {
            console.error('Login failed:', loginData);
            process.exit(1);
        }
        const token = loginData.data.token;
        console.log('✅ Login successful');

        // 2. Check Team Management for Manager
        console.log('\nChecking Team Management (Technicians + Manager)...');
        const teamRes = await fetch(`${BASE_URL}/technicians`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const teamData = await teamRes.json();
        const manager = teamData.data.find(u => u.role === 'Manager');
        if (manager) {
            console.log(`✅ Manager found: ${manager.name} (${manager.email})`);
        } else {
            console.error('❌ Manager NOT found in /technicians response');
        }

        // 3. Check Dashboard for Active Staff Count
        console.log('\nChecking Dashboard Metrics...');
        const dashRes = await fetch(`${BASE_URL}/metrics/dashboard`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const dashData = await dashRes.json();
        const staffCount = dashData.data.staff_count;
        if (typeof staffCount === 'number') {
            console.log(`✅ Active Staff Count: ${staffCount}`);
        } else {
            console.error('❌ staff_count missing in /metrics/dashboard');
        }

        // 4. Check KPI for Technician Performance
        console.log('\nChecking Quality Metrics (Technician Performance)...');
        const kpiRes = await fetch(`${BASE_URL}/metrics/kpi?time_range=monthly`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const kpiData = await kpiRes.json();
        const techPerf = kpiData.data.technician_performance;
        if (Array.isArray(techPerf)) {
            console.log(`✅ Technician Performance data found. Count: ${techPerf.length}`);
            if (techPerf.length > 0) {
                console.log('Sample entry:', techPerf[0]);
            }
        } else {
            console.error('❌ technician_performance missing in /metrics/kpi');
        }

    } catch (error) {
        console.error('Verification failed:', error);
    }
}

verify();
