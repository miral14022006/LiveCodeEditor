import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { Plus, Zap, FolderDot, Activity as ActivityIcon, Settings as SettingsIcon, LogOut, Search as SearchIcon, Users, User, Share2 } from 'lucide-react';

const Dashboard = () => {
    const navigate = useNavigate();
    const { user, logout } = useAuthStore();

    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [createForm, setCreateForm] = useState({ name: '', description: '', language: 'javascript' });
    const [isCreating, setIsCreating] = useState(false);

    // ========== Protect Route ==========
    useEffect(() => {
        if (!user) {
            navigate('/login');
        }
    }, [user, navigate]);

    // ========== Fetch Projects ==========
    useEffect(() => {
        fetchProjects();
    }, []);

    const fetchProjects = async () => {
        try {
            setLoading(true);
            const res = await api.get('/projects');
            setProjects(res.data.data || []);
        } catch (err) {
            toast.error('Failed to fetch projects');
        } finally {
            setLoading(false);
        }
    };

    // ========== Create Project ==========
    const handleCreateProject = async (e) => {
        e.preventDefault();
        if (!createForm.name.trim()) {
            toast.error('Project name is required');
            return;
        }

        try {
            setIsCreating(true);
            const res = await api.post('/projects', {
                name: createForm.name,
                description: createForm.description,
                language: createForm.language,
            });
            const newProject = res.data.data;
            setProjects(prev => [newProject, ...prev]);
            setShowCreateModal(false);
            setCreateForm({ name: '', description: '', language: 'javascript' });
            toast.success('Project created!');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to create project');
        } finally {
            setIsCreating(false);
        }
    };

    // ========== Delete Project ==========
    const handleDeleteProject = async (projectId, e) => {
        e.stopPropagation();
        if (!confirm('Are you sure you want to delete this project?')) return;

        try {
            await api.delete(`/projects/${projectId}`);
            setProjects(prev => prev.filter(p => p._id !== projectId));
            toast.success('Project deleted');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to delete project');
        }
    };

    // ========== Logout ==========
    const handleLogout = () => {
        logout();
        toast.success('Logged out');
        navigate('/login');
    };

    // ========== Filter Projects ==========
    const filteredProjects = projects.filter(p =>
        p.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // ========== Stats ==========
    const ownedProjects = projects.filter(p => p.owner?._id === user?._id || p.owner === user?._id);
    const sharedProjects = projects.filter(p => p.owner?._id !== user?._id && p.owner !== user?._id);

    const getInitials = (name) => {
        if (!name) return '?';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    const formatDate = (date) => {
        if (!date) return '';
        return new Date(date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    };

    const languageIcons = {
        javascript: '🟨',
        python: '🐍',
        html: '🌐',
        css: '🎨',
        typescript: '🔷',
        java: '☕',
        cpp: '⚙️',
        c: '⚙️',
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
                    <button className="sidebar-nav-item active">
                        <span className="nav-icon"><FolderDot size={18} /></span>
                        Projects
                    </button>
                    <button className="sidebar-nav-item" onClick={() => navigate('/activity')}>
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
                    <h1>My Projects</h1>
                    <div className="dashboard-header-actions">
                        <div className="search-wrapper">
                            <input
                                type="text"
                                className="search-input"
                                placeholder="Search projects..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <button
                            className="btn btn-primary"
                            onClick={() => setShowCreateModal(true)}
                        >
                            <Plus size={18} /> New Project
                        </button>
                    </div>
                </header>

                <div className="dashboard-content">
                    {/* Stats */}
                    <div className="dashboard-stats">
                        <div className="stat-card">
                            <div className="stat-icon purple"><FolderDot size={20} /></div>
                            <div className="stat-info">
                                <div className="stat-value">{projects.length}</div>
                                <div className="stat-label">Total Projects</div>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon green"><User size={20} /></div>
                            <div className="stat-info">
                                <div className="stat-value">{ownedProjects.length}</div>
                                <div className="stat-label">Owned by you</div>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon blue"><Share2 size={20} /></div>
                            <div className="stat-info">
                                <div className="stat-value">{sharedProjects.length}</div>
                                <div className="stat-label">Shared with you</div>
                            </div>
                        </div>
                    </div>

                    {/* Section Label */}
                    <div className="section-label">
                        📂 All Projects ({filteredProjects.length})
                    </div>

                    {/* Projects Grid */}
                    {loading ? (
                        <div className="page-loader" style={{ height: '300px' }}>
                            <div className="spinner"></div>
                        </div>
                    ) : (
                        <div className="projects-grid">
                            {/* Create New Card */}
                            <div
                                className="create-project-card"
                                onClick={() => setShowCreateModal(true)}
                            >
                                <div className="plus-icon"><Plus size={28} /></div>
                                <span>Create New Project</span>
                            </div>

                            {/* Project Cards */}
                            {filteredProjects.map((project) => (
                                <div
                                    key={project._id}
                                    className="project-card"
                                    onClick={() => navigate(`/workspace/${project._id}`)}
                                >
                                    <div className="project-card-header">
                                        <div className="project-card-icon">
                                            {languageIcons[project.language] || '📄'}
                                        </div>
                                        <div className="project-card-actions">
                                            <button
                                                className="btn btn-ghost btn-sm"
                                                onClick={(e) => handleDeleteProject(project._id, e)}
                                                title="Delete project"
                                                style={{ color: 'var(--error)', fontSize: '14px', padding: '4px 8px' }}
                                            >
                                                🗑
                                            </button>
                                        </div>
                                    </div>

                                    <h3>{project.title}</h3>
                                    <p>{project.description || 'No description'}</p>

                                    <div className="project-card-footer">
                                        <div className="project-card-lang">
                                            {project.language || 'javascript'}
                                        </div>
                                        <div className="project-card-collab">
                                            👥 {(project.collaborators?.length || 0) + 1}
                                        </div>
                                        <div>{formatDate(project.updatedAt)}</div>
                                    </div>
                                </div>
                            ))}

                            {/* Empty state when no projects match search */}
                            {filteredProjects.length === 0 && !loading && (
                                <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
                                    <div className="empty-state-icon">🔍</div>
                                    <h3>No projects found</h3>
                                    <p>
                                        {searchQuery
                                            ? 'Try a different search term'
                                            : 'Create your first project to get started!'}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>

            {/* ========== CREATE PROJECT MODAL ========== */}
            {showCreateModal && (
                <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Create New Project</h2>
                            <button className="modal-close" onClick={() => setShowCreateModal(false)}>
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleCreateProject}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label htmlFor="project-name">Project Name</label>
                                    <input
                                        id="project-name"
                                        type="text"
                                        className="form-input"
                                        placeholder="My Awesome Project"
                                        value={createForm.name}
                                        onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                                        autoFocus
                                    />
                                </div>

                                <div className="form-group">
                                    <label htmlFor="project-description">Description (optional)</label>
                                    <input
                                        id="project-description"
                                        type="text"
                                        className="form-input"
                                        placeholder="What's this project about?"
                                        value={createForm.description}
                                        onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                                    />
                                </div>

                                <div className="form-group">
                                    <label htmlFor="project-language">Language</label>
                                    <select
                                        id="project-language"
                                        className="form-input"
                                        value={createForm.language}
                                        onChange={(e) => setCreateForm({ ...createForm, language: e.target.value })}
                                    >
                                        <option value="javascript">JavaScript</option>
                                        <option value="python">Python</option>
                                        <option value="html">HTML</option>
                                        <option value="css">CSS</option>
                                        <option value="typescript">TypeScript</option>
                                        <option value="java">Java</option>
                                        <option value="cpp">C++</option>
                                        <option value="c">C</option>
                                    </select>
                                </div>

                                <div className="modal-actions">
                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        onClick={() => setShowCreateModal(false)}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn btn-primary"
                                        disabled={isCreating}
                                    >
                                        {isCreating ? (
                                            <>
                                                <span className="spinner"></span>
                                                Creating...
                                            </>
                                        ) : (
                                            'Create Project'
                                        )}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
