import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import Dashboard from './pages/Dashboard/Dashboard';
import Workspace from './pages/Workspace/Workspace';
import Settings from './pages/Settings/Settings';
import Activity from './pages/Activity/Activity';
import './index.css';

function App() {
    return (
        <Router>
            <div className="app-container">
                <Routes>
                    {/* Public Routes (mapped to auth.controller) */}
                    <Route path="/" element={<Navigate to="/login" replace />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />

                    {/* Protected Routes */}
                    <Route path="/dashboard" element={<Dashboard />} />     {/* mapped to dashboard.controller */}
                    <Route path="/workspace/:projectId" element={<Workspace />} /> {/* mapped to editor.controller, chat.controller, sockets */}
                    <Route path="/settings" element={<Settings />} />       {/* mapped to settings.controller / user.controller */}
                    <Route path="/activity" element={<Activity />} />       {/* mapped to activity.controller / history.controller */}

                    {/* Fallback */}
                    <Route path="*" element={<div>404 Not Found</div>} />
                </Routes>
            </div>
        </Router>
    );
}

export default App;
