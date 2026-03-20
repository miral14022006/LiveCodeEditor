import React from 'react';
import { X, Plus, Loader, MessageSquare, Send } from 'lucide-react';

const RightPanel = ({
    isResizingRightPanel, setIsResizingRightPanel,
    rightPanelWidth,
    voiceCall, getInitials, project, user, isOwner,
    handleRemoveCollaborator, onlineUsers,
    handleAddCollaborator, collabEmail, setCollabEmail, addingCollab,
    messages, chatEndRef, typingUsers,
    chatInput, setChatInput, socket, projectId, typingTimeoutRef, sendMessage
}) => {
    return (
        <>
            <div
                className={`resizer-x ${isResizingRightPanel ? 'resizing' : ''}`}
                onMouseDown={() => setIsResizingRightPanel(true)}
            ></div>

            <div className="workspace-right-panel glass-panel" style={{ width: `${rightPanelWidth}px` }}>
                <div className="panel-header">
                    <h3>LIVE SHARE</h3>
                </div>

                

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

                    {onlineUsers.length > 0 && (
                        <div className="online-section">
                            <span className="online-label">
                                <span className="online-dot"></span>
                                {onlineUsers.length} Online
                            </span>
                        </div>
                    )}
                </div>

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
        </>
    );
};

export default RightPanel;
