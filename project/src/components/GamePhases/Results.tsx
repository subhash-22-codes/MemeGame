import React from 'react';
import type { Player } from '../../context/GameContext';
import { Award, ChevronsRight, Crown } from 'lucide-react';

// Define the props Game.tsx will pass to this component
type ResultsProps = {
  players: Player[];
  roundNumber: number;
  totalRounds: number;
  roundWinner: Player | undefined; // The player who won this round
  isHost: boolean;
  onNextRound: () => void; // Function to call to move to next round
  isGameEnd: boolean; // Is this the very last round?
};

const Results: React.FC<ResultsProps> = ({
  players,
  roundNumber,
  roundWinner,
  isHost,
  onNextRound,
  isGameEnd,
}) => {
  // Sort players by total score for the leaderboard
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

  return (
    <div className="max-w-4xl mx-auto">
      {/* 1. Round Winner Card */}
      <div className="bg-white/95 backdrop-blur-md rounded-2xl p-6 lg:p-8 shadow-xl border border-white/30 text-center mb-6">
        <Award className="w-16 h-16 text-[#D98324] mx-auto mb-4" />
        <h2 className="text-2xl lg:text-3xl font-bold text-slate-800 mb-3">
          Round {roundNumber} Winner!
        </h2>
        <p className="text-slate-500 font-mono text-sm lg:text-base mb-6">
          The top meme for this round was submitted by...
        </p>
        <div className="bg-[#5F8B4C]/10 rounded-lg p-4 border border-[#5F8B4C]/20">
          <p className="text-3xl text-[#5F8B4C] font-bold font-mono">
            {roundWinner?.username || 'N/A'}
          </p>
        </div>
      </div>

      {/* 2. Leaderboard */}
      <div className="bg-white/95 backdrop-blur-md rounded-2xl p-6 lg:p-8 shadow-xl border border-white/30">
        <h3 className="text-xl font-bold text-slate-800 mb-4 text-center font-mono">
          Overall Scores
        </h3>
        <div className="space-y-3">
          {sortedPlayers.map((player, index) => (
            <div
              key={player.id}
              className="flex items-center justify-between p-4 bg-gray-50/50 rounded-lg border"
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
                {player.isHost && <Crown size={16} className="text-[#D98324]" />}
              </div>
              <span className="text-lg font-bold text-[#5F8B4C]">
                {player.score} pts
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 3. "Next" Button (for Host) */}
      {isHost && (
        <div className="mt-8 text-center">
          <button
            onClick={onNextRound}
            className="flex items-center justify-center gap-3 p-4 w-full max-w-xs mx-auto bg-gradient-to-br from-[#5F8B4C] to-[#7BA05C] text-white rounded-xl shadow-lg font-mono font-bold text-lg transition-all duration-300 hover:scale-105"
          >
            {isGameEnd ? 'Show Final Results' : 'Start Next Round'}
            <ChevronsRight className="w-6 h-6" />
          </button>
        </div>
      )}

      {/* 4. "Waiting" Message (for Players) */}
      {!isHost && (
        <div className="mt-8 text-center">
          <p className="text-slate-500 font-mono text-sm lg:text-base">
            Waiting for the host to continue...
          </p>
        </div>
      )}
    </div>
  );
};

export default Results;