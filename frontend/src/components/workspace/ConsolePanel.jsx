import React from 'react';
import { Terminal, Trash2 } from 'lucide-react';

const ConsolePanel = ({
    isResizingConsole, setIsResizingConsole,
    consoleHeight,
    activeConsoleTab, setActiveConsoleTab,
    previewHtml, setPreviewHtml,
    output, setOutput,
    consoleInput, setConsoleInput,
    user, activeFile
}) => {
    return (
        <>
            <div
                className={`resizer-y ${isResizingConsole ? 'resizing' : ''}`}
                onMouseDown={() => setIsResizingConsole(true)}
            ></div>
            <div className="workspace-console glass-panel" style={{ height: `${consoleHeight}px` }}>
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
                                    PS C:\Users\{user?.username || user?.name}&gt; {activeFile ? `run ${activeFile.filename}` : ''}
                                    {'\n'}Ready. Click "Run". C++ code with cin requires input in the left pane.
                                </span>}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

export default ConsolePanel;
