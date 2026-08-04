import React, { useState, useEffect } from 'react';
import { Player } from '../../context/GameContext';
import { Sparkles, Play } from 'lucide-react';

interface PromptSpinnerProps {
  players: Player[];
  wheelSpinnerId?: string;
  promptCreator?: Player;
  wheelSpun?: boolean;
  spinStartTime?: number | null;
  currentUserId: string;
  onSpin: () => void;
}

const COLORS = [
  '#5F8B4C',
  '#D98324',
  '#8B5CF6',
  '#EC4899',
  '#3B82F6',
  '#EF4444',
  '#EAB308',
  '#14B8A6',
  '#F97316',
  '#6366F1',
];

export const PromptSpinner: React.FC<PromptSpinnerProps> = ({
  players,
  wheelSpinnerId,
  promptCreator,
  wheelSpun,
  spinStartTime,
  currentUserId,
  onSpin,
}) => {
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [showWinner, setShowWinner] = useState(false);

  const activePlayers = players.filter(p => p.isConnected !== false);
  const isMyTurnToSpin = currentUserId === wheelSpinnerId;
  const spinnerPlayer = players.find(p => p.id === wheelSpinnerId);

  useEffect(() => {
    if (wheelSpun && promptCreator) {
      const targetIndex = Math.max(
        0,
        activePlayers.findIndex(p => p.id === promptCreator.id)
      );
      const numPlayers = Math.max(1, activePlayers.length);
      const segmentSize = 360 / numPlayers;
      const segmentMiddle = segmentSize / 2;
      const targetAngle = (360 - (targetIndex * segmentSize + segmentMiddle)) % 360;
      const totalRotations = 5 * 360 + targetAngle;

      setRotation(totalRotations);
      setSpinning(true);
      setShowWinner(false);

      const now = Date.now();
      const elapsed = spinStartTime ? Math.max(0, now - spinStartTime) : 0;
      const remainingTime = Math.max(0, 3500 - elapsed);

      const timer = setTimeout(() => {
        setSpinning(false);
        setShowWinner(true);
      }, remainingTime);

      return () => clearTimeout(timer);
    } else {
      setSpinning(false);
      setShowWinner(false);
      setRotation(0);
    }
  }, [wheelSpun, promptCreator, activePlayers.length, spinStartTime]);

  // Helper to generate SVG arc path for a wedge
  const getSlicePath = (index: number, total: number, radius: number): string => {
    if (total <= 1) {
      return `M -${radius} 0 A ${radius} ${radius} 0 1 1 ${radius} 0 A ${radius} ${radius} 0 1 1 -${radius} 0 Z`;
    }
    const angle1 = (index * 360) / total;
    const angle2 = ((index + 1) * 360) / total;
    const rad1 = (angle1 * Math.PI) / 180;
    const rad2 = (angle2 * Math.PI) / 180;

    const x1 = radius * Math.sin(rad1);
    const y1 = -radius * Math.cos(rad1);
    const x2 = radius * Math.sin(rad2);
    const y2 = -radius * Math.cos(rad2);

    const largeArcFlag = angle2 - angle1 > 180 ? 1 : 0;

    return `M 0 0 L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
  };

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-10 border-4 border-[#131010] shadow-[8px_8px_0px_0px_#131010] text-center max-w-2xl mx-auto my-4 overflow-hidden relative">
      {/* Top Banner */}
      <div className="inline-flex items-center justify-center gap-2 bg-[#FFDDAB] px-4 py-1.5 rounded-full border-2 border-[#131010] font-black text-xs sm:text-sm text-[#131010] uppercase tracking-widest mb-6">
        <Sparkles className="w-4 h-4 text-[#D98324]" strokeWidth={2.5} />
        Prompt Creator Selection
      </div>

      <h2 className="text-2xl sm:text-4xl font-black text-[#131010] mb-2 font-poppins">
        Who Creates The Next Prompt?
      </h2>
      <p className="text-[#131010]/70 font-medium text-sm sm:text-base mb-8">
        Every round, a player is selected to craft a creative meme sentence!
      </p>

      {/* Wheel Area */}
      <div className="relative w-64 h-64 sm:w-80 sm:h-80 mx-auto mb-8 flex items-center justify-center">
        {/* Pointer Triangle at Top */}
        <div className="absolute -top-4 z-20 w-0 h-0 border-l-[16px] border-l-transparent border-r-[16px] border-r-transparent border-t-[28px] border-t-[#131010] filter drop-shadow-md"></div>

        {/* Outer Wheel Rim & SVG Wedges */}
        <div
          className="w-full h-full rounded-full border-8 border-[#131010] shadow-[0px_10px_25px_rgba(0,0,0,0.2)] overflow-hidden relative bg-[#131010]"
          style={{
            transform: `rotate(${rotation}deg)`,
            transition: spinning
              ? 'transform 3.5s cubic-bezier(0.15, 0.85, 0.25, 1)'
              : 'none',
          }}
        >
          <svg viewBox="-150 -150 300 300" className="w-full h-full overflow-visible">
            {activePlayers.map((player, idx) => {
              const total = Math.max(1, activePlayers.length);
              const color = COLORS[idx % COLORS.length];
              const slicePath = getSlicePath(idx, total, 148);

              // Centroid for text placement
              const midAngle = (idx + 0.5) * (360 / total);
              const radMid = (midAngle * Math.PI) / 180;
              const dist = total > 6 ? 85 : 90;
              const cx = dist * Math.sin(radMid);
              const cy = -dist * Math.cos(radMid);
              const textRotate = midAngle;

              return (
                <g key={player.id}>
                  <path
                    d={slicePath}
                    fill={color}
                    stroke="#131010"
                    strokeWidth="2"
                  />
                  {/* Username Group */}
                  <g
                    transform={`translate(${cx}, ${cy}) rotate(${textRotate})`}
                  >
                    {/* Background Pill for text legibility */}
                    <rect
                      x="-38"
                      y="-12"
                      width="76"
                      height="24"
                      rx="12"
                      fill="#131010"
                      fillOpacity="0.85"
                    />
                    <text
                      x="0"
                      y="4"
                      textAnchor="middle"
                      fill="#FFFFFF"
                      fontSize={total > 6 ? "9" : "11"}
                      fontWeight="900"
                      fontFamily="Poppins, sans-serif"
                    >
                      {player.username.slice(0, 8)}
                    </text>
                  </g>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Center Cap */}
        <div className="absolute z-10 w-16 h-16 sm:w-20 sm:h-20 bg-white rounded-full border-4 border-[#131010] shadow-[2px_2px_0px_0px_#131010] flex items-center justify-center">
          <span className="text-2xl">🎡</span>
        </div>
      </div>

      {/* Winner Reveal Badge */}
      {showWinner && promptCreator && (
        <div className="animate-bounce bg-[#5F8B4C] text-white p-4 rounded-2xl border-4 border-[#131010] shadow-[4px_4px_0px_0px_#131010] mb-6">
          <div className="text-xs uppercase font-bold tracking-widest mb-1 text-white/90">
            Selected Prompt Creator
          </div>
          <div className="text-2xl sm:text-3xl font-black">
            ✨ {promptCreator.username} ✨
          </div>
        </div>
      )}

      {/* Interactive Controls */}
      {!wheelSpun && (
        <div className="mt-4">
          {isMyTurnToSpin ? (
            <button
              onClick={onSpin}
              disabled={spinning}
              className="w-full sm:w-auto px-8 py-4 bg-[#5F8B4C] hover:bg-[#4d733d] active:translate-y-1 text-white font-black text-lg sm:text-xl rounded-2xl border-4 border-[#131010] shadow-[6px_6px_0px_0px_#131010] transition-all flex items-center justify-center gap-3 mx-auto cursor-pointer"
            >
              <Play className="w-6 h-6 fill-current" />
              SPIN THE WHEEL 🎡
            </button>
          ) : (
            <div className="bg-[#FFDDAB] border-2 border-[#131010] rounded-2xl p-4 inline-block font-bold text-sm sm:text-base text-[#131010]">
              Waiting for{' '}
              <span className="underline font-black">
                {spinnerPlayer?.username || 'the host'}
              </span>{' '}
              to spin the wheel of chaos...
            </div>
          )}
        </div>
      )}

      {spinning && (
        <div className="text-lg font-black text-[#D98324] animate-pulse">
          Spinning the wheel of fate... good luck to the squad! 🎡
        </div>
      )}
    </div>
  );
};
