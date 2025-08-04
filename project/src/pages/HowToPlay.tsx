import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Crown,Gamepad, Timer, Trophy, Zap, Users, MessageCircle, Star, RotateCcw, Github, Linkedin, Mail, Send, Gavel, Camera, Clock, Award, Play, ArrowLeft } from 'lucide-react';
import { toast } from 'react-hot-toast';

const HowToPlay: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });

  const [activeSection, setActiveSection] = useState('hero');
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  useEffect(() => {
    const handleScroll = () => {
      const sections = ['hero', 'judge-selection', 'set-scene', 'meme-hunt', 'reveal', 'next-round'];
      const scrollPosition = window.scrollY + 200;

      for (const section of sections) {
        const element = document.getElementById(section);
        if (element) {
          const { offsetTop, offsetHeight } = element;
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            setActiveSection(section);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

 const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setIsLoading(true);

  try {
    const response = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });

    await new Promise((resolve) => setTimeout(resolve, 1000)); // Optional delay for UX

    if (!response.ok) {
      const errorData = await response.json();

      // 👇 Toast handling by status code
      if (response.status === 409) {
        toast.error("You’ve already submitted a message with this email.");
      } else if (response.status === 429) {
        toast.error("You’re submitting too fast. Please wait and try again.");
      } else if (response.status === 400) {
        toast.error(errorData?.error || "Invalid input. Please check your data.");
      } else {
        toast.error(errorData?.error || "Something went wrong.");
      }

      throw new Error(errorData?.error || 'Submission failed.');
    }

    const data = await response.json();
    console.log('Backend response:', data);
    toast.success("Message sent successfully!");
    setSubmitted(true);
  } catch (err) {
    console.error('Form submission error:', err);
    // Already handled above, this is just fallback
  } finally {
    setIsLoading(false);
  }
};




  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const sectionVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.4, ease: "easeOut" }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { 
      opacity: 1, 
      scale: 1,
      transition: { duration: 0.3, ease: "easeOut" }
    },
    hover: { 
      scale: 1.01,
      transition: { duration: 0.2 }
    }
  };

  const steps = [
    { id: 'judge-selection', title: 'Judge Selection', icon: Crown, color: '#D98324' },
    { id: 'set-scene', title: 'Set Scene', icon: MessageCircle, color: '#5F8B4C' },
    { id: 'meme-hunt', title: 'Meme Hunt', icon: Timer, color: '#D98324' },
    { id: 'reveal', title: 'The Reveal', icon: Trophy, color: '#5F8B4C' },
    { id: 'next-round', title: 'Next Round', icon: Zap, color: '#D98324' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFDDAB] via-[#FFE4B8] to-[#FFF0CC]">
      {/* Navigation Header */}
      <header className="bg-white/90 backdrop-blur-sm border-b border-[#D98324]/20 sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <button 
                onClick={() => window.history.back()}
                className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-[#5F8B4C] to-[#4A7A3C] rounded-lg flex items-center justify-center hover:scale-105 transition-transform"
              >
                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </button>
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-[#5F8B4C] to-[#4A7A3C] rounded-lg flex items-center justify-center">
                <Play className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
              </div>
              <h1 className="text-lg sm:text-2xl font-bold text-[#131010]" style={{ fontFamily: 'Poppins, system-ui, sans-serif' }}>
                <span className="hidden sm:inline">MemeGame Guide</span>
                <span className="sm:hidden">Guide</span>
              </h1>
            </div>
            
            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-4">
              {steps.map((step, index) => (
                <button
                  key={step.id}
                  onClick={() => scrollToSection(step.id)}
                  className={`px-3 py-2 rounded-lg transition-all text-sm ${
                    activeSection === step.id 
                      ? 'bg-[#D98324] text-white' 
                      : 'text-[#131010] hover:bg-[#D98324]/10'
                  }`}
                  style={{ fontFamily: 'Courier, monospace' }}
                >
                  {index + 1}. {step.title}
                </button>
              ))}
            </nav>

            {/* Mobile Menu Indicator */}
            <div className="lg:hidden flex items-center gap-1">
              {steps.map((step) => (
                <button
                  key={step.id}
                  onClick={() => scrollToSection(step.id)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    activeSection === step.id ? 'bg-[#D98324] w-6' : 'bg-[#D98324]/30'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <motion.section 
        id="hero"
        className="container mx-auto px-4 sm:px-6 py-12 sm:py-16 text-center"
        initial="hidden"
        animate="visible"
        variants={sectionVariants}
      >
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-black text-[#D98324] mb-4 sm:mb-6" 
              style={{ fontFamily: 'Poppins, system-ui, sans-serif', fontWeight: 800 }}>
            How to Play
            <span className="text-[#5F8B4C] block">MemeGame</span>
          </h1>
          <p className="text-lg sm:text-xl md:text-2xl text-[#131010] mb-6 sm:mb-8 max-w-3xl mx-auto px-4"
             style={{ fontFamily: 'Monaco, Courier, monospace' }}>
            A hilarious multiplayer game where creativity meets comedy, and the best meme wins the round.
          </p>
        </motion.div>

        {/* Game Preview Images */}
        <motion.div
          className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 max-w-4xl mx-auto mb-8 sm:mb-12"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <div className="relative overflow-hidden rounded-lg aspect-square bg-gradient-to-br from-[#5F8B4C] to-[#4A7A3C]">
            <img 
              src="JS.png" 
              alt="Gaming setup"
              className="w-full h-full object-cover opacity-80"
            />
            <div className="absolute inset-0 bg-[#5F8B4C]/40 flex items-center justify-center">
              <Users className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
            </div>
          </div>
          <div className="relative overflow-hidden rounded-lg aspect-square bg-gradient-to-br from-[#D98324] to-[#B8741E]">
            <img 
              src="chat.png" 
              alt="Funny reaction"
              className="w-full h-full object-cover opacity-80"
            />
            <div className="absolute inset-0 bg-[#D98324]/40 flex items-center justify-center">
              <Gamepad className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
            </div>
          </div>
          <div className="relative overflow-hidden rounded-lg aspect-square bg-gradient-to-br from-[#5F8B4C] to-[#4A7A3C]">
            <img 
              src="memetime.png" 
              alt="Timer countdown"
              className="w-full h-full object-cover opacity-80"
            />
            <div className="absolute inset-0 bg-[#5F8B4C]/40 flex items-center justify-center">
              <Timer className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
            </div>
          </div>
          <div className="relative overflow-hidden rounded-lg aspect-square bg-gradient-to-br from-[#D98324] to-[#B8741E]">
            <img 
              src="winner.png" 
              alt="Trophy celebration"
              className="w-full h-full object-cover opacity-80"
            />
            <div className="absolute inset-0 bg-[#D98324]/40 flex items-center justify-center">
              <Trophy className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
            </div>
          </div>
        </motion.div>

        {/* Scroll Indicator */}
        <motion.div
          className="flex flex-col items-center gap-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.5 }}
        >
          <p className="text-sm sm:text-base text-[#131010]" style={{ fontFamily: 'Courier, monospace' }}>
            Scroll to learn the game
          </p>
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="w-6 h-10 border-2 border-[#D98324] rounded-full flex justify-center"
          >
            <div className="w-1 h-3 bg-[#D98324] rounded-full mt-2"></div>
          </motion.div>
        </motion.div>
      </motion.section>

      {/* Step 1: Judge Selection */}
      <motion.section 
        id="judge-selection"
        className="container mx-auto px-4 sm:px-6 py-12 sm:py-16"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={sectionVariants}
      >
        <motion.div 
          className="bg-white rounded-2xl p-6 sm:p-8 md:p-12 shadow-lg border border-[#D98324]/20"
          variants={cardVariants}
          whileHover="hover"
        >
          <div className="grid lg:grid-cols-2 gap-8 sm:gap-12 items-center">
            <div>
              <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-r from-[#D98324] to-[#B8741E] rounded-xl flex items-center justify-center">
                  <Crown className="w-6 h-6 sm:w-10 sm:h-10 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-[#D98324]"
                      style={{ fontFamily: 'Poppins, system-ui, sans-serif' }}>
                    Judge Selection
                  </h2>
                  <p className="text-[#5F8B4C] text-base sm:text-lg" style={{ fontFamily: 'Courier, monospace' }}>
                    Choose your Meme Overlord
                  </p>
                </div>
              </div>
              
              <p className="text-base sm:text-lg text-[#131010] mb-6 sm:mb-8 leading-relaxed" 
                 style={{ fontFamily: 'Courier, monospace' }}>
                The host decides how to select the judge who will evaluate memes and determine the winner of each round.
              </p>
              
              <div className="space-y-3 sm:space-y-4">
                <motion.div 
                  className="flex items-center gap-3 sm:gap-4 bg-gradient-to-r from-[#5F8B4C] to-[#4A7A3C] text-white px-4 sm:px-6 py-3 sm:py-4 rounded-xl"
                  whileHover={{ scale: 1.02 }}
                >
                  <RotateCcw className="w-5 h-5 sm:w-6 sm:h-6" />
                  <div>
                    <h4 className="font-bold text-sm sm:text-base" style={{ fontFamily: 'Poppins, system-ui, sans-serif' }}>Random Selection</h4>
                    <p className="text-xs sm:text-sm opacity-90" style={{ fontFamily: 'Courier, monospace' }}>Spin the wheel of destiny</p>
                  </div>
                </motion.div>
                
                <motion.div 
                  className="flex items-center gap-3 sm:gap-4 bg-gradient-to-r from-[#D98324] to-[#B8741E] text-white px-4 sm:px-6 py-3 sm:py-4 rounded-xl"
                  whileHover={{ scale: 1.02 }}
                >
                  <Users className="w-5 h-5 sm:w-6 sm:h-6" />
                  <div>
                    <h4 className="font-bold text-sm sm:text-base" style={{ fontFamily: 'Poppins, system-ui, sans-serif' }}>Host Assignment</h4>
                    <p className="text-xs sm:text-sm opacity-90" style={{ fontFamily: 'Courier, monospace' }}>Strategic judge selection</p>
                  </div>
                </motion.div>
              </div>
            </div>
            
            <div className="relative">
              <div className="relative overflow-hidden rounded-2xl">
                <img 
                  src="judge2.jpg" 
                  alt="Judge selection process"
                  className="w-full h-60 sm:h-80 object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#131010]/60 to-transparent"></div>
                <div className="absolute bottom-4 sm:bottom-6 left-4 sm:left-6 right-4 sm:right-6">
                  <div className="bg-none rounded-lg p-3 sm:p-4">
                    <p className="text-white font-bold text-sm sm:text-base" style={{ fontFamily: 'Poppins, system-ui, sans-serif' }}>
                      The Judge Has Arrived!
                    </p>
                    <p className="text-xs sm:text-sm text-white/70" style={{ fontFamily: 'Courier, monospace' }}>
                      Ready to evaluate your finest memes
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.section>

      {/* Step 2: Set the Scene */}
      <motion.section 
        id="set-scene"
        className="container mx-auto px-4 sm:px-6 py-12 sm:py-16"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={sectionVariants}
      >
        <motion.div 
          className="bg-white rounded-2xl p-6 sm:p-8 md:p-12 shadow-lg border border-[#5F8B4C]/20"
          variants={cardVariants}
          whileHover="hover"
        >
          <div className="grid lg:grid-cols-2 gap-8 sm:gap-12 items-center">
            <div className="relative order-2 lg:order-1">
              <div className="relative overflow-hidden rounded-2xl">
                <img 
                  src="codeworks.jpg" 
                  alt="Creative writing and thinking"
                  className="w-full h-60 sm:h-80 object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#131010]/60 to-transparent"></div>
                <div className="absolute bottom-4 sm:bottom-6 left-4 sm:left-6 right-4 sm:right-6">
                  <div className="bg-none text-white rounded-lg p-3 sm:p-4">
                    <p className="font-bold mb-2 text-sm sm:text-base" style={{ fontFamily: 'Poppins, system-ui, sans-serif' }}>
                      "When your code works on the first try..."
                    </p>
                    <p className="text-xs sm:text-sm opacity-90" style={{ fontFamily: 'Courier, monospace' }}>
                      Judge's challenge is set!
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="order-1 lg:order-2">
              <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-r from-[#5F8B4C] to-[#4A7A3C] rounded-xl flex items-center justify-center">
                  <MessageCircle className="w-6 h-6 sm:w-10 sm:h-10 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-[#5F8B4C]"
                      style={{ fontFamily: 'Poppins, system-ui, sans-serif' }}>
                    Set the Scene
                  </h2>
                  <p className="text-[#D98324] text-base sm:text-lg" style={{ fontFamily: 'Courier, monospace' }}>
                    Judge drops a meme-worthy line
                  </p>
                </div>
              </div>
              
              <p className="text-base sm:text-lg text-[#131010] mb-6 sm:mb-8 leading-relaxed" 
                 style={{ fontFamily: 'Courier, monospace' }}>
                The judge creates a scenario, phrase, or situation that players must match with the perfect meme from the gallery.
              </p>
              
              <div className="bg-gradient-to-r from-[#FFDDAB] to-[#FFE4B8] p-4 sm:p-6 rounded-xl border-2 border-[#D98324]/30">
                <h4 className="font-bold text-[#D98324] mb-3 text-sm sm:text-base" style={{ fontFamily: 'Poppins, system-ui, sans-serif' }}>
                  Example Scenarios:
                </h4>
                <ul className="space-y-2 text-[#131010] text-sm sm:text-base" style={{ fontFamily: 'Courier, monospace' }}>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-[#5F8B4C] rounded-full"></div>
                    "When you finally understand recursion"
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-[#5F8B4C] rounded-full"></div>
                    "Trying to explain APIs to non-developers"
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-[#5F8B4C] rounded-full"></div>
                    "When the client changes requirements"
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.section>

      {/* Step 3: Meme Hunt */}
      <motion.section 
        id="meme-hunt"
        className="container mx-auto px-4 sm:px-6 py-12 sm:py-16"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={sectionVariants}
      >
        <motion.div 
          className="bg-white rounded-2xl p-6 sm:p-8 md:p-12 shadow-lg border border-[#D98324]/20"
          variants={cardVariants}
          whileHover="hover"
        >
          <div className="grid lg:grid-cols-2 gap-8 sm:gap-12 items-center">
            <div>
              <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-r from-[#D98324] to-[#B8741E] rounded-xl flex items-center justify-center">
                  <Timer className="w-6 h-6 sm:w-10 sm:h-10 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-[#D98324]"
                      style={{ fontFamily: 'Poppins, system-ui, sans-serif' }}>
                    Meme Hunt
                  </h2>
                  <p className="text-[#5F8B4C] text-base sm:text-lg" style={{ fontFamily: 'Courier, monospace' }}>
                    30-45 seconds to find the perfect match
                  </p>
                </div>
              </div>
              
              <p className="text-base sm:text-lg text-[#131010] mb-6 sm:mb-8 leading-relaxed" 
                 style={{ fontFamily: 'Courier, monospace' }}>
                Players race against time to browse through our curated collection of 500+ memes and select the one that best matches the judge's scenario.
              </p>
              
              <div className="space-y-3 sm:space-y-4">
                <div className="flex items-center gap-3 text-[#131010] text-sm sm:text-base">
                  <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-[#D98324]" />
                  <span style={{ fontFamily: 'Courier, monospace' }}>Countdown timer creates pressure</span>
                </div>
                <div className="flex items-center gap-3 text-[#131010] text-sm sm:text-base">
                  <Camera className="w-5 h-5 sm:w-6 sm:h-6 text-[#5F8B4C]" />
                  <span style={{ fontFamily: 'Courier, monospace' }}>Extensive meme library to choose from</span>
                </div>
                <div className="flex items-center gap-3 text-[#131010] text-sm sm:text-base">
                  <Award className="w-5 h-5 sm:w-6 sm:h-6 text-[#D98324]" />
                  <span style={{ fontFamily: 'Courier, monospace' }}>Strategy meets speed</span>
                </div>
              </div>
            </div>
            
            <div className="relative">
              <div className="relative overflow-hidden rounded-2xl">
                <img 
                  src="memenights.jpg" 
                  alt="Person focused on computer screen"
                  className="w-full h-60 sm:h-80 object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#131010]/60 to-transparent"></div>
                
                {/* Timer Overlay */}
                <div className="absolute top-4 sm:top-6 right-4 sm:right-6">
                  <motion.div
                    className="bg-[#D98324] text-white px-3 sm:px-4 py-2 rounded-full font-bold text-lg sm:text-xl"
                    style={{ fontFamily: 'Monaco, monospace' }}
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  >
                    0:32
                  </motion.div>
                </div>
                
                {/* Meme Gallery Preview */}
                <div className="absolute bottom-4 sm:bottom-6 left-4 sm:left-6 right-4 sm:right-6">
                  <div className="bg-none rounded-lg p-3 sm:p-4">
                    <p className="text-white font-bold mb-2 text-sm sm:text-base" style={{ fontFamily: 'Poppins, system-ui, sans-serif' }}>
                      Browsing Meme Gallery
                    </p>
                    <div className="grid grid-cols-4 gap-1 sm:gap-2">
                      {[1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className="w-8 h-8 sm:w-12 sm:h-12 bg-gradient-to-br from-[#5F8B4C] to-[#4A7A3C] rounded opacity-70 flex items-center justify-center"
                        >
                          <span className="text-white text-xs font-bold">{i}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.section>

      {/* Step 4: The Reveal */}
      <motion.section 
        id="reveal"
        className="container mx-auto px-4 sm:px-6 py-12 sm:py-16"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={sectionVariants}
      >
        <motion.div 
          className="bg-white rounded-2xl p-6 sm:p-8 md:p-12 shadow-lg border border-[#5F8B4C]/20"
          variants={cardVariants}
          whileHover="hover"
        >
          <div className="grid lg:grid-cols-2 gap-8 sm:gap-12 items-center">
            <div className="relative order-2 lg:order-1">
              <div className="relative overflow-hidden rounded-2xl">
                <img 
                  src="winchillguy.jpg" 
                  alt="People laughing and celebrating"
                  className="w-full h-60 sm:h-80 object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#131010]/60 to-transparent"></div>
                
                {/* Score Display */}
                <div className="absolute top-4 sm:top-6 left-4 sm:left-6 right-4 sm:right-6">
                  {/* <div className="bg-[#5F8B4C] text-white rounded-lg p-2 sm:p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm sm:text-base" style={{ fontFamily: 'Poppins, system-ui, sans-serif' }}>Player Score</span>
                      <div className="flex gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className="w-3 h-3 sm:w-4 sm:h-4 fill-current text-yellow-300" />
                        ))}
                      </div>
                    </div>
                  </div> */}
                </div>
                
                <div className="absolute bottom-4 sm:bottom-6 left-4 sm:left-6 right-4 sm:right-6">
                  <div className="bg-white/90 backdrop-blur-sm rounded-lg p-3 sm:p-4">
                    <p className="text-[#131010] font-bold text-sm sm:text-base" style={{ fontFamily: 'Poppins, system-ui, sans-serif' }}>
                      Round Winner Announced!
                    </p>
                    <p className="text-xs sm:text-sm text-[#131010]/70" style={{ fontFamily: 'Courier, monospace' }}>
                      Perfect meme match earns the points
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="order-1 lg:order-2">
              <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-r from-[#5F8B4C] to-[#4A7A3C] rounded-xl flex items-center justify-center">
                  <Trophy className="w-6 h-6 sm:w-10 sm:h-10 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-[#5F8B4C]"
                      style={{ fontFamily: 'Poppins, system-ui, sans-serif' }}>
                    The Reveal
                  </h2>
                  <p className="text-[#D98324] text-base sm:text-lg" style={{ fontFamily: 'Courier, monospace' }}>
                    Showcase and score the submissions
                  </p>
                </div>
              </div>
              
              <p className="text-base sm:text-lg text-[#131010] mb-6 sm:mb-8 leading-relaxed" 
                 style={{ fontFamily: 'Courier, monospace' }}>
                Each player's meme selection is revealed alongside their name. The judge scores each submission, with the best match earning maximum points.
              </p>
              
              <div className="grid grid-cols-1 gap-3 sm:gap-4">
                <motion.div 
                  className="flex items-center gap-3 sm:gap-4 bg-gradient-to-r from-[#5F8B4C] to-[#4A7A3C] text-white px-4 sm:px-6 py-3 sm:py-4 rounded-xl"
                  whileHover={{ scale: 1.02 }}
                >
                  <Gavel className="w-5 h-5 sm:w-6 sm:h-6" />
                  <div className="flex-1">
                    <h4 className="font-bold text-sm sm:text-base" style={{ fontFamily: 'Poppins, system-ui, sans-serif' }}>Judge Evaluation</h4>
                    <p className="text-xs sm:text-sm opacity-90" style={{ fontFamily: 'Courier, monospace' }}>Scores each meme on relevance and humor</p>
                  </div>
                  <div className="flex gap-1">
                    {[...Array(10)].map((_, i) => (
                      <Star key={i} className="w-2 h-2 sm:w-3 sm:h-3 fill-current" />
                    ))}
                  </div>
                </motion.div>
                
                <motion.div 
                  className="flex items-center gap-3 sm:gap-4 bg-gradient-to-r from-[#D98324] to-[#B8741E] text-white px-4 sm:px-6 py-3 sm:py-4 rounded-xl"
                  whileHover={{ scale: 1.02 }}
                >
                  <Award className="w-5 h-5 sm:w-6 sm:h-6" />
                  <div className="flex-1">
                    <h4 className="font-bold text-sm sm:text-base" style={{ fontFamily: 'Poppins, system-ui, sans-serif' }}>Winner Celebration</h4>
                    <p className="text-xs sm:text-sm opacity-90" style={{ fontFamily: 'Courier, monospace' }}>Best meme gets spotlight and points</p>
                  </div>
                  <span className="text-xl sm:text-2xl">🎉</span>
                </motion.div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.section>

      {/* Step 5: Next Round */}
      <motion.section 
        id="next-round"
        className="container mx-auto px-4 sm:px-6 py-12 sm:py-16"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={sectionVariants}
      >
        <motion.div 
          className="bg-white rounded-2xl p-6 sm:p-8 md:p-12 shadow-lg border border-[#D98324]/20"
          variants={cardVariants}
          whileHover="hover"
        >
          <div className="grid lg:grid-cols-2 gap-8 sm:gap-12 items-center">
            <div>
              <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-r from-[#D98324] to-[#B8741E] rounded-xl flex items-center justify-center">
                  <Zap className="w-6 h-6 sm:w-10 sm:h-10 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-[#D98324]"
                      style={{ fontFamily: 'Poppins, system-ui, sans-serif' }}>
                    Next Round
                  </h2>
                  <p className="text-[#5F8B4C] text-base sm:text-lg" style={{ fontFamily: 'Courier, monospace' }}>
                    Keep the momentum going
                  </p>
                </div>
              </div>
              
              <p className="text-base sm:text-lg text-[#131010] mb-6 sm:mb-8 leading-relaxed" 
                 style={{ fontFamily: 'Courier, monospace' }}>
                The game continues with new judges, fresh scenarios, and more hilarious meme matches. Each round builds the competitive excitement.
              </p>
              
              <div className="space-y-3 sm:space-y-4">
                <div className="flex items-center gap-3 text-[#131010] text-sm sm:text-base">
                  <div className="w-3 h-3 bg-[#5F8B4C] rounded-full"></div>
                  <span style={{ fontFamily: 'Courier, monospace' }}>Rotate judges or keep the same one</span>
                </div>
                <div className="flex items-center gap-3 text-[#131010] text-sm sm:text-base">
                  <div className="w-3 h-3 bg-[#D98324] rounded-full"></div>
                  <span style={{ fontFamily: 'Courier, monospace' }}>Fresh scenarios keep it interesting</span>
                </div>
                <div className="flex items-center gap-3 text-[#131010] text-sm sm:text-base">
                  <div className="w-3 h-3 bg-[#5F8B4C] rounded-full"></div>
                  <span style={{ fontFamily: 'Courier, monospace' }}>Points accumulate across rounds</span>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-[#FFDDAB] to-[#FFE4B8] p-6 sm:p-8 rounded-2xl border-2 border-[#5F8B4C]/30">
              <h3 className="text-xl sm:text-2xl font-bold text-[#D98324] mb-4 sm:mb-6 text-center" 
                  style={{ fontFamily: 'Poppins, system-ui, sans-serif' }}>
                Current Leaderboard
              </h3>
              <div className="space-y-3 sm:space-y-4">
                {[
                  { name: "CodeMaster", score: 245, position: 1, avatar: "🏆" },
                  { name: "MemeQueen", score: 198, position: 2, avatar: "👑" },
                  { name: "LaughLord", score: 176, position: 3, avatar: "😂" },
                  { name: "JokeNinja", score: 134, position: 4, avatar: "🥷" }
                ].map((player) => (
                  <motion.div
                    key={player.name}
                    className="flex items-center justify-between bg-white p-3 sm:p-4 rounded-xl shadow-sm border border-[#D98324]/10"
                    whileHover={{ y: -2, shadow: "0 8px 25px rgba(217, 131, 36, 0.15)" }}
                  >
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-white font-bold text-sm sm:text-base ${
                        player.position === 1 ? 'bg-gradient-to-r from-[#D98324] to-[#B8741E]' : 
                        player.position === 2 ? 'bg-gradient-to-r from-[#5F8B4C] to-[#4A7A3C]' : 
                        'bg-gray-400'
                      }`} style={{ fontFamily: 'Poppins, system-ui, sans-serif' }}>
                        {player.position}
                      </div>
                      <div>
                        <div className="font-bold text-[#131010] flex items-center gap-2 text-sm sm:text-base" 
                             style={{ fontFamily: 'Poppins, system-ui, sans-serif' }}>
                          <span>{player.avatar}</span>
                          {player.name}
                        </div>
                        <p className="text-xs sm:text-sm text-[#131010]/60" style={{ fontFamily: 'Courier, monospace' }}>
                          Round Champion
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg sm:text-2xl font-black text-[#5F8B4C]" 
                           style={{ fontFamily: 'Monaco, monospace' }}>
                        {player.score}
                      </div>
                      <p className="text-xs sm:text-sm text-[#131010]/60" style={{ fontFamily: 'Courier, monospace' }}>
                        points
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </motion.section>

      {/* Developer Contact Section */}
      <motion.footer 
        className="bg-[#131010] text-white py-12 sm:py-20"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={sectionVariants}
      >
        <div className="container mx-auto px-4 sm:px-6">
          <motion.div
            className="text-center mb-12 sm:mb-16"
            variants={cardVariants}
          >
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-r from-[#D98324] to-[#B8741E] rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6">
              <span className="text-2xl sm:text-3xl">👨‍💻</span>
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black mb-3 sm:mb-4 text-[#D98324]" 
                style={{ fontFamily: 'Poppins, system-ui, sans-serif' }}>
              Subhash Yaganti
            </h2>
            <p className="text-lg sm:text-xl text-gray-300 mb-3 sm:mb-4" style={{ fontFamily: 'Monaco, monospace' }}>
              Full Stack Developer & Creator of MemeGame
            </p>
            <p className="text-gray-400 max-w-2xl mx-auto text-sm sm:text-base" style={{ fontFamily: 'Courier, monospace' }}>
              Passionate about building engaging digital experiences that bring people together through technology and humor.
            </p>
          </motion.div>
          
          <div className="grid lg:grid-cols-2 gap-8 sm:gap-12 max-w-6xl mx-auto">
            {/* Contact Form */}
            {!submitted ? (
                <motion.div
                  className="bg-white rounded-2xl p-6 sm:p-8 text-[#131010]"
                  variants={cardVariants}
                >
                  <h3
                    className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-[#D98324]"
                    style={{ fontFamily: 'Poppins, system-ui, sans-serif' }}
                  >
                    Let's Collaborate
                  </h3>

                  <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                    <div>
                      <label
                        className="block text-sm font-bold mb-2 text-[#131010]"
                        style={{ fontFamily: 'Courier, monospace' }}
                      >
                        Name
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        className="w-full p-3 sm:p-4 border-2 border-[#5F8B4C]/30 rounded-xl focus:outline-none focus:border-[#D98324] transition-colors bg-[#FFDDAB]/20 text-sm sm:text-base"
                        placeholder="Your name"
                        style={{ fontFamily: 'Courier, monospace', fontSize: '16px' }}
                        required
                      />
                    </div>

                    <div>
                      <label
                        className="block text-sm font-bold mb-2 text-[#131010]"
                        style={{ fontFamily: 'Courier, monospace' }}
                      >
                        Email
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        className="w-full p-3 sm:p-4 border-2 border-[#5F8B4C]/30 rounded-xl focus:outline-none focus:border-[#D98324] transition-colors bg-[#FFDDAB]/20 text-sm sm:text-base"
                        placeholder="your.email@domain.com"
                        style={{ fontFamily: 'Courier, monospace', fontSize: '16px' }}
                        required
                      />
                    </div>

                    <div>
                      <label
                        className="block text-sm font-bold mb-2 text-[#131010]"
                        style={{ fontFamily: 'Courier, monospace' }}
                      >
                        Project Details
                      </label>
                      <textarea
                        name="message"
                        value={formData.message}
                        onChange={handleInputChange}
                        rows={5}
                        className="w-full p-3 sm:p-4 border-2 border-[#5F8B4C]/30 rounded-xl focus:outline-none focus:border-[#D98324] transition-colors resize-none bg-[#FFDDAB]/20 text-sm sm:text-base"
                        placeholder="Tell me about your project vision..."
                        style={{ fontFamily: 'Courier, monospace', fontSize: '16px' }}
                        required
                      />
                    </div>

                  <motion.button
                type="submit"
                disabled={isLoading}
                className={`w-full bg-gradient-to-r from-[#5F8B4C] to-[#4A7A3C] text-white py-3 sm:py-4 rounded-xl font-bold flex items-center justify-center gap-3 text-base sm:text-lg transition-opacity ${
                  isLoading ? 'opacity-70 cursor-not-allowed' : ''
                }`}
                style={{ fontFamily: 'Poppins, system-ui, sans-serif' }}
                whileHover={{ scale: isLoading ? 1 : 1.02 }}
                whileTap={{ scale: isLoading ? 1 : 0.98 }}
              >
                {isLoading ? (
                  <>
                    <svg
                      className="animate-spin h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                      ></path>
                    </svg>
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 sm:w-5 sm:h-5" />
                    Send Message
                  </>
                )}
              </motion.button>

                  </form>
                </motion.div>
              ) : (
                <motion.div
                  className="bg-white rounded-2xl p-6 sm:p-8 text-center text-[#131010]"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5 }}
                >
                  <h3
                    className="text-2xl sm:text-3xl font-bold text-[#5F8B4C] font-['Poppins']"
                  >
                    Thank you!
                  </h3>
                  <p className="mt-2 text-base font-['Courier']">
                    Your message has been sent successfully. I’ll get back to you soon. 🙌
                  </p>
                </motion.div>
              )}

            
            {/* Professional Info & Social Links */}
            <motion.div
              className="space-y-6 sm:space-y-8"
              variants={cardVariants}
            >
              <div className="bg-gradient-to-br from-[#5F8B4C]/20 to-[#4A7A3C]/20 rounded-2xl p-6 sm:p-8 border border-[#5F8B4C]/30">
                <h3 className="text-xl sm:text-2xl font-bold text-[#D98324] mb-4 sm:mb-6" 
                    style={{ fontFamily: 'Poppins, system-ui, sans-serif' }}>
                  Professional Focus
                </h3>
                <div className="space-y-3 sm:space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-[#D98324] rounded-full"></div>
                    <span className="text-sm sm:text-base" style={{ fontFamily: 'Courier, monospace' }}>Full Stack Web Development</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-[#5F8B4C] rounded-full"></div>
                    <span className="text-sm sm:text-base" style={{ fontFamily: 'Courier, monospace' }}>Interactive Game Development</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-[#D98324] rounded-full"></div>
                    <span className="text-sm sm:text-base" style={{ fontFamily: 'Courier, monospace' }}>Real-time Applications</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-[#5F8B4C] rounded-full"></div>
                    <span className="text-sm sm:text-base" style={{ fontFamily: 'Courier, monospace' }}>UI/UX Design Systems</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3 sm:space-y-4">
                <h3 className="text-xl sm:text-2xl font-bold text-[#D98324]" 
                    style={{ fontFamily: 'Poppins, system-ui, sans-serif' }}>
                  Connect
                </h3>
                
                <div className="space-y-2 sm:space-y-3">
                  <motion.a
                    href="https://github.com/subhash-22-codes"
                    className="flex items-center gap-3 sm:gap-4 text-gray-300 hover:text-white transition-colors group p-3 sm:p-4 bg-[#222] rounded-xl"
                    whileHover={{ x: 8, backgroundColor: "#333" }}
                  >
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-[#5F8B4C] to-[#4A7A3C] rounded-xl flex items-center justify-center group-hover:from-[#D98324] group-hover:to-[#B8741E] transition-all">
                      <Github className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    <div>
                      <p className="font-bold text-sm sm:text-base" style={{ fontFamily: 'Poppins, system-ui, sans-serif' }}>GitHub</p>
                      <p className="text-xs sm:text-sm opacity-70" style={{ fontFamily: 'Courier, monospace' }}>View projects & code</p>
                    </div>
                  </motion.a>
                  
                  <motion.a
                    href="https://www.linkedin.com/in/subhash-yaganti-a8b3b626a/"
                    className="flex items-center gap-3 sm:gap-4 text-gray-300 hover:text-white transition-colors group p-3 sm:p-4 bg-[#222] rounded-xl"
                    whileHover={{ x: 8, backgroundColor: "#333" }}
                  >
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-[#5F8B4C] to-[#4A7A3C] rounded-xl flex items-center justify-center group-hover:from-[#D98324] group-hover:to-[#B8741E] transition-all">
                      <Linkedin className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    <div>
                      <p className="font-bold text-sm sm:text-base" style={{ fontFamily: 'Poppins, system-ui, sans-serif' }}>LinkedIn</p>
                      <p className="text-xs sm:text-sm opacity-70" style={{ fontFamily: 'Courier, monospace' }}>Professional network</p>
                    </div>
                  </motion.a>
                  
                  <motion.a
                    href="mailto:suryayaganti2003@gmail.com"
                    className="flex items-center gap-3 sm:gap-4 text-gray-300 hover:text-white transition-colors group p-3 sm:p-4 bg-[#222] rounded-xl"
                    whileHover={{ x: 8, backgroundColor: "#333" }}
                  >
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-[#5F8B4C] to-[#4A7A3C] rounded-xl flex items-center justify-center group-hover:from-[#D98324] group-hover:to-[#B8741E] transition-all">
                      <Mail className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    <div>
                      <p className="font-bold text-sm sm:text-base" style={{ fontFamily: 'Poppins, system-ui, sans-serif' }}>Email</p>
                      <p className="text-xs sm:text-sm opacity-70" style={{ fontFamily: 'Courier, monospace' }}>Direct contact</p>
                    </div>
                  </motion.a>
                </div>
              </div>
            </motion.div>
          </div>
          
          <motion.div
            className="text-center mt-12 sm:mt-16 pt-6 sm:pt-8 border-t border-gray-700"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.6 }}
          >
            <p className="text-gray-400 text-sm sm:text-base" style={{ fontFamily: 'Monaco, monospace' }}>
              © 2025 MemeGame. Crafted with passion and precision.
            </p>
          </motion.div>
        </div>
      </motion.footer>
    </div>
  );
};

export default HowToPlay;