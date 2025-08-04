import React, { ReactNode, useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame, Player, GameState } from '../context/GameContext';
import { useAuth } from '../context/AuthContext';
import ConnectionStatus from '../components/ConnectionStatus';
import memeLoadingImage from '../images/memeloading.png';
import { 
  Copy, 
  CheckCircle, 
  Users, 
  Crown, 
  Gavel, 
  Clock, 
  Play, 
  Trash2, 
  LogOut, 
  AlertTriangle,
  Wifi,
  WifiOff,
  RefreshCw,
  MessageCircle,
  Send
} from 'lucide-react';

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
    red: 'bg-red-500 hover:bg-red-600',
    yellow: 'bg-[#D98324] hover:bg-[#C07620]',
    green: 'bg-[#5F8B4C] hover:bg-[#4A7039]'
  };
  
  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50"
      >
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-2xl max-w-md w-full p-8 shadow-2xl border border-gray-100"
        >
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-[#FFDDAB] rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-[#D98324]" />
            </div>
            <h3 className="font-poppins text-2xl font-bold mb-2 text-[#5F8B4C]">{title}</h3>
            <p className="font-courier text-[#131010] opacity-70">{message}</p>
          </div>
          <div className="flex gap-3 justify-center">
            <motion.button
              whileHover={{ y: -2 }}
              whileTap={{ y: 0 }}
              onClick={onClose}
              className="px-6 py-3 bg-white border-2 border-[#5F8B4C] text-[#5F8B4C] hover:bg-[#5F8B4C] hover:text-white rounded-xl font-poppins font-medium transition-all duration-200"
            >
              Cancel
            </motion.button>
            <motion.button
              whileHover={{ y: -2 }}
              whileTap={{ y: 0 }}
              onClick={onConfirm}
              className={`px-6 py-3 ${colorClasses[confirmColor as keyof typeof colorClasses]} text-white rounded-xl font-poppins font-medium transition-all duration-200 shadow-lg`}
            >
              {confirmText}
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

const RoomLobby: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const {
    gameState,
    joinRoom,
    isHost,
    discardRoom,
    leaveRoom,
    socket,
    connectionState,
    isConnected,
    chatMessages,
    sendChatMessage
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
        }).catch((err) => {
          console.error("Clipboard error:", err);
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

  const formatMessageTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false
    });
  };
  
  // Join room effect
  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (!roomId || joinAttempted) return;

    // Wait for connection before attempting to join
    if (connectionState === 'connected' && !gameState) {
      setJoinAttempted(true);
      joinRoom(roomId).catch((error) => {
        console.error('Failed to join room:', error);
        alert('Failed to join room. Redirecting to join page.');
        navigate('/join');
      });
    }
  }, [roomId, user, connectionState, gameState, joinRoom, navigate, joinAttempted]);

  // Check if user is already in the room (for host who just created the room)
  useEffect(() => {
    if (!user || !gameState || !roomId) return;

    const currentPlayer = gameState.players.find(p => p.id === user.id);
    if (!currentPlayer) {
      console.log('[ROOM_LOBBY] User not in room, attempting to join');
      if (!joinAttempted) {
        setJoinAttempted(true);
        joinRoom(roomId).catch((error) => {
          console.error('Failed to join room:', error);
          alert('Failed to join room. Redirecting to join page.');
          navigate('/join');
        });
      }
    } else {
      console.log('[ROOM_LOBBY] User already in room:', currentPlayer.username);
    }
  }, [user, gameState, roomId, joinRoom, navigate, joinAttempted]);

  // Handle game started navigation
  useEffect(() => {
    if (!socket) return;

    const handleGameStarted = (roomData: GameState) => {
      console.log('[ROOM_LOBBY] Game started, navigating to game page');
      navigate(`/game/${roomData.roomId}`);
    };

    socket.on('gameStarted', handleGameStarted);

    return () => {
      socket.off('gameStarted', handleGameStarted);
    };
  }, [socket, navigate]);

  // Show loading state while connecting or loading game state
  if (!isConnected || !gameState) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFDDAB]">
        <ConnectionStatus />
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center bg-white rounded-2xl p-12 shadow-xl border border-gray-100 max-w-md"
        >
          <motion.img
            animate={{ 
              rotate: [0, 10, -10, 0],
              scale: [1, 1.1, 1]
            }}
            transition={{ 
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            src={memeLoadingImage}
            alt="Loading Meme"
            className="w-24 h-24 mx-auto mb-6"
          />
          
          <h2 className="font-poppins text-[#5F8B4C] text-2xl font-bold mb-2">
            {connectionState === 'connecting' && 'Connecting...'}
            {connectionState === 'reconnecting' && 'Reconnecting...'}
            {connectionState === 'connected' && 'Loading Game Room'}
            {connectionState === 'disconnected' && 'Connection Lost'}
            {connectionState === 'error' && 'Connection Error'}
          </h2>
          
          <p className="font-courier text-[#131010] opacity-70 mb-4">
            {connectionState === 'connecting' && 'Establishing connection to game server...'}
            {connectionState === 'reconnecting' && 'Attempting to restore your session...'}
            {connectionState === 'connected' && 'Preparing your gaming experience...'}
            {connectionState === 'disconnected' && 'Please check your internet connection'}
            {connectionState === 'error' && 'Unable to connect to game server'}
          </p>

          {(connectionState === 'disconnected' || connectionState === 'error') && (
            <motion.button
              whileHover={{ y: -2 }}
              whileTap={{ y: 0 }}
              onClick={() => window.location.reload()}
              className="flex items-center gap-2 bg-[#5F8B4C] hover:bg-[#4A7039] text-white px-6 py-3 rounded-xl font-poppins font-medium transition-all duration-200 mx-auto"
            >
              <RefreshCw className="w-4 h-4" />
              Retry Connection
            </motion.button>
          )}
        </motion.div>
      </div>
    );
  }
  
  const players = gameState.players || [];
  const allReady = players.every((p: Player) => p.isReady);
  const hostId = players[0]?.id;

  return (
    <div className="min-h-screen bg-[#FFDDAB] p-4 md:p-8">
      <ConnectionStatus />
      
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="max-w-6xl mx-auto"
      >
        {/* Header Section */}
        <motion.div 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
            <motion.h1 
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="font-poppins text-[#5F8B4C] text-4xl md:text-5xl font-bold mb-6"
            >
              🎮 Game Room Lobby
            </motion.h1>
            
            <motion.div 
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="bg-[#FFDDAB] rounded-xl px-6 py-4 inline-block hover:bg-[#F5D299] transition-all cursor-pointer shadow-md"
              onClick={copyRoomIdToClipboard}
              title="Click to copy room ID"
            >
              <div className="flex items-center gap-3">
                <span className="font-monaco text-[#D98324] text-xl font-bold">#{gameState.roomId}</span>
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  {copiedRoomId ? (
                    <CheckCircle className="w-5 h-5 text-[#5F8B4C]" />
                  ) : (
                    <Copy className="w-5 h-5 text-[#131010] opacity-70" />
                  )}
                </motion.div>
              </div>
            </motion.div>
            
            <motion.p 
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="mt-4 font-courier text-[#131010] opacity-70"
            >
              {players.length < 2 ? "Waiting for more players to join..." : "Ready to start the game!"}
            </motion.p>

            {/* Connection indicator */}
            <motion.div 
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="mt-4 flex items-center justify-center gap-2"
            >
              {isConnected ? (
                <>
                  <Wifi className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-green-600 font-medium">Connected</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-4 h-4 text-red-600" />
                  <span className="text-sm text-red-600 font-medium">Disconnected</span>
                </>
              )}
            </motion.div>
          </div>
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Players Section */}
          <div className="lg:col-span-2">
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
            >
              {players.map((player, index) => {
                const isRoomHost = player.id === hostId;
                const isCurrentUser = player.id === user?.id;
                
                return (
                  <motion.div
                    key={player.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    whileHover={{ y: -5 }}
                    className={`
                      relative overflow-hidden
                      bg-white rounded-2xl p-6 shadow-xl border-2 transition-all duration-300
                      ${player.isJudge ? 'border-[#D98324]' : isRoomHost ? 'border-[#5F8B4C]' : 'border-gray-200'}
                      ${isCurrentUser ? 'ring-2 ring-blue-300 ring-opacity-50' : ''}
                    `}
                  >
                    {/* Status Badge */}
                    <div className="absolute top-4 right-4">
                      {player.isJudge && (
                        <div className="bg-[#D98324] text-white px-3 py-1 rounded-full text-xs font-poppins font-medium flex items-center gap-1">
                          <Gavel className="w-3 h-3" />
                          Judge
                        </div>
                      )}
                      {isRoomHost && !player.isJudge && (
                        <div className="bg-[#5F8B4C] text-white px-3 py-1 rounded-full text-xs font-poppins font-medium flex items-center gap-1">
                          <Crown className="w-3 h-3" />
                          Host
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-4">
                      {player.avatar ? (
                        <img
                          src={player.avatar}
                          alt={player.username}
                          className="w-16 h-16 rounded-full object-cover ring-4 ring-[#FFDDAB] shadow-lg"
                          draggable={false}
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#D98324] to-[#C07620] flex items-center justify-center font-poppins font-bold text-white text-2xl shadow-lg">
                          {player.username.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1">
                        <h3 className="font-poppins text-[#5F8B4C] text-xl font-bold truncate">
                          {player.username}
                          {isCurrentUser && ' (You)'}
                        </h3>
                        <div className="flex items-center gap-2 mt-2">
                          <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-courier font-medium ${
                            player.isReady 
                              ? 'bg-[#5F8B4C]/20 text-[#5F8B4C]' 
                              : 'bg-red-100 text-red-600'
                          }`}>
                            {player.isReady ? (
                              <>
                                <CheckCircle className="w-3 h-3" />
                                Ready
                              </>
                            ) : (
                              <>
                                <Clock className="w-3 h-3" />
                                Not Ready
                              </>
                            )}
                          </div>
                          
                          {/* Connection status for player */}
                          {player.isConnected !== undefined && (
                            <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                              player.isConnected 
                                ? 'bg-green-100 text-green-600' 
                                : 'bg-gray-100 text-gray-600'
                            }`}>
                              {player.isConnected ? (
                                <Wifi className="w-3 h-3" />
                              ) : (
                                <WifiOff className="w-3 h-3" />
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>

          {/* Chat Section */}
          <div className="lg:col-span-1">
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden h-full min-h-[400px] flex flex-col"
            >
              {/* Chat Header */}
              <div className="bg-[#5F8B4C] text-white p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-5 h-5" />
                  <h3 className="font-poppins font-bold text-lg">Room Chat</h3>
                </div>
                <div className="text-sm opacity-90">
                  {chatMessages.length} messages
                </div>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-80 custom-scroll">
                {chatMessages.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 font-courier">No messages yet</p>
                    <p className="text-sm text-gray-400 font-courier">Be the first to say hello!</p>
                  </div>
                ) : (
                  <>
                    {chatMessages.map((msg, index) => {
                      const isOwnMessage = msg.userId === user?.id;
                      return (
                        <motion.div
                          key={`${msg.id}-${index}`}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2 }}
                          className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                        >
                          <div 
                            className={`max-w-xs px-3 py-2 rounded-lg ${
                              isOwnMessage 
                                ? 'bg-[#5F8B4C] text-white' 
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {!isOwnMessage && (
                              <div className="text-xs font-poppins font-medium mb-1 opacity-70">
                                {msg.username}
                              </div>
                            )}
                            <div className="font-courier text-sm break-words">
                              {msg.message}
                            </div>
                            <div className={`text-xs mt-1 ${
                              isOwnMessage ? 'text-white/70' : 'text-gray-500'
                            }`}>
                              {formatMessageTime(msg.timestamp)}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                    <div ref={chatEndRef} />
                  </>
                )}
              </div>

              {/* Chat Input */}
              <div className="p-4 border-t border-gray-100">
                <div className="flex gap-2">
                 <input
                    ref={chatInputRef}
                    type="text"
                    value={currentMessage}
                    onChange={(e) => setCurrentMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type a message..."
                    disabled={!isConnected}
                    className="flex-1 px-3 py-2 border border-gray-300 text-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5F8B4C] focus:border-transparent font-courier text-base disabled:opacity-50 disabled:cursor-not-allowed"
                    maxLength={200}
                  />

                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleSendMessage}
                    disabled={!currentMessage.trim() || !isConnected}
                    className="bg-[#5F8B4C] hover:bg-[#4A7039] disabled:bg-gray-300 disabled:cursor-not-allowed text-white p-2 rounded-lg transition-all duration-200"
                  >
                    <Send className="w-4 h-4" />
                  </motion.button>
                </div>
                {currentMessage.length > 180 && (
                  <div className="text-xs text-gray-500 mt-1">
                    {200 - currentMessage.length} characters remaining
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </div>

        {/* Action Buttons */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100"
        >
          {isHost ? (
            <div className="flex flex-col sm:flex-row gap-4 max-w-2xl mx-auto">
              <motion.button
                whileHover={{ y: -2 }}
                whileTap={{ y: 0 }}
                disabled={!allReady || players.length < 2 || !isConnected}
                onClick={() => setShowStartGameModal(true)}
                className={`
                  flex-1 flex items-center justify-center gap-3
                  ${(!allReady || players.length < 2 || !isConnected) 
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                    : 'bg-[#5F8B4C] hover:bg-[#4A7039] text-white shadow-lg hover:shadow-xl'
                  }
                  font-poppins font-semibold py-4 px-6 rounded-xl transition-all duration-200
                `}
              >
                <Play className="w-5 h-5" />
                {!isConnected
                  ? 'Connection required...'
                  : !allReady
                  ? 'Waiting for players...'
                  : players.length < 2
                  ? 'Need at least 2 players'
                  : 'Start Game'}
              </motion.button>

              <motion.button
                whileHover={{ y: -2 }}
                whileTap={{ y: 0 }}
                onClick={() => setShowDiscardModal(true)}
                disabled={!isConnected}
                className={`
                  flex-1 flex items-center justify-center gap-3
                  ${!isConnected 
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-red-500 hover:bg-red-600 text-white shadow-lg hover:shadow-xl'
                  }
                  font-poppins font-semibold py-4 px-6 rounded-xl transition-all duration-200
                `}
              >
                <Trash2 className="w-5 h-5" />
                Discard Room
              </motion.button>
            </div>
          ) : (
            <div className="text-center max-w-md mx-auto">
              <div className="mb-6">
                <div className="w-16 h-16 bg-[#FFDDAB] rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-[#D98324]" />
                </div>
                <p className="font-courier text-[#131010] opacity-70 mb-4">
                  Waiting for the host to start the game...
                </p>
              </div>
              <motion.button
                whileHover={{ y: -2 }}
                whileTap={{ y: 0 }}
                onClick={() => setShowLeaveModal(true)}
                disabled={!isConnected}
                className={`
                  flex items-center justify-center gap-3
                  ${!isConnected 
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-gray-500 hover:bg-gray-600 text-white shadow-lg hover:shadow-xl'
                  }
                  font-poppins font-semibold py-3 px-6 rounded-xl transition-all duration-200 mx-auto
                `}
              >
                <LogOut className="w-5 h-5" />
                Leave Room
              </motion.button>
            </div>
          )}
        </motion.div>

        {/* Modals */}
        <Modal
          show={showDiscardModal}
          onClose={() => setShowDiscardModal(false)}
          onConfirm={() => {
            discardRoom();
            setShowDiscardModal(false);
          }}
          title="Discard Room"
          message="Are you sure you want to discard this room? All players will be kicked and the room will be deleted."
          confirmText="Yes, Discard Room"
          confirmColor="red"
        />

        <Modal
          show={showLeaveModal}
          onClose={() => setShowLeaveModal(false)}
          onConfirm={() => {
            leaveRoom();
            setShowLeaveModal(false);
          }}
          title="Leave Room"
          message="Are you sure you want to leave this room? You'll need a new invite to rejoin."
          confirmText="Yes, Leave Room"
          confirmColor="yellow"
        />
        
        <Modal
          show={showStartGameModal}
          onClose={() => setShowStartGameModal(false)}
          onConfirm={() => {
            if (socket && gameState?.roomId) {
              console.log("Emitting startGame event", gameState.roomId);
              socket.emit('startGame', { roomId: gameState.roomId });
            }
            setShowStartGameModal(false);
          }}
          title="Start Game"
          message="Ready to start the game? Make sure everyone's ready!"
          confirmText="Let's Go!"
          confirmColor="green"
        />
      </motion.div>
    </div>
  );
};

export default RoomLobby;