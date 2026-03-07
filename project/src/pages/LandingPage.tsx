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
  BookOpen,
  Gavel
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import gaybroImg from '../images/gaybro.jpg';
import gaybriImg2 from '../images/gaybro2.jpg';
import toast from 'react-hot-toast';

// --- Tactile Button Component ---
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
  const baseClasses = "inline-flex items-center justify-center font-poppins font-bold transition-all duration-150 border-2 border-[#131010] focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed active:translate-y-[2px] active:shadow-none";
  
  const variants = {
    primary: "bg-[#D98324] text-[#131010] shadow-[3px_3px_0px_0px_#131010] hover:shadow-[5px_5px_0px_0px_#131010]",
    outline: "bg-white text-[#131010] shadow-[3px_3px_0px_0px_#131010] hover:shadow-[5px_5px_0px_0px_#131010] hover:bg-[#FFDDAB]",
    secondary: "bg-[#5F8B4C] text-white shadow-[3px_3px_0px_0px_#131010] hover:shadow-[5px_5px_0px_0px_#131010]"
  };
  
  const sizes = {
    sm: "px-4 py-2 text-sm rounded-lg",
    md: "px-6 py-3 text-base rounded-xl",
    lg: "px-8 py-4 text-lg rounded-xl"
  };
  
  const widthClass = fullWidth ? "w-full" : "";
  
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${widthClass}`}
    >
      {loading ? (
        <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full mr-2 animate-spin" />
      ) : icon ? (
        <span className="mr-2">{icon}</span>
      ) : null}
      {children}
    </button>
  );
};

// --- Tactile Input Component ---
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
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-xs font-bold text-[#131010]/60 uppercase tracking-wider font-courier">
        {label}
      </label>
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center z-10 pointer-events-none">
            {React.cloneElement(icon as React.ReactElement, {
              className: 'text-[#131010] w-5 h-5',
              strokeWidth: 2.5
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
            w-full px-4 py-3.5 ${icon ? 'pl-12' : ''} 
            bg-[#FFDDAB]/10 text-[#131010] text-base sm:text-sm font-poppins font-semibold
            border-2 rounded-xl transition-shadow duration-200
            focus:outline-none focus:bg-white focus:shadow-[2px_2px_0px_0px_#131010]
            placeholder:text-[#131010]/30 placeholder:font-medium
            ${error ? 'border-red-500 bg-red-50/50' : 'border-[#131010]'}
          `}
        />
      </div>
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="flex items-center text-red-600 text-xs font-bold font-poppins mt-1"
          >
            <AlertCircle size={14} className="mr-1" strokeWidth={2.5} />
            {error}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- Main Landing Page ---
const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, login, register, loading, verifyOtp } = useAuth();
  
  const [showLogin, setShowLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [awaitingOtp, setAwaitingOtp] = useState(false);
  const [otp, setOtp] = useState('');
  
  // Form validation (Untouched logic)
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

    if (!awaitingOtp && !validateForm()) return;

    try {
      if (awaitingOtp) {
        await verifyOtp({ email, otp, purpose: 'register', username, password });
        toast.success('Authenticated successfully!');
        navigate('/dashboard');
        return;
      }

      if (showLogin) {
        await login(email, password);
        toast.success('Login successful!');
        navigate('/dashboard');
      } else {
        await register(username, email, password);
        setAwaitingOtp(true);
        toast.success('Signup OTP sent to your email');
      }
    } catch (err) {
      console.error('Authentication error:', err);
      toast.error(() => (
        <div className="flex items-center justify-between gap-4">
          <span className="text-[#131010] font-medium">Authentication failed. Try again.</span>
        </div>
      ));
    }
  };
  
  return (
    <>
      <div className="min-h-screen flex flex-col bg-[#FFDDAB] font-poppins selection:bg-[#D98324] selection:text-white">
        
        {/* HERO SECTION */}
        <div className="relative py-16 sm:py-24 px-4 sm:px-6 lg:px-8 overflow-hidden border-b-4 border-[#131010]">
          {/* Subtle grid background */}
          <div className="absolute inset-0 opacity-[0.05] bg-[linear-gradient(#131010_1px,transparent_1px),linear-gradient(90deg,#131010_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />
          
          <div className="max-w-7xl mx-auto relative z-10">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
              
              {/* Left: Copy & CTA */}
              <motion.div 
                className="text-center lg:text-left order-2 lg:order-1"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <div className="inline-block px-4 py-1.5 rounded-full bg-white border-2 border-[#131010] text-[#131010] font-bold text-sm mb-6 shadow-[2px_2px_0px_0px_#131010] transform -rotate-2">
                  🎉 The Party Starts Here
                </div>
                
                <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-[#131010] mb-6 leading-[1.1] tracking-tight">
                  The Ultimate <br/>
                  <span className="text-[#D98324] drop-shadow-[3px_3px_0px_#131010]">Meme Game.</span>
                </h1>
                
                <p className="text-lg sm:text-xl text-[#131010]/80 mb-10 font-medium max-w-xl mx-auto lg:mx-0 leading-relaxed">
                  Drop a prompt. Play a meme. Judge your friends. It's that simple. 
                  The funniest degenerate in the lobby takes the crown.
                </p>
                
                <div className="flex flex-col sm:flex-row flex-wrap gap-4 justify-center lg:justify-start">
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
                    icon={isAuthenticated ? <Laugh strokeWidth={3} /> : <BookOpen strokeWidth={3} />}
                  >
                    {isAuthenticated ? 'Enter Dashboard' : 'How to Play'}
                  </Button>

                  {!isAuthenticated && (
                    <Button 
                      variant="outline" 
                      size="lg"
                      onClick={() => document.getElementById('auth-section')?.scrollIntoView({ behavior: 'smooth' })}
                      icon={<LogIn strokeWidth={3} />}
                    >
                      Sign In to Play
                    </Button>
                  )}
                </div>
              </motion.div>
              
              {/* Right: Floating Playing Cards */}
              <motion.div 
                className="relative h-[400px] sm:h-[500px] hidden sm:block order-1 lg:order-2"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                {/* Back Card (The Prompt) */}
                <motion.div
                  className="absolute top-10 left-10 lg:left-20 bg-white p-6 rounded-2xl border-4 border-[#131010] shadow-[8px_8px_0px_0px_#131010] w-[280px] z-10 transform -rotate-6"
                  whileHover={{ rotate: -8, scale: 1.05, zIndex: 30 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <div className="flex justify-between items-center mb-4 border-b-2 border-[#131010]/10 pb-2">
                    <span className="font-bold text-[#D98324] uppercase text-xs tracking-wider">The Prompt</span>
                    <Gavel size={16} className="text-[#131010]" />
                  </div>
                  <p className="font-black text-2xl text-[#131010] leading-tight">
                    "When bro shows his gay moves, Le me:"
                  </p>
                </motion.div>
                
                {/* Front Card (The Meme Image 1) */}
                <motion.div 
                  className="absolute top-32 right-10 lg:right-20 bg-white p-4 rounded-2xl border-4 border-[#131010] shadow-[8px_8px_0px_0px_#131010] w-[260px] z-20 transform rotate-3"
                  whileHover={{ rotate: 5, scale: 1.05, zIndex: 30 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <div className="absolute -top-4 -right-4 bg-[#D98324] text-[#131010] border-2 border-[#131010] px-3 py-1 rounded-lg shadow-[2px_2px_0px_0px_#131010] font-black flex items-center gap-1 z-30">
                    <Star size={14} className="fill-[#131010]" /> 9.1
                  </div>
                  <img 
                    src={gaybroImg} 
                    alt="Meme example" 
                    className="w-full h-auto rounded-xl border-2 border-[#131010] object-cover aspect-square"
                  />
                </motion.div>

                {/* Small Acccent Card (Meme Image 2) */}
                <motion.div 
                  className="absolute bottom-10 left-20 lg:left-32 bg-white p-3 rounded-2xl border-4 border-[#131010] shadow-[6px_6px_0px_0px_#131010] w-[180px] z-25 transform rotate-12"
                  whileHover={{ rotate: 15, scale: 1.1, zIndex: 30 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <img 
                    src={gaybriImg2} 
                    alt="Meme reaction" 
                    className="w-full h-auto rounded-xl border-2 border-[#131010] object-cover aspect-square"
                  />
                </motion.div>
              </motion.div>

            </div>
          </div>
        </div>
        
        {/* FEATURES SECTION (Bento Grid) */}
        <div className="bg-[#131010] py-20 px-4 sm:px-6 lg:px-8 border-b-4 border-[#131010]">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl sm:text-5xl font-black text-white mb-4">How it Works</h2>
              <p className="text-[#FFDDAB]/70 font-medium text-lg">Three simple steps to absolute chaos.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
              <FeatureCard 
                icon={<UserCircle2 size={40} className="text-[#131010]" strokeWidth={2.5} />}
                title="1. The Judge"
                description="One player is the dictator for the round. They pick a wild prompt sentence."
                color="bg-[#FFDDAB]"
                delay={0.1}
              />
              <FeatureCard 
                icon={<Image size={40} className="text-[#131010]" strokeWidth={2.5} />}
                title="2. The Drop"
                description="Everyone else scrambles to select the funniest meme image from their deck to match it."
                color="bg-[#D98324]"
                delay={0.2}
              />
              <FeatureCard 
                icon={<Trophy size={40} className="text-[#131010]" strokeWidth={2.5} />}
                title="3. The Verdict"
                description="The Judge rates the memes. The funniest degenerate gets the points. Repeat."
                color="bg-[#5F8B4C]"
                delay={0.3}
              />
            </div>
          </div>
        </div>
        
        {/* AUTH SECTION */}
        {!isAuthenticated && (
          <div id="auth-section" className="bg-[#FFDDAB] py-24 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md mx-auto">
              <motion.div 
                className="bg-white rounded-3xl shadow-[8px_8px_0px_0px_#131010] border-4 border-[#131010] overflow-hidden"
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                viewport={{ once: true }}
              >
                {/* Auth Header */}
                <div className="bg-[#131010] text-center py-8 px-6">
                  <motion.h2 
                    className="text-3xl font-black text-white"
                    key={showLogin ? 'login' : 'signup'}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    {showLogin ? 'Welcome Back' : 'Join the Lobby'}
                  </motion.h2>
                  <p className="text-white/60 font-medium mt-2 text-sm">
                    {showLogin ? 'Sign in to access your stats and games.' : 'Create a profile to start playing.'}
                  </p>
                </div>
                
                <div className="p-6 sm:p-8">
                  {error && (
                    <motion.div 
                      className="bg-red-50 border-2 border-red-500 text-red-700 px-4 py-3 rounded-xl mb-6 flex items-center font-bold text-sm"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                    >
                      <AlertCircle size={20} className="mr-2 shrink-0" strokeWidth={2.5} />
                      {error}
                    </motion.div>
                  )}
                  
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <AnimatePresence mode="wait">
                      {!showLogin && !awaitingOtp && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          <Input
                            id="username"
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            label="Username"
                            placeholder="Player123"
                            required
                            icon={<User size={20} />}
                            error={fieldErrors.username}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                    
                    {!awaitingOtp && (
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        label="Email Address"
                        placeholder="you@example.com"
                        required
                        icon={<Mail size={20} />}
                        error={fieldErrors.email}
                      />
                    )}
                    
                    {!awaitingOtp && (
                      <div className="space-y-1.5">
                        <label htmlFor="password" className="block text-xs font-bold text-[#131010]/60 uppercase tracking-wider font-courier">
                          Password
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 flex items-center pl-4 z-10 pointer-events-none">
                            <Lock size={20} className="text-[#131010]" strokeWidth={2.5} />
                          </div>
                          <input
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            placeholder="••••••••"
                            className={`
                              w-full px-4 py-3.5 pl-12 pr-12
                              bg-[#FFDDAB]/10 text-[#131010] text-base sm:text-sm font-poppins font-semibold
                              border-2 rounded-xl transition-shadow duration-200
                              focus:outline-none focus:bg-white focus:shadow-[2px_2px_0px_0px_#131010]
                              placeholder:text-[#131010]/30 placeholder:font-medium
                              ${fieldErrors.password ? 'border-red-500 bg-red-50/50' : 'border-[#131010]'}
                            `}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute inset-y-0 right-4 flex items-center text-[#131010]/40 hover:text-[#131010] transition-colors"
                          >
                            {showPassword ? <Eye size={20} strokeWidth={2.5} /> : <EyeOff size={20} strokeWidth={2.5} />}
                          </button>
                        </div>
                        <AnimatePresence>
                          {fieldErrors.password && (
                            <motion.div
                              initial={{ opacity: 0, y: -5 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -5 }}
                              className="flex items-center text-red-600 text-xs font-bold font-poppins mt-1"
                            >
                              <AlertCircle size={14} className="mr-1" strokeWidth={2.5} />
                              {fieldErrors.password}
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {showLogin && (
                          <div className="mt-2 text-right">
                            <button
                              type="button"
                              onClick={() => navigate('/forgot-password')}
                              className="text-xs font-bold text-[#5F8B4C] hover:text-[#131010] transition-colors uppercase tracking-wider font-courier"
                            >
                              Forgot Password?
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {awaitingOtp && (
                      <Input
                        id="otp"
                        type="text"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        label="Enter Verification Code"
                        placeholder="6-digit code"
                        required
                        icon={<Lock size={20} />}
                      />
                    )}
                    
                    <div className="pt-4">
                      <Button
                        type="submit"
                        variant="secondary"
                        size="lg"
                        fullWidth
                        loading={loading}
                        icon={awaitingOtp ? <Lock size={20} strokeWidth={3} /> : (showLogin ? <LogIn size={20} strokeWidth={3} /> : <UserCircle2 size={20} strokeWidth={3} />)}
                      >
                        {awaitingOtp ? 'Verify Code' : (showLogin ? 'Enter Game' : 'Create Profile')}
                      </Button>
                    </div>
                  </form>
                  
                  <div className="mt-8 pt-6 border-t-2 border-[#131010]/10 text-center">
                    <p className="text-sm font-medium text-[#131010]/60 mb-3">
                      {showLogin ? "New around here?" : "Already have a profile?"}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setShowLogin(!showLogin);
                        setFieldErrors({});
                        setError('');
                        setAwaitingOtp(false);
                        setOtp('');
                      }}
                      className="text-sm font-black text-[#D98324] hover:text-[#131010] transition-colors uppercase tracking-widest border-b-2 border-transparent hover:border-[#131010] pb-1"
                    >
                      {showLogin ? "Create an Account" : "Sign In Instead"}
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        )}
        
        {/* FOOTER */}
        <footer className="bg-[#131010] py-12 px-4 mt-auto">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
              
              <div className="flex items-center gap-3">
                <div className="bg-[#FFDDAB] p-2 rounded-lg">
                  <Laugh className="text-[#131010]" size={24} strokeWidth={3} />
                </div>
                <span className="text-2xl font-black text-white font-poppins tracking-tight">MemeGame.</span>
              </div>

              <div className="flex space-x-4">
                {[
                  { icon: Linkedin, href: "https://www.linkedin.com/in/subhash-yaganti-a8b3b626a/" },
                  { icon: Twitter, href: "https://x.com/SYaganti44806" },
                  { icon: Instagram, href: "https://instagram.com/subhash_spiody" },
                  { icon: Github, href: "https://github.com/subhash-22-codes" }
                ].map(({ icon: Icon, href }, index) => (
                  <a
                    key={index}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white hover:bg-[#D98324] hover:text-[#131010] transition-all hover:-translate-y-1"
                  >
                    <Icon size={20} strokeWidth={2.5} />
                  </a>
                ))}
              </div>

              <p className="text-white/40 text-sm font-medium font-poppins">
                © 2025 MemeGame. Built for laughs.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
};

// --- Feature Card Component (Bento Box Style) ---
interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
  delay?: number;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ icon, title, description, color, delay = 0 }) => {
  return (
    <motion.div 
      className={`${color} rounded-2xl p-6 sm:p-8 border-4 border-[#131010] shadow-[6px_6px_0px_0px_#131010] hover:-translate-y-2 hover:shadow-[8px_8px_0px_0px_#131010] transition-all duration-300`}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      viewport={{ once: true }}
    >
      <div className="w-16 h-16 bg-white border-4 border-[#131010] rounded-xl shadow-[4px_4px_0px_0px_#131010] flex items-center justify-center mb-6">
        {icon}
      </div>
      <h3 className="text-2xl font-black text-[#131010] mb-3 font-poppins">{title}</h3>
      <p className="text-[#131010]/80 font-medium text-base font-poppins leading-relaxed">{description}</p>
    </motion.div>
  );
};

export default LandingPage;