import React, { ReactNode, useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
// ⭐️ FIX 1: Removed unused 'GameState' import
import { useGame, Player } from '../context/GameContext';
import { useAuth } from '../context/AuthContext';
import ConnectionStatus from '../components/ConnectionStatus';
import memeLoadingImage from '../images/memeloading.webp';
import { toast } from 'react-hot-toast';
import { 
  Copy, 
  CheckCircle, 
  Users, 
  Crown, 
  Gavel, 
  Play, 
  Trash2, 
  LogOut, 
  Wifi,
  WifiOff,
  RefreshCw,
  MessageCircle,
  Send,
  AlertCircle
} from 'lucide-react';

// --- Modals (Untouched logic, styled to match bento aesthetic) ---
interface ModalProps {
  show: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string | ReactNode;
  message: string;
  confirmText: string;
  confirmColor?: string;
}

const Modal: React.FC<ModalProps> = ({ 
  show, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText, 
  confirmColor = 'red' 
}) => {
  if (!show) return null;
  
  const colorClasses = {
    red: 'bg-red-500',
    yellow: 'bg-[#D98324]',
    green: 'bg-[#5F8B4C]'
  };
  
  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-[#131010]/80 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      >
        <motion.div 
          initial={{ scale: 0.95, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 10 }}
          className="bg-white rounded-xl max-w-md w-full p-6 sm:p-8 border-2 border-[#131010] shadow-[8px_8px_0px_0px_#131010]"
        >
          <div className="text-center mb-6">
            <h3 className="font-poppins text-2xl font-black mb-2 text-[#131010]">{title}</h3>
            <p className="font-poppins font-medium text-sm text-[#131010]/70">{message}</p>
          </div>
          <div className="flex gap-3 justify-center">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-white border-2 border-[#131010] text-[#131010] shadow-[3px_3px_0px_0px_#131010] hover:shadow-[4px_4px_0px_0px_#131010] active:translate-y-[2px] active:shadow-none rounded-lg font-poppins font-bold transition-all"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className={`flex-1 px-4 py-3 ${colorClasses[confirmColor as keyof typeof colorClasses]} border-2 border-[#131010] text-white shadow-[3px_3px_0px_0px_#131010] hover:shadow-[4px_4px_0px_0px_#131010] active:translate-y-[2px] active:shadow-none rounded-lg font-poppins font-bold transition-all`}
            >
              {confirmText}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

const PLAYER_CHAT_COLORS = [
  "bg-[#E3F2FD]", // blue
  "bg-[#E8F5E9]", // green
  "bg-[#F3E5F5]", // purple
  "bg-[#FFF3E0]", // orange
  "bg-[#FCE4EC]", // pink
  "bg-[#E0F7FA]", // cyan
  "bg-[#F9FBE7]", // lime
  "bg-[#ECEFF1]"  // gray
];

function getPlayerColor(id?: string) {
  if (!id) return PLAYER_CHAT_COLORS[0];
  let hash = 0;

  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }

  const index = Math.abs(hash) % PLAYER_CHAT_COLORS.length;
  return PLAYER_CHAT_COLORS[index];
}
// --- Main RoomLobby ---
const RoomLobby: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const {
    gameState,
    joinRoom,
    isHost,
    discardRoom,
    leaveRoom,
    connectionState,
    isConnected,
    chatMessages,
    sendChatMessage,
    startGame 
  } = useGame();
  const { user } = useAuth();
  
  // Modal states
  const [showDiscardModal, setShowDiscardModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showStartGameModal, setShowStartGameModal] = useState(false);
  const [copiedRoomId, setCopiedRoomId] = useState(false);
  const [joinAttempted, setJoinAttempted] = useState(false);
  
  // Chat states
  const [currentMessage, setCurrentMessage] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);
  
  // Auto-scroll to latest message
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  // Focus input when component mounts
  useEffect(() => {
    if (chatInputRef.current) {
      chatInputRef.current.focus();
    }
  }, []);
  
  const fallbackCopy = (text: string) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand("copy");
    } catch (err) {
      console.error("Fallback: Copy failed", err);
    }
    document.body.removeChild(textArea);
  };

  const copyRoomIdToClipboard = () => {
    if (gameState?.roomId) {
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(gameState.roomId).then(() => {
          setCopiedRoomId(true);
          setTimeout(() => setCopiedRoomId(false), 2000);
        }).catch(() => {
          fallbackCopy(gameState.roomId);
          setCopiedRoomId(true);
          setTimeout(() => setCopiedRoomId(false), 2000);
        });
      } else {
        fallbackCopy(gameState.roomId);
        setCopiedRoomId(true);
        setTimeout(() => setCopiedRoomId(false), 2000);
      }
    }
  };

  const copyInviteLink = () => {
    if (gameState?.roomId) {
      const inviteUrl = `${window.location.origin}/join/${gameState.roomId}`;
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(inviteUrl).then(() => {
          toast.success('Invite link copied!');
        }).catch(() => {
          fallbackCopy(inviteUrl);
          toast.success('Invite link copied!');
        });
      } else {
        fallbackCopy(inviteUrl);
        toast.success('Invite link copied!');
      }
    }
  };

  const handleSendMessage = () => {
    if (currentMessage.trim() && user) {
      sendChatMessage(currentMessage);
      setCurrentMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Initial Join
  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (roomId && user && connectionState === 'connected' && !gameState && !joinAttempted && !showDiscardModal) {
      setJoinAttempted(true);
      console.log('[ROOM_LOBBY] Attempting initial join for room:', roomId);
      joinRoom(roomId).catch((error) => {
        console.error('Failed to join room:', error);

        if (error?.message?.toLowerCase().includes("room")) {
          navigate('/dashboard');
          return;
        }
        toast.error(`Failed to join room: ${error.message}`);
        navigate('/join');
      });
    }
  }, [roomId, user, connectionState, gameState, joinRoom, navigate, joinAttempted, showDiscardModal]);
  
  // Phase Watcher
  useEffect(() => {
    if (gameState?.gamePhase && gameState.gamePhase !== 'lobby') {
      console.log(`[ROOM_LOBBY] Game phase changed to '${gameState.gamePhase}', navigating to game...`);
      navigate(`/game/${gameState.roomId}`);
    }
  }, [gameState?.gamePhase, gameState?.roomId, navigate]);

  // --- Loading Screen ---
  if (!isConnected || !gameState) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFDDAB] p-4 text-center">
        <ConnectionStatus />
        <div className="bg-white rounded-2xl p-8 sm:p-12 border-2 border-[#131010] shadow-[8px_8px_0px_0px_#131010] max-w-md w-full">
          <motion.img
            animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            src={memeLoadingImage}
            alt="Loading Meme"
            className="w-24 h-24 mx-auto mb-6 drop-shadow-md"
          />
          <h2 className="font-poppins text-[#131010] text-2xl font-black mb-2">
            {connectionState === 'connecting' && 'Connecting to Party...'}
            {connectionState === 'reconnecting' && 'Hold Tight, Reconnecting...'}
            {connectionState === 'connected' && 'Joining Party Room...'}
            {connectionState === 'disconnected' && 'Connection to Party Lost'}
            {connectionState === 'error' && 'Party Router Stumbled'}
          </h2>
          <p className="font-poppins text-sm font-medium text-[#131010]/60 mb-6">
            {connectionState === 'connecting' && 'Warming up the meme deck...'}
            {connectionState === 'reconnecting' && 'Restoring your chaos session...'}
            {connectionState === 'connected' && 'Entering squad room...'}
            {connectionState === 'disconnected' && 'Checking wifi signal...'}
            {connectionState === 'error' && 'Try again in a second'}
          </p>

          {(connectionState === 'disconnected' || connectionState === 'error') && (
            <button
              onClick={() => window.location.reload()}
              className="w-full flex items-center justify-center gap-2 bg-[#5F8B4C] text-white px-6 py-3.5 rounded-lg border-2 border-[#131010] shadow-[3px_3px_0px_0px_#131010] hover:shadow-[4px_4px_0px_0px_#131010] active:translate-y-[2px] active:shadow-none font-poppins font-bold transition-all"
            >
              <RefreshCw className="w-5 h-5" strokeWidth={2.5} />
              Retry Connection
            </button>
          )}
        </div>
      </div>
    );
  }
  
  const players = gameState.players || [];
  const allReady = players.every((p: Player) => p.isReady);
  const hostId = gameState.host.id;

  return (
    <div className="min-h-screen bg-[#FFDDAB] p-4 sm:p-6 lg:p-8 flex flex-col pb-28 sm:pb-8">
      <ConnectionStatus />
      
      <div className="max-w-6xl mx-auto w-full flex-1 flex flex-col">
        
        {/* Header / Room Code Panel */}
        <div className="mb-6 sm:mb-8 text-center animate-fade-in">
          <div 
            className="inline-block relative group cursor-pointer" 
            onClick={copyRoomIdToClipboard}
            role="button"
            tabIndex={0}
            aria-label="Copy Room ID to clipboard"
          >
            <div className="absolute -inset-1 bg-[#131010] rounded-xl sm:rounded-2xl blur-sm opacity-20 group-hover:opacity-30 transition duration-200"></div>
            <div className="relative bg-white border-2 border-[#131010] shadow-[4px_4px_0px_0px_#131010] hover:shadow-[6px_6px_0px_0px_#131010] active:translate-y-[2px] active:shadow-none transition-all rounded-xl sm:rounded-2xl px-6 py-4 sm:px-10 sm:py-5 flex flex-col items-center">
              <span className="font-poppins font-bold text-xs sm:text-sm text-[#131010]/50 uppercase tracking-widest mb-1">
                Party Code (Share With Squad)
              </span>
              <div className="flex items-center gap-4">
                <span className="font-courier text-[#D98324] text-4xl sm:text-5xl font-black tracking-widest">
                  {gameState.roomId}
                </span>
                <div className="p-2 bg-[#FFDDAB] border-2 border-[#131010] rounded-lg">
                  {copiedRoomId ? (
                    <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-[#5F8B4C]" strokeWidth={3} />
                  ) : (
                    <Copy className="w-5 h-5 sm:w-6 sm:h-6 text-[#131010]" strokeWidth={2.5} />
                  )}
                </div>
              </div>
              <div className="mt-4 flex items-center justify-center gap-2 bg-[#FFDDAB]/30 px-3 py-1 rounded-md border border-[#131010]/10">
                {isConnected ? (
                  <>
                    <Wifi className="w-3 h-3 text-[#5F8B4C]" strokeWidth={3} />
                    <span className="text-[10px] font-bold text-[#5F8B4C] uppercase tracking-wider">Connected</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3 h-3 text-red-600" strokeWidth={3} />
                    <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider">Lost Signal</span>
                  </>
                )}
              </div>
              <div className="mt-3 flex items-center justify-center">
                <button
                  onClick={copyInviteLink}
                  className="inline-flex items-center gap-1.5 bg-[#D98324] text-[#131010] px-4 py-1.5 rounded-lg text-xs font-poppins font-bold border border-[#131010] shadow-[2px_2px_0px_0px_#131010] hover:shadow-[3px_3px_0px_0px_#131010] active:translate-y-[1px] active:shadow-none transition-all"
                >
                  <Copy className="w-3 h-3" strokeWidth={3} />
                  Copy Invite Link
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Grid: Squad vs Chat */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-8 flex-1 animate-fade-in-up">
          
          {/* LEFT: Squad List (8 Cols) */}
          <div className="lg:col-span-7 xl:col-span-8 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users size={20} className="text-[#131010]" strokeWidth={2.5} />
                <h2 className="font-poppins font-black text-xl text-[#131010]">The Squad</h2>
              </div>
              <span className="font-poppins font-bold text-xs sm:text-sm text-[#131010]/70 bg-white border border-[#131010] px-3 py-1 rounded-lg shadow-[2px_2px_0px_0px_#131010]">
                {players.length} / 10 Max • 8 Recommended
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 auto-rows-max">
              {players.filter(p => p.isConnected !== false).map((player, index) => {
                const isRoomHost = player.id === hostId;
                const isCurrentUser = player.id === user?.id;
                
                return (
                  <motion.div
                    key={player.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: index * 0.05 }}
                    className={`
                      relative bg-white rounded-xl p-4 border-2 transition-all flex items-center gap-4
                      ${isCurrentUser ? 'border-[#5F8B4C] shadow-[4px_4px_0px_0px_#5F8B4C]' : 'border-[#131010] shadow-[3px_3px_0px_0px_#131010]'}
                    `}
                  >
                    {/* Role Badges */}
                    <div className="absolute -top-3 -right-2 flex gap-1">
                      {player.isJudge && (
                        <div className="bg-[#D98324] text-[#131010] px-2 py-1 rounded-md text-[10px] font-poppins font-black flex items-center gap-1 border-2 border-[#131010] shadow-[1px_1px_0px_0px_#131010]">
                          <Gavel className="w-3 h-3" strokeWidth={3} /> Judge
                        </div>
                      )}
                      {isRoomHost && !player.isJudge && (
                        <div className="bg-[#FFDDAB] text-[#131010] px-2 py-1 rounded-md text-[10px] font-poppins font-black flex items-center gap-1 border-2 border-[#131010] shadow-[1px_1px_0px_0px_#131010]">
                          <Crown className="w-3 h-3" strokeWidth={3} /> Host
                        </div>
                      )}
                    </div>

                    {/* Avatar */}
                    {player.avatar ? (
                      <img
                        src={player.avatar}
                        alt={player.username}
                        className="w-12 h-12 rounded-lg object-cover border-2 border-[#131010]"
                        draggable={false}
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-[#131010] flex items-center justify-center font-poppins font-black text-white text-xl border-2 border-[#131010]">
                        {player.username.charAt(0).toUpperCase()}
                      </div>
                    )}
                    
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-poppins text-[#131010] text-base font-bold truncate">
                        {player.username} {isCurrentUser && <span className="text-[#131010]/40 text-xs font-medium">(You)</span>}
                      </h3>
                      {player.isReady ? (
                         <span className="inline-block mt-1 font-poppins font-bold text-[10px] text-[#5F8B4C] bg-[#5F8B4C]/10 px-2 py-0.5 rounded border border-[#5F8B4C]/20 uppercase">Ready</span>
                      ) : (
                        <span className="inline-block mt-1 font-poppins font-bold text-[10px] text-[#D98324] bg-[#D98324]/10 px-2 py-0.5 rounded border border-[#D98324]/20 uppercase">Selecting Memes...</span>
                      )}
                    </div>
                  </motion.div>
                );
              })}
              
              {/* Empty Slots */}
              {Array.from({ length: Math.max(0, 4 - players.length) }).map((_, i) => (
                <div key={`empty-${i}`} className="bg-[#131010]/5 rounded-xl p-4 border-2 border-dashed border-[#131010]/20 flex items-center justify-center min-h-[88px]">
                  <p className="font-poppins font-medium text-sm text-[#131010]/40">Waiting for player...</p>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT: Live Chat (5 Cols) */}
          <div className="lg:col-span-5 xl:col-span-4 flex flex-col h-[400px] lg:h-[500px]">
            <div className="bg-white rounded-xl border-2 border-[#131010] shadow-[4px_4px_0px_0px_#131010] overflow-hidden flex flex-col h-full">
              
              {/* Chat Header */}
              <div className="bg-[#131010] text-white p-3 sm:p-4 border-b-2 border-[#131010] flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-[#FFDDAB]" strokeWidth={2.5} />
                  <h3 className="font-poppins font-bold text-base">Lobby Chat</h3>
                </div>
              </div>
              
              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#FFDDAB]/10 custom-scroll scroll-smooth">
                {chatMessages.length === 0 && (
                  <div className="h-full flex items-center justify-center text-center">
                    <p className="font-poppins text-[#131010]/40 text-sm font-medium">Say what's up to the lobby. Keep it somewhat clean.</p>
                  </div>
                )}
                {/* Typed msg to remove ESLint 'any' error */}
                {chatMessages.map((msg: { id: string; userId?: string; playerId?: string; username?: string; sender?: string; senderId?: string; message: string }) => {
                  const isMe = msg.userId === user?.id || msg.playerId === user?.id || msg.senderId === user?.id;
                  const senderName = msg.username || msg.sender || 'Unknown';
                  const playerId = msg.userId || msg.playerId || msg.senderId || senderName || 'default';
                  const playerColor = getPlayerColor(playerId);
                  
                  return (
                    <motion.div 
                      key={msg.id}
                      initial={{ opacity: 0, scale: 0.95, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                    >
                      <span className="text-[10px] font-bold font-courier text-[#131010]/40 px-1 mb-1 uppercase tracking-wider">
                        {isMe ? 'You' : senderName}
                      </span>
                     <div 
                     className={`px-3 py-2 rounded-xl max-w-[85%] text-sm font-poppins font-medium border-2 shadow-[2px_2px_0px_0px_#131010] ${
                        isMe 
                          ? 'bg-[#FFDDAB] text-[#131010] border-[#131010] rounded-tr-none' 
                          : `${playerColor} text-[#131010] border-[#131010] rounded-tl-none`
                      }`}
                      >
                        {msg.message}
                      </div>
                    </motion.div>
                  );
                })}
                <div ref={chatEndRef} />
              </div>
              
              {/* Chat Input */}
              <div className="p-3 bg-white border-t-2 border-[#131010] shrink-0">
                <div className="flex gap-2">
                  <input
                    ref={chatInputRef}
                    type="text"
                    value={currentMessage}
                    onChange={(e) => setCurrentMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type a message..."
                    disabled={!isConnected}
                    className="flex-1 px-3 py-2 bg-[#FFDDAB]/20 border-2 border-[#131010] text-[#131010] rounded-lg focus:outline-none focus:bg-white font-poppins text-base sm:text-sm font-medium transition-colors disabled:opacity-50"
                    maxLength={200}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!currentMessage.trim() || !isConnected}
                    className="bg-[#5F8B4C] text-[#131010] border-2 border-[#131010] shadow-[2px_2px_0px_0px_#131010] hover:shadow-[3px_3px_0px_0px_#131010] active:translate-y-[2px] active:shadow-none disabled:bg-gray-200 disabled:border-gray-400 disabled:shadow-none disabled:cursor-not-allowed p-2 px-3 rounded-lg transition-all flex items-center justify-center shrink-0"
                  >
                    <Send className="w-4 h-4 text-white" strokeWidth={2.5} />
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Host Explanation Notice for < 3 players */}
        {isHost && players.length < 3 && (
          <div className="mt-6 bg-[#FFDDAB] rounded-xl p-4 border-2 border-[#131010] shadow-[3px_3px_0px_0px_#131010] flex items-start gap-3 animate-fade-in text-left">
            <AlertCircle className="w-5 h-5 text-[#D98324] shrink-0 mt-0.5" strokeWidth={2.5} />
            <div>
              <p className="font-poppins font-black text-sm text-[#131010]">
                Why 3+ players required?
              </p>
              <p className="font-poppins font-medium text-xs text-[#131010]/80 mt-0.5">
                Standard competitive multiplayer requires at least 3 players to ensure fair and meaningful community voting without forced 1v1 mutual votes.
              </p>
            </div>
          </div>
        )}

        {/* Action Buttons Pinned to Bottom */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-[#FFDDAB] sm:bg-transparent border-t-2 border-[#131010] z-30 shadow-[0_-4px_12px_rgba(0,0,0,0.15)] sm:static sm:p-0 sm:border-t-0 sm:shadow-none sm:mt-8 sm:pt-6 sm:border-t-2 sm:border-[#131010]/10 flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-4 animate-fade-in">
          {isHost ? (
            <>
              <button
                onClick={() => setShowDiscardModal(true)}
                disabled={!isConnected}
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white text-red-600 border-2 border-red-600 px-6 py-3 rounded-lg font-poppins font-bold shadow-[3px_3px_0px_0px_#dc2626] hover:shadow-[4px_4px_0px_0px_#dc2626] active:translate-y-[2px] active:shadow-none transition-all disabled:opacity-50"
              >
                <Trash2 className="w-5 h-5" strokeWidth={2.5} />
                Discard Room
              </button>

              <button
                disabled={!allReady || players.length < 3 || !isConnected}
                onClick={() => setShowStartGameModal(true)}
                className={`
                  w-full sm:w-auto flex items-center justify-center gap-2 px-10 py-3 rounded-lg border-2 font-poppins font-bold transition-all
                  ${(!allReady || players.length < 3 || !isConnected) 
                    ? 'bg-gray-200 border-gray-400 text-gray-500 cursor-not-allowed' 
                    : 'bg-[#5F8B4C] border-[#131010] text-white shadow-[4px_4px_0px_0px_#131010] hover:shadow-[6px_6px_0px_0px_#131010] active:translate-y-[2px] active:shadow-none'
                  }
                `}
              >
                <Play className="w-5 h-5 fill-current" strokeWidth={2.5} />
                {!isConnected
                  ? 'Connecting to party...'
                  : !allReady
                  ? 'Waiting for squad to ready up...'
                  : players.length < 3
                  ? 'Need 3+ Players to Party'
                  : 'Start Party 🚀'}
              </button>
            </>
          ) : (
            <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-4">
              <button
                onClick={() => setShowLeaveModal(true)}
                disabled={!isConnected}
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white text-[#131010] border-2 border-[#131010] px-6 py-3 rounded-lg font-poppins font-bold shadow-[3px_3px_0px_0px_#131010] active:translate-y-[2px] active:shadow-none transition-all disabled:opacity-50"
              >
                <LogOut className="w-5 h-5" strokeWidth={2.5} />
                Leave Room
              </button>
              
              <div className="flex items-center gap-3 bg-white border-2 border-[#131010] px-6 py-3 rounded-lg shadow-[3px_3px_0px_0px_#131010]">
                <span className="font-poppins font-bold text-sm text-[#131010]">Waiting for host to kick off the party...</span>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* ⭐️ RESTORED MODALS ⭐️ */}
      <Modal
        show={showDiscardModal}
        onClose={() => setShowDiscardModal(false)}
        onConfirm={() => {
          discardRoom();
          setShowDiscardModal(false);
           navigate('/dashboard', { replace: true });
        }}
        title="Discard Room"
        message="Are you sure you want to discard this room? All players will be kicked."
        confirmText="Yes, Discard Room"
        confirmColor="red"
      />

      <Modal
        show={showLeaveModal}
        onClose={() => setShowLeaveModal(false)}
        onConfirm={() => {
          leaveRoom();
          setShowLeaveModal(false);
          navigate('/dashboard');
        }}
        title="Leave Room"
        message="Are you sure you want to leave this room?"
        confirmText="Yes, Leave Room"
        confirmColor="yellow"
      />
      
      <Modal
        show={showStartGameModal}
        onClose={() => setShowStartGameModal(false)}
        onConfirm={() => {
          startGame(); 
          setShowStartGameModal(false);
        }}
        title="Start Game"
        message="Ready to start the game? Make sure everyone's ready!"
        confirmText="Let's Go!"
        confirmColor="green"
      />

    </div>
  );
};

export default RoomLobby;