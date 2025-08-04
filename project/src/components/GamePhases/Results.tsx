import React from 'react';
import { Trophy, RotateCcw, Home } from 'lucide-react';
import { Player } from '../../context/GameContext';
import Leaderboard from '../UI/Leaderboard';

interface ResultsProps {
  players: Player[];
  roundNumber: number;
  totalRounds: number;
  roundWinner?: Player;
  gameWinner?: Player;
  isGameEnd: boolean;
  isHost: boolean;
  onNextRound?: () => void;
  onEndGame?: () => void;
  onBackToLobby?: () => void;
}

const Results: React.FC<ResultsProps> = ({
  players,
  roundNumber,
  totalRounds,
  roundWinner,
  gameWinner,
  isGameEnd,
  isHost,
  onNextRound,
  onEndGame,
  onBackToLobby
}) => {


  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-white/20">
        {isGameEnd ? (
          <>
            <Trophy className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-[#131010] font-['Poppins'] mb-2">
              Game Complete!
            </h1>
            <p className="text-[#131010]/70 font-mono">
              What an amazing game! Check out the final standings below.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-3xl font-bold text-[#131010] font-['Poppins'] mb-2">
              Round {roundNumber} Results
            </h1>
            <p className="text-[#131010]/70 font-mono">
              {totalRounds - roundNumber} rounds remaining
            </p>
          </>
        )}
      </div>

      {/* Round Winner Highlight */}
      {roundWinner && !isGameEnd && (
        <div className="bg-gradient-to-r from-[#D98324]/20 to-[#5F8B4C]/20 rounded-xl p-6 border-2 border-[#D98324] text-center">
          <Trophy className="w-12 h-12 text-[#D98324] mx-auto mb-3" />
          <h2 className="text-2xl font-bold text-[#131010] font-['Poppins'] mb-2">
            Round Winner!
          </h2>
          <div className="flex items-center justify-center gap-4 mb-3">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#5F8B4C] to-[#D98324] flex items-center justify-center">
              <span className="text-white font-mono text-xl font-bold">
                {roundWinner.username.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="text-left">
              <h3 className="text-xl font-bold text-[#131010] font-['Poppins']">
                {roundWinner.username}
              </h3>
              <p className="text-[#131010]/70 font-mono">
                Total Score: {roundWinner.score} points
              </p>
            </div>
          </div>
          <div className="text-4xl mb-2">🎉</div>
          <p className="text-[#131010]/70 font-mono text-sm">
            Congratulations on winning this round!
          </p>
        </div>
      )}

      {/* Leaderboard */}
      <Leaderboard
        players={players}
        roundWinner={!isGameEnd ? roundWinner : undefined}
        gameWinner={isGameEnd ? gameWinner : undefined}
        isGameEnd={isGameEnd}
      />

      {/* Action Buttons */}
      <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-white/20">
        {isGameEnd ? (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-[#131010] font-['Poppins'] text-center mb-4">
              What's next?
            </h3>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {isHost && (
                <button
                  onClick={onBackToLobby}
                  className="bg-[#5F8B4C] hover:bg-[#5F8B4C]/90 text-white font-bold py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg font-['Poppins'] flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-5 h-5" />
                  Play Again
                </button>
              )}
              <button
                onClick={onEndGame}
                className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg font-['Poppins'] flex items-center justify-center gap-2"
              >
                <Home className="w-5 h-5" />
                Back to Dashboard
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <h3 className="text-lg font-bold text-[#131010] font-['Poppins'] mb-4">
              Ready for the next round?
            </h3>
            {isHost ? (
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={onNextRound}
                  className="bg-[#D98324] hover:bg-[#D98324]/90 text-white font-bold py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg font-['Poppins'] flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-5 h-5" />
                  Start Next Round
                </button>
                <button
                  onClick={onEndGame}
                  className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg font-['Poppins'] flex items-center justify-center gap-2"
                >
                  <Home className="w-5 h-5" />
                  End Game
                </button>
              </div>
            ) : (
              <div className="bg-[#5F8B4C]/10 rounded-lg p-4 border border-[#5F8B4C]/20">
                <p className="text-[#131010]/70 font-mono">
                  Waiting for the host to start the next round...
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Fun Stats */}
      <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-white/20">
        <h3 className="text-lg font-bold text-[#131010] font-['Poppins'] mb-4 text-center">
          Game Stats
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div className="bg-[#5F8B4C]/10 rounded-lg p-3 border border-[#5F8B4C]/20">
            <div className="text-2xl font-bold text-[#5F8B4C] font-mono">
              {roundNumber}
            </div>
            <div className="text-sm text-[#131010]/70 font-mono">
              Rounds Played
            </div>
          </div>
          <div className="bg-[#D98324]/10 rounded-lg p-3 border border-[#D98324]/20">
            <div className="text-2xl font-bold text-[#D98324] font-mono">
              {players.length}
            </div>
            <div className="text-sm text-[#131010]/70 font-mono">
              Players
            </div>
          </div>
          <div className="bg-purple-100 rounded-lg p-3 border border-purple-200">
            <div className="text-2xl font-bold text-purple-600 font-mono">
              {Math.max(...players.map(p => p.score))}
            </div>
            <div className="text-sm text-[#131010]/70 font-mono">
              Highest Score
            </div>
          </div>
          <div className="bg-blue-100 rounded-lg p-3 border border-blue-200">
            <div className="text-2xl font-bold text-blue-600 font-mono">
              {Math.round(players.reduce((sum, p) => sum + p.score, 0) / players.length)}
            </div>
            <div className="text-sm text-[#131010]/70 font-mono">
              Avg Score
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Results;