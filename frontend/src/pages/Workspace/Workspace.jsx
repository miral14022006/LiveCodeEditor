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

import ActivityBar from '../../components/workspace/ActivityBar';
import Sidebar from '../../components/workspace/Sidebar';
import EditorArea from '../../components/workspace/EditorArea';
import ConsolePanel from '../../components/workspace/ConsolePanel';
import RightPanel from '../../components/workspace/RightPanel';


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
            <ActivityBar activeSidebarTab={activeSidebarTab} setActiveSidebarTab={setActiveSidebarTab} navigate={navigate} />

            <Sidebar
                sidebarWidth={sidebarWidth}
                activeSidebarTab={activeSidebarTab}
                isResizingSidebar={isResizingSidebar}
                setIsResizingSidebar={setIsResizingSidebar}
                project={project}
                files={files}
                showCreateFile={showCreateFile} setShowCreateFile={setShowCreateFile}
                showCreateFolder={showCreateFolder} setShowCreateFolder={setShowCreateFolder}
                newFileName={newFileName} setNewFileName={setNewFileName} handleCreateFile={handleCreateFile}
                newFolderName={newFolderName} setNewFolderName={setNewFolderName} handleCreateFolder={handleCreateFolder}
                setCreateInFolder={setCreateInFolder}
                buildTree={buildTree} renderTreeItem={renderTreeItem}
                isRunning={isRunning} handleRunCode={handleRunCode}
                navigate={navigate}
                voiceCall={voiceCall} getInitials={getInitials}
                isOwner={isOwner}
                handleAddCollaborator={handleAddCollaborator}
                collabEmail={collabEmail}
                setCollabEmail={setCollabEmail}
                addingCollab={addingCollab}
                handleRemoveCollaborator={handleRemoveCollaborator}
            />

            <div className="workspace-main-column" style={{flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0}}>
                <EditorArea
                    openTabs={openTabs}
                    activeFile={activeFile}
                    handleSelectFile={handleSelectFile}
                    getFileIcon={getFileIcon}
                    handleCloseTab={handleCloseTab}
                    project={project}
                    handleSaveFile={handleSaveFile}
                    handleRunCode={handleRunCode}
                    isRunning={isRunning}
                    code={code}
                    handleEditorChange={handleEditorChange}
                    handleEditorMount={handleEditorMount}
                    getLanguageFromFilename={getLanguageFromFilename}
                    setShowCreateFile={setShowCreateFile}
                    setShowCreateFolder={setShowCreateFolder}
                    isOwner={isOwner}
                    handleAddCollaborator={handleAddCollaborator}
                    collabEmail={collabEmail}
                    setCollabEmail={setCollabEmail}
                    addingCollab={addingCollab}
                />

                <ConsolePanel
                    isResizingConsole={isResizingConsole} setIsResizingConsole={setIsResizingConsole}
                    consoleHeight={consoleHeight}
                    activeConsoleTab={activeConsoleTab} setActiveConsoleTab={setActiveConsoleTab}
                    previewHtml={previewHtml} setPreviewHtml={setPreviewHtml}
                    output={output} setOutput={setOutput}
                    consoleInput={consoleInput} setConsoleInput={setConsoleInput}
                    user={user} activeFile={activeFile}
                />
            </div>

            <RightPanel
                isResizingRightPanel={isResizingRightPanel} setIsResizingRightPanel={setIsResizingRightPanel}
                rightPanelWidth={rightPanelWidth}
                voiceCall={voiceCall} getInitials={getInitials} project={project} user={user} isOwner={isOwner}
                handleRemoveCollaborator={handleRemoveCollaborator} onlineUsers={onlineUsers}
                handleAddCollaborator={handleAddCollaborator} collabEmail={collabEmail} setCollabEmail={setCollabEmail} addingCollab={addingCollab}
                messages={messages} chatEndRef={chatEndRef} typingUsers={typingUsers}
                chatInput={chatInput} setChatInput={setChatInput} socket={socket} projectId={projectId} typingTimeoutRef={typingTimeoutRef} sendMessage={sendMessage}
            />

            {/* Global Whatsapp-style Incoming Call Overlay - Native React Render prevents CSS transform constraint issues */}
            {voiceCall.incomingCall && !voiceCall.isInCall && (
                <div className="whatsapp-call-overlay">
                    <div className="whatsapp-call-modal">
                        <div className="whatsapp-call-avatar">
                            {getInitials(voiceCall.incomingCall.name)}
                        </div>
                        <h2 className="whatsapp-caller-name">{voiceCall.incomingCall.name}</h2>
                        <p className="whatsapp-call-status">Incoming Voice Call...</p>
                        
                        <div className="whatsapp-call-actions">
                            <button className="whatsapp-btn-decline" onClick={voiceCall.rejectCall}>
                                <Phone size={28} className="decline-icon" />
                            </button>
                            <button className="whatsapp-btn-accept" onClick={voiceCall.acceptCall}>
                                <Phone size={28} className="accept-icon" />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Workspace;