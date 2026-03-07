import React, { useEffect, useState } from 'react';
import { Crown } from 'lucide-react';

interface JudgeCelebrationProps {
  playerName: string;
  onComplete: () => void;
}

const JudgeCelebration: React.FC<JudgeCelebrationProps> = ({ playerName, onComplete }) => {
  // --- WIRING INTACT ---
  const [countdown, setCountdown] = useState(5);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsVisible(false);
          setTimeout(onComplete, 500);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onComplete]);
  // ---------------------

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-500 ease-in-out ${
        isVisible 
          ? 'opacity-100 backdrop-blur-sm bg-[#131010]/60' 
          : 'opacity-0 backdrop-blur-none bg-transparent pointer-events-none'
      }`}
    >
      {/* Clean, Simple Authority Card */}
      <div 
        className={`relative w-full max-w-xs sm:max-w-sm bg-white rounded-2xl p-6 sm:p-8 border-2 border-[#131010] shadow-[4px_4px_0px_0px_#131010] flex flex-col items-center text-center transform transition-all duration-500 ${
          isVisible ? 'translate-y-0 scale-100' : 'translate-y-4 scale-95'
        }`}
      >
        
        {/* Compact Badge */}
        <div className="mb-5 animate-bounce-slow">
          <div className="w-14 h-14 bg-[#D98324] border-2 border-[#131010] shadow-[2px_2px_0px_0px_#131010] rounded-xl flex items-center justify-center transform -rotate-3">
            <Crown className="w-6 h-6 text-[#131010]" strokeWidth={2.5} />
          </div>
        </div>

        {/* Typography */}
        <div className="w-full mb-6">
          <h2 className="text-[10px] sm:text-xs font-bold tracking-widest text-[#131010]/50 uppercase font-courier mb-1.5">
            The Throne is Yours
          </h2>
          
          <h1 className="text-2xl sm:text-3xl font-black text-[#131010] font-poppins tracking-tight mb-2">
            You are Judge.
          </h1>
          
          <p className="text-[#131010]/70 font-medium text-xs sm:text-sm font-poppins leading-relaxed">
            Get ready, <span className="text-[#5F8B4C] font-bold">{playerName}</span>. You control the prompt for this round.
          </p>
        </div>

        {/* Simple Progress Timer */}
        <div className="w-full flex items-center gap-3">
          {/* Number Block */}
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[#131010] text-white rounded-lg flex items-center justify-center font-bold font-poppins text-sm sm:text-base shrink-0 shadow-[2px_2px_0px_0px_#131010]">
            {countdown}
          </div>
          
          {/* Thin Progress Bar */}
          <div className="flex-1 h-3 sm:h-4 bg-[#131010]/5 rounded-full border-2 border-[#131010] overflow-hidden p-[1px]">
            <div 
              className="h-full bg-[#5F8B4C] rounded-full transition-all duration-1000 ease-linear"
              style={{ width: `${((5 - countdown) / 5) * 100}%` }}
            />
          </div>
        </div>

      </div>

      <style>{`
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        .animate-bounce-slow {
          animation: bounce-slow 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default JudgeCelebration;