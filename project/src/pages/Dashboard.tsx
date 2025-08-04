import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { PlusCircle, Users, LogOut, History, Trophy, TrendingUp, Star, Calendar, Award } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
// Built-in Button Component
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
  const baseClasses = "inline-flex items-center justify-center px-6 py-3 rounded-lg font-poppins font-medium text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variantClasses = {
    primary: "bg-[#5F8B4C] text-white hover:bg-[#4A7039] focus:ring-[#5F8B4C] shadow-lg hover:shadow-xl transform hover:-translate-y-0.5",
    secondary: "bg-[#D98324] text-white hover:bg-[#C07620] focus:ring-[#D98324] shadow-lg hover:shadow-xl transform hover:-translate-y-0.5",
    outline: "border-2 border-[#5F8B4C] text-[#5F8B4C] bg-white hover:bg-[#5F8B4C] hover:text-white focus:ring-[#5F8B4C] shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
  };
  
  return (
    <motion.button
      whileHover={{ y: -2 }}
      whileTap={{ y: 0 }}
      transition={{ duration: 0.2 }}
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {icon && <span className="mr-2">{icon}</span>}
      {children}
    </motion.button>
  );
};

// Stats Card Component
interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  trend?: string;
  trendDirection?: 'up' | 'down';
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, trend, trendDirection }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="p-3 bg-[#FFDDAB] rounded-lg">
          {icon}
        </div>
        {trend && (
          <div className={`flex items-center text-sm ${trendDirection === 'up' ? 'text-[#5F8B4C]' : 'text-red-500'}`}>
            <TrendingUp size={16} className="mr-1" />
            {trend}
          </div>
        )}
      </div>
      <div>
        <p className="font-courier text-[#131010] text-sm opacity-70">{title}</p>
        <p className="font-poppins text-[#D98324] text-3xl font-bold mt-1">{value}</p>
      </div>
    </motion.div>
  );
};

// Main Dashboard Component
const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  
  // Mock game history data

  const handleCreateGame = () => {
    toast.success('Redirecting to game creation...');
    navigate('/create');
  };

  const handleJoinGame = () => {
    toast.success('Redirecting to join game...');
    navigate('/join');
  };

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully!');
    navigate('/');
  };


  return (
    <div className="min-h-screen bg-[#FFDDAB] py-8 px-4 sm:px-6 lg:px-8">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="max-w-7xl mx-auto"
      >
        {/* Header Section */}
        <motion.div 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="bg-white rounded-2xl shadow-xl p-8 mb-8 border border-gray-100"
        >
         <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
  {/* Avatar & Welcome Text */}
  <div className="flex flex-col sm:flex-row items-center text-center sm:text-left gap-4">
    <img 
      src={user?.avatar || 'https://via.placeholder.com/100?text=User'} 
      alt="Profile" 
      className="w-20 h-20 rounded-full border-4 border-[#FFDDAB] shadow-lg object-cover"
    />
    <div>
      <h1 className="font-poppins text-[#5F8B4C] text-2xl sm:text-3xl font-bold mb-1">
        Welcome back, {user?.username || 'Game Master'}!
      </h1>
      <p className="font-courier text-[#131010] opacity-70 text-sm sm:text-base">
        Ready to create some epic gaming moments?
      </p>
    </div>
  </div>

  {/* Buttons */}
  <div className="flex flex-col sm:flex-row gap-4">
    <Button
      variant="primary"
      icon={<PlusCircle size={20} />}
      onClick={handleCreateGame}
    >
      Create Game
    </Button>
    <Button
      variant="secondary"
      icon={<Users size={20} />}
      onClick={handleJoinGame}
    >
      Join Game
    </Button>
    <Button
      variant="outline"
      icon={<LogOut size={20} />}
      onClick={handleLogout}
    >
      Logout
    </Button>
  </div>
</div>

        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard 
            title="Games Played" 
            value="24" 
            icon={<History size={24} className="text-[#5F8B4C]" />} 
            trend="+12%"
            trendDirection="up"
          />
          <StatCard 
            title="Times as Judge" 
            value="8" 
            icon={<Star size={24} className="text-[#D98324]" />} 
            trend="+5%"
            trendDirection="up"
          />
          <StatCard 
            title="Games Won" 
            value="7" 
            icon={<Trophy size={24} className="text-[#5F8B4C]" />} 
            trend="+25%"
            trendDirection="up"
          />
          <StatCard 
            title="Best Score" 
            value="51" 
            icon={<Award size={24} className="text-[#D98324]" />} 
          />
        </div>

        {/* Featured Game Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="bg-white rounded-2xl shadow-xl p-8 mb-8 border border-gray-100"
        >
          <div className="flex flex-col lg:flex-row items-center">
            <div className="lg:w-1/2 mb-6 lg:mb-0 lg:pr-8">
              <h2 className="font-poppins text-[#5F8B4C] text-2xl font-bold mb-4">
                🎮 Game Night Special
              </h2>
              <p className="font-courier text-[#131010] opacity-70 mb-6">
                Join our weekly game night every Friday! Connect with players from around the world and compete for the ultimate bragging rights.
              </p>
              <Button variant="primary" icon={<Calendar size={20} />}>
                Join Game Night
              </Button>
            </div>
            <div className="lg:w-1/2">
              <img 
                src="bulkmemes.jpg" 
                alt="Game Night" 
                className="w-full h-48 object-cover rounded-xl shadow-lg"
              />
            </div>
          </div>
        </motion.div>
        
       

        {/* Achievement Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="bg-white rounded-2xl shadow-xl p-8 mt-8 border border-gray-100"
        >
          <h2 className="font-poppins text-[#5F8B4C] text-2xl font-bold mb-6 flex items-center">
            <Award size={24} className="mr-3" />
            Recent Achievements
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-[#FFDDAB]/30 rounded-xl">
              <Trophy size={32} className="text-[#D98324] mx-auto mb-2" />
              <h3 className="font-poppins text-[#5F8B4C] font-semibold">Winner</h3>
              <p className="font-courier text-[#131010] opacity-70 text-sm">Won 3 games this week</p>
            </div>
            <div className="text-center p-4 bg-[#FFDDAB]/30 rounded-xl">
              <Star size={32} className="text-[#D98324] mx-auto mb-2" />
              <h3 className="font-poppins text-[#5F8B4C] font-semibold">Rising Star</h3>
              <p className="font-courier text-[#131010] opacity-70 text-sm">Improved score by 15%</p>
            </div>
            <div className="text-center p-4 bg-[#FFDDAB]/30 rounded-xl">
              <Users size={32} className="text-[#D98324] mx-auto mb-2" />
              <h3 className="font-poppins text-[#5F8B4C] font-semibold">Social Player</h3>
              <p className="font-courier text-[#131010] opacity-70 text-sm">Played with 10+ friends</p>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Dashboard;