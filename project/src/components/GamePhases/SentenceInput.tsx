import React, { useState } from 'react';
import { Send } from 'lucide-react';

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
      // You can add a toast notification here later
      console.error("Sentence is too short");
      return;
    }
    
    setIsSubmitting(true);
    // This calls the 'submitSentence' function from our context
    onSubmit(sentence); 
  };

  return (
    <div className="bg-white/95 backdrop-blur-md rounded-2xl p-6 lg:p-8 shadow-xl border border-white/30 text-center max-w-lg mx-auto">
      
      {/* 1. Header */}
      <div className="w-16 h-16 bg-gradient-to-br from-[#5F8B4C] to-[#7BA05C] rounded-full flex items-center justify-center mx-auto mb-4">
        <Send className="w-8 h-8 text-white" />
      </div>
      <h2 className="text-2xl lg:text-3xl font-bold text-slate-800 mb-3">
        You are the Judge!
      </h2>
      <p className="text-slate-500 font-mono text-sm lg:text-base mb-6">
        Write a funny or creative sentence for the other players to match with a meme.
      </p>

      {/* 2. The Form */}
      <form onSubmit={handleSubmit}>
        <div className="relative">
          <input
            type="text"
            value={sentence}
            onChange={(e) => setSentence(e.target.value)}
            placeholder="e.g., When you see the server bill..."
            maxLength={150}
            disabled={isSubmitting}
            className="w-full px-4 py-4 text-black text-lg border-2 rounded-xl transition-all duration-300 focus:outline-none focus:ring-4 bg-white/50 backdrop-blur-sm border-gray-200 focus:border-[#5F8B4C] focus:ring-[#5F8B4C]/20"
            style={{ fontFamily: 'Courier, monospace' }}
          />
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-gray-400">
            {sentence.length}/150
          </div>
        </div>

        {/* 3. The Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting || sentence.trim().length < 5}
          className="w-full flex items-center justify-center gap-3 p-4 mt-4 bg-gradient-to-br from-[#D98324] to-[#C07620] text-white rounded-xl shadow-lg font-mono font-bold text-lg transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Submitting...</span>
            </>
          ) : (
            <>
              <Send className="w-5 h-5" />
              <span>Submit Sentence</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default SentenceInput;