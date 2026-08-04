import React from 'react';
import { Check, Clock, Crown } from 'lucide-react';
import type { GameState } from '../../context/GameContext';

interface AvatarTrayProps {
  gameState: GameState;
  currentUserId?: string;
}

const AvatarTray: React.FC<AvatarTrayProps> = ({ gameState, currentUserId }) => {
  const { gamePhase, players, submissions = [], votedPlayerIds = [], promptCreator, currentJudge } = gameState;

  // Only show the live ready checkmark tray in active gameplay phases
  if (!['sentenceCreation', 'memeSelection', 'voting'].includes(gamePhase)) {
    return null;
  }

  const activeCreatorId = promptCreator?.id || currentJudge?.id;

  const getPlayerStatus = (playerId: string) => {
    if (gamePhase === 'sentenceCreation') {
      const isCreator = playerId === activeCreatorId;
      return {
        isReady: false,
        isCreator,
        label: isCreator ? 'Cooking Prompt...' : 'Waiting...',
      };
    }

    if (gamePhase === 'memeSelection') {
      const hasSubmitted = submissions.some((s) => s.playerId === playerId);
      return {
        isReady: hasSubmitted,
        isCreator: false,
        label: hasSubmitted ? 'Ready!' : 'Selecting Meme...',
      };
    }

    if (gamePhase === 'voting') {
      const hasVoted = votedPlayerIds.includes(playerId);
      return {
        isReady: hasVoted,
        isCreator: false,
        label: hasVoted ? 'Voted!' : 'Voting...',
      };
    }

    return { isReady: false, isCreator: false, label: '' };
  };

  return (
    <div className="w-full bg-white/90 backdrop-blur-sm border-b-2 border-[#131010] py-2.5 px-4 shadow-sm overflow-x-auto no-scrollbar">
      <div className="max-w-4xl mx-auto flex items-center gap-3 min-w-max">
        <span className="text-[11px] font-black uppercase tracking-wider text-[#131010]/60 mr-1 hidden sm:inline-block">
          Squad Status:
        </span>

        {players.map((player) => {
          const { isReady, isCreator, label } = getPlayerStatus(player.id);
          const isMe = player.id === currentUserId;

          return (
            <div
              key={player.id}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border-2 border-[#131010] transition-all duration-300 ${
                isReady
                  ? 'bg-[#E3F9E5] border-[#2E7D32] shadow-[2px_2px_0px_0px_#2E7D32]'
                  : isCreator
                  ? 'bg-[#FFF3E0] border-[#E65100] shadow-[2px_2px_0px_0px_#E65100]'
                  : 'bg-white shadow-[2px_2px_0px_0px_#131010]'
              }`}
            >
              {/* Avatar with Badge */}
              <div className="relative shrink-0">
                {player.avatar ? (
                  <img
                    src={player.avatar}
                    alt={player.username || 'Player'}
                    className="w-7 h-7 rounded-full border border-[#131010] object-cover bg-slate-100"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full border border-[#131010] bg-[#FFDDAB] flex items-center justify-center font-black text-xs text-[#131010]">
                    {(player.username || '?')[0].toUpperCase()}
                  </div>
                )}

                {/* Status Badge Icon */}
                {isReady && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-[#2E7D32] rounded-full border border-[#131010] flex items-center justify-center shadow-sm animate-bounce">
                    <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                  </div>
                )}
                {!isReady && !isCreator && (
                  <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-400 rounded-full border border-[#131010] flex items-center justify-center animate-pulse">
                    <Clock className="w-2 h-2 text-[#131010]" strokeWidth={3} />
                  </div>
                )}
                {isCreator && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-[#FF9800] rounded-full border border-[#131010] flex items-center justify-center">
                    <Crown className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                  </div>
                )}
              </div>

              {/* Name and Status Label */}
              <div className="flex flex-col">
                <div className="flex items-center gap-1">
                  <span className="font-bold text-xs text-[#131010] leading-tight max-w-[85px] truncate">
                    {player.username || 'Player'}
                  </span>
                  {isMe && (
                    <span className="text-[9px] font-black bg-[#131010] text-white px-1 py-0.2 rounded">
                      YOU
                    </span>
                  )}
                </div>
                <span
                  className={`text-[10px] font-semibold leading-tight ${
                    isReady ? 'text-[#2E7D32]' : isCreator ? 'text-[#E65100]' : 'text-slate-500'
                  }`}
                >
                  {label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AvatarTray;
