import { useState, useRef, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Phone } from 'lucide-react';

const ICE_SERVERS = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        {
            urls: "turn:openrelay.metered.ca:80",
            username: "openrelayproject",
            credential: "openrelayproject"
        },
        {
            urls: "turn:openrelay.metered.ca:443",
            username: "openrelayproject",
            credential: "openrelayproject"
        },
        {
            urls: "turn:openrelay.metered.ca:443?transport=tcp",
            username: "openrelayproject",
            credential: "openrelayproject"
        }
    ],
};

const useVoiceCall = ({ socket, projectId, user }) => {
    const [isInCall, setIsInCall] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [callParticipants, setCallParticipants] = useState([]);
    const [incomingCall, setIncomingCall] = useState(null);
    const [callActive, setCallActive] = useState(false);

    const isInCallRef = useRef(false);
    const localStreamRef = useRef(null);
    const peerConnectionsRef = useRef(new Map()); // socketId → RTCPeerConnection
    const remoteAudiosRef = useRef(new Map()); // socketId → HTMLAudioElement

    // ──────── Get user microphone ────────
    const getLocalStream = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            localStreamRef.current = stream;
            return stream;
        } catch (err) {
            toast.error('Microphone access denied. Please allow microphone access.');
            console.error('getUserMedia error:', err);
            return null;
        }
    }, []);

    // ──────── Create a peer connection for a remote user ────────
    const createPeerConnection = useCallback((targetSocketId, targetUserId, targetName) => {
        if (peerConnectionsRef.current.has(targetSocketId)) {
            return peerConnectionsRef.current.get(targetSocketId);
        }

        const pc = new RTCPeerConnection(ICE_SERVERS);

        // Add local audio tracks to the connection
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach((track) => {
                pc.addTrack(track, localStreamRef.current);
            });
        }

        // Handle incoming audio from the remote peer
        pc.ontrack = (event) => {
            const [remoteStream] = event.streams;
            let audio = remoteAudiosRef.current.get(targetSocketId);
            if (!audio) {
                audio = new Audio();
                audio.autoplay = true;
                // Append it to document body to ensure playback across different browsers
                document.body.appendChild(audio);
                remoteAudiosRef.current.set(targetSocketId, audio);
            }
            audio.srcObject = remoteStream;
            audio.play().catch(err => console.error('Audio play failed:', err));
        };

        // Send ICE candidates to the remote peer via signaling server
        pc.onicecandidate = (event) => {
            if (event.candidate && socket) {
                socket.emit('ice-candidate', {
                    targetSocketId,
                    candidate: event.candidate,
                });
            }
        };

        pc.onconnectionstatechange = () => {
            if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
                cleanupPeer(targetSocketId);
            }
        };

        peerConnectionsRef.current.set(targetSocketId, pc);
        return pc;
    }, [socket]);

    // ──────── Cleanup a single peer ────────
    const cleanupPeer = useCallback((socketId) => {
        const pc = peerConnectionsRef.current.get(socketId);
        if (pc) {
            pc.close();
            peerConnectionsRef.current.delete(socketId);
        }
        const audio = remoteAudiosRef.current.get(socketId);
        if (audio) {
            audio.srcObject = null;
            if (audio.parentNode) {
                audio.parentNode.removeChild(audio);
            }
            remoteAudiosRef.current.delete(socketId);
        }
    }, []);

    // ──────── Cleanup all peers + local stream ────────
    const cleanupAll = useCallback(() => {
        peerConnectionsRef.current.forEach((pc, socketId) => {
            pc.close();
            const audio = remoteAudiosRef.current.get(socketId);
            if (audio) {
                audio.srcObject = null;
                if (audio.parentNode) {
                    audio.parentNode.removeChild(audio);
                }
            }
        });
        peerConnectionsRef.current.clear();
        remoteAudiosRef.current.clear();

        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach((t) => t.stop());
            localStreamRef.current = null;
        }
    }, []);

    // ──────── Start / Join a call ────────
    const startCall = useCallback(async () => {
        const stream = await getLocalStream();
        if (!stream) return;

        setIsInCall(true);
        setIsMuted(false);

        if (socket) {
            socket.emit('call-initiate', { projectId });
        }
    }, [socket, projectId, getLocalStream]);

    const acceptCall = useCallback(async () => {
        const stream = await getLocalStream();
        if (!stream) return;

        setIsInCall(true);
        setIsMuted(false);
        setIncomingCall(null);
        toast.dismiss(); // Ensure any toast modal is fully cleared

        if (socket) {
            socket.emit('call-accept', { projectId });
        }
    }, [socket, projectId, getLocalStream]);

    const rejectCall = useCallback(() => {
        setIncomingCall(null);
        toast.dismiss(); // Ensure any toast modal is fully cleared
        if (socket) {
            socket.emit('call-reject', { projectId });
        }
    }, [socket, projectId]);

    // ──────── Leave the call ────────
    const leaveCall = useCallback(() => {
        if (socket) {
            socket.emit('call-leave', { projectId });
        }
        cleanupAll();
        setIsInCall(false);
        setIsMuted(false);
        setCallParticipants([]);
        setCallActive(false);
    }, [socket, projectId, cleanupAll]);

    // Sync Ref with State
    useEffect(() => {
        isInCallRef.current = isInCall;
    }, [isInCall]);

    // ──────── Toggle mute ────────
    const toggleMute = useCallback(() => {
        if (localStreamRef.current) {
            const audioTrack = localStreamRef.current.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setIsMuted(!audioTrack.enabled);
                if (socket) {
                    socket.emit('call-toggle-mute', { projectId, isMuted: !audioTrack.enabled });
                }
            }
        }
    }, [socket, projectId]);

    // ──────── Socket event handlers ────────
    useEffect(() => {
        if (!socket) return;

        // Incoming call notification
        const handleCallIncoming = ({ projectId: pid, caller }) => {
            // Using Ref to check latest value inside the listener
            if (!isInCallRef.current) {
                setIncomingCall(caller);
                setCallActive(true);
                // System toast for extra visibility
                toast(`Incoming voice call from ${caller.name}`, { icon: '📞', duration: 10000 });
            }
        };

        // When there's already an active call in the project
        const handleCallActive = ({ participants }) => {
            setCallActive(true);
            setCallParticipants(participants || []);
            
            if (!isInCallRef.current && participants && participants.length > 0) {
                const head = participants[0];
                const callerProfile = { name: head.userName, _id: head.userId };
                setIncomingCall(callerProfile);
            }
        };

        // Receive the participant list after joining
        const handleCallParticipants = async ({ participants }) => {
            setCallParticipants(participants);
            for (const p of participants) {
                if (p.socketId === socket.id) continue;
                const pc = createPeerConnection(p.socketId, p.userId, p.userName);
                try {
                    const offer = await pc.createOffer();
                    await pc.setLocalDescription(offer);
                    socket.emit('webrtc-offer', { targetSocketId: p.socketId, offer });
                } catch (err) { console.error('Error creating offer:', err); }
            }
        };

        // New user joined the call
        const handleCallUserJoined = ({ user: joinedUser, participants }) => {
            setCallParticipants(participants);
            toast.success(`${joinedUser.name} joined the call`);
        };

        // Receive a WebRTC offer
        const handleWebRTCOffer = async ({ offer, from }) => {
            const pc = createPeerConnection(from.socketId, from.userId, from.name);
            try {
                await pc.setRemoteDescription(new RTCSessionDescription(offer));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                socket.emit('webrtc-answer', { targetSocketId: from.socketId, answer });
            } catch (err) { console.error('Error handling offer:', err); }
        };

        // Receive a WebRTC answer
        const handleWebRTCAnswer = async ({ answer, from }) => {
            const pc = peerConnectionsRef.current.get(from.socketId);
            if (pc) {
                try { await pc.setRemoteDescription(new RTCSessionDescription(answer)); } 
                catch (err) { console.error('Error handling answer:', err); }
            }
        };

        // Receive an ICE candidate
        const handleICECandidate = async ({ candidate, from }) => {
            const pc = peerConnectionsRef.current.get(from.socketId);
            if (pc && candidate) {
                try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } 
                catch (err) { console.error('Error adding ICE candidate:', err); }
            }
        };

        // User left the call
        const handleCallUserLeft = ({ user: leftUser, remainingParticipants }) => {
            cleanupPeer(leftUser.socketId);
            setCallParticipants((prev) => prev.filter((p) => p.socketId !== leftUser.socketId));
            toast(`${leftUser.name} left the call`, { icon: '📞' });
            if (remainingParticipants === 0) setCallActive(false);
        };

        // User toggled mute
        const handleCallUserMuted = ({ user: mutedUser, isMuted: muted }) => {
            setCallParticipants((prev) =>
                prev.map((p) => (p.userId === mutedUser._id ? { ...p, isMuted: muted } : p))
            );
        };

        // Call ended
        const handleCallEnded = () => {
            cleanupAll();
            setIsInCall(false);
            setIsMuted(false);
            setCallParticipants([]);
            setCallActive(false);
            setIncomingCall(null);
            toast.dismiss();
        };

        // Call rejected
        const handleCallRejected = ({ user: rejectedUser }) => {
            toast(`${rejectedUser.name} declined the call`, { icon: '❌' });
            setIncomingCall(null);
        };

        socket.on('call-incoming', handleCallIncoming);
        socket.on('call-active', handleCallActive);
        socket.on('call-participants', handleCallParticipants);
        socket.on('call-user-joined', handleCallUserJoined);
        socket.on('webrtc-offer', handleWebRTCOffer);
        socket.on('webrtc-answer', handleWebRTCAnswer);
        socket.on('ice-candidate', handleICECandidate);
        socket.on('call-user-left', handleCallUserLeft);
        socket.on('call-user-muted', handleCallUserMuted);
        socket.on('call-ended', handleCallEnded);
        socket.on('call-rejected', handleCallRejected);

        return () => {
            socket.off('call-incoming', handleCallIncoming);
            socket.off('call-active', handleCallActive);
            socket.off('call-participants', handleCallParticipants);
            socket.off('call-user-joined', handleCallUserJoined);
            socket.off('webrtc-offer', handleWebRTCOffer);
            socket.off('webrtc-answer', handleWebRTCAnswer);
            socket.off('ice-candidate', handleICECandidate);
            socket.off('call-user-left', handleCallUserLeft);
            socket.off('call-user-muted', handleCallUserMuted);
            socket.off('call-ended', handleCallEnded);
            socket.off('call-rejected', handleCallRejected);
        };
    }, [socket, projectId, createPeerConnection, cleanupPeer, cleanupAll]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            cleanupAll();
        };
    }, [cleanupAll]);

    return {
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
    };
};

export default useVoiceCall;
