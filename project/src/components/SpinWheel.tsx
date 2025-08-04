import React, { useState, useEffect } from 'react';
import { Player } from '../context/GameContext';

type SpinWheelProps = {
  players: Player[];
  onSpinComplete: (player: Player) => void;
};

const SpinWheel: React.FC<SpinWheelProps> = ({ players, onSpinComplete }) => {
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

  const colors = [
    'bg-purple-500',
    'bg-pink-500',
    'bg-yellow-500',
    'bg-blue-500',
    'bg-green-500',
    'bg-red-500',
  ];

  const spinWheel = () => {
    if (spinning || players.length === 0) return;
    
    setSpinning(true);
    
    // Random number of rotations (5-10 full rotations)
    const rotations = 5 + Math.random() * 5;
    
    // Random position for the final selected player
    const selectedIndex = Math.floor(Math.random() * players.length);
    const selectedPlayer = players[selectedIndex];
    
    // Calculate the final rotation angle
    // Each player takes up (360 / players.length) degrees
    // We want to land in the middle of a player's segment
    const segmentSize = 360 / players.length;
    const segmentMiddle = segmentSize / 2;
    const finalAngle = 360 - (selectedIndex * segmentSize + segmentMiddle);
    
    // Total rotation will be the number of full rotations plus the final angle
    const totalRotation = rotations * 360 + finalAngle;
    
    setRotation(totalRotation);
    setSelectedPlayer(selectedPlayer);
    
    // Notify parent when spin is complete
    setTimeout(() => {
      setSpinning(false);
      onSpinComplete(selectedPlayer);
    }, 3000); // Match this with the CSS transition duration
  };

  useEffect(() => {
    // Auto-spin when component mounts
    if (players.length > 0 && !spinning && !selectedPlayer) {
      spinWheel();
    }
  }, [players]);

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-64 h-64 mb-8">
        <div 
          className="spinner-wheel"
          style={{ transform: `rotate(${rotation}deg)`, transition: spinning ? 'transform 3s cubic-bezier(0.2, 0.8, 0.2, 1)' : 'none' }}
        >
          {players.map((player, index) => {
            const angle = (index * 360) / players.length;
            const colorIndex = index % colors.length;
            
            return (
              <div 
                key={player.id}
                className={`spinner-segment ${colors[colorIndex]} text-white font-bold`}
                style={{ 
                  transform: `rotate(${angle}deg) skewY(-${90 - (360 / players.length)}deg)`,
                  width: '100%',
                  height: '100%',
                }}
              >
                <div 
                  className="absolute inset-0 flex items-center justify-center text-center p-2 pointer-events-none"
                  style={{ transform: `skewY(${90 - (360 / players.length)}deg) rotate(${angle + 90}deg)` }}
                >
                  <span className="text-xs truncate max-w-[70px]">{player.username}</span>
                </div>
              </div>
            );
          })}
        </div>
        <div className="spinner-pointer"></div>
      </div>
      
      {selectedPlayer && !spinning && (
        <div className="animate-scale-in text-center mb-4">
          <h3 className="text-xl font-bold text-white mb-2">The judge is:</h3>
          <div className="bg-purple-600 text-white text-2xl font-bold py-2 px-6 rounded-lg">
            {selectedPlayer.username}
          </div>
        </div>
      )}
      
      <button
        onClick={spinWheel}
        disabled={spinning || players.length === 0}
        className="mt-4 bg-pink-600 text-white py-2 px-6 rounded-lg disabled:opacity-50 hover:bg-pink-700 transition-colors"
      >
        {spinning ? 'Spinning...' : 'Spin Again'}
      </button>
    </div>
  );
};

export default SpinWheel;