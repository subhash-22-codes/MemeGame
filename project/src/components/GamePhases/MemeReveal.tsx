import React, { useState } from 'react';
import { User, Star, Trophy, Award, Clock, CheckCircle } from 'lucide-react';
import { MEMES } from '../../data/memes';
import { Player } from '../../context/GameContext';

interface MemeRevealProps {
  sentence: string;
  submissions: { playerId: string; memeId: string; score?: number }[];
  players: Player[];
  isJudge: boolean;
  onScore?: (playerId: string, score: number) => void;
  allScored?: boolean;
  onSubmitScores?: () => void;
}

const MemeReveal: React.FC<MemeRevealProps> = ({
  sentence,
  submissions,
  players,
  isJudge,
  onScore,
  allScored = false,
  onSubmitScores
}) => {
  const [scoredMemes, setScoredMemes] = useState<Set<string>>(new Set());

  const getPlayerById = (playerId: string) => {
    return players.find(p => p.id === playerId);
  };

  const getMemeById = (memeId: string) => {
    return MEMES.find(m => m.id === memeId);
  };

  const handleScoreClick = (playerId: string, score: number) => {
    if (isJudge && onScore && !allScored) {
      onScore(playerId, score);
      setScoredMemes(prev => new Set([...prev, playerId]));
    }
  };

  const handleSubmitAllScores = () => {
    if (isJudge && onSubmitScores && allScored) {
      onSubmitScores();
    }
  };

  const getSubmissionStatus = (submission: { playerId: string; memeId: string; score?: number }) => {
    if (submission.score !== undefined) {
      return 'scored';
    }
    if (scoredMemes.has(submission.playerId)) {
      return 'scored';
    }
    return 'pending';
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-600';
    if (score >= 6) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-white/20">
        <h1 className="text-2xl font-bold text-[#131010] font-['Poppins'] mb-4">
          {isJudge ? 'Judge the Meme Responses' : 'All Meme Responses'}
        </h1>
        <div className="bg-[#5F8B4C]/10 rounded-lg p-4 border border-[#5F8B4C]/20">
          <p className="text-lg text-[#131010] font-mono italic">
            "{sentence}"
          </p>
        </div>
        
        {/* Status Messages */}
        {isJudge && !allScored && (
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center justify-center gap-2 text-blue-700">
              <Award className="w-5 h-5" />
              <span className="font-mono text-sm font-medium">
                Rate each meme from 1-10 based on humor and relevance
              </span>
            </div>
          </div>
        )}

        {!isJudge && (
          <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-center justify-center gap-2 text-green-700">
              <Clock className="w-5 h-5" />
              <span className="font-mono text-sm font-medium">
                Judge is evaluating memes. Enjoy seeing your friends' humor!
              </span>
            </div>
          </div>
        )}

        {allScored && isJudge && (
          <div className="mt-4 bg-[#5F8B4C]/10 border border-[#5F8B4C] rounded-lg p-3">
            <div className="flex items-center justify-center gap-2 text-[#5F8B4C]">
              <CheckCircle className="w-5 h-5" />
              <span className="font-mono text-sm font-medium">
                All memes scored! Ready to submit round scores
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Submissions Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {submissions.map((submission) => {
          const player = getPlayerById(submission.playerId);
          const meme = getMemeById(submission.memeId);
          const status = getSubmissionStatus(submission);

          if (!player || !meme) return null;

          return (
            <div
              key={submission.playerId}
              className={`bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 overflow-hidden transition-all duration-300 ${
                status === 'scored' ? 'ring-2 ring-[#5F8B4C]' : ''
              }`}
            >
              {/* Player Header */}
              <div className="bg-gradient-to-r from-[#5F8B4C]/10 to-[#D98324]/10 p-4 border-b border-white/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#5F8B4C] to-[#D98324] flex items-center justify-center">
                      <span className="text-white font-mono text-sm font-bold">
                        {player.username.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-mono font-semibold text-[#131010]">
                        {player.username}
                      </h3>
                      <p className="text-sm text-[#131010]/60 font-mono">
                        Score: {player.score}
                      </p>
                    </div>
                  </div>
                  
                  {/* Status Indicator */}
                  <div className="flex items-center gap-2">
                    {status === 'scored' ? (
                      <div className="flex items-center gap-1 text-[#5F8B4C]">
                        <CheckCircle className="w-4 h-4" />
                        <span className="text-xs font-mono">Scored</span>
                      </div>
                    ) : isJudge ? (
                      <div className="flex items-center gap-1 text-orange-500">
                        <Clock className="w-4 h-4" />
                        <span className="text-xs font-mono">Pending</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-gray-500">
                        <User className="w-4 h-4" />
                        <span className="text-xs font-mono">Waiting</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Meme Image */}
              <div className="aspect-square bg-gray-100 flex items-center justify-center p-4">
                <img
                  src={meme.url}
                  alt={meme.title}
                  className="w-full h-full object-cover rounded-lg"
                />
              </div>

              {/* Meme Info */}
              <div className="p-4">
                <h4 className="font-mono font-semibold text-[#131010] text-center mb-3">
                  {meme.title}
                </h4>
                
                {/* Score Display/Input */}
                {submission.score !== undefined ? (
                  <div className="text-center">
                    <div className="bg-[#5F8B4C]/10 rounded-lg p-3 border border-[#5F8B4C]/20">
                      <div className={`text-2xl font-bold font-mono ${getScoreColor(submission.score)}`}>
                        {submission.score}/10
                      </div>
                      <div className="text-sm text-[#131010]/60 font-mono">
                        Points Awarded
                      </div>
                      <div className="flex justify-center mt-2">
                        {[...Array(10)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${
                              i < submission.score! ? 'text-yellow-400 fill-current' : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                ) : isJudge ? (
                  <div className="space-y-3">
                    <p className="text-center text-sm text-[#131010]/70 font-mono">
                      Rate this meme:
                    </p>
                    <div className="grid grid-cols-5 gap-2">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
                        <button
                          key={score}
                          onClick={() => handleScoreClick(submission.playerId, score)}
                          className="bg-[#D98324] hover:bg-[#D98324]/90 text-white font-mono font-bold py-2 px-1 rounded-lg transition-all duration-300 transform hover:scale-105 text-sm"
                        >
                          {score}
                        </button>
                      ))}
                    </div>
                    <div className="text-center text-xs text-[#131010]/50 font-mono">
                      1=Poor • 5=Good • 10=Hilarious
                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="bg-gray-100 rounded-lg p-3">
                      <User className="w-5 h-5 text-gray-400 mx-auto mb-1" />
                      <div className="text-sm text-[#131010]/60 font-mono">
                        Waiting for judge...
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Judge Submit Button */}
      {allScored && isJudge && onSubmitScores && (
        <div className="text-center">
          <button
            onClick={handleSubmitAllScores}
            className="bg-gradient-to-r from-[#5F8B4C] to-[#7BA05C] text-white px-8 py-4 rounded-xl font-bold font-mono text-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
          >
            <div className="flex items-center gap-3">
              <Trophy className="w-6 h-6" />
              <span>Submit Round {submissions.length} Scores</span>
            </div>
          </button>
          <p className="text-[#131010]/60 font-mono text-sm mt-2">
            Submit scores to proceed to next round
          </p>
        </div>
      )}

      {/* All Scored Status */}
      {allScored && !isJudge && (
        <div className="bg-[#5F8B4C]/10 rounded-xl p-6 border-2 border-[#5F8B4C] text-center">
          <Star className="w-8 h-8 text-[#D98324] mx-auto mb-2" />
          <h3 className="text-lg font-bold text-[#131010] font-['Poppins'] mb-2">
            All Memes Scored!
          </h3>
          <p className="text-[#131010]/70 font-mono">
            The judge has finished scoring. Results coming soon!
          </p>
        </div>
      )}
    </div>
  );
};

export default MemeReveal;