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
import NotFound from './components/NotFound';
// 👈 Import the navigation listener
import './App.css';
import { Toaster } from 'react-hot-toast';

function App() {
  return (
    <AuthProvider>
      <GameProvider>
        <Router>
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                // THE BENTO SOUL
                background: 'white',
                color: '#131010',
                border: '2px solid #131010',
                boxShadow: '4px 4px 0px 0px #131010',
                
                // THE WISE SCALE
                borderRadius: '12px',
                padding: '10px 16px', // 10% tighter padding
                fontSize: '13px',
                fontWeight: '700',
                fontFamily: 'Poppins, sans-serif', // Poppins for fast reading
                maxWidth: '280px',
              },
              success: {
                iconTheme: {
                  primary: '#5F8B4C', // Our Green
                  secondary: 'white',
                },
              },
              error: {
                iconTheme: {
                  primary: '#D98324', // Our Orange
                  secondary: 'white',
                },
              },
              // Adding a small duration so it's not annoying
              duration: 3000,
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
              <Route path="*" element={<NotFound />} />

            </Routes>
          </div>
        </Router>
      </GameProvider>
    </AuthProvider>
  );
}

export default App;
