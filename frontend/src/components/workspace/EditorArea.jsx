import React from 'react';
import { Save, Play, Loader, Plus, Folder, X } from 'lucide-react';
import Editor from '@monaco-editor/react';

const EditorArea = ({
    openTabs,
    activeFile,
    handleSelectFile,
    getFileIcon,
    handleCloseTab,
    project,
    handleSaveFile,
    handleRunCode,
    isRunning,
    code,
    handleEditorChange,
    handleEditorMount,
    getLanguageFromFilename,
    setShowCreateFile,
    setShowCreateFolder,
    isOwner,
    collabEmail,
    setCollabEmail,
    handleAddCollaborator,
    addingCollab
}) => {
    return (
        <div className="workspace-main glass-panel">
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
                    {isOwner && (
                        <div className="invite-editor-group" style={{ marginRight: '16px' }}>
                            <form onSubmit={handleAddCollaborator} style={{ display: 'flex', alignItems: 'center' }}>
                                <input
                                    type="email"
                                    className="vsc-input"
                                    placeholder="Invite collaborator (email)..."
                                    value={collabEmail || ''}
                                    onChange={(e) => setCollabEmail(e.target.value)}
                                    style={{ height: '32px', width: '180px' }}
                                />
                                <button type="submit" className="vsc-btn" disabled={addingCollab} style={{ height: '32px', width: '32px', padding: 0 }}>
                                    {addingCollab ? <Loader size={14} className="spin" /> : <Plus size={16} />}
                                </button>
                            </form>
                        </div>
                    )}
                    <button className="vsc-btn vsc-btn-outline" onClick={handleSaveFile} title="Save File (Ctrl+S)" style={{ padding: '4px 12px', fontSize: '12px', height: '28px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Save size={14} /> Save
                    </button>
                    <button
                        className="vsc-btn vsc-btn-primary"
                        onClick={handleRunCode}
                        title="Run Code"
                        disabled={isRunning}
                        style={{ padding: '4px 16px', fontSize: '13px', height: '28px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold' }}
                    >
                        {isRunning ? <><Loader size={14} className="spin" /> Executing...</> : <><Play size={14} fill="currentColor" /> Run</>}
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
        </div>
    );
};

export default EditorArea;
