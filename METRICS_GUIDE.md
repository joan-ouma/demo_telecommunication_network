# MnettyWise Metrics Explanation Guide

This document explains what each metric means and how it's calculated.

---

## Dashboard Metrics

### 1. Network Uptime (%)
**What it means**: Percentage of network components currently operational and serving users.

**How it's calculated**:
```
Network Uptime = (Active Components / Total Components) × 100
```

**Example**:
- Total Components: 10
- Active Components: 7
- Network Uptime = (7/10) × 100 = **70%**

**What "Active" means**: Component is fully operational and available to users.

---

### 2. Active Components
**What it means**: Number of network devices currently online and functioning normally.

**How it's calculated**:
```sql
SELECT COUNT(*) FROM Network_Components WHERE status = 'Active'
```

**Statuses explained**:
- **Active**: Working normally ✅
- **Maintenance**: Temporarily offline for planned work 🔧
- **Faulty**: Broken, needs repair ⚠️
- **Inactive**: Intentionally turned off or decommissioned 🔌

---

### 3. Open Faults
**What it means**: Number of NEW problem reports waiting to be assigned to a technician.

**How it's calculated**:
```sql
SELECT COUNT(*) FROM Faults WHERE status = 'Open'
```

**Status lifecycle**:
1. **Open** → Reported, not yet assigned
2. **In Progress** → Technician is actively working on it
3. **Pending** → Waiting for parts/approval
4. **Resolved** → Fixed
5. **Closed** → Verified and closed

**Important**: "Open Faults" ≠ "All unresolved issues". It's ONLY Step 1.

---

### 4. Avg Response Time
**What it means**: Average time (in minutes) from when a fault is reported until it's completely resolved.

**How it's calculated**:
```sql
SELECT AVG(response_time_minutes) 
FROM Faults 
WHERE response_time_minutes IS NOT NULL 
  AND resolved_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
```

**What response_time_minutes is**:
```
response_time_minutes = Time from "Reported" to "Resolved"
```

**Example**:
- Fault reported: Jan 10, 2:00 PM
- Fault resolved: Jan 10, 4:00 PM
- Response time: **120 minutes** (2 hours)

**Current calculation**:
- Fault #3 (Firewall): 120 minutes
- Fault #6 (NAS): 45 minutes
- Average: (120 + 45) / 2 = **82.5 ≈ 83 minutes**

---

### 5. Today's Activity

#### Faults Reported
**What it means**: How many new problem reports were created today.

**How it's calculated**:
```sql
SELECT COUNT(*) FROM Faults WHERE DATE(reported_at) = CURDATE()
```

#### Faults Resolved
**What it means**: How many problems were fully fixed today.

**How it's calculated**:
```sql
SELECT COUNT(*) FROM Faults 
WHERE status IN ('Resolved', 'Closed') 
  AND DATE(resolved_at) = CURDATE()
```

---

## Quality Metrics Page

### 1. Availability (%)
**What it means**: Same as "Network Uptime" on dashboard.

**Formula**: (Active Components / Total Components) × 100

---

### 2. MTTR - Mean Time To Repair
**What it means**: Average time to fix problems over the last 30 days. This is the SAME as "Avg Response Time" on the dashboard.

**How it's calculated**:
```sql
SELECT AVG(response_time_minutes) 
FROM Faults 
WHERE response_time_minutes IS NOT NULL 
  AND resolved_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
```

**Why it's important**: Lower MTTR = Faster fixes = Less downtime = Better service quality

---

### 3. Daily Fault Frequency
**What it means**: On average, how many faults are reported per day (last 30 days).

**How it's calculated**:
```sql
SELECT COUNT(*) / 30 
FROM Faults 
WHERE reported_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
```

**Example**:
- 6 faults in the last 30 days
- Daily average: 6 / 30 = **0.2 faults per day**

**What this tells you**: Lower = Better (more stable network)

---

### 4. Resolution Rate (%)
**What it means**: Percentage of reported faults that were successfully resolved (last 30 days).

**How it's calculated**:
```sql
SELECT (Resolved Faults / Total Faults) × 100
FROM Faults 
WHERE reported_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
```

**Example**:
- 6 total faults
- 2 resolved (Resolved or Closed)
- Resolution Rate: (2/6) × 100 = **33.33%**

**What this tells you**: Higher = Better (more problems getting fixed)

---

### 5. Component Health Scores

#### Active Faults (per component)
**What it means**: How many UNRESOLVED faults affect this specific component.

**How it's calculated**:
```sql
SELECT COUNT(*) FROM Faults 
WHERE component_id = X 
  AND status NOT IN ('Resolved', 'Closed')
```

**Includes**: Open, In Progress, Pending statuses

**Example**: If "Switch - Hall 7" has:
- 1 Open fault
- 0 In Progress
- 0 Pending
- **Active Faults = 1**

#### Health Score (%)
**What it means**: Overall health rating of a component (0-100%).

**How it's calculated**:
```
Start with 100%
- Subtract 15% for each active fault
- Subtract 2% for each historical fault (max -20%)
- Subtract 10% if avg resolution time > 120 min
- Subtract 10% if status = Maintenance
- Subtract 30% if status = Faulty
- Subtract 20% if status = Inactive

Health Score = MAX(0%, calculated score)
```

**Example**:
- Start: 100%
- 1 Active fault: -15% → 85%
- 3 Total historical faults: -6% → 79%
- Status = Faulty: -30% → 49%
- **Final Health Score: 49% (Fair)**

---

## Common Confusion Explained

### "Open Faults" vs "Active Faults"
- **Open Faults** (Dashboard) = Status = 'Open' ONLY (waiting for assignment)
- **Active Faults** (Quality Metrics) = All unresolved (Open + In Progress + Pending)

### "Avg Response Time" vs "Maintenance Duration"
- **Avg Response Time** = Time to fix EMERGENCY/REACTIVE problems (from Faults table)
- **Maintenance Duration** = Time spent on PLANNED/PREVENTIVE work (from Maintenance_Logs table)

**These are separate!** Changing maintenance duration does NOT affect avg response time.

---

## Current System Values

Based on seed data:
- **Total Components**: 10
- **Active Components**: 7
- **Network Uptime**: 70%
- **Total Faults**: 6
- **Open Faults**: 2
- **Active Faults**: 4 (Open + In Progress + Pending)
- **Avg Response Time**: 83 minutes
- **Resolution Rate**: 33.33% (2 resolved out of 6)
