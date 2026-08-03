import React from 'react';
import type { Player } from '../../context/GameContext';
import { Award, ChevronsRight, Crown, Medal } from 'lucide-react';

// Define the props Game.tsx will pass to this component
type ResultsProps = {
  players: Player[];
  roundNumber: number;
  totalRounds: number;
  roundWinner: Player | undefined; // The player who won this round
  isHost: boolean;
  onNextRound: () => void; // Function to call to move to next round
  isGameEnd: boolean; // Is this the very last round?
};

const Results: React.FC<ResultsProps> = ({
  players,
  roundNumber,
  roundWinner,
  isHost,
  onNextRound,
  isGameEnd,
}) => {
  // Sort players by total score for the leaderboard
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

  return (
    <div className="max-w-md md:max-w-2xl mx-auto w-full animate-fade-in-up">
      
      {/* 1. Round Winner Card (Compact Bento) */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border-2 border-[#131010] shadow-[4px_4px_0px_0px_#131010] text-center mb-6 relative overflow-hidden">
        
        {/* Subtle grid background */}
        <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(#131010_1px,transparent_1px),linear-gradient(90deg,#131010_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none" />
        
        <div className="relative z-10">
          <div className="inline-flex items-center justify-center p-3 bg-[#FFDDAB] border-2 border-[#131010] shadow-[2px_2px_0px_0px_#131010] rounded-xl mb-4 transform -rotate-3">
            <Award className="w-8 h-8 text-[#131010]" strokeWidth={2.5} />
          </div>
          
          <h2 className="text-2xl sm:text-3xl font-black text-[#131010] mb-1.5 font-poppins tracking-tight">
            Round {roundNumber} Winner
          </h2>
          <p className="text-[#131010]/60 font-bold font-courier text-xs sm:text-sm uppercase tracking-widest mb-5">
            Best meme goes to...
          </p>
          
          <div className="inline-flex items-center gap-3 bg-[#5F8B4C] px-5 py-2.5 border-2 border-[#131010] shadow-[3px_3px_0px_0px_#131010] rounded-xl transform transition-transform hover:scale-105">
            <span className="text-xl sm:text-2xl text-white font-black font-poppins truncate max-w-[150px] sm:max-w-[200px]">
              {roundWinner?.username || 'No Winner?'}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Interim Leaderboard Plaque */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border-2 border-[#131010] shadow-[4px_4px_0px_0px_#131010] mb-6">
        <div className="flex items-center justify-between mb-5 border-b-2 border-[#131010] pb-3">
          <div className="flex items-center gap-2.5">
            <Medal className="w-5 h-5 text-[#131010]" strokeWidth={2.5} />
            <h3 className="text-xl sm:text-2xl font-black text-[#131010] font-poppins tracking-tight">
              Scoreboard
            </h3>
          </div>
        </div>

        <div className="space-y-2.5 sm:space-y-3">
          {sortedPlayers.map((player, index) => {
            const isTop = index === 0;
            return (
              <div
                key={player.id}
                className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all duration-200
                  ${isTop 
                    ? 'bg-[#FFDDAB] border-[#131010] shadow-[2px_2px_0px_0px_#131010]' 
                    : 'bg-white border-[#131010]/20 shadow-none'
                  }
                `}
              >
                <div className="flex items-center gap-3 sm:gap-4">
                  {/* Position Badge */}
                  <div className={`w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-lg font-black text-sm sm:text-base border-2
                    ${isTop 
                      ? 'bg-[#D98324] text-[#131010] border-[#131010]' 
                      : 'bg-[#131010]/5 text-[#131010]/40 border-transparent'
                    }
                  `}>
                    {index + 1}
                  </div>
                  
                  {/* Avatar & Name */}
                  <div className="flex items-center gap-2.5">
                    <img
                      src={player.avatar || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${player.username}`}
                      alt={player.username}
                      className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg object-cover ${isTop ? 'border-2 border-[#131010]' : 'opacity-80'}`}
                    />
                    <div className="flex items-center gap-1.5">
                      <span className={`text-sm sm:text-base font-bold font-poppins ${isTop ? 'text-[#131010]' : 'text-[#131010]/80'}`}>
                        {player.username}
                      </span>
                      {player.isHost && <Crown size={14} className="text-[#D98324]" strokeWidth={3} />}
                    </div>
                  </div>
                </div>
                
                {/* Score */}
                <div className="text-right">
                  <span className={`text-lg sm:text-xl font-black font-poppins ${isTop ? 'text-[#131010]' : 'text-[#131010]/70'}`}>
                    {player.score}
                  </span>
                  <span className="ml-1 text-[10px] font-bold font-courier uppercase tracking-widest text-[#131010]/50">
                    pts
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Action / Waiting State */}
      <div className="text-center animate-fade-in-up" style={{ animationDelay: '300ms' }}>
        {isHost ? (
          <button
            onClick={onNextRound}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 bg-[#D98324] text-[#131010] rounded-xl border-2 border-[#131010] shadow-[3px_3px_0px_0px_#131010] hover:shadow-[4px_4px_0px_0px_#131010] active:translate-y-[2px] active:shadow-none font-poppins font-black text-base transition-all"
          >
            {isGameEnd ? 'Reveal Final Winner' : 'Start Next Round'}
            <ChevronsRight className="w-5 h-5" strokeWidth={3} />
          </button>
        ) : (
          <div className="inline-flex items-center gap-2.5 bg-white px-5 py-2.5 rounded-full border-2 border-[#131010] shadow-[2px_2px_0px_0px_#131010]">
            <div className="w-2 h-2 bg-[#D98324] rounded-full animate-pulse"></div>
            <p className="text-[#131010] font-bold font-courier text-xs uppercase tracking-widest">
              Waiting for Host...
            </p>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up { animation: fade-in-up 0.4s ease-out forwards; }
      `}</style>
    </div>
  );
};

export default Results;