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
      <div className="bg-[#FFDDAB] rounded-2xl p-4 sm:p-5 border-2 border-[#131010] shadow-[4px_4px_0px_0px_#131010] text-center mb-6 relative overflow-hidden">
        {/* Subtle grid pattern to keep the "Soul" */}
        <div className="absolute inset-0 opacity-[0.05] bg-[linear-gradient(#131010_1px,transparent_1px),linear-gradient(90deg,#131010_1px,transparent_1px)] bg-[size:15px_15px] pointer-events-none" />

        <div className="relative z-10">
          <h3 className="text-[10px] sm:text-xs font-bold font-courier text-[#131010]/50 uppercase tracking-[0.2em] mb-2">
            The Judge's Sentence
          </h3>
          <p className="text-lg sm:text-xl font-black text-[#131010] font-poppins leading-tight">
            "{sentence}"
          </p>
        </div>
      </div>

      {/* 2. The Submitted Memes Grid */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 px-1 sm:px-2">
  {submissions.map((submission) => {
    const memeUrl = submission.memeUrl || submission.memeId;
    const scoreValue = Number(submission.score || 0);
    const hasBeenScored = scoreValue > 0;

    return (
      <div
        key={submission.playerId}
        className="bg-white rounded-xl border-2 border-[#131010] shadow-[3px_3px_0px_0px_#131010] overflow-hidden flex flex-col transition-transform active:scale-[0.98]"
      >
        {/* Meme Image */}
        <div className="aspect-square bg-[#131010]/5 border-b-2 border-[#131010] relative">
          {memeUrl ? (
            <img
              src={memeUrl}
              alt="Meme"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[#131010]/20 font-bold font-courier text-[10px]">
              EMPTY
            </div>
          )}

          {/* Score Badge */}
          {hasBeenScored && (
            <div className="absolute top-1 right-1 sm:top-1.5 sm:right-1.5 bg-[#5F8B4C] text-white border-2 border-[#131010] px-1.5 py-0.5 rounded-lg shadow-[2px_2px_0px_0px_#131010] flex items-center gap-1">
              <Award size={10} strokeWidth={3} />
              <span className="font-black font-poppins text-[10px]">
                {scoreValue}
              </span>
            </div>
          )}
        </div>

        <div className="p-2 sm:p-2.5 flex flex-col flex-1 justify-between bg-[#FFDDAB]/5">
          <div className="mb-2">
            <span className="text-[9px] font-bold font-courier text-[#131010]/40 uppercase tracking-tighter block leading-none mb-0.5">
              SUBMITTED BY
            </span>

            <span className="text-[10px] sm:text-[11px] font-black font-poppins text-[#131010] truncate block leading-tight">
              {submission.username}
            </span>
          </div>

          {/* Judge scoring */}
          {isJudge && !hasBeenScored && (
            <div className="pt-2 border-t border-[#131010]/10">
              <div className="grid grid-cols-5 gap-1">
                {[1,2,3,4,5,6,7,8,9,10].map((s) => (
                  <button
                    key={s}
                    onClick={() => onScore(submission.playerId, s)}
                    className="py-1 text-[10px] font-black font-poppins bg-white border-2 border-[#131010] rounded-md text-[#131010] shadow-[1.5px_1.5px_0px_0px_#131010] hover:bg-[#FFDDAB] active:translate-y-[1px] active:shadow-none transition-all"
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