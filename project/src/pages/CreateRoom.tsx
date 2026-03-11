import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Clock, Play, Info, Lock, Unlock, FileText, AlertCircle, X, Check, Loader2 } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { useAuth } from '../context/AuthContext';

interface FormData {
  roomName: string;
  description: string;
  isPublic: boolean;
  totalRounds: number;
}

interface FormErrors {
  roomName?: string;
  description?: string;
}

const CreateRoom: React.FC = () => {
  const navigate = useNavigate();
  const { createRoom, connectionState } = useGame();
  const { user } = useAuth();
  
  // --- WIRING INTACT ---
  const [formData, setFormData] = useState<FormData>({
    roomName: '',
    description: '',
    isPublic: true,
    totalRounds: 5 
  });
  
  const [errors, setErrors] = useState<FormErrors>({});
  const [isCreating, setIsCreating] = useState(false);
  const [globalError, setGlobalError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    if (!formData.roomName.trim()) {
      newErrors.roomName = 'Room name is required';
    } else if (formData.roomName.trim().length < 3) {
      newErrors.roomName = 'Must be at least 3 characters';
    } else if (formData.roomName.trim().length > 30) {
      newErrors.roomName = 'Must be less than 30 characters';
    }
    if (formData.description.length > 150) {
      newErrors.description = 'Must be less than 150 characters';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleInputChange = (field: keyof FormData, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
    setGlobalError('');
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
    if (!validateForm()) return;

    setIsCreating(true);
    setGlobalError('');

    try {
      console.log('[CREATE_ROOM] Attempting to create room with settings:', {
        rounds: formData.totalRounds,
        roundsPerJudge: 5, 
      });

      const roomId = await createRoom({
        rounds: formData.totalRounds,
        roundsPerJudge: 5, 
      });

      console.log('[CREATE_ROOM] Room created successfully with ID:', roomId);
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
  // ---------------------

  // --- Auth Blocked State ---
  if (!user) {
    return (
      <div className="min-h-screen bg-[#FFDDAB] flex items-center justify-center p-4">
        <div className="bg-white rounded-xl border border-[#131010] shadow-[4px_4px_0px_0px_#131010] p-8 max-w-sm w-full text-center">
          <div className="w-14 h-14 bg-[#FFDDAB] border border-[#131010] shadow-[2px_2px_0px_0px_#131010] rounded-xl flex items-center justify-center mx-auto mb-5">
            <Lock className="w-6 h-6 text-[#131010]" strokeWidth={2.5} />
          </div>
          <h2 className="text-xl font-bold text-[#131010] font-poppins mb-2">Login Required</h2>
          <p className="text-[#131010]/70 text-sm font-poppins mb-6">You need to be logged in to host a game.</p>
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

  // --- Success State ---
  if (showSuccess) {
    return (
      <div className="min-h-screen bg-[#FFDDAB] flex items-center justify-center p-4">
        <div className="bg-white rounded-xl border border-[#131010] shadow-[4px_4px_0px_0px_#131010] p-8 max-w-sm w-full text-center animate-fade-in-up">
          <div className="w-14 h-14 bg-[#5F8B4C] border border-[#131010] shadow-[2px_2px_0px_0px_#131010] rounded-xl flex items-center justify-center mx-auto mb-5">
            <Check className="w-6 h-6 text-white" strokeWidth={3} />
          </div>
          <h2 className="text-2xl font-bold text-[#131010] font-poppins mb-2">Room Created!</h2>
          <p className="text-[#131010]/70 text-sm font-poppins font-medium mb-6">"{formData.roomName}" is ready for players.</p>
          <div className="flex items-center justify-center gap-2 text-xs font-bold text-[#5F8B4C] uppercase tracking-widest font-courier">
            <span className="w-2 h-2 bg-[#5F8B4C] rounded-full animate-ping" />
            Heading to room...
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
              Host a Game
            </h1>
          </div>
        </div>
        
        {/* Global Error Alert */}
        {globalError && (
          <div className="mb-6 bg-white border-l-4 border-[#D98324] border-y border-r border-y-[#131010]/10 border-r-[#131010]/10 rounded-r-lg p-4 shadow-sm animate-fade-in">
            <div className="flex items-start justify-between">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 text-[#D98324] mt-0.5 flex-shrink-0" />
                <p className="ml-3 text-[#131010] font-semibold text-sm font-poppins">{globalError}</p>
              </div>
              <button onClick={() => setGlobalError('')} className="text-[#131010]/40 hover:text-[#131010]">
                <X size={16} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        )}
        
        {/* The Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 animate-fade-in-up">
          
          {/* LEFT COLUMN: The Form (Takes up 8 columns on desktop) */}
          <div className="lg:col-span-8 flex flex-col gap-5">
            
            {/* Bento Box 1: Room Details */}
            <div className="bg-white rounded-xl p-5 sm:p-6 border border-[#131010] shadow-[3px_3px_0px_0px_#131010]">
              <div className="flex items-center gap-2 mb-4 sm:mb-5">
                <FileText size={18} className="text-[#5F8B4C]" strokeWidth={2.5} />
                <h2 className="font-poppins font-bold text-lg text-[#131010]">Room Details</h2>
              </div>

              <div className="flex flex-col gap-4">
                {/* Room Name Field */}
                <div>
                  <label htmlFor="roomName" className="block text-xs font-bold text-[#131010]/60 uppercase tracking-wider font-courier mb-1.5">
                    Room Name *
                  </label>
                  <input
                    id="roomName"
                    type="text"
                    value={formData.roomName}
                    onChange={(e) => handleInputChange('roomName', e.target.value)}
                    placeholder="e.g. Weekend Meme Session"
                    maxLength={30}
                    className={`w-full px-4 py-3 bg-[#FFDDAB]/10 text-[#131010] text-base sm:text-sm font-poppins font-semibold border rounded-lg transition-shadow focus:outline-none focus:shadow-[2px_2px_0px_0px_#131010] ${
                      errors.roomName ? 'border-red-500' : 'border-[#131010]'
                    }`}
                  />
                  {errors.roomName ? (
                    <p className="text-red-500 text-xs font-bold font-poppins mt-1.5 flex items-center">
                      <AlertCircle size={12} className="mr-1" /> {errors.roomName}
                    </p>
                  ) : (
                    <p className="text-[#131010]/40 text-xs font-poppins font-medium mt-1.5">Choose a name players will recognize.</p>
                  )}
                </div>

                {/* Description Field */}
                <div>
                  <div className="flex justify-between items-end mb-1.5">
                    <label htmlFor="description" className="block text-xs font-bold text-[#131010]/60 uppercase tracking-wider font-courier">
                      House Rules <span className="text-[#131010]/40">(Optional)</span>
                    </label>
                    <span className="text-[10px] font-bold text-[#131010]/40 font-courier">{formData.description.length}/150</span>
                  </div>
                  <textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Any custom rules? Let everyone know before they join."
                    maxLength={150}
                    rows={2}
                    className={`w-full px-4 py-3 bg-[#FFDDAB]/10 text-[#131010] text-base sm:text-sm font-poppins font-medium border rounded-lg transition-shadow focus:outline-none focus:shadow-[2px_2px_0px_0px_#131010] resize-none ${
                      errors.description ? 'border-red-500' : 'border-[#131010]'
                    }`}
                  />
                  {errors.description && (
                    <p className="text-red-500 text-xs font-bold font-poppins mt-1.5 flex items-center">
                      <AlertCircle size={12} className="mr-1" /> {errors.description}
                    </p>
                  )}
                </div>
              </div>
            </div>
            
            {/* Split Settings: Privacy and Rounds side-by-side on tablet/desktop */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              
              {/* Bento Box 2: Room Privacy */}
              <div className="bg-white rounded-xl p-5 sm:p-6 border border-[#131010] shadow-[3px_3px_0px_0px_#131010]">
                <div className="flex items-center gap-2 mb-4">
                  <Users size={18} className="text-[#D98324]" strokeWidth={2.5} />
                  <h2 className="font-poppins font-bold text-lg text-[#131010]">Room Privacy</h2>
                </div>
                
                <div className="flex bg-[#FFDDAB]/20 border border-[#131010] rounded-lg p-1">
                  <button
                    type="button"
                    onClick={() => handleInputChange('isPublic', true)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-poppins font-bold transition-all ${
                      formData.isPublic 
                        ? 'bg-white border border-[#131010] shadow-[2px_2px_0px_0px_#131010] text-[#131010]' 
                        : 'text-[#131010]/50 hover:text-[#131010]'
                    }`}
                  >
                    <Unlock size={14} strokeWidth={2.5} /> Public
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInputChange('isPublic', false)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-poppins font-bold transition-all ${
                      !formData.isPublic 
                        ? 'bg-white border border-[#131010] shadow-[2px_2px_0px_0px_#131010] text-[#131010]' 
                        : 'text-[#131010]/50 hover:text-[#131010]'
                    }`}
                  >
                    <Lock size={14} strokeWidth={2.5} /> Private
                  </button>
                </div>
                <p className="text-[#131010]/40 text-xs font-poppins font-medium mt-3 text-center">
                  {formData.isPublic ? "Anyone can find and join this room." : "Only players with the link can join."}
                </p>
              </div>

              {/* Bento Box 3: Total Rounds */}
              <div className="bg-white rounded-xl p-5 sm:p-6 border border-[#131010] shadow-[3px_3px_0px_0px_#131010] flex-1 flex flex-col justify-center">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Clock size={18} className="text-[#5F8B4C]" strokeWidth={2.5} />
                    <h2 className="font-poppins font-bold text-lg text-[#131010]">Total Rounds</h2>
                  </div>
                  <div className="bg-[#FFDDAB] border border-[#131010] shadow-[2px_2px_0px_0px_#131010] px-3 py-1 rounded-md text-[#131010] font-black font-poppins">
                    {formData.totalRounds}
                  </div>
                </div>
                
                <div className="px-2 pt-2">
                  <input
                    type="range"
                    min="3"
                    max="8"
                    step="1"
                    value={formData.totalRounds}
                    onChange={(e) => handleInputChange("totalRounds", parseInt(e.target.value))}
                    className="w-full h-2 bg-[#FFDDAB]/30 border border-[#131010] rounded-lg appearance-none cursor-pointer custom-slider"
                    style={{
                      background: `linear-gradient(to right, #5F8B4C 0%, #5F8B4C ${((formData.totalRounds - 3) / 5) * 100}%, transparent ${((formData.totalRounds - 3) / 5) * 100}%, transparent 100%)`
                    }}
                  />
                  <div className="flex justify-between text-[10px] font-bold text-[#131010]/40 mt-3 font-courier uppercase">
                    <span>Quick (3)</span>
                    <span>Long (8)</span>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN: The Guide (Takes up 4 columns on desktop, stacks on mobile) */}
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

              {/* Action Buttons placed right under the guide for flow */}
              <div className="mt-8 pt-6 border-t border-[#131010]/10 flex flex-col gap-3">
                <button
                  onClick={handleCreateRoom}
                  disabled={isCreating || !formData.roomName.trim()}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-bold font-poppins text-white bg-[#5F8B4C] border border-[#131010] rounded-lg shadow-[3px_3px_0px_0px_#131010] hover:shadow-[4px_4px_0px_0px_#131010] active:translate-y-[2px] active:shadow-none transition-all disabled:opacity-50 disabled:bg-[#131010]/20 disabled:text-[#131010]/40 disabled:border-[#131010]/20 disabled:shadow-none"
                >
                  {isCreating ? (
                    <>
                      <Loader2 size={16} className="animate-spin" strokeWidth={3} /> Creating...
                    </>
                  ) : (
                    <>
                      <Play size={16} strokeWidth={3} /> Create Room
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
      
      {/* Custom Styles for Slider */}
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

        .custom-slider::-webkit-slider-thumb {
          appearance: none;
          height: 22px;
          width: 22px;
          border-radius: 6px;
          background: white;
          border: 2px solid #131010;
          cursor: pointer;
          box-shadow: 2px 2px 0px 0px #131010;
          transition: all 0.1s ease;
        }
        .custom-slider::-webkit-slider-thumb:active {
          transform: translate(1px, 1px);
          box-shadow: 0px 0px 0px 0px #131010;
        }
        .custom-slider::-moz-range-thumb {
          height: 22px;
          width: 22px;
          border-radius: 6px;
          background: white;
          border: 2px solid #131010;
          cursor: pointer;
          box-shadow: 2px 2px 0px 0px #131010;
          transition: all 0.1s ease;
        }
        .custom-slider::-moz-range-thumb:active {
          transform: translate(1px, 1px);
          box-shadow: 0px 0px 0px 0px #131010;
        }
      `}</style>
    </div>
  );
};

export default CreateRoom;