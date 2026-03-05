import React, { useEffect, useState, useMemo } from 'react';
import { useGame } from '../context/GameContext';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import type { Player } from '../context/GameContext';

// Icons
import { Users, MessageSquare, Volume2, VolumeX, Menu, X, ChevronDown, Trophy, Star } from 'lucide-react';

// --- Component Imports ---
import JudgeCelebration from '../components/GamePhases/JudgeCelebration';
import SentenceInput from '../components/GamePhases/SentenceInput';
import MemeSelection from '../components/GamePhases/MemeSelection';
import MemeGallery from '../components/GamePhases/MemeReveal'; 
import Results from '../components/GamePhases/Results';
import FinalLeaderboard from '../components/GamePhases/FinalLeaderboard';
import Timer from '../components/UI/Timer';
import PlayerStatus from '../components/UI/PlayerStatus';

const Game: React.FC = () => {
  const {
    gameState,
    isHost,
    isJudge,
    isRestoring,
    submitSentence,
    selectMeme,
    scoreMeme,
    requestNextRound,
    leaveRoom,
    startGame,
  } = useGame();
  
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // --- Local UI State ---
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showJudgeCelebration, setShowJudgeCelebration] = useState(false);
  const [previousJudgeId, setPreviousJudgeId] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isPlayerStatusOpen, setIsPlayerStatusOpen] = useState(false);
  
  useEffect(() => {
    if (!isRestoring && (!gameState || !user)) {
      navigate('/dashboard');
      return;
    }
  }, [gameState, user, navigate, isRestoring]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const isSafeToLeave = !gameState || 
                             gameState.gamePhase === 'lobby' || 
                             gameState.gamePhase === 'finalResults';

      if (!isSafeToLeave) {
        e.preventDefault();
        e.returnValue = 'Game in progress. Your results may not be saved. Are you sure?';
        return 'Game in progress. Your results may not be saved. Are you sure?';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [gameState]);

  // Trigger Judge Celebration only for the Host when the game starts
  useEffect(() => {
    if (!gameState || !user) return;
    const currentJudgeId = gameState.currentJudge?.id;
    if (gameState.gamePhase === 'sentenceCreation' && currentJudgeId === user.id) {
      if (previousJudgeId !== currentJudgeId) {
        setShowJudgeCelebration(true);
      }
    }
    if (currentJudgeId) {
      setPreviousJudgeId(currentJudgeId);
    }
  }, [gameState, user, previousJudgeId]);

  const gamePhase = gameState?.gamePhase || 'lobby';
  const timerEndTime = gameState?.timerEndTime;
  const [timerDuration, setTimerDuration] = useState(0);

  useEffect(() => {
    if (!timerEndTime) {
      setTimerDuration(0);
      return;
    }
    const updateTimer = () => {
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((timerEndTime - now) / 1000));
      setTimerDuration(remaining);
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [timerEndTime]);

  const timerActive = timerDuration > 0 && gamePhase === 'memeSelection';

  const roundWinner = useMemo(() => {
    if (gamePhase !== 'results' || !gameState) return undefined;
    return [...gameState.players].sort((a, b) => b.score - a.score)[0];
  }, [gamePhase, gameState]);

  const hasUserSubmitted = gameState?.submissions?.some(sub => sub.playerId === user?.id) || false;
  
  const allMemesScored = useMemo(() => {
    if ((gamePhase !== 'memeReveal' && gamePhase !== 'scoring') || !gameState) return false;
    
    const { submissions, players } = gameState;
    const nonJudgePlayersCount = players.filter(p => !p.isJudge).length;

    if (submissions.length === 0 || submissions.length < nonJudgePlayersCount) return false;
    return submissions.every(sub => Number(sub.score || 0) > 0);
  }, [gamePhase, gameState]);
  
  const handlePlayAgain = () => { startGame(); };
  const handleSentenceSubmit = (sentence: string) => { submitSentence(sentence); };
  const handleMemeSelect = (memeId: string) => { selectMeme(memeId); };
  const handleMemeScore = (playerId: string, score: number) => { if (isJudge) scoreMeme(playerId, score); };
  const handleRequestNextRound = () => { requestNextRound(); };
  const handleLeaveGame = () => { leaveRoom(); };
  const handleCelebrationComplete = () => { setShowJudgeCelebration(false); };
  
  const getPhaseTitle = () => {
    switch (gamePhase) {
      case 'sentenceCreation': return 'Creating Sentence';
      case 'memeSelection': return 'Selecting Memes';
      case 'memeReveal': return 'Revealing Memes';
      case 'scoring': return 'Scoring Round';
      case 'results': return 'Round Results';
      case 'finalResults': return 'Final Results!';
      default: return 'Game in Progress';
    }
  };

  const getPhaseDescription = () => {
    if (gamePhase === 'sentenceCreation') {
      return isJudge ? 'Create a meme sentence prompt' : `Waiting for ${gameState?.currentJudge?.username} to write the prompt`;
    }
    if (gamePhase === 'memeSelection') {
      return isJudge ? 'Players are selecting their memes' : 'Select the perfect meme for this sentence';
    }
    if (gamePhase === 'memeReveal' || gamePhase === 'scoring') {
      return isJudge ? 'Rate all memes from 1-10 based on humor' : "Enjoy viewing everyone's meme responses!";
    }
    return '';
  };

  if (isRestoring || !gameState || !user) {
    return (
      <div className="min-h-screen bg-[#FFDDAB] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 shadow-2xl text-center max-w-sm w-full">
          <div className="w-16 h-16 border-4 border-t-[#5F8B4C] rounded-full animate-spin mx-auto mb-6"></div>
          <h3 className="text-xl font-bold mb-2">{isRestoring ? 'Reconnecting...' : 'Loading Game...'}</h3>
        </div>
      </div>
    );
  }

  if (showJudgeCelebration && isJudge) {
    return <JudgeCelebration playerName={user.username || 'Judge'} onComplete={handleCelebrationComplete} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFDDAB] via-[#FFDDAB]/90 to-[#FFDDAB]/80">
      {/* --- HEADER SECTION --- */}
      <div className="bg-white/95 backdrop-blur-md shadow-xl border-b border-white/30 sticky top-0 z-50">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="bg-[#5F8B4C] text-white px-3 py-1.5 rounded-lg font-mono font-bold text-sm">Room: {gameState.roomId}</div>
              <div className="hidden sm:flex items-center gap-2 text-slate-500">
                <Users className="w-4 h-4" />
                <span className="font-mono text-sm">{gameState.players.length} players</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="hidden md:flex items-center gap-2">
                <button onClick={() => setSoundEnabled(!soundEnabled)} className="p-2.5 rounded-xl bg-white/60 hover:bg-white/80 transition-all shadow-sm">
                  {soundEnabled ? <Volume2 className="w-5 h-5 text-slate-800" /> : <VolumeX className="w-5 h-5 text-slate-800" />}
                </button>
                <button onClick={() => setIsChatOpen(!isChatOpen)} className="p-2.5 rounded-xl bg-white/60 hover:bg-white/80 transition-all shadow-sm">
                  <MessageSquare className="w-5 h-5 text-slate-800" />
                </button>
                <button onClick={handleLeaveGame} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2.5 rounded-xl transition-all font-mono text-sm shadow-lg">
                  Leave
                </button>
              </div>

              <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="md:hidden p-2.5 rounded-xl bg-white/60 shadow-sm">
                {isMobileMenuOpen ? <X className="w-5 h-5 text-slate-800" /> : <Menu className="w-5 h-5 text-slate-800" />}
              </button>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-[#5F8B4C] rounded-full animate-pulse"></div>
              <span className="text-slate-800 font-mono text-sm font-medium">{getPhaseTitle()}</span>
              {gameState.currentRound > 0 && (
                <div className="flex items-center gap-1 text-slate-500">
                  <Trophy className="w-3.5 h-3.5" />
                  <span className="font-mono text-sm">{gameState.currentRound}/{gameState.totalRounds}</span>
                </div>
              )}
            </div>
          </div>

          {getPhaseDescription() && (
            <div className="mt-2 text-slate-500 font-mono text-[13px] italic">
              {getPhaseDescription()}
            </div>
          )}
        </div>
      </div>

      {timerActive && (
        <div className="px-4 py-4 bg-white/20 border-b border-white/20">
          <Timer duration={timerDuration} onComplete={() => {}} isActive={timerActive} label="Selection Time" />
        </div>
      )}

      {/* --- MAIN CONTENT AREA --- */}
      <div className="flex flex-col lg:flex-row min-h-0">
        <div className="flex-1 p-4 lg:p-6">
          <div className="max-w-4xl mx-auto">
            
            {/* JUDGE VIEW: Writing the Sentence */}
            {gamePhase === 'sentenceCreation' && isJudge && <SentenceInput onSubmit={handleSentenceSubmit} />}
            
            {/* ⭐️ PLAYER VIEW: Upgraded Judge Announcement Screen ⭐️ */}
            {gamePhase === 'sentenceCreation' && !isJudge && (
              <div className="bg-white/95 rounded-3xl p-8 shadow-xl border border-white/30 text-center max-w-md mx-auto mt-10 transform transition-all hover:scale-105">
                <h3 className="font-mono text-slate-400 text-sm uppercase tracking-widest mb-6">Current Judge</h3>
                
                <div className="relative w-28 h-28 mx-auto mb-6">
                  <img 
                    src={gameState.currentJudge?.avatar || 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=judge'} 
                    alt="Judge" 
                    className="w-full h-full rounded-full border-4 border-[#D98324] shadow-lg object-cover bg-[#FFDDAB]"
                  />
                  <div className="absolute -bottom-2 -right-2 bg-[#D98324] p-2.5 rounded-full shadow-lg">
                    <Star className="w-6 h-6 text-white" fill="currentColor" />
                  </div>
                </div>
                
                <h2 className="text-3xl font-poppins font-black text-[#5F8B4C] mb-2">
                  {gameState.currentJudge?.username}
                </h2>
                
                <div className="flex items-center justify-center gap-3 text-slate-500 mt-8 bg-slate-50 py-4 px-6 rounded-2xl border border-slate-100">
                  <div className="w-5 h-5 border-2 border-t-[#5F8B4C] border-slate-200 rounded-full animate-spin"></div>
                  <p className="font-mono text-sm font-medium">Waiting for them to write a prompt...</p>
                </div>
              </div>
            )}

            {gamePhase === 'memeSelection' && !isJudge && gameState.currentSentence && (
              <MemeSelection
                sentence={gameState.currentSentence}
                onSelect={handleMemeSelect}
                isSubmitted={hasUserSubmitted}
                timeLeft={timerActive ? timerDuration : undefined}
              />
            )}

            {(gamePhase === 'memeReveal' || gamePhase === 'scoring') && gameState.currentSentence && (
              <MemeGallery
                sentence={gameState.currentSentence}
                submissions={gameState.submissions}
                players={gameState.players}
                isJudge={gameState.currentJudge?.id === user?.id}
                onScore={handleMemeScore}
                allScored={allMemesScored}
                onSubmitScores={handleRequestNextRound}
              />
            )}

            {gamePhase === 'results' && (
              <Results
                players={gameState.players}
                roundNumber={gameState.currentRound}
                totalRounds={gameState.totalRounds}
                roundWinner={roundWinner}
                isHost={isHost}
                onNextRound={handleRequestNextRound}
                isGameEnd={gameState.currentRound === gameState.totalRounds}
              />
            )}

            {gamePhase === 'finalResults' && (
              <FinalLeaderboard
                players={gameState.finalResult?.players as Player[] || gameState.players}
                totalRounds={gameState.finalResult?.totalRounds || gameState.totalRounds}
                isHost={isHost}
                onPlayAgain={handlePlayAgain}
                onBackToLobby={() => {
                  leaveRoom(); 
                  navigate('/dashboard');
                }}
              />
            )}
          </div>
        </div>

        {/* --- SIDEBAR AREA --- */}
        <div className="lg:w-80 lg:border-l lg:border-white/20 bg-white/10 backdrop-blur-sm">
          <div className="lg:hidden">
            <button
              onClick={() => setIsPlayerStatusOpen(!isPlayerStatusOpen)}
              className="w-full p-4 flex items-center justify-between bg-white/20"
            >
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-slate-800" />
                <span className="font-mono text-sm font-medium text-slate-800">Players ({gameState.players.length})</span>
              </div>
              <ChevronDown 
                className={`w-5 h-5 text-slate-800 transition-transform ${isPlayerStatusOpen ? 'rotate-180' : ''}`} 
              />
            </button>
          </div>

          <div className={`${isPlayerStatusOpen ? 'block' : 'hidden'} lg:block p-4 lg:p-6`}>
            <PlayerStatus
              players={gameState.players}
              currentJudge={gameState.currentJudge}
              submissions={gameState.submissions}
              showSubmissionStatus={gamePhase === 'memeSelection'}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Game;