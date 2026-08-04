import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import AuthProvider from './context/AuthContext';
import GameProvider from './context/GameContext';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import './App.css';
import { Toaster } from 'react-hot-toast';

// Lazy-loaded routes for code splitting
const LandingPage = React.lazy(() => import('./pages/LandingPage'));
const RoomLobby = React.lazy(() => import('./pages/RoomLobby'));
const CreateRoom = React.lazy(() => import('./pages/CreateRoom'));
const JoinRoom = React.lazy(() => import('./pages/JoinRoom'));
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const ForgotPasswordPage = React.lazy(() => import('./pages/ForgotPasswordPage'));
const HowToPlay = React.lazy(() => import('./pages/HowToPlay'));
const Game = React.lazy(() => import('./pages/Game'));
const NotFound = React.lazy(() => import('./components/NotFound'));

// Neo-brutalist loading fallback
const PageLoader: React.FC = () => (
  <div className="min-h-screen bg-[#FFDDAB] flex items-center justify-center p-4">
    <div className="bg-white rounded-2xl p-6 border-2 border-[#131010] shadow-[4px_4px_0px_0px_#131010] text-center">
      <div className="w-8 h-8 border-4 border-[#131010] border-t-[#5F8B4C] rounded-full animate-spin mx-auto mb-3" />
      <p className="font-poppins font-bold text-xs text-[#131010]">Loading...</p>
    </div>
  </div>
);

function App() {
  return (
    <AuthProvider>
      <GameProvider>
        <ErrorBoundary>
          <Router>
            <Toaster
              position="top-right"
              toastOptions={{
                style: {
                  background: 'white',
                  color: '#131010',
                  border: '2px solid #131010',
                  boxShadow: '4px 4px 0px 0px #131010',
                  borderRadius: '12px',
                  padding: '10px 16px',
                  fontSize: '13px',
                  fontWeight: '700',
                  fontFamily: 'Poppins, sans-serif',
                  maxWidth: '280px',
                },
                success: {
                  iconTheme: {
                    primary: '#5F8B4C',
                    secondary: 'white',
                  },
                },
                error: {
                  iconTheme: {
                    primary: '#D98324',
                    secondary: 'white',
                  },
                },
                duration: 3000,
              }}
            />

            <div className="min-h-screen bg-slate-900 text-white">
              <Suspense fallback={<PageLoader />}>
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
                  <Route path="/join/:roomCode" element={<JoinRoom />} />
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
                    path="/game/:roomId"
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
              </Suspense>
            </div>
          </Router>
        </ErrorBoundary>
      </GameProvider>
    </AuthProvider>
  );
}

export default App;
