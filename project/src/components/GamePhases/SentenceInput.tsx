import React, { useState } from 'react';
import { Send, Lightbulb, Shuffle } from 'lucide-react';

interface SentenceInputProps {
  onSubmit: (sentence: string) => void;
  isSubmitting?: boolean;
}

const SentenceInput: React.FC<SentenceInputProps> = ({ onSubmit, isSubmitting = false }) => {
  const [sentence, setSentence] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (sentence.trim() && !isSubmitting) {
      onSubmit(sentence.trim());
    }
  };

  const examplePrompts = [
    "When you realize you forgot to save your work...",
    "Me trying to explain why I need another monitor...",
    "When someone says they don't like pizza...",
    "My face when I see my bank account after shopping...",
    "When you're the only one who laughed at your own joke...",
    "Me pretending to understand the explanation...",
    "When you get a text from your boss on the weekend...",
    "My reaction when someone spoils a movie..."
  ];

  const getRandomPrompt = () => {
    const randomPrompt = examplePrompts[Math.floor(Math.random() * examplePrompts.length)];
    setSentence(randomPrompt);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-white/20">
        <h1 className="text-3xl font-bold text-[#131010] font-['Poppins'] mb-2">
          Create Your Sentence Prompt
        </h1>
        <p className="text-[#131010]/70 font-mono">
          Write a funny scenario that others will respond to with memes
        </p>
      </div>

      {/* Input Form */}
      <div className="bg-white/90 backdrop-blur-sm rounded-xl p-8 shadow-lg border border-white/20">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-lg font-bold text-[#131010] font-['Poppins'] mb-3">
              Your Sentence Prompt:
            </label>
            <textarea
              value={sentence}
              onChange={(e) => setSentence(e.target.value)}
              placeholder="Type your funny sentence here... (e.g., 'When you realize it's Monday tomorrow...')"
              className="w-full h-32 p-4 border-2 border-gray-300 rounded-xl focus:border-[#5F8B4C] focus:outline-none transition-colors duration-300 font-mono text-[#131010] placeholder-gray-400 resize-none"
              maxLength={200}
              disabled={isSubmitting}
            />
            <div className="flex justify-between items-center mt-2">
              <span className="text-sm text-[#131010]/60 font-mono">
                {sentence.length}/200 characters
              </span>
              <button
                type="button"
                onClick={getRandomPrompt}
                className="flex items-center gap-2 text-[#5F8B4C] hover:text-[#5F8B4C]/80 transition-colors duration-300 font-mono text-sm"
                disabled={isSubmitting}
              >
                <Shuffle className="w-4 h-4" />
                Get Random Idea
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={!sentence.trim() || isSubmitting}
            className="w-full bg-[#D98324] hover:bg-[#D98324]/90 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 disabled:transform-none shadow-lg font-['Poppins'] text-lg flex items-center justify-center gap-3"
          >
            {isSubmitting ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Sending Prompt...
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                Send Prompt to Players
              </>
            )}
          </button>
        </form>
      </div>

      {/* Tips */}
      <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-white/20">
        <div className="flex items-center gap-2 mb-4">
          <Lightbulb className="w-5 h-5 text-[#D98324]" />
          <h3 className="text-lg font-bold text-[#131010] font-['Poppins']">Tips for Great Prompts</h3>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <h4 className="font-mono font-semibold text-[#131010]">✅ Good Examples:</h4>
            <ul className="text-sm text-[#131010]/70 font-mono space-y-1">
              <li>• "When you pretend to understand the meeting..."</li>
              <li>• "Me trying to eat healthy vs. seeing donuts..."</li>
              <li>• "When WiFi goes down during important work..."</li>
            </ul>
          </div>
          <div className="space-y-2">
            <h4 className="font-mono font-semibold text-[#131010]">💡 Pro Tips:</h4>
            <ul className="text-sm text-[#131010]/70 font-mono space-y-1">
              <li>• Keep it relatable and funny</li>
              <li>• Leave room for creative interpretation</li>
              <li>• Think about everyday situations</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SentenceInput;