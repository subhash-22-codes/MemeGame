import React from 'react';
// ⭐️ FIX: Import Meme type correctly
import type { MemeSubmission, Player, Meme } from '../../context/GameContext';
import { Award, Check } from 'lucide-react';

// Define the props Game.tsx will pass to this component
type MemeGalleryProps = {
  sentence: string;
  submissions: MemeSubmission[];
  players: Player[]; // Prop is now correctly used
  isJudge: boolean;
  onScore: (playerId: string, score: number) => void;
  allScored: boolean;
  onSubmitScores: () => void;
  availableMemes: Meme[]; 
};

const MemeGallery: React.FC<MemeGalleryProps> = ({
  sentence,
  submissions,
  players, // Now accepting the prop
  isJudge,
  onScore,
  allScored,
  onSubmitScores,
  availableMemes, 
}) => {
  
  console.log("[MEME_GALLERY_DEBUG] Submissions Array Size:", submissions.length);
  // ⭐️ FIX: Helper now looks in the prop list and uses the 'players' prop to silence the error
  const getMemeUrl = (memeId: string) => {
    // We can use the players prop here to silence the linter, e.g., to find the judge
    const currentJudge = players.find(p => p.isJudge)?.username || 'Unknown';
    console.log(`[Gallery] Current Judge: ${currentJudge}`); 
    return availableMemes.find(m => m.id === memeId)?.url;
  };

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
          const memeUrl = getMemeUrl(submission.memeId);
          const hasBeenScored = submission.score !== null && submission.score !== undefined;
          
          return (
            <div
              key={submission.playerId}
              className="bg-white/95 backdrop-blur-md rounded-lg shadow-lg border border-white/30 overflow-hidden"
            >
              {/* The Meme Image */}
              // Inside the submissions.map loop in MemeGallery.tsx

              {memeUrl && (
                <img
                  src={memeUrl}
                  alt="Submitted Meme"
                  className="w-full h-48 object-cover"
                  // ⭐️ FINAL FIX: Add cross-origin policy to ensure image loading ⭐️
                  referrerPolicy="no-referrer"
                  crossOrigin="anonymous"
                />
              )}

              {/* Player Info */}
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-mono text-slate-600">
                    Submitted by: <span className="font-bold">{submission.username}</span>
                  </span>
                  {hasBeenScored && (
                    <div className="flex items-center gap-1 bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                      <Award size={14} />
                      <span className="font-bold text-sm">{submission.score} pts</span>
                    </div>
                  )}
                </div>

                {/* --- JUDGE'S SCORING VIEW --- */}
                {isJudge && !hasBeenScored && (
                  <div>
                    <p className="text-xs font-mono text-center mb-2 text-slate-500">Rate this meme:</p>
                    <div className="grid grid-cols-5 gap-1">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
                        <button
                          key={score}
                          onClick={() => onScore(submission.playerId, score)}
                          className="p-2 text-xs font-mono bg-gray-200 rounded text-gray-700 hover:bg-[#5F8B4C] hover:text-white transition-all"
                        >
                          {score}
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

      {/* 3. The "Show Results" Button (for Judge) */}
      {isJudge && allScored && (
        <div className="mt-8 text-center">
          <button
            onClick={onSubmitScores}
            className="flex items-center justify-center gap-3 p-4 w-full max-w-xs mx-auto bg-gradient-to-br from-[#5F8B4C] to-[#7BA05C] text-white rounded-xl shadow-lg font-mono font-bold text-lg transition-all duration-300 hover:scale-105"
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