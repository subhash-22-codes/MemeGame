import React from 'react';
import { User, Check, Clock } from 'lucide-react';
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
        return <User className="w-4 h-4 text-[#D98324]" />;
      case 'submitted':
        return <Check className="w-4 h-4 text-[#5F8B4C]" />;
      case 'thinking':
        return <Clock className="w-4 h-4 text-orange-500 animate-pulse" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'judge':
        return 'Judge';
      case 'submitted':
        return 'Submitted';
      case 'thinking':
        return 'Thinking...';
      default:
        return 'Waiting';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'judge':
        return 'border-[#D98324] bg-[#D98324]/10';
      case 'submitted':
        return 'border-[#5F8B4C] bg-[#5F8B4C]/10';
      case 'thinking':
        return 'border-orange-500 bg-orange-500/10';
      default:
        return 'border-gray-300 bg-gray-50';
    }
  };

  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-white/20">
      <h3 className="font-bold text-lg text-[#131010] mb-3 font-['Poppins']">Players</h3>
      
      <div className="space-y-2">
        {players.map((player) => {
          const status = getPlayerStatus(player);
          return (
            <div
              key={player.id}
              className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all duration-300 ${getStatusColor(status)}`}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#5F8B4C] to-[#D98324] flex items-center justify-center">
                  <span className="text-white font-mono text-sm font-bold">
                    {player.username.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <div className="font-mono font-semibold text-[#131010]">
                    {player.username}
                  </div>
                  <div className="text-sm text-[#131010]/70">
                    Score: {player.score}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {getStatusIcon(status)}
                <span className="text-sm font-mono text-[#131010]/80">
                  {getStatusText(status)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PlayerStatus;