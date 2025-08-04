import React from 'react';
import { Trophy, Award, Medal } from 'lucide-react';
import { Player } from '../../context/GameContext';

interface LeaderboardProps {
  players: Player[];
  roundWinner?: Player;
  gameWinner?: Player;
  isGameEnd?: boolean;
}

const Leaderboard: React.FC<LeaderboardProps> = ({ 
  players, 
  roundWinner, 
  gameWinner, 
  isGameEnd = false 
}) => {
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Trophy className="w-5 h-5 text-yellow-500" />;
      case 1:
        return <Award className="w-5 h-5 text-gray-400" />;
      case 2:
        return <Medal className="w-5 h-5 text-amber-600" />;
      default:
        return <div className="w-5 h-5 flex items-center justify-center text-[#131010] font-mono font-bold">{index + 1}</div>;
    }
  };

  const getRankBorder = (index: number) => {
    switch (index) {
      case 0:
        return 'border-yellow-500 bg-yellow-500/10';
      case 1:
        return 'border-gray-400 bg-gray-400/10';
      case 2:
        return 'border-amber-600 bg-amber-600/10';
      default:
        return 'border-gray-300 bg-gray-50';
    }
  };

  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-white/20">
      {isGameEnd ? (
        <div className="text-center mb-6">
          <Trophy className="w-12 h-12 text-yellow-500 mx-auto mb-2" />
          <h2 className="text-2xl font-bold text-[#131010] font-['Poppins']">Game Over!</h2>
          {gameWinner && (
            <p className="text-lg text-[#131010]/80 font-mono mt-2">
              🎉 {gameWinner.username} wins with {gameWinner.score} points!
            </p>
          )}
        </div>
      ) : (
        <div className="mb-6">
          <h3 className="text-xl font-bold text-[#131010] font-['Poppins'] text-center">Leaderboard</h3>
          {roundWinner && (
            <div className="text-center mt-2 p-3 bg-[#D98324]/10 rounded-lg border-2 border-[#D98324]">
              <p className="text-[#131010] font-mono">
                🏆 Round Winner: <span className="font-bold">{roundWinner.username}</span>
              </p>
            </div>
          )}
        </div>
      )}

      <div className="space-y-3">
        {sortedPlayers.map((player, index) => (
          <div
            key={player.id}
            className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all duration-300 ${getRankBorder(index)}`}
          >
            <div className="flex items-center gap-4">
              {getRankIcon(index)}
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#5F8B4C] to-[#D98324] flex items-center justify-center">
                <span className="text-white font-mono text-sm font-bold">
                  {player.username.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <div className="font-mono font-semibold text-[#131010] text-lg">
                  {player.username}
                </div>
                {player.isJudge && (
                  <div className="text-sm text-[#D98324] font-mono">Current Judge</div>
                )}
              </div>
            </div>
            
            <div className="text-right">
              <div className="text-2xl font-bold text-[#131010] font-mono">
                {player.score}
              </div>
              <div className="text-sm text-[#131010]/60 font-mono">
                points
              </div>
            </div>
          </div>
        ))}
      </div>

      {isGameEnd && gameWinner && (
        <div className="mt-6 text-center">
          <div className="text-6xl mb-2">🎊</div>
          <p className="text-[#131010]/70 font-mono">
            Thanks for playing! Want to play again?
          </p>
        </div>
      )}
    </div>
  );
};

export default Leaderboard;