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
          clearInterval(interval);
          onComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [duration, onComplete, isActive]);

  // FIXED: Bar now depletes from 100% to 0%
  const percentage = (timeLeft / duration) * 100;
  const isUrgent = timeLeft <= 10;
  const isWarning = timeLeft <= 20;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isActive) return null;

  const getStatusColor = () => {
    if (isUrgent) return 'bg-red-500';
    if (isWarning) return 'bg-[#D98324]';
    return 'bg-[#5F8B4C]';
  };

  const getTextColor = () => {
    if (isUrgent) return 'text-red-500';
    if (isWarning) return 'text-[#D98324]';
    return 'text-[#131010]';
  };

  return (
    <div className="max-w-xl mx-auto w-full px-2">
      {/* 90% Scale Bento Timer Card */}
      <div className="bg-white rounded-xl p-3 sm:p-4 border-2 border-[#131010] shadow-[4px_4px_0px_0px_#131010] transition-all duration-300">
        
        {/* Header Info */}
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <div className={`flex items-center justify-center w-7 h-7 rounded-lg border-2 border-[#131010] shadow-[2px_2px_0px_0px_#131010] transition-colors duration-300 ${getStatusColor()}`}>
              <Clock className={`w-3.5 h-3.5 text-white ${isUrgent ? 'animate-pulse' : ''}`} strokeWidth={3} />
            </div>
            <span className="font-courier font-black text-[10px] sm:text-xs uppercase tracking-widest text-[#131010]/50">
              {label}
            </span>
          </div>
          
          <div className={`text-xl sm:text-2xl font-black font-poppins tabular-nums tracking-tighter transition-colors duration-300 ${getTextColor()} ${isUrgent ? 'animate-pulse' : ''}`}>
            {formatTime(timeLeft)}
          </div>
        </div>

        {/* The Depleting Fuse Bar */}
        <div className="w-full bg-[#131010]/5 rounded-full h-2.5 border-2 border-[#131010] overflow-hidden p-[1px]">
          <div 
            className={`h-full rounded-full transition-all duration-1000 ease-linear ${getStatusColor()}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default Timer;