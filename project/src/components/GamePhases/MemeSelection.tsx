import React, { useState } from 'react';
// ⭐️ FIX: No longer imports the laggy MEMES file
import { CheckCircle, Hourglass, MessageSquare } from 'lucide-react';
// ⭐️ FIX: Import useGame to get the memes from the server
import { useGame } from '../../context/GameContext'; 

// Define the props that Game.tsx will pass
type MemeSelectionProps = {
  sentence: string;
  onSelect: (memeId: string) => void;
  isSubmitted: boolean;
  timeLeft: number | undefined;
};

const MemeSelection: React.FC<MemeSelectionProps> = ({
  sentence,
  onSelect,
  isSubmitted,
}) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  
  // ⭐️ FIX: Get the 10 random memes from the game state
  // This list comes directly from your Python GIPHY function
  const { gameState } = useGame();
  const visibleMemes = gameState?.availableMemes || [];

  const handleSelect = (memeId: string) => {
    setSelectedId(memeId);
    onSelect(memeId);
  };
  
  // ⭐️ FIX: All pagination logic is deleted (no more lag)

  // --- Render Logic ---

  // If player has already submitted, show a balanced, sleek waiting screen
  if (isSubmitted) {
    return (
      <div className="bg-white rounded-2xl p-6 sm:p-8 border-2 border-[#131010] shadow-[4px_4px_0px_0px_#131010] text-center max-w-md mx-auto w-full animate-fade-in">
        <div className="w-14 h-14 bg-[#D98324] border-2 border-[#131010] shadow-[2px_2px_0px_0px_#131010] rounded-xl flex items-center justify-center mx-auto mb-5">
          <Hourglass className="w-6 h-6 text-[#131010] animate-spin" strokeWidth={2.5} />
        </div>
        <h2 className="text-xl sm:text-2xl font-black text-[#131010] mb-2 font-poppins">
          Meme Locked In!
        </h2>
        <p className="text-[#131010]/70 font-medium font-poppins text-sm">
          Waiting for the rest of the lobby to pick their cards...
        </p>
      </div>
    );
  }

  // If player has NOT submitted, show the tactical gallery
  return (
    <div className="max-w-4xl mx-auto w-full animate-fade-in">
      
      {/* 1. The Sentence Prompt (Bento Card) */}
      <div className="sticky top-0 z-30 bg-white rounded-2xl p-4 sm:p-6 border-2 border-[#131010] shadow-[4px_4px_0px_0px_#131010] mb-6 sm:mb-8 text-center relative">
        <div className="inline-flex items-center gap-1.5 bg-[#FFDDAB] px-3 py-1 rounded-md border border-[#131010] font-black text-[10px] text-[#131010] uppercase tracking-widest mb-3">
          <MessageSquare className="w-3 h-3" strokeWidth={3} /> The Prompt
        </div>
        <p className="text-base sm:text-xl md:text-2xl font-black text-[#131010] font-poppins leading-tight px-2">
          "{sentence}"
        </p>
      </div>

      {/* 2. The Meme Deck (Tactile Grid) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
        {visibleMemes.map((meme) => {
          const isSelected = selectedId === meme.id;
          const isOtherSelected = selectedId !== null && !isSelected;

          return (
            <button
              key={meme.id}
              onClick={() => handleSelect(meme.id)}
              disabled={selectedId !== null}
              className={`
                group relative rounded-xl overflow-hidden border-2 transition-all duration-200 aspect-square w-full
                ${isSelected 
                  ? 'border-[#131010] shadow-[0px_0px_0px_0px_#131010] translate-y-[2px] ring-4 ring-[#5F8B4C]' 
                  : 'border-[#131010] shadow-[3px_3px_0px_0px_#131010] hover:-translate-y-1 hover:shadow-[5px_5px_0px_0px_#131010] bg-white'
                }
                ${isOtherSelected ? 'opacity-40 grayscale-[50%] cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              <img
                src={meme.url}
                alt={meme.title}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy" 
              />
              
              {/* Selected Overlay */}
              {isSelected && (
                <div className="absolute inset-0 bg-[#5F8B4C]/80 backdrop-blur-[2px] flex items-center justify-center animate-fade-in">
                  <div className="bg-white rounded-full p-1.5 border-2 border-[#131010] shadow-[2px_2px_0px_0px_#131010] transform scale-110">
                    <CheckCircle className="w-6 h-6 text-[#5F8B4C]" strokeWidth={3} />
                  </div>
                </div>
              )}
            </button>
          )
        })}
      </div>
      
      {/* Custom Keyframe for smooth pop-ins */}
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fade-in 0.2s ease-out forwards; }
      `}</style>
    </div>
  );
};

export default MemeSelection;