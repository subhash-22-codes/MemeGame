import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wifi, WifiOff, RefreshCw, AlertTriangle } from 'lucide-react';
import { useGame } from '../context/GameContext';

const ConnectionStatus: React.FC = () => {
  const { connectionState, reconnectionAttempts, maxReconnectionAttempts } = useGame();

  const getStatusConfig = () => {
    switch (connectionState) {
      case 'connected':
        return {
          icon: Wifi,
          text: 'Connected',
          borderColor: 'border-[#5F8B4C]',
          bgColor: 'bg-white',
          textColor: 'text-[#5F8B4C]',
          show: false 
        };
      case 'connecting':
        return {
          icon: RefreshCw,
          text: 'Connecting',
          borderColor: 'border-[#131010]',
          bgColor: 'bg-white',
          textColor: 'text-[#131010]',
          show: true
        };
      case 'reconnecting':
        return {
          icon: RefreshCw,
          text: `Reconnecting`,
          detail: `${reconnectionAttempts}/${maxReconnectionAttempts}`,
          borderColor: 'border-[#131010]',
          bgColor: 'bg-[#FFDDAB]',
          textColor: 'text-[#131010]',
          show: true
        };
      case 'disconnected':
        return {
          icon: WifiOff,
          text: 'Disconnected',
          borderColor: 'border-red-500',
          bgColor: 'bg-white',
          textColor: 'text-red-500',
          show: true
        };
      case 'error':
        return {
          icon: AlertTriangle,
          text: 'System Error',
          borderColor: 'border-red-500',
          bgColor: 'bg-white',
          textColor: 'text-red-500',
          show: true
        };
      default:
        return {
          icon: WifiOff,
          text: 'Unknown',
          borderColor: 'border-[#131010]/20',
          bgColor: 'bg-gray-50',
          textColor: 'text-gray-500',
          show: true
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  if (!config.show) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="fixed top-4 right-4 z-[100]"
      >
        <div className={`
          flex items-center gap-2.5 px-3 py-2 rounded-xl border-2 shadow-[3px_3px_0px_0px_#131010]
          ${config.bgColor} ${config.borderColor} ${config.textColor}
        `}>
          <motion.div
            animate={connectionState === 'connecting' || connectionState === 'reconnecting' ? { rotate: 360 } : {}}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="shrink-0"
          >
            <Icon className="w-3.5 h-3.5" strokeWidth={3} />
          </motion.div>
          
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] sm:text-xs font-black font-poppins uppercase tracking-wider">
              {config.text}
            </span>
            {config.detail && (
              <span className="text-[9px] font-bold font-courier bg-[#131010]/10 px-1.5 py-0.5 rounded border border-[#131010]/10">
                {config.detail}
              </span>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ConnectionStatus;