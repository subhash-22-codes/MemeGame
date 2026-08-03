import React from 'react';
import type { Player } from '../../context/GameContext'; // Get types from context
import { Crown, Dices } from 'lucide-react';

// ⭐️ FIX: Added the missing props
type JudgeAssignmentProps = {
  currentJudge: Player | undefined | null;
  roundNumber: number;
  totalRounds: number;
  players: Player[];
  onJudgeSelected: (judgeId: string) => void; // Function to call when host picks
  isHost: boolean;
  isCurrentUserJudge: boolean; // We get this but don't need to use it
};

const JudgeAssignment: React.FC<JudgeAssignmentProps> = ({
  players,
  onJudgeSelected,
  isHost,
  currentJudge, // Now we accept this prop
}) => {
  // --- Host Logic ---
  const handleSpinWheel = () => {
    // Select a random player who is connected
    const connectedPlayers = players.filter(p => p.isConnected);
    if (connectedPlayers.length === 0) return;
    
    const randomPlayer = connectedPlayers[Math.floor(Math.random() * connectedPlayers.length)];
    onJudgeSelected(randomPlayer.id);
  };

  const handleAssignManually = (playerId: string) => {
    onJudgeSelected(playerId);
  };

  // --- Host View ---
  // ⭐️ FIX: Added check for 'currentJudge'
  // If the host is just waiting for their own pick, show the UI
  if (isHost && !currentJudge) {
    return (
      <div className="bg-white/95 backdrop-blur-md rounded-2xl p-6 lg:p-8 shadow-xl border border-white/30 text-center max-w-lg mx-auto">
        <Crown className="w-16 h-16 text-[#5F8B4C] mx-auto mb-4" />
        <h2 className="text-2xl lg:text-3xl font-bold text-slate-800 mb-3">
          Select This Round's Judge
        </h2>
        <p className="text-slate-500 font-mono text-sm lg:text-base mb-6">
          You are the host. Choose the next judge.
        </p>

        {/* --- Option 1: Spin the Wheel --- */}
        <button
          onClick={handleSpinWheel}
          className="w-full flex items-center justify-center gap-3 p-4 bg-gradient-to-br from-[#5F8B4C] to-[#7BA05C] text-white rounded-xl shadow-lg font-mono font-bold text-lg transition-all duration-300 hover:scale-105"
        >
          <Dices className="w-6 h-6" />
          Spin the Wheel
        </button>

        <div className="my-6 flex items-center">
          <div className="flex-grow border-t border-gray-300"></div>
          <span className="flex-shrink mx-4 text-gray-500 font-mono text-sm">OR</span>
          <div className="flex-grow border-t border-gray-300"></div>
        </div>

        {/* --- Option 2: Assign Manually --- */}
        <h3 className="text-lg font-bold text-slate-800 mb-4 font-mono">
          Assign Manually
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {players.map((player) => (
            <button
              key={player.id}
              onClick={() => handleAssignManually(player.id)}
              disabled={!player.isConnected}
              className="p-3 bg-white/80 rounded-lg shadow-md border border-white/50 transition-all duration-200 hover:bg-white hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <img
                src={player.avatar || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${player.username}`}
                alt={player.username}
                className="w-12 h-12 rounded-full mx-auto mb-2 border-2 border-[#5F8B4C]/30"
              />
              <span className="text-sm font-mono font-medium text-slate-700 truncate w-full block">
                {player.username}
              </span>
              {!player.isConnected && (
                 <span className="text-xs text-red-500 font-mono block">Offline</span>
              )}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // --- Player View (or Host after picking) ---
  return (
    <div className="bg-white/95 backdrop-blur-md rounded-2xl p-6 lg:p-8 shadow-xl border border-white/30 text-center max-w-lg mx-auto">
      <div className="w-16 h-16 border-4 border-[#5F8B4C]/30 border-t-[#5F8B4C] rounded-full animate-spin mx-auto mb-6"></div>
      <h2 className="text-xl lg:text-2xl font-bold text-slate-800 mb-3">
        Waiting for the Host
      </h2>
      <p className="text-slate-500 font-mono text-sm lg:text-base">
        The host is selecting this round's judge...
      </p>
    </div>
  );
};

export default JudgeAssignment;