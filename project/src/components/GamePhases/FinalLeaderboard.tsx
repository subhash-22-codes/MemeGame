import React, { useMemo } from 'react';
import type { Player } from '../../context/GameContext';
import { Trophy, RefreshCcw, Home } from 'lucide-react';

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
    <div className="max-w-4xl mx-auto">
      {/* 1. Winner Card */}
      <div className="bg-white/95 backdrop-blur-md rounded-2xl p-6 lg:p-8 shadow-xl border border-white/30 text-center mb-6">
        <Trophy className="w-20 h-20 text-[#D98324] mx-auto mb-4 animate-bounce" />
        
        {winners.length > 1 ? (
          <>
            <h2 className="text-3xl lg:text-4xl font-bold text-slate-800 mb-3">
              It's a Tie!
            </h2>
            <p className="text-slate-500 font-mono text-lg lg:text-xl mb-6">
              The winners are:
            </p>
            <div className="flex justify-center gap-4">
              {winners.map(winner => (
                <span key={winner.id} className="text-2xl text-[#5F8B4C] font-bold font-mono">
                  {winner.username}
                </span>
              ))}
            </div>
          </>
        ) : (
          <>
            <h2 className="text-3xl lg:text-4xl font-bold text-slate-800 mb-3">
              Game Over!
            </h2>
            <p className="text-slate-500 font-mono text-lg lg:text-xl mb-6">
              The winner, after {totalRounds} rounds, is...
            </p>
            <div className="bg-[#5F8B4C]/10 rounded-lg p-4 border border-[#5F8B4C]/20">
              <p className="text-4xl text-[#5F8B4C] font-bold font-mono">
                {winners[0]?.username || 'N/A'}
              </p>
            </div>
          </>
        )}
      </div>

      {/* 2. Final Leaderboard */}
      <div className="bg-white/95 backdrop-blur-md rounded-2xl p-6 lg:p-8 shadow-xl border border-white/30">
        <h3 className="text-xl font-bold text-slate-800 mb-4 text-center font-mono">
          Final Scores
        </h3>
        <div className="space-y-3">
          {sortedPlayers.map((player, index) => (
            <div
              key={player.id}
              className={`flex items-center justify-between p-4 rounded-lg border
                ${index < winners.length ? 'bg-green-100/50 border-green-300' : 'bg-gray-50/50'}
              `}
            >
              <div className="flex items-center gap-3">
                <span className="text-lg font-bold text-slate-400 w-6 text-center">
                  {index + 1}
                </span>
                <img
                  src={player.avatar || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${player.username}`}
                  alt={player.username}
                  className="w-10 h-10 rounded-full border-2 border-[#FFDDAB]"
                />
                <span className="text-base font-medium text-slate-700">
                  {player.username}
                </span>
              </div>
              <span className="text-lg font-bold text-[#5F8B4C]">
                {player.score} pts
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Action Buttons */}
      <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
        {isHost && (
          <button
            onClick={onPlayAgain}
            className="flex items-center justify-center gap-3 p-4 w-full sm:w-auto bg-gradient-to-br from-[#5F8B4C] to-[#7BA05C] text-white rounded-xl shadow-lg font-mono font-bold text-lg transition-all duration-300 hover:scale-105"
          >
            <RefreshCcw className="w-6 h-6" />
            Play Again
          </button>
        )}
        <button
          onClick={onBackToLobby}
          className="flex items-center justify-center gap-3 p-4 w-full sm:w-auto bg-white/80 text-slate-700 rounded-xl shadow-lg font-mono font-medium text-lg transition-all duration-300 hover:scale-105"
        >
          <Home className="w-6 h-6" />
          Back to Lobby
        </button>
      </div>
    </div>
  );
};

export default FinalLeaderboard;