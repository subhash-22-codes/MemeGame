import React, { createContext, useContext, useReducer, useEffect, useRef, useCallback, useMemo } from 'react';
import { io, Socket } from 'socket.io-client';

import { useAuth } from './AuthContext';
import { toast } from 'react-hot-toast';
import { SOCKET_URL } from '../config';

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

// ⭐️ FIX: Defined the Meme type locally to resolve the import error
export type Meme = { 
  id: string;
  url: string;
  title: string;
  tags?: string[]; // Kept tags for future filters
};

export type MemeSubmission = {
  playerId: string;
  username?: string;
  avatar?: string;
  memeId: string;
  score?: number;
  memeUrl?: string; 
};

export type FinalResult = {
  winner: { id: string; username?: string; score: number; avatar?: string };
  players: Array<{ id: string; username?: string; score: number; avatar?: string }>;
  totalRounds: number;
  completedAt?: string;
};

export type GameState = {
  roomId: string;
  host: { id: string };
  players: Player[];
  currentJudge?: Player;
  currentSentence?: string;
  currentRound: number;
  totalRounds: number;
  roundsPerJudge: number;
  timerEndTime?: number;
  finalResult?: FinalResult;
  gamePhase:
    | 'lobby'
    | 'judgeSelection'
    | 'sentenceCreation'
    | 'memeSelection'
    | 'memeReveal'
    | 'scoring'
    | 'results'
    | 'finalResults';
  submissions: MemeSubmission[];
  availableMemes: Meme[]; // Now refers to the locally defined Meme type
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
  isJudge: boolean;
  connectionState: ConnectionState;
  isRestoring: boolean; // For the reload bug
  
  // Emitters
  createRoom: (settings: { rounds: number; roundsPerJudge: number }) => Promise<string>;
  joinRoom: (roomId: string) => Promise<void>;
  leaveRoom: () => void;
  discardRoom: () => void;
  startGame: () => void;
  selectJudge: (judgeId: string) => void;
  submitSentence: (sentence: string) => void;
  selectMeme: (memeId: string) => void;
  scoreMeme: (playerId: string, score: number) => void;
  requestNextRound: () => void;
  sendChatMessage: (message: string) => void;

  // State
  chatMessages: ChatMessage[];
  socket: Socket | null;
  isConnected: boolean;
  reconnectionAttempts?: number; // Added for connection status display
  maxReconnectionAttempts?: number; // Added for connection status display
};
// ... rest of the file ...
const GameContext = createContext<GameContextType | undefined>(undefined);

const SESSION_STORAGE_KEY = 'gameSession';

// -------------------------------------------------------------------
// 2. THE REDUCER (The "Brain")
// -------------------------------------------------------------------

type GameAction =
  | { type: 'SET_CONNECTION_STATE'; payload: ConnectionState }
  | { type: 'SET_GAME_STATE'; payload: GameState | null }
  | { type: 'UPDATE_PLAYERS'; payload: Player[] }
  | { type: 'SET_TIMER'; payload: { endTime: string } }
  | { type: 'ADD_CHAT_MESSAGE'; payload: ChatMessage }
  | { type: 'RESET_GAME' }
  | { type: 'SET_RESTORING'; payload: boolean };

interface IContextState {
  connectionState: ConnectionState;
  gameState: GameState | null;
  chatMessages: ChatMessage[];
  isRestoring: boolean;
}

const initialState: IContextState = {
  connectionState: 'disconnected',
  gameState: null,
  chatMessages: [],
  isRestoring: true, // Start in restoring state on load
};

const gameReducer = (state: IContextState, action: GameAction): IContextState => {
  switch (action.type) {
    case 'SET_CONNECTION_STATE':
      return { ...state, connectionState: action.payload };
    
    case 'SET_GAME_STATE': { // ⭐️ Added { block scope }
      const preservedTimer = action.payload?.gamePhase === 'memeSelection' 
        ? state.gameState?.timerEndTime 
        : undefined;

      return {
        ...state,
        isRestoring: false, 
        gameState: action.payload ? { ...action.payload, timerEndTime: preservedTimer } : null,
      };
    }

    case 'UPDATE_PLAYERS':
      if (!state.gameState) return state;
      return {
        ...state,
        gameState: { ...state.gameState, players: action.payload },
      };

    case 'SET_TIMER': { // ⭐️ Added { block scope }
      if (!state.gameState) return state;
      
      let timeString = action.payload.endTime;
      if (!timeString.endsWith('Z')) timeString += 'Z';

      return {
        ...state,
        gameState: {
          ...state.gameState,
          timerEndTime: new Date(timeString).getTime()
        }
      };
    }

    case 'ADD_CHAT_MESSAGE':
      return {
        ...state,
        chatMessages: [...state.chatMessages, action.payload],
      };

    case 'RESET_GAME':
      return {
        ...state,
        isRestoring: false,
        gameState: null,
        chatMessages: [],
      };
      
    case 'SET_RESTORING':
      return { ...state, isRestoring: action.payload };

    default:
      return state;
  }
};
// -------------------------------------------------------------------
// 3. THE PROVIDER (The "Body")
// -------------------------------------------------------------------

const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const { user } = useAuth();
  const socketRef = useRef<Socket | null>(null);

  // --- Derived State ---
  const isHost = useMemo(() => {
    if (!user || !state.gameState) return false;
    return state.gameState.host.id === user.id;
  }, [state.gameState, user]);

  const isJudge = useMemo(() => {
    if (!user || !state.gameState || !state.gameState.currentJudge) return false;
    return state.gameState.currentJudge.id === user.id;
  }, [state.gameState, user]);


  // --- Session Storage Helpers ---
  const saveGameSession = useCallback((roomId: string, playerId: string, sessionId: string) => {
    try {
      const session: GameSession = { roomId, playerId, sessionId, timestamp: Date.now() };
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    } catch (error) {
      console.error("[SESSION] Error saving session:", error);
    }
  }, []);

  const loadGameSession = useCallback((): GameSession | null => {
    try {
      const stored = localStorage.getItem(SESSION_STORAGE_KEY);
      if (!stored) return null;
      
      const session = JSON.parse(stored) as GameSession;
      
      if (Date.now() - session.timestamp > 24 * 60 * 60 * 1000) { // 24hr expiry
        localStorage.removeItem(SESSION_STORAGE_KEY);
        return null;
      }
      return session;
    } catch (error) {
      console.error('[SESSION] Error loading session:', error);
      return null;
    }
  }, []);

  const clearGameSession = useCallback(() => {
    try {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    } catch (error) {
      console.error('[SESSION] Error clearing session:', error);
    }
  }, []);

  // --- Socket Emitter ---
  const safeEmit = useCallback((event: string, data: unknown) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
      return true;
    }
    console.warn(`[SOCKET] Cannot emit ${event}: socket not connected`);
    toast.error("Not connected to server");
    return false;
  }, []);

  // -------------------------------------------------------------------
  // 4. SOCKET INITIALIZATION & LISTENERS (The "Ears")
  // -------------------------------------------------------------------
  
  const initializeSocket = useCallback(() => {
    if (socketRef.current || !user) return;

    console.log('[SOCKET] Initializing connection...');
    dispatch({ type: 'SET_CONNECTION_STATE', payload: 'connecting' });
    
    const newSocket = io(SOCKET_URL, {
      forceNew: true,
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
    });
    socketRef.current = newSocket;

    // --- Core Connection Listeners ---
   newSocket.on('connect', () => {
  console.log('[SOCKET] Connected:', newSocket.id);
  dispatch({ type: 'SET_CONNECTION_STATE', payload: 'connected' });

  // ** IMPROVED REJOIN LOGIC **
  const session = loadGameSession();
  
  // We check if a session exists and belongs to the current user
  if (session && session.playerId === user.id) {
    console.log('[SOCKET] Attempting Rejoin for Room:', session.roomId);
    
    // ⭐️ Change 'joinRoom' to 'rejoinRoom' ⭐️
    newSocket.emit('rejoinRoom', {
      roomId: session.roomId,
      sessionId: session.sessionId, // This is the key that Redis uses
      userId: user.id
    });
  } else {
    // If no session, we stop the loading spinner
    dispatch({ type: 'SET_RESTORING', payload: false });
  }
});

    newSocket.on('disconnect', () => {
      console.log('[SOCKET] Disconnected');
      dispatch({ type: 'SET_CONNECTION_STATE', payload: 'disconnected' });
    });

    newSocket.on('connect_error', (error) => {
      console.error('[SOCKET] Connection error:', error);
      dispatch({ type: 'SET_CONNECTION_STATE', payload: 'error' });
      dispatch({ type: 'SET_RESTORING', payload: false }); // Stop restoring on error
    });

    // --- Global Error Handler ---
    newSocket.on('error', (data: { error: string; code?: string }) => {
      console.error(`[SOCKET] Server Error: ${data.error} (Code: ${data.code})`);
      toast.error(data.error);
      
      dispatch({ type: 'SET_RESTORING', payload: false }); // Stop restoring on error

      if (data.code === 'ROOM_NOT_FOUND' || data.code === 'PLAYER_NOT_IN_ROOM') {
        clearGameSession();
        dispatch({ type: 'RESET_GAME' });
      }
    });

    // --- Lobby Listeners ---
    newSocket.on('roomCreated', (data: { roomData: GameState; sessionId: string }) => {
      console.log('[SOCKET] roomCreated:', data.roomData.roomId);
      dispatch({ type: 'SET_GAME_STATE', payload: data.roomData });
      saveGameSession(data.roomData.roomId, user.id, data.sessionId);
    });

    newSocket.on('roomJoined', (data: { roomData: GameState; sessionId: string }) => {
      console.log('[SOCKET] roomJoined:', data.roomData.roomId);
      dispatch({ type: 'SET_GAME_STATE', payload: data.roomData }); 
      saveGameSession(data.roomData.roomId, user.id, data.sessionId);
    });

    newSocket.on('playerJoined', (data: { players: Player[] }) => {
      console.log('[SOCKET] playerJoined');
      toast.success('A player joined the lobby!');
      dispatch({ type: 'UPDATE_PLAYERS', payload: data.players });
    });

    newSocket.on('playerLeft', (data: { players: Player[]; leftPlayerId: string }) => {
      console.log('[SOCKET] playerLeft');

      dispatch({ type: 'UPDATE_PLAYERS', payload: data.players });

      toast(`${data.leftPlayerId} left the room`);
    });
        
    newSocket.on('playerDisconnected', (data: { players: Player[]; disconnectedPlayerId: string }) => {
      console.log('[SOCKET] playerDisconnected');
      dispatch({ type: 'UPDATE_PLAYERS', payload: data.players });
    });

    newSocket.on('playerReconnected', (data: { players: Player[]; reconnectedPlayerId: string }) => {
      console.log('[SOCKET] playerReconnected');
      dispatch({ type: 'UPDATE_PLAYERS', payload: data.players });
    });

    newSocket.on('roomDiscarded', () => {
      console.log('[SOCKET] roomDiscarded');
      toast.error('The host has closed the room.');
      clearGameSession();
      dispatch({ type: 'RESET_GAME' });
    });

    // --- THE *ONLY* GAME LOGIC LISTENER ---
    newSocket.on('gameStateUpdate', (newGameState: GameState) => {
      console.log(`[SOCKET] gameStateUpdate. New Phase: ${newGameState.gamePhase}`);
      dispatch({ type: 'SET_GAME_STATE', payload: newGameState }); 
    });
    
    newSocket.on('chatMessage', (message: ChatMessage) => {
      dispatch({ type: 'ADD_CHAT_MESSAGE', payload: message });
    });
    
    newSocket.on('timerStarted', (data: { endTime: string }) => {
      console.log('[SOCKET] Timer started');
      dispatch({ type: 'SET_TIMER', payload: data });
    });
    
    return () => {
      console.log('[SOCKET] Cleaning up connection');
      newSocket.removeAllListeners();
      newSocket.disconnect();
      socketRef.current = null;
    };
  }, [user, saveGameSession, loadGameSession, clearGameSession]); // 'dispatch' is stable and not needed

  // Main effect to connect/disconnect socket
  useEffect(() => {
    if (user) {
      const cleanup = initializeSocket();
      return cleanup;
    } else {
      // User logged out
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      dispatch({ type: 'RESET_GAME' });
      clearGameSession();
    }
  }, [user, initializeSocket, clearGameSession]);
  
  // -------------------------------------------------------------------
  // 5. EMITTER FUNCTIONS (The "Mouth")
  // -------------------------------------------------------------------

  const createRoom = (settings: { rounds: number; roundsPerJudge: number }): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!user) return reject(new Error('User not authenticated'));
      
      socketRef.current?.once('roomCreated', (data: { roomData: GameState; sessionId: string }) => {
        dispatch({ type: 'SET_GAME_STATE', payload: data.roomData });
        saveGameSession(data.roomData.roomId, user.id, data.sessionId);
        console.log('[GAME] Room created, session saved.');
        resolve(data.roomData.roomId);
      });
      
      socketRef.current?.once('error', (data) => {
        reject(new Error(data.error));
      });

      safeEmit('createRoom', {
        rounds: settings.rounds,
        roundsPerJudge: settings.roundsPerJudge,
        host: { id: user.id, username: user.username, avatar: user.avatar },
      });
    });
  };

  const joinRoom = (roomId: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!user) return reject(new Error('User not authenticated'));

      const session = loadGameSession();
      
      socketRef.current?.once('roomJoined', () => {
        resolve();
      });
      socketRef.current?.once('error', (data) => {
        reject(new Error(data.error));
      });

      safeEmit('joinRoom', {
        roomId,
        player: { id: user.id, username: user.username, avatar: user.avatar, isReady: true },
        sessionId: session?.sessionId || null,
      });
    });
  };

  const leaveRoom = () => {
    if (state.gameState?.roomId && user) {
      safeEmit('leaveRoom', { roomId: state.gameState.roomId });

      clearGameSession();

      dispatch({ type: 'RESET_GAME' });
    }
  };

  const discardRoom = () => {
    if (state.gameState?.roomId) {
      safeEmit('discardRoom', { roomId: state.gameState.roomId });

      clearGameSession();
      dispatch({ type: 'RESET_GAME' });
    }
  };

  // --- Game Emitters ---
  const startGame = () => {
    if (state.gameState?.roomId) {
      safeEmit('startGame', { roomId: state.gameState.roomId });
    }
  };

  const selectJudge = (judgeId: string) => {
    if (state.gameState?.roomId) {
      safeEmit('hostSelectsJudge', { roomId: state.gameState.roomId, judgeId });
    }
  };

  const submitSentence = (sentence: string) => {
    if (state.gameState?.roomId) {
      safeEmit('submitSentence', { roomId: state.gameState.roomId, sentence });
    }
  };

  const selectMeme = (memeId: string) => {
    if (state.gameState?.roomId) {
      safeEmit('selectMeme', { roomId: state.gameState.roomId, memeId });
    }
  };

  const scoreMeme = (playerId: string, score: number) => {
    if (state.gameState?.roomId) {
      safeEmit('scoreMeme', { roomId: state.gameState.roomId, playerId, score });
    }
  };

  const requestNextRound = () => {
    if (state.gameState?.roomId) {
      safeEmit('nextRound', { roomId: state.gameState.roomId });
    }
  };

  const sendChatMessage = (message: string) => {
  if (state.gameState?.roomId && user) {
    const chatPayload = {
      id: `msg-${Date.now()}`,
      username: user.username,
      message,
      timestamp: Date.now(),
      userId: user.id,
      playerId: user.id,
    };
    safeEmit('chatMessage', { 
      roomId: state.gameState.roomId, 
      message: chatPayload 
    });
    
  }
};

  // -------------------------------------------------------------------
  // 6. CONTEXT VALUE & EXPORT
  // -------------------------------------------------------------------
  
  const contextValue: GameContextType = {
    // State
    connectionState: state.connectionState,
    gameState: state.gameState,
    chatMessages: state.chatMessages,
    isRestoring: state.isRestoring,
    isHost,
    isJudge,
    isConnected: state.connectionState === 'connected',
    socket: socketRef.current,

    // Emitters
    createRoom,
    joinRoom,
    leaveRoom,
    discardRoom,
    startGame,
    selectJudge,
    submitSentence,
    selectMeme,
    scoreMeme,
    requestNextRound,
    sendChatMessage,
  };

  return (
    <GameContext.Provider value={contextValue}>
      {children}
    </GameContext.Provider>
  );
};

export const useGame = (): GameContextType => {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};

export default GameProvider;