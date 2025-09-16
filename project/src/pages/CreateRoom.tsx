import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Share2, Settings, Users, Clock, Play, Info, CheckCircle, Sparkles } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { useAuth } from '../context/AuthContext';

const CreateRoom: React.FC = () => {
  const navigate = useNavigate();
  const { createRoom, gameState, connectionState } = useGame();
  const { user } = useAuth();
  
  const [totalRounds, setTotalRounds] = useState(10);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');
  const [buttonHover, setButtonHover] = useState(false);
  
  const handleCreateRoom = async () => {
    if (!user) {
      setError('You must be logged in to create a room');
      return;
    }

    if (connectionState !== 'connected') {
      setError('Connecting to server... please wait a moment and try again.');
      return;
    }

    setIsCreating(true);
    setError('');

    try {
      console.log('[CREATE_ROOM] Attempting to create room with settings:', {
        rounds: totalRounds,
        roundsPerJudge: 5, // Fixed default value
      });

      const roomId = await createRoom({
        rounds: totalRounds,
        roundsPerJudge: 5, // Fixed default value
      });

      console.log('[CREATE_ROOM] Room created successfully with ID:', roomId);
      // Navigate immediately; GameContext will populate after socket event
      navigate(`/room/${roomId}`, { state: { isHost: true } });

    } catch (error) {
      console.error('Failed to create room:', error);
      setError(error instanceof Error ? error.message : 'Failed to create room. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#FFDDAB] via-[#FFDDAB]/90 to-[#FFDDAB]/80 flex items-center justify-center p-4">
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-white/30 text-center max-w-sm w-full transform transition-all duration-500 hover:scale-105">
          <div className="w-16 h-16 bg-gradient-to-br from-[#5F8B4C] to-[#7BA05C] rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
            <Info className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-[#131010] mb-2" style={{ fontFamily: 'Poppins, sans-serif' }}>
            Authentication Required
          </h2>
          <p className="text-[#131010]/70 mb-6" style={{ fontFamily: 'Courier, monospace' }}>
            Please log in to create a game room
          </p>
          <button
            onClick={() => navigate('/login')}
            className="w-full bg-gradient-to-r from-[#5F8B4C] to-[#7BA05C] text-white py-3 px-6 rounded-xl font-semibold transition-all duration-300 hover:shadow-lg hover:scale-105 transform"
            style={{ fontFamily: 'Poppins, sans-serif' }}
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFDDAB] via-[#FFDDAB]/90 to-[#FFDDAB]/80 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header Section */}
        <div className="mb-8 animate-fade-in">
          <button
            onClick={() => navigate('/dashboard')}
            className="group flex items-center text-[#131010]/70 hover:text-[#5F8B4C] transition-all duration-300 mb-6 font-medium transform hover:-translate-x-1"
            style={{ fontFamily: 'Courier, monospace' }}
          >
            <ArrowLeft size={20} className="mr-2 transition-transform duration-300 group-hover:-translate-x-1" />
            Back to Dashboard
          </button>
          
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-[#5F8B4C] to-[#7BA05C] rounded-full flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-4xl lg:text-5xl font-bold text-[#D98324] tracking-tight" style={{ fontFamily: 'Poppins, sans-serif' }}>
                Create Game Room
              </h1>
            </div>
            <p className="text-lg text-[#131010]/80 max-w-2xl mx-auto leading-relaxed" style={{ fontFamily: 'Courier, monospace' }}>
              Configure your game settings and invite players to join your session
            </p>
          </div>
        </div>
        
        {/* Error Alert */}
        {error && (
          <div className="mb-8 max-w-2xl mx-auto animate-slide-down">
            <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-r-xl shadow-sm">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Info className="h-5 w-5 text-red-400" />
                </div>
                <div className="ml-3">
                  <p className="text-red-700 font-medium" style={{ fontFamily: 'Courier, monospace' }}>
                    {error}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Configuration Panel */}
          <div className="lg:col-span-2 animate-fade-in-up">
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden transform transition-all duration-300 hover:shadow-2xl">
              {/* Panel Header */}
              <div className="bg-gradient-to-r from-[#5F8B4C] to-[#7BA05C] px-6 py-5">
                <h2 className="text-xl font-bold text-white flex items-center" style={{ fontFamily: 'Poppins, sans-serif' }}>
                  <Settings size={22} className="mr-3" />
                  Game Configuration
                </h2>
                <p className="text-white/90 mt-1 text-sm" style={{ fontFamily: 'Courier, monospace' }}>
                  Customize your gaming experience
                </p>
              </div>
              
              {/* Configuration Content */}
              <div className="p-8 space-y-8">
                {/* Total Rounds Setting */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center text-lg font-semibold text-[#131010]" style={{ fontFamily: 'Poppins, sans-serif' }}>
                      <Clock size={20} className="mr-3 text-[#5F8B4C]" />
                      Total Rounds
                    </label>
                    <div className="bg-gradient-to-r from-[#D98324] to-[#E69B3A] px-4 py-2 rounded-xl text-white font-bold text-lg shadow-md min-w-[60px] text-center transform transition-all duration-300 hover:scale-105">
                      {totalRounds}
                    </div>
                  </div>
                  
                  <div className="relative">
                    <input
                      type="range"
                      min="5"
                      max="20"
                      step="1"
                      value={totalRounds}
                      onChange={(e) => setTotalRounds(parseInt(e.target.value))}
                      className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer slider transition-all duration-300 hover:scale-105"
                      style={{
                        background: `linear-gradient(to right, #5F8B4C 0%, #5F8B4C ${((totalRounds - 5) / 15) * 100}%, #e5e7eb ${((totalRounds - 5) / 15) * 100}%, #e5e7eb 100%)`
                      }}
                    />
                    <div className="flex justify-between text-sm text-[#131010]/60 mt-2" style={{ fontFamily: 'Courier, monospace' }}>
                      <span>5</span>
                      <span>20</span>
                    </div>
                  </div>
                  
                  <p className="text-[#131010]/70 text-sm leading-relaxed" style={{ fontFamily: 'Courier, monospace' }}>
                    Determines the total number of rounds in your game session. Recommended: 10-15 rounds for optimal engagement.
                  </p>
                </div>
                

              </div>
            </div>
          </div>
          
          {/* Game Information Sidebar */}
          <div className="lg:col-span-1 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden sticky top-8 transform transition-all duration-300 hover:shadow-2xl">
              {/* Sidebar Header */}
              <div className="bg-gradient-to-r from-[#D98324] to-[#E69B3A] px-6 py-5">
                <h3 className="text-lg font-bold text-white flex items-center" style={{ fontFamily: 'Poppins, sans-serif' }}>
                  <Info size={20} className="mr-3" />
                  Setup Guide
                </h3>
              </div>
              
              {/* Setup Steps */}
              <div className="p-6">
                <div className="space-y-4">
                  {[
                    {
                      step: 1,
                      title: 'Host Privileges',
                      description: 'You will be the game host with full control over game flow and settings.',
                      icon: <CheckCircle size={16} />
                    },
                    {
                      step: 2,
                      title: 'Invite Players',
                      description: 'Share the room link with friends. Minimum 3 players recommended for best experience.',
                      icon: <Users size={16} />
                    },
                    {
                      step: 3,
                      title: 'Start Game',
                      description: 'Launch the game when all players have joined and are ready to play.',
                      icon: <Play size={16} />
                    }
                  ].map((item, index) => (
                    <div 
                      key={item.step} 
                      className="flex items-start space-x-3 p-3 rounded-xl bg-gray-50/50 hover:bg-gray-50 transition-all duration-300 transform hover:scale-105"
                      style={{ animationDelay: `${0.2 + index * 0.1}s` }}
                    >
                      <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-[#5F8B4C] to-[#7BA05C] rounded-full flex items-center justify-center text-white text-sm font-bold">
                        {item.step}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-[#131010] text-sm mb-1" style={{ fontFamily: 'Poppins, sans-serif' }}>
                          {item.title}
                        </h4>
                        <p className="text-[#131010]/70 text-xs leading-relaxed" style={{ fontFamily: 'Courier, monospace' }}>
                          {item.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Game Stats Preview */}
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h4 className="font-semibold text-[#131010] mb-3 text-sm" style={{ fontFamily: 'Poppins, sans-serif' }}>
                    Game Preview
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-3 rounded-lg text-center transform transition-all duration-300 hover:scale-105">
                      <div className="text-lg font-bold text-[#5F8B4C]" style={{ fontFamily: 'Poppins, sans-serif' }}>
                        {totalRounds}
                      </div>
                      <div className="text-xs text-[#131010]/70" style={{ fontFamily: 'Courier, monospace' }}>
                        Total Rounds
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Create Button Section */}
        <div className="mt-12 text-center animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
          <button
            onClick={handleCreateRoom}
            disabled={isCreating}
            onMouseEnter={() => setButtonHover(true)}
            onMouseLeave={() => setButtonHover(false)}
            className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white bg-gradient-to-r from-[#5F8B4C] to-[#7BA05C] rounded-2xl shadow-xl hover:shadow-2xl transform transition-all duration-500 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none min-w-[280px] overflow-hidden"
            style={{ fontFamily: 'Poppins, sans-serif' }}
          >
            {/* Button Background Effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#4A6B3A] to-[#5F8B4C] rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            
            {/* Shine Effect */}
            <div className={`absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 transform transition-transform duration-700 ${
              buttonHover ? 'translate-x-[100%]' : '-translate-x-[100%]'
            }`}></div>
            
            {/* Button Content */}
            <div className="relative flex items-center space-x-3">
              {isCreating ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Creating Room...</span>
                </>
              ) : (
                <>
                  <Share2 size={22} className="transition-transform duration-300 group-hover:scale-110" />
                  <span>Create & Share Game</span>
                </>
              )}
            </div>
          </button>
          
          <p className="mt-4 text-[#131010]/60 text-sm max-w-md mx-auto" style={{ fontFamily: 'Courier, monospace' }}>
            Your game room will be created instantly and ready for players to join
          </p>
        </div>
      </div>
      
      {/* Custom Styles */}
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes fade-in-up {
          from { 
            opacity: 0; 
            transform: translateY(20px); 
          }
          to { 
            opacity: 1; 
            transform: translateY(0); 
          }
        }
        
        @keyframes slide-down {
          from { 
            opacity: 0; 
            transform: translateY(-20px); 
          }
          to { 
            opacity: 1; 
            transform: translateY(0); 
          }
        }
        
        .animate-fade-in {
          animation: fade-in 0.6s ease-out;
        }
        
        .animate-fade-in-up {
          animation: fade-in-up 0.6s ease-out;
        }
        
        .animate-slide-down {
          animation: slide-down 0.4s ease-out;
        }
        
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #5F8B4C;
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(0,0,0,0.2);
          transition: all 0.2s ease;
        }
        
        .slider::-webkit-slider-thumb:hover {
          transform: scale(1.2);
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        }
        
        .slider::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #5F8B4C;
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 6px rgba(0,0,0,0.2);
          transition: all 0.2s ease;
        }
        
        .slider::-moz-range-thumb:hover {
          transform: scale(1.2);
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        }
      `}</style>
    </div>
  );
};

export default CreateRoom;