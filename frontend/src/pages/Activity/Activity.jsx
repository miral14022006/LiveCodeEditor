import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import { Zap, FolderDot, Activity as ActivityIcon, Settings as SettingsIcon, LogOut, Code, Users } from 'lucide-react';
import toast from 'react-hot-toast';

const Activity = () => {
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
                    <button className="sidebar-nav-item active">
                        <span className="nav-icon"><ActivityIcon size={18} /></span>
                        Activity
                    </button>
                    <button className="sidebar-nav-item" onClick={() => navigate('/settings')}>
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
                    <h1>My Activity</h1>
                </header>

                <div className="dashboard-content">
                    <div className="section-label">
                        <ActivityIcon size={16} style={{ marginRight: '6px' }} /> Recent Events
                    </div>

                    <div style={{ maxWidth: '800px', marginTop: '20px' }}>
                        <div style={{ padding: '24px', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <div style={{ padding: '12px', background: 'rgba(108, 92, 231, 0.1)', borderRadius: '50%', color: 'var(--accent-primary)' }}>
                                <Code size={24} />
                            </div>
                            <div>
                                <h3 style={{ fontSize: '15px', marginBottom: '4px' }}>Created "My VS Code Project"</h3>
                                <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>You created a new javascript project</p>
                            </div>
                            <span style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--text-muted)' }}>2 hours ago</span>
                        </div>

                        <div style={{ padding: '24px', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <div style={{ padding: '12px', background: 'rgba(0, 184, 148, 0.1)', borderRadius: '50%', color: 'var(--success)' }}>
                                <Users size={24} />
                            </div>
                            <div>
                                <h3 style={{ fontSize: '15px', marginBottom: '4px' }}>Invited Collab User</h3>
                                <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>You added a new participant to your workspace</p>
                            </div>
                            <span style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--text-muted)' }}>1 hour ago</span>
                        </div>
                        
                        <div style={{ padding: '24px', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <div style={{ padding: '12px', background: 'rgba(116, 185, 255, 0.1)', borderRadius: '50%', color: '#74b9ff' }}>
                                <ActivityIcon size={24} />
                            </div>
                            <div>
                                <h3 style={{ fontSize: '15px', marginBottom: '4px' }}>Account Registered</h3>
                                <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>You successfully joined CodeSync</p>
                            </div>
                            <span style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--text-muted)' }}>1 day ago</span>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Activity;
