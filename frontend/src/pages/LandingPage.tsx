import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { Menu, X, LogIn, Github, Twitter, Linkedin, Instagram } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

import HeroSection from '../components/LandingPage/HeroSection';
import PerfectFor from '../components/LandingPage/PerfectFor';
import WhyMemeGame from '../components/LandingPage/WhyMemeGame';
import HowItWorks from '../components/LandingPage/HowItWorks';
import ScoringPodium from '../components/LandingPage/ScoringPodium';
import BentoFeatures from '../components/LandingPage/BentoFeatures';
import TestimonialMarquee from '../components/LandingPage/TestimonialMarquee';
import FAQAccordion from '../components/LandingPage/FAQAccordion';
import FooterCTA from '../components/LandingPage/FooterCTA';
import GuestNameModal from '../components/GuestNameModal';

// --- Sticky Navigation Component ---
const LandingNav: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { scrollY } = useScroll();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Shrink/Blur nav on scroll
  const navBackground = useTransform(
    scrollY,
    [0, 50],
    ['rgba(255, 221, 171, 1)', 'rgba(255, 221, 171, 0.85)']
  );

  const navBorder = useTransform(
    scrollY,
    [0, 50],
    ['4px solid transparent', '4px solid #131010']
  );

  const navPadding = useTransform(
    scrollY,
    [0, 50],
    ['1.5rem', '1rem']
  );

  return (
    <>
      <motion.nav
        style={{
          backgroundColor: navBackground,
          borderBottom: navBorder,
          paddingTop: navPadding,
          paddingBottom: navPadding
        }}
        className="fixed top-0 left-0 right-0 z-50 px-4 sm:px-6 lg:px-8 transition-all duration-300 backdrop-blur-md"
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo */}
          <div
            onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <img src="/memegame_mini_logo.webp" alt="MemeGame" className="w-8 h-8 object-contain" />
            <span className="text-2xl font-black text-[#131010] font-poppins tracking-tight">MemeGame.</span>
          </div>

          {/* Desktop Links */}
          <div className="hidden md:flex items-center gap-8">
            <button onClick={() => navigate('/HowToPlay')} className="font-bold text-[#131010]/70 hover:text-[#131010] transition-colors font-poppins">How to Play</button>
            <button onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })} className="font-bold text-[#131010]/70 hover:text-[#131010] transition-colors font-poppins">FAQ</button>

            <div className="w-1 h-6 border-l-4 border-dashed border-[#131010]/20 mx-2"></div>

            {isAuthenticated ? (
              <button
                onClick={() => navigate('/dashboard')}
                className="px-6 py-2 bg-white text-[#131010] rounded-xl border-4 border-[#131010] shadow-[4px_4px_0px_0px_#131010] hover:shadow-[6px_6px_0px_0px_#131010] hover:-translate-y-1 font-black transition-all active:translate-y-1 active:shadow-none"
              >
                Dashboard
              </button>
            ) : (
              <>
                <button
                  onClick={() => navigate('/auth')}
                  className="font-bold text-[#131010] hover:text-[#D98324] transition-colors font-poppins flex items-center gap-2"
                >
                  <LogIn size={18} strokeWidth={3} /> Sign In
                </button>
                <button
                  onClick={() => (window as any).triggerGuestJoin?.()}
                  className="px-6 py-2 bg-white text-[#131010] rounded-xl border-4 border-[#131010] shadow-[4px_4px_0px_0px_#D98324] hover:shadow-[6px_6px_0px_0px_#D98324] hover:-translate-y-1 font-black transition-all active:translate-y-1 active:shadow-none"
                >
                  Play as Guest ⚡
                </button>
              </>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <button
            className="md:hidden p-2 text-[#131010]"
            onClick={() => setIsMobileMenuOpen(true)}
          >
            <Menu size={32} strokeWidth={3} />
          </button>
        </div>
      </motion.nav>

      {/* Mobile Full Screen Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: '-100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '-100%' }}
            transition={{ type: "spring", bounce: 0, duration: 0.4 }}
            className="fixed inset-0 z-[60] bg-[#FFDDAB] flex flex-col px-6 py-8"
          >
            <div className="flex justify-end mb-12">
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-12 h-12 bg-white rounded-2xl border-4 border-[#131010] shadow-[4px_4px_0px_0px_#131010] flex items-center justify-center text-[#131010] active:translate-y-1 active:shadow-none"
              >
                <X size={28} strokeWidth={3} />
              </button>
            </div>

            <div className="flex flex-col gap-8 items-center text-center mt-8">
              <button
                onClick={() => { navigate('/HowToPlay'); setIsMobileMenuOpen(false); }}
                className="text-2xl font-black text-[#131010] font-poppins"
              >
                How to Play
              </button>
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }), 300);
                }}
                className="text-2xl font-black text-[#131010] font-poppins"
              >
                FAQ
              </button>

              <div className="w-16 h-1 border-t-4 border-[#131010]/10 my-2"></div>

              {isAuthenticated ? (
                <button
                  onClick={() => { navigate('/dashboard'); setIsMobileMenuOpen(false); }}
                  className="w-full max-w-sm px-8 py-5 bg-white text-[#131010] rounded-2xl border-4 border-[#131010] shadow-[8px_8px_0px_0px_#131010] font-black text-2xl"
                >
                  Dashboard
                </button>
              ) : (
                <>
                  <button
                    onClick={() => { (window as any).triggerGuestJoin?.(); setIsMobileMenuOpen(false); }}
                    className="w-full max-w-sm px-8 py-5 bg-[#131010] text-white rounded-2xl border-4 border-[#131010] shadow-[8px_8px_0px_0px_#D98324] font-black text-2xl flex items-center justify-center gap-3"
                  >
                    Play as Guest ⚡
                  </button>
                  <button
                    onClick={() => { navigate('/auth'); setIsMobileMenuOpen(false); }}
                    className="w-full max-w-sm px-8 py-5 bg-white text-[#131010] rounded-2xl border-4 border-[#131010] shadow-[8px_8px_0px_0px_#131010] font-black text-2xl flex items-center justify-center gap-3"
                  >
                    <LogIn size={24} strokeWidth={3} /> Sign In
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};


// --- Main Landing Page Assembly ---
const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [pendingRoomCode, setPendingRoomCode] = useState<string | null>(null);

  useEffect(() => {
    (window as any).triggerGuestJoin = (code?: string) => {
      if (code) {
        setPendingRoomCode(code);
      } else {
        setPendingRoomCode(null);
      }
      setShowGuestModal(true);
    };
    return () => {
      delete (window as any).triggerGuestJoin;
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#FFDDAB] font-poppins selection:bg-[#D98324] selection:text-white flex flex-col">
      <GuestNameModal
        isOpen={showGuestModal}
        onClose={() => setShowGuestModal(false)}
        onSuccess={() => {
          setShowGuestModal(false);
          toast.success('Welcome to MemeGame!');
          if (pendingRoomCode) {
            navigate(`/room/${pendingRoomCode}`);
          } else {
            navigate('/dashboard');
          }
        }}
      />

      <LandingNav />

      <main className="flex-1">
        <HeroSection onRequestGuestJoin={(code) => (window as any).triggerGuestJoin(code)} />
        <PerfectFor />
        <WhyMemeGame />
        <HowItWorks />
        <ScoringPodium />
        <BentoFeatures />
        <TestimonialMarquee />
        <FAQAccordion />
        <FooterCTA onRequestGuestJoin={(code) => (window as any).triggerGuestJoin(code)} />
      </main>

      {/* Footer */}
      <footer className="bg-[#131010] py-16 px-4 border-t-4 border-[#131010]">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">

            <div className="flex items-center gap-3">
              <div className="bg-[#FFDDAB] p-1.5 rounded-2xl border-4 border-[#131010]">
                <img src="/memegame_mini_logo.webp" alt="MemeGame Logo" className="w-10 h-10 object-contain" />
              </div>
              <span className="text-3xl font-black text-white font-poppins tracking-tight">MemeGame.</span>
            </div>

            <div className="flex space-x-6">
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
                  className="w-14 h-14 bg-[#2A2525] border-4 border-[#131010] rounded-full flex items-center justify-center text-white hover:bg-[#D98324] hover:text-[#131010] hover:-translate-y-2 hover:shadow-[4px_4px_0px_0px_#131010] transition-all duration-300"
                >
                  <Icon size={24} strokeWidth={2.5} />
                </a>
              ))}
            </div>

            <p className="text-white/40 text-sm font-bold font-courier uppercase tracking-widest text-center md:text-right">
              © 2026 MemeGame. <br /> Built for laughs.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;