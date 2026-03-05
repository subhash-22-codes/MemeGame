import React from 'react';
import type { MemeSubmission, Player } from '../../context/GameContext';
import { Award, Check } from 'lucide-react';

type MemeGalleryProps = {
  sentence: string;
  submissions: MemeSubmission[];
  players: Player[];
  isJudge: boolean;
  onScore: (playerId: string, score: number) => void;
  allScored: boolean;
  onSubmitScores: () => void;
};

const MemeGallery: React.FC<MemeGalleryProps> = ({
  sentence,
  submissions,
  isJudge,
  onScore,
  allScored,
  onSubmitScores,
}) => {
  return (
    <div className="max-w-4xl mx-auto">
      {/* 1. The Sentence Prompt */}
      <div className="bg-white/95 backdrop-blur-md rounded-2xl p-4 lg:p-6 shadow-xl border border-white/30 text-center mb-6">
        <h3 className="text-sm font-mono text-slate-500 mb-2">The Judge's Sentence:</h3>
        <p className="text-xl lg:text-2xl font-bold text-slate-800 italic">
          "{sentence}"
        </p>
      </div>

      {/* 2. The Submitted Memes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {submissions.map((submission) => {
          const memeUrl = submission.memeUrl || submission.memeId; 
          
          // ⭐️ FIX 1: Robust score check (ensures buttons stay if score is 0, null, or undefined) ⭐️
          const scoreValue = Number(submission.score || 0);
          const hasBeenScored = scoreValue > 0;
          
          return (
            <div
              key={submission.playerId}
              className="bg-white/95 backdrop-blur-md rounded-lg shadow-lg border border-white/30 overflow-hidden"
            >
              {/* The Meme Image */}
              {memeUrl ? (
                <img
                  src={memeUrl}
                  alt="Meme"
                  className="w-full h-48 object-cover"
                />
              ) : (
                <div className="w-full h-48 bg-gray-200 flex items-center justify-center text-gray-400">
                  No Image Found
                </div>
              )}

              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-mono text-slate-600">
                    By: <span className="font-bold">{submission.username}</span>
                  </span>
                  {hasBeenScored && (
                    <div className="flex items-center gap-1 bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                      <Award size={14} />
                      <span className="font-bold text-sm">{scoreValue} pts</span>
                    </div>
                  )}
                </div>

                {/* ⭐️ FIX 2: Only show buttons if the user is the judge AND the meme has no points yet ⭐️ */}
                {isJudge && !hasBeenScored && (
                  <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <p className="text-[10px] font-bold font-mono text-center mb-2 text-slate-400 uppercase">Rate this meme</p>
                    <div className="grid grid-cols-5 gap-1">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((s) => (
                        <button
                          key={s}
                          onClick={() => onScore(submission.playerId, s)}
                          className="p-2 text-xs font-mono bg-gray-50 rounded border border-gray-200 text-gray-700 hover:bg-[#5F8B4C] hover:text-white hover:border-[#5F8B4C] transition-all shadow-sm active:scale-90"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. The "Show Results" Button */}
      {isJudge && allScored && (
        <div className="mt-8 text-center">
          <button
            onClick={onSubmitScores}
            className="flex items-center justify-center gap-3 p-4 w-full max-w-xs mx-auto bg-gradient-to-br from-[#5F8B4C] to-[#4A7039] text-white rounded-xl shadow-lg font-mono font-bold text-lg transition-all duration-300 hover:scale-105 active:scale-95"
          >
            <Check className="w-6 h-6" />
            Show Round Results
          </button>
        </div>
      )}
    </div>
  );
};

export default MemeGallery;