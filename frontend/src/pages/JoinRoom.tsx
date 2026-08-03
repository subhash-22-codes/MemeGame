import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useGame } from '../context/GameContext';
import ConnectionStatus from '../components/ConnectionStatus';
import { ArrowLeft, Users, Play, Info, Lock, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

const JoinRoom: React.FC = () => {
  // --- WIRING INTACT ---
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
      setIsJoining(false);
    }
  };

  const isComplete = roomCode.every(code => code !== '');
  // ---------------------

  // --- Auth Blocked State (Matched to Create Room) ---
  if (!user) {
    return (
      <div className="min-h-screen bg-[#FFDDAB] flex items-center justify-center p-4">
        <div className="bg-white rounded-xl border border-[#131010] shadow-[4px_4px_0px_0px_#131010] p-8 max-w-sm w-full text-center">
          <div className="w-14 h-14 bg-[#FFDDAB] border border-[#131010] shadow-[2px_2px_0px_0px_#131010] rounded-xl flex items-center justify-center mx-auto mb-5">
            <Lock className="w-6 h-6 text-[#131010]" strokeWidth={2.5} />
          </div>
          <h2 className="text-xl font-bold text-[#131010] font-poppins mb-2">Login Required</h2>
          <p className="text-[#131010]/70 text-sm font-poppins mb-6">You need to be logged in to join a game.</p>
          <button
            onClick={() => navigate('/login')}
            className="w-full bg-[#5F8B4C] text-white py-3 px-6 rounded-lg font-bold font-poppins transition-all duration-200 border border-[#131010] shadow-[3px_3px_0px_0px_#131010] active:translate-y-[2px] active:shadow-none"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFDDAB] py-6 sm:py-10 px-4 sm:px-6 lg:px-8">
      <ConnectionStatus />
      
      <div className="max-w-6xl mx-auto">
        
        {/* Header Section (Consistently placed matching Create Room) */}
        <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4 animate-fade-in">
          <div>
            <button
              onClick={() => navigate('/dashboard')}
              className="inline-flex items-center text-[#131010]/60 hover:text-[#131010] transition-colors font-bold text-xs uppercase tracking-wider font-courier mb-3 sm:mb-4"
            >
              <ArrowLeft size={14} className="mr-1" strokeWidth={3} /> Back to Dashboard
            </button>
            <h1 className="text-3xl sm:text-4xl font-black text-[#131010] font-poppins tracking-tight leading-none">
              Join a Game
            </h1>
          </div>
        </div>

        {/* The Layout Grid (F-Pattern matching Create Room) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 animate-fade-in-up">
          
          {/* LEFT COLUMN: The Action (Takes up 8 columns on desktop) */}
          <div className="lg:col-span-8 flex flex-col gap-5">
            
            {/* Bento Box 1: Code Input */}
            <div className="bg-white rounded-xl p-5 sm:p-8 border border-[#131010] shadow-[3px_3px_0px_0px_#131010]">
              <div className="flex items-center gap-3 mb-6 sm:mb-8">
                <div className="w-12 h-12 bg-[#FFDDAB] border border-[#131010] shadow-[2px_2px_0px_0px_#131010] rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-[#D98324]" strokeWidth={2.5} />
                </div>
                <div>
                  <h2 className="font-poppins font-bold text-xl text-[#131010]">Room Code</h2>
                  <p className="font-poppins font-medium text-xs sm:text-sm text-[#131010]/60">Grab the 6-letter code from your host.</p>
                </div>
              </div>

              <form onSubmit={handleJoin} className="space-y-8">
                <div className="flex flex-col items-center">
                  {/* The 6 Input Boxes (Keycap Style) */}
                  <div className="flex gap-2 sm:gap-3 justify-center w-full max-w-md">
                    {roomCode.map((digit, index) => (
                      <input
                        key={index}
                        ref={(el) => (inputRefs.current[index] = el)}
                        type="text"
                        value={digit}
                        onChange={(e) => handleInputChange(index, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(index, e)}
                        onFocus={() => setFocusedIndex(index)}
                        onBlur={() => setFocusedIndex(null)}
                        onPaste={handlePaste}
                        maxLength={1}
                        autoComplete="off"
                        autoCapitalize="characters"
                        className={`w-10 sm:w-12 md:w-14 h-12 sm:h-14 md:h-16 text-center text-xl sm:text-2xl font-poppins font-black border-2 rounded-lg transition-all outline-none uppercase ${
                          focusedIndex === index
                            ? 'border-[#D98324] bg-[#FFDDAB]/20 text-[#131010] shadow-[2px_2px_0px_0px_#D98324] -translate-y-[1px]'
                            : digit
                            ? 'border-[#131010] bg-white text-[#131010] shadow-[2px_2px_0px_0px_#131010]'
                            : 'border-[#131010]/20 bg-[#131010]/5 text-[#131010]'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="font-poppins font-medium text-xs text-[#131010]/40 mt-4 text-center">
                    Tip: You can just paste the code if you copied it.
                  </p>
                </div>

                {/* Join Button */}
                <button
                  type="submit"
                  disabled={!isComplete || isJoining}
                  className="w-full sm:w-auto sm:min-w-[200px] mx-auto flex items-center justify-center gap-2 py-3.5 px-8 rounded-lg font-poppins font-bold text-sm transition-all border disabled:opacity-50 disabled:bg-[#131010]/20 disabled:text-[#131010]/40 disabled:border-[#131010]/20 disabled:shadow-none bg-[#5F8B4C] border-[#131010] text-white shadow-[3px_3px_0px_0px_#131010] hover:shadow-[4px_4px_0px_0px_#131010] active:translate-y-[2px] active:shadow-none"
                >
                  {isJoining ? (
                    <>
                      <Loader2 size={16} className="animate-spin" strokeWidth={3} />
                      <span>Joining...</span>
                    </>
                  ) : (
                    <>
                      <Play size={16} strokeWidth={3} />
                      <span>Join Game</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* RIGHT COLUMN: The Guide (Takes up 4 columns on desktop, stacks on mobile) */}
          <div className="lg:col-span-4 flex flex-col gap-5">
            <div className="bg-white rounded-xl p-5 sm:p-6 border border-[#131010] shadow-[3px_3px_0px_0px_#131010] sticky top-6">
              <div className="flex items-center gap-2 mb-6">
                <Info size={18} className="text-[#D98324]" strokeWidth={2.5} />
                <h2 className="font-poppins font-bold text-lg text-[#131010]">How to Play</h2>
              </div>

              {/* Simple, Human Steps */}
              <div className="space-y-5 mb-6">
                {[
                  {
                    step: '1',
                    title: "Get the Code",
                    desc: "Ask the person hosting the game for the 6-letter room code."
                  },
                  {
                    step: '2',
                    title: "Enter the Lobby",
                    desc: "Type it in and hit join. You'll drop right into the waiting room."
                  },
                  {
                    step: '3',
                    title: "Wait for the Host",
                    desc: "Hang tight! The host will start the game once everyone is in."
                  }
                ].map((item, i) => (
                  <div key={i} className="flex gap-4 items-start">
                    <div className="w-8 h-8 rounded-lg bg-[#FFDDAB] border border-[#131010] shadow-[1px_1px_0px_0px_#131010] flex items-center justify-center font-black font-poppins text-[#131010] text-sm shrink-0">
                      {item.step}
                    </div>
                    <div>
                      <h3 className="font-poppins font-bold text-sm text-[#131010] mb-0.5">{item.title}</h3>
                      <p className="font-poppins font-medium text-xs text-[#131010]/60 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Player Tag (Friendly Reminder) */}
              <div className="pt-5 border-t border-[#131010]/10 flex items-center justify-center">
                <div className="inline-flex items-center gap-2 bg-[#FFDDAB]/20 px-4 py-2 rounded-lg border border-[#131010] shadow-[1px_1px_0px_0px_#131010]">
                  <div className="w-2 h-2 bg-[#5F8B4C] rounded-full animate-pulse" />
                  <p className="font-courier text-xs font-bold text-[#131010]/70 uppercase tracking-widest">
                    Playing as <span className="text-[#5F8B4C]">{user?.username || 'Player'}</span>
                  </p>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
      
      {/* Custom Animations to Match CreateRoom */}
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.4s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default JoinRoom;