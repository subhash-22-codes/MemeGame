import React, { useState, useEffect } from 'react';
import { useGame, MemeSubmission } from '../../context/GameContext';
import { useAuth } from '../../context/AuthContext';
import { Trophy, CheckCircle, Hourglass } from 'lucide-react';

interface CommunityVotingProps {
  sentence: string;
  submissions: MemeSubmission[];
  onVotesSubmitted?: () => void;
}

export const CommunityVoting: React.FC<CommunityVotingProps> = ({
  sentence,
  submissions,
}) => {
  const { user } = useAuth();
  const { submitCommunityVotes, gameState } = useGame();

  // rankings maps rank number (1, 2, or 3) -> targetPlayerId (or memeId)
  const [rankings, setRankings] = useState<Record<number, string>>({});
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState<number>(0);

  const currentUserId = user?.id;
  const votedIds = gameState?.votedPlayerIds || [];
  const alreadyVotedOnServer = currentUserId ? votedIds.includes(currentUserId) : false;

  // Filter out the current user's own meme submission
  const eligibleSubmissions = submissions.filter(
    sub => sub.playerId !== currentUserId
  );

  // Determine how many ranks to assign based on active players and eligible submissions count E (adaptive for 2 to 10 players)
  // 2 players -> E=1 -> Top 1 (🥇 only)
  // 3 players -> E=2 -> Top 2 (🥇, 🥈)
  // 4-10 players -> E>=3 -> Top 3 (🥇, 🥈, 🥉)
  const activePlayersCount = gameState?.players?.filter(p => p.isConnected !== false).length || 0;
  const maxAllowedRank = activePlayersCount <= 3 ? 2 : 3;
  const maxRanks = Math.min(maxAllowedRank, Math.max(0, eligibleSubmissions.length));

  // Helper to get which rank (1, 2, or 3) is assigned to a specific submission ID
  const getAssignedRank = (targetId: string): number | null => {
    for (let r = 1; r <= maxRanks; r++) {
      if (rankings[r] === targetId) return r;
    }
    return null;
  };

  // Handle tapping a meme card or explicit rank badge
  const handleCardTap = (targetId: string, explicitRank?: number) => {
    if (hasSubmitted || alreadyVotedOnServer) return;

    const currentRank = getAssignedRank(targetId);

    // If an explicit rank badge was clicked
    if (explicitRank !== undefined) {
      setRankings(prev => {
        const next = { ...prev };
        // If this rank was already assigned to targetId, unassign it
        if (next[explicitRank] === targetId) {
          delete next[explicitRank];
        } else {
          // Remove targetId from any other rank it held
          Object.keys(next).forEach(key => {
            if (next[Number(key)] === targetId) delete next[Number(key)];
          });
          next[explicitRank] = targetId;
        }
        return next;
      });
      return;
    }

    // Default tap behavior: cycle or auto-assign lowest available rank
    if (currentRank !== null) {
      // Already ranked -> un-assign it so player can change their mind
      setRankings(prev => {
        const next = { ...prev };
        delete next[currentRank];
        return next;
      });
    } else {
      // Find lowest available unassigned rank (1, 2, or 3)
      let targetRank: number | null = null;
      for (let r = 1; r <= maxRanks; r++) {
        if (!rankings[r]) {
          targetRank = r;
          break;
        }
      }
      // If all ranks are full, replace the lowest rank (e.g., 3rd place)
      if (targetRank === null) {
        targetRank = maxRanks;
      }

      setRankings(prev => {
        const next = { ...prev };
        // Remove targetId from any previous slot just in case
        Object.keys(next).forEach(key => {
          if (next[Number(key)] === targetId) delete next[Number(key)];
        });
        next[targetRank!] = targetId;
        return next;
      });
    }
  };

  // Keyboard navigation shortcuts (scales cleanly to 3-10 players)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (hasSubmitted || alreadyVotedOnServer || submissions.length === 0) return;
      if (['ArrowRight', 'ArrowDown', 'Tab'].includes(e.key)) {
        e.preventDefault();
        setFocusedIndex(prev => (prev + 1) % submissions.length);
      } else if (['ArrowLeft', 'ArrowUp'].includes(e.key) || (e.key === 'Tab' && e.shiftKey)) {
        e.preventDefault();
        setFocusedIndex(prev => (prev - 1 + submissions.length) % submissions.length);
      } else if (e.key === '1' && maxRanks >= 1) {
        e.preventDefault();
        const focusedSub = submissions[focusedIndex];
        if (focusedSub && focusedSub.playerId !== currentUserId) {
          const keyId = focusedSub.submissionId || focusedSub.playerId || focusedSub.memeId;
          handleCardTap(keyId, 1);
        }
      } else if (e.key === '2' && maxRanks >= 2) {
        e.preventDefault();
        const focusedSub = submissions[focusedIndex];
        if (focusedSub && focusedSub.playerId !== currentUserId) {
          const keyId = focusedSub.submissionId || focusedSub.playerId || focusedSub.memeId;
          handleCardTap(keyId, 2);
        }
      } else if (e.key === '3' && maxRanks >= 3) {
        e.preventDefault();
        const focusedSub = submissions[focusedIndex];
        if (focusedSub && focusedSub.playerId !== currentUserId) {
          const keyId = focusedSub.submissionId || focusedSub.playerId || focusedSub.memeId;
          handleCardTap(keyId, 3);
        }
      } else if (e.key === 'Enter') {
        const assignedCount = Object.keys(rankings).length;
        if (assignedCount >= maxRanks) {
          e.preventDefault();
          handleSubmit();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusedIndex, hasSubmitted, alreadyVotedOnServer, submissions, maxRanks, currentUserId, rankings]);

  const handleSubmit = () => {
    if (hasSubmitted || alreadyVotedOnServer) return;

    // Convert rankings map into backend payload
    const votesPayload = eligibleSubmissions.map(sub => {
      const targetId = sub.submissionId || sub.playerId || sub.memeId;
      const assignedRank = getAssignedRank(targetId);
      return {
        memeId: sub.memeId,
        targetPlayerId: targetId,
        rank: assignedRank || 0, // 0 = unranked
      };
    });

    submitCommunityVotes(votesPayload);
    setHasSubmitted(true);
  };

  if (hasSubmitted || alreadyVotedOnServer) {
    return (
      <div className="bg-white rounded-3xl p-8 sm:p-12 border-4 border-[#131010] shadow-[8px_8px_0px_0px_#131010] text-center max-w-md mx-auto my-6 animate-fade-in">
        <div className="w-16 h-16 bg-[#5F8B4C] border-4 border-[#131010] shadow-[4px_4px_0px_0px_#131010] rounded-2xl flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-8 h-8 text-white animate-bounce" strokeWidth={2.5} />
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-[#131010] mb-3 font-poppins">
          Rankings Submitted!
        </h2>
        <p className="text-[#131010]/70 font-medium text-base mb-6">
          Thank you for judging! Waiting for the squad to finish ranking...
        </p>
        <div className="flex items-center justify-center gap-2 bg-[#FFDDAB] py-2.5 px-4 rounded-xl border-2 border-[#131010] font-bold text-xs uppercase tracking-wider text-[#131010]">
          <Hourglass className="w-4 h-4 animate-spin" />
          Tallying Ranked Scores (🥇×5 • 🥈×3 • 🥉×1)
        </div>
      </div>
    );
  }

  const assignedCount = Object.keys(rankings).length;
  const isReady = assignedCount >= maxRanks || eligibleSubmissions.length === 0;

  const getRankBadgeInfo = (rank: number | null) => {
    switch (rank) {
      case 1:
        return {
          label: '🥇 1ST PLACE (+5 PTS)',
          short: '🥇 1ST',
          borderClass: 'border-[#D98324] ring-4 ring-[#D98324]/50 bg-[#FFDDAB]/30',
          badgeClass: 'bg-[#D98324] text-[#131010]',
        };
      case 2:
        return {
          label: '🥈 2ND PLACE (+3 PTS)',
          short: '🥈 2ND',
          borderClass: 'border-slate-400 ring-4 ring-slate-400/50 bg-slate-100',
          badgeClass: 'bg-slate-700 text-white',
        };
      case 3:
        return {
          label: '🥉 3RD PLACE (+1 PT)',
          short: '🥉 3RD',
          borderClass: 'border-amber-700 ring-4 ring-amber-700/50 bg-amber-50/50',
          badgeClass: 'bg-amber-800 text-white',
        };
      default:
        return null;
    }
  };

  return (
    <div className="max-w-5xl mx-auto w-full animate-fade-in pb-28">
      {/* 1. Prompt Banner & Ranked Instructions */}
      <div className="sticky top-0 z-30 bg-white rounded-2xl p-4 sm:p-6 border-4 border-[#131010] shadow-[6px_6px_0px_0px_#131010] mb-8 text-center">
        <div className="inline-flex items-center gap-1.5 bg-[#FFDDAB] px-3.5 py-1 rounded-full border-2 border-[#131010] font-black text-xs text-[#131010] uppercase tracking-widest mb-3">
          <Trophy className="w-4 h-4 text-[#D98324]" strokeWidth={3} /> Top-{maxRanks} Ranked Voting
        </div>
        <p className="text-lg sm:text-2xl font-black text-[#131010] font-poppins leading-tight">
          "{sentence}"
        </p>
        <p className="text-[#131010]/70 text-xs sm:text-sm font-bold mt-2">
          {maxRanks === 1 && 'Tap your #1 favourite meme! 🥇 (+5 pts)'}
          {maxRanks === 2 && 'Rank your Top 2 memes! 🥇 (+5 pts) • 🥈 (+3 pts)'}
          {maxRanks === 3 && 'Rank your Top 3 memes! 🥇 (+5 pts) • 🥈 (+3 pts) • 🥉 (+1 pt)'}
        </p>
      </div>

      {/* Desktop Navigation Shortcuts Banner */}
      <div className="hidden sm:flex items-center justify-center gap-3 bg-[#FFDDAB] border-2 border-[#131010] shadow-[2px_2px_0px_0px_#131010] rounded-xl px-4 py-2.5 mb-8 text-xs font-poppins font-bold text-[#131010]">
        <span>⌨️ Desktop Shortcuts:</span>
        <span className="bg-white px-2 py-0.5 rounded border border-[#131010]">←/→/↑/↓ Navigate</span>
        {maxRanks >= 1 && <span className="bg-white px-2 py-0.5 rounded border border-[#131010]">1 🥇 Gold</span>}
        {maxRanks >= 2 && <span className="bg-white px-2 py-0.5 rounded border border-[#131010]">2 🥈 Silver</span>}
        {maxRanks >= 3 && <span className="bg-white px-2 py-0.5 rounded border border-[#131010]">3 🥉 Bronze</span>}
        <span className="bg-white px-2 py-0.5 rounded border border-[#131010]">Enter Submit</span>
      </div>

      {/* 2. Anonymous Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {submissions.map((sub, idx) => {
          const keyId = sub.submissionId || sub.playerId || sub.memeId;
          const currentRank = getAssignedRank(keyId);
          const badgeInfo = getRankBadgeInfo(currentRank);
          const isMySubmission = sub.playerId === currentUserId;
          const isFocused = focusedIndex === idx;

          return (
            <div
              key={keyId + idx}
              className={`rounded-2xl border-4 border-[#131010] shadow-[6px_6px_0px_0px_#131010] overflow-hidden flex flex-col transition-all duration-200 bg-white ${
                isFocused ? 'ring-4 ring-[#D98324] ring-offset-2 scale-[1.02]' : ''
              } ${isMySubmission
                  ? 'opacity-70 bg-slate-50 cursor-not-allowed'
                  : badgeInfo
                    ? badgeInfo.borderClass
                    : 'hover:-translate-y-1.5 cursor-pointer'
                }`}
              onClick={() => !isMySubmission && handleCardTap(keyId)}
            >
              {/* Image Box */}
              <div className="relative aspect-square w-full bg-[#131010]/5 border-b-4 border-[#131010] overflow-hidden">
                <img
                  src={sub.memeUrl}
                  alt="Anonymous Meme Submission"
                  className="w-full h-full object-cover"
                />
                {isMySubmission && (
                  <div className="absolute inset-0 bg-[#131010]/60 backdrop-blur-[2px] flex items-center justify-center">
                    <span className="bg-[#D98324] text-[#131010] font-black text-sm px-4 py-2 rounded-xl border-2 border-[#131010] shadow-[2px_2px_0px_0px_#131010]">
                      YOUR SUBMISSION
                    </span>
                  </div>
                )}
                {!isMySubmission && badgeInfo && (
                  <div
                    className={`absolute top-3 right-3 px-3 py-1.5 rounded-xl border-2 border-[#131010] shadow-[2px_2px_0px_0px_#131010] font-black text-xs uppercase tracking-wider flex items-center gap-1.5 animate-bounce ${badgeInfo.badgeClass}`}
                  >
                    {badgeInfo.label}
                  </div>
                )}
                {!isMySubmission && !badgeInfo && (
                  <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm border-2 border-[#131010] px-2.5 py-1 rounded-lg font-black text-xs uppercase tracking-wider text-[#131010]/80">
                    Meme #{idx + 1}
                  </div>
                )}
              </div>

              {/* Ranking Controls Footer */}
              <div
                className="p-3.5 flex flex-col items-center justify-center bg-slate-50/80 border-t border-[#131010]/10"
                onClick={e => e.stopPropagation()}
              >
                {isMySubmission ? (
                  <div className="text-xs font-bold text-[#131010]/50 py-1.5">
                    You cannot vote for your own meme
                  </div>
                ) : (
                  <div className="w-full flex items-center justify-between gap-1.5">
                    <span className="text-xs font-bold text-[#131010]/70">
                      {currentRank ? 'Tap rank to unassign:' : 'Tap badge to assign:'}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {/* Rank 1 Button */}
                      {maxRanks >= 1 && (
                        <button
                          type="button"
                          onClick={() => handleCardTap(keyId, 1)}
                          className={`px-2.5 py-1 rounded-lg border-2 border-[#131010] font-black text-xs transition-all cursor-pointer ${currentRank === 1
                              ? 'bg-[#D98324] text-[#131010] shadow-[2px_2px_0px_0px_#131010] scale-105'
                              : 'bg-white hover:bg-amber-100 text-[#131010]'
                            }`}
                          title="Assign 🥇 1st Place (+5 pts)"
                        >
                          🥇
                        </button>
                      )}

                      {/* Rank 2 Button */}
                      {maxRanks >= 2 && (
                        <button
                          type="button"
                          onClick={() => handleCardTap(keyId, 2)}
                          className={`px-2.5 py-1 rounded-lg border-2 border-[#131010] font-black text-xs transition-all cursor-pointer ${currentRank === 2
                              ? 'bg-slate-700 text-white shadow-[2px_2px_0px_0px_#131010] scale-105'
                              : 'bg-white hover:bg-slate-200 text-[#131010]'
                            }`}
                          title="Assign 🥈 2nd Place (+3 pts)"
                        >
                          🥈
                        </button>
                      )}

                      {/* Rank 3 Button */}
                      {maxRanks >= 3 && (
                        <button
                          type="button"
                          onClick={() => handleCardTap(keyId, 3)}
                          className={`px-2.5 py-1 rounded-lg border-2 border-[#131010] font-black text-xs transition-all cursor-pointer ${currentRank === 3
                              ? 'bg-amber-800 text-white shadow-[2px_2px_0px_0px_#131010] scale-105'
                              : 'bg-white hover:bg-amber-100 text-[#131010]'
                            }`}
                          title="Assign 🥉 3rd Place (+1 pt)"
                        >
                          🥉
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. Sticky Bottom Action Bar with Rank Status */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t-4 border-[#131010] p-4 shadow-[0_-10px_25px_rgba(0,0,0,0.15)]">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {maxRanks >= 1 && (
              <div
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 border-[#131010] text-xs font-black ${rankings[1] ? 'bg-[#FFDDAB] text-[#131010]' : 'bg-slate-100 text-slate-400'
                  }`}
              >
                <span>🥇 1st Place</span>
                {rankings[1] && <CheckCircle className="w-4 h-4 text-[#5F8B4C]" />}
              </div>
            )}
            {maxRanks >= 2 && (
              <div
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 border-[#131010] text-xs font-black ${rankings[2] ? 'bg-slate-200 text-slate-800' : 'bg-slate-100 text-slate-400'
                  }`}
              >
                <span>🥈 2nd Place</span>
                {rankings[2] && <CheckCircle className="w-4 h-4 text-[#5F8B4C]" />}
              </div>
            )}
            {maxRanks >= 3 && (
              <div
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 border-[#131010] text-xs font-black ${rankings[3] ? 'bg-amber-100 text-amber-900' : 'bg-slate-100 text-slate-400'
                  }`}
              >
                <span>🥉 3rd Place</span>
                {rankings[3] && <CheckCircle className="w-4 h-4 text-[#5F8B4C]" />}
              </div>
            )}
          </div>

          <button
            onClick={handleSubmit}
            className={`w-full sm:w-auto px-8 py-3.5 font-black text-base rounded-2xl border-4 border-[#131010] shadow-[4px_4px_0px_0px_#131010] transition-all flex items-center justify-center gap-2 ${isReady
                ? 'bg-[#5F8B4C] hover:bg-[#4d733d] active:translate-y-0.5 text-white cursor-pointer'
                : 'bg-amber-400 hover:bg-amber-500 text-[#131010] cursor-pointer'
              }`}
          >
            <CheckCircle className="w-5 h-5" />
            <span>LOCK IN RANKINGS 🔥</span>
          </button>
        </div>
      </div>
    </div>
  );
};
