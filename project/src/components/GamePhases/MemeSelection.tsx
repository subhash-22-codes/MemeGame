import React, { useState } from 'react';
// ⭐️ FIX: No longer imports the laggy MEMES file
import { CheckCircle, Hourglass } from 'lucide-react';
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

  // If player has already submitted, show a waiting screen
  if (isSubmitted) {
    return (
      <div className="bg-white/95 backdrop-blur-md rounded-2xl p-6 lg:p-8 shadow-xl border border-white/30 text-center max-w-lg mx-auto">
        <div className="w-16 h-16 bg-gradient-to-br from-[#5F8B4C] to-[#7BA05C] rounded-full flex items-center justify-center mx-auto mb-4">
          <Hourglass className="w-8 h-8 text-white animate-spin" />
        </div>
        <h2 className="text-2xl lg:text-3xl font-bold text-slate-800 mb-3">
          Meme Submitted!
        </h2>
        <p className="text-slate-500 font-mono text-sm lg:text-base mb-6">
          Waiting for other players to choose their memes...
        </p>
      </div>
    );
  }

  // If player has NOT submitted, show the gallery
  return (
    <div className="max-w-4xl mx-auto">
      {/* 1. The Sentence Prompt */}
      <div className="bg-white/95 backdrop-blur-md rounded-2xl p-4 lg:p-6 shadow-xl border border-white/30 text-center mb-6">
        <h3 className="text-sm font-mono text-slate-500 mb-2">The Judge's Sentence:</h3>
        <p className="text-xl lg:text-2xl font-bold text-slate-800 italic">
          "{sentence}"
        </p>
      </div>

      {/* 2. The Meme Grid (This now renders the 10 GIPHY memes) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {visibleMemes.map((meme) => (
          <button
            key={meme.id}
            onClick={() => handleSelect(meme.id)}
            disabled={selectedId !== null}
            className={`group relative rounded-lg overflow-hidden border-4 transition-all duration-300
              ${selectedId === meme.id 
                ? 'border-green-500 scale-105' 
                : 'border-transparent hover:border-blue-500'}
              disabled:opacity-50 disabled:cursor-not-allowed aspect-square
            `}
          >
            <img
              src={meme.url}
              alt={meme.title}
              className="w-full h-full object-cover"
              loading="lazy" 
            />
            {selectedId === meme.id && (
              <div className="absolute inset-0 bg-green-500/70 flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-white" />
              </div>
            )}
          </button>
        ))}
      </div>
      
      {/* ⭐️ FIX: "Load More" button is deleted */}
    </div>
  );
};

export default MemeSelection;