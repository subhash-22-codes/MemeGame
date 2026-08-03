import React from 'react';
import { Check, Clock, Gavel, Users } from 'lucide-react';
import { Player } from '../../context/GameContext';

interface PlayerStatusProps {
  players: Player[];
  currentJudge?: Player;
  submissions: { playerId: string; memeId: string; score?: number }[];
  showSubmissionStatus?: boolean;
}

const PlayerStatus: React.FC<PlayerStatusProps> = ({ 
  players,  
  submissions,
  showSubmissionStatus = false 
}) => {
  const getPlayerStatus = (player: Player) => {
    if (player.isJudge) return 'judge';
    if (showSubmissionStatus) {
      const hasSubmitted = submissions.some(sub => sub.playerId === player.id);
      return hasSubmitted ? 'submitted' : 'thinking';
    }
    return 'waiting';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'judge':
        return <Gavel className="w-4 h-4 text-[#131010]" strokeWidth={2.5} />;
      case 'submitted':
        return <Check className="w-4 h-4 text-[#131010]" strokeWidth={3} />;
      case 'thinking':
        return <Clock className="w-4 h-4 text-[#D98324] animate-spin-slow" strokeWidth={2.5} />;
      default:
        return <Users className="w-4 h-4 text-[#131010]/40" strokeWidth={2.5} />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'judge':
        return 'Judge';
      case 'submitted':
        return 'Ready';
      case 'thinking':
        return 'Thinking';
      default:
        return 'Waiting';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'judge':
        return 'border-[#131010] bg-[#D98324]';
      case 'submitted':
        return 'border-[#131010] bg-[#5F8B4C]';
      case 'thinking':
        return 'border-[#131010] bg-white';
      default:
        return 'border-[#131010]/20 bg-[#131010]/5';
    }
  };

  const getTextColor = (status: string) => {
    if (status === 'thinking') return 'text-[#131010]';
    if (status === 'waiting') return 'text-[#131010]/60';
    return 'text-[#131010]'; // Judge & Submitted use solid black text on their colored backgrounds
  };

  return (
    <div className="w-full">
      <div className="space-y-3">
        {players.map((player, index) => {
          const status = getPlayerStatus(player);
          return (
            <div
              key={player.id}
              className={`flex items-center justify-between p-3 rounded-xl border-2 shadow-[2px_2px_0px_0px_#131010] transition-all duration-300 ${getStatusColor(status)}`}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-center gap-3">
                {/* Avatar Box */}
                <div className={`w-10 h-10 rounded-lg border-2 border-[#131010] flex items-center justify-center bg-white overflow-hidden shrink-0`}>
                  {player.avatar ? (
                     <img src={player.avatar} alt={player.username} className="w-full h-full object-cover" />
                  ) : (
                     <span className="text-[#131010] font-black text-lg font-poppins">
                      {player.username.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                
                {/* Player Info */}
                <div className="flex flex-col">
                  <div className={`font-black text-sm font-poppins truncate max-w-[100px] sm:max-w-[120px] ${getTextColor(status)}`}>
                    {player.username}
                  </div>
                  <div className={`text-[10px] font-bold font-courier uppercase tracking-widest ${status === 'waiting' ? 'text-[#131010]/40' : 'text-[#131010]/70'}`}>
                    {player.score} pts
                  </div>
                </div>
              </div>
              
              {/* Status Badge */}
              <div className="flex flex-col items-end gap-1 shrink-0">
                <div className={`flex items-center justify-center w-6 h-6 rounded bg-white border-2 border-[#131010] shadow-[1px_1px_0px_0px_#131010]`}>
                  {getStatusIcon(status)}
                </div>
                <span className={`text-[9px] font-bold font-courier uppercase tracking-widest ${getTextColor(status)}`}>
                  {getStatusText(status)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 3s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default PlayerStatus;