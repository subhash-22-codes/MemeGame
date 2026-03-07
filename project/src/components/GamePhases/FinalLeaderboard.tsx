import React, { useMemo } from 'react';
import type { Player } from '../../context/GameContext';
import { Trophy, RefreshCcw, Home, Crown, Medal } from 'lucide-react';

// Define the props Game.tsx will pass
type FinalLeaderboardProps = {
  players: Player[];
  totalRounds: number;
  isHost: boolean;
  onPlayAgain: () => void; // Function to restart the game
  onBackToLobby: () => void; // Function to go to dashboard/lobby
};

const FinalLeaderboard: React.FC<FinalLeaderboardProps> = ({
  players,
  totalRounds,
  isHost,
  onPlayAgain,
  onBackToLobby,
}) => {
  // Sort players by their final score
  const sortedPlayers = useMemo(() => 
    [...players].sort((a, b) => b.score - a.score),
    [players]
  );

  const topScore = sortedPlayers[0]?.score || 0;
  const winners = sortedPlayers.filter(p => p.score === topScore);

  return (
    <div className="max-w-xl mx-auto w-full animate-fade-in px-2 sm:px-0">
      
      {/* 1. Winner Card (Soul Bento) */}
      <div className="bg-[#FFDDAB] rounded-2xl p-6 sm:p-8 border-2 border-[#131010] shadow-[4px_4px_0px_0px_#131010] text-center mb-6 relative overflow-hidden">
        {/* Subtle grid texture back in */}
        <div className="absolute inset-0 opacity-[0.05] bg-[linear-gradient(#131010_1px,transparent_1px),linear-gradient(90deg,#131010_1px,transparent_1px)] bg-[size:15px_15px] pointer-events-none" />

        <div className="relative z-10">
          <div className="inline-flex items-center justify-center p-3 bg-[#D98324] border-2 border-[#131010] shadow-[2px_2px_0px_0px_#131010] rounded-xl mb-4 transform -rotate-2">
            <Trophy className="w-8 h-8 text-[#131010]" strokeWidth={2.5} />
          </div>
          
          {winners.length > 1 ? (
            <>
              <h2 className="text-3xl font-black text-[#131010] mb-1 font-poppins tracking-tight uppercase">
                It's a Tie!
              </h2>
              <p className="text-[#131010]/60 font-bold font-courier text-xs uppercase tracking-widest mb-4">
                Co-Champions of {totalRounds} Rounds
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {winners.map(winner => (
                  <span key={winner.id} className="px-4 py-2 bg-white border-2 border-[#131010] shadow-[3px_3px_0px_0px_#131010] rounded-xl text-lg text-[#131010] font-black font-poppins flex items-center gap-2">
                    <Crown size={18} className="text-[#D98324]" strokeWidth={3} />
                    {winner.username}
                  </span>
                ))}
              </div>
            </>
          ) : (
            <>
              <h2 className="text-3xl sm:text-4xl font-black text-[#131010] mb-1 font-poppins tracking-tight uppercase">
                Game Over!
              </h2>
              <p className="text-[#131010]/60 font-bold font-courier text-xs uppercase tracking-widest mb-5">
                The Champion after {totalRounds} Rounds
              </p>
              <div className="inline-flex items-center gap-3 bg-white px-6 py-3 border-2 border-[#131010] shadow-[3px_3px_0px_0px_#131010] rounded-xl transform transition-transform hover:scale-105">
                <Crown size={22} className="text-[#D98324]" strokeWidth={3} />
                <p className="text-2xl text-[#131010] font-black font-poppins truncate max-w-[180px]">
                  {winners[0]?.username || 'N/A'}
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 2. Final Leaderboard Plaque (Tactile Rows) */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border-2 border-[#131010] shadow-[4px_4px_0px_0px_#131010] mb-8">
        <div className="flex items-center gap-2 mb-5 border-b-2 border-[#131010]/10 pb-4">
          <Medal className="w-5 h-5 text-[#131010]" strokeWidth={2.5} />
          <h3 className="text-base font-black text-[#131010] font-poppins uppercase tracking-wider">
            Final Standings
          </h3>
        </div>

        <div className="space-y-3">
          {sortedPlayers.map((player, index) => {
            const isWinner = index < winners.length;
            return (
              <div
                key={player.id}
                className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all duration-200
                  ${isWinner 
                    ? 'bg-[#5F8B4C] border-[#131010] shadow-[2px_2px_0px_0px_#131010]' 
                    : 'bg-white border-[#131010]/10 shadow-none'
                  }
                `}
              >
                <div className="flex items-center gap-3">
                  {/* Position Badge */}
                  <div className={`w-8 h-8 flex items-center justify-center rounded-lg font-black text-sm border-2
                    ${isWinner 
                      ? 'bg-white text-[#131010] border-[#131010]' 
                      : 'bg-[#131010]/5 text-[#131010]/50 border-transparent'
                    }
                  `}>
                    {index + 1}
                  </div>
                  
                  {/* Avatar & Name */}
                  <div className="flex items-center gap-2">
                    <img
                      src={player.avatar || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${player.username}`}
                      alt={player.username}
                      className={`w-8 h-8 rounded-lg object-cover ${isWinner ? 'border-2 border-[#131010]' : 'opacity-70'}`}
                    />
                    <span className={`text-sm sm:text-base font-bold font-poppins ${isWinner ? 'text-white' : 'text-[#131010]'}`}>
                      {player.username}
                    </span>
                  </div>
                </div>
                
                {/* Score */}
                <div className="text-right">
                  <span className={`text-lg sm:text-xl font-black font-poppins ${isWinner ? 'text-white' : 'text-[#5F8B4C]'}`}>
                    {player.score}
                  </span>
                  <span className={`ml-1 text-[10px] font-bold font-courier uppercase ${isWinner ? 'text-white/70' : 'text-[#131010]/40'}`}>
                    pts
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Action Buttons (Refined Scale) */}
      <div className="flex flex-col sm:flex-row justify-center gap-3">
        {isHost && (
          <button
            onClick={onPlayAgain}
            className="flex-1 flex items-center justify-center gap-2 p-3 sm:p-4 bg-[#5F8B4C] text-white border-2 border-[#131010] shadow-[3px_3px_0px_0px_#131010] active:translate-y-[2px] active:shadow-none rounded-xl font-black font-poppins text-sm uppercase tracking-wider transition-all"
          >
            <RefreshCcw className="w-5 h-5" strokeWidth={3} />
            Play Again
          </button>
        )}
        <button
          onClick={onBackToLobby}
          className="flex-1 flex items-center justify-center gap-2 p-3 sm:p-4 bg-white border-2 border-[#131010] shadow-[3px_3px_0px_0px_#131010] active:translate-y-[2px] active:shadow-none text-[#131010] rounded-xl font-black font-poppins text-sm uppercase tracking-wider transition-all"
        >
          <Home className="w-5 h-5" strokeWidth={3} />
          Lobby
        </button>
      </div>

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fade-in 0.3s ease-out forwards; }
      `}</style>
    </div>
  );
};

export default FinalLeaderboard;