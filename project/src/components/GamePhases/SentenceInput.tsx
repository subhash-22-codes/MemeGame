import React, { useState } from 'react';
import { Send, Gavel } from 'lucide-react';

// Define the props that Game.tsx will pass to this component
type SentenceInputProps = {
  onSubmit: (sentence: string) => void;
};

const SentenceInput: React.FC<SentenceInputProps> = ({ onSubmit }) => {
  const [sentence, setSentence] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (sentence.trim().length < 5) {
      console.error("Sentence is too short");
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
        You are the Judge!
      </h2>
      <p className="text-[#131010]/70 font-medium font-poppins text-xs sm:text-sm mb-6">
        Drop a wild, creative prompt for the lobby to match with a meme.
      </p>

      {/* 2. The Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative group">
          <input
            type="text"
            value={sentence}
            onChange={(e) => setSentence(e.target.value)}
            placeholder="e.g., When the server crashes at 2 AM..."
            maxLength={150}
            disabled={isSubmitting}
            className="w-full px-4 py-3 sm:py-3.5 text-[#131010] text-base sm:text-base font-semibold font-poppins bg-[#FFDDAB]/20 border-2 border-[#131010] rounded-xl transition-shadow duration-200 focus:outline-none focus:bg-white focus:shadow-[2px_2px_0px_0px_#131010] disabled:opacity-50 placeholder:text-[#131010]/40 pr-16"
          />
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[10px] font-bold font-courier text-[#131010]/50 bg-white/80 px-2 py-1 rounded border border-[#131010]/10">
            {sentence.length}/150
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
              <span>Submit Prompt</span>
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