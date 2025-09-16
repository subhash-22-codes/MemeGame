import React, { useEffect, useState } from 'react';
import { useGame } from '../context/GameContext';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import type { Player } from '../context/GameContext';

// Components
import JudgeAssignment from '../components/GamePhases/JudgeAssignment';
import JudgeCelebration from '../components/GamePhases/JudgeCelebration';
import SentenceInput from '../components/GamePhases/SentenceInput';
import MemeSelection from '../components/GamePhases/MemeSelection';
import MemeGallery from '../components/GamePhases/MemeGallery';
import Results from '../components/GamePhases/Results';
import FinalLeaderboard from '../components/GamePhases/FinalLeaderboard';
import Timer from '../components/UI/Timer';
import PlayerStatus from '../components/UI/PlayerStatus';

// Icons
import { Home, Users, MessageSquare, Volume2, VolumeX, Menu, X, ChevronDown, Trophy } from 'lucide-react';

const Game: React.FC = () => {
  const {
    gameState,
    isHost,
    submitSentence,
    selectMeme,
    scoreMeme,
    startNextRound,
    endGame,
    leaveRoom,
    safeEmit
  } = useGame();
  const { user } = useAuth();
  const navigate = useNavigate();
  


  const [selectedMemeId, setSelectedMemeId] = useState<string | null>(null);
  const [timerActive, setTimerActive] = useState(false);
  const [timerDuration, setTimerDuration] = useState(30);
  const [currentPhase, setCurrentPhase] = useState<string>('lobby');
  const [roundWinner, setRoundWinner] = useState<Player | undefined>(undefined);
  const [gameWinner, setGameWinner] = useState<Player | undefined>(undefined);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showJudgeCelebration, setShowJudgeCelebration] = useState(false);
  const [previousJudgeId, setPreviousJudgeId] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isPlayerStatusOpen, setIsPlayerStatusOpen] = useState(false);

  useEffect(() => {
    if (!gameState || !user) {
      navigate('/dashboard');
      return;
    }
  }, [gameState, user, navigate]);

  // Warn user before page reload during game
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (gameState && gameState.gamePhase !== 'lobby') {
        e.preventDefault();
        e.returnValue = 'Are you sure you want to leave? You will be disconnected from the game.';
        return 'Are you sure you want to leave? You will be disconnected from the game.';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [gameState]);

  useEffect(() => {
    if (!gameState) return;

    const phase = gameState.gamePhase;
    setCurrentPhase(phase);

    // Check if current user just became judge
    if (phase === 'judgeSelection' && gameState.currentJudge && gameState.currentJudge.id === user?.id) {
      // Show celebration if this is a new judge assignment (not the same as previous)
      if (previousJudgeId !== gameState.currentJudge.id) {
        setShowJudgeCelebration(true);
      }
    }

    // Update previous judge ID
    if (gameState.currentJudge) {
      setPreviousJudgeId(gameState.currentJudge.id);
    }

    // Timer logic
    if (phase === 'memeSelection' && gameState.currentSentence) {
      setTimerActive(true);
      setTimerDuration(gameState.timeLeft || 30);
    } else {
      setTimerActive(false);
    }

    if (phase === 'scoring' || phase === 'results') {
      const sortedPlayers = [...gameState.players].sort((a, b) => b.score - a.score);
      setRoundWinner(sortedPlayers[0]);

      if (gameState.roundNumber >= gameState.totalRounds) {
        setGameWinner(sortedPlayers[0]);
      }
    }
  }, [gameState, user?.id, previousJudgeId]);

  // Timer synchronization effect
  useEffect(() => {
    if (!gameState?.timerEndTime) return;

    const updateTimer = () => {
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((gameState.timerEndTime! - now) / 1000));
      setTimerDuration(remaining);
      
      if (remaining <= 0) {
        setTimerActive(false);
      }
    };

    // Update immediately
    updateTimer();

    // Update every second
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [gameState?.timerEndTime]);

  const isCurrentUserJudge = gameState?.currentJudge?.id === user?.id;
  console.log('[DEBUG] Judge status:', { 
    currentJudgeId: gameState?.currentJudge?.id, 
    userId: user?.id, 
    isJudge: isCurrentUserJudge,
    currentRound: gameState?.roundNumber,
    gamePhase: currentPhase
  });
  const hasUserSubmitted = gameState?.submissions?.some(sub => sub.playerId === user?.id);
  const allPlayersSubmitted = () => {
    if (!gameState) return false;
    const nonJudgePlayers = gameState.players.filter(p => !p.isJudge);
    return gameState.submissions.length >= nonJudgePlayers.length;
  };
  const allMemesScored = () => {
    // Filter out duplicate submissions by playerId
    const uniqueSubmissions = gameState?.submissions?.filter((submission, index, self) => 
      index === self.findIndex(s => s.playerId === submission.playerId)
    ) || [];
    
    const scored = uniqueSubmissions.length > 0 && uniqueSubmissions.every(sub => 
      sub.score !== undefined && sub.score !== null
    );
    
    console.log('[DEBUG] allMemesScored check:', { 
      totalSubmissions: gameState?.submissions?.length,
      uniqueSubmissions: uniqueSubmissions.length,
      submissions: uniqueSubmissions.map(s => ({ playerId: s.playerId, score: s.score, scoreType: typeof s.score })), 
      scored,
      isJudge: isCurrentUserJudge 
    });
    return scored;
  };
  const isGameEnd =
    gameState?.roundNumber === gameState?.totalRounds && currentPhase === 'results';
  
  const isGameComplete = gameState?.roundNumber === gameState?.totalRounds;

  console.log('[Game] Debug game completion:', {
    roundNumber: gameState?.roundNumber,
    totalRounds: gameState?.totalRounds,
    currentPhase,
    isGameEnd,
    isGameComplete,
    roundsPerJudge: gameState?.roundsPerJudge
  });

  const handlePlayAgain = () => {
    // Reset game state and start new game
    safeEmit('startGame', { roomId: gameState?.roomId });
  };

  const handleBackToLobby = () => {
    if (isGameComplete) {
      navigate(`/room/${gameState?.roomId}`);
    } else {
      setSelectedMemeId(null);
      setRoundWinner(undefined);
      setGameWinner(undefined);
    }
  };

  const handleSentenceSubmit = (sentence: string) => {
    submitSentence(sentence);
  };

  const handleMemeSelect = (memeId: string) => {
    setSelectedMemeId(memeId);
    selectMeme(memeId);
  };

  const handleMemeScore = (playerId: string, score: number) => {
    if (isCurrentUserJudge) {
      scoreMeme(playerId, score);
    }
  };

  const handleTimerComplete = () => {
    setTimerActive(false);
    if (allPlayersSubmitted()) {
      // Backend handles phase transition
    }
  };

  const handleNextRound = () => {
    setSelectedMemeId(null);
    setRoundWinner(undefined);
    startNextRound();
  };

  const handleEndGame = () => {
    endGame();
    navigate('/dashboard');
  };

  const handleLeaveGame = () => {
    leaveRoom();
    navigate('/dashboard');
  };

  const handleCelebrationComplete = () => {
    setShowJudgeCelebration(false);
  };
  
  const handleSentenceCreation = () => {
  safeEmit('startSentenceCreation', { roomId: gameState?.roomId });
};


  const getPhaseTitle = () => {
    switch (currentPhase) {
      case 'judgeSelection':
        return 'Judge Selection';
      case 'sentenceCreation':
        return 'Creating Sentence';
      case 'memeSelection':
        return 'Selecting Memes';
      case 'memeReveal':
        return 'Revealing Memes';
      case 'scoring':
        return 'Scoring Round';
      case 'results':
        return 'Round Results';
      default:
        return 'Game in Progress';
    }
  };

  const getPhaseDescription = () => {
    if (currentPhase === 'sentenceCreation') {
      return isCurrentUserJudge 
        ? 'Create a meme sentence prompt'
        : `${gameState?.currentJudge?.username} is creating the prompt`;
    }
    if (currentPhase === 'memeSelection') {
      return isCurrentUserJudge
        ? 'Players are selecting their memes'
        : 'Select the perfect meme for this sentence';
    }
    if (currentPhase === 'memeReveal' || currentPhase === 'scoring') {
      return isCurrentUserJudge
        ? 'Rate all memes from 1-10 based on humor'
        : 'Enjoy viewing everyone\'s meme responses!';
    }
    return '';
  };

  if (!gameState || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#FFDDAB] via-[#FFDDAB]/90 to-[#FFDDAB]/80 flex items-center justify-center p-4">
        <div className="bg-white/95 backdrop-blur-md rounded-2xl p-8 shadow-2xl border border-white/30 text-center max-w-sm w-full">
          <div className="w-16 h-16 border-4 border-[#5F8B4C]/30 border-t-[#5F8B4C] rounded-full animate-spin mx-auto mb-6"></div>
          <h3 className="text-xl font-bold text-[#131010] mb-2">Loading Game</h3>
          <p className="text-[#131010]/70 font-mono text-sm">Connecting to room...</p>
        </div>
      </div>
    );
  }

  // Show judge celebration overlay when current user becomes judge
  if (showJudgeCelebration && isCurrentUserJudge) {
    return (
      <JudgeCelebration
        playerName={user.username || 'Judge'}
        onComplete={handleCelebrationComplete}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFDDAB] via-[#FFDDAB]/90 to-[#FFDDAB]/80">
      {/* Mobile Header */}
      <div className="bg-white/95 backdrop-blur-md shadow-xl border-b border-white/30 sticky top-0 z-50">
        <div className="px-4 py-3">
          {/* Top Row - Room Info & Menu */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="bg-[#5F8B4C] text-white px-3 py-1.5 rounded-lg font-mono font-bold text-sm">
                Room: {gameState.roomId}
              </div>
              <div className="hidden sm:flex items-center gap-2 text-[#131010]/70">
                <Users className="w-4 h-4" />
                <span className="font-mono text-sm">{gameState.players.length} players</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Desktop Controls */}
              <div className="hidden md:flex items-center gap-2">
                <button
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className="p-2.5 rounded-xl bg-white/60 hover:bg-white/80 transition-all duration-300 shadow-sm"
                >
                  {soundEnabled ? (
                    <Volume2 className="w-5 h-5 text-[#131010]" />
                  ) : (
                    <VolumeX className="w-5 h-5 text-[#131010]" />
                  )}
                </button>

                <button
                  onClick={() => setIsChatOpen(!isChatOpen)}
                  className="p-2.5 rounded-xl bg-white/60 hover:bg-white/80 transition-all duration-300 shadow-sm"
                >
                  <MessageSquare className="w-5 h-5 text-[#131010]" />
                </button>

                <button
                  onClick={handleLeaveGame}
                  className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2.5 rounded-xl transition-all duration-300 font-mono text-sm shadow-lg"
                >
                  <Home className="w-4 h-4" />
                  <span className="hidden lg:inline">Leave</span>
                </button>
              </div>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-2.5 rounded-xl bg-white/60 hover:bg-white/80 transition-all duration-300 shadow-sm"
              >
                {isMobileMenuOpen ? (
                  <X className="w-5 h-5 text-[#131010]" />
                ) : (
                  <Menu className="w-5 h-5 text-[#131010]" />
                )}
              </button>
            </div>
          </div>

          {/* Game Status Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-[#5F8B4C] rounded-full animate-pulse"></div>
                <span className="text-[#131010] font-mono text-sm font-medium">
                  {getPhaseTitle()}
                </span>
              </div>
              {gameState.roundNumber && gameState.totalRounds && (
                <div className="flex items-center gap-1 text-[#131010]/70">
                  <Trophy className="w-4 h-4" />
                  <span className="font-mono text-sm">
                    {gameState.roundNumber}/{gameState.totalRounds}
                  </span>
                </div>
              )}
            </div>

            {/* Mobile Player Count */}
            <div className="sm:hidden flex items-center gap-2 text-[#131010]/70">
              <Users className="w-4 h-4" />
              <span className="font-mono text-sm">{gameState.players.length}</span>
            </div>
          </div>

          {/* Phase Description */}
          {getPhaseDescription() && (
            <div className="mt-2 text-[#131010]/70 font-mono text-sm">
              {getPhaseDescription()}
            </div>
          )}

          {/* Mobile Menu Dropdown */}
          {isMobileMenuOpen && (
            <div className="md:hidden mt-4 p-4 bg-white/80 backdrop-blur-sm rounded-xl border border-white/40 shadow-lg">
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => {
                    setSoundEnabled(!soundEnabled);
                    setIsMobileMenuOpen(false);
                  }}
                  className="flex items-center gap-3 p-3 rounded-lg bg-white/60 hover:bg-white/80 transition-all duration-300"
                >
                  {soundEnabled ? (
                    <Volume2 className="w-5 h-5 text-[#131010]" />
                  ) : (
                    <VolumeX className="w-5 h-5 text-[#131010]" />
                  )}
                  <span className="font-mono text-sm text-[#131010]">
                    {soundEnabled ? 'Mute Sound' : 'Enable Sound'}
                  </span>
                </button>

                <button
                  onClick={() => {
                    setIsChatOpen(!isChatOpen);
                    setIsMobileMenuOpen(false);
                  }}
                  className="flex items-center gap-3 p-3 rounded-lg bg-white/60 hover:bg-white/80 transition-all duration-300"
                >
                  <MessageSquare className="w-5 h-5 text-[#131010]" />
                  <span className="font-mono text-sm text-[#131010]">
                    {isChatOpen ? 'Close Chat' : 'Open Chat'}
                  </span>
                </button>

                <button
                  onClick={() => {
                    setIsPlayerStatusOpen(!isPlayerStatusOpen);
                    setIsMobileMenuOpen(false);
                  }}
                  className="flex items-center gap-3 p-3 rounded-lg bg-white/60 hover:bg-white/80 transition-all duration-300"
                >
                  <Users className="w-5 h-5 text-[#131010]" />
                  <span className="font-mono text-sm text-[#131010]">
                    {isPlayerStatusOpen ? 'Hide Players' : 'Show Players'}
                  </span>
                </button>

                <div className="border-t border-white/40 pt-3">
                  <button
                    onClick={() => {
                      handleLeaveGame();
                      setIsMobileMenuOpen(false);
                    }}
                    className="flex items-center gap-3 p-3 rounded-lg bg-red-500 hover:bg-red-600 text-white transition-all duration-300 w-full"
                  >
                    <Home className="w-5 h-5" />
                    <span className="font-mono text-sm">Leave Game</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Timer Section */}
      {timerActive && (
        <div className="px-4 py-4 bg-white/20 backdrop-blur-sm border-b border-white/20">
          <div className="flex justify-center">
            <Timer
              duration={timerDuration}
              onComplete={handleTimerComplete}
              isActive={timerActive}
              label="Selection Time"
            />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex flex-col lg:flex-row min-h-0">
        {/* Game Content */}
        <div className="flex-1 p-4 lg:p-6">
          <div className="max-w-4xl mx-auto">
            {currentPhase === 'judgeSelection' && gameState.currentJudge && (
              <JudgeAssignment
                currentJudge={gameState.currentJudge}
                roundNumber={gameState.roundNumber}
                totalRounds={gameState.totalRounds}
                players={gameState.players}
                onReady={handleSentenceCreation}
                isCurrentUserJudge={isCurrentUserJudge}
              />
            )}

            {currentPhase === 'sentenceCreation' && isCurrentUserJudge && (
              <SentenceInput onSubmit={handleSentenceSubmit} />
            )}

            {currentPhase === 'memeSelection' &&
              !isCurrentUserJudge &&
              gameState.currentSentence && (
                <MemeSelection
                  sentence={gameState.currentSentence}
                  onSelect={handleMemeSelect}
                  selectedMemeId={selectedMemeId ?? undefined}
                  isSubmitted={hasUserSubmitted}
                  timeLeft={timerActive ? timerDuration : undefined}
                  isJudge={false}
                />
              )}

            {(currentPhase === 'memeReveal' || currentPhase === 'scoring') &&
              gameState.currentSentence && (
                <MemeGallery
                  sentence={gameState.currentSentence}
                  submissions={gameState.submissions}
                  players={gameState.players}
                  isJudge={isCurrentUserJudge}
                  onScore={handleMemeScore}
                  allScored={allMemesScored()}
                  onSubmitScores={handleNextRound}
                  roundNumber={gameState.roundNumber}
                />
              )}

            {/* Final Leaderboard */}
            {isGameComplete && currentPhase === 'results' && (
              <FinalLeaderboard
                players={gameState.finalResult?.players as unknown as Player[] || gameState.players}
                totalRounds={gameState.finalResult?.totalRounds || gameState.totalRounds}
                isHost={isHost}
                onPlayAgain={handlePlayAgain}
                onBackToLobby={handleBackToLobby}
              />
            )}

            {/* Regular Results */}
            {!isGameComplete && currentPhase === 'results' && (
              <Results
                players={gameState.players}
                roundNumber={gameState.roundNumber}
                totalRounds={gameState.totalRounds}
                roundWinner={roundWinner}
                gameWinner={gameWinner}
                isGameEnd={isGameEnd}
                isHost={isHost}
                onNextRound={handleNextRound}
                onEndGame={handleEndGame}
                onBackToLobby={handleBackToLobby}
              />
            )}

            {/* Waiting States */}
            {currentPhase === 'sentenceCreation' && !isCurrentUserJudge && (
              <div className="bg-white/95 backdrop-blur-md rounded-2xl p-6 lg:p-8 shadow-xl border border-white/30 text-center">
                <div className="w-16 h-16 border-4 border-[#5F8B4C]/30 border-t-[#5F8B4C] rounded-full animate-spin mx-auto mb-6"></div>
                <h2 className="text-xl lg:text-2xl font-bold text-[#131010] mb-3">
                  Waiting for the Judge
                </h2>
                <p className="text-[#131010]/70 font-mono text-sm lg:text-base">
                  {gameState.currentJudge?.username} is creating a sentence prompt...
                </p>
              </div>
            )}

            {currentPhase === 'memeSelection' && isCurrentUserJudge && (
              <div className="bg-white/95 backdrop-blur-md rounded-2xl p-6 lg:p-8 shadow-xl border border-white/30 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-[#5F8B4C] to-[#7BA05C] rounded-full flex items-center justify-center mx-auto mb-6">
                  <Users className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-xl lg:text-2xl font-bold text-[#131010] mb-3">
                  Waiting for Players
                </h2>
                <p className="text-[#131010]/70 font-mono text-sm lg:text-base mb-4">
                  Players are selecting their memes for your prompt:
                </p>
                <div className="bg-[#5F8B4C]/10 rounded-lg p-4 border border-[#5F8B4C]/20">
                  <p className="text-lg text-[#131010] font-mono italic">
                    "{gameState.currentSentence}"
                  </p>
                </div>
                <div className="mt-4 text-sm text-[#131010]/60 font-mono">
                  {gameState.submissions.length} of {gameState.players.filter(p => !p.isJudge).length} players have submitted
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Player Status Sidebar */}
        <div className="lg:w-80 lg:border-l lg:border-white/20 bg-white/10 backdrop-blur-sm">
          {/* Mobile Toggle */}
          <div className="lg:hidden">
            <button
              onClick={() => setIsPlayerStatusOpen(!isPlayerStatusOpen)}
              className="w-full p-4 flex items-center justify-between bg-white/20 hover:bg-white/30 transition-all duration-300"
            >
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-[#131010]" />
                <span className="font-mono text-sm font-medium text-[#131010]">
                  Players ({gameState.players.length})
                </span>
              </div>
              <ChevronDown 
                className={`w-5 h-5 text-[#131010] transition-transform duration-300 ${
                  isPlayerStatusOpen ? 'rotate-180' : ''
                }`} 
              />
            </button>
          </div>

          {/* Player Status Content */}
          <div className={`${isPlayerStatusOpen ? 'block' : 'hidden'} lg:block p-4 lg:p-6`}>
            <PlayerStatus
              players={gameState.players}
              currentJudge={gameState.currentJudge}
              submissions={gameState.submissions}
              showSubmissionStatus={currentPhase === 'memeSelection'}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Game;