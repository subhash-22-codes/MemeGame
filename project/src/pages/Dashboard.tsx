import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  PlusCircle, Users, LogOut, History, Trophy, 
  TrendingUp, Star, Calendar, Award, Loader2 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';

// --- Types for our Live Data ---
interface DashboardStats {
  totalGames: number;
  gamesHosted: number;
  totalWins: number;
  winRate: string;
  bestScoreDisplay: string;
  bestScoreTrend: string;
}

// --- Built-in Button Component (Sleek Card Aesthetic) ---
interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline';
  icon?: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  icon,
  onClick,
  disabled = false,
  className = '',
}) => {
  const baseClasses = "w-full sm:w-auto inline-flex items-center justify-center px-4 py-2.5 rounded-lg font-poppins font-semibold text-sm transition-all duration-200 border border-[#131010] focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed active:translate-y-[2px] active:shadow-none";
  
  const variantClasses = {
    primary: "bg-[#5F8B4C] text-white shadow-[3px_3px_0px_0px_#131010] hover:shadow-[4px_4px_0px_0px_#131010]",
    secondary: "bg-[#D98324] text-[#131010] shadow-[3px_3px_0px_0px_#131010] hover:shadow-[4px_4px_0px_0px_#131010]",
    outline: "bg-white text-[#131010] shadow-[3px_3px_0px_0px_#131010] hover:shadow-[4px_4px_0px_0px_#131010] hover:bg-[#FFDDAB]"
  };
  
  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {icon && <span className="mr-2 flex-shrink-0">{icon}</span>}
      <span className="truncate">{children}</span>
    </button>
  );
};

// --- Stats Card Component (Tight Bento Grid Aesthetic) ---
interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: string;
  trendDirection?: 'up' | 'down';
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, trend, trendDirection }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="bg-white rounded-xl p-4 sm:p-5 border border-[#131010] shadow-[3px_3px_0px_0px_#131010] hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_0px_#131010] transition-all duration-200 flex flex-col justify-between"
    >
      <div>
        <div className="flex flex-row items-center justify-between mb-3">
          <div className="p-2 bg-[#FFDDAB] border border-[#131010] rounded-lg shadow-[1px_1px_0px_0px_#131010]">
            {icon}
          </div>
        {trend && (
          <div
            className={`inline-flex items-center text-[9px] sm:text-[11px] font-bold px-1.5 sm:px-2 py-0.5 rounded-md border border-[#131010] bg-white ${
              trendDirection === 'up' ? 'text-[#5F8B4C]' : 'text-red-500'
            }`}
          >
            <TrendingUp
              size={10}
              className="mr-0.5 sm:mr-1 flex-shrink-0"
              strokeWidth={2.5}
            />
            <span className="whitespace-nowrap">
              {trend}
            </span>
          </div>
        )}
        </div>
        <div>
          <p className="font-poppins font-semibold text-[#131010]/60 text-[11px] sm:text-xs uppercase tracking-wider mb-0.5">{title}</p>
          <p className="font-poppins text-[#131010] text-2xl sm:text-3xl font-bold truncate">{value}</p>
        </div>
      </div>
    </motion.div>
  );
};

// --- Main Dashboard Component ---
const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  
  // ⭐️ Live Data State ⭐️
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalGames: 0,
    gamesHosted: 0,
    totalWins: 0,
    winRate: "0%",
    bestScoreDisplay: "0",
    bestScoreTrend: "0 Rounds"
  });

  const API_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch(
          `${API_URL}/api/user/dashboard-stats?userId=${user?.id}`
        );
        const result = await response.json();
        if (result.success) {
          setStats(result.stats);
        }
      } catch (err) {
        console.error("Failed to fetch user stats", err);
      } finally {
        setLoading(false);
      }
    };
    if (user?.id) fetchStats();
  }, [user?.id, API_URL]);

  const handleCreateGame = () => {
    toast.success('Setting up your game...');
    navigate('/create');
  };

  const handleJoinGame = () => {
    toast.success('Looking for games...');
    navigate('/join');
  };

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully!');
    navigate('/');
  };

  if (loading) {
  return (
    <div className="min-h-screen bg-[#FFDDAB] flex items-center justify-center p-6">
      {/* Small & Simple Bento Card */}
      <div className="w-full max-w-[220px] bg-white rounded-2xl border-2 border-[#131010] shadow-[4px_4px_0px_0px_#131010] p-6 text-center">
        
        {/* Tactile Icon Box */}
        <div className="w-10 h-10 bg-[#D98324] border-2 border-[#131010] shadow-[2px_2px_0px_0px_#131010] rounded-xl flex items-center justify-center mx-auto mb-4">
          <Loader2 className="w-5 h-5 text-[#131010] animate-spin" strokeWidth={3} />
        </div>

        {/* Very Simple Text */}
        <p className="font-poppins font-black text-[#131010] text-sm uppercase tracking-tight">
          Loading...
        </p>

        {/* Simple Sub-text */}
        <div className="mt-2 flex items-center justify-center gap-1.5">
          <span className="text-[10px] font-bold font-courier text-[#131010]/30 uppercase tracking-widest">
            Almost there
          </span>
        </div>
      </div>
    </div>
  );
}

  return (
    <div className="min-h-screen bg-[#FFDDAB] py-6 sm:py-8 px-4 sm:px-6 lg:px-8">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="max-w-6xl mx-auto space-y-5 sm:space-y-6"
      >
        {/* 1. Header Section */}
        <div className="bg-white rounded-xl p-5 sm:p-6 border border-[#131010] shadow-[4px_4px_0px_0px_#131010]">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
            <div className="flex flex-row items-center gap-4">
              <img 
                src={user?.avatar || `https://api.dicebear.com/7.x/fun-emoji/svg?seed=${user?.username}`} 
                alt="Profile" 
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl border border-[#131010] shadow-[2px_2px_0px_0px_#131010] bg-[#FFDDAB] object-cover flex-shrink-0"
              />
              <div className="flex flex-col justify-center">
                <h1 className="font-poppins text-[#131010] text-xl sm:text-2xl font-bold leading-tight">
                  Welcome back, {user?.username || 'Player'}
                </h1>
                <p className="font-poppins text-[#131010]/70 text-xs sm:text-sm font-medium mt-0.5">
                  Host a game or jump right into the lobby.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
              <Button variant="primary" icon={<PlusCircle size={16} strokeWidth={2.5} />} onClick={handleCreateGame}>
                Host Game
              </Button>
              <Button variant="secondary" icon={<Users size={16} strokeWidth={2.5} />} onClick={handleJoinGame}>
                Join Game
              </Button>
              <Button variant="outline" icon={<LogOut size={16} strokeWidth={2.5} />} onClick={handleLogout}>
                Log Out
              </Button>
            </div>
          </div>
        </div>

        {/* 2. Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard 
            title="Games Played" 
            value={stats.totalGames} 
            icon={<History className="w-4 h-4 sm:w-5 sm:h-5 text-[#131010]" strokeWidth={2.5} />} 
          />
          <StatCard 
            title="Times as Judge" 
            value={stats.gamesHosted} 
            icon={<Star className="w-4 h-4 sm:w-5 sm:h-5 text-[#D98324]" strokeWidth={2.5} />} 
          />
          <StatCard 
            title="Games Won" 
            value={stats.totalWins} 
            icon={<Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-[#5F8B4C]" strokeWidth={2.5} />} 
            trend={`Win Rate: ${stats.winRate}`}
            trendDirection="up"
          />
          <StatCard 
            title="Highest Score" 
            value={stats.bestScoreDisplay} 
            icon={<Award className="w-4 h-4 sm:w-5 sm:h-5 text-[#D98324]" strokeWidth={2.5} />} 
            trend={stats.bestScoreTrend}
            trendDirection="up"
          />
        </div>

        {/* 3. Featured Game Section */}
        <motion.div 
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="bg-[#5F8B4C] rounded-xl p-5 sm:p-6 border border-[#131010] shadow-[4px_4px_0px_0px_#131010] overflow-hidden"
        >
          <div className="flex flex-col md:flex-row items-center gap-5 sm:gap-6 relative z-10">
            <div className="w-full md:w-3/5">
              <div className="inline-block px-3 py-1 rounded-md bg-white border border-[#131010] text-[#131010] font-poppins font-bold text-[10px] sm:text-xs mb-3 shadow-[1px_1px_0px_0px_#131010]">
                Weekly Event
              </div>
              <h2 className="font-poppins text-white text-xl sm:text-2xl font-bold mb-2 leading-tight">
                The Weekend Meme Party
              </h2>
              <p className="font-poppins text-white/90 text-xs sm:text-sm mb-5 font-medium leading-relaxed max-w-lg">
                Connect with other players, drop your most unhinged memes, and compete for the top spot. 
              </p>
              <Button variant="secondary" icon={<Calendar size={16} strokeWidth={2.5} />} className="w-full sm:w-auto">
                Join the Party
              </Button>
            </div>
            <div className="w-full md:w-2/5">
              <div className="rounded-lg overflow-hidden border border-[#131010] shadow-[3px_3px_0px_0px_#131010] bg-white aspect-[21/9] md:aspect-video">
                <img 
                  src="/bulkmemes.jpg" 
                  alt="Game Night" 
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </motion.div>

        {/* 4. Player Trophies Section */}
        <motion.div 
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="bg-white rounded-xl p-5 sm:p-6 border border-[#131010] shadow-[4px_4px_0px_0px_#131010]"
        >
          <div className="flex items-center gap-2 mb-4 sm:mb-5">
            <Award className="w-5 h-5 sm:w-6 sm:h-6 text-[#D98324]" strokeWidth={2.5} />
            <h2 className="font-poppins text-[#131010] text-lg sm:text-xl font-bold">
              Player Trophies
            </h2>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <div className="p-4 bg-[#FFDDAB] border border-[#131010] shadow-[2px_2px_0px_0px_#131010] rounded-lg text-left sm:text-center active:translate-y-[1px] active:shadow-none transition-all flex sm:flex-col items-center sm:justify-center gap-4 sm:gap-0">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white border border-[#131010] rounded-lg shadow-[1px_1px_0px_0px_#131010] flex items-center justify-center sm:mb-3 flex-shrink-0">
                <Trophy className="w-5 h-5 text-[#D98324]" strokeWidth={2.5} />
              </div>
              <div>
                <h3 className="font-poppins text-[#131010] text-sm sm:text-base font-bold mb-0.5">
                  {stats.totalWins > 5 ? 'Champion' : 'First Win'}
                </h3>
                <p className="font-poppins text-[#131010]/80 font-medium text-[11px] sm:text-xs">
                  Won {stats.totalWins} games total
                </p>
              </div>
            </div>
            
            <div className="p-4 bg-white border border-[#131010] shadow-[2px_2px_0px_0px_#131010] rounded-lg text-left sm:text-center active:translate-y-[1px] active:shadow-none transition-all flex sm:flex-col items-center sm:justify-center gap-4 sm:gap-0">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#FFDDAB] border border-[#131010] rounded-lg shadow-[1px_1px_0px_0px_#131010] flex items-center justify-center sm:mb-3 flex-shrink-0">
                <Star className="w-5 h-5 text-[#5F8B4C]" strokeWidth={2.5} />
              </div>
              <div>
                <h3 className="font-poppins text-[#131010] text-sm sm:text-base font-bold mb-0.5">Rising Star</h3>
                <p className="font-poppins text-[#131010]/80 font-medium text-[11px] sm:text-xs">Played {stats.totalGames} games</p>
              </div>
            </div>
            
            <div className="p-4 bg-white border border-[#131010] shadow-[2px_2px_0px_0px_#131010] rounded-lg text-left sm:text-center active:translate-y-[1px] active:shadow-none transition-all flex sm:flex-col items-center sm:justify-center gap-4 sm:gap-0">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#FFDDAB] border border-[#131010] rounded-lg shadow-[1px_1px_0px_0px_#131010] flex items-center justify-center sm:mb-3 flex-shrink-0">
                <Users className="w-5 h-5 text-[#D98324]" strokeWidth={2.5} />
              </div>
              <div>
                <h3 className="font-poppins text-[#131010] text-sm sm:text-base font-bold mb-0.5">Social Player</h3>
                <p className="font-poppins text-[#131010]/80 font-medium text-[11px] sm:text-xs">Active community member</p>
              </div>
            </div>
          </div>
        </motion.div>

      </motion.div>
    </div>
  );
};

export default Dashboard;