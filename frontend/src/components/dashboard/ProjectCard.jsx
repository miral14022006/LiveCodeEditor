import React from 'react';
import { Trash2, Users, Calendar, FileCode, FolderGit2, Share2 } from 'lucide-react';

const ProjectCard = ({ project, handleDeleteProject, handleShareProject, languageIcons, formatDate, navigate }) => {
    return (
        <div
            className="project-card glass-panel-card"
            onClick={() => navigate(`/workspace/${project._id}`)}
        >
            <div className="project-card-header">
                <div className="project-card-icon" style={{ background: 'rgba(0, 122, 204, 0.1)', color: 'var(--accent-primary)' }}>
                    {languageIcons[project.language] ? (
                        <span style={{ fontSize: '20px' }}>{languageIcons[project.language]}</span>
                    ) : (
                        <FileCode size={20} />
                    )}
                </div>
                <div className="project-card-actions" onClick={(e) => e.stopPropagation()} style={{ display: 'flex', gap: '4px' }}>
                    <button
                        className="btn btn-ghost btn-sm"
                        onClick={(e) => handleShareProject(project, e)}
                        title="Share project"
                        style={{ color: 'var(--accent-primary)', fontSize: '14px', padding: '4px 8px' }}
                    >
                        <Share2 size={16} />
                    </button>
                    <button
                        className="btn btn-ghost btn-sm btn-delete-project"
                        onClick={(e) => handleDeleteProject(project._id, e)}
                        title="Delete project"
                        style={{ color: 'var(--error)', fontSize: '14px', padding: '4px 8px' }}
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>

            <h3 className="project-card-title">
                <FolderGit2 size={16} style={{ display: 'inline', marginRight: '6px', opacity: 0.7 }} />
                {project.title}
            </h3>
            <p className="project-card-desc">{project.description || 'No description provided'}</p>

            <div className="project-card-footer">
                <div className="project-card-lang">
                    <span className="lang-dot" style={{ background: 'var(--accent-primary)', width: '6px', height: '6px', borderRadius: '50%', display: 'inline-block' }}></span>
                    {project.language || 'javascript'}
                </div>
                <div className="project-meta-info" style={{ display: 'flex', gap: '12px', color: 'var(--text-muted)' }}>
                    <div className="project-card-collab" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Users size={14} /> {(project.collaborators?.length || 0) + 1}
                    </div>
                    <div className="project-card-date" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Calendar size={14} /> {formatDate(project.updatedAt)}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProjectCard;
