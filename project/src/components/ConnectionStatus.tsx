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
          color: 'text-green-600',
          bgColor: 'bg-green-100',
          show: false // Don't show when connected
        };
      case 'connecting':
        return {
          icon: RefreshCw,
          text: 'Connecting...',
          color: 'text-blue-600',
          bgColor: 'bg-blue-100',
          show: true
        };
      case 'reconnecting':
        return {
          icon: RefreshCw,
          text: `Reconnecting... (${reconnectionAttempts}/${maxReconnectionAttempts})`,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-100',
          show: true
        };
      case 'disconnected':
        return {
          icon: WifiOff,
          text: 'Disconnected',
          color: 'text-red-600',
          bgColor: 'bg-red-100',
          show: true
        };
      case 'error':
        return {
          icon: AlertTriangle,
          text: 'Connection Error',
          color: 'text-red-600',
          bgColor: 'bg-red-100',
          show: true
        };
      default:
        return {
          icon: WifiOff,
          text: 'Unknown',
          color: 'text-gray-600',
          bgColor: 'bg-gray-100',
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
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -50 }}
        className="fixed top-4 right-4 z-50"
      >
        <div className={`flex items-center gap-2 px-4 py-2 rounded-full shadow-lg border ${config.bgColor} ${config.color}`}>
          <motion.div
            animate={connectionState === 'connecting' || connectionState === 'reconnecting' ? { rotate: 360 } : {}}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          >
            <Icon className="w-4 h-4" />
          </motion.div>
          <span className="text-sm font-medium">{config.text}</span>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ConnectionStatus;