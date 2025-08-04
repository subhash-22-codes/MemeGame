import React from 'react';
import { Crown, Users } from 'lucide-react';
import { Player } from '../../context/GameContext';

interface JudgeAssignmentProps {
  currentJudge: Player;
  roundNumber: number;
  totalRounds: number;
  players: Player[];
  onReady: () => void;
  isCurrentUserJudge: boolean;
}

const JudgeAssignment: React.FC<JudgeAssignmentProps> = ({
  currentJudge,
  roundNumber,
  totalRounds,
  players,
  onReady,
  isCurrentUserJudge
}) => {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Round Header */}
      <div className="text-center bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-white/20">
        <h1 className="text-3xl font-bold text-[#131010] font-['Poppins'] mb-2">
          Round {roundNumber} of {totalRounds}
        </h1>
        <div className="w-32 h-1 bg-gradient-to-r from-[#5F8B4C] to-[#D98324] mx-auto rounded-full"></div>
      </div>

      {/* Judge Announcement */}
      <div className="bg-white/90 backdrop-blur-sm rounded-xl p-8 shadow-lg border border-white/20 text-center">
        <div className="mb-6">
          <Crown className="w-16 h-16 text-[#D98324] mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-[#131010] font-['Poppins'] mb-2">
            {isCurrentUserJudge ? "You are the Judge!" : "The Judge has been chosen"}
          </h2>
          <p className="text-[#131010]/70 font-mono text-lg">
            {isCurrentUserJudge 
              ? "You'll create a sentence prompt for the other players to respond to with memes."
              : `${currentJudge.username} will create a sentence prompt for you to respond to with a meme.`
            }
          </p>
        </div>

        {/* Judge Card */}
        <div className="inline-block bg-gradient-to-br from-[#D98324]/20 to-[#5F8B4C]/20 rounded-xl p-6 border-2 border-[#D98324]">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#5F8B4C] to-[#D98324] flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-mono text-2xl font-bold">
              {currentJudge.username.charAt(0).toUpperCase()}
            </span>
          </div>
          <h3 className="text-xl font-bold text-[#131010] font-['Poppins'] mb-1">
            {currentJudge.username}
          </h3>
          <div className="flex items-center justify-center gap-2 text-[#D98324]">
            <Crown className="w-4 h-4" />
            <span className="font-mono text-sm font-semibold">JUDGE</span>
          </div>
          <p className="text-[#131010]/70 font-mono text-sm mt-2">
            Current Score: {currentJudge.score}
          </p>
        </div>

        {/* Instructions */}
        <div className="mt-8 p-4 bg-[#5F8B4C]/10 rounded-lg border border-[#5F8B4C]/20">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Users className="w-5 h-5 text-[#5F8B4C]" />
            <span className="font-mono font-semibold text-[#131010]">How it works:</span>
          </div>
          <ul className="text-[#131010]/70 font-mono text-sm space-y-1">
            <li>• The judge creates a sentence prompt</li>
            <li>• Players select the funniest meme response</li>
            <li>• The judge scores each meme (1-10 points)</li>
            <li>• Highest score wins the round!</li>
          </ul>
        </div>

        {/* Ready Button */}
        <div className="mt-8">
          <button
            onClick={onReady}
            className="bg-[#D98324] hover:bg-[#D98324]/90 text-white font-bold py-4 px-8 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg font-['Poppins'] text-lg"
          >
            {isCurrentUserJudge ? "Start Creating Prompt" : "Ready to Play"}
          </button>
        </div>
      </div>

      {/* Players Overview */}
      <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-white/20">
        <h3 className="text-lg font-bold text-[#131010] font-['Poppins'] mb-4 text-center">
          Players This Round
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {players.map((player) => (
            <div
              key={player.id}
              className={`p-3 rounded-lg text-center transition-all duration-300 ${
                player.isJudge 
                  ? 'bg-[#D98324]/20 border-2 border-[#D98324]' 
                  : 'bg-gray-50 border border-gray-200'
              }`}
            >
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#5F8B4C] to-[#D98324] flex items-center justify-center mx-auto mb-2">
                <span className="text-white font-mono text-sm font-bold">
                  {player.username.charAt(0).toUpperCase()}
                </span>
              </div>
              <p className="font-mono font-semibold text-[#131010] text-sm">
                {player.username}
              </p>
              <p className="font-mono text-xs text-[#131010]/60">
                {player.score} pts
              </p>
              {player.isJudge && (
                <div className="flex items-center justify-center gap-1 mt-1">
                  <Crown className="w-3 h-3 text-[#D98324]" />
                  <span className="text-xs font-mono text-[#D98324]">Judge</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default JudgeAssignment;