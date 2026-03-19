import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import useAuthStore from '../store/authStore';

const SocketContext = createContext(null);

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);
    const accessToken = useAuthStore((state) => state.accessToken);
    const user = useAuthStore((state) => state.user);

    useEffect(() => {
        // Only connect when we have a valid token and user
        if (accessToken && user) {
            const socketInstance = io(
                import.meta.env.VITE_BACKEND_URL?.replace('/api/v1', '') || 'http://localhost:8000',
                {
                    auth: {
                        token: accessToken,
                    },
                    transports: ['websocket', 'polling'],
                }
            );

            socketInstance.on('connect', () => {
                console.log('🟢 Socket connected:', socketInstance.id);
            });

            socketInstance.on('connect_error', (err) => {
                console.error('🔴 Socket connection error:', err.message);
            });

            setSocket(socketInstance);

            return () => {
                socketInstance.disconnect();
                setSocket(null);
            };
        } else {
            // No token — disconnect if socket exists
            if (socket) {
                socket.disconnect();
                setSocket(null);
            }
        }
    }, [accessToken, user]);

    return (
        <SocketContext.Provider value={{ socket }}>
            {children}
        </SocketContext.Provider>
    );
};
