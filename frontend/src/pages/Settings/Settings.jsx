import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import { Zap, FolderDot, Activity as ActivityIcon, Settings as SettingsIcon, LogOut, Bell, Shield, Palette } from 'lucide-react';
import toast from 'react-hot-toast';

const Settings = () => {
    const navigate = useNavigate();
    const { user, logout } = useAuthStore();

    useEffect(() => {
        if (!user) navigate('/login');
    }, [user, navigate]);

    const handleLogout = () => {
        logout();
        toast.success('Logged out');
        navigate('/login');
    };

    const getInitials = (name) => {
        if (!name) return '?';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    if (!user) return null;

    return (
        <div className="dashboard-page">
            {/* ========== SIDEBAR ========== */}
            <aside className="dashboard-sidebar">
                <div className="sidebar-logo">
                    <div className="sidebar-logo-icon">
                        <Zap size={20} color="white" />
                    </div>
                    <h2>CodeSync</h2>
                </div>

                <nav className="sidebar-nav">
                    <button className="sidebar-nav-item" onClick={() => navigate('/dashboard')}>
                        <span className="nav-icon"><FolderDot size={18} /></span>
                        Projects
                    </button>
                    <button className="sidebar-nav-item" onClick={() => navigate('/activity')}>
                        <span className="nav-icon"><ActivityIcon size={18} /></span>
                        Activity
                    </button>
                    <button className="sidebar-nav-item active">
                        <span className="nav-icon"><SettingsIcon size={18} /></span>
                        Settings
                    </button>
                </nav>

                <div className="sidebar-user">
                    <div className="sidebar-user-avatar">
                        {getInitials(user.name)}
                    </div>
                    <div className="sidebar-user-info">
                        <div className="name">{user.name}</div>
                        <div className="email">{user.email}</div>
                    </div>
                    <button
                        className="btn btn-ghost btn-icon"
                        onClick={handleLogout}
                        title="Logout"
                    >
                        <LogOut size={18} />
                    </button>
                </div>
            </aside>

            {/* ========== MAIN CONTENT ========== */}
            <main className="dashboard-main">
                <header className="dashboard-header">
                    <h1>Settings</h1>
                    <button className="btn btn-primary" onClick={() => toast.success('Settings Saved!')}>Save Changes</button>
                </header>

                <div className="dashboard-content">
                    <div style={{ maxWidth: '800px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        
                        {/* Profile Section */}
                        <div style={{ padding: '24px', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                            <h2 style={{ fontSize: '18px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <SettingsIcon size={18} /> Profile Configuration
                            </h2>
                            <div className="vsc-input-group" style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Display Name</label>
                                <input type="text" className="vsc-input" defaultValue={user.name} style={{ width: '100%', maxWidth: '400px', background: 'var(--bg-lighter)' }} />
                            </div>
                            <div className="vsc-input-group" style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Username</label>
                                <input type="text" className="vsc-input" defaultValue={user.username} style={{ width: '100%', maxWidth: '400px', background: 'var(--bg-lighter)' }} readOnly />
                            </div>
                            <div className="vsc-input-group">
                                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Email Address</label>
                                <input type="email" className="vsc-input" defaultValue={user.email} style={{ width: '100%', maxWidth: '400px', background: 'var(--bg-lighter)' }} readOnly />
                            </div>
                        </div>

                        {/* Editor Layouts */}
                        <div style={{ padding: '24px', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                            <h2 style={{ fontSize: '18px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Palette size={18} /> Editor Preferences
                            </h2>
                            <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                    <input type="radio" name="theme" defaultChecked /> Dark Theme (VS Code)
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', opacity: 0.5 }}>
                                    <input type="radio" name="theme" disabled /> Light Theme (Coming Soon)
                                </label>
                            </div>
                            <div className="vsc-input-group">
                                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Font Size in Editor</label>
                                <select className="vsc-input" style={{ width: '100%', maxWidth: '200px', background: 'var(--bg-lighter)' }} defaultValue="13">
                                    <option value="12">12px</option>
                                    <option value="13">13px (Default)</option>
                                    <option value="14">14px</option>
                                    <option value="16">16px</option>
                                </select>
                            </div>
                        </div>

                        {/* Notifications */}
                        <div style={{ padding: '24px', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                            <h2 style={{ fontSize: '18px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Bell size={18} /> Notifications
                            </h2>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                                    <input type="checkbox" defaultChecked /> Email me when someone joins my live share project
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                                    <input type="checkbox" defaultChecked /> Desktop notifications for unread team chat messages
                                </label>
                            </div>
                        </div>

                    </div>
                </div>
            </main>
        </div>
    );
};

export default Settings;
