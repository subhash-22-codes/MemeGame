import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import RoomLobby from './pages/RoomLobby';
import CreateRoom from './pages/CreateRoom';
import JoinRoom from './pages/JoinRoom';
import Dashboard from './pages/Dashboard';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import AuthProvider from './context/AuthContext';
import GameProvider from './context/GameContext';
import ProtectedRoute from './components/ProtectedRoute';
import HowToPlay from './pages/HowToPlay';
import Game from './pages/Game';
// 👈 Import the navigation listener
import './App.css';
import { Toaster } from 'react-hot-toast';

function App() {
  return (
    <AuthProvider>
      <GameProvider>
        <Router>
          {/* 👈 Mounted here so it's active across the app */}
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: 'white',
                color: '#131010',
                fontFamily: 'Courier, monospace',
                borderRadius: '12px',
                padding: '12px 16px',
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.1)',
              },
              success: {
                iconTheme: {
                  primary: '#5F8B4C',
                  secondary: '#FFDDAB',
                },
              },
              error: {
                iconTheme: {
                  primary: '#D98324',
                  secondary: '#FFDDAB',
                },
              },
            }}
          />

          <div className="min-h-screen bg-slate-900 text-white">
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route
                path="/create"
                element={
                  <ProtectedRoute>
                    <CreateRoom />
                  </ProtectedRoute>
                }
              />
              <Route path="/join" element={<JoinRoom />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/room/:roomId"
                element={
                  <ProtectedRoute>
                    <RoomLobby />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/game/:roomId" // ✅ Changed to dynamic route
                element={
                  <ProtectedRoute>
                    <Game />
                  </ProtectedRoute>
                }
              />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/HowToPlay" element={<HowToPlay />} />
              <Route path="*" element={<div className="text-center mt-20 text-xl">404: Page Not Found</div>} />

            </Routes>
          </div>
        </Router>
      </GameProvider>
    </AuthProvider>
  );
}

export default App;
