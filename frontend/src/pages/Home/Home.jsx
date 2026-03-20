import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import { Zap, Code, Users, Play, Terminal, GitBranch, MessageSquare, Shield, ArrowRight, Sparkles } from 'lucide-react';

const Home = () => {
    const navigate = useNavigate();
    const { user } = useAuthStore();

    return (
        <div className="home-page">
            {/* ========== NAVBAR ========== */}
            <nav className="home-nav">
                <div className="home-nav-brand">
                    <div className="home-nav-logo">
                        <Zap size={22} />
                    </div>
                    <span className="home-nav-name">CodeSync</span>
                </div>
                <div className="home-nav-links">
                    <a href="#features">Features</a>
                    <a href="#languages">Languages</a>
                    <a href="#collaboration">Collaboration</a>
                </div>
                <div className="home-nav-actions">
                    {user ? (
                        <button className="btn btn-primary" onClick={() => navigate('/dashboard')}>
                            Go to Dashboard <ArrowRight size={16} />
                        </button>
                    ) : (
                        <>
                            <Link to="/login" className="btn btn-ghost">Sign In</Link>
                            <Link to="/register" className="btn btn-primary">
                                Get Started <ArrowRight size={16} />
                            </Link>
                        </>
                    )}
                </div>
            </nav>

            {/* ========== HERO SECTION ========== */}
            <section className="hero-section">
                <div className="hero-badge">
                    <Sparkles size={14} />
                    <span>Production-Grade Code Platform</span>
                </div>
                <h1 className="hero-title">
                    Code. Collaborate.
                    <span className="gradient-text"> Execute.</span>
                </h1>
                <p className="hero-subtitle">
                    A VS Code-level editor with real-time collaboration, Docker-sandboxed 
                    code execution, and team chat — all in your browser.
                </p>
                <div className="hero-actions">
                    <Link to={user ? "/dashboard" : "/register"} className="btn btn-primary btn-lg">
                        <Play size={18} /> Start Coding
                    </Link>
                    <a href="#features" className="btn btn-secondary btn-lg">
                        Explore Features
                    </a>
                </div>

                {/* Hero Code Preview */}
                <div className="hero-preview">
                    <div className="preview-header">
                        <div className="preview-dots">
                            <span className="dot red"></span>
                            <span className="dot yellow"></span>
                            <span className="dot green"></span>
                        </div>
                        <span className="preview-title">main.js — CodeSync Editor</span>
                    </div>
                    <div className="preview-code">
                        <div className="code-line"><span className="line-num">1</span><span className="keyword">const</span> <span className="variable">greeting</span> = <span className="string">"Hello, CodeSync!"</span>;</div>
                        <div className="code-line"><span className="line-num">2</span></div>
                        <div className="code-line"><span className="line-num">3</span><span className="keyword">function</span> <span className="function-name">collaborate</span>(<span className="variable">team</span>) {'{'}</div>
                        <div className="code-line"><span className="line-num">4</span>    <span className="keyword">return</span> team.<span className="function-name">map</span>(<span className="variable">member</span> =&gt; {'{'}</div>
                        <div className="code-line"><span className="line-num">5</span>        <span className="variable">member</span>.<span className="variable">productivity</span> *= <span className="number">10</span>;</div>
                        <div className="code-line"><span className="line-num">6</span>        <span className="keyword">return</span> <span className="variable">member</span>;</div>
                        <div className="code-line"><span className="line-num">7</span>    {'}'});</div>
                        <div className="code-line"><span className="line-num">8</span>{'}'}</div>
                        <div className="code-line"><span className="line-num">9</span></div>
                        <div className="code-line"><span className="line-num">10</span><span className="comment">// 🚀 Execute instantly in Docker</span></div>
                        <div className="code-line"><span className="line-num">11</span>console.<span className="function-name">log</span>(<span className="variable">greeting</span>);</div>
                        <div className="cursor-blink"></div>
                    </div>
                    <div className="preview-terminal">
                        <span className="terminal-prompt">$ node main.js</span>
                        <span className="terminal-output">Hello, CodeSync!</span>
                        <span className="terminal-success">✓ Executed in 24ms (Docker sandbox)</span>
                    </div>
                </div>
            </section>

            {/* ========== FEATURES SECTION ========== */}
            <section className="features-section" id="features">
                <div className="section-heading">
                    <h2>Everything You Need to Build</h2>
                    <p>A complete development environment in your browser</p>
                </div>

                <div className="features-grid">
                    <div className="feature-card">
                        <div className="feature-icon purple"><Code size={24} /></div>
                        <h3>VS Code Editor</h3>
                        <p>Monaco-powered editor with syntax highlighting, IntelliSense, multi-file tabs, and auto-save.</p>
                    </div>

                    <div className="feature-card">
                        <div className="feature-icon blue"><Users size={24} /></div>
                        <h3>Real-Time Collaboration</h3>
                        <p>Live code sync, cursor tracking, user presence, and typing indicators — like VS Code Live Share.</p>
                    </div>

                    <div className="feature-card">
                        <div className="feature-icon green"><Terminal size={24} /></div>
                        <h3>Docker Execution</h3>
                        <p>Run JavaScript, Python, and C++ in isolated Docker containers. Secure, sandboxed, ephemeral.</p>
                    </div>

                    <div className="feature-card">
                        <div className="feature-icon orange"><MessageSquare size={24} /></div>
                        <h3>Team Chat</h3>
                        <p>Real-time project-based messaging with @mentions, message history, and instant delivery.</p>
                    </div>

                    <div className="feature-card">
                        <div className="feature-icon pink"><GitBranch size={24} /></div>
                        <h3>Version History</h3>
                        <p>Save, compare, and restore file versions. Never lose your work with automatic versioning.</p>
                    </div>

                    <div className="feature-card">
                        <div className="feature-icon cyan"><Shield size={24} /></div>
                        <h3>Secure by Design</h3>
                        <p>JWT auth, role-based access control, sandboxed execution, and input sanitization built-in.</p>
                    </div>
                </div>
            </section>

            {/* ========== LANGUAGES SECTION ========== */}
            <section className="languages-section" id="languages">
                <div className="section-heading">
                    <h2>Run Code in Multiple Languages</h2>
                    <p>Each execution runs in an isolated Docker container</p>
                </div>

                <div className="languages-grid">
                    <div className="language-card">
                        <div className="lang-icon">🟨</div>
                        <h4>JavaScript</h4>
                        <p>Node.js 20</p>
                    </div>
                    <div className="language-card">
                        <div className="lang-icon">🐍</div>
                        <h4>Python</h4>
                        <p>Python 3.12</p>
                    </div>
                    <div className="language-card">
                        <div className="lang-icon">⚙️</div>
                        <h4>C++</h4>
                        <p>g++ (Alpine)</p>
                    </div>
                </div>
            </section>

            {/* ========== COLLABORATION SECTION ========== */}
            <section className="collab-section" id="collaboration">
                <div className="section-heading">
                    <h2>Built for Teams</h2>
                    <p>Invite collaborators, assign roles, and build together</p>
                </div>

                <div className="collab-features">
                    <div className="collab-feature">
                        <div className="collab-number">01</div>
                        <h3>Create a Project</h3>
                        <p>Set up your workspace with a name, description, and language preference.</p>
                    </div>
                    <div className="collab-feature">
                        <div className="collab-number">02</div>
                        <h3>Invite Your Team</h3>
                        <p>Add collaborators by email. Assign Owner, Editor, or Viewer roles.</p>
                    </div>
                    <div className="collab-feature">
                        <div className="collab-number">03</div>
                        <h3>Code Together</h3>
                        <p>See each other's cursors, chat in real-time, and run code instantly.</p>
                    </div>
                </div>
            </section>

            {/* ========== CTA SECTION ========== */}
            <section className="cta-section">
                <h2>Ready to Start Coding?</h2>
                <p>Join CodeSync and experience the future of collaborative development.</p>
                <Link to={user ? "/dashboard" : "/register"} className="btn btn-primary btn-lg">
                    <Zap size={18} /> Launch CodeSync
                </Link>
            </section>

            {/* ========== FOOTER ========== */}
            <footer className="home-footer">
                <div className="footer-brand">
                    <Zap size={18} />
                    <span>CodeSync</span>
                </div>
                <p>Production-grade live code editor & collaboration platform</p>
                <div className="footer-tech">
                    Built with React • Node.js • MongoDB • Socket.IO • Docker
                </div>
            </footer>
        </div>
    );
};

export default Home;
