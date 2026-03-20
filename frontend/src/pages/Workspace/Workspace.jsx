import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { useSocket } from '../../context/SocketProvider';
import useAuthStore from '../../store/authStore';
import api from '../../services/api';
import toast from 'react-hot-toast';
import useVoiceCall from '../../hooks/useVoiceCall';
import VoicePanel from '../../components/workspace/VoicePanel';
import {
    Plus, Files, Search, GitBranch, Play, Puzzle, Settings, UserCircle,
    Save, Trash2, ChevronRight, ChevronDown, Folder, FolderOpen,
    FileText, Terminal, X, Send, Users, Loader, MessageSquare, Phone
} from 'lucide-react';

const Workspace = () => {
    const { projectId } = useParams();
    const navigate = useNavigate();
    const { socket } = useSocket();
    const { user } = useAuthStore();

    // ========== State ==========
    const [project, setProject] = useState(null);
    const [files, setFiles] = useState([]);
    const [activeFile, setActiveFile] = useState(null);
    const [openTabs, setOpenTabs] = useState([]);
    const [code, setCode] = useState('');
    const [messages, setMessages] = useState([]);
    const [chatInput, setChatInput] = useState('');
    const [output, setOutput] = useState('');
    const [consoleInput, setConsoleInput] = useState('');
    const [isRunning, setIsRunning] = useState(false);
    const [previewHtml, setPreviewHtml] = useState(null);
    const [loading, setLoading] = useState(true);

    // File/folder creation
    const [showCreateFile, setShowCreateFile] = useState(false);
    const [showCreateFolder, setShowCreateFolder] = useState(false);
    const [newFileName, setNewFileName] = useState('');
    const [newFolderName, setNewFolderName] = useState('');
    const [createInFolder, setCreateInFolder] = useState(null);

    // Folder expansion state
    const [expandedFolders, setExpandedFolders] = useState(new Set());

    // Add collaborator
    const [collabEmail, setCollabEmail] = useState('');
    const [addingCollab, setAddingCollab] = useState(false);

    // Online users & panels
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [activeSidebarTab, setActiveSidebarTab] = useState('explorer');
    const [activeConsoleTab, setActiveConsoleTab] = useState('terminal');
    const [typingUsers, setTypingUsers] = useState([]);
    const typingTimeoutRef = useRef(null);

    // Panel states for resizing
    const [sidebarWidth, setSidebarWidth] = useState(250);
    const [rightPanelWidth, setRightPanelWidth] = useState(300);
    const [consoleHeight, setConsoleHeight] = useState(200);
    const [isResizingSidebar, setIsResizingSidebar] = useState(false);
    const [isResizingRightPanel, setIsResizingRightPanel] = useState(false);
    const [isResizingConsole, setIsResizingConsole] = useState(false);
    const [isRenaming, setIsRenaming] = useState(null); // stores fileId being renamed
    const [renameName, setRenameName] = useState('');

    // Auto-save timer
    const autoSaveTimer = useRef(null);

    // Refs
    const editorRef = useRef(null);
    const isRemoteChange = useRef(false);
    const chatEndRef = useRef(null);

    // Voice Call Hook (WebRTC)
    const voiceCall = useVoiceCall({ socket, projectId, user });

    // ========== Auth guard ==========
    useEffect(() => {
        if (!user) navigate('/login');
    }, [user, navigate]);

    // ========== Fetch project & files ==========
    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const [projRes, filesRes, chatRes] = await Promise.all([
                    api.get(`/projects/${projectId}`),
                    api.get(`/editor/${projectId}`),
                    api.get(`/chat/${projectId}`).catch(() => ({ data: { data: { messages: [] } } })),
                ]);

                setProject(projRes.data.data);
                const fetchedFiles = filesRes.data.data || [];
                setFiles(fetchedFiles);

                // Load chat messages
                const chatMessages = chatRes.data?.data?.messages || [];
                setMessages(chatMessages);

                // Auto-select first file
                const firstFile = fetchedFiles.find(f => f.type === 'file' || !f.type);
                if (firstFile) {
                    setActiveFile(firstFile);
                    setOpenTabs([firstFile]);
                    setCode(firstFile.content || '');
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

        socket.on('code-update', ({ fileId, content, user: remoteUser }) => {
            if (activeFile && fileId === activeFile._id) {
                isRemoteChange.current = true;
                setCode(content);
            }
            // Update file in list
            setFiles(prev => prev.map(f => f._id === fileId ? { ...f, content } : f));
        });

        socket.on('new-message', (messageObj) => {
            setMessages((prev) => [...prev, messageObj]);
        });

        socket.on('message-deleted', (messageId) => {
            setMessages(prev => prev.filter(m => m._id !== messageId));
        });

        socket.on('chat-cleared', () => {
            setMessages([]);
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

        socket.on('cursor-update', ({ fileId, position, user: remoteUser }) => {
            // Cursor tracking updates can be visualized here
        });

        socket.on('user-typing', ({ user: typingUser }) => {
            setTypingUsers(prev => {
                if (prev.find(u => u._id === typingUser._id)) return prev;
                return [...prev, typingUser];
            });
            // Auto-remove after 3 seconds
            setTimeout(() => {
                setTypingUsers(prev => prev.filter(u => u._id !== typingUser._id));
            }, 3000);
        });

        socket.on('user-stopped-typing', ({ user: typingUser }) => {
            setTypingUsers(prev => prev.filter(u => u._id !== typingUser._id));
        });

        return () => {
            socket.emit('leave-project', projectId);
            socket.off('code-update');
            socket.off('new-message');
            socket.off('message-deleted');
            socket.off('chat-cleared');
            socket.off('user-joined');
            socket.off('user-left');
            socket.off('cursor-update');
            socket.off('user-typing');
            socket.off('user-stopped-typing');
        };
    }, [projectId, socket, activeFile]);

    // Auto-scroll chat
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // ========== Resize Logic ==========
    useEffect(() => {
        const handleMouseMove = (e) => {
            if (isResizingSidebar) {
                const newWidth = Math.max(150, Math.min(600, e.clientX - 48)); // 48 is activity bar width
                setSidebarWidth(newWidth);
            } else if (isResizingRightPanel) {
                const newWidth = Math.max(150, Math.min(600, window.innerWidth - e.clientX));
                setRightPanelWidth(newWidth);
            } else if (isResizingConsole) {
                const newHeight = Math.max(50, Math.min(window.innerHeight - 200, window.innerHeight - e.clientY));
                setConsoleHeight(newHeight);
            }
        };

        const handleMouseUp = () => {
            setIsResizingSidebar(false);
            setIsResizingRightPanel(false);
            setIsResizingConsole(false);
            document.body.classList.remove('resizing');
        };

        if (isResizingSidebar || isResizingRightPanel || isResizingConsole) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            document.body.classList.add('resizing');
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizingSidebar, isResizingRightPanel, isResizingConsole]);

    useEffect(() => {
        return () => {
            if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
        };
    }, []);

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

        // Auto-save after 2 seconds of no typing
        if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
        autoSaveTimer.current = setTimeout(() => {
            if (activeFile) {
                api.patch(`/editor/file/${activeFile._id}`, { content: value }).catch(() => { });
            }
        }, 2000);
    };

    const handleEditorMount = (editor) => {
        editorRef.current = editor;

        // Add Ctrl+S shortcut
        editor.addCommand(
            window.monaco?.KeyMod.CtrlCmd | window.monaco?.KeyCode.KeyS,
            handleSaveFile
        );

        // Track cursor position
        editor.onDidChangeCursorPosition((e) => {
            if (socket && activeFile) {
                socket.emit('cursor-move', {
                    projectId,
                    fileId: activeFile._id,
                    position: e.position,
                });
            }
        });
    };

    // ========== File Handlers ==========
    const handleSelectFile = async (file) => {
        if (file.type === 'folder') {
            toggleFolder(file._id);
            return;
        }

        // Save current file content before switching
        if (activeFile && code !== activeFile.content) {
            try {
                await api.patch(`/editor/file/${activeFile._id}`, { content: code });
            } catch (err) { }
        }

        setActiveFile(file);
        setCode(file.content || '');

        // Add to open tabs if not already there
        setOpenTabs(prev => {
            if (prev.find(t => t._id === file._id)) return prev;
            return [...prev, file];
        });
    };

    const handleCloseTab = (fileId, e) => {
        e?.stopPropagation();
        setOpenTabs(prev => prev.filter(t => t._id !== fileId));

        if (activeFile?._id === fileId) {
            const remaining = openTabs.filter(t => t._id !== fileId);
            if (remaining.length > 0) {
                setActiveFile(remaining[remaining.length - 1]);
                setCode(remaining[remaining.length - 1].content || '');
            } else {
                setActiveFile(null);
                setCode('');
            }
        }
    };

    const handleCreateFile = async (e) => {
        e.preventDefault();
        if (!newFileName.trim()) return;
        try {
            const res = await api.post(`/editor/${projectId}/file`, {
                name: newFileName,
                parentFolder: createInFolder,
            });
            const newFile = res.data.data;
            setFiles(prev => [...prev, newFile]);
            setActiveFile(newFile);
            setOpenTabs(prev => [...prev, newFile]);
            if (createInFolder) {
                setExpandedFolders(prev => new Set(prev).add(createInFolder));
            }
            setCode(newFile.content || '');
            setNewFileName('');
            setShowCreateFile(false);
            setCreateInFolder(null);
            toast.success('File created');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to create file');
        }
    };

    const handleCreateFolder = async (e) => {
        e.preventDefault();
        if (!newFolderName.trim()) return;
        try {
            const res = await api.post(`/editor/${projectId}/folder`, {
                name: newFolderName,
                parentFolder: createInFolder,
            });
            const newFolder = res.data.data;
            setFiles(prev => [...prev, newFolder]);
            if (createInFolder) {
                setExpandedFolders(prev => new Set(prev).add(createInFolder));
            }
            setExpandedFolders(prev => new Set(prev).add(newFolder._id));
            setNewFolderName('');
            setShowCreateFolder(false);
            setCreateInFolder(null);
            toast.success('Folder created');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to create folder');
        }
    };

    const handleDeleteFile = async (fileId, e) => {
        e.stopPropagation();
        if (!confirm('Delete this item?')) return;

        try {
            await api.delete(`/editor/file/${fileId}`);
            setFiles(prev => prev.filter(f => f._id !== fileId && f.parentFolder?.toString() !== fileId));
            handleCloseTab(fileId);
            toast.success('Deleted');
        } catch (err) {
            toast.error('Failed to delete');
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

    const handleRenameFile = async (e) => {
        e.preventDefault();
        if (!renameName.trim() || !isRenaming) return;
        try {
            const res = await api.patch(`/editor/file/${isRenaming}/rename`, { name: renameName.trim() });
            const updatedFile = res.data.data;
            setFiles(prev => prev.map(f => f._id === isRenaming ? updatedFile : f));
            if (activeFile?._id === isRenaming) {
                setActiveFile(updatedFile);
            }
            setOpenTabs(prev => prev.map(t => t._id === isRenaming ? updatedFile : t));
            setIsRenaming(null);
            setRenameName('');
            toast.success('Renamed successfully');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to rename');
        }
    };

    // ========== Run Code (Docker) ==========
    const handleRunCode = async () => {
        if (!activeFile || !code.trim()) {
            toast.error('No code to run');
            return;
        }

        const language = getLanguageForExecution(activeFile.filename);
        if (!language) {
            toast.error('Unsupported language. Supported: JavaScript, Python, C, C++, Java, TypeScript, HTML, React, Node.js');
            return;
        }

        setIsRunning(true);
        setOutput('⏳ Running code...\n');
        setPreviewHtml(null);
        setActiveConsoleTab('terminal');

        try {
            const res = await api.post('/execute/run', {
                code,
                language,
                input: consoleInput,
                projectId,
            });

            const result = res.data.data;

            // If the result contains a preview (HTML/React), show it in preview tab
            if (result.previewHtml) {
                setPreviewHtml(result.previewHtml);
                setActiveConsoleTab('preview');
                setOutput(`✓ ${result.language} preview generated (${result.executionTime}ms)`);
            } else {
                let outputText = '';

                if (result.output) {
                    outputText += result.output;
                }
                if (result.error) {
                    outputText += `\n${result.error}`;
                }

                outputText += `\n\n${result.success ? '✓' : '✗'} Finished (${result.executionTime}ms)`;

                setOutput(outputText);
            }
        } catch (err) {
            const errorMsg = err.response?.data?.message || err.message || 'Execution failed';
            setOutput(`❌ ${errorMsg}`);
        } finally {
            setIsRunning(false);
        }
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

    // ========== Folder Tree Helpers ==========
    const toggleFolder = (folderId) => {
        setExpandedFolders(prev => {
            const next = new Set(prev);
            if (next.has(folderId)) {
                next.delete(folderId);
            } else {
                next.add(folderId);
            }
            return next;
        });
    };

    const buildTree = () => {
        const rootItems = files.filter(f => !f.parentFolder);
        return rootItems.sort((a, b) => {
            // Folders first
            if (a.type === 'folder' && b.type !== 'folder') return -1;
            if (a.type !== 'folder' && b.type === 'folder') return 1;
            return (a.filename || '').localeCompare(b.filename || '');
        });
    };

    const getChildren = (parentId) => {
        return files.filter(f => f.parentFolder === parentId || f.parentFolder?.toString() === parentId?.toString())
            .sort((a, b) => {
                if (a.type === 'folder' && b.type !== 'folder') return -1;
                if (a.type !== 'folder' && b.type === 'folder') return 1;
                return (a.filename || '').localeCompare(b.filename || '');
            });
    };

    // ========== Helpers ==========
    const getLanguageFromFilename = (filename) => {
        const ext = filename?.split('.').pop()?.toLowerCase();
        const map = { js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript', py: 'python', html: 'html', css: 'css', json: 'json', java: 'java', cpp: 'cpp', c: 'c', md: 'markdown' };
        return map[ext] || 'plaintext';
    };

    const getLanguageForExecution = (filename) => {
        const ext = filename?.split('.').pop()?.toLowerCase();
        const map = {
            js: 'javascript', mjs: 'javascript',
            py: 'python',
            c: 'c',
            cpp: 'cpp', cc: 'cpp', cxx: 'cpp',
            java: 'java',
            ts: 'typescript', tsx: 'typescript',
            html: 'html', htm: 'html',
            jsx: 'react',
        };
        return map[ext] || null;
    };

    const getFileIcon = (item) => {
        if (item.type === 'folder') {
            return expandedFolders.has(item._id)
                ? <FolderOpen size={16} className="icon-folder" />
                : <Folder size={16} className="icon-folder" />;
        }
        const ext = item.filename?.split('.').pop()?.toLowerCase();
        const iconClass = {
            js: 'icon-js', jsx: 'icon-jsx', ts: 'icon-ts', tsx: 'icon-tsx',
            py: 'icon-py', html: 'icon-html', css: 'icon-css',
            json: 'icon-json', md: 'icon-md'
        }[ext] || 'icon-default';

        return <FileText size={16} className={iconClass} />;
    };

    const getInitials = (name) => name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '?';
    const isOwner = project?.owner?._id === user?._id || project?.owner === user?._id;

    // ========== Render File Tree Item ==========
    const renderTreeItem = (item, depth = 0) => {
        const isFolder = item.type === 'folder';
        const isExpanded = expandedFolders.has(item._id);
        const children = getChildren(item._id);

        return (
            <div key={item._id}>
                {isRenaming === item._id ? (
                    <form onSubmit={handleRenameFile} style={{ paddingLeft: `${12 + depth * 16}px`, margin: '2px 0' }}>
                        <input
                            type="text"
                            className="vsc-input"
                            value={renameName}
                            onChange={(e) => setRenameName(e.target.value)}
                            autoFocus
                            onBlur={() => setIsRenaming(null)}
                            onKeyDown={(e) => e.key === 'Escape' && setIsRenaming(null)}
                            style={{ height: '22px', fontSize: '12px' }}
                        />
                    </form>
                ) : (
                    <div
                        className={`file-item ${!isFolder && activeFile?._id === item._id ? 'active' : ''}`}
                        onClick={() => handleSelectFile(item)}
                        onDoubleClick={(e) => {
                            e.stopPropagation();
                            setIsRenaming(item._id);
                            setRenameName(item.filename);
                        }}
                        style={{ paddingLeft: `${12 + depth * 16}px` }}
                    >
                        {isFolder && (
                            <span className="folder-chevron">
                                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </span>
                        )}
                        <span className="file-icon">{getFileIcon(item)}</span>
                        <span className="file-name">{item.filename}</span>
                        <div className="file-actions">
                            {isFolder && (
                                <>
                                    <button onClick={(e) => { e.stopPropagation(); setCreateInFolder(item._id); setShowCreateFile(true); }} title="New File">
                                        <Plus size={14} />
                                    </button>
                                </>
                            )}
                            <button onClick={(e) => { e.stopPropagation(); setIsRenaming(item._id); setRenameName(item.filename); }} title="Rename">
                                <FileText size={14} />
                            </button>
                            <button onClick={(e) => handleDeleteFile(item._id, e)} title="Delete">
                                <X size={14} />
                            </button>
                        </div>
                    </div>
                )}
                {isFolder && isExpanded && children.map(child => renderTreeItem(child, depth + 1))}
            </div>
        );
    };

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
                    <div className="activity-item" title="Dashboard" onClick={() => navigate('/dashboard')}>
                        <UserCircle size={28} strokeWidth={1.5} />
                    </div>
                </div>
            </div>

                <div
                    className={`resizer-x ${isResizingSidebar ? 'resizing' : ''}`}
                    onMouseDown={() => setIsResizingSidebar(true)}
                ></div>

                {/* 2. SIDEBAR CONTENT */}
                <aside className="workspace-sidebar" style={{ width: `${sidebarWidth}px` }}>
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
                        <p style={{ fontSize: '13px', color: '#ccc', marginBottom: '10px' }}>Version history is available for each file. Select a file to view its history.</p>
                        <button className="vsc-btn vsc-btn-primary" style={{ width: '100%', background: '#007acc', color: 'white', display: 'flex', justifyContent: 'center', padding: '6px' }}>View Version History</button>
                    </div>
                )}

                {activeSidebarTab === 'run' && (
                    <div style={{ padding: '16px 12px' }}>
                        <h3 style={{ fontSize: '11px', fontWeight: 'normal', color: '#ccc', marginBottom: '12px', letterSpacing: '0.5px' }}>RUN AND DEBUG</h3>
                        <p style={{ fontSize: '13px', color: '#ccc', marginBottom: '10px' }}>Run your code in a secure Docker container.</p>
                        <button
                            className="vsc-btn vsc-btn-primary"
                            style={{ width: '100%', background: '#007acc', color: 'white', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', padding: '8px' }}
                            onClick={handleRunCode}
                            disabled={isRunning}
                        >
                            {isRunning ? <><Loader size={14} className="spin" /> Running...</> : <><Play size={14} /> Run Active File</>}
                        </button>
                        <div style={{ marginTop: '16px', fontSize: '12px', color: '#888' }}>
                            <p>Supported: JS, Python, C, C++, Java, TS, HTML, React, Node.js</p>
                            <p style={{ marginTop: '4px' }}>Timeout: 5–15s • Memory: 128–256MB</p>
                        </div>
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
                {/* Editor Tabs */}
                <div className="workspace-tabs">
                    {openTabs.map(tab => (
                        <div
                            key={tab._id}
                            className={`workspace-tab ${activeFile?._id === tab._id ? 'active' : ''}`}
                            onClick={() => handleSelectFile(tab)}
                        >
                            <span className="tab-icon">{getFileIcon(tab)}</span>
                            <span>{tab.filename}</span>
                            <button className="workspace-tab-close" onClick={(e) => handleCloseTab(tab._id, e)}>
                                <X size={12} />
                            </button>
                        </div>
                    ))}
                </div>

                {/* Breadcrumbs / Toolbar */}
                <div className="workspace-breadcrumbs">
                    <div className="breadcrumb-path">
                        <span>{project?.title || 'Project'}</span>
                        <span>›</span>
                        {activeFile && (
                            <span>{activeFile.path || activeFile.filename}</span>
                        )}
                    </div>
                    <div className="editor-actions">
                        <button className="vsc-btn" onClick={handleSaveFile} title="Save File (Ctrl+S)">
                            <Save size={14} /> Save
                        </button>
                        <button
                            className="vsc-btn vsc-btn-primary"
                            onClick={handleRunCode}
                            title="Run Code"
                            disabled={isRunning}
                        >
                            {isRunning ? <><Loader size={14} className="spin" /> Running...</> : <><Play size={14} /> Run</>}
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
                                minimap: { enabled: true },
                                fontSize: 14,
                                wordWrap: 'on',
                                padding: { top: 8 },
                                scrollBeyondLastLine: false,
                                automaticLayout: true,
                                smoothScrolling: true,
                                cursorBlinking: 'smooth',
                                cursorSmoothCaretAnimation: 'on',
                                renderWhitespace: 'selection',
                                bracketPairColorization: { enabled: true },
                            }}
                        />
                    ) : (
                        <div className="empty-state">
                            <div className="empty-state-icon" style={{ fontSize: '48px', marginBottom: '16px' }}>⚡</div>
                            <h2>CodeSync Editor</h2>
                            <p style={{ marginTop: '10px', color: '#888' }}>Select a file from the Explorer or create a new one to start coding.</p>
                            <div style={{ marginTop: '20px', display: 'flex', gap: '12px' }}>
                                <button className="vsc-btn vsc-btn-primary" onClick={() => setShowCreateFile(true)}>
                                    <Plus size={14} /> New File
                                </button>
                                <button className="vsc-btn" onClick={() => setShowCreateFolder(true)}>
                                    <Folder size={14} /> New Folder
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Terminal / Console */}
                <div
                    className={`resizer-y ${isResizingConsole ? 'resizing' : ''}`}
                    onMouseDown={() => setIsResizingConsole(true)}
                ></div>
                <div className="workspace-console" style={{ height: `${consoleHeight}px` }}>
                    <div className="console-tabs">
                        <div
                            className={`console-tab ${activeConsoleTab === 'terminal' ? 'active' : ''}`}
                            onClick={() => setActiveConsoleTab('terminal')}
                        >
                            <Terminal size={14} /> Terminal
                        </div>
                        {previewHtml && (
                            <div
                                className={`console-tab ${activeConsoleTab === 'preview' ? 'active' : ''}`}
                                onClick={() => setActiveConsoleTab('preview')}
                            >
                                🌐 Preview
                            </div>
                        )}
                        <div className="editor-actions" style={{ paddingRight: '10px' }}>
                            {output && <button className="vsc-btn" onClick={() => { setOutput(''); setPreviewHtml(null); }}><Trash2 size={12} /> Clear</button>}
                        </div>
                    </div>

                    {activeConsoleTab === 'preview' && previewHtml ? (
                        <div style={{ flex: 1, background: '#fff' }}>
                            <iframe
                                srcDoc={previewHtml}
                                title="Preview"
                                sandbox="allow-scripts allow-modals"
                                style={{ width: '100%', height: '100%', border: 'none' }}
                            />
                        </div>
                    ) : (
                        <div className="console-split-view" style={{ display: 'flex', flexDirection: 'row', height: '100%' }}>
                            <div className="console-input-pane" style={{ flex: 1, display: 'flex', flexDirection: 'column', borderRight: '1px solid #333' }}>
                                <div className="console-pane-header" style={{ fontSize: '11px', color: '#858585', padding: '4px 10px', textTransform: 'uppercase' }}>Program Input (stdin)</div>
                                <textarea
                                    className="console-textarea"
                                    placeholder="Enter input for your program here..."
                                    value={consoleInput}
                                    onChange={(e) => setConsoleInput(e.target.value)}
                                    style={{ flex: 1, background: 'transparent', border: 'none', color: '#ccc', padding: '10px', resize: 'none', outline: 'none', fontFamily: 'monospace', fontSize: '13px' }}
                                ></textarea>
                            </div>
                            <div className={`console-output-pane ${output.includes('Error') || output.includes('✗') ? 'error' : ''}`} style={{ flex: 2, display: 'flex', flexDirection: 'column' }}>
                                <div className="console-pane-header" style={{ fontSize: '11px', color: '#858585', padding: '4px 10px', textTransform: 'uppercase' }}>Program Output (stdout/stderr)</div>
                                <div className="console-output" style={{ flex: 1, padding: '10px', overflowY: 'auto' }}>
                                    {output || <span style={{ color: '#616161' }}>
                                        PS C:\Users\{user?.username}&gt; {activeFile ? `run ${activeFile.filename}` : ''}
                                        {'\n'}Ready. Click "Run". C++ code with cin requires input in the left pane.
                                    </span>}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div
                className={`resizer-x ${isResizingRightPanel ? 'resizing' : ''}`}
                onMouseDown={() => setIsResizingRightPanel(true)}
            ></div>

            {/* 4. RIGHT PANEL (Live Share / Chat) */}
            <div className="workspace-right-panel" style={{ width: `${rightPanelWidth}px` }}>
                <div className="panel-header">
                    <h3>LIVE SHARE</h3>
                </div>

                {/* Voice Calling Panel */}
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

                {/* Participants List */}
                <div className="participants-container">
                    <div className="participant-item">
                        <div className="participant-avatar">{getInitials(project?.owner?.name || user?.name)}</div>
                        <span className="participant-name">{project?.owner?.name || user?.name}</span>
                        <span className="participant-role">Owner</span>
                    </div>

                    {project?.collaborators?.map((collab) => (
                        <div key={collab.user?._id || collab._id} className="participant-item">
                            <div className="participant-avatar" style={{ background: '#4facfe' }}>
                                {getInitials(collab.user?.name)}
                            </div>
                            <span className="participant-name">{collab.user?.name || 'Unknown'}</span>
                            <span className="participant-role">{collab.role || 'editor'}</span>
                            {isOwner && (
                                <button
                                    onClick={() => handleRemoveCollaborator(collab.user?._id)}
                                    style={{ background: 'none', border: 'none', color: '#f14c4c', cursor: 'pointer', marginLeft: 'auto', padding: '2px' }}
                                    title="Remove collaborator"
                                >
                                    <X size={14} />
                                </button>
                            )}
                        </div>
                    ))}

                    {/* Online indicator */}
                    {onlineUsers.length > 0 && (
                        <div className="online-section">
                            <span className="online-label">
                                <span className="online-dot"></span>
                                {onlineUsers.length} Online
                            </span>
                        </div>
                    )}
                </div>

                {/* Add Collaborator form */}
                {isOwner && (
                    <div className="add-collab-section">
                        <form className="vsc-input-group" onSubmit={handleAddCollaborator}>
                            <input
                                type="email"
                                className="vsc-input"
                                placeholder="Add by email..."
                                value={collabEmail}
                                onChange={(e) => setCollabEmail(e.target.value)}
                            />
                            <button type="submit" className="vsc-btn vsc-btn-primary" disabled={addingCollab} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {addingCollab ? <Loader size={14} className="spin" /> : <Plus size={16} />}
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
                                <MessageSquare size={24} style={{ opacity: 0.3 }} />
                                <p style={{ marginTop: '10px', fontSize: '12px' }}>No messages yet.</p>
                            </div>
                        ) : (
                            messages.map((msg, i) => (
                                <div key={msg._id || i} className="chat-message">
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

                    {/* Typing Indicator */}
                    {typingUsers.length > 0 && (
                        <div className="chat-typing-indicator">
                            <span className="typing-dots">
                                <span></span><span></span><span></span>
                            </span>
                            <span>{typingUsers.map(u => u.name).join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...</span>
                        </div>
                    )}

                    <div className="chat-input-container">
                        <div className="chat-input-box">
                            <input
                                type="text"
                                placeholder="Message team..."
                                value={chatInput}
                                onChange={(e) => {
                                    setChatInput(e.target.value);
                                    if (socket && e.target.value.trim()) {
                                        socket.emit('typing-start', { projectId });
                                        clearTimeout(typingTimeoutRef.current);
                                        typingTimeoutRef.current = setTimeout(() => {
                                            socket.emit('typing-stop', { projectId });
                                        }, 2000);
                                    } else if (socket) {
                                        socket.emit('typing-stop', { projectId });
                                    }
                                }}
                                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                            />
                            <button onClick={sendMessage}>
                                <Send size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
};

export default Workspace;
