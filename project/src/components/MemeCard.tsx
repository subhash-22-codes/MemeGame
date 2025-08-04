import React from 'react';
import { Meme } from '../context/GameContext';

type MemeCardProps = {
  meme: Meme;
  selected?: boolean;
  onSelect?: (meme: Meme) => void;
  showTitle?: boolean;
  score?: number;
};

const MemeCard: React.FC<MemeCardProps> = ({ 
  meme, 
  selected = false, 
  onSelect,
  showTitle = true,
  score
}) => {
  const handleClick = () => {
    if (onSelect) {
      onSelect(meme);
    }
  };

  return (
    <div 
      className={`meme-card relative rounded-lg overflow-hidden transition-all duration-200 
        ${selected ? 'ring-4 ring-pink-500 transform scale-105' : 'hover:scale-105 hover:shadow-lg'}
        ${onSelect ? 'cursor-pointer' : ''}
      `}
      onClick={handleClick}
    >
      <img 
        src={meme.url} 
        alt={meme.title} 
        className="w-full h-48 object-cover"
      />
      
      {showTitle && (
        <div className="bg-slate-800 text-white p-2 text-sm">
          {meme.title}
        </div>
      )}
      
      {selected && (
        <div className="absolute top-2 right-2 bg-pink-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
          ✓
        </div>
      )}
      
      {score !== undefined && (
        <div className="absolute top-2 right-2 bg-yellow-500 text-white text-sm font-bold rounded-full w-8 h-8 flex items-center justify-center">
          {score}
        </div>
      )}
    </div>
  );
};

export default MemeCard;