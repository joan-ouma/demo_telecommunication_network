import { pool } from './server/database.js';

async function linkComponentsToDepartments() {
    try {
        console.log('🔗 Linking Network Components to Departments...');

        // Define mapping based on location keywords
        const locationToDepartment = [
            { keyword: 'Server Room', departmentName: 'Data Center A' },
            { keyword: 'Admin Block', departmentName: 'Network Operations' },
            { keyword: 'Boardroom', departmentName: 'IT Support' },
            { keyword: 'Main Lobby', departmentName: 'Customer Support' },
            { keyword: 'Security Gate', departmentName: 'Field Operations' },
            { keyword: 'Power Plant', departmentName: 'Data Center B' },
            { keyword: 'West Wing', departmentName: 'Finance' },
            { keyword: 'Staff Cafeteria', departmentName: 'HR' },
            { keyword: 'HR Loading', departmentName: 'HR' },
            { keyword: 'Parking', departmentName: 'Warehouse' },
        ];

        // Get all departments
        const [departments] = await pool.query('SELECT department_id, name FROM Departments');
        const deptMap = {};
        departments.forEach(d => {
            deptMap[d.name] = d.department_id;
        });

        // Get all components
        const [components] = await pool.query('SELECT component_id, location FROM Network_Components');

        let updated = 0;
        for (const component of components) {
            let assignedDeptId = null;

            // Find matching department based on location
            for (const mapping of locationToDepartment) {
                if (component.location && component.location.includes(mapping.keyword)) {
                    assignedDeptId = deptMap[mapping.departmentName];
                    break;
                }
            }

            if (assignedDeptId) {
                await pool.query(
                    'UPDATE Network_Components SET department_id = ? WHERE component_id = ?',
                    [assignedDeptId, component.component_id]
                );
                console.log(`✅ Linked ${component.location} → ${Object.keys(deptMap).find(k => deptMap[k] === assignedDeptId)}`);
                updated++;
            } else {
                console.log(`⚠️  No department match for: ${component.location}`);
            }
        }

        console.log(`\n✅ Successfully linked ${updated} components to departments.`);
        process.exit(0);
    } catch (error) {
        console.error('❌ Error linking components:', error);
        process.exit(1);
    }
}

linkComponentsToDepartments();
