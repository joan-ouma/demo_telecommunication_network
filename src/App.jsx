import React, { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend } from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
    LayoutDashboard, Server, AlertTriangle, BarChart, BarChart2,
    ClipboardList, Wrench, Package, Users, Shield,
    Bell, Search, Menu, X, CheckCircle, Clock,
    AlertCircle, DollarSign, Activity, FileText, Coins, MapPin,
    Printer, Download
} from 'lucide-react';

// Fix Leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend);

// API base URL
const API_URL = '/api';

// Auth Context
const AuthContext = createContext(null);

export function useAuth() {
    return useContext(AuthContext);
}

// API Helper
async function fetchAPI(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    const headers = {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
    };

    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || 'API request failed');
    }

    return data;
}

// Login Component
function Login({ onLogin }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await fetchAPI('/auth/login', {
                method: 'POST',
                body: JSON.stringify({ username, password }),
            });
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('user', JSON.stringify(response.data));
            onLogin(response.data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <div className="login-logo">
                    <div className="login-logo-icon">📡</div>
                    <h1 className="login-title">MnettyWise</h1>
                    <p className="login-subtitle">Telecommunications Network Solutions</p>
                </div>

                {error && <div className="alert alert-danger">{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">Username</label>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="Enter username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Password</label>
                        <input
                            type="password"
                            className="form-input"
                            placeholder="Enter password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={loading}>
                        {loading ? 'Signing in...' : 'Sign In'}
                    </button>
                </form>

                <div style={{ marginTop: 'var(--space-xl)', paddingTop: 'var(--space-lg)', borderTop: '1px solid var(--border-color)', textAlign: 'center' }}>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        "Where Quality Connects Everything"
                    </p>
                </div>
            </div>
        </div>
    );
}

// Sidebar Component
function Sidebar({ user, onLogout, isOpen, onClose }) {
    const location = useLocation();


    // Notification State
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [showNotifications, setShowNotifications] = useState(false);

    const fetchNotifications = async () => {
        try {
            const response = await fetchAPI('/notifications');
            if (response.success) {
                setNotifications(response.data);
                setUnreadCount(response.unreadCount);
            }
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
        }
    };

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 30000); // Poll every 30s
        return () => clearInterval(interval);
    }, []);

    const navItems = [
        { path: '/', icon: <LayoutDashboard size={20} />, label: 'Dashboard', roles: ['Admin', 'Manager', 'Technician'] },
        { path: '/infrastructure', icon: <Server size={20} />, label: 'Infrastructure', roles: ['Admin', 'Manager', 'Technician'] },
        { path: '/map', icon: <MapPin size={20} />, label: 'Device Map', roles: ['Admin', 'Manager', 'Technician'] },
        { path: '/faults', icon: <AlertTriangle size={20} />, label: 'Fault Reporting', roles: ['Admin', 'Manager', 'Technician', 'Staff'] },
        { path: '/metrics', icon: <BarChart size={20} />, label: 'Quality Metrics', roles: ['Admin', 'Manager', 'Technician'] },
        { path: '/reports', icon: <ClipboardList size={20} />, label: 'Incident Reports', roles: ['Admin', 'Manager'] },
        { path: '/maintenance', icon: <Wrench size={20} />, label: 'Maintenance Logs', roles: ['Admin', 'Manager', 'Technician'] },
        { path: '/inventory', icon: <Package size={20} />, label: 'Inventory', roles: ['Admin', 'Manager', 'Technician'] },
        { path: '/technicians', icon: <Users size={20} />, label: 'Team Management', roles: ['Admin', 'Manager'] },
        { path: '/team', icon: <Users size={20} />, label: 'Team', roles: ['Technician', 'Staff'] },
        { path: '/audit', icon: <Shield size={20} />, label: 'Audit Trail', roles: ['Admin'] },
    ];

    // Filter navigation items based on user role
    const filteredNavItems = navItems.filter(item => item.roles.includes(user?.role));





    return (
        <>
            <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
                <div className="sidebar-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div className="sidebar-logo">📡</div>
                        <div>
                            <div className="sidebar-title">MnettyWise</div>
                            <div className="sidebar-subtitle">Network Manager</div>
                        </div>
                    </div>
                    {/* Notification Bell */}
                    <div
                        style={{ position: 'relative', cursor: 'pointer', padding: '4px' }}
                        className="notification-bell"
                        onClick={() => setShowNotifications(!showNotifications)}
                    >
                        <span style={{ color: '#FEFAE0', cursor: 'pointer' }}><Bell size={22} /></span>
                        {unreadCount > 0 && (
                            <span style={{
                                position: 'absolute',
                                top: 0,
                                right: 0,
                                background: '#E53E3E',
                                color: 'white',
                                borderRadius: '50%',
                                width: '16px',
                                height: '16px',
                                fontSize: '10px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 'bold',
                                border: '2px solid var(--bg-card)'
                            }}>{unreadCount}</span>
                        )}

                        {/* Notification Dropdown */}
                        {showNotifications && (
                            <div style={{
                                position: 'absolute',
                                top: '100%',
                                left: 0,
                                width: '280px',
                                background: 'white',
                                border: '1px solid #ddd',
                                borderRadius: '8px',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                zIndex: 1000,
                                maxHeight: '350px',
                                overflowY: 'auto'
                            }}>
                                <div style={{ padding: '0.75rem', borderBottom: '1px solid #eee', fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
                                    <span>Notifications</span>
                                    {unreadCount > 0 && (
                                        <span
                                            style={{ fontSize: '0.75rem', color: '#3182CE', cursor: 'pointer' }}
                                            onClick={async (e) => {
                                                e.stopPropagation();
                                                await fetchAPI('/notifications/read-all', { method: 'PUT' });
                                                fetchNotifications();
                                            }}
                                        >
                                            Mark all read
                                        </span>
                                    )}
                                </div>
                                {notifications.length === 0 ? (
                                    <div style={{ padding: '1rem', textAlign: 'center', color: '#888', fontSize: '0.9rem' }}>
                                        No notifications
                                    </div>
                                ) : (
                                    notifications.map(n => (
                                        <div
                                            key={n.notification_id}
                                            style={{
                                                padding: '0.75rem',
                                                borderBottom: '1px solid #f0f0f0',
                                                background: n.is_read ? 'white' : '#ebf8ff',
                                                cursor: 'pointer'
                                            }}
                                            onClick={async () => {
                                                if (!n.is_read) {
                                                    await fetchAPI(`/notifications/${n.notification_id}/read`, { method: 'PUT' });
                                                    fetchNotifications();
                                                }
                                                if (n.link) {
                                                    window.location.hash = '#' + n.link; // Basic hash nav or use Link if Router available
                                                    // Since we use react-router in App, we should navigate correctly or rely on the fact we are SPA
                                                }
                                            }}
                                        >
                                            <div style={{ fontSize: '0.85rem', marginBottom: '4px' }}>{n.message}</div>
                                            <div style={{ fontSize: '0.7rem', color: '#888' }}>
                                                {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(n.created_at).toLocaleDateString()}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                </div>



                <nav>
                    <ul className="nav-menu">
                        {filteredNavItems.map((item) => (
                            <li key={item.path} className="nav-item">
                                <Link
                                    to={item.path}
                                    className={`nav-link ${location.pathname === item.path ? 'active' : ''}`}
                                    onClick={onClose}
                                >
                                    <span className="nav-icon">{item.icon}</span>
                                    {item.label}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </nav>

                <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border-color)', paddingTop: 'var(--space-lg)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
                        <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FEFAE0' }}>
                            {user?.username?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <div>
                            <div style={{ fontWeight: 500, color: '#FEFAE0' }}>{user?.username}</div>
                            <div style={{ fontSize: '0.75rem', color: 'rgba(254, 250, 224, 0.7)' }}>{user?.role}</div>
                        </div>
                    </div>
                    <button onClick={onLogout} className="btn btn-secondary" style={{ width: '100%' }}>
                        Sign Out
                    </button>
                </div>
            </aside>
        </>
    );
}

// Dashboard Component
function Dashboard() {
    const [metrics, setMetrics] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadMetrics();
    }, []);

    const loadMetrics = async () => {
        try {
            const response = await fetchAPI('/metrics/dashboard');
            setMetrics(response.data);
        } catch (error) {
            console.error('Failed to load metrics:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="loading-container">
                <div className="spinner"></div>
                <p>Loading dashboard...</p>
            </div>
        );
    }

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">Dashboard</h1>
                <p className="page-subtitle">Network overview and real-time metrics</p>
            </div>

            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon success"><CheckCircle size={24} /></div>
                    <div className="stat-content">
                        <div className="stat-value">{metrics?.uptime_percentage || 0}%</div>
                        <div className="stat-label">Network Uptime</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon primary"><Server size={24} /></div>
                    <div className="stat-content">
                        <div className="stat-value">{metrics?.components?.active || 0}</div>
                        <div className="stat-label">Active Components</div>
                        <div className="stat-trend">{metrics?.components?.total || 0} total</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon danger"><AlertTriangle size={24} /></div>
                    <div className="stat-content">
                        <div className="stat-value">{metrics?.faults?.open_faults || 0}</div>
                        <div className="stat-label">Open Faults</div>
                        <div className="stat-trend down">{metrics?.faults?.critical_open || 0} critical</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon warning"><Clock size={24} /></div>
                    <div className="stat-content">
                        <div className="stat-value">{metrics?.avg_response_time || 0}m</div>
                        <div className="stat-label">Avg Response Time</div>
                    </div>
                </div>
            </div>

            <div className="grid-2">
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Today's Activity</h3>
                    </div>
                    <div className="stats-grid" style={{ marginBottom: 0 }}>
                        <div style={{ textAlign: 'center', padding: 'var(--space-md)' }}>
                            <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--accent-danger)' }}>{metrics?.today?.total || 0}</div>
                            <div className="text-muted">Faults Reported</div>
                        </div>
                        <div style={{ textAlign: 'center', padding: 'var(--space-md)' }}>
                            <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--accent-success)' }}>{metrics?.today?.resolved || 0}</div>
                            <div className="text-muted">Faults Resolved</div>
                        </div>
                    </div>
                </div>

                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Technician Status</h3>
                    </div>
                    <div className="stats-grid" style={{ marginBottom: 0 }}>
                        <div style={{ textAlign: 'center', padding: 'var(--space-md)' }}>
                            <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--accent-success)' }}>{metrics?.technicians?.total || 0}</div>
                            <div className="text-muted">Total</div>
                        </div>
                        {/* Status tracking removed from Technicians for now */}
                        <div style={{ textAlign: 'center', padding: 'var(--space-md)' }}>
                            <div className="text-muted"><small>Status tracking requires update</small></div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="card mt-3">
                <div className="card-header">
                    <h3 className="card-title">Component Status Overview</h3>
                </div>
                <div className="stats-grid" style={{ marginBottom: 0 }}>
                    <div style={{ textAlign: 'center', padding: 'var(--space-md)' }}>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-success)' }}>{metrics?.components?.active || 0}</div>
                        <div className="text-muted">Active</div>
                    </div>
                    <div style={{ textAlign: 'center', padding: 'var(--space-md)' }}>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-warning)' }}>{metrics?.components?.maintenance || 0}</div>
                        <div className="text-muted">Maintenance</div>
                    </div>
                    <div style={{ textAlign: 'center', padding: 'var(--space-md)' }}>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-danger)' }}>{metrics?.components?.faulty || 0}</div>
                        <div className="text-muted">Faulty</div>
                    </div>
                    <div style={{ textAlign: 'center', padding: 'var(--space-md)' }}>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-muted)' }}>{metrics?.components?.inactive || 0}</div>
                        <div className="text-muted">Inactive</div>
                    </div>
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid-2 mt-3">
                {/* Component Status Doughnut Chart */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Component Status Distribution</h3>
                    </div>
                    <div style={{ padding: '1rem', display: 'flex', justifyContent: 'center' }}>
                        <div style={{ width: '250px', height: '250px' }}>
                            <Doughnut
                                data={{
                                    labels: ['Active', 'Maintenance', 'Faulty', 'Inactive'],
                                    datasets: [{
                                        data: [
                                            metrics?.components?.active || 0,
                                            metrics?.components?.maintenance || 0,
                                            metrics?.components?.faulty || 0,
                                            metrics?.components?.inactive || 0
                                        ],
                                        backgroundColor: ['#28A745', '#FFC107', '#DC3545', '#6C757D'],
                                        borderWidth: 2,
                                        borderColor: '#FEFAE0'
                                    }]
                                }}
                                options={{
                                    responsive: true,
                                    maintainAspectRatio: true,
                                    plugins: {
                                        legend: {
                                            position: 'bottom',
                                            labels: { color: '#283618', padding: 15 }
                                        }
                                    }
                                }}
                            />
                        </div>
                    </div>
                </div>

                {/* Fault Status Bar Chart */}
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Faults by Priority</h3>
                    </div>
                    <div style={{ padding: '1rem', height: '280px' }}>
                        <Bar
                            data={{
                                labels: ['Critical', 'High', 'Medium', 'Low'],
                                datasets: [{
                                    label: 'Open Faults',
                                    data: [
                                        metrics?.faults?.critical_open || 0,
                                        metrics?.faults?.high_open || 0,
                                        metrics?.faults?.medium_open || 0,
                                        metrics?.faults?.low_open || 0
                                    ],
                                    backgroundColor: ['#DC3545', '#FD7E14', '#FFC107', '#28A745'],
                                    borderRadius: 6
                                }]
                            }}
                            options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: {
                                    legend: { display: false }
                                },
                                scales: {
                                    y: {
                                        beginAtZero: true,
                                        ticks: { stepSize: 1, color: '#283618' },
                                        grid: { color: 'rgba(40, 54, 24, 0.1)' }
                                    },
                                    x: {
                                        ticks: { color: '#283618' },
                                        grid: { display: false }
                                    }
                                }
                            }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

// Infrastructure Component
function Infrastructure() {
    const { role } = useAuth(); // Get user role
    const [components, setComponents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState({ type: '', status: '' });
    const [showModal, setShowModal] = useState(false);
    const [editingComponent, setEditingComponent] = useState(null);

    useEffect(() => {
        loadComponents();
    }, [filter]);

    const loadComponents = async () => {
        try {
            const params = new URLSearchParams();
            if (filter.type) params.append('type', filter.type);
            if (filter.status) params.append('status', filter.status);

            const response = await fetchAPI(`/components?${params}`);
            setComponents(response.data);
        } catch (error) {
            console.error('Failed to load components:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (data) => {
        try {
            if (editingComponent) {
                await fetchAPI(`/components/${editingComponent.component_id}`, {
                    method: 'PUT',
                    body: JSON.stringify(data),
                });
            } else {
                await fetchAPI('/components', {
                    method: 'POST',
                    body: JSON.stringify(data),
                });
            }
            setShowModal(false);
            setEditingComponent(null);
            loadComponents();
        } catch (error) {
            alert(error.message);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this component?')) return;
        try {
            await fetchAPI(`/components/${id}`, { method: 'DELETE' });
            loadComponents();
        } catch (error) {
            alert(error.message);
        }
    };

    const isAdmin = role === 'Admin';

    const handlePrint = () => { window.print(); };

    const handleExport = () => {
        const csv = [
            ['Name', 'Type', 'Model', 'IP Address', 'Location', 'Latitude', 'Longitude', 'Status'],
            ...components.map(c => [
                c.name, c.type, c.model_number || '', c.ip_address || '',
                c.location || '', c.latitude || '', c.longitude || '', c.status
            ])
        ].map(e => e.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'infrastructure_report.csv';
        a.click();
    };

    return (
        <div>
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 className="page-title">Infrastructure</h1>
                    <p className="page-subtitle">{isAdmin ? 'Manage network components and configurations' : 'View network components and locations'}</p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn btn-secondary" onClick={handlePrint}><Printer size={16} /> Print</button>
                    <button className="btn btn-secondary" onClick={handleExport}><Download size={16} /> Export</button>
                </div>
            </div>

            <div className="action-bar">
                <div className="filter-group">
                    <select className="filter-select" value={filter.type} onChange={(e) => setFilter({ ...filter, type: e.target.value })}>
                        <option value="">All Types</option>
                        <option value="Router">Routers</option>
                        <option value="Switch">Switches</option>
                        <option value="Cable">Cables</option>
                        <option value="Server">Servers</option>
                        <option value="Firewall">Firewalls</option>
                        <option value="Access Point">Access Points</option>
                    </select>
                    <select className="filter-select" value={filter.status} onChange={(e) => setFilter({ ...filter, status: e.target.value })}>
                        <option value="">All Statuses</option>
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                        <option value="Maintenance">Maintenance</option>
                        <option value="Faulty">Faulty</option>
                    </select>
                </div>
                <button className="btn btn-primary" onClick={() => { setEditingComponent(null); setShowModal(true); }}>
                    + Add Component
                </button>
            </div>

            {loading ? (
                <div className="loading-container"><div className="spinner"></div></div>
            ) : (
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Type</th>
                                <th>Model No.</th>
                                <th>IP Address</th>
                                <th>Location</th>
                                <th>Latitude</th>
                                <th>Longitude</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {components.map((comp) => (
                                <tr key={comp.component_id}>
                                    <td style={{ fontWeight: 500 }}>{comp.name}</td>
                                    <td><span className="badge badge-info">{comp.type}</span></td>
                                    <td>{comp.model_number || '-'}</td>
                                    <td><code style={{ fontSize: '0.8rem' }}>{comp.ip_address || '-'}</code></td>
                                    <td>{comp.location || '-'}</td>
                                    <td>{comp.latitude || '-'}</td>
                                    <td>{comp.longitude || '-'}</td>
                                    <td><span className={`badge status-${comp.status.toLowerCase()}`}>{comp.status}</span></td>
                                    <td>
                                        {isAdmin ? (
                                            <div className="d-flex gap-1">
                                                <button className="btn btn-secondary btn-sm" onClick={() => { setEditingComponent(comp); setShowModal(true); }}>Edit</button>
                                                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(comp.component_id)}>Delete</button>
                                            </div>
                                        ) : (
                                            <span className="text-muted" style={{ fontSize: '0.85rem', fontStyle: 'italic' }}>View only</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {components.length === 0 && (
                                <tr>
                                    <td colSpan="7" className="text-center text-muted">No components found</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {showModal && (
                <ComponentModal
                    component={editingComponent}
                    onClose={() => { setShowModal(false); setEditingComponent(null); }}
                    onSave={handleSave}
                />
            )}
        </div>
    );
}

function ComponentModal({ component, onClose, onSave }) {
    const [departments, setDepartments] = useState([]);
    const [form, setForm] = useState({
        name: component?.name || '',
        type: component?.type || 'Router',
        model_number: component?.model_number || '',
        ip_address: component?.ip_address || '',
        mac_address: component?.mac_address || '',
        location: component?.location || '',
        department_id: component?.department_id || '',
        status: component?.status || 'Active',
        config_details: component?.config_details || '',
        latitude: component?.latitude || '',
        longitude: component?.longitude || '',
        install_date: component?.install_date ? component.install_date.split('T')[0] : '',
    });

    useEffect(() => {
        fetchAPI('/departments').then(res => setDepartments(res.data));
    }, []);

    const handleSubmit = (e) => {
        e.preventDefault();
        // If location is empty but department is selected, use department name + location as default
        let finalLocation = form.location;
        if (!finalLocation && form.department_id) {
            const dept = departments.find(d => String(d.department_id) === String(form.department_id));
            if (dept) {
                finalLocation = dept.name; // Simple valid location string
            }
        }
        onSave({ ...form, location: finalLocation });
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3 className="modal-title">{component ? 'Edit Component' : 'Add Component'}</h3>
                    <button className="modal-close" onClick={onClose}>&times;</button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <div className="form-group">
                            <label className="form-label">Name *</label>
                            <input className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                        </div>
                        <div className="grid-2">
                            <div className="form-group">
                                <label className="form-label">Type *</label>
                                <select className="form-select" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                                    <option value="Router">Router</option>
                                    <option value="Switch">Switch</option>
                                    <option value="Cable">Cable</option>
                                    <option value="Server">Server</option>
                                    <option value="Firewall">Firewall</option>
                                    <option value="Access Point">Access Point</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Status</label>
                                <select className="form-select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                                    <option value="Active">Active</option>
                                    <option value="Inactive">Inactive</option>
                                    <option value="Maintenance">Maintenance</option>
                                    <option value="Faulty">Faulty</option>
                                </select>
                            </div>
                        </div>
                        <div className="grid-2">
                            <div className="form-group">
                                <label className="form-label">Model Number</label>
                                <input className="form-input" value={form.model_number} onChange={(e) => setForm({ ...form, model_number: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Install Date</label>
                                <input type="date" className="form-input" value={form.install_date} onChange={(e) => setForm({ ...form, install_date: e.target.value })} />
                            </div>
                        </div>
                        <div className="grid-2">
                            <div className="form-group">
                                <label className="form-label">Department *</label>
                                <select
                                    className="form-select"
                                    value={form.department_id}
                                    onChange={(e) => {
                                        const deptId = e.target.value;
                                        const dept = departments.find(d => String(d.department_id) === String(deptId));
                                        setForm({
                                            ...form,
                                            department_id: deptId,
                                            location: dept ? dept.location || dept.name : form.location // Auto-fill location detail
                                        });
                                    }}
                                    required
                                >
                                    <option value="">Select Department</option>
                                    {departments.map(d => (
                                        <option key={d.department_id} value={d.department_id}>{d.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Location Detail</label>
                                <input
                                    className="form-input"
                                    value={form.location}
                                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                                    placeholder="Specific room or rack"
                                />
                            </div>
                        </div>
                        <div className="grid-2">
                            <div className="form-group">
                                <label className="form-label">IP Address</label>
                                <input className="form-input" value={form.ip_address} onChange={(e) => setForm({ ...form, ip_address: e.target.value })} placeholder="192.168.1.1" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">MAC Address</label>
                                <input className="form-input" value={form.mac_address} onChange={(e) => setForm({ ...form, mac_address: e.target.value })} />
                            </div>
                        </div>
                        <div className="grid-2">
                            <div className="form-group">
                                <label className="form-label">Latitude</label>
                                <input className="form-input" type="number" step="any" value={form.latitude || ''} onChange={(e) => setForm({ ...form, latitude: e.target.value })} placeholder="-1.2921" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Longitude</label>
                                <input className="form-input" type="number" step="any" value={form.longitude || ''} onChange={(e) => setForm({ ...form, longitude: e.target.value })} placeholder="36.8219" />
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Config/Additional Notes</label>
                            <textarea
                                className="form-textarea"
                                value={form.config_details}
                                onChange={(e) => setForm({ ...form, config_details: e.target.value })}
                                placeholder="Enter configuration details or notes (plain text)"
                                rows={3}
                            />
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn btn-primary">Save</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// Fault Reporting Wrapper - Routes Staff to simplified UI
function FaultReportingWrapper() {
    const { role } = useContext(AuthContext) || {};
    if (role === 'Staff') {
        return <StaffFaultReport />;
    }
    return <FaultReporting />;
}

// Staff Fault Report - Simplified, beautiful fault reporting for office workers
function StaffFaultReport() {
    const user = useContext(AuthContext) || {};
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [myReports, setMyReports] = useState([]);
    const [showForm, setShowForm] = useState(true);
    const [components, setComponents] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [filteredComponents, setFilteredComponents] = useState([]);
    const [form, setForm] = useState({
        title: '',
        description: '',
        priority: 'Medium',
        department_id: '',
        component_id: '',
        location_description: '',
        latitude: null,
        longitude: null
    });

    useEffect(() => {
        loadComponents();
        loadDepartments();
        loadMyReports();
    }, []);

    useEffect(() => {
        if (form.department_id) {
            setFilteredComponents(components.filter(c => String(c.department_id) === String(form.department_id)));
        } else {
            setFilteredComponents(components);
        }
    }, [form.department_id, components]);

    const loadDepartments = async () => {
        try {
            const response = await fetchAPI('/departments');
            setDepartments(response.data);
        } catch (error) {
            console.error('Failed to load departments:', error);
        }
    };

    const loadComponents = async () => {
        try {
            const response = await fetchAPI('/components');
            setComponents(response.data);
            setFilteredComponents(response.data);
        } catch (error) {
            console.error('Failed to load components:', error);
        }
    };

    const loadMyReports = async () => {
        try {
            const response = await fetchAPI(`/faults?reported_by=${user.user_id}`);
            setMyReports(response.data || []);
        } catch (error) {
            console.error('Failed to load reports:', error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.title || !form.description || !form.component_id) {
            alert('Please fill in all required fields');
            return;
        }

        setLoading(true);
        try {
            await fetchAPI('/faults', {
                method: 'POST',
                body: JSON.stringify({
                    ...form,
                    category: 'staff_report'
                })
            });
            setSubmitted(true);
            setForm({ title: '', description: '', priority: 'Medium', department_id: '', component_id: '', location_description: '', latitude: null, longitude: null });
            loadMyReports();
            setTimeout(() => setSubmitted(false), 3000);
        } catch (error) {
            alert(error.message);
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status) => {
        const colors = {
            'Open': '#E53E3E',
            'In Progress': '#ED8936',
            'Resolved': '#48BB78',
            'Closed': '#A0AEC0',
            'Pending': '#9F7AEA'
        };
        return <span className="badge" style={{ background: colors[status] || '#A0AEC0' }}>{status}</span>;
    };

    const getPriorityColor = (priority) => {
        return { 'Critical': '#E53E3E', 'High': '#ED8936', 'Medium': '#ECC94B', 'Low': '#48BB78' }[priority] || '#A0AEC0';
    };

    return (
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            <div className="page-header" style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <h1 className="page-title" style={{ fontSize: '2rem' }}>Report an Issue</h1>
                <p className="page-subtitle">Help us maintain your workspace - report any network or equipment issues</p>
            </div>

            {submitted && (
                <div style={{
                    background: 'linear-gradient(135deg, #48BB78, #38A169)',
                    color: 'white',
                    padding: '1.5rem',
                    borderRadius: '12px',
                    textAlign: 'center',
                    marginBottom: '2rem',
                    animation: 'fadeIn 0.3s ease-out'
                }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✓</div>
                    <strong>Issue Reported Successfully!</strong>
                    <p style={{ margin: '0.5rem 0 0', opacity: 0.9 }}>A technician will be assigned shortly.</p>
                </div>
            )}

            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                <button
                    className={`btn ${showForm ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setShowForm(true)}
                >
                    Report Issue
                </button>
                <button
                    className={`btn ${!showForm ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setShowForm(false)}
                    style={{ position: 'relative' }}
                >
                    My Reports
                    {myReports.length > 0 && (
                        <span style={{
                            position: 'absolute', top: -8, right: -8,
                            background: '#BC6C25', color: 'white', borderRadius: '50%',
                            width: 22, height: 22, display: 'flex', alignItems: 'center',
                            justifyContent: 'center', fontSize: '0.75rem', fontWeight: 'bold'
                        }}>{myReports.length}</span>
                    )}
                </button>
            </div>

            {showForm ? (
                <div className="card" style={{ padding: '2rem', background: 'linear-gradient(135deg, rgba(96, 108, 56, 0.05), rgba(40, 54, 24, 0.1))', border: '1px solid rgba(96, 108, 56, 0.2)' }}>
                    <form onSubmit={handleSubmit}>
                        <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                            <label className="form-label" style={{ fontSize: '1.1rem', fontWeight: 600 }}>What's the issue? *</label>
                            <input
                                className="form-input"
                                placeholder="e.g., Internet not working, Printer offline, No power..."
                                value={form.title}
                                onChange={(e) => setForm({ ...form, title: e.target.value })}
                                style={{ fontSize: '1rem', padding: '0.875rem' }}
                                required
                            />
                        </div>

                        <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                            <label className="form-label" style={{ fontSize: '1.1rem', fontWeight: 600 }}>Describe the problem *</label>
                            <textarea
                                className="form-textarea"
                                placeholder="Please provide details: When did it start? What were you doing? Any error messages?"
                                value={form.description}
                                onChange={(e) => setForm({ ...form, description: e.target.value })}
                                rows={4}
                                style={{ fontSize: '1rem', padding: '0.875rem' }}
                                required
                            />
                        </div>

                        <div className="grid-2" style={{ marginBottom: '1.5rem' }}>
                            <div className="form-group">
                                <label className="form-label" style={{ fontWeight: 600 }}>Department *</label>
                                <select
                                    className="form-input"
                                    value={form.department_id}
                                    onChange={(e) => {
                                        const deptId = e.target.value;
                                        const dept = departments.find(d => String(d.department_id) === String(deptId));
                                        setForm({
                                            ...form,
                                            department_id: deptId,
                                            location_description: dept ? dept.location || dept.name : form.location_description
                                        });
                                    }}
                                    style={{ padding: '0.875rem' }}
                                >
                                    <option value="">-- Select your department --</option>
                                    {departments.map(d => (
                                        <option key={d.department_id} value={d.department_id}>
                                            {d.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label" style={{ fontWeight: 600 }}>Affected Equipment *</label>
                                <select
                                    className="form-input"
                                    value={form.component_id}
                                    onChange={(e) => setForm({ ...form, component_id: e.target.value })}
                                    style={{ padding: '0.875rem' }}
                                    required
                                >
                                    <option value="">-- Select equipment --</option>
                                    {filteredComponents.map(c => (
                                        <option key={c.component_id} value={c.component_id}>
                                            {c.name} ({c.type}) {c.department_name ? `- ${c.department_name}` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="grid-2" style={{ marginBottom: '1.5rem' }}>
                            <div className="form-group">
                                <label className="form-label" style={{ fontWeight: 600 }}>How urgent is this?</label>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    {['Low', 'Medium', 'High', 'Critical'].map(p => (
                                        <button
                                            key={p}
                                            type="button"
                                            className={`btn btn-sm ${form.priority === p ? '' : 'btn-secondary'}`}
                                            style={{
                                                flex: 1,
                                                background: form.priority === p ? getPriorityColor(p) : undefined,
                                                color: form.priority === p ? 'white' : undefined,
                                                border: `2px solid ${getPriorityColor(p)}`
                                            }}
                                            onClick={() => setForm({ ...form, priority: p })}
                                        >
                                            {p}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label" style={{ fontWeight: 600 }}>Your Location (helps technician find you)</label>
                                <input
                                    className="form-input"
                                    placeholder="e.g., Building A, 3rd Floor, Office 305"
                                    value={form.location_description}
                                    onChange={(e) => setForm({ ...form, location_description: e.target.value })}
                                    style={{ padding: '0.875rem' }}
                                />
                            </div>
                        </div>

                        <div className="grid-2" style={{ marginBottom: '1.5rem' }}>
                            <div className="form-group">
                                <label className="form-label" style={{ fontWeight: 600 }}>Latitude (Optional)</label>
                                <input
                                    type="number" step="any"
                                    className="form-input"
                                    placeholder="e.g. -1.2921"
                                    value={form.latitude || ''}
                                    onChange={(e) => setForm({ ...form, latitude: e.target.value })}
                                    style={{ padding: '0.875rem' }}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label" style={{ fontWeight: 600 }}>Longitude (Optional)</label>
                                <input
                                    type="number" step="any"
                                    className="form-input"
                                    placeholder="e.g. 36.8219"
                                    value={form.longitude || ''}
                                    onChange={(e) => setForm({ ...form, longitude: e.target.value })}
                                    style={{ padding: '0.875rem' }}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={loading}
                            style={{
                                width: '100%',
                                padding: '1rem',
                                fontSize: '1.1rem',
                                background: 'linear-gradient(135deg, #606C38, #283618)',
                                border: 'none'
                            }}
                        >
                            {loading ? 'Submitting...' : 'Submit Report'}
                        </button>
                    </form>
                </div>
            ) : (
                <div className="card" style={{ padding: '1.5rem' }}>
                    <h3 style={{ marginBottom: '1rem' }}>Your Reported Issues</h3>
                    {myReports.length === 0 ? (
                        <p className="text-muted" style={{ textAlign: 'center', padding: '2rem' }}>
                            You haven't reported any issues yet.
                        </p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {myReports.map(report => (
                                <div key={report.fault_id} style={{
                                    padding: '1rem',
                                    background: 'rgba(96, 108, 56, 0.05)',
                                    borderRadius: '8px',
                                    borderLeft: `4px solid ${getPriorityColor(report.priority)}`
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                        <strong>FLT-{String(report.fault_id).padStart(3, '0')}: {report.title}</strong>
                                        {getStatusBadge(report.status)}
                                    </div>
                                    <p style={{ margin: '0.5rem 0', color: '#666', fontSize: '0.9rem' }}>{report.description}</p>
                                    <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem', color: '#888', marginBottom: '0.5rem' }}>
                                        <span>📅 {new Date(report.reported_at).toLocaleDateString()}</span>
                                        {report.assigned_technician && <span>👷 Assigned to: {report.assigned_technician}</span>}
                                    </div>
                                    {/* Confirmation buttons for resolved issues */}
                                    {report.status === 'Resolved' && (
                                        <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: 'rgba(72, 187, 120, 0.1)', borderRadius: '6px' }}>
                                            <p style={{ margin: 0, fontSize: '0.9rem', marginBottom: '0.5rem' }}>✅ Is this issue fully resolved?</p>
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                <button
                                                    className="btn btn-sm"
                                                    style={{ background: '#48BB78', color: 'white', border: 'none' }}
                                                    onClick={async () => {
                                                        await fetchAPI(`/faults/${report.fault_id}/status`, { method: 'PUT', body: JSON.stringify({ status: 'Closed' }) });
                                                        loadMyReports();
                                                    }}
                                                >
                                                    ✓ Yes, Confirmed
                                                </button>
                                                <button
                                                    className="btn btn-sm"
                                                    style={{ background: '#E53E3E', color: 'white', border: 'none' }}
                                                    onClick={async () => {
                                                        await fetchAPI(`/faults/${report.fault_id}/status`, { method: 'PUT', body: JSON.stringify({ status: 'Open' }) });
                                                        loadMyReports();
                                                    }}
                                                >
                                                    ✗ Not Resolved
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// Fault Reporting Component
function FaultReporting() {
    const { user_id, role } = useContext(AuthContext) || {};
    const [faults, setFaults] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState({ status: '', priority: '', dateFrom: '', dateTo: '' });
    // View mode: 'my' for My Assignments, 'all' for All Faults
    const [viewMode, setViewMode] = useState(role === 'Technician' ? 'my' : 'all');
    const [showModal, setShowModal] = useState(false);
    const [showAssignModal, setShowAssignModal] = useState(null);
    const [showScheduleModal, setShowScheduleModal] = useState(null);
    const [showCommentsModal, setShowCommentsModal] = useState(null);

    useEffect(() => {
        loadFaults();
    }, [filter, viewMode]);

    const loadFaults = async () => {
        try {
            const params = new URLSearchParams();
            if (filter.status) params.append('status', filter.status);
            if (filter.priority) params.append('priority', filter.priority);
            if (filter.dateFrom) params.append('from_date', filter.dateFrom);
            if (filter.dateTo) params.append('to_date', filter.dateTo);
            if (viewMode === 'my' && user_id) params.append('technician_id', user_id);

            const response = await fetchAPI(`/faults?${params}`);
            setFaults(response.data);
        } catch (error) {
            console.error('Failed to load faults:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = async (id, newStatus) => {
        try {
            await fetchAPI(`/faults/${id}/status`, {
                method: 'PUT',
                body: JSON.stringify({ status: newStatus }),
            });
            loadFaults();
        } catch (error) {
            alert(error.message);
        }
    };

    const handlePrint = () => { window.print(); };

    const handleExport = () => {
        const csv = [
            ['ID', 'Title', 'Department', 'Component', 'Priority', 'Status', 'Assigned', 'Reported'],
            ...faults.map(f => [
                f.fault_id, f.title, f.department_name || 'N/A', f.component_name, f.priority, f.status,
                f.technician_name || 'Unassigned', f.reported_at
            ])
        ].map(e => e.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `faults_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">Fault Reporting</h1>
                <p className="page-subtitle">Log and track network faults</p>
            </div>

            <div className="action-bar">
                {/* Tab-based view selector for Technicians */}
                {role === 'Technician' && (
                    <div style={{ display: 'flex', gap: '0.5rem', marginRight: '1rem' }}>
                        <button
                            className={`btn ${viewMode === 'my' ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => setViewMode('my')}
                            style={{ position: 'relative', paddingRight: '2.5rem' }}
                        >
                            My Assignments
                            {faults.filter(f => f.assigned_to === user_id).length > 0 && (
                                <span style={{
                                    position: 'absolute',
                                    top: '-8px',
                                    right: '-8px',
                                    background: '#BC6C25',
                                    color: 'white',
                                    borderRadius: '50%',
                                    width: '24px',
                                    height: '24px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '0.75rem',
                                    fontWeight: 'bold',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                                }}>{faults.filter(f => f.assigned_to === user_id).length}</span>
                            )}
                        </button>
                        <button
                            className={`btn ${viewMode === 'all' ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => setViewMode('all')}
                        >
                            All Faults
                            <span style={{
                                marginLeft: '0.5rem',
                                background: 'rgba(255, 255, 255, 0.25)',
                                padding: '2px 8px',
                                borderRadius: '12px',
                                fontSize: '0.75rem',
                                fontWeight: 'bold'
                            }}>{faults.length}</span>
                        </button>
                    </div>
                )}

                <div className="filter-group">
                    <select className="filter-select" value={filter.status} onChange={(e) => setFilter({ ...filter, status: e.target.value })}>
                        <option value="">All Statuses</option>
                        <option value="Open">Open</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Resolved">Resolved</option>
                        <option value="Closed">Closed</option>
                    </select>
                    <select className="filter-select" value={filter.priority} onChange={(e) => setFilter({ ...filter, priority: e.target.value })}>
                        <option value="">All Priorities</option>
                        <option value="Critical">Critical</option>
                        <option value="High">High</option>
                        <option value="Medium">Medium</option>
                        <option value="Low">Low</option>
                    </select>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>From:</span>
                        <input
                            type="date"
                            className="form-input"
                            value={filter.dateFrom}
                            onChange={(e) => setFilter({ ...filter, dateFrom: e.target.value })}
                            style={{ padding: '0.4rem 0.6rem', width: 'auto' }}
                        />
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>To:</span>
                        <input
                            type="date"
                            className="form-input"
                            value={filter.dateTo}
                            onChange={(e) => setFilter({ ...filter, dateTo: e.target.value })}
                            style={{ padding: '0.4rem 0.6rem', width: 'auto' }}
                        />
                        {(filter.dateFrom || filter.dateTo) && (
                            <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => setFilter({ ...filter, dateFrom: '', dateTo: '' })}
                                title="Clear dates"
                            >
                                ✕
                            </button>
                        )}
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn btn-secondary" onClick={handlePrint}>Print</button>
                    <button className="btn btn-secondary" onClick={handleExport}>Export CSV</button>
                    <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                        + Report Fault
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="loading-container"><div className="spinner"></div></div>
            ) : (
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Title / Component</th>
                                <th>Department</th>
                                <th>Priority</th>
                                <th>Status</th>
                                <th>Assigned To</th>
                                <th>Reported</th>
                                <th>Scheduled For</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {faults.map((fault) => (
                                <tr key={fault.fault_id} style={fault.assigned_to === user_id ? { backgroundColor: 'rgba(96, 108, 56, 0.15)' } : {}}>
                                    <td style={{ fontWeight: 500 }}>FLT-{String(fault.fault_id).padStart(3, '0')}</td>
                                    <td>
                                        <div style={{ fontWeight: 500 }}>{fault.title}</div>
                                        <div className="text-secondary" style={{ fontSize: '0.85rem' }}>{fault.component_name || '-'}</div>
                                    </td>
                                    <td>{fault.department_name || '-'}</td>
                                    <td><span className={`badge priority-${fault.priority.toLowerCase()}`}>{fault.priority}</span></td>
                                    <td><span className={`badge status-${fault.status.toLowerCase().replace(' ', '_')}`}>{fault.status}</span></td>
                                    <td>{fault.technician_name || <span className="text-muted">Unassigned</span>}</td>
                                    <td>{new Date(fault.reported_at).toLocaleString('en-US', { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                                    <td>{fault.scheduled_for ? new Date(fault.scheduled_for).toLocaleDateString() : '-'}</td>
                                    <td>
                                        <div className="d-flex gap-1 align-center">
                                            <button className="btn btn-secondary btn-sm" onClick={() => setShowCommentsModal(fault)} style={{ position: 'relative' }}>
                                                💬 {fault.comment_count > 0 && <span style={{ marginLeft: '4px', fontSize: '0.8rem' }}>{fault.comment_count === 1 ? '1 comment' : `${fault.comment_count} comments`}</span>}
                                                {fault.comment_count === 0 && 'Add comment'}
                                                {fault.comment_count > 0 && (
                                                    <span style={{
                                                        position: 'absolute',
                                                        top: -6,
                                                        right: -6,
                                                        background: Number(fault.last_comment_user_id) === Number(user_id) ? '#28A745' : '#DC3545',
                                                        color: 'white',
                                                        borderRadius: '50%',
                                                        width: 18,
                                                        height: 18,
                                                        fontSize: '0.7rem',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        fontWeight: 'bold'
                                                    }}>
                                                        {fault.comment_count}
                                                    </span>
                                                )}
                                            </button>

                                            {/* Assign / Reassign Button for Admin/Manager */}
                                            {['Open', 'Pending', 'In Progress'].includes(fault.status) && (role === 'Admin' || role === 'Manager') && (
                                                <button className="btn btn-secondary btn-sm" onClick={() => setShowAssignModal(fault)}>
                                                    {fault.assigned_to ? 'Reassign' : 'Assign'}
                                                </button>
                                            )}

                                            {/* Start Work Button for Assigned Technician */}
                                            {['Open', 'Pending'].includes(fault.status) && fault.assigned_to === user_id && (
                                                <button className="btn btn-warning btn-sm" onClick={() => handleStatusChange(fault.fault_id, 'In Progress')}>Start Work</button>
                                            )}

                                            {/* Schedule Button */}
                                            {['Open', 'Pending'].includes(fault.status) && !fault.scheduled_for && (role === 'Admin' || role === 'Manager' || fault.assigned_to === user_id) && (
                                                <button className="btn btn-info btn-sm" style={{ background: 'var(--accent-info)', color: 'white' }} onClick={() => setShowScheduleModal(fault)}>Schedule</button>
                                            )}

                                            {/* Mark Fixed Button */}
                                            {fault.status === 'In Progress' && (role === 'Admin' || role === 'Manager' || fault.assigned_to === user_id) && (
                                                <button className="btn btn-success btn-sm" onClick={() => handleStatusChange(fault.fault_id, 'Resolved')}>Mark Fixed</button>
                                            )}

                                            {['Resolved', 'Closed'].includes(fault.status) && (
                                                <span className="text-muted" style={{ fontSize: '0.85rem', fontStyle: 'italic' }}>No actions</span>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {faults.length === 0 && (
                                <tr>
                                    <td colSpan="9" className="text-center text-muted">No faults found</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {showModal && <FaultModal onClose={() => setShowModal(false)} onSave={() => { setShowModal(false); loadFaults(); }} />}
            {showAssignModal && <AssignModal fault={showAssignModal} onClose={() => setShowAssignModal(null)} onSave={() => { setShowAssignModal(null); loadFaults(); }} />}
            {showScheduleModal && <ScheduleModal fault={showScheduleModal} onClose={() => setShowScheduleModal(null)} onSave={() => { setShowScheduleModal(null); loadFaults(); }} />}
            {showCommentsModal && <CommentsModal fault={showCommentsModal} onClose={() => setShowCommentsModal(null)} />}
        </div>
    );
}

function ScheduleModal({ fault, onClose, onSave }) {
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const scheduledFor = `${date} ${time}:00`;
            await fetchAPI(`/faults/${fault.fault_id}/schedule`, {
                method: 'PUT',
                body: JSON.stringify({ scheduled_for: scheduledFor }),
            });
            onSave();
        } catch (error) {
            alert(error.message);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3 className="modal-title">Schedule Fault Repair</h3>
                    <button className="modal-close" onClick={onClose}>&times;</button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <div className="form-group">
                            <label className="form-label">Date *</label>
                            <input type="date" className="form-input" value={date} onChange={(e) => setDate(e.target.value)} required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Time *</label>
                            <input type="time" className="form-input" value={time} onChange={(e) => setTime(e.target.value)} required />
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn btn-primary">Schedule</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// Comments Modal for fault communication
function CommentsModal({ fault, onClose }) {
    const { user_id } = useContext(AuthContext) || {};
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        loadComments();
    }, []);

    const loadComments = async () => {
        try {
            const response = await fetchAPI(`/faults/${fault.fault_id}/comments`);
            setComments(response.data);
        } catch (error) {
            console.error('Failed to load comments:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!newComment.trim()) return;

        setSubmitting(true);
        try {
            await fetchAPI(`/faults/${fault.fault_id}/comments`, {
                method: 'POST',
                body: JSON.stringify({ comment: newComment }),
            });
            setNewComment('');
            loadComments();
        } catch (error) {
            alert(error.message);
        } finally {
            setSubmitting(false);
        }
    };

    const formatDate = (dateStr) => {
        const date = new Date(dateStr);
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 600, maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
                <div className="modal-header">
                    <h3 className="modal-title">💬 Comments - {fault.title}</h3>
                    <button className="modal-close" onClick={onClose}>&times;</button>
                </div>
                <div className="modal-body" style={{ flex: 1, overflowY: 'auto', maxHeight: 400 }}>
                    {loading ? (
                        <div className="text-center text-muted">Loading comments...</div>
                    ) : comments.length === 0 ? (
                        <div className="text-center text-muted" style={{ padding: '2rem' }}>
                            No comments yet. Start the conversation!
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {comments.map((c) => {
                                const isMyMessage = Number(c.user_id) === Number(user_id);
                                return (
                                    <div key={c.comment_id} style={{
                                        background: isMyMessage ? 'rgba(96, 108, 56, 0.15)' : 'rgba(221, 161, 94, 0.15)',
                                        borderRadius: 8,
                                        padding: '0.75rem 1rem',
                                        borderLeft: `4px solid ${isMyMessage ? 'var(--primary)' : '#DDA15E'}`,
                                        marginLeft: isMyMessage ? '1.5rem' : 0,
                                        marginRight: isMyMessage ? 0 : '1.5rem'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                                            <strong style={{ fontSize: '0.9rem' }}>
                                                {isMyMessage ? 'You' : c.user_name}
                                                <span className="badge" style={{
                                                    marginLeft: 8,
                                                    fontSize: '0.7rem',
                                                    background: c.user_role === 'Admin' ? 'var(--primary)' : '#DDA15E',
                                                    color: 'white'
                                                }}>
                                                    {c.user_role}
                                                </span>
                                            </strong>
                                            <span className="text-muted" style={{ fontSize: '0.75rem' }}>{formatDate(c.created_at)}</span>
                                        </div>
                                        <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{c.comment}</p>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
                <form onSubmit={handleSubmit}>
                    <div style={{ borderTop: '1px solid var(--border)', padding: '1rem', display: 'flex', gap: '0.5rem' }}>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="Type your comment..."
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            style={{ flex: 1 }}
                            disabled={submitting}
                        />
                        <button type="submit" className="btn btn-primary" disabled={submitting || !newComment.trim()}>
                            {submitting ? 'Sending...' : 'Send'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function FaultModal({ onClose, onSave }) {
    const [form, setForm] = useState({
        title: '',
        description: '',
        category: 'Connectivity', // Default capitalized
        priority: 'Medium',
        component_id: '',
    });
    const [components, setComponents] = useState([]);

    useEffect(() => {
        fetchAPI('/components').then((res) => setComponents(res.data));
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await fetchAPI('/faults', {
                method: 'POST',
                body: JSON.stringify(form),
            });
            onSave();
        } catch (error) {
            alert(error.message);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3 className="modal-title">Report New Fault</h3>
                    <button className="modal-close" onClick={onClose}>&times;</button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <div className="form-group">
                            <label className="form-label">Title *</label>
                            <input className="form-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Description</label>
                            <textarea className="form-textarea" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Affected Component</label>
                            <select className="form-select" value={form.component_id} onChange={(e) => setForm({ ...form, component_id: e.target.value })}>
                                <option value="">Select component...</option>
                                {components.map((comp) => (
                                    <option key={comp.component_id} value={comp.component_id}>{comp.name} ({comp.type})</option>
                                ))}
                            </select>
                        </div>
                        <div className="grid-2">
                            <div className="form-group">
                                <label className="form-label">Category *</label>
                                <select className="form-select" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                                    <option value="Hardware">Hardware</option>
                                    <option value="Software">Software</option>
                                    <option value="Connectivity">Connectivity</option>
                                    <option value="Power">Power</option>
                                    <option value="Security">Security</option>
                                    <option value="Performance">Performance</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Priority *</label>
                                <select className="form-select" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                                    <option value="Critical">Critical</option>
                                    <option value="High">High</option>
                                    <option value="Medium">Medium</option>
                                    <option value="Low">Low</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn btn-primary">Report Fault</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function AssignModal({ fault, onClose, onSave }) {
    const [technicians, setTechnicians] = useState([]);
    const [selectedTech, setSelectedTech] = useState(fault.assigned_to || '');

    useEffect(() => {
        // Fetch all technicians (status filter removed as it's not in Users table)
        fetchAPI('/technicians').then((res) => setTechnicians(res.data));
    }, []);

    const handleAssign = async () => {
        if (!selectedTech) return;
        try {
            await fetchAPI(`/faults/${fault.fault_id}/assign`, {
                method: 'PUT',
                body: JSON.stringify({ technician_id: selectedTech }),
            });
            onSave();
        } catch (error) {
            alert(error.message);
        }
    };

    const handleUnassign = async () => {
        if (!window.confirm('Are you sure you want to unassign the current technician?')) return;
        try {
            await fetchAPI(`/faults/${fault.fault_id}/assign`, {
                method: 'PUT',
                body: JSON.stringify({ technician_id: null }),
            });
            onSave();
        } catch (error) {
            alert(error.message);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 400 }}>
                <div className="modal-header">
                    <h3 className="modal-title">Assign Technician</h3>
                    <button className="modal-close" onClick={onClose}>&times;</button>
                </div>
                <div className="modal-body">
                    <p className="mb-2">Assign a technician to: <strong>{fault.title}</strong></p>
                    <div className="form-group">
                        <label className="form-label">Select Technician</label>
                        <select className="form-select" value={selectedTech} onChange={(e) => setSelectedTech(e.target.value)}>
                            <option value="">Choose technician...</option>
                            {technicians.map((tech) => (
                                <option key={tech.user_id} value={tech.user_id}>{tech.first_name} {tech.last_name} ({tech.email})</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
                    <div>
                        {fault.assigned_to && (
                            <button type="button" className="btn btn-secondary" style={{ color: '#DC3545', borderColor: '#DC3545', background: 'transparent' }} onClick={handleUnassign}>Unassign</button>
                        )}
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
                        <button className="btn btn-primary" onClick={handleAssign} disabled={!selectedTech || Number(selectedTech) === Number(fault.assigned_to)}>
                            {fault.assigned_to ? 'Reassign' : 'Assign'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Quality Metrics Component
function QualityMetrics() {
    const [kpis, setKpis] = useState(null);
    const [health, setHealth] = useState([]);
    const [loading, setLoading] = useState(true);
    const [timeRange, setTimeRange] = useState('monthly');

    useEffect(() => {
        loadData();
    }, [timeRange]);

    const loadData = async () => {
        try {
            const [kpiRes, healthRes] = await Promise.all([
                fetchAPI(`/metrics/kpi?time_range=${timeRange}`),
                fetchAPI('/metrics/health'),
            ]);
            setKpis(kpiRes.data);
            setHealth(healthRes.data);
        } catch (error) {
            console.error('Failed to load metrics:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const getHealthClass = (score) => {
        if (score >= 90) return 'excellent';
        if (score >= 70) return 'good';
        if (score >= 50) return 'fair';
        return 'poor';
    };

    if (loading) {
        return <div className="loading-container"><div className="spinner"></div></div>;
    }

    return (
        <div>
            <div className="page-header">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h1 className="page-title">Quality Metrics</h1>
                        <p className="page-subtitle">Network performance KPIs and health scores</p>
                    </div>
                    <div className="action-bar" style={{ marginTop: 0 }}>
                        <div className="filter-group">
                            <select
                                className="filter-select"
                                value={timeRange}
                                onChange={(e) => setTimeRange(e.target.value)}
                            >
                                <option value="daily">Daily View</option>
                                <option value="weekly">Weekly View</option>
                                <option value="monthly">Monthly View</option>
                            </select>
                        </div>
                        <button className="btn btn-secondary" onClick={handlePrint}>Print / Save PDF</button>
                    </div>
                </div>
            </div>

            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon primary"><Activity size={24} /></div>
                    <div className="stat-content">
                        <div className="stat-value">{kpis?.availability_percent || 0}%</div>
                        <div className="stat-label">Availability</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon warning"><Clock size={24} /></div>
                    <div className="stat-content">
                        <div className="stat-value">{kpis?.mttr_minutes || 0}m</div>
                        <div className="stat-label">MTTR (Mean Time To Repair)</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon danger"><AlertCircle size={24} /></div>
                    <div className="stat-content">
                        <div className="stat-value">{kpis?.fault_frequency_daily || 0}</div>
                        <div className="stat-label">
                            {timeRange === 'daily' ? 'Total Faults (Today)' : 'Avg Faults / Day'}
                        </div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon success"><CheckCircle size={24} /></div>
                    <div className="stat-content">
                        <div className="stat-value">{kpis?.resolution_rate_percent || 0}%</div>
                        <div className="stat-label">Resolution Rate</div>
                    </div>
                </div>
            </div>

            <div className="card">
                <div className="card-header">
                    <h3 className="card-title">Component Health Scores</h3>
                </div>
                <div className="table-container" style={{ border: 'none' }}>
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Component</th>
                                <th>Type</th>
                                <th>Status</th>
                                <th>Active Faults</th>
                                <th>Avg Resolution</th>
                                <th>Health Score</th>
                            </tr>
                        </thead>
                        <tbody>
                            {health.map((comp) => (
                                <tr key={comp.id}>
                                    <td style={{ fontWeight: 500 }}>{comp.name}</td>
                                    <td><span className="badge badge-info">{comp.type}</span></td>
                                    <td><span className={`badge status-${comp.status}`}>{comp.status}</span></td>
                                    <td>{comp.open_faults || 0}</td>
                                    <td>{comp.avg_resolution_time ? Math.round(comp.avg_resolution_time) + 'm' : '-'}</td>
                                    <td style={{ width: 200 }}>
                                        <div className="d-flex align-center gap-2">
                                            <div className="health-bar flex-1">
                                                <div
                                                    className={`health-bar-fill ${getHealthClass(comp.health_score)}`}
                                                    style={{ width: `${comp.health_score}%` }}
                                                ></div>
                                            </div>
                                            <span style={{ fontWeight: 600, minWidth: 40 }}>{comp.health_score}%</span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

// Incident Reports Component
function IncidentReports() {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [selectedReport, setSelectedReport] = useState(null);
    const [editReport, setEditReport] = useState(null);
    const user = useContext(AuthContext);

    useEffect(() => {
        loadReports();
    }, []);

    const loadReports = async () => {
        try {
            const response = await fetchAPI('/reports');
            setReports(response.data);
        } catch (error) {
            console.error('Failed to load reports:', error);
        } finally {
            setLoading(false);
        }
    };

    const downloadPDF = async (reportId, title) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`http://localhost:3000/api/reports/${reportId}/pdf`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Failed to generate PDF');

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `incident_report_${reportId}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            alert('Failed to download PDF: ' + error.message);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this report?')) return;
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`http://localhost:3000/api/reports/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Failed to delete report');
            loadReports();
        } catch (error) {
            alert(error.message);
        }
    };

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">Incident Reports</h1>
                <p className="page-subtitle">Generate and view incident reports</p>
            </div>

            <div className="action-bar">
                <div></div>
                <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                    + Generate Report
                </button>
            </div>

            {loading ? (
                <div className="loading-container"><div className="spinner"></div></div>
            ) : (
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Title</th>
                                <th>Period</th>
                                <th>Total Faults</th>
                                <th>Impact</th>
                                <th>Avg Resolution</th>
                                <th>Generated</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reports.map((report) => (
                                <tr key={report.report_id}>
                                    <td>#{report.report_id}</td>
                                    <td style={{ fontWeight: 500 }}>{report.title}</td>
                                    <td>{new Date(report.start_time).toLocaleDateString()} - {new Date(report.end_time).toLocaleDateString()}</td>
                                    <td>{report.total_faults}</td>
                                    <td><span className={`badge priority-${report.impact_level}`}>{report.impact_level}</span></td>
                                    <td>{report.avg_resolution_time ? Math.round(report.avg_resolution_time) + 'm' : '-'}</td>
                                    <td>{new Date(report.generated_at).toLocaleDateString()}</td>
                                    <td>
                                        <div className="d-flex gap-1">
                                            <button className="btn btn-secondary btn-sm" onClick={() => setSelectedReport(report)}>View</button>
                                            <button className="btn btn-primary btn-sm" onClick={() => { setEditReport(report); setShowModal(true); }}>Edit</button>
                                            <button className="btn btn-primary btn-sm" onClick={() => downloadPDF(report.report_id, report.title)} title="Download PDF">
                                                📄 PDF
                                            </button>
                                            {user && user.role === 'Admin' && (
                                                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(report.report_id)}>Delete</button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {reports.length === 0 && (
                                <tr>
                                    <td colSpan="8" className="text-center text-muted">No reports found</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {showModal && (
                <GenerateReportModal
                    onClose={() => { setShowModal(false); setEditReport(null); }}
                    onSave={() => { setShowModal(false); setEditReport(null); loadReports(); }}
                    initialData={editReport}
                />
            )}
            {selectedReport && <ReportDetailModal report={selectedReport} onClose={() => setSelectedReport(null)} />}
        </div>
    );
}

function GenerateReportModal({ onClose, onSave, initialData }) {
    const [form, setForm] = useState({
        title: '',
        start_time: '',
        end_time: '',
        impact_level: 'minor',
        total_faults: 0,
        affected_components: 0,
        avg_resolution_time: 0,
        summary: '',
    });
    const [loading, setLoading] = useState(false);
    const [reportType, setReportType] = useState('Custom');
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState('');

    useEffect(() => {
        // Fetch users for filtering
        const loadUsers = async () => {
            try {
                const response = await fetchAPI('/users');
                setUsers(response.data);
            } catch (error) {
                console.error('Failed to load users:', error);
            }
        };
        loadUsers();

        if (initialData) {
            setForm({
                title: initialData.title,
                start_time: new Date(initialData.start_time).toISOString().slice(0, 16),
                end_time: new Date(initialData.end_time).toISOString().slice(0, 16),
                impact_level: initialData.impact_level,
                total_faults: initialData.total_faults || 0,
                affected_components: initialData.affected_components_count || 0,
                avg_resolution_time: Math.round(initialData.avg_resolution_time || 0),
                summary: initialData.summary || '',
            });
            // If editing, we might want to check if it filters by user, but initialData might not have that info easily accessible unless we returned it.
            // For now, simpler to leave user filter empty on edit unless we update backend to return it.
        }
    }, [initialData]);

    const handleReportTypeChange = (type) => {
        setReportType(type);
        const now = new Date();
        const start = new Date(now);

        if (type === 'Daily') {
            start.setHours(0, 0, 0, 0); // Start of today
        } else if (type === 'Weekly') {
            start.setDate(now.getDate() - 7);
        } else if (type === 'Monthly') {
            start.setMonth(now.getMonth() - 1);
        }

        if (type !== 'Custom') {
            setForm(prev => ({
                ...prev,
                start_time: start.toISOString().slice(0, 16),
                end_time: now.toISOString().slice(0, 16),
                title: `${type} Incident Report - ${now.toLocaleDateString()}`
            }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const url = initialData ? `/reports/${initialData.report_id}` : '/reports/generate';
            const method = initialData ? 'PUT' : 'POST';

            const payload = {
                ...form,
                reported_by: selectedUser || undefined // Only send if selected
            };

            await fetchAPI(url, {
                method,
                body: JSON.stringify(payload),
            });
            onSave();
        } catch (error) {
            alert(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3 className="modal-title">{initialData ? 'Edit Incident Report' : 'Generate Incident Report'}</h3>
                    <button className="modal-close" onClick={onClose}>&times;</button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        {!initialData && (
                            <div className="form-group">
                                <label className="form-label">Report Type</label>
                                <div className="grid-4" style={{ gap: '10px' }}>
                                    {['Custom', 'Daily', 'Weekly', 'Monthly'].map(type => (
                                        <button
                                            key={type}
                                            type="button"
                                            className={`btn ${reportType === type ? 'btn-primary' : 'btn-secondary'}`}
                                            onClick={() => handleReportTypeChange(type)}
                                            style={{ width: '100%', fontSize: '0.9rem' }}
                                        >
                                            {type}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="form-group">
                            <label className="form-label">Report Title *</label>
                            <input className="form-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g., Weekly Incident Report" required />
                        </div>

                        {!initialData && (
                            <div className="form-group">
                                <label className="form-label">Filter by Reporter (Optional)</label>
                                <select className="form-select" value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)}>
                                    <option value="">All Users</option>
                                    {users.map(u => (
                                        <option key={u.user_id} value={u.user_id}>{u.username} ({u.first_name} {u.last_name})</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className="grid-2">
                            <div className="form-group">
                                <label className="form-label">Start Date *</label>
                                <input type="datetime-local" className="form-input" value={form.start_time} onChange={(e) => { setForm({ ...form, start_time: e.target.value }); setReportType('Custom'); }} required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">End Date *</label>
                                <input type="datetime-local" className="form-input" value={form.end_time} onChange={(e) => { setForm({ ...form, end_time: e.target.value }); setReportType('Custom'); }} required />
                            </div>
                        </div>

                        <div className="grid-2">
                            <div className="form-group">
                                <label className="form-label">Impact Level *</label>
                                <select className="form-select" value={form.impact_level} onChange={(e) => setForm({ ...form, impact_level: e.target.value })} required>
                                    <option value="minor">Minor</option>
                                    <option value="major">Major</option>
                                    <option value="critical">Critical</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Total Faults (Auto)</label>
                                <input type="number" min="0" className="form-input" value={form.total_faults} onChange={(e) => setForm({ ...form, total_faults: parseInt(e.target.value) || 0 })} disabled={!initialData} />
                            </div>
                        </div>

                        <div className="grid-2">
                            <div className="form-group">
                                <label className="form-label">Components Affected (Auto)</label>
                                <input type="number" min="0" className="form-input" value={form.affected_components} onChange={(e) => setForm({ ...form, affected_components: parseInt(e.target.value) || 0 })} disabled={!initialData} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Avg Resolution (min) (Auto)</label>
                                <input type="number" min="0" className="form-input" value={form.avg_resolution_time} onChange={(e) => setForm({ ...form, avg_resolution_time: parseInt(e.target.value) || 0 })} disabled={!initialData} />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Summary / Notes</label>
                            <textarea className="form-input" rows="3" value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })}></textarea>
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-text" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? 'Processing...' : (initialData ? 'Update Report' : 'Generate Report')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function ReportDetailModal({ report, onClose }) {
    const details = report.details ? (typeof report.details === 'string' ? JSON.parse(report.details) : report.details) : {};

    // Function to download PDF (reused logic or passed down could be better but duplicating for simplicity here as context isn't fully exposed)
    const handleDownload = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`http://localhost:3000/api/reports/${report.report_id}/pdf`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Failed to generate PDF');
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `incident_report_${report.report_id}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            alert('Failed to download PDF: ' + error.message);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 800 }}>
                <div className="modal-header">
                    <h3 className="modal-title">{report.title}</h3>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn btn-secondary btn-sm" onClick={handleDownload} title="Download PDF">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-download"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg> PDF
                        </button>
                        <button className="modal-close" onClick={onClose}>&times;</button>
                    </div>
                </div>
                <div className="modal-body">
                    <div className="stats-grid mb-3">
                        <div className="text-center">
                            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{report.total_faults}</div>
                            <div className="text-muted">Total Faults</div>
                        </div>
                        <div className="text-center">
                            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{report.affected_components_count}</div>
                            <div className="text-muted">Components Affected</div>
                        </div>
                        <div className="text-center">
                            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{Math.round(report.avg_resolution_time || 0)}m</div>
                            <div className="text-muted">Avg Resolution</div>
                        </div>
                    </div>

                    <div className="grid-2 mb-3">
                        <p><strong>Period:</strong> {new Date(report.start_time).toLocaleString()} - {new Date(report.end_time).toLocaleString()}</p>
                        <p><strong>Impact Level:</strong> <span className={`badge priority-${report.impact_level}`}>{report.impact_level}</span></p>
                        {details.filter?.reported_by && details.filter.reported_by !== 'All Users' && (
                            <p><strong>Filtered By User ID:</strong> {details.filter.reported_by}</p>
                        )}
                    </div>

                    <div className="card mb-3" style={{ background: 'var(--bg-tertiary)' }}>
                        <h4 style={{ marginBottom: '0.5rem' }}>Summary</h4>
                        <p>{report.summary}</p>
                    </div>

                    {details.statistics && (
                        <div className="grid-2 mb-3">
                            <div className="card" style={{ background: 'var(--bg-card)' }}>
                                <h5 className="mb-2">By Priority</h5>
                                <ul className="list-unstyled">
                                    {Object.entries(details.statistics.by_priority || {}).map(([k, v]) => (
                                        <li key={k} className="d-flex justify-content-between">
                                            <span style={{ textTransform: 'capitalize' }}>{k}</span>
                                            <span style={{ fontWeight: 600 }}>{v}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="card" style={{ background: 'var(--bg-card)' }}>
                                <h5 className="mb-2">By Status</h5>
                                <ul className="list-unstyled">
                                    {Object.entries(details.statistics.by_status || {}).map(([k, v]) => (
                                        <li key={k} className="d-flex justify-content-between">
                                            <span style={{ textTransform: 'capitalize' }}>{k.replace('_', ' ')}</span>
                                            <span style={{ fontWeight: 600 }}>{v}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    )}

                    {/* Detailed Faults List with Descriptions */}
                    {details.faults && details.faults.length > 0 && (
                        <div>
                            <h4 style={{ marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Fault Details</h4>
                            <div className="report-faults-list" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                {details.faults.map((fault, idx) => (
                                    <div key={idx} style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid #eee' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                                            <strong>{idx + 1}. {fault.title}</strong>
                                            <span className={`badge priority-${fault.priority}`}>{fault.priority}</span>
                                        </div>
                                        <div style={{ fontSize: '0.9rem', color: '#555', marginBottom: '0.25rem' }}>
                                            <span style={{ marginRight: '1rem' }}>📦 {fault.component}</span>
                                            <span style={{ marginRight: '1rem' }}>👤 Reported by: {fault.reporter || 'Unknown'}</span>
                                            <span>📅 {new Date(fault.reported_at).toLocaleDateString()}</span>
                                        </div>
                                        <div style={{ background: '#f9f9f9', padding: '0.5rem', borderRadius: '4px', borderLeft: '3px solid #ccc' }}>
                                            <em style={{ fontSize: '0.9rem' }}>"{fault.description}"</em>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={onClose}>Close</button>
                    <button className="btn btn-primary" onClick={handleDownload}>Download PDF</button>
                </div>
            </div>
        </div>
    );
}

// Technicians Component
function Technicians() {
    const { role, user_id } = useContext(AuthContext) || {};
    const [technicians, setTechnicians] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(null);
    const [editingTech, setEditingTech] = useState(null);
    const [confirmDelete, setConfirmDelete] = useState(null); // For custom confirmation modal

    useEffect(() => {
        loadTechnicians();
    }, []);

    const loadTechnicians = async () => {
        try {
            const response = await fetchAPI('/technicians');
            let data = response.data;
            // Sorting Logic
            if (role === 'Admin') {
                data.sort((a, b) => (a.role === 'Manager' ? -1 : 1));
            } else if (role === 'Manager') {
                data.sort((a, b) => (Number(a.id) === Number(user_id) ? -1 : 1));
            }
            setTechnicians(data);
        } catch (error) {
            console.error('Failed to load technicians:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        try {
            await fetchAPI(`/technicians/${id}`, { method: 'DELETE' });
            setConfirmDelete(null);
            loadTechnicians();
        } catch (error) {
            alert(error.message);
            setConfirmDelete(null);
        }
    };

    const handleStatusChange = async (id, status) => {
        try {
            await fetchAPI(`/technicians/${id}/status`, {
                method: 'PUT',
                body: JSON.stringify({ status }),
            });
            loadTechnicians();
        } catch (error) {
            alert(error.message);
        }
    };

    const handleSave = async (data) => {
        try {
            if (editingTech) {
                await fetchAPI(`/technicians/${editingTech.id}`, {
                    method: 'PUT',
                    body: JSON.stringify(data),
                });
            } else {
                await fetchAPI('/technicians', {
                    method: 'POST',
                    body: JSON.stringify(data),
                });
            }
            setShowModal(false);
            setEditingTech(null);
            loadTechnicians();
        } catch (error) {
            alert(error.message);
        }
    };

    const handleDeactivate = async (id) => {
        if (!window.confirm('Are you sure you want to deactivate this technician? They will no longer appear in the active technicians list.')) return;
        try {
            await fetchAPI(`/technicians/${id}/status`, {
                method: 'PUT',
                body: JSON.stringify({ status: 'Inactive' })
            });
            loadTechnicians();
        } catch (error) {
            alert(error.message);
        }
    };

    const handlePrint = () => { window.print(); };

    const handleExport = () => {
        const csv = [
            ['ID', 'Name', 'Email', 'Role', 'Status', 'Phone', 'Created At'],
            ...technicians.map(t => [
                t.id, t.name, t.email, t.role, t.status, t.phone || '', t.created_at
            ])
        ].map(e => e.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `team_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">Team Management</h1>
                <p className="page-subtitle">Manage technicians and staff members</p>
            </div>

            <div className="action-bar">
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn btn-secondary" onClick={handlePrint}>Print</button>
                    <button className="btn btn-secondary" onClick={handleExport}>Export CSV</button>
                </div>
                {(role === 'Admin' || role === 'Manager') && (
                    <button className="btn btn-primary" onClick={() => { setEditingTech(null); setShowModal(true); }}>
                        + Add Team Member
                    </button>
                )}
            </div>

            {loading ? (
                <div className="loading-container"><div className="spinner"></div></div>
            ) : (
                <>
                    {/* Active Technicians */}
                    <h3 style={{ marginBottom: '1rem', color: 'var(--primary)' }}>👷 Team ({technicians.filter(t => t.status === 'Active' && t.role !== 'Staff').length})</h3>
                    <div className="stats-grid">
                        {technicians.filter(t => t.status === 'Active' && t.role !== 'Staff').map((tech) => (
                            <div key={tech.id} className="card">
                                <div className="d-flex align-center gap-2 mb-2">
                                    <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>
                                        {tech.name[0]}
                                    </div>
                                    <div className="flex-1">
                                        <div style={{ fontWeight: 600 }}>
                                            {tech.name}
                                            {Number(tech.id) === Number(user_id) &&
                                                <span className="badge badge-primary" style={{ fontSize: '0.7em', padding: '2px 6px', marginLeft: '6px' }}>You</span>
                                            }
                                        </div>
                                        <div className="text-muted" style={{ fontSize: '0.875rem' }}>{tech.role}</div>
                                    </div>
                                </div>
                                <div className="text-muted mb-2" style={{ fontSize: '0.875rem' }}>
                                    <div>📧 {tech.email}</div>
                                    {tech.phone && <div>📞 {tech.phone}</div>}
                                    {tech.created_at && (
                                        <div>📅 Joined: {(() => {
                                            const created = new Date(tech.created_at);
                                            const now = new Date();
                                            const diffMs = now - created;
                                            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                                            const diffMonths = Math.floor(diffDays / 30);
                                            const diffYears = Math.floor(diffDays / 365);
                                            if (diffYears >= 1) {
                                                const remainingMonths = Math.floor((diffDays % 365) / 30);
                                                return `${diffYears}y ${remainingMonths}m ago`;
                                            } else if (diffMonths >= 1) {
                                                return `${diffMonths} month${diffMonths > 1 ? 's' : ''} ago`;
                                            } else if (diffDays >= 1) {
                                                return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
                                            } else {
                                                return 'Today';
                                            }
                                        })()}</div>
                                    )}
                                </div>
                                <div className="d-flex align-center justify-between">
                                    <span style={{ fontSize: '0.875rem' }}>
                                        <strong>{tech.active_faults || 0}</strong> active faults
                                    </span>
                                </div>
                                {(role === 'Admin' || role === 'Manager') && (
                                    <div className="d-flex gap-2 mt-3" style={{ flexWrap: 'wrap' }}>
                                        <button className="btn btn-secondary btn-sm" onClick={() => { setEditingTech(tech); setShowModal(true); }}>Edit</button>
                                        <button className="btn btn-warning btn-sm" style={{ background: '#DDA15E', borderColor: '#DDA15E', color: 'white' }} onClick={() => setShowPasswordModal(tech)}>Pass</button>
                                        <button className="btn btn-danger btn-sm" style={{ backgroundColor: '#DC3545', color: 'white' }} onClick={() => handleDeactivate(tech.id)}>Inactivate</button>
                                    </div>
                                )}
                            </div>
                        ))}
                        {technicians.filter(t => t.status === 'Active' && t.role !== 'Staff').length === 0 && (
                            <div className="text-muted">No active team members</div>
                        )}
                    </div>

                    {/* Staff Section */}
                    <h3 style={{ marginTop: '2rem', marginBottom: '1rem', color: '#4299E1' }}>🏢 Staff ({technicians.filter(t => t.status === 'Active' && t.role === 'Staff').length})</h3>
                    <div className="stats-grid">
                        {technicians.filter(t => t.status === 'Active' && t.role === 'Staff').map((tech) => (
                            <div key={tech.id} className="card" style={{ borderLeft: '4px solid #4299E1' }}>
                                <div className="d-flex align-center gap-2 mb-2">
                                    <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(135deg, #4299E1, #3182CE)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', color: 'white' }}>
                                        {tech.name[0]}
                                    </div>
                                    <div className="flex-1">
                                        <div style={{ fontWeight: 600 }}>{tech.name}</div>
                                        <div style={{ fontSize: '0.875rem', color: '#4299E1' }}>Staff</div>
                                    </div>
                                </div>
                                <div className="text-muted mb-2" style={{ fontSize: '0.875rem' }}>
                                    <div>📧 {tech.email}</div>
                                    {tech.phone && <div>📞 {tech.phone}</div>}
                                    {tech.created_at && (
                                        <div>📅 Joined: {(() => {
                                            const created = new Date(tech.created_at);
                                            const now = new Date();
                                            const diffMs = now - created;
                                            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                                            if (diffDays >= 1) {
                                                return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
                                            } else {
                                                return 'Today';
                                            }
                                        })()}</div>
                                    )}
                                </div>
                                {(role === 'Admin' || role === 'Manager') && (
                                    <div className="d-flex gap-2 mt-3" style={{ flexWrap: 'wrap' }}>
                                        <button className="btn btn-secondary btn-sm" onClick={() => { setEditingTech(tech); setShowModal(true); }}>Edit</button>
                                        <button className="btn btn-warning btn-sm" style={{ background: '#DDA15E', borderColor: '#DDA15E', color: 'white' }} onClick={() => setShowPasswordModal(tech)}>Pass</button>
                                        <button className="btn btn-danger btn-sm" style={{ backgroundColor: '#DC3545', color: 'white' }} onClick={() => handleDeactivate(tech.id)}>Inactivate</button>
                                    </div>
                                )}
                            </div>
                        ))}
                        {technicians.filter(t => t.status === 'Active' && t.role === 'Staff').length === 0 && (
                            <div className="text-muted">No staff members</div>
                        )}
                    </div>

                    {/* Inactive Technicians */}
                    {technicians.filter(t => t.status === 'Inactive').length > 0 && (
                        <>
                            <h3 style={{ marginTop: '2rem', marginBottom: '1rem', color: '#888' }}>Inactive Technicians ({technicians.filter(t => t.status === 'Inactive').length})</h3>
                            <div className="stats-grid">
                                {technicians.filter(t => t.status === 'Inactive').map((tech) => (
                                    <div key={tech.id} className="card" style={{ opacity: 0.5, filter: 'grayscale(50%)' }}>
                                        <div className="d-flex align-center gap-2 mb-2">
                                            <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#888', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', color: 'white' }}>
                                                {tech.name[0]}
                                            </div>
                                            <div className="flex-1">
                                                <div style={{ fontWeight: 600 }}>{tech.name}</div>
                                                <div className="text-muted" style={{ fontSize: '0.875rem' }}>{tech.role} <span style={{ color: '#DC3545' }}>(Inactive)</span></div>
                                            </div>
                                        </div>
                                        <div className="text-muted mb-2" style={{ fontSize: '0.875rem' }}>
                                            <div>📧 {tech.email}</div>
                                            {tech.phone && <div>📞 {tech.phone}</div>}
                                        </div>
                                        <div className="d-flex gap-2 mt-3" style={{ flexWrap: 'wrap' }}>
                                            <button className="btn btn-primary btn-sm" onClick={() => handleStatusChange(tech.id, 'Active')}>Reactivate</button>
                                            <button className="btn btn-danger btn-sm" style={{ backgroundColor: '#DC3545', color: 'white' }} onClick={() => setConfirmDelete(tech)}>Delete</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </>
            )}

            {showModal && (
                <TechnicianModal
                    technician={editingTech}
                    onClose={() => { setShowModal(false); setEditingTech(null); }}
                    onSave={handleSave}
                />
            )}

            {showPasswordModal && (
                <PasswordResetModal
                    technician={showPasswordModal}
                    onClose={() => setShowPasswordModal(null)}
                />
            )}

            {/* Custom Confirmation Modal */}
            {confirmDelete && (
                <div className="modal-overlay" onClick={() => setConfirmDelete(null)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 400 }}>
                        <div className="modal-header">
                            <h3 className="modal-title" style={{ color: '#DC3545', display: 'flex', alignItems: 'center' }}>
                                <AlertTriangle size={24} style={{ marginRight: '8px' }} /> Confirm Deletion
                            </h3>
                            <button className="modal-close" onClick={() => setConfirmDelete(null)}>&times;</button>
                        </div>
                        <div className="modal-body">
                            <p style={{ marginBottom: '1rem' }}>
                                Are you sure you want to <strong>permanently delete</strong> <strong>{confirmDelete.name}</strong>?
                            </p>
                            <p style={{ color: '#DC3545', fontSize: '0.875rem' }}>
                                This action cannot be undone. All their data will be permanently removed.
                            </p>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setConfirmDelete(null)}>Cancel</button>
                            <button className="btn btn-danger" style={{ backgroundColor: '#DC3545', color: 'white' }} onClick={() => handleDelete(confirmDelete.id)}>Delete Permanently</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function PasswordResetModal({ technician, onClose }) {
    const [password, setPassword] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!confirm(`Are you sure you want to reset the password for ${technician.name}?`)) return;

        try {
            await fetchAPI(`/technicians/${technician.id}/password`, {
                method: 'PUT',
                body: JSON.stringify({ password }),
            });
            alert('Password updated successfully');
            onClose();
        } catch (error) {
            alert(error.message);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3 className="modal-title">Reset Password</h3>
                    <button className="modal-close" onClick={onClose}>&times;</button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <p style={{ marginBottom: '1rem' }}>Resetting password for <strong>{technician.name}</strong></p>
                        <div className="form-group">
                            <label className="form-label">New Password *</label>
                            <input
                                type="password"
                                className="form-input"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter new password"
                                required
                                minLength={6}
                            />
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn btn-danger">Reset Password</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function TechnicianModal({ technician, onClose, onSave }) {
    const [departments, setDepartments] = useState([]);
    const [form, setForm] = useState({
        username: '',
        password: '',
        role: 'Technician',
        first_name: technician?.name?.split(' ')[0] || '',
        last_name: technician?.name?.split(' ')[1] || '',
        email: technician?.email || '',
        phone_number: technician?.phone || '',
        department_id: technician?.department_id || '',
    });

    useEffect(() => {
        fetchAPI('/departments').then(res => setDepartments(res.data));
    }, []);

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(form);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3 className="modal-title">{technician ? 'Edit Team Member' : 'Add Team Member'}</h3>
                    <button className="modal-close" onClick={onClose}>&times;</button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        {!technician && (
                            <>
                                <div className="form-group">
                                    <label className="form-label">Role *</label>
                                    <select className="form-input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                                        <option value="Technician">Technician (Field Agent)</option>
                                        <option value="Staff">Staff (Office Worker)</option>
                                    </select>
                                </div>
                                {(form.role === 'Technician' || form.role === 'Staff') && (
                                    <div className="form-group">
                                        <label className="form-label">Department</label>
                                        <select className="form-select" value={form.department_id} onChange={(e) => setForm({ ...form, department_id: e.target.value })}>
                                            <option value="">Select Department</option>
                                            {departments.map((dept) => (
                                                <option key={dept.department_id} value={dept.department_id}>{dept.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                                <div className="form-group">
                                    <label className="form-label">Username *</label>
                                    <input className="form-input" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Password *</label>
                                    <input type="password" className="form-input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
                                </div>
                            </>
                        )}
                        <div className="grid-2">
                            <div className="form-group">
                                <label className="form-label">First Name *</label>
                                <input className="form-input" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Last Name *</label>
                                <input className="form-input" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} required />
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Email *</label>
                            <input type="email" className="form-input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Phone</label>
                            <input className="form-input" value={form.phone_number} onChange={(e) => setForm({ ...form, phone_number: e.target.value })} placeholder="+1-555-0100" />
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn btn-primary">Save</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// Protected Route Component
function ProtectedRoute({ children, roles }) {
    const user = useContext(AuthContext);

    if (!user) return <Navigate to="/" replace />;

    if (roles && !roles.includes(user.role)) {
        return <Navigate to="/" replace />;
    }

    return children;
}

// Main App Component
export default function App() {
    const [user, setUser] = useState(() => {
        const saved = localStorage.getItem('user');
        return saved ? JSON.parse(saved) : null;
    });
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const handleLogout = async () => {
        try {
            if (user) await fetchAPI('/auth/logout', { method: 'POST' });
        } catch (err) {
            console.error('Logout log failed:', err);
        }
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
    };

    if (!user) {
        return <Login onLogin={setUser} />;
    }

    return (
        <AuthContext.Provider value={user}>
            <BrowserRouter>
                <div className="app-container">
                    <button className="mobile-menu-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
                        ☰
                    </button>
                    <Sidebar user={user} onLogout={handleLogout} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
                    <main className="main-content">
                        <Routes>
                            <Route path="/" element={<Dashboard />} />
                            <Route path="/infrastructure" element={<Infrastructure />} />
                            <Route path="/faults" element={<FaultReportingWrapper />} />
                            <Route path="/metrics" element={<QualityMetrics />} />
                            <Route path="/reports" element={<IncidentReports />} />
                            <Route path="/maintenance" element={<MaintenanceLogs />} />
                            <Route path="/inventory" element={<Inventory />} />
                            <Route path="/map" element={<NetworkMap />} />
                            {(user?.role === 'Technician' || user?.role === 'Staff') && <Route path="/team" element={<TeamDirectory />} />}
                            <Route path="/technicians" element={<Technicians />} />
                            <Route path="/audit" element={<ProtectedRoute roles={['Admin']}><AuditLogs /></ProtectedRoute>} />
                            <Route path="*" element={<Navigate to="/" replace />} />
                        </Routes>
                    </main>
                </div>
            </BrowserRouter>
        </AuthContext.Provider>
    );
}

function MaintenanceLogs() {
    const { role, user_id } = useContext(AuthContext) || {};
    const [logs, setLogs] = useState([]);
    const [components, setComponents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCommentsModal, setShowCommentsModal] = useState(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editLog, setEditLog] = useState(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [logsRes, compsRes] = await Promise.all([
                fetchAPI('/maintenance'),
                fetchAPI('/components')
            ]);
            setLogs(logsRes.data);
            setComponents(compsRes.data || []);
        } catch (error) {
            console.error('Failed to load data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this log?')) return;
        try {
            await fetchAPI(`/maintenance/${id}`, { method: 'DELETE' });
            loadLogs();
        } catch (error) {
            alert(error.message);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const handleExport = () => {
        const csv = [
            ['ID', 'Date', 'Component', 'Technician', 'Action', 'Result', 'Duration'],
            ...logs.map(log => [
                log.log_id,
                log.activity_date,
                log.component_name,
                log.technician_name,
                log.action_taken,
                log.result,
                log.duration_minutes
            ])
        ].map(e => e.join(',')).join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `maintenance_logs_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    return (
        <div>
            <div className="page-header">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h1 className="page-title">Maintenance Logs</h1>
                        <p className="page-subtitle">History of maintenance activities and repairs</p>
                    </div>
                    <div className="action-bar" style={{ marginTop: 0 }}>
                        <button className="btn btn-secondary" onClick={handlePrint}>Print</button>
                        <button className="btn btn-secondary" onClick={handleExport}>Export CSV</button>
                        {(role === 'Admin' || role === 'Manager' || role === 'Technician') && (
                            <button className="btn btn-primary" onClick={() => { setEditLog(null); setShowAddModal(true); }}>
                                + Add Log
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="loading-container"><div className="spinner"></div></div>
            ) : (
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Date</th>
                                <th>Component</th>
                                <th>Technician</th>
                                <th>Action Taken</th>
                                <th>Result</th>
                                <th>Duration</th>
                                <th>Notes</th>
                                {['Admin', 'Manager', 'Technician'].includes(role) && <th>Actions</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {logs.map((log) => (
                                <tr key={log.log_id}>
                                    <td style={{ fontWeight: 500 }}>{`ML-${log.log_id.toString().padStart(3, '0')}`}</td>
                                    <td>{log.activity_date ? new Date(log.activity_date).toLocaleString('en-US', { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                                    <td>{log.component_name || '-'}</td>
                                    <td>{log.technician_name || '-'}</td>
                                    <td>{log.action_taken || '-'}</td>
                                    <td><span className={`badge status-${(log.result || '').toLowerCase()}`}>{log.result || '-'}</span></td>
                                    <td>{log.duration_minutes ? `${log.duration_minutes}m` : '-'}</td>
                                    <td>
                                        <button className="btn btn-secondary btn-sm" onClick={() => setShowCommentsModal(log)} style={{ position: 'relative' }}>
                                            💬 {log.comment_count > 0 && <span style={{ marginLeft: '4px', fontSize: '0.8rem' }}>{log.comment_count === 1 ? '1 NOTE' : `${log.comment_count} NOTES`}</span>}
                                            {log.comment_count === 0 && 'Add Note'}
                                            {log.comment_count > 0 && (
                                                <span style={{
                                                    position: 'absolute',
                                                    top: -6,
                                                    right: -6,
                                                    background: Number(log.last_comment_user_id) === Number(user_id) ? '#28A745' : '#DC3545',
                                                    color: 'white',
                                                    borderRadius: '50%',
                                                    width: 18,
                                                    height: 18,
                                                    fontSize: '0.7rem',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontWeight: 'bold'
                                                }}>
                                                    {log.comment_count}
                                                </span>
                                            )}
                                        </button>
                                    </td>
                                    {['Admin', 'Manager', 'Technician'].includes(role) && (
                                        <td>
                                            <div className="d-flex gap-1">
                                                <button className="btn btn-secondary btn-sm" onClick={() => { setEditLog(log); setShowAddModal(true); }}>Edit</button>
                                                {role === 'Admin' && (
                                                    <button className="btn btn-danger btn-sm" style={{ backgroundColor: '#DC3545', color: 'white' }} onClick={() => handleDelete(log.log_id)}>Delete</button>
                                                )}
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            ))}
                            {logs.length === 0 && (
                                <tr>
                                    <td colSpan={role === 'Admin' || role === 'Manager' ? 8 : 7} className="text-center text-muted">No maintenance logs found</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {showCommentsModal && (
                <MaintenanceCommentsModal log={showCommentsModal} onClose={() => { setShowCommentsModal(null); loadLogs(); }} />
            )}

            {showAddModal && (
                <AddMaintenanceLogModal
                    onClose={() => { setShowAddModal(false); setEditLog(null); }}
                    onSave={() => { setShowAddModal(false); setEditLog(null); loadLogs(); }}
                    initialData={editLog}
                />
            )}
        </div>
    );
}

function AddMaintenanceLogModal({ onClose, onSave, initialData }) {
    const [form, setForm] = useState({
        component_id: '',
        activity_date: new Date().toISOString().slice(0, 16),
        action_taken: '',
        result: 'Success',
        duration_minutes: 30,
        parts_used: [] // { inventory_id, quantity }
    });
    const [components, setComponents] = useState([]);
    const [inventory, setInventory] = useState([]);
    const [loading, setLoading] = useState(false);
    const [fetchingData, setFetchingData] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            try {
                const [compsRes, invRes] = await Promise.all([
                    fetchAPI('/components'),
                    fetchAPI('/inventory')
                ]);
                setComponents(compsRes.data || []);
                setInventory(invRes.data || []);

                if (initialData) {
                    setForm({
                        component_id: initialData.component_id,
                        activity_date: new Date(initialData.activity_date).toISOString().slice(0, 16),
                        action_taken: initialData.action_taken,
                        result: initialData.result,
                        duration_minutes: initialData.duration_minutes || 0,
                        parts_used: [] // Editing parts used is complex, skipping for now
                    });
                }
            } catch (error) {
                console.error('Failed to load form data:', error);
            } finally {
                setFetchingData(false);
            }
        };
        loadData();
    }, [initialData]);

    const handleAddPart = () => {
        setForm({ ...form, parts_used: [...form.parts_used, { inventory_id: '', quantity: 1 }] });
    };

    const handlePartChange = (index, field, value) => {
        const newParts = [...form.parts_used];
        newParts[index][field] = value;
        setForm({ ...form, parts_used: newParts });
    };

    const handleRemovePart = (index) => {
        const newParts = [...form.parts_used];
        newParts.splice(index, 1);
        setForm({ ...form, parts_used: newParts });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const url = initialData ? `/maintenance/${initialData.log_id}` : '/maintenance';
            const method = initialData ? 'PUT' : 'POST';

            // Validate parts
            const parts = form.parts_used.filter(p => p.inventory_id && p.quantity > 0);

            await fetchAPI(url, {
                method,
                body: JSON.stringify({ ...form, parts_used: parts }),
            });
            onSave();
        } catch (error) {
            alert(error.message);
        } finally {
            setLoading(false);
        }
    };

    if (fetchingData) return <div className="modal-overlay"><div className="spinner"></div></div>;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3 className="modal-title">{initialData ? 'Edit Maintenance Log' : 'Add Maintenance Log'}</h3>
                    <button className="modal-close" onClick={onClose}>&times;</button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <div className="form-group">
                            <label className="form-label">Component *</label>
                            <select
                                className="form-select"
                                value={form.component_id}
                                onChange={e => setForm({ ...form, component_id: e.target.value })}
                                required
                                disabled={!!initialData}
                            >
                                <option value="">-- Select Component --</option>
                                {components.map(c => <option key={c.component_id} value={c.component_id}>{c.name} - {c.location}</option>)}
                            </select>
                        </div>
                        <div className="grid-2">
                            <div className="form-group">
                                <label className="form-label">Date *</label>
                                <input type="datetime-local" className="form-input" value={form.activity_date} onChange={e => setForm({ ...form, activity_date: e.target.value })} required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Duration (mins)</label>
                                <input type="number" className="form-input" value={form.duration_minutes} onChange={e => setForm({ ...form, duration_minutes: e.target.value })} />
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Action Taken *</label>
                            <textarea className="form-textarea" value={form.action_taken} onChange={e => setForm({ ...form, action_taken: e.target.value })} required rows={3} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Result</label>
                            <select className="form-select" value={form.result} onChange={e => setForm({ ...form, result: e.target.value })}>
                                <option value="Success">Success</option>
                                <option value="Pending">Pending</option>
                                <option value="Failed">Failed</option>
                            </select>
                        </div>

                        {!initialData && (
                            <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(0,0,0,0.03)', borderRadius: '8px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                    <label className="form-label" style={{ marginBottom: 0 }}>Parts/Inventory Used</label>
                                    <button type="button" className="btn btn-sm btn-secondary" onClick={handleAddPart}>+ Add Part</button>
                                </div>
                                {form.parts_used.map((part, index) => (
                                    <div key={index} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                                        <select
                                            className="form-select"
                                            style={{ flex: 2 }}
                                            value={part.inventory_id}
                                            onChange={e => handlePartChange(index, 'inventory_id', e.target.value)}
                                            required
                                        >
                                            <option value="">Select Item</option>
                                            {inventory.map(i => <option key={i.item_id} value={i.item_id}>{i.name} (Stock: {i.quantity})</option>)}
                                        </select>
                                        <input
                                            type="number"
                                            className="form-input"
                                            style={{ flex: 1 }}
                                            placeholder="Qty"
                                            value={part.quantity}
                                            onChange={e => handlePartChange(index, 'quantity', Number(e.target.value))}
                                            min="1"
                                            required
                                        />
                                        <button type="button" className="btn btn-danger btn-sm" onClick={() => handleRemovePart(index)}>✕</button>
                                    </div>
                                ))}
                                {form.parts_used.length === 0 && <small className="text-muted">No parts used</small>}
                            </div>
                        )}
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Saving...' : 'Save Log'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// Maintenance Comments Modal
function MaintenanceCommentsModal({ log, onClose }) {
    const { user_id } = useContext(AuthContext) || {};
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        loadComments();
    }, []);

    const loadComments = async () => {
        try {
            const response = await fetchAPI(`/maintenance/${log.log_id}/comments`);
            setComments(response.data);
        } catch (error) {
            console.error('Failed to load comments:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!newComment.trim()) return;

        setSubmitting(true);
        try {
            await fetchAPI(`/maintenance/${log.log_id}/comments`, {
                method: 'POST',
                body: JSON.stringify({ comment: newComment }),
            });
            setNewComment('');
            loadComments();
        } catch (error) {
            alert(error.message);
        } finally {
            setSubmitting(false);
        }
    };

    const formatDate = (dateStr) => {
        const date = new Date(dateStr);
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getRoleBadgeColor = (role) => {
        switch (role) {
            case 'Admin': return 'var(--primary)'; // Green
            case 'Manager': return '#2B6CB0'; // Blue
            case 'Technician': return '#DDA15E'; // Orange/Tan
            case 'Staff': return '#718096'; // Grey
            default: return '#DDA15E';
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 600, maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
                <div className="modal-header">
                    <h3 className="modal-title">📝 Notes - {log.component_name}</h3>
                    <button className="modal-close" onClick={onClose}>&times;</button>
                </div>
                <div style={{ padding: '0.5rem 1rem', borderBottom: '1px solid var(--border)', background: 'rgba(96, 108, 56, 0.1)' }}>
                    <small className="text-muted">Action: {log.action_taken}</small>
                </div>
                <div className="modal-body" style={{ flex: 1, overflowY: 'auto', maxHeight: 350 }}>
                    {loading ? (
                        <div className="text-center text-muted">Loading notes...</div>
                    ) : comments.length === 0 ? (
                        <div className="text-center text-muted" style={{ padding: '2rem' }}>
                            No notes yet. Add notes about supplies needed, issues found, etc.
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {comments.map((c) => {
                                const isMyMessage = Number(c.user_id) === Number(user_id);
                                return (
                                    <div key={c.comment_id} style={{
                                        background: isMyMessage ? 'rgba(96, 108, 56, 0.15)' : 'rgba(221, 161, 94, 0.15)',
                                        borderRadius: 8,
                                        padding: '0.75rem 1rem',
                                        borderLeft: `4px solid ${isMyMessage ? 'var(--primary)' : '#DDA15E'}`,
                                        marginLeft: isMyMessage ? '1.5rem' : 0,
                                        marginRight: isMyMessage ? 0 : '1.5rem'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                                            <strong style={{ fontSize: '0.9rem' }}>
                                                {isMyMessage ? 'You' : c.user_name}
                                                <span className="badge" style={{
                                                    marginLeft: 8,
                                                    fontSize: '0.7rem',
                                                    background: getRoleBadgeColor(c.user_role),
                                                    color: 'white'
                                                }}>
                                                    {c.user_role}
                                                </span>
                                            </strong>
                                            <span className="text-muted" style={{ fontSize: '0.75rem' }}>{formatDate(c.created_at)}</span>
                                        </div>
                                        <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{c.comment}</p>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
                <form onSubmit={handleSubmit}>
                    <div style={{ borderTop: '1px solid var(--border)', padding: '1rem', display: 'flex', gap: '0.5rem' }}>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="Add a note (supplies needed, issues, etc.)"
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            style={{ flex: 1 }}
                            disabled={submitting}
                        />
                        <button type="submit" className="btn btn-primary" disabled={submitting || !newComment.trim()}>
                            {submitting ? 'Sending...' : 'Send'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// Audit Logs Component
function AuditLogs() {
    const { role } = useContext(AuthContext) || {};
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState({ entity_type: '', action: '' });

    useEffect(() => {
        loadLogs();
    }, [filter]);

    const loadLogs = async () => {
        setLoading(true);
        try {
            const queryParams = new URLSearchParams();
            if (filter.entity_type) queryParams.append('entity_type', filter.entity_type);
            if (filter.action) queryParams.append('action', filter.action);

            const response = await fetchAPI(`/audit?${queryParams.toString()}`);
            setLogs(response);
        } catch (error) {
            console.error('Failed to load audit logs:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatDetails = (details) => {
        try {
            const parsed = typeof details === 'string' ? JSON.parse(details) : details;

            if (parsed.title) return `Title: ${parsed.title}`;
            if (parsed.status) return `Status: ${parsed.status}`;

            return JSON.stringify(parsed).substring(0, 50) + (JSON.stringify(parsed).length > 50 ? '...' : '');
        } catch (e) {
            return String(details);
        }
    };

    const handlePrint = () => { window.print(); };

    const handleExport = () => {
        const csv = [
            ['Timestamp', 'User', 'Role', 'Action', 'Entity Type', 'Entity ID', 'Details', 'IP Address'],
            ...logs.map(log => [
                log.created_at,
                log.user_name,
                log.user_email, // Using email as proxy for role/identity detail or we can fetch role if available
                log.action,
                log.entity_type,
                log.entity_id,
                `"${String(log.details).replace(/"/g, '""')}"`, // Escape quotes
                log.ip_address
            ])
        ].map(e => e.join(',')).join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit_logs_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">Audit Trail</h1>
                <p className="page-subtitle">Track system activity</p>
            </div>

            <div className="action-bar">
                <div className="filter-group">
                    <select className="filter-select" value={filter.entity_type} onChange={(e) => setFilter({ ...filter, entity_type: e.target.value })}>
                        <option value="">All Entities</option>
                        <option value="Fault">Faults</option>
                        <option value="Report">Reports</option>
                        <option value="User">Users</option>
                        <option value="Component">Components</option>
                    </select>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn btn-secondary" onClick={handlePrint}>Print</button>
                    <button className="btn btn-secondary" onClick={handleExport}>Export CSV</button>
                    <button className="btn btn-secondary" onClick={loadLogs}>Refresh</button>
                </div>
            </div>

            <div className="card">
                <div className="table-responsive">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Timestamp</th>
                                <th>User</th>
                                <th>Action</th>
                                <th>Entity</th>
                                <th>Details</th>
                                <th>IP</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="6" className="text-center">Loading...</td></tr>
                            ) : logs.length > 0 ? (
                                logs.map(log => (
                                    <tr key={log.log_id}>
                                        <td>{new Date(log.created_at).toLocaleString()}</td>
                                        <td>
                                            <div style={{ fontWeight: 500 }}>{log.user_name}</div>
                                            <div className="text-muted" style={{ fontSize: '0.75rem' }}>{log.user_email}</div>
                                        </td>
                                        <td><span className="badge badge-secondary">{log.action}</span></td>
                                        <td>{log.entity_type} #{log.entity_id}</td>
                                        <td title={typeof log.details === 'string' ? log.details : JSON.stringify(log.details)}>{formatDetails(log.details)}</td>
                                        <td className="text-muted">{log.ip_address}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan="6" className="text-center text-muted">No logs found</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

// Inventory Component
function Inventory() {
    const user = useContext(AuthContext);
    const [items, setItems] = useState([]);
    const [stats, setStats] = useState({ total_items: 0, total_stock: 0, total_value: 0, low_stock_count: 0 });
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editItem, setEditItem] = useState(null);
    const [filter, setFilter] = useState('');

    useEffect(() => {
        loadInventory();
        loadStats();
    }, []);

    const loadInventory = async () => {
        try {
            const response = await fetchAPI('/inventory');
            setItems(response.data);
        } catch (error) {
            console.error('Failed to load inventory:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadStats = async () => {
        try {
            const response = await fetchAPI('/inventory/stats');
            setStats(response.data);
        } catch (error) {
            console.error('Failed to load stats:', error);
        }
    };

    const handleSave = async (form) => {
        try {
            if (editItem) {
                await fetchAPI(`/inventory/${editItem.item_id}`, { method: 'PUT', body: JSON.stringify(form) });
            } else {
                await fetchAPI('/inventory', { method: 'POST', body: JSON.stringify(form) });
            }
            setShowModal(false);
            setEditItem(null);
            loadInventory();
            loadStats();
        } catch (error) {
            alert(error.message);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this item?')) return;
        try {
            await fetchAPI(`/inventory/${id}`, { method: 'DELETE' });
            loadInventory();
            loadStats();
        } catch (error) {
            alert(error.message);
        }
    };

    const categories = ['Routers', 'Switches', 'Cables', 'Fiber Optics', 'Antennas', 'Network Cards', 'Tools'];

    const filteredItems = filter ? items.filter(i => i.category === filter) : items;

    const handlePrint = () => { window.print(); };

    const handleExport = () => {
        const csv = [
            ['Code', 'Item', 'Category', 'Stock', 'Min Level', 'Unit Cost', 'Location'],
            ...filteredItems.map(i => [
                'INV-' + String(i.item_id).padStart(3, '0'),
                i.name, i.category, i.quantity, i.min_level,
                i.unit_cost, i.location
            ])
        ].map(e => e.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `inventory_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">Inventory Management</h1>
                <p className="page-subtitle">Track parts, equipment, and stock levels</p>
            </div>

            <div className="stats-grid" style={{ marginBottom: '2rem' }}>
                <div className="stat-card">
                    <div className="stat-icon primary"><Package size={24} color="white" /></div>
                    <div className="stat-content">
                        <div className="stat-value">{stats.total_items}</div>
                        <div className="stat-label">Total Items</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon success"><BarChart2 size={24} color="white" /></div>
                    <div className="stat-content">
                        <div className="stat-value">{stats.total_stock}</div>
                        <div className="stat-label">Total Stock</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon danger"><AlertTriangle size={24} color="white" /></div>
                    <div className="stat-content">
                        <div className="stat-value">{stats.low_stock_count}</div>
                        <div className="stat-label">Low Stock Items</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon warning"><Coins size={24} color="white" /></div>
                    <div className="stat-content">
                        <div className="stat-value">Ksh {stats.total_value.toLocaleString()}</div>
                        <div className="stat-label">Total Value</div>
                    </div>
                </div>
            </div>

            <div className="action-bar">
                <div className="filter-group">
                    <span style={{ marginRight: '0.5rem' }}>Stock by Category:</span>
                    <button className={`btn btn-sm ${!filter ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter('')}>All</button>
                    {categories.map(cat => (
                        <button key={cat} className={`btn btn-sm ${filter === cat ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter(cat)}>{cat}</button>
                    ))}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn btn-secondary" onClick={handlePrint}>Print</button>
                    <button className="btn btn-secondary" onClick={handleExport}>Export CSV</button>
                    {user?.role === 'Admin' && (
                        <button className="btn btn-primary" onClick={() => { setEditItem(null); setShowModal(true); }}>+ Add Item</button>
                    )}
                </div>
            </div>

            {loading ? (
                <div className="loading-container"><div className="spinner"></div></div>
            ) : (
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Code</th>
                                <th>Item</th>
                                <th>Type</th>
                                <th>Stock</th>
                                <th>Min Level</th>
                                <th>Unit Cost</th>
                                <th>Location</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredItems.map(item => (
                                <tr key={item.item_id} style={item.low_stock ? { background: 'rgba(237, 137, 54, 0.1)' } : {}}>
                                    <td>INV-{String(item.item_id).padStart(3, '0')}</td>
                                    <td style={{ fontWeight: 500 }}>{item.name}</td>
                                    <td><span className="badge">{item.category}</span></td>
                                    <td style={{ color: item.low_stock ? '#ED8936' : 'inherit', fontWeight: item.low_stock ? 'bold' : 'normal' }}>{item.quantity}</td>
                                    <td>{item.min_level}</td>
                                    <td>Ksh {parseFloat(item.unit_cost).toLocaleString()}</td>
                                    <td>{item.location || '-'}</td>
                                    <td>
                                        <div className="d-flex gap-1">
                                            <button className="btn btn-secondary btn-sm" onClick={() => { setEditItem(item); setShowModal(true); }}>Edit</button>
                                            {user?.role === 'Admin' && (
                                                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(item.item_id)}>Delete</button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredItems.length === 0 && (
                                <tr><td colSpan="8" className="text-center text-muted">No items found</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {showModal && (
                <InventoryModal
                    item={editItem}
                    categories={categories}
                    onClose={() => { setShowModal(false); setEditItem(null); }}
                    onSave={handleSave}
                />
            )}
        </div>
    );
}

function InventoryModal({ item, categories, onClose, onSave }) {
    const [form, setForm] = useState({
        name: item?.name || '',
        category: item?.category || 'Spare Parts',
        quantity: item?.quantity || 0,
        min_level: item?.min_level || 5,
        unit_cost: item?.unit_cost || 0,
        location: item?.location || ''
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(form);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3 className="modal-title">{item ? 'Edit Item' : 'Add Inventory Item'}</h3>
                    <button className="modal-close" onClick={onClose}>&times;</button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <div className="form-group">
                            <label className="form-label">Item Name *</label>
                            <input className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                        </div>
                        <div className="grid-2">
                            <div className="form-group">
                                <label className="form-label">Category *</label>
                                <select className="form-input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Quantity</label>
                                <input type="number" min="0" className="form-input" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: parseInt(e.target.value) || 0 })} />
                            </div>
                        </div>
                        <div className="grid-2">
                            <div className="form-group">
                                <label className="form-label">Min Stock Level</label>
                                <input type="number" min="0" className="form-input" value={form.min_level} onChange={(e) => setForm({ ...form, min_level: parseInt(e.target.value) || 0 })} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Unit Cost (Ksh)</label>
                                <input type="number" min="0" step="0.01" className="form-input" value={form.unit_cost} onChange={(e) => setForm({ ...form, unit_cost: parseFloat(e.target.value) || 0 })} />
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Warehouse Location</label>
                            <input className="form-input" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="e.g., Warehouse A, Shelf 3" />
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn btn-primary">{item ? 'Update' : 'Add Item'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// Network Map Component - Enhanced with stat cards
function NetworkMap() {
    const { role, user_id } = useContext(AuthContext) || {};
    const [components, setComponents] = useState([]);
    const [faults, setFaults] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all'); // all, faults, maintenance, active

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [compRes, faultRes] = await Promise.all([
                fetchAPI('/components'),
                fetchAPI('/faults')
            ]);
            setComponents(compRes.data.filter(c => c.latitude && c.longitude && !isNaN(parseFloat(c.latitude)) && !isNaN(parseFloat(c.longitude))));
            setFaults(faultRes.data || []);
        } catch (error) {
            console.error('Failed to load data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Filter faults based on role (Technician sees only their assigned faults)
    const relevantFaults = role === 'Technician'
        ? faults.filter(f => Number(f.assigned_to) === Number(user_id))
        : faults;

    const getMarkerColor = (component) => {
        // Check if this component has faults (assigned to me if technician)
        const hasFault = relevantFaults.some(f => f.component_id === component.component_id && (f.status === 'Open' || f.status === 'In Progress'));
        if (hasFault) return '#E53E3E'; // Red for faults
        if (component.status === 'Maintenance') return '#805AD5'; // Purple for Maintenance (Distinct from Red)
        if (component.status === 'Active') return '#48BB78'; // Green
        return '#A0AEC0'; // Gray
    };

    const filteredComponents = components.filter(c => {
        const hasFault = relevantFaults.some(f => f.component_id === c.component_id && (f.status === 'Open' || f.status === 'In Progress'));

        if (filter === 'all') return true;
        if (filter === 'faults') return hasFault;
        if (filter === 'maintenance') return c.status === 'Maintenance' && !hasFault; // Only pure maintenance
        if (filter === 'active') return c.status === 'Active' && !hasFault; // Only pure active (Healthy)
        return true;
    });

    // Stats
    const activeFaultsCount = relevantFaults.filter(f => f.status === 'Open' || f.status === 'In Progress').length;
    // Maintenance count: If technician, implies "Under Maintenance" (global state), 
    // but user asked "only indicate issues related to him".
    // Since 'Maintenance' is a component status, for now we keep it global unless we fetch logs. 
    // However, if we strictly follow "only issues related to him", we might hide generic maintenance? 
    // Let's assume Maintenance status is visible to all, but Faults are strictly filtered.
    const maintenanceCount = components.filter(c => c.status === 'Maintenance').length;

    // Corrected Active Count: Must exclude those with Faults (that are being shown as faults)
    const activeHealthyCount = components.filter(c =>
        c.status === 'Active' &&
        !relevantFaults.some(f => f.component_id === c.component_id && (f.status === 'Open' || f.status === 'In Progress'))
    ).length;

    const mappedComponents = components.length;

    if (loading) {
        return <div className="loading-container"><div className="spinner"></div></div>;
    }

    return (
        <div>
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
                <div>
                    <h1 className="page-title">Device Map</h1>
                    <p className="page-subtitle">Interactive fault and maintenance locations</p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className={`btn btn-sm ${filter === 'faults' ? '' : 'btn-secondary'}`} style={{ background: filter === 'faults' ? '#E53E3E' : undefined }} onClick={() => setFilter(filter === 'faults' ? 'all' : 'faults')}>
                        <AlertTriangle size={14} style={{ marginRight: 4 }} /> Faults ({activeFaultsCount})
                    </button>
                    <button className={`btn btn-sm ${filter === 'maintenance' ? '' : 'btn-secondary'}`} style={{ background: filter === 'maintenance' ? '#805AD5' : undefined }} onClick={() => setFilter(filter === 'maintenance' ? 'all' : 'maintenance')}>
                        <Wrench size={14} style={{ marginRight: 4 }} /> Maintenance ({maintenanceCount})
                    </button>
                    <button className={`btn btn-sm ${filter === 'active' ? '' : 'btn-secondary'}`} style={{ background: filter === 'active' ? '#48BB78' : undefined }} onClick={() => setFilter(filter === 'active' ? 'all' : 'active')}>
                        <CheckCircle size={14} style={{ marginRight: 4 }} /> Active ({activeHealthyCount})
                    </button>
                </div>
            </div>

            {/* Stat Cards */}
            <div className="stats-grid" style={{ marginBottom: '1rem' }}>
                <div className="stat-card">
                    <div className="stat-icon danger"><AlertTriangle size={24} color="white" /></div>
                    <div className="stat-content">
                        <div className="stat-value">{activeFaultsCount}</div>
                        <div className="stat-label">Active Faults</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon warning" style={{ background: 'rgba(128, 90, 213, 0.1)', color: '#805AD5' }}><Wrench size={24} color="#805AD5" /></div>
                    <div className="stat-content">
                        <div className="stat-value">{maintenanceCount}</div>
                        <div className="stat-label">Under Maintenance</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon primary"><MapPin size={24} color="white" /></div>
                    <div className="stat-content">
                        <div className="stat-value">{mappedComponents}</div>
                        <div className="stat-label">Mapped Components</div>
                    </div>
                </div>
                {/* Regions stat card removed due to undefined variable */}
            </div>

            {/* Map */}
            <div className="card" style={{ padding: 0, overflow: 'hidden', height: '60vh' }}>
                {filteredComponents.length === 0 ? (
                    <div style={{ padding: '2rem', textAlign: 'center' }}>
                        <p className="text-muted">No components match the current filter.</p>
                        <button className="btn btn-secondary" onClick={() => setFilter('all')}>Show All</button>
                    </div>
                ) : (
                    <MapContainer
                        center={[-1.2821, 36.8219]}
                        zoom={12}
                        style={{ height: '100%', width: '100%' }}
                    >
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        {filteredComponents.map(c => {
                            const markerColor = getMarkerColor(c);
                            const icon = L.divIcon({
                                className: 'custom-marker',
                                html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="${markerColor}" stroke="none">
                                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                                </svg>`,
                                iconSize: [24, 24],
                                iconAnchor: [12, 24],
                                popupAnchor: [0, -24]
                            });

                            return (
                                <Marker key={c.component_id} position={[parseFloat(c.latitude), parseFloat(c.longitude)]} icon={icon}>
                                    <Popup>
                                        <div style={{ minWidth: '180px' }}>
                                            <strong style={{ fontSize: '1.1em' }}>{c.name}</strong>
                                            <div style={{ marginTop: '0.5rem', fontSize: '0.9em' }}>
                                                <div><Server size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} /> Type: <b>{c.type}</b></div>
                                                <div style={{ color: getMarkerColor(c), fontWeight: 'bold' }}>
                                                    ● Status: {c.status}
                                                </div>
                                                <div><MapPin size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} /> {c.location}</div>
                                                {faults.filter(f => f.component_id === c.component_id && f.status !== 'Closed').length > 0 && (
                                                    <div style={{ marginTop: '0.5rem', padding: '0.5rem', background: 'rgba(229, 62, 62, 0.1)', borderRadius: '4px', color: '#E53E3E' }}>
                                                        <AlertTriangle size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} /> {faults.filter(f => f.component_id === c.component_id && f.status !== 'Closed').length} Active Fault(s)

                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </Popup>
                                </Marker>
                            );
                        })}
                    </MapContainer>
                )}
            </div>
        </div>
    );
}




function TeamDirectory() {
    const { role } = useContext(AuthContext) || {};
    const [staff, setStaff] = useState([]);
    const [technicians, setTechnicians] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadTeam();
    }, []);

    const loadTeam = async () => {
        try {
            // Staff see only Staff. Technicians see Technicians AND Staff.
            const promises = [fetchAPI('/users?role=Staff')];

            if (role === 'Technician') {
                promises.push(fetchAPI('/users?role=Technician'));
            }

            const results = await Promise.all(promises);
            setStaff(results[0].data);

            if (role === 'Technician' && results[1]) {
                setTechnicians(results[1].data);
            }
        } catch (error) {
            console.error('Failed to load team:', error);
        } finally {
            setLoading(false);
        }
    };

    const UserTable = ({ users, title }) => (
        <div className="card mb-4">
            <div className="card-header">
                <h3 className="card-title">{title}</h3>
            </div>
            <div className="table-container">
                <table className="table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Department</th>
                            <th>Email</th>
                            <th>Phone</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map((user) => (
                            <tr key={user.user_id}>
                                <td style={{ fontWeight: 500 }}>{user.first_name} {user.last_name}</td>
                                <td><span className="badge badge-info">{user.department_name || 'Unassigned'}</span></td>
                                <td>{user.email || '-'}</td>
                                <td>{user.phone_number || '-'}</td>
                                <td><span className={`badge status-${(user.status || 'Active').toLowerCase()}`}>{user.status}</span></td>
                            </tr>
                        ))}
                        {users.length === 0 && (
                            <tr>
                                <td colSpan="5" className="text-center text-muted">No members found</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">Team Directory</h1>
                <p className="page-subtitle">Contact information for team members</p>
            </div>

            {loading ? (
                <div className="loading-container"><div className="spinner"></div></div>
            ) : (
                <div>
                    {role === 'Technician' && <UserTable users={technicians} title="Technicians" />}
                    <UserTable users={staff} title="Staff Members" />
                </div>
            )}
        </div>
    );
}
