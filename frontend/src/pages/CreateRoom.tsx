import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, Play, Info, Lock, Check, Loader2 } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { useAuth } from '../context/AuthContext';

const CreateRoom: React.FC = () => {
  const navigate = useNavigate();
  const { createRoom, connectionState } = useGame();
  const { user } = useAuth();
  
  const [totalRounds, setTotalRounds] = useState(5);
  const [customPrompts, setCustomPrompts] = useState<string[]>([]);
  const [promptInput, setPromptInput] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [globalError, setGlobalError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [createdRoomId, setCreatedRoomId] = useState('');

  const handleAddPrompt = () => {
    const trimmed = promptInput.trim();
    if (!trimmed || customPrompts.includes(trimmed)) return;
    if (customPrompts.length >= 10) return;
    setCustomPrompts([...customPrompts, trimmed]);
    setPromptInput('');
  };

  const handleRemovePrompt = (index: number) => {
    setCustomPrompts(customPrompts.filter((_, idx) => idx !== index));
  };
  
  const handleCreateRoom = async () => {
    if (!user) {
      setGlobalError('You must be logged in to create a room');
      return;
    }
    if (connectionState !== 'connected') {
      setGlobalError('Connecting to server... please wait a moment and try again.');
      return;
    }

    setIsCreating(true);
    setGlobalError('');

    try {
      console.log('[CREATE_ROOM] Attempting to create room with settings:', {
        rounds: totalRounds,
        roundsPerJudge: 5, 
      });

      const roomId = await createRoom({
        rounds: totalRounds,
        roundsPerJudge: 5,
        customPrompts,
      });

      console.log('[CREATE_ROOM] Room created successfully with ID:', roomId);
      setCreatedRoomId(roomId);
      setShowSuccess(true);
      setTimeout(() => {
        navigate(`/room/${roomId}`, { state: { isHost: true } });
      }, 1500);
    } catch (error) {
      console.error('Failed to create room:', error);
      setGlobalError(error instanceof Error ? error.message : 'Failed to create room. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleCancel = () => {
    navigate('/dashboard');
  };

  // --- Auth Blocked State ---
  if (!user) {
    return (
      <div className="min-h-screen bg-[#FFDDAB] flex items-center justify-center p-4">
        <div className="bg-white rounded-xl border border-[#131010] shadow-[4px_4px_0px_0px_#131010] p-8 max-w-sm w-full text-center">
          <div className="w-14 h-14 bg-[#FFDDAB] border border-[#131010] shadow-[2px_2px_0px_0px_#131010] rounded-xl flex items-center justify-center mx-auto mb-5">
            <Lock className="w-6 h-6 text-[#131010]" strokeWidth={2.5} />
          </div>
          <h2 className="text-xl font-bold text-[#131010] font-poppins mb-2">Login Required</h2>
          <p className="text-[#131010]/70 text-sm font-poppins mb-6">You need to be signed in to start a party room.</p>
          <button
            onClick={() => navigate('/')}
            className="w-full bg-[#5F8B4C] text-white py-3 px-6 rounded-lg font-bold font-poppins transition-all duration-200 border border-[#131010] shadow-[3px_3px_0px_0px_#131010] active:translate-y-[2px] active:shadow-none"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  // --- Success State ---
  if (showSuccess) {
    return (
      <div className="min-h-screen bg-[#FFDDAB] flex items-center justify-center p-4">
        <div className="bg-white rounded-xl border border-[#131010] shadow-[4px_4px_0px_0px_#131010] p-8 max-w-sm w-full text-center animate-fade-in-up">
          <div className="w-14 h-14 bg-[#5F8B4C] border border-[#131010] shadow-[2px_2px_0px_0px_#131010] rounded-xl flex items-center justify-center mx-auto mb-5">
            <Check className="w-6 h-6 text-white" strokeWidth={3} />
          </div>
          <h2 className="text-2xl font-bold text-[#131010] font-poppins mb-2">Party Room Launched! 🎉</h2>
          <p className="text-[#131010]/70 text-sm font-poppins font-medium mb-2">Your party code:</p>
          <p className="text-3xl font-black text-[#D98324] font-poppins tracking-widest mb-4">{createdRoomId}</p>
          <div className="flex items-center justify-center gap-2 text-xs font-bold text-[#5F8B4C] uppercase tracking-widest font-courier">
            <span className="w-2 h-2 bg-[#5F8B4C] rounded-full animate-ping" />
            Entering party room...
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-[#FFDDAB] py-6 sm:py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        
        {/* Header Section */}
        <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4 animate-fade-in">
          <div>
            <button
              onClick={() => navigate('/dashboard')}
              className="inline-flex items-center text-[#131010]/60 hover:text-[#131010] transition-colors font-bold text-xs uppercase tracking-wider font-courier mb-3 sm:mb-4"
            >
              <ArrowLeft size={14} className="mr-1" strokeWidth={3} /> Back to Dashboard
            </button>
            <h1 className="text-3xl sm:text-4xl font-black text-[#131010] font-poppins tracking-tight leading-none">
              Start a Party
            </h1>
          </div>
        </div>
        
        {/* Global Error Alert */}
        {globalError && (
          <div className="mb-6 bg-white border-l-4 border-[#D98324] border-y border-r border-y-[#131010]/10 border-r-[#131010]/10 rounded-r-lg p-4 shadow-sm animate-fade-in">
            <div className="flex items-start justify-between">
              <div className="flex items-start">
                <p className="ml-3 text-[#131010] font-semibold text-sm font-poppins">{globalError}</p>
              </div>
              <button onClick={() => setGlobalError('')} className="text-[#131010]/40 hover:text-[#131010]">
                ✕
              </button>
            </div>
          </div>
        )}
        
        {/* The Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 animate-fade-in-up">
          
          {/* LEFT COLUMN: The Form */}
          <div className="lg:col-span-8 flex flex-col gap-5">
            
            {/* Bento Box: Total Rounds */}
            <div className="bg-white rounded-xl p-5 sm:p-6 border border-[#131010] shadow-[3px_3px_0px_0px_#131010]">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Clock size={18} className="text-[#5F8B4C]" strokeWidth={2.5} />
                  <h2 className="font-poppins font-bold text-lg text-[#131010]">Total Rounds</h2>
                </div>
                <div className="bg-[#FFDDAB] border border-[#131010] shadow-[2px_2px_0px_0px_#131010] px-3 py-1 rounded-md text-[#131010] font-black font-poppins">
                  {totalRounds}
                </div>
              </div>
              
              <p className="text-[#131010]/60 text-sm font-poppins font-medium mb-5">
                How many rounds of meme mayhem do you want?
              </p>

              <div className="px-2 pt-2">
                <input
                  type="range"
                  min="3"
                  max="8"
                  step="1"
                  value={totalRounds}
                  onChange={(e) => setTotalRounds(parseInt(e.target.value))}
                  className="w-full h-2 bg-[#FFDDAB]/30 border border-[#131010] rounded-lg appearance-none cursor-pointer custom-slider"
                  style={{
                    background: `linear-gradient(to right, #5F8B4C 0%, #5F8B4C ${((totalRounds - 3) / 5) * 100}%, transparent ${((totalRounds - 3) / 5) * 100}%, transparent 100%)`
                  }}
                />
                <div className="flex justify-between text-[10px] font-bold text-[#131010]/40 mt-3 font-courier uppercase">
                  <span>Quick (3)</span>
                  <span>Long (8)</span>
                </div>
              </div>
            </div>

            {/* Bento Box: Custom Inside-Joke Prompts (Mobile-Friendly Chips) */}
            <div className="bg-white rounded-xl p-5 sm:p-6 border border-[#131010] shadow-[3px_3px_0px_0px_#131010]">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🃏</span>
                  <h2 className="font-poppins font-bold text-lg text-[#131010]">Custom Host Prompts (Optional)</h2>
                </div>
                <div className="bg-[#FFDDAB] border border-[#131010] shadow-[2px_2px_0px_0px_#131010] px-2.5 py-0.5 rounded-md text-[#131010] font-black text-xs font-poppins">
                  {customPrompts.length}/10
                </div>
              </div>
              <p className="text-[#131010]/60 text-xs sm:text-sm font-poppins font-medium mb-4">
                Add inside jokes for your squad! They'll be balanced 50/50 with our curated party deck during the Prompt Spinner.
              </p>

              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={promptInput}
                  onChange={e => setPromptInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddPrompt()}
                  placeholder="e.g., When John forgets to mute on Zoom..."
                  maxLength={100}
                  className="flex-1 bg-slate-50 border border-[#131010] rounded-lg px-3 py-2 font-poppins text-xs font-medium text-[#131010] focus:outline-none focus:ring-2 focus:ring-[#D98324]"
                />
                <button
                  type="button"
                  onClick={handleAddPrompt}
                  disabled={!promptInput.trim() || customPrompts.length >= 10}
                  className="bg-[#D98324] text-white px-4 py-2 rounded-lg border border-[#131010] shadow-[2px_2px_0px_0px_#131010] font-bold text-xs font-poppins disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5 transition-all"
                >
                  Add
                </button>
              </div>

              {customPrompts.length > 0 ? (
                <div className="flex flex-wrap gap-2 pt-1">
                  {customPrompts.map((p, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-1.5 bg-[#FFDDAB] border border-[#131010] rounded-full px-3 py-1 font-poppins text-xs font-bold text-[#131010] shadow-[1px_1px_0px_0px_#131010]"
                    >
                      <span>{p}</span>
                      <button
                        type="button"
                        onClick={() => handleRemovePrompt(index)}
                        className="hover:text-red-600 font-black text-sm leading-none ml-1 focus:outline-none"
                        aria-label={`Remove prompt ${p}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <div className="text-[11px] font-bold text-[#131010]/40 italic">
                  No custom prompts added yet. Default party prompts will be used.
                </div>
              )}
            </div>

          </div>

          {/* RIGHT COLUMN: The Guide */}
          <div className="lg:col-span-4 flex flex-col gap-5">
            <div className="bg-white rounded-xl p-5 sm:p-6 border border-[#131010] shadow-[3px_3px_0px_0px_#131010] sticky top-6">
              <div className="flex items-center gap-2 mb-6">
                <Info size={18} className="text-[#D98324]" strokeWidth={2.5} />
                <h2 className="font-poppins font-bold text-lg text-[#131010]">How it Works</h2>
              </div>

              <div className="space-y-5">
                {[
                  {
                    step: '1',
                    title: "You're the Host",
                    desc: "You control the room settings and when the game starts."
                  },
                  {
                    step: '2',
                    title: "Invite Friends",
                    desc: "Share the room code. You need at least 3 players for a good time."
                  },
                  {
                    step: '3',
                    title: "Drop Memes",
                    desc: "You give the prompts, they drop the memes. Funniest player wins."
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

              {/* Action Buttons */}
              <div className="mt-8 pt-6 border-t border-[#131010]/10 flex flex-col gap-3">
                <button
                  onClick={handleCreateRoom}
                  disabled={isCreating}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-bold font-poppins text-white bg-[#5F8B4C] border border-[#131010] rounded-lg shadow-[3px_3px_0px_0px_#131010] hover:shadow-[4px_4px_0px_0px_#131010] active:translate-y-[2px] active:shadow-none transition-all disabled:opacity-50 disabled:bg-[#131010]/20 disabled:text-[#131010]/40 disabled:border-[#131010]/20 disabled:shadow-none"
                >
                  {isCreating ? (
                    <>
                      <Loader2 size={16} className="animate-spin" strokeWidth={3} /> Creating...
                    </>
                  ) : (
                    <>
                      <Play size={16} strokeWidth={3} /> Launch Party Room 🚀
                    </>
                  )}
                </button>
                <button
                  onClick={handleCancel}
                  disabled={isCreating}
                  className="w-full px-6 py-3.5 text-sm font-bold font-poppins text-[#131010] bg-white border border-[#131010] rounded-lg shadow-[3px_3px_0px_0px_#131010] hover:shadow-[4px_4px_0px_0px_#131010] active:translate-y-[2px] active:shadow-none transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateRoom;