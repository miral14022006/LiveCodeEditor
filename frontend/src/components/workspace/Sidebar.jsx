import { FileText, Folder, Loader, Play, Users, Plus, X, Search } from 'lucide-react';
import VoicePanel from './VoicePanel';

const Sidebar = ({
    sidebarWidth,
    activeSidebarTab,
    isResizingSidebar,
    setIsResizingSidebar,
    project,
    files,
    showCreateFile, setShowCreateFile,
    showCreateFolder, setShowCreateFolder,
    newFileName, setNewFileName, handleCreateFile,
    newFolderName, setNewFolderName, handleCreateFolder,
    setCreateInFolder,
    buildTree, renderTreeItem,
    isRunning, handleRunCode,
    navigate,
    voiceCall, getInitials,
    isOwner, handleAddCollaborator, collabEmail, setCollabEmail, addingCollab, handleRemoveCollaborator
}) => {
    return (
        <>
            <div
                className={`resizer-x ${isResizingSidebar ? 'resizing' : ''}`}
                onMouseDown={() => setIsResizingSidebar(true)}
            ></div>

            <aside className="workspace-sidebar glass-panel" style={{ width: `${sidebarWidth}px` }}>
                {activeSidebarTab === 'explorer' && (
                    <>
                        <div className="workspace-sidebar-header">
                            <h3>EXPLORER</h3>
                            <div className="sidebar-actions">
                                <button onClick={() => { setCreateInFolder(null); setShowCreateFile(!showCreateFile); }} title="New File">
                                    <FileText size={16} />
                                </button>
                                <button onClick={() => { setCreateInFolder(null); setShowCreateFolder(!showCreateFolder); }} title="New Folder">
                                    <Folder size={16} />
                                </button>
                            </div>
                        </div>

                        {/* Create File Input */}
                        {showCreateFile && (
                            <form onSubmit={handleCreateFile} style={{ padding: '4px 10px' }}>
                                <div className="vsc-input-group">
                                    <input
                                        type="text"
                                        className="vsc-input"
                                        placeholder="filename.js"
                                        value={newFileName}
                                        onChange={(e) => setNewFileName(e.target.value)}
                                        autoFocus
                                        onBlur={() => { if (!newFileName.trim()) setShowCreateFile(false); }}
                                    />
                                </div>
                            </form>
                        )}

                        {/* Create Folder Input */}
                        {showCreateFolder && (
                            <form onSubmit={handleCreateFolder} style={{ padding: '4px 10px' }}>
                                <div className="vsc-input-group">
                                    <input
                                        type="text"
                                        className="vsc-input"
                                        placeholder="folder-name"
                                        value={newFolderName}
                                        onChange={(e) => setNewFolderName(e.target.value)}
                                        autoFocus
                                        onBlur={() => { if (!newFolderName.trim()) setShowCreateFolder(false); }}
                                    />
                                </div>
                            </form>
                        )}

                        {/* File Tree */}
                        <div className="file-tree">
                            <div className="file-tree-root">
                                <span className="tree-root-label">
                                    {project?.title?.toUpperCase() || 'PROJECT'}
                                </span>
                            </div>
                            {buildTree().map(item => renderTreeItem(item))}
                            {files.length === 0 && (
                                <div className="file-tree-empty">
                                    <p>No files yet</p>
                                    <button className="vsc-btn vsc-btn-primary" onClick={() => setShowCreateFile(true)} style={{ width: '100%', marginTop: '8px' }}>
                                        Create a file
                                    </button>
                                </div>
                            )}
                        </div>
                    </>
                )}

                {activeSidebarTab === 'search' && (
                    <div style={{ padding: '20px' }}>
                        <h3 className="sidebar-section-title">SEARCH</h3>
                        <div style={{ marginTop: '20px' }}>
                            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '20px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                                    <Search size={18} color="var(--accent-primary)" />
                                    <span style={{ fontWeight: '700', fontSize: '15px', color: '#ccc' }}>Global Search</span>
                                </div>
                                <div className="vsc-input-group" style={{ marginBottom: '16px' }}>
                                    <input type="text" className="vsc-input" placeholder="Search files, content..." style={{ height: '38px', borderRadius: '6px' }} />
                                </div>
                                <button className="vsc-btn vsc-btn-primary btn-full-width" style={{ width: '100%', height: '42px', borderRadius: '8px', fontWeight: 'bold' }}>
                                    Find All
                                </button>
                            </div>
                            <div style={{ marginTop: '24px', opacity: 0.5, textAlign: 'center' }}>
                                <Search size={40} style={{ marginBottom: '12px' }} />
                                <p style={{ fontSize: '12px' }}>Search functionality is currently indexing your project files.</p>
                            </div>
                        </div>
                    </div>
                )}

                                {activeSidebarTab === 'call' && (
                    <div style={{ padding: '16px 12px' }}>
                        <h3 className="sidebar-section-title" style={{ fontSize: '11px', color: '#ccc', marginBottom: '12px' }}>VOICE CALL</h3>
                        <VoicePanel
                            isInCall={voiceCall.isInCall}
                            isMuted={voiceCall.isMuted}
                            callParticipants={voiceCall.callParticipants}
                            incomingCall={voiceCall.incomingCall}
                            callActive={voiceCall.callActive}
                            startCall={voiceCall.startCall}
                            acceptCall={voiceCall.acceptCall}
                            rejectCall={voiceCall.rejectCall}
                            leaveCall={voiceCall.leaveCall}
                            toggleMute={voiceCall.toggleMute}
                            getInitials={getInitials}
                        />
                    </div>
                )}

                {activeSidebarTab === 'collab' && (
                    <div style={{ padding: '16px 12px' }}>
                        <h3 className="sidebar-section-title">COLLABORATORS</h3>
                        
                        {isOwner && (
                            <div style={{ marginBottom: '20px' }}>
                                <p className="sidebar-desc" style={{ marginBottom: '8px' }}>Invite others by email</p>
                                <form className="vsc-input-group" onSubmit={handleAddCollaborator}>
                                    <input
                                        type="email"
                                        className="vsc-input"
                                        placeholder="email@example.com"
                                        value={collabEmail}
                                        onChange={(e) => setCollabEmail(e.target.value)}
                                    />
                                    <button type="submit" className="vsc-btn vsc-btn-primary" disabled={addingCollab} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        {addingCollab ? <Loader size={14} className="spin" /> : <Plus size={16} />}
                                    </button>
                                </form>
                            </div>
                        )}

                        <div className="participants-list" style={{ marginTop: '10px' }}>
                            <div className="participant-item" style={{ paddingLeft: '0', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                                <div className="participant-avatar" style={{ background: 'var(--accent-primary)', color: '#000', width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 'bold' }}>
                                    {getInitials(project?.owner?.name)}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span className="participant-name" style={{ fontSize: '13px', color: '#fff' }}>{project?.owner?.name}</span>
                                    <span style={{ fontSize: '10px', color: 'var(--accent-primary)', textTransform: 'uppercase' }}>Owner</span>
                                </div>
                            </div>

                            {project?.collaborators?.map((collab) => (
                                <div key={collab.user?._id || collab._id} className="participant-item" style={{ paddingLeft: '0', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                                    <div className="participant-avatar" style={{ background: 'var(--accent-secondary)', color: '#000', width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 'bold' }}>
                                        {getInitials(collab.user?.name)}
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                                        <span className="participant-name" style={{ fontSize: '13px', color: '#fff' }}>{collab.user?.name}</span>
                                        <span style={{ fontSize: '10px', color: 'var(--accent-secondary)', textTransform: 'uppercase' }}>{collab.role || 'Editor'}</span>
                                    </div>
                                    {isOwner && (
                                        <button
                                            onClick={() => handleRemoveCollaborator(collab.user?._id)}
                                            style={{ background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer', padding: '4px' }}
                                            title="Remove collaborator"
                                        >
                                            <X size={14} />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeSidebarTab === 'run' && (
                    <div style={{ padding: '20px' }}>
                        <h3 className="sidebar-section-title">RUN AND DEBUG</h3>
                        <div style={{ marginTop: '20px' }}>
                            <div style={{ background: 'rgba(0, 243, 255, 0.04)', border: '1px solid rgba(0, 243, 255, 0.15)', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', color: 'var(--accent-primary)' }}>
                                    <Play size={18} fill="currentColor" />
                                    <span style={{ fontWeight: '700', fontSize: '15px', letterSpacing: '0.5px' }}>Code Execution</span>
                                </div>
                                <p className="sidebar-desc" style={{ marginBottom: '20px', fontSize: '12px', lineHeight: '1.5', color: '#a0a0b8' }}> 
                                    Runs the active file in a secure sandbox. Use the Terminal input for interactive programs.
                                </p>
                                <button
                                    className="vsc-btn vsc-btn-primary btn-full-width vsc-btn-lg"
                                    onClick={handleRunCode}
                                    disabled={isRunning}
                                    style={{ width: '100%', height: '48px', gap: '12px', borderRadius: '10px' }}
                                >
                                    {isRunning ? <><Loader size={20} className="spin" /> Running...</> : <><Play size={20} fill="currentColor" /> Start Execution</>}
                                </button>
                            </div>

                            <div className="sidebar-hints">
                                <h4 style={{ fontSize: '11px', color: '#666', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>Runtimes</h4>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '20px' }}>
                                    {['JS', 'Py', 'Cpp', 'Java', 'TS', 'C'].map(tag => (
                                        <span key={tag} style={{ background: '#1a1a2e', border: '1px solid #333', padding: '3px 10px', borderRadius: '6px', fontSize: '10px', color: '#999', fontWeight: 'bold' }}>{tag}</span>
                                    ))}
                                </div>
                                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px', fontSize: '11px', color: '#777', lineHeight: '1.6' }}>
                                    <p>• Output appears in Console tab.</p>
                                    <p>• Stdin supports C++ (cin), Python (input), etc.</p>
                                    <p>• Max memory: 256MB.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                

                <button className="workspace-back-btn" onClick={() => navigate('/dashboard')}>
                    ⟵ Back to Dashboard
                </button>
            </aside>
        </>
    );
};

export default Sidebar;
