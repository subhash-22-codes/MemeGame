import React from 'react';
import { Crown, Medal, Trophy, Users, Award, Star } from 'lucide-react';

interface Player {
  id: string;
  username: string;
  score: number;
  roundScores?: Array<{ round: number; score: number }>;
  isJudge?: boolean;
}

interface FinalLeaderboardProps {
  players: Player[];
  totalRounds: number;
  onPlayAgain?: () => void;
  onBackToLobby?: () => void;
  isHost?: boolean;
}

const FinalLeaderboard: React.FC<FinalLeaderboardProps> = ({
  players,
  totalRounds,
  onPlayAgain,
  onBackToLobby,
  isHost = false
}) => {
  // Sort players by total score (descending)
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
  
  // Calculate max possible score (totalRounds * 10)
  const maxPossibleScore = (totalRounds && !isNaN(totalRounds)) ? totalRounds * 10 : 50; // Default to 50 if NaN
  
  console.log('[FinalLeaderboard] Debug:', {
    totalRounds,
    maxPossibleScore,
    playersCount: players.length,
    players: players.map(p => ({ username: p.username, score: p.score, roundScores: p.roundScores }))
  });
  
  // Get winner
  const winner = sortedPlayers[0];
  const isTie = sortedPlayers.length > 1 && sortedPlayers[0].score === sortedPlayers[1].score;

  const getRankIcon = (index: number) => {
    if (index === 0) return <Crown className="w-6 h-6 text-yellow-500" />;
    if (index === 1) return <Medal className="w-6 h-6 text-gray-400" />;
    if (index === 2) return <Medal className="w-6 h-6 text-amber-600" />;
    return <span className="text-lg font-bold text-[#131010]/60">{index + 1}</span>;
  };

  const getScorePercentage = (score: number) => {
    return Math.round((score / maxPossibleScore) * 100);
  };

  const getScoreColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 60) return 'text-yellow-600';
    if (percentage >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFDDAB] via-[#FFDDAB]/90 to-[#FFDDAB]/80 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <Trophy className="w-12 h-12 text-[#D98324]" />
            <h1 className="text-4xl lg:text-5xl font-bold text-[#D98324] tracking-tight" style={{ fontFamily: 'Poppins, sans-serif' }}>
              Game Complete!
            </h1>
          </div>
          <p className="text-lg text-[#131010]/80 max-w-2xl mx-auto leading-relaxed" style={{ fontFamily: 'Courier, monospace' }}>
            Final results after {totalRounds} rounds of hilarious memes
          </p>
        </div>

        {/* Winner Celebration */}
        {winner && (
          <div className="mb-8 text-center">
            <div className="bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-2xl p-6 shadow-xl border-4 border-yellow-300">
              <div className="flex items-center justify-center gap-3 mb-4">
                <Crown className="w-8 h-8 text-white" />
                <h2 className="text-2xl font-bold text-white" style={{ fontFamily: 'Poppins, sans-serif' }}>
                  {isTie ? 'Tie Game!' : '🏆 Winner!'}
                </h2>
              </div>
              <div className="text-white text-lg font-semibold">
                {isTie 
                  ? `${winner.username} and ${sortedPlayers[1].username} tied with ${winner.score}/${maxPossibleScore} points!`
                  : `${winner.username} wins with ${winner.score}/${maxPossibleScore} points!`
                }
              </div>
            </div>
          </div>
        )}

        {/* Leaderboard */}
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden mb-8">
          <div className="bg-gradient-to-r from-[#5F8B4C] to-[#7BA05C] px-6 py-4">
            <h3 className="text-xl font-bold text-white flex items-center" style={{ fontFamily: 'Poppins, sans-serif' }}>
              <Award className="w-6 h-6 mr-3" />
              Final Leaderboard
            </h3>
            <p className="text-white/90 text-sm" style={{ fontFamily: 'Courier, monospace' }}>
              Total scores out of {maxPossibleScore} points
            </p>
          </div>

          <div className="p-6">
            {sortedPlayers.map((player, index) => {
              const percentage = getScorePercentage(player.score);
              const scoreColor = getScoreColor(percentage);
              
              return (
                <div key={player.id} className="mb-4 last:mb-0">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-all duration-300">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-10 h-10 bg-white rounded-full shadow-md">
                        {getRankIcon(index)}
                      </div>
                      <div>
                        <h4 className="font-bold text-[#131010] text-lg" style={{ fontFamily: 'Poppins, sans-serif' }}>
                          {player.username}
                        </h4>
                        <div className="flex items-center gap-2 text-sm text-[#131010]/70">
                          <Users className="w-4 h-4" />
                          <span style={{ fontFamily: 'Courier, monospace' }}>
                            {player.roundScores?.length || 0} rounds played
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className={`text-2xl font-bold ${scoreColor}`} style={{ fontFamily: 'Poppins, sans-serif' }}>
                        {player.score}/{maxPossibleScore}
                      </div>
                      <div className="text-sm text-[#131010]/60" style={{ fontFamily: 'Courier, monospace' }}>
                        {percentage}% accuracy
                      </div>
                    </div>
                  </div>
                  
                  {/* Score Progress Bar */}
                  <div className="mt-2 bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-500 ${
                        percentage >= 80 ? 'bg-green-500' :
                        percentage >= 60 ? 'bg-yellow-500' :
                        percentage >= 40 ? 'bg-orange-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Round-by-Round Breakdown */}
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden mb-8">
          <div className="bg-gradient-to-r from-[#D98324] to-[#E69B3A] px-6 py-4">
            <h3 className="text-xl font-bold text-white flex items-center" style={{ fontFamily: 'Poppins, sans-serif' }}>
              <Star className="w-6 h-6 mr-3" />
              Round-by-Round Breakdown
            </h3>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sortedPlayers.map((player) => (
                <div key={player.id} className="bg-gray-50 rounded-xl p-4">
                  <h4 className="font-bold text-[#131010] mb-3" style={{ fontFamily: 'Poppins, sans-serif' }}>
                    {player.username}
                  </h4>
                  <div className="space-y-2">
                    {player.roundScores?.map((roundScore, index) => (
                      <div key={index} className="flex justify-between items-center text-sm">
                        <span className="text-[#131010]/70" style={{ fontFamily: 'Courier, monospace' }}>
                          Round {roundScore.round}:
                        </span>
                        <span className="font-semibold text-[#131010]">
                          {roundScore.score}/10
                        </span>
                      </div>
                    )) || (
                      <div className="text-[#131010]/50 text-sm italic" style={{ fontFamily: 'Courier, monospace' }}>
                        No round data available
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Game Statistics */}
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden mb-8">
          <div className="bg-gradient-to-r from-purple-500 to-purple-600 px-6 py-4">
            <h3 className="text-xl font-bold text-white flex items-center" style={{ fontFamily: 'Poppins, sans-serif' }}>
              <Award className="w-6 h-6 mr-3" />
              Game Statistics
            </h3>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-[#5F8B4C]" style={{ fontFamily: 'Poppins, sans-serif' }}>
                  {players.length}
                </div>
                <div className="text-sm text-[#131010]/70" style={{ fontFamily: 'Courier, monospace' }}>
                  Players
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-[#D98324]" style={{ fontFamily: 'Poppins, sans-serif' }}>
                  {totalRounds}
                </div>
                <div className="text-sm text-[#131010]/70" style={{ fontFamily: 'Courier, monospace' }}>
                  Rounds
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-[#E69B3A]" style={{ fontFamily: 'Poppins, sans-serif' }}>
                  {maxPossibleScore}
                </div>
                <div className="text-sm text-[#131010]/70" style={{ fontFamily: 'Courier, monospace' }}>
                  Max Score
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600" style={{ fontFamily: 'Poppins, sans-serif' }}>
                  {winner?.username || 'N/A'}
                </div>
                <div className="text-sm text-[#131010]/70" style={{ fontFamily: 'Courier, monospace' }}>
                  Winner
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        {isHost && (
          <div className="text-center space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={onPlayAgain}
                className="bg-gradient-to-r from-[#5F8B4C] to-[#7BA05C] text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                style={{ fontFamily: 'Poppins, sans-serif' }}
              >
                Play Again
              </button>
              <button
                onClick={onBackToLobby}
                className="bg-gradient-to-r from-[#D98324] to-[#E69B3A] text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                style={{ fontFamily: 'Poppins, sans-serif' }}
              >
                Back to Lobby
              </button>
            </div>
            <p className="text-[#131010]/60 text-sm" style={{ fontFamily: 'Courier, monospace' }}>
              Only the host can start a new game
            </p>
          </div>
        )}

        {!isHost && (
          <div className="text-center">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
              <div className="flex items-center justify-center gap-2 text-blue-700 mb-2">
                <Users className="w-5 h-5" />
                <span className="font-semibold" style={{ fontFamily: 'Poppins, sans-serif' }}>
                  Waiting for Host
                </span>
              </div>
              <p className="text-blue-600 text-sm" style={{ fontFamily: 'Courier, monospace' }}>
                The host will decide whether to play again or return to the lobby
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FinalLeaderboard; 