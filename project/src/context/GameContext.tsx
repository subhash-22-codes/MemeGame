import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { MEMES } from '../data/memes';
import { useAuth } from './AuthContext';
import {toast} from 'react-hot-toast';
export type Player = {
  id: string;
  username: string;
  avatar?: string;
  score: number;
  roundScores?: Array<{ round: number; score: number }>;
  isJudge: boolean;
  isReady: boolean;
  isHost?: boolean;
  lastSeen?: Date;
  isConnected?: boolean;
};

export type Meme = {
  id: string;
  url: string;
  title: string;
};



export type MemeSubmission = {
  playerId: string;
  memeId: string;
  score?: number;
};

export type FinalResult = {
  winner: { id: string; username?: string; score: number; avatar?: string };
  players: Array<{ id: string; username?: string; score: number; avatar?: string }>;
  totalRounds: number;
  completedAt?: string;
};

export type GameState = {
  roomId: string;
  players: Player[];
  currentJudge?: Player;
  currentSentence?: string;
  roundNumber: number;
  totalRounds: number;
  roundsPerJudge: number;
  timeLeft: number;
  timerEndTime?: number; // For synchronized timer
  finalResult?: FinalResult;
  gamePhase:
    | 'lobby'
    | 'judgeSelection'
    | 'sentenceCreation'
    | 'memeSelection'
    | 'memeReveal'
    | 'scoring'
    | 'results';
  submissions: MemeSubmission[];
  availableMemes: Meme[];
  sessionId?: string;
};

export interface ChatMessage {
  id: string;
  username: string;
  message: string;
  timestamp: number;
  userId: string;
  playerId: string;
}



export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'reconnecting' | 'error';

type GameSession = {
  roomId: string;
  playerId: string;
  sessionId: string;
  timestamp: number;
};

type GameContextType = {
  gameState: GameState | null;
  isHost: boolean;
  connectionState: ConnectionState;
  createRoom: (settings: { rounds: number; roundsPerJudge: number }) => Promise<string>;
  joinRoom: (roomId: string) => Promise<void>;
  leaveRoom: () => void;
  discardRoom: () => void;
  startJudgeSelection: () => void;
  submitSentence: (sentence: string) => void;
  selectMeme: (memeId: string) => void;
  scoreMeme: (playerId: string, score: number) => void;
  startNextRound: () => void;
  endGame: () => void;
  chatMessages: ChatMessage[];
  sendChatMessage: (message: string) => void;
  roomId?: string;
  socket: Socket | null;
  isConnected: boolean;
  reconnectionAttempts: number;
  maxReconnectionAttempts: number;
  safeEmit: (event: string, data: unknown, callback?: (response: unknown) => void) => boolean;
};

const GameContext = createContext<GameContextType | undefined>(undefined);

const MAX_RECONNECTION_ATTEMPTS = 5;
const RECONNECTION_DELAY = 2000;
const SESSION_STORAGE_KEY = 'gameSession';

const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [reconnectionAttempts, setReconnectionAttempts] = useState(0);
  
  const { user } = useAuth();

  // Refs to persist across re-renders
  const socketRef = useRef<Socket | null>(null);
  const reconnectionTimeoutRef = useRef<number | null>(null);
  const clientMsgCounterRef = useRef<number>(0);
  const lastDiscardedRoomIdRef = useRef<string | null>(null);

  const isReconnectingRef = useRef(false);
  const sessionIdRef = useRef<string | null>(null);
  const isInitializingRef = useRef<boolean>(false);

  // Generate session ID
  const generateSessionId = useCallback(() => {
    return 'session-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  }, []);

  // Save game session to localStorage
  const saveGameSession = useCallback((roomId: string, playerId: string) => {
    if (!sessionIdRef.current) {
      sessionIdRef.current = generateSessionId();
    }
    
    const session: GameSession = {
      roomId,
      playerId,
      sessionId: sessionIdRef.current,
      timestamp: Date.now()
    };
    
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    localStorage.setItem('playerId', playerId);
  }, [generateSessionId]);

  // Load game session from localStorage
  const loadGameSession = useCallback((): GameSession | null => {
    try {
      const stored = localStorage.getItem(SESSION_STORAGE_KEY);
      if (!stored) return null;
      
      const session = JSON.parse(stored) as GameSession;
      
      // Check if session is not too old (24 hours)
      if (Date.now() - session.timestamp > 24 * 60 * 60 * 1000) {
        localStorage.removeItem(SESSION_STORAGE_KEY);
        return null;
      }
      
      return session;
    } catch (error) {
      console.error('[SESSION] Error loading session:', error);
      localStorage.removeItem(SESSION_STORAGE_KEY);
      return null;
    }
  }, []);

  // Clear game session
  const clearGameSession = useCallback(() => {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    sessionIdRef.current = null;
  }, []);

  // Safe socket emission with retry logic
  const safeEmit = useCallback((event: string, data: unknown, callback?: (response: unknown) => void): boolean => {
    if (socketRef.current?.connected) {
      try {
        if (callback) {
          socketRef.current.emit(event, data, callback);
        } else {
          socketRef.current.emit(event, data);
        }
        return true;
      } catch (error) {
        console.error(`[SOCKET] Error emitting ${event}:`, error);
        return false;
      }
    }
    console.warn(`[SOCKET] Cannot emit ${event}: socket not connected`);
    return false;
  }, []);

  // Generate idempotency token per client emission
  const generateClientMsgId = useCallback(() => {
    clientMsgCounterRef.current += 1;
    return `cmsg-${Date.now()}-${clientMsgCounterRef.current}-${Math.random().toString(36).slice(2, 7)}`;
  }, []);

  // Enhanced state updater with validation
  const updateGameState = useCallback((updater: (prev: GameState | null) => GameState | null) => {
    setGameState((prev) => {
      try {
        const newState = updater(prev);
        
        // Validate state integrity
        if (newState && newState.roomId && newState.players) {
          // Save to localStorage for persistence
          localStorage.setItem('gameState', JSON.stringify({
            ...newState,
            timestamp: Date.now()
          }));
          return newState;
        }
        
        return newState;
      } catch (error) {
        console.error('[GAME_STATE] Error updating state:', error);
        return prev;
      }
    });
  }, []);
  

  // Reconnection logic
  const attemptReconnection = useCallback(() => {
  if (isReconnectingRef.current || reconnectionAttempts >= MAX_RECONNECTION_ATTEMPTS) {
    return;
  }

  isReconnectingRef.current = true;
  setConnectionState('reconnecting');
  setReconnectionAttempts(prev => prev + 1);

  console.log(`[RECONNECTION] Attempt ${reconnectionAttempts + 1}/${MAX_RECONNECTION_ATTEMPTS}`);

  // ✅ Clear any previous reconnection delay timers
  if (reconnectionTimeoutRef.current) {
    clearTimeout(reconnectionTimeoutRef.current);
  }

  reconnectionTimeoutRef.current = window.setTimeout(() => {
    initializeSocket();
    isReconnectingRef.current = false;
  }, RECONNECTION_DELAY * (reconnectionAttempts + 1));
}, [reconnectionAttempts]);

  

  // Initialize socket connection
  const initializeSocket = useCallback(() => {
    if (!user) return;
    

    // Don't create multiple connections
    if (socketRef.current?.connected || isInitializingRef.current) {
      console.log('[SOCKET] Connection already exists or initializing');
      return;
    }

    console.log('[SOCKET] Initializing connection for user:', user.id);
    setConnectionState('connecting');
    isInitializingRef.current = true;

    const socketOptions = {
      forceNew: true,
      transports: ['websocket', 'polling'],
      timeout: 30000,
      reconnection: true,
      reconnectionAttempts: MAX_RECONNECTION_ATTEMPTS,
      reconnectionDelay: RECONNECTION_DELAY,
      maxReconnectionAttempts: MAX_RECONNECTION_ATTEMPTS,
      autoConnect: true
    };

    const newSocket = io(`${window.location.protocol}//${window.location.hostname}:5000`, socketOptions);

    socketRef.current = newSocket;
    setSocket(newSocket);

    // Connection event handlers
    newSocket.on('connect', () => {
      console.log('[SOCKET] Connected:', newSocket.id);
      setConnectionState('connected');
      setReconnectionAttempts(0);
      isReconnectingRef.current = false;
      isInitializingRef.current = false;

      // Clear any pending reconnection timeouts
      if (reconnectionTimeoutRef.current) {
        clearTimeout(reconnectionTimeoutRef.current);
        reconnectionTimeoutRef.current = null;
      }

      // Attempt to rejoin room if we have a session
      const session = loadGameSession();
      if (session && session.playerId === user.id) {
        console.log('[SOCKET] Attempting to rejoin room:', session.roomId);
        safeEmit('rejoinRoom', {
          roomId: session.roomId,
          playerId: session.playerId,
          sessionId: session.sessionId,
          player: {
            id: user.id,
            username: user.username,
            avatar: user.avatar,
            score: 0,
            isJudge: false,
            isReady: true
          }
        });
      }
    });

    newSocket.on('disconnect', (reason) => {
      console.log('[SOCKET] Disconnected:', reason);
      setConnectionState('disconnected');

      // Auto-reconnect for mobile background/lock cases
      if (reason === 'io server disconnect' || reason === 'transport close' || reason === 'ping timeout') {
        console.log('[SOCKET] Unexpected disconnect, attempting reconnection');
        if (reconnectionAttempts < MAX_RECONNECTION_ATTEMPTS) {
          attemptReconnection();
        } else {
          setConnectionState('error');
          console.error('[SOCKET] Max reconnection attempts reached');
        }
      }
    });

    newSocket.on('connect_error', (error) => {
      console.error('[SOCKET] Connection error:', error);
      setConnectionState('error');
      
      if (reconnectionAttempts < MAX_RECONNECTION_ATTEMPTS) {
        attemptReconnection();
      }
    });

    // Room event handlers with enhanced error handling
    newSocket.on('roomJoined', (data: { roomData: Partial<GameState> & { roomId: string; currentRound?: number; players: Player[]; timeLeft?: number; submissions?: MemeSubmission[]; gamePhase?: GameState['gamePhase'] }; sessionId: string }) => {
      console.log('[SOCKET] Room joined:', data.roomData.roomId);

      const newGameState: GameState = {
        ...(data.roomData as GameState),
        availableMemes: MEMES,
        submissions: data.roomData.submissions || [],
        timeLeft: data.roomData.timeLeft || 0,
        gamePhase: data.roomData.gamePhase || 'lobby',
        roundNumber: data.roomData.roundNumber ?? data.roomData.currentRound ?? 0,
        sessionId: data.sessionId
      };

      setGameState(newGameState);
      sessionIdRef.current = data.sessionId;

      const isCurrentPlayerHost = data.roomData.players.some((p: Player) => p.id === user.id && p.isHost);
      setIsHost(isCurrentPlayerHost);
      saveGameSession(newGameState.roomId, user.id);
    });

    newSocket.on('roomRejoined', (data: { roomData: Partial<GameState> & { roomId: string; currentRound?: number; players: Player[]; submissions?: MemeSubmission[]; timeLeft?: number }; restored: boolean }) => {
      console.log('[SOCKET] Room rejoined:', data.roomData.roomId, 'Restored:', data.restored);

      const newGameState: GameState = {
        ...(data.roomData as GameState),
        availableMemes: MEMES,
        submissions: data.roomData.submissions || [],
        timeLeft: data.roomData.timeLeft || 0,
        roundNumber: data.roomData.roundNumber ?? data.roomData.currentRound ?? 0
      };

      setGameState(newGameState);

      const isCurrentPlayerHost = data.roomData.players.some((p: Player) => p.id === user.id && p.isHost);
      setIsHost(isCurrentPlayerHost);

      if (data.restored) {
        console.log('[SOCKET] Game state restored from server');
      }
    });

    newSocket.on('error', (data: { error: string; code?: string }) => {
      console.error('[SOCKET] Server error:', data.error);
      
      // Handle specific error types
      if (data.code === 'ROOM_NOT_FOUND') {
        clearGameSession();
        alert('Room no longer exists. Redirecting to join page.');
        setTimeout(() => {
          window.location.href = '/join';
        }, 100);
      } else if (data.code === 'INVALID_SESSION') {
        clearGameSession();
        alert('Your session has expired. Please rejoin the room.');
      } else {
        alert(data.error);
      }
    });

    // Enhanced game event handlers
  newSocket.on('playerJoined', (players: Player[]) => {
  console.log('[SOCKET] Player joined, updating players:', players.length);

  // Debounce via microtask to avoid setState in render warnings
  Promise.resolve().then(() => {
    updateGameState((prev) => {
      if (!prev) return null;

      const currentPlayerId = localStorage.getItem('playerId');

      const newPlayer = players.find(
        (p) => !prev.players.some((prevP) => prevP.id === p.id)
      );

      if (newPlayer) {
        if (newPlayer.id === currentPlayerId) {
          toast.success('You joined the room');
        } else {
          toast.success(`${newPlayer.username} joined the room`);
        }
      }

      return { ...prev, players };
    });
  });
});




     newSocket.on('playerLeft', (data: { players: Player[]; disconnectedPlayerId: string }) => {
  console.log('[SOCKET] Player left:', data.disconnectedPlayerId);
  console.log('[SOCKET] Updated players list:', data.players);

  // Debounce via microtask to avoid setState in render warnings
  Promise.resolve().then(() => {
    updateGameState((prev) => {
      if (!prev) return null;

      // Find disconnected player name before updating players
      const disconnectedPlayer = prev.players.find(p => p.id === data.disconnectedPlayerId);
      const playerName = disconnectedPlayer?.username || 'A player';
      
      toast(`${playerName} left the room`);

      const updatedState = { ...prev, players: data.players };

      // If the disconnected player was the host, assign a new host
      if (data.players.length > 0) {
        const newHost = data.players[0];
        if (newHost.id === user.id && !isHost) {
          setIsHost(true)
          console.log('[SOCKET] You are now the host');
        } else if (newHost.id !== user.id && isHost) {
          setIsHost(false);
        }
      } else {
        setIsHost(false);
      }

      return updatedState;
    });
  });
});

      // Show notification about player leaving

    newSocket.on('playerReconnected', (data: { players: Player[]; reconnectedPlayerId: string }) => {
      console.log('[SOCKET] Player reconnected:', data.reconnectedPlayerId);
      updateGameState((prev) => prev ? { ...prev, players: data.players } : null);
    });

    newSocket.on('playerDisconnected', (data: { playerId: string; roomId: string }) => {
      console.log('[SOCKET] Player disconnected:', data.playerId);
      updateGameState((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          players: prev.players.map(p => p.id === data.playerId ? { ...p, isConnected: false, lastSeen: new Date() } : p)
        };
      });
    });

    newSocket.on('roomDiscarded', () => {
      console.log('[SOCKET] Room discarded by host');
      // Remember discarded room to prevent stale re-joins
      if (gameState?.roomId) {
        lastDiscardedRoomIdRef.current = gameState.roomId;
      }
      alert('Room has been discarded by the host.');
      
      clearGameSession();
      setGameState(null);
      setChatMessages([]);
      
      setTimeout(() => {
        newSocket.disconnect();
        socketRef.current = null;
        setSocket(null);
        window.location.href = '/dashboard';
      }, 200);
    });

    // Game phase handlers
    newSocket.on('gamePhaseChanged', (newPhase: GameState['gamePhase']) => {
  console.log('[SOCKET] Game phase changed:', newPhase);
  updateGameState((prev) =>
    prev ? { ...prev, gamePhase: newPhase } : null
  );
});
    newSocket.on('gameStateUpdate', (newState: Partial<GameState> & { currentRound?: number }) => {
      console.log('[SOCKET] gameStateUpdate received:', newState);
      const normalized: GameState = {
        ...(newState as GameState),
        roundNumber: (newState.roundNumber ?? newState.currentRound ?? 0) as number
      };
      updateGameState(() => normalized);
    });

    newSocket.on('gameEnded', (payload: Partial<GameState> & { finalResult?: FinalResult }) => {
      console.log('[SOCKET] Game ended');
      updateGameState((prev) => {
        const next: GameState = {
          ...(prev || (payload as GameState)),
          ...(payload as Partial<GameState>),
          gamePhase: 'results',
          finalResult: payload.finalResult ?? prev?.finalResult
        } as GameState;
        return next;
      });
      toast.success('Game finished! Showing final results.');
    });

    newSocket.on('judgeSelected', (judge: Player) => {
      console.log('[SOCKET] Judge selected:', judge.username);
      updateGameState((prev) =>
        prev ? {
          ...prev,
          currentJudge: judge,
          players: prev.players.map((p) => ({
            ...p,
            isJudge: p.id === judge.id,
          })),
        } : null
      );
    });

    newSocket.on('sentenceSubmitted', (sentence: string) => {
      console.log('[SOCKET] Sentence submitted');
      updateGameState((prev) =>
        prev
          ? {
              ...prev,
              currentSentence: sentence,
              gamePhase: 'memeSelection'
            }
          : null
      );
    });

    newSocket.on('memeSelected', (submission: MemeSubmission) => {
      console.log('[SOCKET] Meme selected by player:', submission.playerId);
      updateGameState((prev) =>
        prev ? { ...prev, submissions: [...prev.submissions, submission] } : null
      );
    });

    newSocket.on('memeScored', ({ playerId, score }: { playerId: string; score: number }) => {
      console.log('[SOCKET] Meme scored:', playerId, score);
      // Update submission score locally; do NOT increment player total here to avoid double-counting.
      // The authoritative total will arrive in the subsequent gameStateUpdate from the server.
      updateGameState((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          submissions: prev.submissions.map((sub) =>
            sub.playerId === playerId ? { ...sub, score } : sub
          )
        } as GameState;
      });
    });

    newSocket.on('gameStarted', (roomData: Partial<GameState> & { currentRound?: number }) => {
      console.log('[SOCKET] Game started');
      updateGameState((prev) =>
        prev
          ? {
              ...prev,
              gamePhase: 'judgeSelection',
              currentJudge: roomData.currentJudge,
              roundNumber: (roomData.roundNumber ?? roomData.currentRound ?? prev.roundNumber) as number,
              players: roomData.players || prev.players,
            }
          : null
      );
    });

    newSocket.on('roundStarted', (updatedRoom: Partial<GameState> & { currentRound?: number }) => {
      console.log('[SOCKET] Round started:', updatedRoom);
      const normalized: GameState = {
        ...(updatedRoom as GameState),
        roundNumber: (updatedRoom.roundNumber ?? updatedRoom.currentRound ?? 0) as number
      };
      updateGameState(() => normalized);
    });

    newSocket.on('chatMessage', (message: ChatMessage) => {
      // Ensure the message has the correct structure
      const formattedMessage: ChatMessage = {
        id: message.id || `msg-${Date.now()}-${Math.random()}`,
        username: message.username || 'Unknown',
        message: message.message || '',
        timestamp: typeof message.timestamp === 'number' ? message.timestamp : Date.now(),
        userId: message.userId || '',
        playerId: message.playerId || message.userId || '', // fallback for older clients
      };

      setChatMessages((prev) => [...prev, formattedMessage]);
    });

    // Timer event handlers
    newSocket.on('timerStarted', (data: { roomId: string; duration: number; endTime: string }) => {
      console.log('[SOCKET] Timer started:', data);
      updateGameState((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          timeLeft: data.duration,
          timerEndTime: new Date(data.endTime).getTime()
        };
      });
    });

    newSocket.on('timerEnded', (data: { roomId: string; phase: string }) => {
      console.log('[SOCKET] Timer ended:', data);
      updateGameState((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          timeLeft: 0
        };
      });
    });


    // Cleanup function
    return () => {
      console.log('[SOCKET] Cleaning up connection');
      
      if (reconnectionTimeoutRef.current) {
        clearTimeout(reconnectionTimeoutRef.current);
        reconnectionTimeoutRef.current = null;
      }
      
      newSocket.removeAllListeners();
      newSocket.disconnect();
      socketRef.current = null;
      setSocket(null);
      isInitializingRef.current = false;
    };
  }, [user, updateGameState, loadGameSession, saveGameSession, clearGameSession, safeEmit, attemptReconnection, reconnectionAttempts, isHost]);

  // Restore game session on page load
  useEffect(() => {
    if (!user) return;

    const session = loadGameSession();
    if (session && session.playerId === user.id) {
      console.log('[SESSION] Attempting to restore session for room:', session.roomId);
      
      // Try to rejoin the room
      safeEmit('rejoinRoom', {
        roomId: session.roomId,
        playerId: session.playerId,
        sessionId: session.sessionId,
        player: {
          id: user.id,
          username: user.username,
          avatar: user.avatar,
          score: 0,
          isJudge: false,
          isReady: true
        }
      });
    }
  }, [user, loadGameSession, safeEmit]);

  // Initialize socket when user is available
  useEffect(() => {
    if (!user) {
      // Clear everything when user logs out
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
      }
      setGameState(null);
      setChatMessages([]);
      setConnectionState('disconnected');
      clearGameSession();
      return;
    }

    const cleanup = initializeSocket();
    
    return cleanup;
  }, [user, initializeSocket, clearGameSession]);

  // Attempt reconnect when app returns to foreground (mobile screen on)
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        if (!socketRef.current || !socketRef.current.connected) {
          console.log('[SOCKET] Visibility change: trying to reconnect');
          initializeSocket();
        }
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [initializeSocket]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (reconnectionTimeoutRef.current) {
        clearTimeout(reconnectionTimeoutRef.current);
      }
    };
  }, []);

  // Game action methods with enhanced error handling
  const createRoom = async (settings: { rounds: number; roundsPerJudge: number }): Promise<string> => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    if (connectionState !== 'connected') {
      throw new Error('Socket not connected. Please wait for connection.');
    }

    // Prevent duplicate room creation
    if (gameState?.roomId) {
      throw new Error('Already in a room. Please leave current room first.');
    }

    return new Promise<string>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Room creation timed out'));
      }, 15000);

      // Listen for roomCreated event
      const handleRoomCreated = (data: { roomData: GameState; sessionId: string }) => {
        clearTimeout(timeout);
        console.log('[GAME] Room created successfully:', data.roomData.roomId);
        
        const newGameState: GameState = {
          ...data.roomData,
          availableMemes: MEMES,
          submissions: data.roomData.submissions || [],
          timeLeft: data.roomData.timeLeft || 0,
          gamePhase: data.roomData.gamePhase || 'lobby',
          sessionId: data.sessionId
        };

        setGameState(newGameState);
        sessionIdRef.current = data.sessionId;

        // Set host status
        const currentPlayer = data.roomData.players.find((p: Player) => p.id === user.id);
        const isCurrentPlayerHost = currentPlayer?.isHost === true;
        
        setIsHost(isCurrentPlayerHost);
        saveGameSession(newGameState.roomId, user.id);

        // Remove the event listener
        if (socketRef.current) {
          socketRef.current.off('roomCreated', handleRoomCreated);
        }
        
        resolve(data.roomData.roomId);
      };

      // Listen for error events
      const handleError = (data: { error: string; code?: string }) => {
        clearTimeout(timeout);
        console.error('[GAME] Failed to create room:', data.error);
        
        // Remove the event listeners
        if (socketRef.current) {
          socketRef.current.off('roomCreated', handleRoomCreated);
          socketRef.current.off('error', handleError);
        }
        
        reject(new Error(data.error));
      };

      if (socketRef.current) {
        socketRef.current.on('roomCreated', handleRoomCreated);
        socketRef.current.on('error', handleError);
      }

      safeEmit('createRoom', {
        rounds: settings.rounds,
        roundsPerJudge: settings.roundsPerJudge,
        host: {
          id: user.id,
          username: user.username,
          avatar: user.avatar,
          score: 0,
          isJudge: false,
          isReady: true,
          isHost: true,
        },
      });
    });
  };

  const joinRoom = async (roomId: string): Promise<void> => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    if (connectionState !== 'connected') {
      throw new Error('Socket not connected. Please wait for connection.');
    }

    // Prevent duplicate room joining
    if (gameState?.roomId) {
      if (gameState.roomId === roomId) {
        throw new Error('Already in this room');
      } else {
        throw new Error('Already in another room. Please leave current room first.');
      }
    }

    // Block joining a room that was just discarded
    if (lastDiscardedRoomIdRef.current === roomId) {
      clearGameSession();
      throw new Error('Room was discarded by host');
    }

    console.log('[GAME] Joining room:', roomId);

    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Join room timed out'));
      }, 10000);

      safeEmit('joinRoom', {
        roomId,
        player: {
          id: user.id,
          username: user.username,
          avatar: user.avatar,
          score: 0,
          isJudge: false,
          isReady: true,
        },
        sessionId: (loadGameSession() || { sessionId: sessionIdRef.current })?.sessionId || (() => { sessionIdRef.current = generateSessionId(); return sessionIdRef.current; })()
      });

      // Listen for roomJoined event
      const handleRoomJoined = (data: { roomData: GameState; sessionId: string }) => {
        clearTimeout(timeout);
        console.log('[GAME] Successfully joined room:', data.roomData.roomId);
        
        const newGameState: GameState = {
          ...data.roomData,
          availableMemes: MEMES,
          submissions: data.roomData.submissions || [],
          timeLeft: data.roomData.timeLeft || 0,
          gamePhase: data.roomData.gamePhase || 'lobby',
          sessionId: data.sessionId
        };

        setGameState(newGameState);
        sessionIdRef.current = data.sessionId;

        const isCurrentPlayerHost = data.roomData.players.some((p: Player) => p.id === user.id && p.isHost);
        setIsHost(isCurrentPlayerHost);
        saveGameSession(newGameState.roomId, user.id);

        // Remove the event listener
        if (socketRef.current) {
          socketRef.current.off('roomJoined', handleRoomJoined);
        }
        
        resolve();
      };

      // Listen for error events
      const handleError = (data: { error: string; code?: string }) => {
        clearTimeout(timeout);
        console.error('[GAME] Failed to join room:', data.error);
        
        // Remove the event listeners
        if (socketRef.current) {
          socketRef.current.off('roomJoined', handleRoomJoined);
          socketRef.current.off('error', handleError);
        }
        if (data.code === 'ROOM_NOT_FOUND') {
          clearGameSession();
        }
        
        reject(new Error(data.error));
      };

      if (socketRef.current) {
        socketRef.current.on('roomJoined', handleRoomJoined);
        socketRef.current.on('error', handleError);
      }
    });
  };

 const leaveRoom = useCallback(() => {
  if (!user || !gameState?.roomId || !socket) return;

  console.log('[GAME] Leaving room:', gameState.roomId);

  // Step 1: Listen for acknowledgment or wait a small delay
  socket.emit('leaveRoom', {
    roomId: gameState.roomId,
    playerId: user.id
  });

  // Step 2: Allow server emit to propagate to others
  setTimeout(() => {
    clearGameSession();
    setGameState(null);
    setChatMessages([]);
    window.location.href = '/dashboard'; // Use navigate to prevent full reload
  }, 300); // Delay to ensure `playerLeft` is sent to others
}, [user, gameState?.roomId, socket, clearGameSession]);


  const discardRoom = useCallback(() => {
    if (!gameState?.roomId) return;

    console.log('[GAME] Discarding room:', gameState.roomId);
    safeEmit('discardRoom', { roomId: gameState.roomId });
  }, [gameState?.roomId, safeEmit]);

  const startJudgeSelection = useCallback(() => {
    if (!gameState?.roomId) return;
    safeEmit('startJudgeSelection', { roomId: gameState.roomId });
  }, [gameState?.roomId, safeEmit]);

  const submitSentence = useCallback((sentence: string) => {
    if (!gameState?.roomId) return;
    safeEmit('submitSentence', { roomId: gameState.roomId, sentence, clientMsgId: generateClientMsgId() });
  }, [gameState?.roomId, safeEmit, generateClientMsgId]);

  const selectMeme = useCallback((memeId: string) => {
    if (!gameState?.roomId || !user) return;
    safeEmit('selectMeme', {
      roomId: gameState.roomId,
      playerId: user.id,
      memeId,
      clientMsgId: generateClientMsgId()
    });
  }, [gameState?.roomId, user, safeEmit, generateClientMsgId]);

  const scoreMeme = useCallback((playerId: string, score: number) => {
    if (!gameState?.roomId || !user) return;
    safeEmit('scoreMeme', {
      roomId: gameState.roomId,
      playerId,
      score,
      judgeId: user.id,
      clientMsgId: generateClientMsgId()
    });
  }, [gameState?.roomId, user, safeEmit, generateClientMsgId]);

  const startNextRound = useCallback(() => {
  if (!gameState?.roomId) return;
  safeEmit('nextRound', { roomId: gameState.roomId, clientMsgId: generateClientMsgId() });
}, [gameState?.roomId, safeEmit, generateClientMsgId]);


  const endGame = useCallback(() => {
    if (!gameState?.roomId) return;
    
    console.log('[GAME] Ending game');
    safeEmit('endGame', { roomId: gameState.roomId });
    clearGameSession();
    setGameState(null);
    setChatMessages([]);
  }, [gameState?.roomId, safeEmit, clearGameSession]);

 const sendChatMessage = useCallback((message: string) => {
  if (!gameState?.roomId || !user) return;

  const chatMessage: ChatMessage = {
    id: Math.random().toString(),
    playerId: user.id,
    userId: user.id, // ✅ add this missing field
    username: user.username,
    message,
    timestamp: new Date().getTime(),
  };

  safeEmit('chatMessage', {
    roomId: gameState.roomId,
    message: chatMessage,
  });
}, [gameState?.roomId, user, safeEmit]);


  const contextValue: GameContextType = {
    gameState,
    isHost,
    connectionState,
    createRoom,
    joinRoom,
    leaveRoom,
    discardRoom,
    startJudgeSelection,
    submitSentence,
    selectMeme,
    scoreMeme,
    startNextRound,
    endGame,
    chatMessages,
    sendChatMessage,
    socket,
    roomId: gameState?.roomId,
    isConnected: connectionState === 'connected',
    reconnectionAttempts,
    maxReconnectionAttempts: MAX_RECONNECTION_ATTEMPTS,
    safeEmit,
  };

  return (
    <GameContext.Provider value={contextValue}>
      {children}
    </GameContext.Provider>
  );
};

export const useGame = (): GameContextType => {
  const context = useContext(GameContext);
  if (context === undefined || context === null) {
    console.error('useGame must be used within a GameProvider');
    return {
      gameState: null,
      isHost: false,
      connectionState: 'disconnected',
      createRoom: async () => { throw new Error('Socket not ready'); },
      joinRoom: async () => { throw new Error('Socket not ready'); },
      leaveRoom: () => {},
      discardRoom: () => {},
      startJudgeSelection: () => {},
      submitSentence: () => {},
      selectMeme: () => {},
      scoreMeme: () => {},
      startNextRound: () => {},
      endGame: () => {},
      chatMessages: [],
      sendChatMessage: () => {},
      socket: null,
      roomId: undefined,
      isConnected: false,
      reconnectionAttempts: 0,
      maxReconnectionAttempts: 5,
      safeEmit: () => false,
    };
  }
  return context;
};

export default GameProvider;