import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { SocketProvider } from './context/SocketProvider.jsx';
import { Toaster } from 'react-hot-toast';

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <SocketProvider>
            <App />
            <Toaster
                position="top-right"
                toastOptions={{
                    duration: 3000,
                    style: {
                        background: '#1a1a2e',
                        color: '#e8e8f0',
                        border: '1px solid rgba(255,255,255,0.06)',
                        borderRadius: '12px',
                        fontSize: '13px',
                        fontFamily: 'Inter, sans-serif',
                    },
                    success: {
                        iconTheme: {
                            primary: '#00b894',
                            secondary: '#1a1a2e',
                        },
                    },
                    error: {
                        iconTheme: {
                            primary: '#ff6b6b',
                            secondary: '#1a1a2e',
                        },
                    },
                }}
            />
        </SocketProvider>
    </React.StrictMode>
);
