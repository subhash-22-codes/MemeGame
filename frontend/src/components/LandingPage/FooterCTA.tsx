import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useGame } from '../../context/GameContext';
import { Gamepad2, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

interface FooterCTAProps {
  onRequestGuestJoin?: (code: string) => void;
}

const FooterCTA: React.FC<FooterCTAProps> = ({ onRequestGuestJoin }) => {
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
    <section className="py-24 sm:py-32 px-4 sm:px-6 lg:px-8 bg-[#D98324] border-b-4 border-[#131010] relative overflow-hidden">
      {/* Background Graphic */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#FFDDAB]/30 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-4xl mx-auto relative z-10 text-center flex flex-col items-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, rotate: -5 }}
          whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
          viewport={{ once: true }}
          transition={{ type: "spring", bounce: 0.5 }}
          className="bg-white px-6 py-2 rounded-2xl border-4 border-[#131010] shadow-[4px_4px_0px_0px_#131010] font-black text-xl sm:text-2xl text-[#131010] mb-8 uppercase tracking-wider transform -rotate-3"
        >
          Stop reading.
        </motion.div>

        <motion.h2 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-4xl sm:text-6xl md:text-8xl font-black text-[#131010] font-poppins tracking-tighter leading-[0.9] mb-8 sm:mb-12 drop-shadow-[2px_2px_0px_rgba(255,255,255,0.4)] sm:drop-shadow-[4px_4px_0px_rgba(255,255,255,0.4)]"
        >
          START <br/> LAUGHING.
        </motion.h2>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="flex flex-col sm:flex-row flex-wrap gap-4 justify-center items-center w-full max-w-xl"
        >
          {/* Primary CTA */}
          <button 
            onClick={handleStartParty}
            className="group relative inline-flex items-center justify-center px-10 py-5 text-xl font-black text-white bg-[#5F8B4C] rounded-2xl border-4 border-[#131010] transition-all duration-150 focus:outline-none shadow-[8px_8px_0px_0px_#131010] hover:shadow-[12px_12px_0px_0px_#131010] active:translate-y-[4px] active:shadow-[4px_4px_0px_0px_#131010] w-full sm:w-auto overflow-hidden hover:-rotate-2"
          >
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
            <Gamepad2 className="mr-3 relative z-10 w-8 h-8" strokeWidth={3} />
            <span className="relative z-10 uppercase tracking-wide">Host Game</span>
          </button>

          {/* Secondary CTA - Join Form */}
          <form 
            onSubmit={handleJoin}
            className="flex items-center w-full sm:w-auto bg-white rounded-2xl border-4 border-[#131010] p-1.5 shadow-[8px_8px_0px_0px_#131010] focus-within:shadow-[12px_12px_0px_0px_#131010] transition-shadow transform hover:rotate-1"
          >
            <input
              type="text"
              placeholder="ROOM CODE"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              maxLength={6}
              className="w-full sm:w-40 px-4 py-3 bg-transparent border-none focus:outline-none text-[#131010] font-black font-courier uppercase text-xl placeholder:text-[#131010]/30 placeholder:tracking-tight text-center sm:text-left"
            />
            <button
              type="submit"
              disabled={isJoining || !roomCode.trim()}
              className="px-6 py-4 bg-[#131010] text-white rounded-xl hover:bg-[#2a2424] disabled:opacity-50 disabled:cursor-not-allowed transition-colors active:translate-y-[2px]"
            >
              {isJoining ? (
                <div className="w-6 h-6 border-4 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <ArrowRight size={24} strokeWidth={3} />
              )}
            </button>
          </form>
        </motion.div>

        <p className="mt-8 text-[#131010]/80 font-bold font-poppins text-sm uppercase tracking-wider">
          {isAuthenticated ? "Welcome back!" : "No account required to join."}
        </p>
      </div>
    </section>
  );
};

export default FooterCTA;
