import React, { useEffect, useState, useMemo } from 'react';
import { useGame } from '../context/GameContext';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import type { Player } from '../context/GameContext';


// Icons
import { Users, MessageSquare, Volume2, VolumeX, Menu, X, Trophy, Star, LogOut, Gavel} from 'lucide-react';

// --- Component Imports ---
import JudgeCelebration from '../components/GamePhases/JudgeCelebration';
import SentenceInput from '../components/GamePhases/SentenceInput';
import MemeSelection from '../components/GamePhases/MemeSelection';
import MemeGallery from '../components/GamePhases/MemeReveal'; 
import Results from '../components/GamePhases/Results';
import FinalLeaderboard from '../components/GamePhases/FinalLeaderboard';
import Timer from '../components/UI/Timer';
import PlayerStatus from '../components/UI/PlayerStatus';
import FeedbackModal from '../components/UI/FeedbackModal';
import Chat from '../components/Chat';

const Game: React.FC = () => {
  // --- WIRING INTACT ---
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
  const { chatMessages } = useGame();
  
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showJudgeCelebration, setShowJudgeCelebration] = useState(false);
  const [previousJudgeId, setPreviousJudgeId] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isPlayerStatusOpen, setIsPlayerStatusOpen] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [prevMessageCount, setPrevMessageCount] = useState(0);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  
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

  useEffect(() => {
  if (chatMessages.length > prevMessageCount) {
    if (!isChatOpen) {
      setUnreadCount(prev => prev + 1);
    }
    setPrevMessageCount(chatMessages.length);
  }
}, [chatMessages, isChatOpen, prevMessageCount]);

  useEffect(() => {
    if (isChatOpen) {
      setUnreadCount(0);
    }
  }, [isChatOpen]);

  const timerActive = timerDuration > 0 && gamePhase === 'memeSelection';

  const roundWinner = useMemo(() => {
    if (gamePhase !== 'results' || !gameState) return undefined;
    return [...gameState.players].sort((a, b) => b.score - a.score)[0];
  }, [gamePhase, gameState]);

  useEffect(() => {
  if (!gameState) return;

  if (gamePhase === "finalResults") {
    const played =
      Number(localStorage.getItem("memegame_games_played") || 0) + 1;

    localStorage.setItem("memegame_games_played", played.toString());

    const feedbackState = localStorage.getItem("memegame_feedback_state");

    const nextTrigger = Number(
      localStorage.getItem("memegame_feedback_next_trigger") || 1
    );

    if (
      played >= nextTrigger &&
      feedbackState !== "submitted" &&
      feedbackState !== "declined"
    ) {
      setShowFeedback(true);
    }
  }
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
  const handleLeaveGame = () => {
    leaveRoom();
    navigate('/dashboard');
  };
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
  
  const chatAllowed =
    gamePhase === "sentenceCreation" ||
    gamePhase === "memeReveal" ||
    gamePhase === "scoring"|| gamePhase === "results" || gamePhase === "finalResults";

  // --- Loading State (Tactile Bento) ---
  if (isRestoring || !gameState || !user) {
    return (
      <div className="min-h-screen bg-[#FFDDAB] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 border-2 border-[#131010] shadow-[8px_8px_0px_0px_#131010] text-center max-w-sm w-full">
          <div className="w-12 h-12 border-4 border-[#131010] border-t-[#5F8B4C] rounded-full animate-spin mx-auto mb-6"></div>
          <h3 className="text-2xl font-black text-[#131010] font-poppins mb-2">
            {isRestoring ? 'Reconnecting...' : 'Loading Game...'}
          </h3>
          <p className="text-[#131010]/60 font-medium font-poppins text-sm">Hold tight, setting up the board.</p>
        </div>
      </div>
    );
  }

  if (showJudgeCelebration && isJudge) {
    return <JudgeCelebration playerName={user.username || 'Judge'} onComplete={handleCelebrationComplete} />;
  }

  return (
    <div className="min-h-screen bg-[#FFDDAB] flex flex-col font-poppins selection:bg-[#D98324] selection:text-white overflow-x-hidden">
      
      {/* --- HEADER COMMAND BAR --- */}
      <div className="bg-white border-b-2 border-[#131010] sticky top-0 z-50 shadow-sm">
        <div className="px-4 py-3 sm:px-6">
          <div className="flex items-center justify-between gap-4">
            
            {/* Left: Info */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 min-w-0">
              <div className="flex items-center gap-2">
                <div className="bg-[#131010] text-white px-2.5 py-1 rounded-md font-courier font-bold text-xs uppercase tracking-widest shrink-0">
                  {gameState.roomId}
                </div>
                <div className="flex items-center gap-1.5 text-[#131010]/70 bg-[#131010]/5 px-2.5 py-1 rounded-md">
                  <Users className="w-3.5 h-3.5" strokeWidth={2.5} />
                  <span className="font-bold text-xs">{gameState.players.length}</span>
                </div>
              </div>
              
              {/* Desktop Phase Title */}
              <div className="hidden sm:flex items-center gap-2">
                <div className="w-2 h-2 bg-[#5F8B4C] rounded-full animate-pulse"></div>
                <span className="text-[#131010] font-bold text-sm truncate">{getPhaseTitle()}</span>
                {gameState.currentRound > 0 && (
                  <div className="flex items-center gap-1 text-[#D98324] bg-[#FFDDAB] px-2 py-0.5 rounded-md border border-[#131010]/10">
                    <Trophy className="w-3 h-3" strokeWidth={2.5} />
                    <span className="font-black text-xs">{gameState.currentRound}/{gameState.totalRounds}</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Right: Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="hidden sm:flex items-center gap-2">
                <button 
                  onClick={() => setSoundEnabled(!soundEnabled)} 
                  className="w-8 h-8 rounded-xl border-2 border-[#131010] bg-white flex items-center justify-center 
                  shadow-[3px_3px_0px_0px_#131010] 
                  hover:bg-[#FFDDAB] 
                  active:translate-y-[2px] active:shadow-none 
                  transition-all"
                >
                  {soundEnabled
                    ? <Volume2 className="w-4 h-4 text-[#131010]" strokeWidth={2.5} />
                    : <VolumeX className="w-4 h-4 text-[#131010]" strokeWidth={2.5} />
                  }
                </button>

                <button 
                  onClick={() => {
                    if (chatAllowed) {
                      setIsChatOpen(prev => !prev);
                    }
                  }} 
                  className={`relative w-8 h-8 rounded-xl border-2 border-[#131010] flex items-center justify-center 
                  shadow-[3px_3px_0px_0px_#131010] 
                  active:translate-y-[2px] active:shadow-none 
                  transition-all
                  ${isChatOpen ? 'bg-[#FFDDAB]' : 'bg-white hover:bg-[#FFDDAB]'}`}
                >
                  <MessageSquare className="w-4 h-4 text-[#131010]" strokeWidth={2.5} />

                  {unreadCount > 0 && !isChatOpen && (
                    <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-[4px] flex items-center justify-center text-[10px] font-bold text-white bg-red-500 rounded-full border border-[#131010]">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
               <button 
                  onClick={() => setShowLeaveConfirm(true)} 
                  className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg border-2 border-[#131010] shadow-[2px_2px_0px_0px_#131010] active:translate-y-[2px] active:shadow-none transition-all font-bold text-xs flex items-center gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" strokeWidth={2.5} />
                  Leave
                </button>
              </div>

              {/* Mobile Menu Toggle */}
              <button 
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
                className="sm:hidden w-10 h-10 rounded-lg border-2 border-[#131010] bg-white flex items-center justify-center text-[#131010] shadow-[2px_2px_0px_0px_#131010] active:translate-y-[2px] active:shadow-none transition-all"
              >
                {isMobileMenuOpen ? <X className="w-5 h-5" strokeWidth={2.5} /> : <Menu className="w-5 h-5" strokeWidth={2.5} />}
              </button>
            </div>
          </div>
          
          {/* Mobile Phase Title */}
          <div className="sm:hidden flex items-center justify-between mt-2 pt-2 border-t border-[#131010]/10">
             <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-[#5F8B4C] rounded-full animate-pulse"></div>
                <span className="text-[#131010] font-bold text-xs truncate">{getPhaseTitle()}</span>
              </div>
              {gameState.currentRound > 0 && (
                <div className="flex items-center gap-1 text-[#D98324]">
                  <Trophy className="w-3 h-3" strokeWidth={2.5} />
                  <span className="font-black text-xs">{gameState.currentRound}/{gameState.totalRounds}</span>
                </div>
              )}
          </div>
        </div>
      </div>

      {/* Global Timer Bar */}
      {timerActive && (
        <div className="bg-[#131010] border-b-2 border-[#131010]">
          <Timer duration={timerDuration} onComplete={() => {}} isActive={timerActive} label="Selection Time" />
        </div>
      )}

      {/* --- MAIN CONTENT AREA --- */}
      <div className="flex flex-col lg:flex-row flex-1 relative min-h-0">
        
        {/* Game Board */}
        <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <div className="max-w-4xl mx-auto space-y-6">
            
            {/* Context/Helper Text */}
            {getPhaseDescription() && (
              <div className="text-center">
                <span className="inline-block bg-white border-2 border-[#131010] shadow-[2px_2px_0px_0px_#131010] px-4 py-1.5 rounded-full font-bold text-xs text-[#131010]">
                  {getPhaseDescription()}
                </span>
              </div>
            )}

            {/* JUDGE VIEW: Writing the Sentence */}
            {gamePhase === 'sentenceCreation' && isJudge && (
              <SentenceInput onSubmit={handleSentenceSubmit} />
            )}
            
            {/* PLAYER VIEW: Waiting for Judge */}
            {gamePhase === 'sentenceCreation' && !isJudge && (
              <div className="bg-white rounded-2xl p-6 sm:p-10 border-4 border-[#131010] shadow-[8px_8px_0px_0px_#131010] text-center max-w-md mx-auto mt-4 sm:mt-10 transform transition-all hover:-translate-y-1">
                <div className="inline-flex items-center justify-center gap-1.5 bg-[#FFDDAB] px-3 py-1 rounded-md border-2 border-[#131010] font-black text-[10px] text-[#131010] uppercase tracking-widest mb-6">
                  <Gavel className="w-3 h-3" strokeWidth={3} /> Current Judge
                </div>
                
                <div className="relative w-24 h-24 sm:w-32 sm:h-32 mx-auto mb-6">
                  <img 
                    src={gameState.currentJudge?.avatar || 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=judge'} 
                    alt="Judge" 
                    className="w-full h-full rounded-2xl border-4 border-[#131010] shadow-[4px_4px_0px_0px_#131010] object-cover bg-[#FFDDAB]"
                  />
                  <div className="absolute -bottom-3 -right-3 bg-[#D98324] p-2 rounded-xl border-2 border-[#131010] shadow-[2px_2px_0px_0px_#131010]">
                    <Star className="w-5 h-5 text-[#131010]" strokeWidth={2.5} fill="currentColor" />
                  </div>
                </div>
                
                <h2 className="text-2xl sm:text-3xl font-black text-[#131010] mb-2 truncate">
                  {gameState.currentJudge?.username}
                </h2>
                
                <div className="flex items-center justify-center gap-3 mt-8 bg-[#131010]/5 py-3 px-4 rounded-xl border-2 border-[#131010] border-dashed">
                  <div className="w-4 h-4 border-2 border-t-[#5F8B4C] border-[#131010] rounded-full animate-spin"></div>
                  <p className="font-bold text-xs sm:text-sm text-[#131010]">Cooking up a prompt...</p>
                </div>
              </div>
            )}

            {/* Game Phase Components */}
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

        {/* --- SIDEBAR AREA (Player Status) --- */}
        <div className={`
          lg:w-80 lg:border-l-4 lg:border-[#131010] bg-white lg:bg-transparent
          ${isPlayerStatusOpen ? 'block absolute inset-0 z-40 bg-[#FFDDAB] overflow-y-auto' : 'hidden lg:block'}
        `}>
          {/* Mobile Sidebar Close Header */}
          {isPlayerStatusOpen && (
            <div className="lg:hidden flex items-center justify-between p-4 border-b-2 border-[#131010] bg-white sticky top-0 z-10">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-[#131010]" strokeWidth={2.5} />
                <span className="font-black text-[#131010]">The Squad ({gameState.players.length})</span>
              </div>
              <button 
                onClick={() => setIsPlayerStatusOpen(false)}
                className="w-8 h-8 rounded-lg border-2 border-[#131010] flex items-center justify-center bg-white shadow-[2px_2px_0px_0px_#131010] active:translate-y-[2px] active:shadow-none"
              >
                <X className="w-4 h-4 text-[#131010]" strokeWidth={2.5} />
              </button>
            </div>
          )}
          
          <div className="p-4 lg:p-6 lg:sticky lg:top-0">
            <div className="hidden lg:flex items-center gap-2 mb-4 px-2">
              <Users className="w-5 h-5 text-[#131010]" strokeWidth={2.5} />
              <h2 className="font-black text-lg text-[#131010]">The Squad</h2>
            </div>
            
            <div className="bg-white rounded-xl border-2 border-[#131010] shadow-[4px_4px_0px_0px_#131010] overflow-hidden">
              <PlayerStatus
                players={gameState.players}
                currentJudge={gameState.currentJudge}
                submissions={gameState.submissions}
                showSubmissionStatus={gamePhase === 'memeSelection'}
              />
            </div>
          </div>
        </div>
         {isChatOpen && chatAllowed && (
          <div className="hidden lg:flex lg:w-80 border-l-4 border-[#131010] bg-[#FFDDAB] p-4">
            <div className="w-full h-[calc(100vh-110px)]">
              <Chat />
            </div>
          </div>
        )}
      </div>

      {/* --- MOBILE ACTION DRAWER --- */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-[#131010]/80 backdrop-blur-sm flex flex-col justify-end">
          
          <div className="bg-white rounded-t-3xl border-t-4 border-[#131010] p-6 animate-fade-in-up">

            {/* Header */}
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-black text-xl text-[#131010]">Game Menu</h3>

              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 bg-[#131010]/5 rounded-full"
              >
                <X className="w-5 h-5" strokeWidth={2.5} />
              </button>
            </div>


            {/* Menu Items */}
            <div className="space-y-3">

              {/* Players */}
              <button
                onClick={() => {
                  setIsPlayerStatusOpen(true);
                  setIsMobileMenuOpen(false);
                }}
                className="w-full flex items-center justify-between p-4 bg-[#FFDDAB]/30 border-2 border-[#131010] rounded-xl font-bold text-[#131010]"
              >
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5" />
                  View Players
                </div>

                <span className="bg-[#131010] text-white px-2 py-0.5 rounded text-xs">
                  {gameState.players.length}
                </span>
              </button>


              {/* Leave Game */}
              <button
                onClick={handleLeaveGame}
                className="w-full flex items-center justify-center gap-2 p-4 mt-2 bg-red-500 text-white border-2 border-[#131010] shadow-[2px_2px_0px_0px_#131010] rounded-xl font-bold"
              >
                <LogOut className="w-5 h-5" />
                Leave Game
              </button>

            </div>
          </div>
        </div>
      )}
    {isChatOpen && chatAllowed && (
      <div className="lg:hidden fixed inset-0 z-50 bg-black/40 flex items-end">
        <div className="w-full h-[70vh] bg-[#FFDDAB] border-t-4 border-[#131010] rounded-t-2xl flex flex-col">

          <div className="flex items-center justify-between px-4 py-3 border-b-2 border-[#131010] bg-white">
            <span className="font-black text-[#131010]">Game Chat</span>

            <button
              onClick={() => setIsChatOpen(false)}
              className="px-3 py-1 bg-[#131010] text-white rounded-md text-xs font-bold"
            >
              Close
            </button>
          </div>

          <div className="flex-1 p-3 overflow-hidden min-h-0">
            <Chat />
          </div>

        </div>
      </div>
    )}

      <style>{`
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up { animation: fade-in-up 0.3s ease-out forwards; }
      `}</style>

      {showFeedback && (
        <FeedbackModal onClose={() => setShowFeedback(false)} />
      )}

      {chatAllowed && !isChatOpen && (
        <button
          onClick={() => setIsChatOpen(true)}
          className="lg:hidden fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full border-2 border-[#131010] bg-white shadow-[4px_4px_0px_0px_#131010] flex items-center justify-center"
        >
          <MessageSquare className="w-6 h-6 text-[#131010]" />

          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-[#131010]">
              {unreadCount}
            </span>
          )}
        </button>
      )}

      {showLeaveConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">

          <div className="bg-white border-4 border-[#131010] rounded-2xl shadow-[8px_8px_0px_0px_#131010] p-6 max-w-sm w-full text-center">

            <h3 className="text-xl font-black text-[#131010] mb-2">
              Leave Game?
            </h3>

            <p className="text-sm text-[#131010]/70 mb-6">
              Are you sure you want to leave the room?  
              You will return to the dashboard and the current round will continue without you.
            </p>

            <div className="flex gap-3 justify-center">

              <button
                onClick={() => setShowLeaveConfirm(false)}
                className="px-4 py-2 bg-white text-black border-2 border-[#131010] rounded-lg font-bold shadow-[3px_3px_0px_0px_#131010] active:translate-y-[2px] active:shadow-none"
              >
                Cancel
              </button>

              <button
                onClick={() => {
                  setShowLeaveConfirm(false);
                  handleLeaveGame();
                }}
                className="px-4 py-2 bg-red-500 text-white border-2 border-[#131010] rounded-lg font-bold shadow-[3px_3px_0px_0px_#131010] active:translate-y-[2px] active:shadow-none"
              >
                Leave
              </button>

            </div>

          </div>

        </div>
      )}

     {timerActive && (
        <div className="sm:hidden fixed bottom-20 right-4 z-40">

          <div className="relative w-16 h-16">

            {/* Background circle */}
            <svg className="absolute inset-0 w-full h-full rotate-[-90deg]" viewBox="0 0 100 100">

              {/* Track */}
              <circle
                cx="50"
                cy="50"
                r="44"
                stroke="#13101020"
                strokeWidth="8"
                fill="none"
              />

              {/* Progress */}
              <circle
                cx="50"
                cy="50"
                r="44"
                stroke={
                  timerDuration <= 10
                    ? "#EF4444"
                    : timerDuration <= 20
                    ? "#D98324"
                    : "#5F8B4C"
                }
                strokeWidth="8"
                strokeLinecap="round"
                fill="none"
                strokeDasharray={276}
                strokeDashoffset={
                  276 -
                  (timerDuration /
                    (gameState?.timerEndTime
                      ? Math.ceil((gameState.timerEndTime - Date.now()) / 1000) + timerDuration
                      : timerDuration)) *
                    276
                }
                className="transition-all duration-1000 ease-linear"
              />
            </svg>

            {/* Timer text */}
            <div
              className={`absolute inset-0 flex items-center justify-center text-xs font-black tabular-nums
              ${
                timerDuration <= 10
                  ? "text-red-500"
                  : timerDuration <= 20
                  ? "text-[#D98324]"
                  : "text-[#5F8B4C]"
              }`}
            >
              {Math.floor(timerDuration / 60)}:
              {(timerDuration % 60).toString().padStart(2, "0")}
            </div>

          </div>

        </div>
      )}
    </div>
    
  );
};

export default Game;