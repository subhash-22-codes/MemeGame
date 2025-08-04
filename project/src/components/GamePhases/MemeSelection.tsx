import React, { useState } from 'react';
import { Check, Clock } from 'lucide-react';
import { MEMES } from '../../data/memes';

interface MemeSelectionProps {
  sentence: string;
  onSelect: (memeId: string) => void;
  selectedMemeId?: string;
  isSubmitted?: boolean;
  timeLeft?: number;
  isJudge?: boolean;
  allSubmissions?: { username: string; memeId: string }[]; // for judge view
}

const MemeSelection: React.FC<MemeSelectionProps> = ({
  sentence,
  onSelect,
  selectedMemeId,
  isSubmitted = false,
  timeLeft,
  isJudge = false,
  allSubmissions = []
}) => {
  const [hoveredMeme, setHoveredMeme] = useState<string | null>(null);

  const handleMemeClick = (memeId: string) => {
    if (!isSubmitted && !isJudge) {
      onSelect(memeId);
    }
  };

  const renderMemeCard = (memeId: string, username?: string) => {
    const meme = MEMES.find(m => m.id === memeId);
    if (!meme) return null;
    const isSelected = selectedMemeId === meme.id;
    const isHovered = hoveredMeme === meme.id;

    return (
      <div
        key={meme.id + username}
        className={`relative group transition-all duration-300 transform ${
          isSubmitted || isJudge ? 'cursor-default opacity-80' : 'cursor-pointer hover:scale-105'
        } ${
          isSelected ? 'ring-4 ring-[#D98324] ring-offset-2' : !isJudge && 'hover:ring-2 hover:ring-[#5F8B4C]'
        }`}
        onClick={() => handleMemeClick(meme.id)}
        onMouseEnter={() => setHoveredMeme(meme.id)}
        onMouseLeave={() => setHoveredMeme(null)}
      >
        <div className="bg-white rounded-xl shadow-lg border border-white/20 overflow-hidden">
          <div className="aspect-square bg-gray-100 flex items-center justify-center p-4">
            <img
              src={meme.url}
              alt={meme.title}
              className="w-full h-full object-cover rounded-lg"
              loading="lazy"
            />
          </div>

          <div className="p-3">
            <h3 className="font-mono font-semibold text-[#131010] text-sm text-center truncate">
              {meme.title}
            </h3>
            {meme.tags && (
              <div className="flex flex-wrap gap-1 mt-2 justify-center">
                {meme.tags.slice(0, 2).map((tag) => (
                  <span
                    key={tag}
                    className="text-xs bg-gray-100 text-[#131010]/60 px-2 py-1 rounded-full font-mono"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {isSelected && !isJudge && (
            <div className="absolute top-2 right-2 bg-[#D98324] text-white rounded-full p-1">
              <Check className="w-4 h-4" />
            </div>
          )}

          {(isHovered || isSelected) && !isSubmitted && !isJudge && (
            <div className="absolute inset-0 bg-black/20 rounded-xl flex items-center justify-center">
              <div className="bg-white/90 rounded-lg px-3 py-1">
                <span className="text-[#131010] font-mono text-sm font-semibold">
                  {isSelected ? 'Selected' : 'Click to Select'}
                </span>
              </div>
            </div>
          )}
        </div>

        {isJudge && username && (
          <div className="absolute bottom-2 left-2 bg-white text-black text-xs px-2 py-1 rounded-full shadow-md">
            @{username}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="text-center bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-white/20">
        <h1 className="text-2xl font-bold text-[#131010] font-['Poppins'] mb-4">
          {isJudge ? 'Judge View - Submissions' : 'Choose Your Meme Response'}
        </h1>
        <div className="bg-[#5F8B4C]/10 rounded-lg p-4 border border-[#5F8B4C]/20">
          <p className="text-lg text-[#131010] font-mono italic">
            "{sentence}"
          </p>
        </div>
        {timeLeft !== undefined && (
          <div className="mt-4 flex items-center justify-center gap-2 text-[#131010]/70">
            <Clock className="w-4 h-4" />
            <span className="font-mono text-sm">
              {timeLeft > 0 ? `${timeLeft}s remaining` : 'Time\'s up!'}
            </span>
          </div>
        )}
      </div>

      {isSubmitted && !isJudge && (
        <div className="bg-[#5F8B4C]/10 rounded-xl p-4 border-2 border-[#5F8B4C] text-center">
          <div className="flex items-center justify-center gap-2 text-[#5F8B4C]">
            <Check className="w-5 h-5" />
            <span className="font-mono font-semibold">Meme submitted! Waiting for other players...</span>
          </div>
          <div className="mt-3 text-sm text-[#131010]/70 font-mono">
            You'll see all memes when everyone has submitted
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {isJudge
          ? allSubmissions.map(({ memeId, username }) =>
              renderMemeCard(memeId, username)
            )
          : MEMES.map((meme) => renderMemeCard(meme.id))}
      </div>

      {!isSubmitted && !isJudge && (
        <div className="bg-white/90 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-white/20 text-center">
          <p className="text-[#131010]/70 font-mono text-sm">
            Click on a meme that best responds to the sentence prompt above. Choose wisely - you can't change your selection!
          </p>
        </div>
      )}
    </div>
  );
};

export default MemeSelection;
