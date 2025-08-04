import React, { useEffect, useState } from 'react';
import { Crown, Sparkles } from 'lucide-react';

interface JudgeCelebrationProps {
  playerName: string;
  onComplete: () => void;
}

const JudgeCelebration: React.FC<JudgeCelebrationProps> = ({ playerName, onComplete }) => {
  const [countdown, setCountdown] = useState(5);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // Start fade out animation
          setIsVisible(false);
          // Complete after fade out
          setTimeout(onComplete, 500);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onComplete]);

  // Generate confetti pieces
  const confettiPieces = Array.from({ length: 50 }, (_, i) => (
    <div
      key={i}
      className="absolute w-2 h-2 opacity-80"
      style={{
        left: `${Math.random() * 100}%`,
        backgroundColor: ['#5F8B4C', '#FFDDAB', '#FFA500', '#FF6B6B', '#4ECDC4'][Math.floor(Math.random() * 5)],
        animationDelay: `${Math.random() * 3}s`,
        animationDuration: `${3 + Math.random() * 2}s`,
      }}
    >
      <div className="w-full h-full rounded-full animate-confetti" />
    </div>
  ));

  // Generate sparkle effects
  const sparkles = Array.from({ length: 20 }, (_, i) => (
    <div
      key={i}
      className="absolute text-yellow-300 opacity-80"
      style={{
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        animationDelay: `${Math.random() * 2}s`,
        animationDuration: `${2 + Math.random() * 1}s`,
      }}
    >
      <Sparkles 
        className="w-4 h-4 animate-sparkle" 
        style={{
          filter: 'drop-shadow(0 0 6px rgba(255, 255, 0, 0.8))'
        }}
      />
    </div>
  ));

  return (
    <div 
      className={`fixed inset-0 z-50 bg-gradient-to-br from-[#FFDDAB] to-[#FFDDAB]/80 flex items-center justify-center transition-all duration-500 ${
        isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
      }`}
    >
      {/* Confetti Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {confettiPieces}
        {sparkles}
      </div>

      {/* Main Celebration Content */}
      <div className={`bg-white/95 backdrop-blur-lg rounded-2xl p-12 shadow-2xl border-2 border-[#5F8B4C]/20 text-center max-w-lg mx-4 transform transition-all duration-700 ${
        isVisible ? 'animate-celebrate-bounce' : ''
      }`}>
        {/* Crown Icon with Glow */}
        <div className="relative mb-6">
          <Crown 
            className="w-24 h-24 mx-auto text-[#5F8B4C] animate-crown-glow" 
            style={{
              filter: 'drop-shadow(0 0 20px rgba(95, 139, 76, 0.6))'
            }}
          />
          <div className="absolute inset-0 w-24 h-24 mx-auto rounded-full bg-[#5F8B4C]/10 animate-ping" />
        </div>

        {/* Celebration Message */}
        <h1 className="text-4xl font-bold text-[#131010] font-['Poppins'] mb-4 animate-text-shimmer">
          🎉 You're the Judge! 🎉
        </h1>
        
        <p className="text-xl text-[#131010]/80 font-mono mb-6 animate-fade-in-up">
          Get ready to create an epic meme sentence, {playerName}!
        </p>

        {/* Countdown */}
        <div className="bg-[#5F8B4C]/10 rounded-xl p-6 mb-4">
          <p className="text-lg text-[#131010]/70 font-mono mb-2">
            Game starting in...
          </p>
          <div className={`text-6xl font-bold text-[#5F8B4C] font-mono animate-countdown-pulse ${
            countdown <= 2 ? 'animate-urgent-pulse' : ''
          }`}>
            {countdown}
          </div>
        </div>

        {/* Animated Progress Bar */}
        <div className="w-full bg-[#5F8B4C]/20 rounded-full h-2">
          <div 
            className="bg-gradient-to-r from-[#5F8B4C] to-[#7BA05B] h-2 rounded-full transition-all duration-1000 ease-linear"
            style={{ width: `${((5 - countdown) / 5) * 100}%` }}
          />
        </div>
      </div>

      {/* Additional floating elements */}
      <div className="absolute top-1/4 left-1/4 text-4xl animate-float">👑</div>
      <div className="absolute top-1/3 right-1/4 text-3xl animate-float-delayed">🎊</div>
      <div className="absolute bottom-1/3 left-1/3 text-3xl animate-float-slow">🎉</div>
      <div className="absolute bottom-1/4 right-1/3 text-4xl animate-float-delayed">⭐</div>
    </div>
  );
};

export default JudgeCelebration;