import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Laugh, 
  Image, 
  Trophy, 
  UserCircle2, 
  LogIn, 
  Star, 
  Eye, 
  EyeOff,
  Linkedin,
  Twitter,
  Instagram,
  Github,
  AlertCircle,
  Mail,
  Lock,
  User,
  BookOpen
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import gaybroImg from '../images/gaybro.jpg';
import gaybriImg2 from '../images/gaybro2.jpg';
import toast from 'react-hot-toast';

// Custom Button Component
interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'outline' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  type?: 'button' | 'submit';
  onClick?: () => void;
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  disabled = false,
  icon,
  type = 'button',
  onClick
}) => {
  const baseClasses = "inline-flex items-center justify-center font-bold transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-4 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100";
  
  const variants = {
    primary: "bg-[#D98324] hover:bg-[#B8721E] text-white shadow-lg hover:shadow-xl focus:ring-[#D98324]/50",
    outline: "border-2 border-[#5F8B4C] text-[#5F8B4C] hover:bg-[#5F8B4C] hover:text-white focus:ring-[#5F8B4C]/50",
    secondary: "bg-[#5F8B4C] hover:bg-[#4A6B3A] text-white shadow-lg hover:shadow-xl focus:ring-[#5F8B4C]/50"
  };
  
  const sizes = {
    sm: "px-4 py-2 text-sm rounded-lg",
    md: "px-6 py-3 text-base rounded-xl",
    lg: "px-8 py-4 text-lg rounded-xl"
  };
  
  const widthClass = fullWidth ? "w-full" : "";
  
  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${widthClass}`}
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
    >
      {loading ? (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-2"
        />
      ) : icon ? (
        <span className="mr-2">{icon}</span>
      ) : null}
      {children}
    </motion.button>
  );
};

// Form Input Component
interface InputProps {
  id: string;
  type: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  required?: boolean;
  icon?: React.ReactNode;
  error?: string;
  label: string;
}

const Input: React.FC<InputProps> = ({
  id,
  type,
  value,
  onChange,
  placeholder,
  required,
  icon,
  error,
  label
}) => {
  return (
    <div className="space-y-2">
      <label 
        htmlFor={id} 
        className="block text-sm font-medium text-[#131010] font-['Courier_New']"
      >
        {label}
      </label>
      <div className="relative">
        {icon && (
  <div className="absolute inset-y-0 left-0 pl-3 flex items-center z-10">
    {React.cloneElement(icon as React.ReactElement, {
      className: 'text-[#5F8B4C] w-5 h-5'
    })}
  </div>
)}

        <input
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          required={required}
          placeholder={placeholder}
          className={`
            w-full px-4 py-3 ${icon ? 'pl-12' : ''} 
            bg-white/90 backdrop-blur-sm text-[#131010] 
            border-2 border-[#5F8B4C]/30 rounded-xl
            focus:outline-none focus:ring-4 focus:ring-[#5F8B4C]/20 focus:border-[#5F8B4C]
            transition-all duration-200
            font-['Courier_New']
            placeholder:text-[#131010]/50
            ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''}
          `}
        />
      </div>
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center text-red-600 text-sm font-['Courier_New']"
          >
            <AlertCircle size={16} className="mr-1" />
            {error}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, login, register, loading } = useAuth();
  
  const [showLogin, setShowLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  
  // Form validation
const validateForm = () => {
  const errors: Record<string, string> = {};

  if (!showLogin && !username.trim()) {
    errors.username = 'Username is required';
    toast.error('Username is required.');
  } else if (!showLogin && username.length < 3) {
    errors.username = 'Username must be at least 3 characters';
    toast.error('Username must be at least 3 characters.');
  }

  if (!email.trim()) {
    errors.email = 'Email is required';
    toast.error('Email is required.');
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = 'Please enter a valid email address';
    toast.error('Invalid email format.');
  }

  if (!password.trim()) {
    errors.password = 'Password is required';
    toast.error('Password is required.');
  } else if (password.length < 6) {
    errors.password = 'Password must be at least 6 characters';
    toast.error('Password must be at least 6 characters.');
  }

  setFieldErrors(errors);
  return Object.keys(errors).length === 0;
};

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setError('');

  if (!validateForm()) return;

  try {
    if (showLogin) {
      await login(email, password);
    } else {
      await register(username, email, password);
    }

    toast.success('Login successful!');
    navigate('/dashboard');
  } catch (err) {
    console.error('Authentication error:', err);

    // Optional: richer error toast
    toast.error(() => (
      <div className="flex items-center justify-between gap-4">
        <span className="text-[#131010] font-medium">Authentication failed. Try again.</span>
      </div>
    ));
  }
};
  
  return (
    <>
      {/* Google Fonts */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link 
        href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;800&display=swap" 
        rel="stylesheet" 
      />
      
      <div className="min-h-screen flex flex-col bg-[#FFDDAB]">
        {/* Hero Section */}
        <div className="relative bg-gradient-to-br from-[#FFDDAB] via-[#F5D49A] to-[#E8C785] py-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
          {/* Decorative Elements */}
          <div className="absolute top-10 left-10 w-32 h-32 bg-[#5F8B4C]/10 rounded-full blur-xl"></div>
          <div className="absolute bottom-10 right-10 w-48 h-48 bg-[#D98324]/10 rounded-full blur-xl"></div>
          
          <div className="max-w-7xl mx-auto relative z-10">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <motion.div 
                className="text-center md:text-left"
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8 }}
              >
                <motion.h1 
                  className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-6 font-['Poppins']"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                >
                  <span className="block text-[#D98324]">The Ultimate</span>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#5F8B4C] via-[#D98324] to-[#131010]">
                    Meme Game
                  </span>
                </motion.h1>
                
                <motion.p 
                  className="text-xl text-[#131010] mb-8 font-['Courier_New'] leading-relaxed"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.4 }}
                >
                  Create hilarious moments with friends! Match funny sentences with perfect memes and vote for the best combinations.
                </motion.p>
                
                <motion.div 
                className="flex flex-col sm:flex-row flex-wrap gap-4 justify-center md:justify-start"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.6 }}
              >
                <Button 
                  variant="primary" 
                  size="lg"
                  onClick={() => {
                    if (isAuthenticated) {
                      navigate('/dashboard');
                    } else {
                      navigate('/HowToPlay');
                    }
                  }}
                  icon={isAuthenticated ? <Laugh /> : <BookOpen />}
                >
                  {isAuthenticated ? 'Play Now' : 'How to Play?'}
                </Button>

                {!isAuthenticated && (
                  <Button 
                    variant="outline" 
                    size="lg"
                    onClick={() =>
                      document.getElementById('auth-section')?.scrollIntoView({ behavior: 'smooth' })
                    }
                    icon={<LogIn />}
                  >
                    Sign In
                  </Button>
                )}
              </motion.div>


              </motion.div>
              
              <motion.div 
                className="relative hidden md:block"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.3 }}
              >
                <div className="relative transform translate-x-10 translate-y-5 rotate-3">
                  <motion.div
                    className="absolute top-2 right-[126px] bg-[#D98324] text-white px-3 py-1 rounded-md shadow-lg text-sm font-bold flex items-center gap-1 z-10 font-['Monaco']"
                    whileHover={{ scale: 1.1 }}
                  >
                    <Star className="fill-current" size={14} />
                    <span>9.1/10</span>
                  </motion.div>
                  <img 
                    src={gaybroImg} 
                    alt="Meme example" 
                    className="rounded-xl shadow-2xl w-full max-w-sm mx-auto"
                  />
                  <motion.div 
                    className="absolute -bottom-4 -left-4 bg-white text-[#131010] p-3 rounded-lg shadow-lg font-bold font-['Courier_New'] border-2 border-[#5F8B4C]/20"
                    whileHover={{ scale: 1.05 }}
                  >
                    when bro shows his gay moves, Le me:
                  </motion.div>
                </div>
                
                <motion.div 
                  className="absolute top-1/2 -right-10 transform -translate-y-1/2 -rotate-6"
                  whileHover={{ rotate: -8 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="absolute top-2 right-[1px] bg-[#D98324] text-white px-2 py-1 rounded-md shadow-lg text-xs font-bold flex items-center gap-1 z-10 font-['Monaco']">
                    <Star className="fill-current" size={12} />
                    <span>8.5/10</span>
                  </div>
                  <img 
                    src={gaybriImg2} 
                    alt="Meme example" 
                    className="rounded-xl shadow-2xl w-40 h-40 object-cover"
                  />
                </motion.div>
              </motion.div>
            </div>
          </div>
          
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[#FFDDAB] to-transparent"></div>
        </div>
        
        {/* Features Section */}
        <div className="bg-gradient-to-b from-[#FFDDAB] to-[#F5D49A] py-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <motion.h2 
              className="text-3xl md:text-4xl font-bold text-center text-[#D98324] mb-12 font-['Poppins']"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              How It Works
            </motion.h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <FeatureCard 
                icon={<UserCircle2 size={48} className="text-[#5F8B4C]" />}
                title="Choose a Judge"
                description="Every round starts with selecting a judge who will provide a sentence and score the memes."
                delay={0.1}
              />
              <FeatureCard 
                icon={<Image size={48} className="text-[#D98324]" />}
                title="Match Memes"
                description="Players select the perfect meme to match the judge's sentence within the time limit."
                delay={0.2}
              />
              <FeatureCard 
                icon={<Trophy size={48} className="text-[#131010]" />}
                title="Score & Win"
                description="The judge scores each meme submission, and after multiple rounds, a winner is crowned!"
                delay={0.3}
              />
            </div>
          </div>
        </div>
        
        {/* Auth Section */}
        {!isAuthenticated && (
          <div id="auth-section" className="bg-gradient-to-b from-[#F5D49A] to-[#E8C785] py-16 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md mx-auto">
              <motion.div 
                className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-[#5F8B4C]/20"
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
              >
                <div className="text-center mb-8">
                  <motion.h2 
                    className="text-3xl font-bold text-[#D98324] font-['Poppins']"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    {showLogin ? 'Welcome Back!' : 'Join the Fun!'}
                  </motion.h2>
                  <motion.p 
                    className="text-[#131010] mt-2 font-['Courier_New']"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    {showLogin ? 'Sign in to continue the laughter' : 'Create an account to start playing'}
                  </motion.p>
                </div>
                
                {error && (
                  <motion.div 
                    className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-center font-['Courier_New']"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                  >
                    <AlertCircle size={20} className="mr-2" />
                    {error}
                  </motion.div>
                )}
                
                <form onSubmit={handleSubmit} className="space-y-6">
                  <AnimatePresence mode="wait">
                    {!showLogin && (
                      <motion.div
                        
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.4 }}
                      >
                        <Input
                          id="username"
                          type="text"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          label="Username"
                          placeholder="Enter your username"
                          required
                          icon={<User size={20} />}
                          error={fieldErrors.username}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                  
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    label="Email"
                    placeholder="your.email@example.com"
                    required
                    icon={<Mail size={20} className="text-[#5F8B4C]" />}
                    error={fieldErrors.email}
                  />
                  
                  <div>
                    <label 
                      htmlFor="password" 
                      className="block text-sm font-medium text-[#131010] mb-2 font-['Courier_New']"
                    >
                      Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 z-10">
                        <Lock size={20} className="text-[#5F8B4C] w-5 h-5" />
                      </div>
                      <input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        placeholder="Enter your password"
                        className={`
                          w-full px-4 py-3 pl-12 pr-12
                          bg-white/90 backdrop-blur-sm text-[#131010] 
                          border-2 border-[#5F8B4C]/30 rounded-xl
                          focus:outline-none focus:ring-4 focus:ring-[#5F8B4C]/20 focus:border-[#5F8B4C]
                          transition-all duration-200
                          font-['Courier_New']
                          placeholder:text-[#131010]/50
                          ${fieldErrors.password ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''}
                        `}
                      />
                      <motion.button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-3 flex items-center text-[#5F8B4C] hover:text-[#4A6B3A]"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        {showPassword ? <Eye size={20} /> : <EyeOff size={20} />}
                      </motion.button>
                    </div>
                    
                    <AnimatePresence>
                      {fieldErrors.password && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="flex items-center text-red-600 text-sm mt-2 font-['Courier_New']"
                        >
                          <AlertCircle size={16} className="mr-1" />
                          {fieldErrors.password}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {showLogin && (
                      <div className="mt-3 text-center sm:text-right">
                        <motion.button
                          type="button"
                          onClick={() => navigate('/forgot-password')}
                          className="text-sm text-[#5F8B4C] hover:text-[#4A6B3A] transition-colors font-['Courier_New']"
                          whileHover={{ scale: 1.05 }}
                        >
                          Forgot Password?
                        </motion.button>
                      </div>
                    )}
                  </div>
                  
                  <Button
                    type="submit"
                    variant="primary"
                    fullWidth
                    loading={loading}
                    icon={showLogin ? <LogIn size={20} /> : <UserCircle2 size={20} />}
                  >
                    {showLogin ? 'Sign In' : 'Create Account'}
                  </Button>
                </form>
                
                <div className="mt-6 text-center">
                  <motion.button
                    type="button"
                    onClick={() => {
                      setShowLogin(!showLogin);
                      setFieldErrors({});
                      setError('');
                    }}
                    className="text-[#5F8B4C] hover:text-[#4A6B3A] transition-colors font-['Courier_New']"
                    whileHover={{ scale: 1.05 }}
                  >
                    {showLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
                  </motion.button>
                </div>
              </motion.div>
            </div>
          </div>
        )}
        
        {/* Footer */}
        <footer className="bg-[#5F8B4C] py-10 px-4 border-t border-[#5F8B4C]/20 mt-auto">
          <motion.div
            className="max-w-7xl mx-auto"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
          >
            <div className="flex flex-col md:flex-row justify-between items-center">
              <motion.div
                className="flex items-center mb-6 md:mb-0"
                whileHover={{ scale: 1.05 }}
              >
                <Laugh className="text-white mr-2" size={24} />
                <span className="text-xl font-bold text-white font-['Poppins']">MemeGame</span>
              </motion.div>

              <motion.div
                className="flex space-x-6 mb-6 md:mb-0"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                {[
                  { icon: Linkedin, href: "https://www.linkedin.com/in/subhash-yaganti-a8b3b626a/", color: "hover:text-blue-300" },
                  { icon: Twitter, href: "https://x.com/SYaganti44806", color: "hover:text-blue-400" },
                  { icon: Instagram, href: "https://instagram.com/subhash_spiody", color: "hover:text-pink-300" },
                  { icon: Github, href: "https://github.com/subhash-22-codes", color: "hover:text-gray-300" }
                ].map(({ icon: Icon, href, color }, index) => (
                  <motion.a
                    key={index}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`text-white/80 ${color} transition-colors`}
                    whileHover={{ scale: 1.2, y: -2 }}
                  >
                    <Icon size={22} />
                  </motion.a>
                ))}
              </motion.div>

              <motion.p
                className="text-white/80 text-sm text-center md:text-right font-['Courier_New']"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                © 2025 MemeGame. All rights reserved.
              </motion.p>
            </div>
          </motion.div>
        </footer>
      </div>
    </>
  );
};

// Feature Card Component
interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  delay?: number;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ icon, title, description, delay = 0 }) => {
  return (
    <motion.div 
      className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-[#5F8B4C]/20 shadow-lg hover:shadow-xl transition-all duration-300"
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay }}
      viewport={{ once: true }}
      whileHover={{ 
        y: -8,
        transition: { duration: 0.2 }
      }}
    >
      <div className="flex flex-col items-center text-center">
        <motion.div 
          className="mb-4 p-3 bg-gradient-to-br from-[#FFDDAB] to-[#F5D49A] rounded-full"
          whileHover={{ rotate: 5, scale: 1.1 }}
          transition={{ duration: 0.2 }}
        >
          {icon}
        </motion.div>
        <h3 className="text-xl font-bold text-[#D98324] mb-3 font-['Poppins']">{title}</h3>
        <p className="text-[#131010] font-['Courier_New'] leading-relaxed">{description}</p>
      </div>
    </motion.div>
  );
};

export default LandingPage;