import React from 'react';
import { Crown, Trophy } from 'lucide-react';
import { Player } from '../context/GameContext';

type PlayersListProps = {
  players: Player[];
};

const PlayersList: React.FC<PlayersListProps> = ({ players }) => {
  // Sort players by score (highest first)
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

  return (
    <div className="bg-slate-800 rounded-lg p-4">
      <h2 className="text-xl font-bold mb-4 text-white flex items-center">
        <Trophy size={20} className="mr-2 text-yellow-500" />
        Players
      </h2>
      
      <div className="space-y-3">
        {sortedPlayers.map((player) => (
          <div 
            key={player.id} 
            className={`flex items-center justify-between p-3 rounded-lg ${
              player.isJudge ? 'bg-purple-900/50 border border-purple-500' : 'bg-slate-700'
            }`}
          >
            <div className="flex items-center">
              {player.avatar && (
                <img 
                  src={player.avatar} 
                  alt={player.username} 
                  className="w-8 h-8 rounded-full mr-3"
                />
              )}
              <div>
                <span className="text-white font-medium">
                  {player.username}
                  {player.isJudge && (
                    <Crown size={16} className="ml-2 inline-block text-yellow-500" />
                  )}
                </span>
                {player.isJudge && (
                  <div className="text-xs text-purple-300">Current Judge</div>
                )}
              </div>
            </div>
            <div className="bg-yellow-500 text-slate-900 font-bold rounded-full px-3 py-1 text-sm">
              {player.score}
            </div>
          </div>
        ))}
        
        {players.length === 0 && (
          <p className="text-slate-400 text-center italic py-4">
            No players have joined yet
          </p>
        )}
      </div>
    </div>
  );
};

export default PlayersList;