import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useGame } from '../../context/GameContext';
import { ArrowRight, Gamepad2, Users } from 'lucide-react';
import toast from 'react-hot-toast';

interface HeroSectionProps {
  onRequestGuestJoin?: (code: string) => void;
}

const HeroSection: React.FC<HeroSectionProps> = ({ onRequestGuestJoin }) => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { joinRoom } = useGame();

  const [roomCode, setRoomCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomCode.trim()) return;

    if (!isAuthenticated && onRequestGuestJoin) {
      onRequestGuestJoin(roomCode.trim().toUpperCase());
      return;
    }

    setIsJoining(true);
    try {
      await joinRoom(roomCode.trim().toUpperCase());
      navigate(`/room/${roomCode.trim().toUpperCase()}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to join room');
    } finally {
      setIsJoining(false);
    }
  };

  const handleStartParty = () => {
    if (isAuthenticated) {
      navigate('/dashboard');
    } else {
      navigate('/auth');
    }
  };

  return (
    <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 px-4 sm:px-6 lg:px-8 overflow-hidden border-b-4 border-[#131010] bg-[#FFDDAB]">
      {/* Background Grid */}
      <div className="absolute inset-0 opacity-[0.05] bg-[linear-gradient(#131010_1px,transparent_1px),linear-gradient(90deg,#131010_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">

          {/* Left Column - Copy & CTAs */}
          <motion.div
            className="text-center lg:text-left order-2 lg:order-1"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border-2 border-[#131010] text-[#131010] font-bold text-sm mb-8 shadow-[2px_2px_0px_0px_#131010] transform -rotate-2">
              <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
              10,000+ memes played this week
            </div>

            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-[#131010] mb-4 sm:mb-6 leading-[1.1] tracking-tight">
              Ruin Your <br className="hidden lg:block" />
              Friendships. <br className="sm:hidden" />
              <span className="text-[#D98324] drop-shadow-[2px_2px_0px_#131010] sm:drop-shadow-[3px_3px_0px_#131010] inline-block mt-1 sm:mt-2">One Meme at a Time.</span>
            </h1>

            <p className="text-base sm:text-xl text-[#131010]/80 mb-8 sm:mb-10 font-medium max-w-xl mx-auto lg:mx-0 leading-relaxed px-2 sm:px-0">
              The ultimate party game where anonymous memes meet ruthless community voting. No downloads, just pure chaos.
            </p>

            <div className="flex flex-col sm:flex-row flex-wrap gap-4 justify-center lg:justify-start items-center">
              {/* Primary CTA */}
              <button
                onClick={handleStartParty}
                className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-[#131010] bg-[#D98324] rounded-xl border-2 border-[#131010] transition-all duration-150 hover:bg-[#e89436] focus:outline-none shadow-[4px_4px_0px_0px_#131010] hover:shadow-[6px_6px_0px_0px_#131010] active:translate-y-[2px] active:shadow-none w-full sm:w-auto overflow-hidden"
              >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
                <Gamepad2 className="mr-2 relative z-10" strokeWidth={2.5} />
                <span className="relative z-10">Start a Party (Free)</span>
              </button>

              {/* Secondary CTA - Join Form */}
              <form
                onSubmit={handleJoin}
                className="flex items-center w-full sm:w-auto bg-white rounded-xl border-2 border-[#131010] p-1 shadow-[4px_4px_0px_0px_#131010] focus-within:shadow-[6px_6px_0px_0px_#131010] transition-shadow"
              >
                <div className="pl-3 pr-2 text-[#131010]/50">
                  <Users size={20} strokeWidth={2.5} />
                </div>
                <input
                  type="text"
                  placeholder="Enter Room Code"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  className="w-full sm:w-36 px-2 py-3 bg-transparent border-none focus:outline-none text-[#131010] font-bold font-courier uppercase placeholder:normal-case placeholder:font-poppins placeholder:font-medium placeholder:text-[#131010]/40"
                />
                <button
                  type="submit"
                  disabled={isJoining || !roomCode.trim()}
                  className="p-3 bg-[#5F8B4C] text-white rounded-lg border-2 border-[#131010] hover:bg-[#6da157] disabled:opacity-50 disabled:cursor-not-allowed transition-colors active:translate-y-[1px]"
                >
                  {isJoining ? (
                    <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <ArrowRight size={20} strokeWidth={3} />
                  )}
                </button>
              </form>
            </div>
          </motion.div>

          {/* Right Column - Gameplay Visual (Placeholder for Real GIF) */}
          <motion.div
            className="relative w-full aspect-square sm:aspect-video lg:aspect-square order-1 lg:order-2 flex items-center justify-center"
            initial={{ opacity: 0, scale: 0.95, rotate: 2 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: 0.8, type: "spring", bounce: 0.4 }}
          >
            {/* Actual iPhone Gameplay Screenshot */}
            <div className="w-full max-w-md bg-white rounded-[2rem] border-4 border-[#131010] shadow-[12px_12px_0px_0px_#131010] overflow-hidden transform rotate-2 hover:rotate-0 transition-transform duration-300">
              <img src="/iphonplay.webp" alt="MemeGame iPhone Gameplay" className="w-full h-auto object-cover block" />
            </div>
            {/* Decorative elements around the GIF */}
            <div className="absolute -top-6 -right-6 text-5xl animate-bounce" style={{ animationDuration: '3s' }}></div>
            <div className="absolute -bottom-4 -left-4 text-5xl animate-bounce" style={{ animationDuration: '4s', animationDelay: '1s' }}></div>
          </motion.div>

        </div>
      </div>
    </section>
  );
};

export default HeroSection;
