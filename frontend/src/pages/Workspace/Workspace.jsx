import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { useSocket } from '../../context/SocketProvider';
import useAuthStore from '../../store/authStore';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { Plus, Files, Search, GitBranch, Play, Puzzle, Settings, UserCircle } from 'lucide-react';

const Workspace = () => {
    const { projectId } = useParams();
    const navigate = useNavigate();
    const { socket } = useSocket();
    const { user } = useAuthStore();

    // ========== State ==========
    const [project, setProject] = useState(null);
    const [files, setFiles] = useState([]);
    const [activeFile, setActiveFile] = useState(null);
    const [code, setCode] = useState('');
    const [messages, setMessages] = useState([]);
    const [chatInput, setChatInput] = useState('');
    const [output, setOutput] = useState('');
    const [loading, setLoading] = useState(true);

    // File creation
    const [showCreateFile, setShowCreateFile] = useState(false);
    const [newFileName, setNewFileName] = useState('');

    // Add collaborator modal
    const [showCollabModal, setShowCollabModal] = useState(false);
    const [collabEmail, setCollabEmail] = useState('');
    const [addingCollab, setAddingCollab] = useState(false);

    // Online users / Panels
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [activeSidebarTab, setActiveSidebarTab] = useState('explorer');

    // Refs
    const editorRef = useRef(null);
    const isRemoteChange = useRef(false);
    const chatEndRef = useRef(null);

    // ========== Auth guard ==========
    useEffect(() => {
        if (!user) navigate('/login');
    }, [user, navigate]);

    // ========== Fetch project & files ==========
    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const [projRes, filesRes] = await Promise.all([
                    api.get(`/projects/${projectId}`),
                    api.get(`/editor/${projectId}`),
                ]);

                setProject(projRes.data.data);
                const fetchedFiles = filesRes.data.data || [];
                setFiles(fetchedFiles);

                // Auto-select first file
                if (fetchedFiles.length > 0) {
                    setActiveFile(fetchedFiles[0]);
                    setCode(fetchedFiles[0].content || '');
                }
            } catch (err) {
                toast.error('Failed to load project');
                navigate('/dashboard');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [projectId]);

    // ========== Socket events ==========
    useEffect(() => {
        if (!socket) return;

        socket.emit('join-project', projectId);

        socket.on('code-update', ({ fileId, content }) => {
            if (activeFile && fileId === activeFile._id) {
                isRemoteChange.current = true;
                setCode(content);
            }
        });

        socket.on('new-message', (messageObj) => {
            setMessages((prev) => [...prev, messageObj]);
        });

        socket.on('user-joined', ({ user: joinedUser }) => {
            setOnlineUsers(prev => {
                if (prev.find(u => u._id === joinedUser._id)) return prev;
                return [...prev, joinedUser];
            });
            toast.success(`${joinedUser.name} joined`);
        });

        socket.on('user-left', ({ user: leftUser }) => {
            setOnlineUsers(prev => prev.filter(u => u._id !== leftUser._id));
        });

        return () => {
            socket.emit('leave-project', projectId);
            socket.off('code-update');
            socket.off('new-message');
            socket.off('user-joined');
            socket.off('user-left');
        };
    }, [projectId, socket, activeFile]);

    // Auto-scroll chat
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // ========== Editor Handlers ==========
    const handleEditorChange = (value) => {
        if (isRemoteChange.current) {
            isRemoteChange.current = false;
            return;
        }
        setCode(value);
        if (socket && activeFile) {
            socket.emit('code-change', {
                projectId,
                fileId: activeFile._id,
                content: value,
            });
        }
    };

    const handleEditorMount = (editor) => {
        editorRef.current = editor;
    };

    // ========== File Handlers ==========
    const handleSelectFile = async (file) => {
        if (activeFile && code !== activeFile.content) {
            try { await api.patch(`/editor/file/${activeFile._id}`, { content: code }); } catch (err) {}
        }
        setActiveFile(file);
        setCode(file.content || '');
    };

    const handleCreateFile = async (e) => {
        e.preventDefault();
        if (!newFileName.trim()) return;
        try {
            const res = await api.post(`/editor/${projectId}`, {
                name: newFileName,
                language: getLanguageFromFilename(newFileName),
            });
            const newFile = res.data.data;
            setFiles(prev => [...prev, newFile]);
            setActiveFile(newFile);
            setCode(newFile.content || '');
            setNewFileName('');
            setShowCreateFile(false);
            toast.success('File created');
        } catch (err) {
            toast.error('Failed to create file');
        }
    };

    const handleDeleteFile = async (fileId, e) => {
        e.stopPropagation();
        if (!confirm('Delete this file?')) return;

        try {
            await api.delete(`/editor/file/${fileId}`);
            setFiles(prev => prev.filter(f => f._id !== fileId));
            if (activeFile?._id === fileId) {
                const remaining = files.filter(f => f._id !== fileId);
                if (remaining.length > 0) {
                    setActiveFile(remaining[0]);
                    setCode(remaining[0].content || '');
                } else {
                    setActiveFile(null);
                    setCode('');
                }
            }
            toast.success('File deleted');
        } catch (err) {
            toast.error('Failed to delete file');
        }
    };

    const handleSaveFile = async () => {
        if (!activeFile) return;
        try {
            await api.patch(`/editor/file/${activeFile._id}`, { content: code });
            setFiles(prev => prev.map(f => f._id === activeFile._id ? { ...f, content: code } : f));
            setActiveFile(prev => ({ ...prev, content: code }));
            toast.success('Saved');
        } catch (err) {
            toast.error('Failed to save');
        }
    };

    // ========== Run Code ==========
    const handleRunCode = () => {
        let logs = [];
        const originalLog = console.log;
        console.log = (...args) => {
            logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '));
        };
        try {
            new Function(code)();
        } catch (error) {
            logs.push(`Error: ${error.message}`);
        }
        console.log = originalLog;
        setOutput(logs.join('\n'));
    };

    // ========== Chat & Collab ==========
    const sendMessage = () => {
        if (!chatInput.trim() || !socket) return;
        socket.emit('send-message', { projectId, message: chatInput.trim() });
        setChatInput('');
    };

    const handleAddCollaborator = async (e) => {
        e.preventDefault();
        if (!collabEmail.trim()) return;
        try {
            setAddingCollab(true);
            await api.post(`/projects/${projectId}/add-collaborator`, { email: collabEmail.trim() });
            toast.success(`Collaborator added!`);
            setCollabEmail('');
            const res = await api.get(`/projects/${projectId}`);
            setProject(res.data.data);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to add collaborator');
        } finally {
            setAddingCollab(false);
        }
    };

    const handleRemoveCollaborator = async (userId) => {
        try {
            await api.post(`/projects/${projectId}/remove-collaborator`, { userId });
            toast.success('Collaborator removed');
            const res = await api.get(`/projects/${projectId}`);
            setProject(res.data.data);
        } catch (err) {
            toast.error('Failed to remove collaborator');
        }
    };

    // ========== Helpers ==========
    const getLanguageFromFilename = (filename) => {
        const ext = filename.split('.').pop()?.toLowerCase();
        const map = { js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript', py: 'python', html: 'html', css: 'css', json: 'json', java: 'java', cpp: 'cpp', c: 'c', md: 'markdown' };
        return map[ext] || 'plaintext';
    };

    const getFileIcon = (filename) => {
        const ext = filename?.split('.').pop()?.toLowerCase();
        const icons = { js: '🟨', jsx: '⚛️', ts: '🔷', tsx: '⚛️', py: '🐍', html: '🌐', css: '🎨', json: '📋', md: '📝' };
        return icons[ext] || '📄';
    };

    const getInitials = (name) => name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '?';
    const isOwner = project?.owner?._id === user?._id || project?.owner === user?._id;

    if (loading) return <div className="page-loader"><div className="spinner"></div></div>;

    return (
        <div className="workspace-page">
            
            {/* 1. ACTIVITY BAR */}
            <div className="activity-bar">
                <div className={`activity-item ${activeSidebarTab === 'explorer' ? 'active' : ''}`} onClick={() => setActiveSidebarTab('explorer')} title="Explorer">
                    <Files size={24} strokeWidth={1.5} />
                </div>
                <div className={`activity-item ${activeSidebarTab === 'search' ? 'active' : ''}`} onClick={() => setActiveSidebarTab('search')} title="Search">
                    <Search size={24} strokeWidth={1.5} />
                </div>
                <div className={`activity-item ${activeSidebarTab === 'source-control' ? 'active' : ''}`} onClick={() => setActiveSidebarTab('source-control')} title="Source Control">
                    <GitBranch size={24} strokeWidth={1.5} />
                </div>
                <div className={`activity-item ${activeSidebarTab === 'run' ? 'active' : ''}`} onClick={() => setActiveSidebarTab('run')} title="Run and Debug">
                    <Play size={24} strokeWidth={1.5} />
                </div>
                <div className={`activity-item ${activeSidebarTab === 'extensions' ? 'active' : ''}`} onClick={() => setActiveSidebarTab('extensions')} title="Extensions">
                    <Puzzle size={24} strokeWidth={1.5} />
                </div>
                
                <div className="activity-bar-bottom">
                    <div className="activity-item" title="Settings" onClick={() => navigate('/settings')}>
                        <Settings size={24} strokeWidth={1.5} />
                    </div>
                    <div className="activity-item" title="Accounts" onClick={() => navigate('/dashboard')}>
                        <UserCircle size={28} strokeWidth={1.5} />
                    </div>
                </div>
            </div>

            {/* 2. SIDEBAR CONTENT */}
            <aside className="workspace-sidebar">
                {activeSidebarTab === 'explorer' && (
                    <>
                        <div className="workspace-sidebar-header">
                            <h3>EXPLORER</h3>
                            <div className="sidebar-actions">
                                <button onClick={() => setShowCreateFile(!showCreateFile)} title="New File" style={{ display: 'flex', alignItems: 'center' }}><Plus size={16} /></button>
                            </div>
                        </div>
                        
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
                                    />
                                </div>
                            </form>
                        )}

                        <div className="file-tree">
                            {files.map((file) => (
                                <div
                                    key={file._id}
                                    className={`file-item ${activeFile?._id === file._id ? 'active' : ''}`}
                                    onClick={() => handleSelectFile(file)}
                                >
                                    <span className="file-icon">{getFileIcon(file.filename)}</span>
                                    <span className="file-name">{file.filename}</span>
                                    <div className="file-actions">
                                        <button onClick={(e) => handleDeleteFile(file._id, e)} title="Delete">✕</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}

                {activeSidebarTab === 'search' && (
                    <div style={{ padding: '16px 12px' }}>
                        <h3 style={{ fontSize: '11px', fontWeight: 'normal', color: '#ccc', marginBottom: '12px', letterSpacing: '0.5px' }}>SEARCH</h3>
                        <div className="vsc-input-group">
                            <input type="text" className="vsc-input" placeholder="Search" style={{ background: '#3c3c3c' }} />
                        </div>
                        <p style={{ marginTop: '16px', fontSize: '12px', color: '#666', textAlign: 'center' }}>Search functionality coming soon...</p>
                    </div>
                )}

                {activeSidebarTab === 'source-control' && (
                    <div style={{ padding: '16px 12px' }}>
                        <h3 style={{ fontSize: '11px', fontWeight: 'normal', color: '#ccc', marginBottom: '12px', letterSpacing: '0.5px' }}>SOURCE CONTROL</h3>
                        <p style={{ fontSize: '13px', color: '#ccc', marginBottom: '10px' }}>In order to use git features, you can open a folder containing a git repository.</p>
                        <button className="vsc-btn vsc-btn-primary" style={{ width: '100%', background: '#007acc', color: 'white', display: 'flex', justifyContent: 'center', padding: '6px' }}>Initialize Repository</button>
                    </div>
                )}

                {activeSidebarTab === 'run' && (
                    <div style={{ padding: '16px 12px' }}>
                        <h3 style={{ fontSize: '11px', fontWeight: 'normal', color: '#ccc', marginBottom: '12px', letterSpacing: '0.5px' }}>RUN AND DEBUG</h3>
                        <p style={{ fontSize: '13px', color: '#ccc', marginBottom: '10px' }}>Run and debug your code seamlessly here.</p>
                        <button className="vsc-btn vsc-btn-primary" style={{ width: '100%', background: '#007acc', color: 'white', display: 'flex', justifyContent: 'center', padding: '6px' }} onClick={handleRunCode}>Run Active File</button>
                    </div>
                )}

                {activeSidebarTab === 'extensions' && (
                    <div style={{ padding: '16px 12px' }}>
                        <h3 style={{ fontSize: '11px', fontWeight: 'normal', color: '#ccc', marginBottom: '12px', letterSpacing: '0.5px' }}>EXTENSIONS</h3>
                        <div className="vsc-input-group">
                            <input type="text" className="vsc-input" placeholder="Search Extensions in Marketplace" />
                        </div>
                    </div>
                )}

                <button className="workspace-back-btn" onClick={() => navigate('/dashboard')} style={{ marginTop: 'auto', borderTop: '1px solid #1e1e1e' }}>
                    ⟵ Back to Dashboard
                </button>
            </aside>

            {/* 3. MAIN EDITOR AREA */}
            <div className="workspace-main">
                {/* Editor Tabs & Actions */}
                <div className="workspace-tabs">
                    {activeFile && (
                        <div className="workspace-tab active">
                            <span style={{ fontSize: '14px' }}>{getFileIcon(activeFile.filename)}</span>
                            <span>{activeFile.filename}</span>
                            <button className="workspace-tab-close" onClick={() => setActiveFile(null)}>✕</button>
                        </div>
                    )}
                </div>
                
                {/* Breadcrumbs / Toolbar */}
                <div className="workspace-breadcrumbs">
                    <div className="breadcrumb-path">
                        <span>{project?.title || 'Project'}</span>
                        <span>›</span>
                        {activeFile && (
                            <>
                                <span>{activeFile.filename}</span>
                            </>
                        )}
                    </div>
                    <div className="editor-actions">
                        <button className="vsc-btn" onClick={handleSaveFile} title="Save File (Ctrl+S)">
                            💾 Save
                        </button>
                        <button className="vsc-btn vsc-btn-primary" onClick={handleRunCode} title="Run Code">
                            ▶️ Run
                        </button>
                    </div>
                </div>

                {/* Editor Container */}
                <div className="editor-container">
                    {activeFile ? (
                        <Editor
                            height="100%"
                            language={getLanguageFromFilename(activeFile.filename)}
                            theme="vs-dark"
                            value={code}
                            onChange={handleEditorChange}
                            onMount={handleEditorMount}
                            options={{
                                minimap: { enabled: false },
                                fontSize: 13,
                                wordWrap: 'on',
                                padding: { top: 8 },
                                scrollBeyondLastLine: false,
                                automaticLayout: true,
                            }}
                        />
                    ) : (
                        <div className="empty-state">
                            <div className="empty-state-icon">📝</div>
                            <h2>CodeSync Editor</h2>
                            <p style={{ marginTop: '10px' }}>Select a file from the Explorer to start coding.</p>
                        </div>
                    )}
                </div>

                {/* Terminal / Console */}
                <div className="workspace-console">
                    <div className="console-tabs">
                        <div className="console-tab">Terminal</div>
                        <div className="editor-actions" style={{ paddingRight: '10px' }}>
                            {output && <button className="vsc-btn" onClick={() => setOutput('')}>🗑 Clear</button>}
                        </div>
                    </div>
                    <div className={`console-output ${output.startsWith('Error') ? 'error' : ''}`}>
                        {output || <span style={{ color: '#616161' }}>PS C:\Users\{user?.username}&gt; {activeFile ? `node ${activeFile.filename}` : ''}</span>}
                    </div>
                </div>
            </div>

            {/* 4. RIGHT PANEL (Live Share / Chat) */}
            <div className="workspace-right-panel">
                <div className="panel-header">
                    <h3>LIVE SHARE</h3>
                </div>

                {/* Participants List */}
                <div className="participants-container">
                    <div className="participant-item">
                        <div className="participant-avatar">{getInitials(project?.owner?.name || user?.name)}</div>
                        <span className="participant-name">{project?.owner?.name || user?.name} (Owner)</span>
                    </div>

                    {project?.collaborators?.map((collab) => (
                        <div key={collab.user?._id || collab._id} className="participant-item">
                            <div className="participant-avatar" style={{ background: '#4facfe' }}>
                                {getInitials(collab.user?.name)}
                            </div>
                            <span className="participant-name">{collab.user?.name || 'Unknown'}</span>
                            {isOwner && (
                                <button 
                                    onClick={() => handleRemoveCollaborator(collab.user?._id)}
                                    style={{ background: 'none', border: 'none', color: '#f14c4c', cursor: 'pointer', marginLeft: 'auto' }}
                                >✕</button>
                            )}
                        </div>
                    ))}
                </div>

                {/* Add Collaborator form */}
                {isOwner && (
                    <div className="add-collab-section">
                        <form className="vsc-input-group" onSubmit={handleAddCollaborator}>
                            <input
                                type="email"
                                className="vsc-input"
                                placeholder="Add exact email..."
                                value={collabEmail}
                                onChange={(e) => setCollabEmail(e.target.value)}
                            />
                            <button type="submit" className="vsc-btn vsc-btn-primary" disabled={addingCollab} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {addingCollab ? '...' : <Plus size={16} />}
                            </button>
                        </form>
                    </div>
                )}

                {/* Chat Panel */}
                <div className="chat-section">
                    <div className="panel-header" style={{ borderTop: '1px solid #1e1e1e' }}>
                        <h3>TEAM CHAT</h3>
                    </div>
                    
                    <div className="chat-messages">
                        {messages.length === 0 ? (
                            <div className="chat-empty">
                                <span style={{ fontSize: '24px', opacity: 0.5 }}>💬</span>
                                <p style={{ marginTop: '10px' }}>No messages yet.</p>
                            </div>
                        ) : (
                            messages.map((msg, i) => (
                                <div key={i} className="chat-message">
                                    <div className="chat-message-header">
                                        <span className="chat-message-sender">{msg.sender?.name || msg.sender || 'Unknown'}</span>
                                        <span className="chat-message-time">{new Date(msg.createdAt || msg.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                    <div className="chat-message-text">{msg.message || msg.text}</div>
                                </div>
                            ))
                        )}
                        <div ref={chatEndRef} />
                    </div>

                    <div className="chat-input-container">
                        <div className="chat-input-box">
                            <input
                                type="text"
                                placeholder="Message team..."
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                            />
                            <button onClick={sendMessage}>➤</button>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
};

export default Workspace;
