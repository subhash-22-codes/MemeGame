import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useGame } from '../context/GameContext';
import ConnectionStatus from '../components/ConnectionStatus';
import { ArrowLeft, Users, Play, Shield, Zap, Gamepad2 } from 'lucide-react';
import {toast} from 'react-hot-toast';

const JoinRoom: React.FC = () => {
  const [roomCode, setRoomCode] = useState(['', '', '', '', '', '']);
  const [isJoining, setIsJoining] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { joinRoom, connectionState } = useGame();
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleInputChange = (index: number, value: string) => {
    if (value.length > 1) return;
    
    const newCode = [...roomCode];
    newCode[index] = value.toUpperCase();
    setRoomCode(newCode);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !roomCode[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text').toUpperCase().slice(0, 6);
    const newCode = [...roomCode];
    
    for (let i = 0; i < 6; i++) {
      newCode[i] = pastedText[i] || '';
    }
    setRoomCode(newCode);
    
    // Focus the next empty input or the last one
    const nextEmptyIndex = newCode.findIndex(code => !code);
    const focusIndex = nextEmptyIndex === -1 ? 5 : Math.min(nextEmptyIndex, 5);
    inputRefs.current[focusIndex]?.focus();
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const roomId = roomCode.join('');
    if (roomId.length !== 6) return;
    
    setIsJoining(true);
    
    try {
      console.log('[JOIN_ROOM] Attempting to join room:', roomId);
      
      // Check connection state
      if (connectionState !== 'connected') {
        toast.error('⚠️ Please wait for connection to establish...');
        setIsJoining(false);
        return;
      }

      // Actually join the room using GameContext
      await joinRoom(roomId);
      
      console.log('[JOIN_ROOM] Successfully joined room:', roomId);
      
      // Navigate to the room lobby
      navigate(`/room/${roomId}`);
      
    } catch (error) {
      console.error('Failed to join room:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to join room. Check the code and try again.';
      toast.error(`🚫 ${errorMessage}`);
      setIsJoining(false);
    }
  };

  const isComplete = roomCode.every(code => code !== '');

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFDDAB] via-[#FFE4B8] to-[#FFDDAB] relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-20 left-10 w-32 h-32 bg-[#D98324] rounded-full blur-xl"></div>
        <div className="absolute bottom-32 right-16 w-24 h-24 bg-[#5F8B4C] rounded-full blur-xl"></div>
        <div className="absolute top-1/2 left-1/4 w-16 h-16 bg-[#D98324] rounded-full blur-lg"></div>
      </div>

      <ConnectionStatus />
      
      {/* Header */}
      <div className="relative z-10 bg-white/90 backdrop-blur-sm border-b border-[#D98324]/20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <motion.button
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.4 }}
            whileHover={{ x: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center gap-2 text-[#5F8B4C] hover:text-[#4A6B3A] font-poppins font-medium transition-colors duration-200"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </motion.button>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
        <div className="w-full max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            
            {/* Left Side - Information */}
            <motion.div
              initial={{ x: -30, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="space-y-8"
            >
              <div>
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="inline-flex items-center gap-3 bg-[#5F8B4C]/10 text-[#5F8B4C] px-4 py-2 rounded-full text-sm font-poppins font-medium mb-6 border border-[#5F8B4C]/20"
                >
                  <Shield className="w-4 h-4" />
                  Secure Room Access
                </motion.div>
                
                <h1 className="font-poppins text-4xl lg:text-5xl font-bold text-[#5F8B4C] mb-6 leading-tight">
                  Join Game Room
                </h1>
                
                <p className="font-courier text-xl text-[#131010]/70 mb-8 leading-relaxed">
                  Enter your 6-character room code to connect with other players and start your meme gaming session.
                </p>
              </div>

              {/* Features */}
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-[#D98324]/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-1 border border-[#D98324]/20">
                    <Zap className="w-4 h-4 text-[#D98324]" />
                  </div>
                  <div>
                    <h3 className="font-poppins font-semibold text-[#5F8B4C] mb-1">Instant Connection</h3>
                    <p className="font-courier text-[#131010]/60 text-sm">Connect to any room instantly with a valid room code</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-[#5F8B4C]/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-1 border border-[#5F8B4C]/20">
                    <Users className="w-4 h-4 text-[#5F8B4C]" />
                  </div>
                  <div>
                    <h3 className="font-poppins font-semibold text-[#5F8B4C] mb-1">Multiplayer Ready</h3>
                    <p className="font-courier text-[#131010]/60 text-sm">Join up to 8 players in real-time meme battles</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-[#D98324]/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-1 border border-[#D98324]/20">
                    <Gamepad2 className="w-4 h-4 text-[#D98324]" />
                  </div>
                  <div>
                    <h3 className="font-poppins font-semibold text-[#5F8B4C] mb-1">Epic Meme Battles</h3>
                    <p className="font-courier text-[#131010]/60 text-sm">Compete in hilarious meme challenges and tournaments</p>
                  </div>
                </div>
              </div>

              {/* User Info */}
              <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 border border-[#D98324]/20 shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-[#D98324] to-[#C07620] rounded-full flex items-center justify-center">
                    <span className="text-white font-poppins font-semibold text-sm">
                      {user?.username?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  </div>
                  <div>
                    <p className="font-courier text-sm text-[#131010]/60">Playing as</p>
                    <p className="font-poppins font-semibold text-[#5F8B4C]">{user?.username || 'Player'}</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Right Side - Join Form */}
            <motion.div
              initial={{ x: 30, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="w-full max-w-md mx-auto lg:mx-0"
            >
              <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/50 p-8 lg:p-10">
                
                {/* Form Header */}
                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-gradient-to-br from-[#D98324] to-[#C07620] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <Users className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="font-poppins text-2xl font-bold text-[#5F8B4C] mb-2">Enter Room Code</h2>
                  <p className="font-courier text-[#131010]/70">Input the 6-character code provided by your host</p>
                </div>

                {/* Room Code Input */}
                <form onSubmit={handleJoin} className="space-y-8">
                  <div>
                    <label className="block font-poppins text-sm font-semibold text-[#5F8B4C] mb-4 text-center">
                      Room Code
                    </label>
                    
                    <div className="flex gap-2 sm:gap-3 justify-center mb-4">
  {roomCode.map((digit, index) => (
    <motion.input
      key={index}
      ref={(el) => (inputRefs.current[index] = el)}
      type="text"
      value={digit}
      onChange={(e) => handleInputChange(index, e.target.value)}
      onKeyDown={(e) => handleKeyDown(index, e)}
      onFocus={() => setFocusedIndex(index)}
      onBlur={() => setFocusedIndex(null)}
      onPaste={handlePaste}
      className={`w-10 sm:w-12 h-12 sm:h-14 text-center text-lg sm:text-xl font-mono font-bold border-2 rounded-xl transition-all duration-200 outline-none ${
        focusedIndex === index
          ? 'border-[#D98324] bg-[#FFF4E6] text-[#D98324]' // Soft focus
          : digit
          ? 'border-[#5F8B4C] bg-[#5F8B4C]/10 text-[#5F8B4C]'
          : 'border-gray-300 bg-white hover:border-[#D98324]/50 text-gray-700'
      }`}
      maxLength={1}
      autoComplete="off"
      autoCapitalize="characters"
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
    />
  ))}
</div>

                    
                    <p className="font-courier text-xs text-[#131010]/60 text-center">
                      Paste your code or type each character individually
                    </p>
                  </div>

                  {/* Join Button */}
                  <motion.button
                    whileHover={{ y: -1, scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={!isComplete || isJoining}
                    className={`w-full flex items-center justify-center gap-3 py-4 px-6 rounded-xl font-poppins font-semibold text-base transition-all duration-200 shadow-lg ${
                      !isComplete || isJoining
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-sm'
                        : 'bg-gradient-to-r from-[#D98324] to-[#C07620] hover:from-[#C07620] hover:to-[#B06B1C] text-white shadow-xl hover:shadow-2xl'
                    }`}
                  >
                    {isJoining ? (
                      <>
                        <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                        <span>Joining Room...</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-5 h-5 fill-current" />
                        <span>Join Room</span>
                      </>
                    )}
                  </motion.button>
                </form>

                {/* Help Text */}
                <div className="mt-8 p-4 bg-gradient-to-br from-[#FFDDAB]/30 to-[#FFE4B8]/30 rounded-xl border border-[#D98324]/20">
                  <h4 className="font-poppins font-semibold text-[#5F8B4C] text-sm mb-2">Need help?</h4>
                  <ul className="font-courier text-xs text-[#131010]/70 space-y-1">
                    <li>• Room codes are exactly 6 characters long</li>
                    <li>• Codes are case-insensitive (ABC123 = abc123)</li>
                    <li>• Ask your host for the current room code</li>
                  </ul>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JoinRoom;