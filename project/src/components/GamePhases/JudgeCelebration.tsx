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
      className={`fixed inset-0 z-50 flex items-center justify-center px-4 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        isVisible 
          ? 'opacity-100 backdrop-blur-md bg-[#131010]/90' 
          : 'opacity-0 backdrop-blur-none bg-[#131010]/0'
      }`}
    >
      {/* Cinematic Spotlight Effect */}
      <div className="absolute inset-0 pointer-events-none" 
           style={{ 
             background: 'radial-gradient(circle at center, transparent 0%, #131010 100%)',
             opacity: isVisible ? 1 : 0,
             transition: 'opacity 1s ease-out'
           }} 
      />

      {/* Main Authority Card */}
      <div 
        className={`relative w-full max-w-lg transform transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
          isVisible ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-12 scale-95 opacity-0'
        }`}
      >
        {/* Glow behind the card */}
        <div className="absolute -inset-1 bg-gradient-to-r from-[#5F8B4C] to-[#7BA05B] rounded-2xl blur-xl opacity-20 animate-pulse" />
        
        {/* Mobile Responsive Padding */}
        <div className="relative bg-[#FFDDAB] rounded-2xl p-8 sm:p-12 shadow-[0_0_40px_rgba(0,0,0,0.5)] border border-[#5F8B4C]/30 overflow-hidden flex flex-col items-center text-center">
          
          {/* Subtle scanning line effect in background */}
          <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(transparent_50%,#131010_50%)] bg-[length:100%_4px] pointer-events-none" />

          {/* Premium Icon Container (No Emojis) */}
          <div className="relative mb-8 sm:mb-10 group">
            <div className="absolute inset-0 bg-[#5F8B4C] blur-2xl rounded-full opacity-40 group-hover:opacity-60 transition-opacity duration-500" />
            <div className="w-20 h-20 sm:w-24 sm:h-24 bg-[#131010] rounded-2xl shadow-inner flex items-center justify-center transform rotate-3 ring-1 ring-[#5F8B4C]/50 relative z-10">
              <Crown 
                className="w-10 h-10 sm:w-12 sm:h-12 text-[#FFDDAB]" 
                strokeWidth={2}
              />
            </div>
          </div>

          {/* Typography - Ruthless & Clean */}
          <div className="space-y-3 mb-10 sm:mb-12 relative z-10 w-full">
            <h2 className="text-xs sm:text-sm font-bold tracking-[0.25em] text-[#5F8B4C] uppercase">
              The Throne is Yours
            </h2>
            
            <h1 className="text-4xl sm:text-5xl font-black text-[#131010] tracking-tight leading-none">
              You are the Judge.
            </h1>
            
            <p className="text-[#131010]/80 font-medium text-sm sm:text-base max-w-[280px] sm:max-w-sm mx-auto mt-4 leading-relaxed">
              Listen closely, {playerName}. You control the prompt. They submit the memes. Your screen, your rules.
            </p>
          </div>

          {/* Intelligent Countdown Indicator */}
          <div className="w-full flex items-center gap-4 relative z-10">
            <div className="flex-1 h-[2px] sm:h-[3px] bg-[#131010]/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-[#5F8B4C] transition-all duration-1000 ease-linear"
                style={{ width: `${((5 - countdown) / 5) * 100}%` }}
              />
            </div>
            
            <div className="shrink-0 flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 border-[#5F8B4C] bg-[#131010] text-[#FFDDAB] font-mono font-bold text-xl sm:text-2xl shadow-[0_0_20px_rgba(95,139,76,0.2)]">
              {countdown}
            </div>
            
            <div className="flex-1 h-[2px] sm:h-[3px] bg-[#131010]/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-[#5F8B4C] transition-all duration-1000 ease-linear origin-right"
                style={{ width: `${((5 - countdown) / 5) * 100}%`, transform: 'rotate(180deg)' }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JudgeCelebration;