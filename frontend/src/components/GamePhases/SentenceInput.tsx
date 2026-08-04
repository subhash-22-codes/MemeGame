import React, { useState, useEffect } from 'react';
import { Send, Gavel, Shuffle, Sparkles } from 'lucide-react';
import { useGame } from '../../context/GameContext';

type SentenceInputProps = {
  onSubmit: (sentence: string) => void;
};

const SUGGESTED_PROMPTS = [
  "When the WiFi drops in the middle of a ranked game...",
  "POV: You showed your mom your search history",
  "Me explaining why I need another pizza at 3 AM...",
  "That one friend who always says 'trust me bro'...",
  "When the meeting could have been an email...",
  "How I look waiting for my package to arrive...",
  "When you accidentally like a post from 3 years ago...",
  "Me checking my bank account after a weekend out...",
  "When someone asks if I'm ready for adulting...",
  "That moment you realize you forgot to unmute on Zoom...",
  "When the code compiles on the first try and you're scared...",
  "Me trying to act normal in front of my crush...",
  "When the boss says 'we're like a family here'...",
  "How my dog looks when I ask 'who did this?'...",
  "When you say 'just one episode' on a Sunday night..."
];

const getInterleavedPrompts = (customPrompts: string[], defaultPrompts: string[], count = 4): string[] => {
  const shuffledCustom = [...customPrompts].sort(() => 0.5 - Math.random());
  const shuffledDefault = [...defaultPrompts].sort(() => 0.5 - Math.random());
  const result: string[] = [];
  let cIdx = 0;
  let dIdx = 0;

  while (result.length < count && (cIdx < shuffledCustom.length || dIdx < shuffledDefault.length)) {
    if (result.length % 2 === 0 && cIdx < shuffledCustom.length) {
      result.push(shuffledCustom[cIdx++]);
    } else if (dIdx < shuffledDefault.length) {
      result.push(shuffledDefault[dIdx++]);
    } else if (cIdx < shuffledCustom.length) {
      result.push(shuffledCustom[cIdx++]);
    } else {
      break;
    }
  }
  return result;
};

const SentenceInput: React.FC<SentenceInputProps> = ({ onSubmit }) => {
  const { gameState } = useGame();
  const customPrompts = gameState?.customPrompts || [];

  const [sentence, setSentence] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>(() => 
    getInterleavedPrompts(customPrompts, SUGGESTED_PROMPTS, 4)
  );

  useEffect(() => {
    setSuggestions(getInterleavedPrompts(customPrompts, SUGGESTED_PROMPTS, 4));
  }, [customPrompts.length]);

  const handleShuffle = () => {
    setSuggestions(getInterleavedPrompts(customPrompts, SUGGESTED_PROMPTS, 4));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (sentence.trim().length < 5) {
      return;
    }
    
    setIsSubmitting(true);
    onSubmit(sentence); 
  };

  return (
    <div className="bg-white rounded-2xl p-5 sm:p-6 border-2 border-[#131010] shadow-[4px_4px_0px_0px_#131010] text-center max-w-md mx-auto w-full transition-all duration-300">
      
      {/* 1. Header (Compact Tactile Badge) */}
      <div className="mb-4">
        <div className="w-12 h-12 bg-[#D98324] border-2 border-[#131010] shadow-[2px_2px_0px_0px_#131010] rounded-xl flex items-center justify-center mx-auto transform -rotate-3 hover:rotate-0 transition-transform">
          <Gavel className="w-6 h-6 text-[#131010]" strokeWidth={2.5} />
        </div>
      </div>
      
      <h2 className="text-xl sm:text-2xl font-bold text-[#131010] mb-1.5 font-poppins">
        You are the Prompt Creator!
      </h2>
      <p className="text-[#131010]/70 font-medium font-poppins text-xs sm:text-sm mb-6">
        Drop a wild, creative prompt for the squad to match with a meme.
      </p>

      {/* 2. The Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative group">
          <input
            type="text"
            value={sentence}
            onChange={(e) => setSentence(e.target.value)}
            placeholder="e.g., When the server crashes at 2 AM..."
            maxLength={100}
            disabled={isSubmitting}
            className="w-full px-4 py-3 bg-[#FFDDAB]/20 border-2 border-[#131010] rounded-xl text-sm sm:text-base font-poppins font-medium text-[#131010] placeholder-[#131010]/40 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#D98324] transition-all"
          />
          <div className="absolute right-3 bottom-3 text-[10px] font-courier font-bold text-[#131010]/40">
            {sentence.length}/100
          </div>
        </div>

        {/* Suggested Prompts Banner */}
        <div className="bg-[#FFDDAB]/30 border border-[#131010] rounded-xl p-3 text-left">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#D98324]" />
              <span className="text-[11px] font-bold font-poppins uppercase tracking-wider text-[#131010]/70">
                Need Inspiration?
              </span>
            </div>
            <button
              type="button"
              onClick={handleShuffle}
              disabled={isSubmitting}
              className="flex items-center gap-1 text-[11px] font-bold font-poppins text-[#D98324] hover:text-[#131010] transition-colors"
            >
              <Shuffle className="w-3 h-3" />
              <span>Shuffle</span>
            </button>
          </div>
          
          <div className="flex flex-wrap gap-1.5">
            {suggestions.map((prompt, index) => {
              const isCustom = customPrompts.includes(prompt);
              return (
                <button
                  key={index}
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setSentence(prompt)}
                  className={`text-left px-3 py-1.5 active:translate-y-[1px] border border-[#131010] rounded-lg text-xs font-poppins font-medium text-[#131010] shadow-[1px_1px_0px_0px_#131010] hover:shadow-[2px_2px_0px_0px_#131010] transition-all line-clamp-1 max-w-full flex items-center gap-1.5 ${
                    isCustom ? 'bg-[#D98324]/20 hover:bg-[#D98324]/40 font-bold' : 'bg-[#FFDDAB]/30 hover:bg-[#FFDDAB]'
                  }`}
                >
                  {isCustom && <span title="Squad Inside Joke">🃏</span>}
                  <span>{prompt}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. The Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting || sentence.trim().length < 5}
          className="w-full flex items-center justify-center gap-2 py-3 sm:py-3.5 bg-[#5F8B4C] text-white rounded-xl border-2 border-[#131010] shadow-[3px_3px_0px_0px_#131010] hover:shadow-[4px_4px_0px_0px_#131010] active:translate-y-[2px] active:shadow-none font-poppins font-bold text-sm sm:text-base transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-y-[2px]"
        >
          {isSubmitting ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              <span>Locking it in...</span>
            </>
          ) : (
            <>
              <Send className="w-4 h-4" strokeWidth={2.5} />
              <span>Drop This Prompt 💥</span>
            </>
          )}
        </button>
        
        {/* Helper constraint text */}
        <p className={`text-[10px] font-bold font-courier transition-opacity duration-200 uppercase tracking-widest ${sentence.trim().length > 0 && sentence.trim().length < 5 ? 'text-red-500 opacity-100' : 'text-[#131010]/30 opacity-0'}`}>
          Requires at least 5 characters
        </p>
      </form>
    </div>
  );
};

export default SentenceInput;