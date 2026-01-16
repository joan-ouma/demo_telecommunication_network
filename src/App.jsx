import React, { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';

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
                    <h1 className="login-title">TelecomNet Manager</h1>
                    <p className="login-subtitle">Network Management System</p>
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

                <p className="text-center text-muted mt-3" style={{ fontSize: '0.875rem' }}>
                    Demo: admin / admin123
                </p>
            </div>
        </div>
    );
}

// Sidebar Component
function Sidebar({ user, onLogout, isOpen, onClose }) {
    const location = useLocation();

    const navItems = [
        { path: '/', icon: '📊', label: 'Dashboard' },
        { path: '/infrastructure', icon: '🖥️', label: 'Infrastructure' },
        { path: '/faults', icon: '⚠️', label: 'Fault Reporting' },
        { path: '/metrics', icon: '📈', label: 'Quality Metrics' },
        { path: '/reports', icon: '📋', label: 'Incident Reports' },
        { path: '/technicians', icon: '👷', label: 'Technicians' },
    ];

    return (
        <>
            <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
                <div className="sidebar-header">
                    <div className="sidebar-logo">📡</div>
                    <div>
                        <div className="sidebar-title">TelecomNet</div>
                        <div className="sidebar-subtitle">Network Manager</div>
                    </div>
                </div>

                <nav>
                    <ul className="nav-menu">
                        {navItems.map((item) => (
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
                        <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {user?.username?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <div>
                            <div style={{ fontWeight: 500 }}>{user?.username}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{user?.role}</div>
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
                    <div className="stat-icon success">✓</div>
                    <div className="stat-content">
                        <div className="stat-value">{metrics?.uptime_percentage || 0}%</div>
                        <div className="stat-label">Network Uptime</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon primary">🖥️</div>
                    <div className="stat-content">
                        <div className="stat-value">{metrics?.components?.active || 0}</div>
                        <div className="stat-label">Active Components</div>
                        <div className="stat-trend">{metrics?.components?.total || 0} total</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon danger">⚠️</div>
                    <div className="stat-content">
                        <div className="stat-value">{metrics?.faults?.open_faults || 0}</div>
                        <div className="stat-label">Open Faults</div>
                        <div className="stat-trend down">{metrics?.faults?.critical_open || 0} critical</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon warning">⏱️</div>
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
                            <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--accent-success)' }}>{metrics?.technicians?.available || 0}</div>
                            <div className="text-muted">Available</div>
                        </div>
                        <div style={{ textAlign: 'center', padding: 'var(--space-md)' }}>
                            <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--accent-warning)' }}>{metrics?.technicians?.busy || 0}</div>
                            <div className="text-muted">Busy</div>
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
        </div>
    );
}

// Infrastructure Component
function Infrastructure() {
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
                await fetchAPI(`/components/${editingComponent.id}`, {
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

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">Infrastructure</h1>
                <p className="page-subtitle">Manage network components and configurations</p>
            </div>

            <div className="action-bar">
                <div className="filter-group">
                    <select className="filter-select" value={filter.type} onChange={(e) => setFilter({ ...filter, type: e.target.value })}>
                        <option value="">All Types</option>
                        <option value="router">Routers</option>
                        <option value="switch">Switches</option>
                        <option value="cable">Cables</option>
                        <option value="server">Servers</option>
                        <option value="firewall">Firewalls</option>
                        <option value="access_point">Access Points</option>
                    </select>
                    <select className="filter-select" value={filter.status} onChange={(e) => setFilter({ ...filter, status: e.target.value })}>
                        <option value="">All Statuses</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="maintenance">Maintenance</option>
                        <option value="faulty">Faulty</option>
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
                                <th>Model</th>
                                <th>IP Address</th>
                                <th>Location</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {components.map((comp) => (
                                <tr key={comp.id}>
                                    <td style={{ fontWeight: 500 }}>{comp.name}</td>
                                    <td><span className="badge badge-info">{comp.type}</span></td>
                                    <td>{comp.model || '-'}</td>
                                    <td><code style={{ fontSize: '0.8rem' }}>{comp.ip_address || '-'}</code></td>
                                    <td>{comp.location || '-'}</td>
                                    <td><span className={`badge status-${comp.status}`}>{comp.status}</span></td>
                                    <td>
                                        <div className="d-flex gap-1">
                                            <button className="btn btn-secondary btn-sm" onClick={() => { setEditingComponent(comp); setShowModal(true); }}>Edit</button>
                                            <button className="btn btn-danger btn-sm" onClick={() => handleDelete(comp.id)}>Delete</button>
                                        </div>
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
    const [form, setForm] = useState({
        name: component?.name || '',
        type: component?.type || 'router',
        model: component?.model || '',
        manufacturer: component?.manufacturer || '',
        serial_number: component?.serial_number || '',
        ip_address: component?.ip_address || '',
        location: component?.location || '',
        status: component?.status || 'active',
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(form);
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
                                    <option value="router">Router</option>
                                    <option value="switch">Switch</option>
                                    <option value="cable">Cable</option>
                                    <option value="server">Server</option>
                                    <option value="firewall">Firewall</option>
                                    <option value="access_point">Access Point</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Status</label>
                                <select className="form-select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                    <option value="maintenance">Maintenance</option>
                                    <option value="faulty">Faulty</option>
                                </select>
                            </div>
                        </div>
                        <div className="grid-2">
                            <div className="form-group">
                                <label className="form-label">Model</label>
                                <input className="form-input" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Manufacturer</label>
                                <input className="form-input" value={form.manufacturer} onChange={(e) => setForm({ ...form, manufacturer: e.target.value })} />
                            </div>
                        </div>
                        <div className="grid-2">
                            <div className="form-group">
                                <label className="form-label">Serial Number</label>
                                <input className="form-input" value={form.serial_number} onChange={(e) => setForm({ ...form, serial_number: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">IP Address</label>
                                <input className="form-input" value={form.ip_address} onChange={(e) => setForm({ ...form, ip_address: e.target.value })} placeholder="192.168.1.1" />
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Location</label>
                            <input className="form-input" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Data Center A - Rack 1" />
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

// Fault Reporting Component
function FaultReporting() {
    const [faults, setFaults] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState({ status: '', priority: '' });
    const [showModal, setShowModal] = useState(false);
    const [showAssignModal, setShowAssignModal] = useState(null);

    useEffect(() => {
        loadFaults();
    }, [filter]);

    const loadFaults = async () => {
        try {
            const params = new URLSearchParams();
            if (filter.status) params.append('status', filter.status);
            if (filter.priority) params.append('priority', filter.priority);

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

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">Fault Reporting</h1>
                <p className="page-subtitle">Log and track network faults</p>
            </div>

            <div className="action-bar">
                <div className="filter-group">
                    <select className="filter-select" value={filter.status} onChange={(e) => setFilter({ ...filter, status: e.target.value })}>
                        <option value="">All Statuses</option>
                        <option value="open">Open</option>
                        <option value="in_progress">In Progress</option>
                        <option value="resolved">Resolved</option>
                        <option value="closed">Closed</option>
                    </select>
                    <select className="filter-select" value={filter.priority} onChange={(e) => setFilter({ ...filter, priority: e.target.value })}>
                        <option value="">All Priorities</option>
                        <option value="critical">Critical</option>
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                    </select>
                </div>
                <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                    + Report Fault
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
                                <th>Component</th>
                                <th>Priority</th>
                                <th>Status</th>
                                <th>Assigned To</th>
                                <th>Reported</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {faults.map((fault) => (
                                <tr key={fault.id}>
                                    <td>#{fault.id}</td>
                                    <td style={{ fontWeight: 500 }}>{fault.title}</td>
                                    <td>{fault.component_name || '-'}</td>
                                    <td><span className={`badge priority-${fault.priority}`}>{fault.priority}</span></td>
                                    <td><span className={`badge status-${fault.status}`}>{fault.status.replace('_', ' ')}</span></td>
                                    <td>{fault.technician_name || <span className="text-muted">Unassigned</span>}</td>
                                    <td>{new Date(fault.reported_at).toLocaleDateString()}</td>
                                    <td>
                                        <div className="d-flex gap-1">
                                            {!fault.assigned_technician_id && fault.status === 'open' && (
                                                <button className="btn btn-secondary btn-sm" onClick={() => setShowAssignModal(fault)}>Assign</button>
                                            )}
                                            {fault.status === 'open' && (
                                                <button className="btn btn-warning btn-sm" onClick={() => handleStatusChange(fault.id, 'in_progress')}>Start</button>
                                            )}
                                            {fault.status === 'in_progress' && (
                                                <button className="btn btn-success btn-sm" onClick={() => handleStatusChange(fault.id, 'resolved')}>Resolve</button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {faults.length === 0 && (
                                <tr>
                                    <td colSpan="8" className="text-center text-muted">No faults found</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {showModal && <FaultModal onClose={() => setShowModal(false)} onSave={() => { setShowModal(false); loadFaults(); }} />}
            {showAssignModal && <AssignModal fault={showAssignModal} onClose={() => setShowAssignModal(null)} onSave={() => { setShowAssignModal(null); loadFaults(); }} />}
        </div>
    );
}

function FaultModal({ onClose, onSave }) {
    const [form, setForm] = useState({
        title: '',
        description: '',
        category: 'connectivity',
        priority: 'medium',
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
                                    <option key={comp.id} value={comp.id}>{comp.name} ({comp.type})</option>
                                ))}
                            </select>
                        </div>
                        <div className="grid-2">
                            <div className="form-group">
                                <label className="form-label">Category *</label>
                                <select className="form-select" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                                    <option value="hardware">Hardware</option>
                                    <option value="software">Software</option>
                                    <option value="connectivity">Connectivity</option>
                                    <option value="power">Power</option>
                                    <option value="security">Security</option>
                                    <option value="performance">Performance</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Priority *</label>
                                <select className="form-select" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                                    <option value="critical">Critical</option>
                                    <option value="high">High</option>
                                    <option value="medium">Medium</option>
                                    <option value="low">Low</option>
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
    const [selectedTech, setSelectedTech] = useState('');

    useEffect(() => {
        fetchAPI('/technicians?status=available').then((res) => setTechnicians(res.data));
    }, []);

    const handleAssign = async () => {
        if (!selectedTech) return;
        try {
            await fetchAPI(`/faults/${fault.id}/assign`, {
                method: 'PUT',
                body: JSON.stringify({ technician_id: selectedTech }),
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
                                <option key={tech.id} value={tech.id}>{tech.name} - {tech.specialization}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
                    <button className="btn btn-primary" onClick={handleAssign} disabled={!selectedTech}>Assign</button>
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

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [kpiRes, healthRes] = await Promise.all([
                fetchAPI('/metrics/kpi'),
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
                <h1 className="page-title">Quality Metrics</h1>
                <p className="page-subtitle">Network performance KPIs and health scores</p>
            </div>

            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon primary">📈</div>
                    <div className="stat-content">
                        <div className="stat-value">{kpis?.availability_percent || 0}%</div>
                        <div className="stat-label">Availability</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon warning">⏱️</div>
                    <div className="stat-content">
                        <div className="stat-value">{kpis?.mttr_minutes || 0}m</div>
                        <div className="stat-label">MTTR (Mean Time To Repair)</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon danger">🔄</div>
                    <div className="stat-content">
                        <div className="stat-value">{kpis?.fault_frequency_daily || 0}</div>
                        <div className="stat-label">Daily Fault Frequency</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon success">✓</div>
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
                                <th>Open Faults</th>
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
                                <tr key={report.id}>
                                    <td>#{report.id}</td>
                                    <td style={{ fontWeight: 500 }}>{report.title}</td>
                                    <td>{new Date(report.start_time).toLocaleDateString()} - {new Date(report.end_time).toLocaleDateString()}</td>
                                    <td>{report.total_faults}</td>
                                    <td><span className={`badge priority-${report.impact_level}`}>{report.impact_level}</span></td>
                                    <td>{report.avg_resolution_time ? Math.round(report.avg_resolution_time) + 'm' : '-'}</td>
                                    <td>{new Date(report.generated_at).toLocaleDateString()}</td>
                                    <td>
                                        <button className="btn btn-secondary btn-sm" onClick={() => setSelectedReport(report)}>View</button>
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

            {showModal && <GenerateReportModal onClose={() => setShowModal(false)} onSave={() => { setShowModal(false); loadReports(); }} />}
            {selectedReport && <ReportDetailModal report={selectedReport} onClose={() => setSelectedReport(null)} />}
        </div>
    );
}

function GenerateReportModal({ onClose, onSave }) {
    const [form, setForm] = useState({
        title: '',
        start_time: '',
        end_time: '',
        summary: '',
    });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await fetchAPI('/reports/generate', {
                method: 'POST',
                body: JSON.stringify(form),
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
                    <h3 className="modal-title">Generate Incident Report</h3>
                    <button className="modal-close" onClick={onClose}>&times;</button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <div className="form-group">
                            <label className="form-label">Report Title *</label>
                            <input className="form-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g., Weekly Incident Report" required />
                        </div>
                        <div className="grid-2">
                            <div className="form-group">
                                <label className="form-label">Start Date *</label>
                                <input type="datetime-local" className="form-input" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">End Date *</label>
                                <input type="datetime-local" className="form-input" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} required />
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Summary (Optional)</label>
                            <textarea className="form-textarea" value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} placeholder="Optional summary notes..." />
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? 'Generating...' : 'Generate Report'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function ReportDetailModal({ report, onClose }) {
    const details = report.details ? JSON.parse(report.details) : {};

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 700 }}>
                <div className="modal-header">
                    <h3 className="modal-title">{report.title}</h3>
                    <button className="modal-close" onClick={onClose}>&times;</button>
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

                    <p className="mb-2"><strong>Period:</strong> {new Date(report.start_time).toLocaleString()} - {new Date(report.end_time).toLocaleString()}</p>
                    <p className="mb-2"><strong>Impact Level:</strong> <span className={`badge priority-${report.impact_level}`}>{report.impact_level}</span></p>
                    <p className="mb-3">{report.summary}</p>

                    {details.statistics && (
                        <div className="card" style={{ background: 'var(--bg-tertiary)' }}>
                            <h4 style={{ marginBottom: 'var(--space-md)' }}>Statistics</h4>
                            <div className="grid-2">
                                <div>
                                    <strong>By Priority:</strong>
                                    <ul style={{ listStyle: 'none', marginTop: 'var(--space-sm)' }}>
                                        {Object.entries(details.statistics.by_priority || {}).map(([k, v]) => (
                                            <li key={k}>{k}: {v}</li>
                                        ))}
                                    </ul>
                                </div>
                                <div>
                                    <strong>By Status:</strong>
                                    <ul style={{ listStyle: 'none', marginTop: 'var(--space-sm)' }}>
                                        {Object.entries(details.statistics.by_status || {}).map(([k, v]) => (
                                            <li key={k}>{k.replace('_', ' ')}: {v}</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={onClose}>Close</button>
                </div>
            </div>
        </div>
    );
}

// Technicians Component
function Technicians() {
    const [technicians, setTechnicians] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingTech, setEditingTech] = useState(null);

    useEffect(() => {
        loadTechnicians();
    }, []);

    const loadTechnicians = async () => {
        try {
            const response = await fetchAPI('/technicians');
            setTechnicians(response.data);
        } catch (error) {
            console.error('Failed to load technicians:', error);
        } finally {
            setLoading(false);
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

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">Technicians</h1>
                <p className="page-subtitle">Manage field technicians and assignments</p>
            </div>

            <div className="action-bar">
                <div></div>
                <button className="btn btn-primary" onClick={() => { setEditingTech(null); setShowModal(true); }}>
                    + Add Technician
                </button>
            </div>

            {loading ? (
                <div className="loading-container"><div className="spinner"></div></div>
            ) : (
                <div className="stats-grid">
                    {technicians.map((tech) => (
                        <div key={tech.id} className="card">
                            <div className="d-flex align-center gap-2 mb-2">
                                <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>
                                    {tech.name[0]}
                                </div>
                                <div className="flex-1">
                                    <div style={{ fontWeight: 600 }}>{tech.name}</div>
                                    <div className="text-muted" style={{ fontSize: '0.875rem' }}>{tech.specialization || 'General'}</div>
                                </div>
                                <span className={`badge status-${tech.status}`}>{tech.status}</span>
                            </div>
                            <div className="text-muted mb-2" style={{ fontSize: '0.875rem' }}>
                                <div>📧 {tech.email}</div>
                                {tech.phone && <div>📞 {tech.phone}</div>}
                            </div>
                            <div className="d-flex align-center justify-between">
                                <span style={{ fontSize: '0.875rem' }}>
                                    <strong>{tech.active_faults || 0}</strong> active faults
                                </span>
                                <div className="d-flex gap-1">
                                    {tech.status !== 'available' && (
                                        <button className="btn btn-success btn-sm" onClick={() => handleStatusChange(tech.id, 'available')}>Set Available</button>
                                    )}
                                    {tech.status !== 'offline' && (
                                        <button className="btn btn-secondary btn-sm" onClick={() => handleStatusChange(tech.id, 'offline')}>Set Offline</button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showModal && (
                <TechnicianModal
                    technician={editingTech}
                    onClose={() => { setShowModal(false); setEditingTech(null); }}
                    onSave={handleSave}
                />
            )}
        </div>
    );
}

function TechnicianModal({ technician, onClose, onSave }) {
    const [form, setForm] = useState({
        name: technician?.name || '',
        email: technician?.email || '',
        phone: technician?.phone || '',
        specialization: technician?.specialization || '',
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(form);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3 className="modal-title">{technician ? 'Edit Technician' : 'Add Technician'}</h3>
                    <button className="modal-close" onClick={onClose}>&times;</button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <div className="form-group">
                            <label className="form-label">Name *</label>
                            <input className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Email *</label>
                            <input type="email" className="form-input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Phone</label>
                            <input className="form-input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+1-555-0100" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Specialization</label>
                            <input className="form-input" value={form.specialization} onChange={(e) => setForm({ ...form, specialization: e.target.value })} placeholder="e.g., Network Infrastructure" />
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

// Main App Component
export default function App() {
    const [user, setUser] = useState(() => {
        const saved = localStorage.getItem('user');
        return saved ? JSON.parse(saved) : null;
    });
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const handleLogout = () => {
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
                            <Route path="/faults" element={<FaultReporting />} />
                            <Route path="/metrics" element={<QualityMetrics />} />
                            <Route path="/reports" element={<IncidentReports />} />
                            <Route path="/technicians" element={<Technicians />} />
                            <Route path="*" element={<Navigate to="/" replace />} />
                        </Routes>
                    </main>
                </div>
            </BrowserRouter>
        </AuthContext.Provider>
    );
}
