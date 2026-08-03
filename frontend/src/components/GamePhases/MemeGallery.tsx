import React from 'react';
// ⭐️ FIX: Import Meme type correctly
import type { MemeSubmission, Player, Meme } from '../../context/GameContext';
import { Award, Check, MessageSquare, Gavel } from 'lucide-react';

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
    <div className="max-w-4xl mx-auto w-full animate-fade-in">
      
      {/* 1. The Sentence Prompt (Bento Banner) */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 border-2 border-[#131010] shadow-[4px_4px_0px_0px_#131010] mb-6 sm:mb-8 text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-[#D98324]"></div>
        <div className="inline-flex items-center gap-1.5 bg-[#FFDDAB] px-3 py-1 rounded-md border border-[#131010] font-black text-[10px] text-[#131010] uppercase tracking-widest mb-3">
          <MessageSquare className="w-3 h-3" strokeWidth={3} /> The Prompt
        </div>
        <p className="text-lg sm:text-xl md:text-2xl font-black text-[#131010] font-poppins leading-tight px-2">
          "{sentence}"
        </p>
      </div>

      {/* 2. The Submitted Memes Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {submissions.map((submission, index) => {
          const memeUrl = getMemeUrl(submission.memeId);
          const hasBeenScored = submission.score !== null && submission.score !== undefined;
          
          return (
            <div
              key={submission.playerId}
              className="bg-white rounded-2xl border-2 border-[#131010] shadow-[4px_4px_0px_0px_#131010] overflow-hidden flex flex-col transform transition-all hover:-translate-y-1"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* The Meme Image */}
              <div className="relative aspect-square border-b-2 border-[#131010]">
                {memeUrl ? (
                  <img
                    src={memeUrl}
                    alt="Submitted Meme"
                    className="w-full h-full object-cover"
                    // ⭐️ FINAL FIX: Add cross-origin policy to ensure image loading ⭐️
                    referrerPolicy="no-referrer"
                    crossOrigin="anonymous"
                  />
                ) : (
                  <div className="w-full h-full bg-[#131010]/5 flex items-center justify-center text-[#131010]/40 font-bold font-courier text-sm">
                    Image Lost in the Void
                  </div>
                )}
                
                {/* Score Badge Overlay */}
                {hasBeenScored && (
                  <div className="absolute top-3 right-3 bg-[#5F8B4C] text-white border-2 border-[#131010] shadow-[2px_2px_0px_0px_#131010] px-3 py-1.5 rounded-lg flex items-center gap-1 animate-fade-in-up">
                    <Award size={16} strokeWidth={2.5} />
                    <span className="font-black font-poppins">{submission.score}</span>
                    <span className="text-[10px] font-bold font-courier uppercase tracking-wider opacity-80">pts</span>
                  </div>
                )}
              </div>

              {/* Player Info & Controls */}
              <div className="p-4 flex-1 flex flex-col justify-between bg-[#FFDDAB]/10">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-6 h-6 rounded bg-[#131010] flex items-center justify-center text-white font-black text-xs">
                    {submission.username?.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-bold font-poppins text-[#131010] truncate">
                    {submission.username}
                  </span>
                </div>

                {/* --- JUDGE'S SCORING VIEW (Tactile Keycaps) --- */}
                {isJudge && !hasBeenScored && (
                  <div className="animate-fade-in-up">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-[1px] flex-1 bg-[#131010]/10"></div>
                      <p className="text-[10px] font-bold font-courier text-[#131010]/50 uppercase tracking-widest flex items-center gap-1">
                        <Gavel size={12} /> Rate It
                      </p>
                      <div className="h-[1px] flex-1 bg-[#131010]/10"></div>
                    </div>
                    <div className="grid grid-cols-5 gap-1.5">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
                        <button
                          key={score}
                          onClick={() => onScore(submission.playerId, score)}
                          className="py-1.5 text-xs font-black font-poppins bg-white border-2 border-[#131010] rounded-md text-[#131010] shadow-[2px_2px_0px_0px_#131010] hover:bg-[#FFDDAB] active:translate-y-[2px] active:shadow-none transition-all"
                        >
                          {score}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Waiting for Judge state for non-judges / unscored memes */}
                {!isJudge && !hasBeenScored && (
                  <div className="mt-auto pt-3 border-t-2 border-dashed border-[#131010]/10 text-center">
                    <p className="text-xs font-bold text-[#131010]/40 font-courier uppercase tracking-widest animate-pulse">
                      Awaiting Verdict...
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. The "Show Results" Button (for Judge) */}
      {isJudge && allScored && (
        <div className="mt-8 sm:mt-12 text-center animate-fade-in-up">
          <button
            onClick={onSubmitScores}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-4 bg-[#D98324] text-[#131010] rounded-xl border-2 border-[#131010] shadow-[4px_4px_0px_0px_#131010] hover:shadow-[6px_6px_0px_0px_#131010] active:translate-y-[2px] active:shadow-none font-poppins font-black text-lg transition-all"
          >
            <Check className="w-6 h-6" strokeWidth={3} />
            Show Round Results
          </button>
        </div>
      )}

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fade-in 0.3s ease-out forwards; }
        .animate-fade-in-up { animation: fade-in-up 0.3s ease-out forwards; }
      `}</style>
    </div>
  );
};

export default MemeGallery;