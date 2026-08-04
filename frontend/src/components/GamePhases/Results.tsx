import React from 'react';
import type { Player, MemeSubmission } from '../../context/GameContext';
import { Award, ChevronsRight, Crown, Medal, Sparkles } from 'lucide-react';

// Define the props Game.tsx will pass to this component
type ResultsProps = {
  players: Player[];
  roundNumber: number;
  totalRounds: number;
  roundWinner: Player | undefined; // The player who won this round
  isHost: boolean;
  onNextRound: () => void; // Function to call to move to next round
  isGameEnd: boolean; // Is this the very last round?
  submissions?: MemeSubmission[];
  sentence?: string;
};

const Results: React.FC<ResultsProps> = ({
  players,
  roundNumber,
  roundWinner,
  isHost,
  onNextRound,
  isGameEnd,
  submissions = [],
  sentence,
}) => {
  // Sort players by total score for the leaderboard
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

  return (
    <div className="max-w-md md:max-w-4xl mx-auto w-full animate-fade-in-up">

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
          {sentence && (
            <div className="inline-block bg-[#FFDDAB] px-4 py-1.5 rounded-xl border-2 border-[#131010] shadow-[2px_2px_0px_0px_#131010] my-2 max-w-xl mx-auto">
              <p className="text-sm sm:text-base font-black text-[#131010] font-poppins">
                "{sentence}"
              </p>
            </div>
          )}
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

      {/* 1.5. Dramatic Author Reveal Gallery */}
      {submissions && submissions.length > 0 && (
        <div className="bg-white rounded-2xl p-5 sm:p-6 border-2 border-[#131010] shadow-[4px_4px_0px_0px_#131010] mb-6">
          <div className="flex items-center justify-between mb-4 border-b-2 border-[#131010] pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#D98324]" />
              <h3 className="text-xl font-black text-[#131010]">Author Reveal & Scores</h3>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {submissions.map((sub, idx) => {
              const author = players.find(p => p.id === sub.playerId);
              const isWin = sub.isWinner;
              return (
                <div
                  key={sub.memeId + idx}
                  className={`rounded-xl border-2 border-[#131010] overflow-hidden flex flex-col ${isWin ? 'bg-[#FFDDAB] shadow-[4px_4px_0px_0px_#131010] ring-2 ring-[#D98324]' : 'bg-slate-50'
                    }`}
                >
                  <div className="relative aspect-square w-full bg-[#131010]/5 border-b-2 border-[#131010]">
                    <img src={sub.memeUrl} alt="Meme" className="w-full h-full object-cover" />
                    {isWin && (
                      <div className="absolute top-2 right-2 bg-[#D98324] text-[#131010] px-2.5 py-1 rounded-lg border-2 border-[#131010] font-black text-xs flex items-center gap-1 shadow-[2px_2px_0px_0px_#131010]">
                        <Crown className="w-3.5 h-3.5" /> +15 BONUS
                      </div>
                    )}
                  </div>
                  <div className="p-3 sm:p-4 flex flex-col gap-2.5 bg-white">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <img
                          src={author?.avatar || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${author?.username || 'anon'}`}
                          alt="Avatar"
                          className="w-6 h-6 rounded-md object-cover border border-[#131010]"
                        />
                        <span className="font-poppins font-black text-sm text-[#131010]">
                          @{author?.username || sub.username || 'Anonymous'}
                        </span>
                      </div>
                      <span className="bg-[#5F8B4C] text-white font-poppins font-black text-xs px-2.5 py-1 rounded-lg border border-[#131010] shadow-[1px_1px_0px_0px_#131010]">
                        +{sub.roundScore || 0} PTS
                      </span>
                    </div>

                    {/* Scorecard Bar: Breakdown of 1st, 2nd, 3rd place votes */}
                    <div className="grid grid-cols-3 gap-1 bg-[#131010]/5 p-1.5 rounded-lg border border-[#131010]/20 text-center font-poppins font-bold text-xs">
                      <div className="flex items-center justify-center gap-1 bg-white py-1 rounded border border-[#131010]/20 shadow-sm">
                        <span>🥇</span>
                        <span className="text-[#131010] font-black">{sub.rank1Count || 0}</span>
                      </div>
                      <div className="flex items-center justify-center gap-1 bg-white py-1 rounded border border-[#131010]/20 shadow-sm">
                        <span>🥈</span>
                        <span className="text-[#131010] font-black">{sub.rank2Count || 0}</span>
                      </div>
                      <div className="flex items-center justify-center gap-1 bg-white py-1 rounded border border-[#131010]/20 shadow-sm">
                        <span>🥉</span>
                        <span className="text-[#131010] font-black">{sub.rank3Count || 0}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

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
              Waiting for Host to advance the chaos...
            </p>
          </div>
        )}
      </div>

    </div>
  );
};

export default Results;