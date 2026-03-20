import React from 'react';
import { Phone, PhoneOff, Mic, MicOff, PhoneCall, X } from 'lucide-react';

const VoicePanel = ({
    isInCall,
    isMuted,
    callParticipants,
    incomingCall,
    callActive,
    startCall,
    acceptCall,
    rejectCall,
    leaveCall,
    toggleMute,
    getInitials,
}) => {
    return (
        <div className="voice-panel">
            <div className="panel-header" style={{ borderBottom: '1px solid #333333' }}>
                <h3>🎧 VOICE</h3>
            </div>

            {/* Incoming Call Banner */}
            {incomingCall && !isInCall && (
                <div className="voice-incoming">
                    <div className="voice-incoming-info">
                        <PhoneCall size={16} className="voice-ring" />
                        <span>{incomingCall.name} is calling...</span>
                    </div>
                    <div className="voice-incoming-actions">
                        <button
                            className="voice-btn voice-btn-accept"
                            onClick={acceptCall}
                            title="Join Call"
                        >
                            <Phone size={14} />
                        </button>
                        <button
                            className="voice-btn voice-btn-reject"
                            onClick={rejectCall}
                            title="Decline"
                        >
                            <X size={14} />
                        </button>
                    </div>
                </div>
            )}

            {/* Call Controls */}
            <div className="voice-controls">
                {!isInCall ? (
                    <button
                        className="voice-btn voice-btn-start"
                        onClick={startCall}
                    >
                        <Phone size={16} />
                        <span>{callActive ? 'Join Call' : 'Start Call'}</span>
                    </button>
                ) : (
                    <div className="voice-active-controls">
                        <button
                            className={`voice-btn voice-btn-mute ${isMuted ? 'muted' : ''}`}
                            onClick={toggleMute}
                            title={isMuted ? 'Unmute' : 'Mute'}
                        >
                            {isMuted ? <MicOff size={16} /> : <Mic size={16} />}
                        </button>
                        <button
                            className="voice-btn voice-btn-end"
                            onClick={leaveCall}
                            title="Leave Call"
                        >
                            <PhoneOff size={16} />
                        </button>
                    </div>
                )}
            </div>

            {/* Participants in Call */}
            {(isInCall || callActive) && callParticipants.length > 0 && (
                <div className="voice-participants">
                    <div className="voice-participants-label">
                        In Call ({callParticipants.length})
                    </div>
                    {callParticipants.map((p) => (
                        <div key={p.socketId || p.userId} className="voice-participant">
                            <div className="voice-participant-avatar">
                                {getInitials(p.userName)}
                            </div>
                            <span className="voice-participant-name">{p.userName}</span>
                            {p.isMuted && (
                                <MicOff size={12} className="voice-participant-muted" />
                            )}
                            <div className="voice-participant-wave">
                                {!p.isMuted && (
                                    <>
                                        <span className="wave-bar"></span>
                                        <span className="wave-bar"></span>
                                        <span className="wave-bar"></span>
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Status when not in call */}
            {!isInCall && !callActive && (
                <div className="voice-empty">
                    <Phone size={20} style={{ opacity: 0.3, marginBottom: '8px' }} />
                    <p>No active voice call</p>
                    <p style={{ fontSize: '11px', opacity: 0.5 }}>Click "Start Call" to begin</p>
                </div>
            )}
        </div>
    );
};

export default VoicePanel;
