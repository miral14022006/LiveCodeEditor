import { Files, Search, Play, Settings, UserCircle, Phone, Users } from 'lucide-react';

const ActivityBar = ({ activeSidebarTab, setActiveSidebarTab, navigate }) => {
    return (
        <div className="activity-bar glass-panel">
            <div className={`activity-item ${activeSidebarTab === 'explorer' ? 'active' : ''}`} onClick={() => setActiveSidebarTab('explorer')} title="Explorer">
                <Files size={24} strokeWidth={1.5} />
            </div>
            <div className={`activity-item ${activeSidebarTab === 'search' ? 'active' : ''}`} onClick={() => setActiveSidebarTab('search')} title="Search">
                <Search size={24} strokeWidth={1.5} />
            </div>
            <div className={`activity-item ${activeSidebarTab === 'run' ? 'active' : ''}`} onClick={() => setActiveSidebarTab('run')} title="Run and Debug">
                <Play size={24} strokeWidth={1.5} />
            </div>
            <div className={`activity-item ${activeSidebarTab === 'collab' ? 'active' : ''}`} onClick={() => setActiveSidebarTab('collab')} title="Collaborators">
                <Users size={24} strokeWidth={1.5} />
            </div>
            <div className={`activity-item ${activeSidebarTab === 'call' ? 'active' : ''}`} onClick={() => setActiveSidebarTab('call')} title="Voice Calling">
                <Phone size={24} strokeWidth={1.5} />
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
    );
};

export default ActivityBar;
