import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface TimerProps {
  duration: number; // in seconds
  onComplete: () => void;
  isActive: boolean;
  label?: string;
}

const Timer: React.FC<TimerProps> = ({ duration, onComplete, isActive, label = "Time Remaining" }) => {
  const [timeLeft, setTimeLeft] = useState(duration);

  useEffect(() => {
    if (!isActive) return;

    setTimeLeft(duration);
    
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          onComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [duration, onComplete, isActive]);

  const percentage = ((duration - timeLeft) / duration) * 100;
  const isUrgent = timeLeft <= 10;
  const isWarning = timeLeft <= 20;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isActive) return null;

  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-white/20">
      <div className="flex items-center justify-center gap-2 mb-2">
        <Clock className={`w-5 h-5 ${isUrgent ? 'text-red-500' : isWarning ? 'text-orange-500' : 'text-[#5F8B4C]'}`} />
        <span className="font-mono text-sm text-[#131010] opacity-80">{label}</span>
      </div>
      
      <div className="text-center">
        <div className={`text-2xl font-mono font-bold ${
          isUrgent ? 'text-red-500 animate-pulse' : 
          isWarning ? 'text-orange-500' : 
          'text-[#131010]'
        }`}>
          {formatTime(timeLeft)}
        </div>
      </div>

      <div className="w-full bg-gray-200 rounded-full h-2 mt-3 overflow-hidden">
        <div 
          className={`h-full transition-all duration-1000 ease-linear ${
            isUrgent ? 'bg-red-500' : 
            isWarning ? 'bg-orange-500' : 
            'bg-[#5F8B4C]'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

export default Timer;