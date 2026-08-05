import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Laugh, 
  Image, 
  Trophy, 
  UserCircle2, 
  LogIn, 
  Star, 
  Linkedin,
  Twitter,
  Instagram,
  Github,
  BookOpen,
  Gavel,
  Zap
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import GuestNameModal from '../components/GuestNameModal';
import gaybroImg from '../images/gaybro.webp';
import gaybriImg2 from '../images/gaybro2.webp';
import toast from 'react-hot-toast';
import AuthModal from '../components/AuthModal';


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
// --- Main Landing Page ---
const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated } = useAuth();
  const [showGuestModal, setShowGuestModal] = useState(false);
  
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [defaultIsRegister, setDefaultIsRegister] = useState(false);

  useEffect(() => {
    if (searchParams.get('register') === 'true') {
      setDefaultIsRegister(true);
      setShowAuthModal(true);
    }
  }, [searchParams]);

  return (
    <>
      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
        defaultIsRegister={defaultIsRegister} 
      />
      <GuestNameModal
        isOpen={showGuestModal}
        onClose={() => setShowGuestModal(false)}
        onSuccess={() => {
          setShowGuestModal(false);
          toast.success('Welcome to MemeGame!');
          navigate('/dashboard');
        }}
      />
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
                  The funniest friend in the squad takes the crown.
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
                    {isAuthenticated ? 'Jump Into Party 🚀' : 'How to Play'}
                  </Button>

                  {!isAuthenticated && (
                    <>
                      <Button 
                        variant="secondary" 
                        size="lg"
                        onClick={() => setShowGuestModal(true)}
                        icon={<Zap strokeWidth={3} />}
                      >
                        Quick Party Jump (Guest) ⚡
                      </Button>
                      <Button 
                        variant="outline" 
                        size="lg"
                        onClick={() => {
                          setDefaultIsRegister(false);
                          setShowAuthModal(true);
                        }}
                        icon={<LogIn strokeWidth={3} />}
                      >
                        Sign In to Party
                      </Button>
                    </>
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