import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import Dashboard from './pages/Dashboard/Dashboard';
import Workspace from './pages/Workspace/Workspace';
import Settings from './pages/Settings/Settings';
import Activity from './pages/Activity/Activity';
import Home from './pages/Home/Home';
import './index.css';

function App() {
    return (
        <Router>
            <div className="app-container">
                <Routes>
                    {/* Public Routes */}
                    <Route path="/" element={<Home />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />

                    {/* Protected Routes */}
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/workspace/:projectId" element={<Workspace />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/activity" element={<Activity />} />

                    {/* Fallback */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </div>
        </Router>
    );
}

export default App;
