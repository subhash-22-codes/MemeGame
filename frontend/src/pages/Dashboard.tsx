import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  PlusCircle, LogOut, History, Trophy,
  TrendingUp, Award, Loader2, UserPlus,
  Play, Eye, X, Calendar, Hash, Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useGame } from '../context/GameContext';
import { toast } from 'react-hot-toast';
import AuthModal from '../components/AuthModal';

// --- Types for our Live Data ---
interface DashboardStats {
  totalGames: number;
  gamesHosted: number;
  promptsCreated?: number;
  totalWins: number;
  winRate: string;
  bestScoreDisplay: string;
  bestScoreTrend: string;
}

interface MatchHistoryItem {
  id: string;
  roomId: string;
  score: number;
  isWinner: boolean;
  wasHost: boolean;
  date: string;
  totalRounds?: number;
  winners?: { id: string; username: string; score: number; avatar?: string }[];
  bestSubmission?: { username: string; memeUrl?: string; prompt?: string; score: number };
  players?: { id: string; username: string; score: number; avatar?: string }[];
}

// --- Built-in Button Component (Sleek Card Aesthetic) ---
interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline';
  icon?: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  icon,
  onClick,
  disabled = false,
  className = '',
  type = 'button',
}) => {
  const baseClasses = "w-full sm:w-auto inline-flex items-center justify-center px-4 py-2.5 rounded-lg font-poppins font-semibold text-sm transition-all duration-200 border border-[#131010] focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed active:translate-y-[2px] active:shadow-none";

  const variantClasses = {
    primary: "bg-[#5F8B4C] text-white shadow-[3px_3px_0px_0px_#131010] hover:shadow-[4px_4px_0px_0px_#131010]",
    secondary: "bg-[#D98324] text-[#131010] shadow-[3px_3px_0px_0px_#131010] hover:shadow-[4px_4px_0px_0px_#131010]",
    outline: "bg-white text-[#131010] shadow-[3px_3px_0px_0px_#131010] hover:shadow-[4px_4px_0px_0px_#131010] hover:bg-[#FFDDAB]"
  };

  return (
    <button
      type={type}
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
              className={`inline-flex items-center text-[9px] sm:text-[11px] font-bold px-1.5 sm:px-2 py-0.5 rounded-md border border-[#131010] bg-white ${trendDirection === 'up' ? 'text-[#5F8B4C]' : 'text-red-500'
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
  const { user, logout, isGuest } = useAuth();
  const { joinRoom } = useGame();

  const [loading, setLoading] = useState(!isGuest);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    totalGames: 0,
    gamesHosted: 0,
    promptsCreated: 0,
    totalWins: 0,
    winRate: "0%",
    bestScoreDisplay: "0",
    bestScoreTrend: "0 Rounds"
  });
  const [history, setHistory] = useState<MatchHistoryItem[]>([]);
  const [joinCode, setJoinCode] = useState('');
  const [isJoiningRoom, setIsJoiningRoom] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<MatchHistoryItem | null>(null);

  const API_URL = import.meta.env.VITE_API_URL;

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem("token") || "";
        const response = await fetch(
          `${API_URL}/api/user/dashboard-stats?userId=${user?.id}`,
          {
            headers: token ? { "Authorization": `Bearer ${token}` } : {}
          }
        );
        const result = await response.json();
        if (result.success) {
          setStats(result.stats);
          if (Array.isArray(result.history)) {
            setHistory(result.history);
          }
        }
      } catch (err) {
        console.error("Failed to fetch user stats", err);
      } finally {
        setLoading(false);
      }
    };
    if (user?.id) fetchStats();
    else setLoading(false);
  }, [user?.id, API_URL]);

  const handleCreateGame = () => {
    toast.success('Setting up your game...');
    navigate('/create');
  };

  // Pre-navigation room validation as requested by leadership
  const handleJoinWithCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const code = joinCode.trim().toUpperCase();
    if (code.length !== 6) {
      toast.error("Room code must be 6 characters long.");
      return;
    }
    setIsJoiningRoom(true);
    try {
      await joinRoom(code);
      toast.success("Joined room successfully!");
      navigate(`/room/${code}`);
    } catch (err: any) {
      console.error("Failed to join room:", err);
      toast.error(err?.message || "Room not found or unavailable. Check the code and try again.");
    } finally {
      setIsJoiningRoom(false);
    }
  };

  const handleLogout = () => {
    logout();
    toast.success(isGuest ? 'Guest session ended!' : 'Logged out successfully!');
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFDDAB] flex items-center justify-center p-6">
        <div className="w-full max-w-[220px] bg-white rounded-2xl border-2 border-[#131010] shadow-[4px_4px_0px_0px_#131010] p-6 text-center">
          <div className="w-10 h-10 bg-[#D98324] border-2 border-[#131010] shadow-[2px_2px_0px_0px_#131010] rounded-xl flex items-center justify-center mx-auto mb-4">
            <Loader2 className="w-5 h-5 text-[#131010] animate-spin" strokeWidth={3} />
          </div>
          <p className="font-poppins font-black text-[#131010] text-sm uppercase tracking-tight">
            Loading...
          </p>
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
      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
        defaultIsRegister={true} 
      />
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
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="font-poppins font-bold text-[#131010] text-xl sm:text-2xl truncate">
                    Welcome back, {user?.username}!
                  </h1>
                  {isGuest && (
                    <span className="px-2 py-0.5 rounded-md bg-[#D98324] text-white font-poppins font-bold text-[10px] uppercase border border-[#131010]">
                      Guest
                    </span>
                  )}
                </div>
                <p className="font-poppins text-[#131010]/70 text-xs sm:text-sm mt-0.5 font-medium">
                  {isGuest
                    ? 'Your stats are saved temporarily for this session'
                    : 'Ready to break the internet and compete for the funniest meme?'
                  }
                </p>
              </div>
            </div>

            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 sm:gap-3">
              <Button variant="outline" icon={<LogOut size={16} strokeWidth={2.5} />} onClick={handleLogout}>
                {isGuest ? 'Exit Session' : 'Log Out'}
              </Button>
            </div>
          </div>
        </div>

        {/* 2. Hero Launchpad ("READY FOR THE NEXT LAUGH?") */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {/* Host Party Room Card */}
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="bg-[#5F8B4C] rounded-xl p-5 sm:p-6 border border-[#131010] shadow-[4px_4px_0px_0px_#131010] flex flex-col justify-between text-white relative overflow-hidden group"
          >
            <div className="relative z-10">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white text-[#131010] font-poppins font-bold text-[10px] sm:text-xs mb-3 border border-[#131010] shadow-[2px_2px_0px_0px_#131010]">
                <Sparkles className="w-3.5 h-3.5 text-[#D98324]" />
                <span>START A PARTY</span>
              </div>
              <h2 className="font-poppins text-xl sm:text-2xl font-bold mb-1 leading-tight">
                Start a Party
              </h2>
              <p className="font-poppins text-white/90 text-xs sm:text-sm font-medium mb-5 max-w-sm">
                Create a private room, spin the prompt wheel, and invite your friends via a 6-character code.
              </p>
            </div>
            <div className="relative z-10">
              <Button
                variant="outline"
                icon={<PlusCircle size={18} strokeWidth={2.5} className="text-[#5F8B4C]" />}
                onClick={handleCreateGame}
                className="w-full sm:w-auto !bg-white !text-[#131010] hover:!bg-[#FFDDAB]"
              >
                Start a Party
              </Button>
            </div>
          </motion.div>

          {/* Join With Room Code Card (Pre-navigation validation) */}
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.05 }}
            className="bg-white rounded-xl p-5 sm:p-6 border border-[#131010] shadow-[4px_4px_0px_0px_#131010] flex flex-col justify-between"
          >
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#FFDDAB] text-[#131010] font-poppins font-bold text-[10px] sm:text-xs mb-3 border border-[#131010] shadow-[2px_2px_0px_0px_#131010]">
                <Hash className="w-3.5 h-3.5 text-[#D98324]" />
                <span>SQUAD INVITE CODE</span>
              </div>
              <h2 className="font-poppins text-[#131010] text-xl sm:text-2xl font-bold mb-1 leading-tight">
                Got a Party Code?
              </h2>
              <p className="font-poppins text-[#131010]/70 text-xs sm:text-sm font-medium mb-4">
                Enter your friend's 6-character code to jump straight into their party.
              </p>
            </div>

            <form onSubmit={handleJoinWithCode} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              <input
                type="text"
                maxLength={6}
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="E.G. ABCD12"
                className="flex-1 px-4 py-2.5 rounded-lg border-2 border-[#131010] bg-white text-[#131010] font-courier font-black text-base sm:text-lg tracking-widest uppercase placeholder:text-[#131010]/50 placeholder:font-bold focus:outline-none focus:border-[#D98324] focus:ring-4 focus:ring-[#D98324]/25 shadow-[2px_2px_0px_0px_#131010] transition-all"
              />
              <Button
                type="submit"
                variant="secondary"
                disabled={isJoiningRoom || joinCode.trim().length !== 6}
                icon={isJoiningRoom ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                className="w-full sm:w-auto"
              >
                {isJoiningRoom ? 'Joining...' : 'Join Squad'}
              </Button>
            </form>
          </motion.div>
        </div>

        {/* 3. Arcade Clout Bar (3-Metric Strip - Purged Prompts Created & RNG stats) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <StatCard
            title="Parties Raged"
            value={stats.totalGames}
            icon={<History className="w-4 h-4 sm:w-5 sm:h-5 text-[#131010]" strokeWidth={2.5} />}
          />
          <StatCard
            title="Victories"
            value={stats.totalWins}
            icon={<Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-[#5F8B4C]" strokeWidth={2.5} />}
            trend={`Win Rate: ${stats.winRate}`}
            trendDirection="up"
          />
          <StatCard
            title="Peak Clout"
            value={stats.bestScoreDisplay}
            icon={<Award className="w-4 h-4 sm:w-5 sm:h-5 text-[#D98324]" strokeWidth={2.5} />}
            trend={stats.bestScoreTrend}
            trendDirection="up"
          />
        </div>

        {/* 4. Recent Match Logs Section (Real Gameplay Metrics) */}
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
          className="bg-white rounded-xl p-5 sm:p-6 border border-[#131010] shadow-[4px_4px_0px_0px_#131010]"
        >
          <div className="flex items-center justify-between mb-4 sm:mb-5">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 sm:w-6 sm:h-6 text-[#131010]" strokeWidth={2.5} />
              <h2 className="font-poppins text-[#131010] text-lg sm:text-xl font-bold">
                Party Flashbacks
              </h2>
            </div>
            <span className="font-poppins text-xs font-semibold text-[#131010]/60 uppercase">
              Last 5 Parties
            </span>
          </div>

          {history.length === 0 ? (
            <div className="text-center py-8 bg-[#FFDDAB]/30 rounded-xl border border-dashed border-[#131010]">
              <History className="w-8 h-8 text-[#131010]/40 mx-auto mb-2" strokeWidth={2} />
              <p className="font-poppins font-bold text-[#131010] text-sm mb-1">No Party Flashbacks Yet</p>
              <p className="font-poppins text-[#131010]/70 text-xs max-w-xs mx-auto">
                Gather the squad above to start creating hilarious meme moments and make history!
              </p>
            </div>
          ) : (
            <div className="space-y-2.5 sm:space-y-3">
              {history.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 sm:p-4 rounded-lg bg-white border border-[#131010] shadow-[2px_2px_0px_0px_#131010] hover:bg-[#FFDDAB]/20 transition-all gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#FFDDAB] border border-[#131010] flex items-center justify-center flex-shrink-0">
                      {item.isWinner ? (
                        <Trophy className="w-5 h-5 text-[#5F8B4C]" strokeWidth={2.5} />
                      ) : (
                        <Award className="w-5 h-5 text-[#D98324]" strokeWidth={2.5} />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-courier font-bold text-[#131010] text-sm sm:text-base">
                          {item.roomId || 'ROOM'}
                        </span>
                        {item.wasHost && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-[#D98324] text-white border border-[#131010]">
                            Host
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs font-poppins font-bold text-[#131010]">
                        <Calendar className="w-3.5 h-3.5 inline text-[#D98324]" />
                        <span>{item.date}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-2 sm:pt-0 border-[#131010]/10">
                    <div className="text-left sm:text-right">
                      <span className="text-xs font-poppins font-semibold text-[#131010]/60 block uppercase">
                        Score
                      </span>
                      <span className="font-poppins font-bold text-base sm:text-lg text-[#131010]">
                        {item.score} pts
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2.5 py-1 rounded-md text-xs font-poppins font-bold border border-[#131010] ${item.isWinner
                          ? 'bg-[#5F8B4C] text-white shadow-[1px_1px_0px_0px_#131010]'
                          : 'bg-white text-[#131010]'
                          }`}
                      >
                        {item.isWinner ? '🥇 Champion' : '🔥 Contender'}
                      </span>
                      <Button
                        variant="outline"
                        icon={<Eye size={14} strokeWidth={2.5} />}
                        onClick={() => setSelectedMatch(item)}
                        className="!px-3 !py-1.5 !text-xs"
                      >
                        Relive Party
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* 5. Guest Upgrade CTA */}
        {isGuest && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="bg-[#131010] rounded-xl p-5 sm:p-6 border border-[#131010] shadow-[4px_4px_0px_0px_#131010] overflow-hidden"
          >
            <div className="flex flex-col md:flex-row items-center gap-5 sm:gap-6 relative z-10">
              <div className="w-full md:w-3/5">
                <div className="inline-block px-3 py-1 rounded-md bg-[#D98324] border border-white/20 text-white font-poppins font-bold text-[10px] sm:text-xs mb-3 shadow-[1px_1px_0px_0px_rgba(255,255,255,0.2)]">
                  Upgrade Available
                </div>
                <h2 className="font-poppins text-white text-xl sm:text-2xl font-bold mb-2 leading-tight">
                  Create an Account
                </h2>
                <p className="font-poppins text-white/80 text-xs sm:text-sm mb-5 font-medium leading-relaxed max-w-lg">
                  Your guest session expires in 24 hours. Create a free account to save your party stats, track your wins, and build your meme reputation.
                </p>
                <Button
                  variant="secondary"
                  icon={<UserPlus size={16} strokeWidth={2.5} />}
                  onClick={() => {
                    setShowAuthModal(true);
                  }}
                  className="w-full sm:w-auto"
                >
                  Create Account
                </Button>
              </div>
              <div className="w-full md:w-2/5 flex justify-center">
                <div className="bg-white/5 border border-white/10 rounded-xl p-6 text-center">
                  <div className="text-4xl mb-2">🏆</div>
                  <p className="font-poppins text-white/60 text-xs font-medium">Track wins, earn trophies, climb leaderboards</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

      </motion.div>

      {/* --- Party Flashback Modal (Replaced invoice-style "Match Summary") --- */}
      <AnimatePresence>
        {selectedMatch && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white rounded-2xl border-2 border-[#131010] shadow-[6px_6px_0px_0px_#131010] p-6 max-h-[85vh] overflow-y-auto relative"
            >
              <div className="flex items-center justify-between border-b-2 border-[#131010] pb-4 mb-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-[#D98324]" />
                  <h3 className="font-poppins font-bold text-lg text-[#131010]">
                    Party Flashback
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedMatch(null)}
                  className="w-8 h-8 rounded-lg border border-[#131010] flex items-center justify-center hover:bg-[#FFDDAB]"
                >
                  <X className="w-4 h-4 text-[#131010]" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-[#FFDDAB] border border-[#131010] shadow-[2px_2px_0px_0px_#131010] flex items-center justify-between">
                  <div>
                    <span className="text-xs font-poppins font-bold text-[#131010]/60 uppercase block">Party Code</span>
                    <span className="text-xl font-courier font-black text-[#131010]">{selectedMatch.roomId}</span>
                  </div>
                  <span className="text-xs font-poppins font-black px-2.5 py-1 rounded-md bg-white text-[#131010] border border-[#131010] shadow-[1px_1px_0px_0px_#131010]">
                    {selectedMatch.date}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-white border border-[#131010] rounded-lg">
                    <span className="text-xs font-poppins text-[#131010]/60 block uppercase">Peak Clout</span>
                    <span className="text-xl font-poppins font-bold text-[#131010]">{selectedMatch.score} pts</span>
                  </div>
                  <div className="p-3 bg-white border border-[#131010] rounded-lg">
                    <span className="text-xs font-poppins text-[#131010]/60 block uppercase">Squad Rank</span>
                    <span className="text-base font-poppins font-bold text-[#5F8B4C]">
                      {selectedMatch.isWinner ? '🥇 Champion' : '🔥 Contender'}
                    </span>
                  </div>
                </div>

                {/* --- Version 2: Full Match History (Meme of the Match) --- */}
                {selectedMatch.bestSubmission ? (
                  <div className="p-3 bg-white rounded-xl border-2 border-[#131010] shadow-[2px_2px_0px_0px_#131010]">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-poppins font-black text-[#D98324] uppercase tracking-wider">
                        👑 Meme of the Match
                      </span>
                      <span className="text-xs font-poppins font-bold text-[#131010]">
                        @{selectedMatch.bestSubmission.username} ({selectedMatch.bestSubmission.score} pts)
                      </span>
                    </div>
                    <p className="font-poppins text-xs font-semibold text-[#131010] italic mb-2">
                      "{selectedMatch.bestSubmission.prompt}"
                    </p>
                    {selectedMatch.bestSubmission.memeUrl && (
                      <img
                        src={selectedMatch.bestSubmission.memeUrl}
                        alt="Meme of the match"
                        className="w-full h-36 object-contain rounded-lg bg-black/5 border border-[#131010]"
                      />
                    )}
                  </div>
                ) : null}

                {/* --- Version 2: Full Match History (Final Squad Scoreboard) --- */}
                {selectedMatch.players && selectedMatch.players.length > 0 ? (
                  <div className="bg-white rounded-xl border-2 border-[#131010] shadow-[2px_2px_0px_0px_#131010] p-3">
                    <div className="text-xs font-poppins font-bold text-[#131010]/60 uppercase mb-2">
                      🏆 Final Scoreboard ({selectedMatch.totalRounds || 5} Rounds)
                    </div>
                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                      {[...selectedMatch.players].sort((a, b) => b.score - a.score).map((p, idx) => (
                        <div
                          key={p.id || idx}
                          className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 border border-[#131010] text-xs font-poppins font-bold text-[#131010] shadow-[1px_1px_0px_0px_#131010]"
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-[#FFDDAB] border border-[#131010] flex items-center justify-center text-[10px] font-black text-[#131010]">
                              {idx + 1}
                            </span>
                            <span className="text-[#131010]">{p.username}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-[#131010] font-black">{p.score} pts</span>
                            {idx === 0 && <span>🥇</span>}
                            {idx === 1 && <span>🥈</span>}
                            {idx === 2 && <span>🥉</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="mt-6 flex flex-col sm:flex-row items-center justify-end gap-2.5">
                <Button
                  variant="primary"
                  icon={<PlusCircle size={16} />}
                  onClick={() => {
                    setSelectedMatch(null);
                    handleCreateGame();
                  }}
                  className="w-full sm:w-auto"
                >
                  Start New Rematch
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setSelectedMatch(null)}
                  className="w-full sm:w-auto"
                >
                  Close
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Dashboard;