import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Crown, Gamepad, Timer, Trophy, Zap, Users, MessageCircle, Star, RotateCcw, Github, Linkedin, Mail, Send, Gavel, Camera, Clock, Play, ArrowLeft, Twitter, CheckCircle, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

const HowToPlay: React.FC = () => {
  // --- WIRING INTACT ---
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

        // Toast handling by status code
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
  // ---------------------

  const sectionVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.4, ease: "easeOut" }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, scale: 0.98 },
    visible: { 
      opacity: 1, 
      scale: 1,
      transition: { duration: 0.3, ease: "easeOut" }
    },
    hover: { 
      y: -4,
      transition: { duration: 0.2 }
    }
  };

  const steps = [
    { id: 'judge-selection', title: 'Judge Selection', icon: Crown, color: 'bg-[#D98324]' },
    { id: 'set-scene', title: 'Set Scene', icon: MessageCircle, color: 'bg-[#5F8B4C]' },
    { id: 'meme-hunt', title: 'Meme Hunt', icon: Timer, color: 'bg-[#D98324]' },
    { id: 'reveal', title: 'The Reveal', icon: Trophy, color: 'bg-[#5F8B4C]' },
    { id: 'next-round', title: 'Next Round', icon: Zap, color: 'bg-[#D98324]' }
  ];

  return (
    <div className="min-h-screen bg-[#FFDDAB] font-poppins selection:bg-[#D98324] selection:text-white">
      
      {/* Navigation Header */}
      <header className="bg-[#FFDDAB] border-b-4 border-[#131010] sticky top-0 z-50 transition-all">
        <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => window.history.back()}
                className="w-10 h-10 bg-white border-2 border-[#131010] shadow-[2px_2px_0px_0px_#131010] active:translate-y-[2px] active:shadow-none rounded-lg flex items-center justify-center transition-all"
              >
                <ArrowLeft className="w-5 h-5 text-[#131010]" strokeWidth={3} />
              </button>
              <div className="w-10 h-10 bg-[#5F8B4C] border-2 border-[#131010] shadow-[2px_2px_0px_0px_#131010] rounded-lg flex items-center justify-center">
                <Play className="w-5 h-5 text-white fill-current" strokeWidth={2} />
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-[#131010] tracking-tight hidden sm:block">
                Rulebook
              </h1>
            </div>
            
            {/* Desktop Navigation (Tactile Tabs) */}
            <nav className="hidden lg:flex items-center gap-2">
              {steps.map((step, index) => (
                <button
                  key={step.id}
                  onClick={() => scrollToSection(step.id)}
                  className={`px-4 py-2 font-bold text-sm rounded-lg border-2 transition-all ${
                    activeSection === step.id 
                      ? 'bg-[#131010] border-[#131010] text-white shadow-[2px_2px_0px_0px_#D98324]' 
                      : 'bg-transparent border-transparent text-[#131010]/60 hover:text-[#131010] hover:bg-[#131010]/5'
                  }`}
                  style={{ fontFamily: 'Courier, monospace' }}
                >
                  {index + 1}. {step.title}
                </button>
              ))}
            </nav>

            {/* Mobile Menu Indicator */}
            <div className="lg:hidden flex items-center gap-1.5 bg-white border-2 border-[#131010] p-1.5 rounded-full shadow-[2px_2px_0px_0px_#131010]">
              {steps.map((step) => (
                <button
                  key={step.id}
                  onClick={() => scrollToSection(step.id)}
                  className={`h-2.5 rounded-full transition-all ${
                    activeSection === step.id ? 'bg-[#131010] w-6' : 'bg-[#131010]/20 w-2.5'
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
        className="container mx-auto px-4 sm:px-6 py-16 sm:py-24 text-center relative"
        initial="hidden"
        animate="visible"
        variants={sectionVariants}
      >
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="inline-block px-4 py-1.5 rounded-full bg-white border-2 border-[#131010] text-[#131010] font-bold text-sm mb-6 shadow-[2px_2px_0px_0px_#131010] transform -rotate-1 uppercase tracking-widest font-courier">
            Player Manual
          </div>
          <h1 className="text-5xl sm:text-6xl md:text-8xl font-black text-[#131010] mb-6 tracking-tight leading-none">
            How to Play <br/>
            <span className="text-[#D98324] drop-shadow-[4px_4px_0px_#131010]">MemeGame</span>
          </h1>
          <p className="text-lg sm:text-xl font-medium text-[#131010]/80 mb-12 max-w-2xl mx-auto leading-relaxed">
            A hilarious multiplayer game where creativity meets comedy. Read the rules below or just jump in and figure it out.
          </p>
        </motion.div>

        {/* Game Preview Images (Bento Grid) */}
        <motion.div
          className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-5 max-w-5xl mx-auto mb-16"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          {[
            { icon: Users, color: 'bg-[#5F8B4C]', img: 'JS.png' },
            { icon: Gamepad, color: 'bg-[#D98324]', img: 'chat.png' },
            { icon: Timer, color: 'bg-[#131010]', img: 'memetime.png' },
            { icon: Trophy, color: 'bg-[#FFDDAB]', img: 'winner.png', iconColor: 'text-[#131010]' }
          ].map((item, i) => (
            <div key={i} className="relative overflow-hidden rounded-xl aspect-square border-4 border-[#131010] shadow-[6px_6px_0px_0px_#131010] group">
              <img src={item.img} alt="Preview" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
              <div className={`absolute inset-0 ${item.color}/60 flex items-center justify-center backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-300`}>
                <item.icon className={`w-10 h-10 ${item.iconColor || 'text-white'}`} strokeWidth={2.5} />
              </div>
            </div>
          ))}
        </motion.div>

        {/* Scroll Indicator */}
        <motion.div
          className="flex flex-col items-center gap-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <p className="text-sm font-bold text-[#131010]/50 uppercase tracking-widest font-courier">
            Scroll to learn
          </p>
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="w-6 h-10 border-2 border-[#131010] rounded-full flex justify-center bg-white"
          >
            <div className="w-1.5 h-3 bg-[#131010] rounded-full mt-1.5"></div>
          </motion.div>
        </motion.div>
      </motion.section>

      {/* --- STEPS --- */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-24 space-y-12 sm:space-y-16">
        
        {/* Step 1: Judge Selection */}
        <motion.section id="judge-selection" initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={sectionVariants}>
          <motion.div className="bg-white rounded-3xl p-6 sm:p-10 border-4 border-[#131010] shadow-[8px_8px_0px_0px_#131010]" variants={cardVariants} whileHover="hover">
            <div className="grid lg:grid-cols-2 gap-8 sm:gap-12 items-center">
              <div>
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 bg-[#D98324] border-2 border-[#131010] shadow-[2px_2px_0px_0px_#131010] rounded-xl flex items-center justify-center -rotate-3">
                    <Crown className="w-7 h-7 text-[#131010]" strokeWidth={2.5} />
                  </div>
                  <div>
                    <h2 className="text-3xl font-black text-[#131010] tracking-tight">1. Judge Selection</h2>
                    <p className="text-[#D98324] font-bold font-courier tracking-widest uppercase text-sm">Choose your Overlord</p>
                  </div>
                </div>
                
                <p className="text-lg text-[#131010]/80 mb-8 font-medium leading-relaxed">
                  The host decides how to select the judge who will evaluate memes and determine the winner of each round.
                </p>
                
                <div className="space-y-4">
                  <div className="flex items-center gap-4 bg-[#FFDDAB]/20 border-2 border-[#131010] px-5 py-4 rounded-xl shadow-[2px_2px_0px_0px_#131010]">
                    <div className="bg-white p-2 rounded-lg border-2 border-[#131010]"><RotateCcw className="w-5 h-5 text-[#131010]" /></div>
                    <div>
                      <h4 className="font-black text-[#131010]">Random Selection</h4>
                      <p className="text-sm font-medium text-[#131010]/60">Spin the wheel of destiny.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 bg-[#FFDDAB]/20 border-2 border-[#131010] px-5 py-4 rounded-xl shadow-[2px_2px_0px_0px_#131010]">
                    <div className="bg-white p-2 rounded-lg border-2 border-[#131010]"><Users className="w-5 h-5 text-[#131010]" /></div>
                    <div>
                      <h4 className="font-black text-[#131010]">Host Assignment</h4>
                      <p className="text-sm font-medium text-[#131010]/60">Strategic judge selection.</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="relative rounded-2xl border-4 border-[#131010] shadow-[6px_6px_0px_0px_#131010] overflow-hidden bg-white h-60 sm:h-80">
                <img src="judge2.jpg" alt="Judge" className="w-full h-full object-cover" />
                <div className="absolute bottom-4 left-4 bg-white border-2 border-[#131010] shadow-[2px_2px_0px_0px_#131010] rounded-lg p-3">
                  <p className="font-black text-sm text-[#131010]">The Judge Has Arrived!</p>
                  <p className="text-xs font-bold text-[#131010]/60 font-courier">Ready to evaluate your memes</p>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.section>

        {/* Step 2: Set the Scene */}
        <motion.section id="set-scene" initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={sectionVariants}>
          <motion.div className="bg-[#5F8B4C] rounded-3xl p-6 sm:p-10 border-4 border-[#131010] shadow-[8px_8px_0px_0px_#131010]" variants={cardVariants} whileHover="hover">
            <div className="grid lg:grid-cols-2 gap-8 sm:gap-12 items-center">
              <div className="relative rounded-2xl border-4 border-[#131010] shadow-[6px_6px_0px_0px_#131010] overflow-hidden bg-white h-60 sm:h-80 order-2 lg:order-1">
                <img src="codeworks.jpg" alt="Code works" className="w-full h-full object-cover" />
                <div className="absolute bottom-4 right-4 bg-[#FFDDAB] border-2 border-[#131010] shadow-[2px_2px_0px_0px_#131010] rounded-lg p-3 max-w-[80%]">
                  <p className="font-black text-sm text-[#131010]">"When your code works on the first try..."</p>
                  <p className="text-xs font-bold text-[#131010]/60 font-courier mt-1">Challenge Set!</p>
                </div>
              </div>

              <div className="order-1 lg:order-2 text-white">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 bg-white border-2 border-[#131010] shadow-[2px_2px_0px_0px_#131010] rounded-xl flex items-center justify-center rotate-3">
                    <MessageCircle className="w-7 h-7 text-[#131010]" strokeWidth={2.5} />
                  </div>
                  <div>
                    <h2 className="text-3xl font-black tracking-tight">2. Set the Scene</h2>
                    <p className="text-[#FFDDAB] font-bold font-courier tracking-widest uppercase text-sm">Drop a meme-worthy line</p>
                  </div>
                </div>
                
                <p className="text-lg text-white/90 mb-8 font-medium leading-relaxed">
                  The judge creates a scenario, phrase, or situation that players must match with the perfect meme from their deck.
                </p>
                
                <div className="bg-[#131010] p-5 rounded-xl border-2 border-[#131010] shadow-[4px_4px_0px_0px_#131010]">
                  <h4 className="font-bold text-[#FFDDAB] mb-3 text-sm uppercase tracking-wider font-courier">Example Scenarios:</h4>
                  <ul className="space-y-3 text-white font-medium">
                    <li className="flex items-start gap-2">
                      <Zap className="w-5 h-5 text-[#D98324] shrink-0" />
                      "When you finally understand recursion"
                    </li>
                    <li className="flex items-start gap-2">
                      <Zap className="w-5 h-5 text-[#D98324] shrink-0" />
                      "Trying to explain APIs to non-developers"
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.section>

        {/* Step 3: Meme Hunt */}
        <motion.section id="meme-hunt" initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={sectionVariants}>
          <motion.div className="bg-white rounded-3xl p-6 sm:p-10 border-4 border-[#131010] shadow-[8px_8px_0px_0px_#131010]" variants={cardVariants} whileHover="hover">
            <div className="grid lg:grid-cols-2 gap-8 sm:gap-12 items-center">
              <div>
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 bg-[#D98324] border-2 border-[#131010] shadow-[2px_2px_0px_0px_#131010] rounded-xl flex items-center justify-center -rotate-3">
                    <Timer className="w-7 h-7 text-[#131010]" strokeWidth={2.5} />
                  </div>
                  <div>
                    <h2 className="text-3xl font-black text-[#131010] tracking-tight">3. Meme Hunt</h2>
                    <p className="text-[#5F8B4C] font-bold font-courier tracking-widest uppercase text-sm">Beat the Clock</p>
                  </div>
                </div>
                
                <p className="text-lg text-[#131010]/80 mb-8 font-medium leading-relaxed">
                  Players race against time to browse through our curated collection of memes and select the one that best matches the judge's scenario.
                </p>
                
                <div className="space-y-4 font-bold text-[#131010]">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#FFDDAB] rounded-md border-2 border-[#131010]"><Clock className="w-4 h-4" /></div>
                    <span>Countdown timer creates pressure</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#5F8B4C] rounded-md border-2 border-[#131010]"><Camera className="w-4 h-4 text-white" /></div>
                    <span>Extensive library to choose from</span>
                  </div>
                </div>
              </div>
              
              <div className="relative rounded-2xl border-4 border-[#131010] shadow-[6px_6px_0px_0px_#131010] overflow-hidden bg-white h-60 sm:h-80">
                <img src="memenights.jpg" alt="Hunt" className="w-full h-full object-cover" />
                <div className="absolute top-4 right-4 bg-[#D98324] text-[#131010] border-2 border-[#131010] shadow-[2px_2px_0px_0px_#131010] px-4 py-2 rounded-full font-black text-xl">
                  0:32
                </div>
                <div className="absolute bottom-4 left-4 bg-white border-2 border-[#131010] shadow-[2px_2px_0px_0px_#131010] rounded-lg p-3">
                  <p className="font-black text-sm text-[#131010] mb-2">Browsing Gallery...</p>
                  <div className="flex gap-2">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="w-10 h-10 bg-[#FFDDAB] border border-[#131010] rounded-md flex items-center justify-center text-xs font-bold opacity-70">IMG</div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.section>

        {/* Step 4: The Reveal */}
        <motion.section id="reveal" initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={sectionVariants}>
          <motion.div className="bg-[#131010] rounded-3xl p-6 sm:p-10 border-4 border-[#131010] shadow-[8px_8px_0px_0px_#D98324]" variants={cardVariants} whileHover="hover">
            <div className="grid lg:grid-cols-2 gap-8 sm:gap-12 items-center">
              <div className="relative rounded-2xl border-4 border-[#D98324] shadow-[6px_6px_0px_0px_#D98324] overflow-hidden bg-white h-60 sm:h-80 order-2 lg:order-1">
                <img src="winchillguy.jpg" alt="Reveal" className="w-full h-full object-cover" />
                <div className="absolute bottom-4 left-4 bg-white border-2 border-[#131010] shadow-[2px_2px_0px_0px_#131010] rounded-lg p-3">
                  <p className="font-black text-sm text-[#131010]">Round Winner!</p>
                  <p className="text-xs font-bold text-[#131010]/60 font-courier">Perfect match earned the points</p>
                </div>
              </div>

              <div className="order-1 lg:order-2 text-white">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 bg-[#5F8B4C] border-2 border-[#D98324] shadow-[2px_2px_0px_0px_#D98324] rounded-xl flex items-center justify-center rotate-3">
                    <Trophy className="w-7 h-7 text-[#131010]" strokeWidth={2.5} />
                  </div>
                  <div>
                    <h2 className="text-3xl font-black tracking-tight text-white">4. The Reveal</h2>
                    <p className="text-[#D98324] font-bold font-courier tracking-widest uppercase text-sm">Score the Submissions</p>
                  </div>
                </div>
                
                <p className="text-lg text-white/80 mb-8 font-medium leading-relaxed">
                  Each player's meme is revealed. The judge rates each submission, and the funniest match takes the points.
                </p>
                
                <div className="grid gap-4">
                  <div className="flex items-center gap-4 bg-white/10 border-2 border-[#D98324] px-5 py-4 rounded-xl">
                    <Gavel className="w-6 h-6 text-[#D98324]" />
                    <div>
                      <h4 className="font-bold text-white">Judge Evaluation</h4>
                      <div className="flex gap-1 mt-1">
                        {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-[#D98324] text-[#D98324]" />)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.section>

        {/* Step 5: Next Round & Leaderboard */}
        <motion.section id="next-round" initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={sectionVariants}>
          <motion.div className="bg-white rounded-3xl p-6 sm:p-10 border-4 border-[#131010] shadow-[8px_8px_0px_0px_#131010]" variants={cardVariants} whileHover="hover">
            <div className="grid lg:grid-cols-2 gap-8 sm:gap-12 items-center">
              <div>
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 bg-[#D98324] border-2 border-[#131010] shadow-[2px_2px_0px_0px_#131010] rounded-xl flex items-center justify-center rotate-3">
                    <Zap className="w-7 h-7 text-[#131010]" strokeWidth={2.5} />
                  </div>
                  <div>
                    <h2 className="text-3xl font-black text-[#131010] tracking-tight">5. Next Round</h2>
                    <p className="text-[#5F8B4C] font-bold font-courier tracking-widest uppercase text-sm">Keep the momentum going</p>
                  </div>
                </div>
                
                <p className="text-lg text-[#131010]/80 mb-8 font-medium leading-relaxed">
                  The game continues with new judges, fresh scenarios, and more hilarious meme matches. Points accumulate until a final winner is crowned!
                </p>
                
                <div className="space-y-4 font-bold text-[#131010]">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 bg-[#5F8B4C] border-2 border-[#131010] rounded-full shrink-0"></div>
                    <span>Rotate judges or keep the same one</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 bg-[#D98324] border-2 border-[#131010] rounded-full shrink-0"></div>
                    <span>Fresh scenarios keep it interesting</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 bg-[#FFDDAB] border-2 border-[#131010] rounded-full shrink-0"></div>
                    <span>Watch the leaderboard heat up</span>
                  </div>
                </div>
              </div>
              
              {/* Leaderboard Bento Box */}
              <div className="bg-[#FFDDAB] p-6 sm:p-8 rounded-2xl border-4 border-[#131010] shadow-[6px_6px_0px_0px_#131010]">
                <h3 className="text-xl sm:text-2xl font-black text-[#131010] mb-6 text-center tracking-tight">
                  Current Leaderboard
                </h3>
                <div className="space-y-3">
                  {[
                    { name: "CodeMaster", score: 245, position: 1, avatar: "🏆" },
                    { name: "MemeQueen", score: 198, position: 2, avatar: "👑" },
                    { name: "LaughLord", score: 176, position: 3, avatar: "😂" },
                    { name: "JokeNinja", score: 134, position: 4, avatar: "🥷" }
                  ].map((player) => (
                    <div key={player.name} className="flex items-center justify-between bg-white p-3 sm:p-4 rounded-xl border-2 border-[#131010] shadow-[3px_3px_0px_0px_#131010] hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_#131010] transition-all">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center text-[#131010] font-black border-2 border-[#131010] ${
                          player.position === 1 ? 'bg-[#D98324]' : 
                          player.position === 2 ? 'bg-[#5F8B4C]' : 
                          'bg-gray-200'
                        }`}>
                          {player.position}
                        </div>
                        <div>
                          <div className="font-bold text-[#131010] flex items-center gap-2 text-sm sm:text-base">
                            <span>{player.avatar}</span> {player.name}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg sm:text-xl font-black text-[#131010] font-poppins">
                          {player.score}
                        </div>
                        <p className="text-[10px] font-bold text-[#131010]/60 font-courier uppercase tracking-wider">
                          pts
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </motion.div>
        </motion.section>

      </div>

      {/* Developer Contact & Footer Section */}
      <motion.footer 
        className="bg-white border-t-4 border-[#131010] py-16 sm:py-24"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={sectionVariants}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <div className="w-20 h-20 bg-[#FFDDAB] border-4 border-[#131010] shadow-[4px_4px_0px_0px_#131010] rounded-2xl flex items-center justify-center mx-auto mb-6 -rotate-3">
              <span className="text-4xl">👨‍💻</span>
            </div>
            <h2 className="text-4xl sm:text-5xl font-black text-[#131010] mb-4">Subhash Yaganti</h2>
            <p className="text-xl font-bold text-[#5F8B4C] font-courier uppercase tracking-widest mb-4">Creator of MemeGame</p>
            <p className="text-[#131010]/70 font-medium max-w-2xl mx-auto text-lg">
              Full Stack Developer passionate about building engaging digital experiences that bring people together through humor.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
            
            {/* Contact Form (Tactile Bento) */}
            <div className="bg-[#FFDDAB] rounded-3xl p-8 border-4 border-[#131010] shadow-[8px_8px_0px_0px_#131010]">
              {!submitted ? (
                <>
                  <h3 className="text-2xl font-black mb-6 text-[#131010]">Let's Collaborate</h3>
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-[#131010]/60 uppercase tracking-wider font-courier">Name</label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-3 bg-white text-[#131010] text-sm font-poppins font-semibold border-2 border-[#131010] rounded-xl transition-shadow focus:outline-none focus:shadow-[2px_2px_0px_0px_#131010]"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-[#131010]/60 uppercase tracking-wider font-courier">Email</label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-3 bg-white text-[#131010] text-sm font-poppins font-semibold border-2 border-[#131010] rounded-xl transition-shadow focus:outline-none focus:shadow-[2px_2px_0px_0px_#131010]"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-[#131010]/60 uppercase tracking-wider font-courier">Message</label>
                      <textarea
                        name="message"
                        value={formData.message}
                        onChange={handleInputChange}
                        required
                        rows={4}
                        className="w-full px-4 py-3 bg-white text-[#131010] text-sm font-poppins font-semibold border-2 border-[#131010] rounded-xl transition-shadow focus:outline-none focus:shadow-[2px_2px_0px_0px_#131010] resize-none"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full flex items-center justify-center gap-2 bg-[#5F8B4C] text-white py-3.5 rounded-xl border-2 border-[#131010] shadow-[3px_3px_0px_0px_#131010] hover:shadow-[4px_4px_0px_0px_#131010] active:translate-y-[2px] active:shadow-none font-bold transition-all disabled:opacity-50"
                    >
                      {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Send className="w-5 h-5" /> Send Message</>}
                    </button>
                  </form>
                </>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center py-12">
                  <div className="w-16 h-16 bg-white border-4 border-[#131010] shadow-[4px_4px_0px_0px_#131010] rounded-full flex items-center justify-center mb-4">
                    <CheckCircle className="w-8 h-8 text-[#5F8B4C]" strokeWidth={3} />
                  </div>
                  <h3 className="text-2xl font-black text-[#131010] mb-2">Message Sent!</h3>
                  <p className="font-bold text-[#131010]/70 font-courier">I'll get back to you soon.</p>
                </div>
              )}
            </div>
            
            {/* Links & Info */}
            <div className="flex flex-col justify-between space-y-8">
              <div className="bg-white rounded-3xl p-8 border-4 border-[#131010] shadow-[8px_8px_0px_0px_#131010]">
                <h3 className="text-xl font-black text-[#131010] mb-6">Connect & Follow</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { icon: Github, label: "GitHub", href: "https://github.com/subhash-22-codes", color: "bg-[#131010] text-white" },
                    { icon: Linkedin, label: "LinkedIn", href: "https://www.linkedin.com/in/subhash-yaganti-a8b3b626a/", color: "bg-[#0A66C2] text-white" },
                    { icon: Twitter, label: "Twitter / X", href: "https://x.com/SYaganti44806", color: "bg-[#1DA1F2] text-white" },
                    { icon: Mail, label: "Email Me", href: "mailto:suryayaganti2003@gmail.com", color: "bg-[#D98324] text-[#131010]" }
                  ].map((link, i) => (
                    <a key={i} href={link.href} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-xl border-2 border-[#131010] hover:-translate-y-1 hover:shadow-[3px_3px_0px_0px_#131010] transition-all bg-white group">
                      <div className={`p-2 rounded-lg border-2 border-[#131010] ${link.color}`}>
                        <link.icon size={18} strokeWidth={2.5} />
                      </div>
                      <span className="font-bold text-sm text-[#131010]">{link.label}</span>
                    </a>
                  ))}
                </div>
              </div>

              <div className="text-center md:text-left mt-auto">
                <p className="text-[#131010] font-black text-2xl tracking-tight mb-1">MemeGame.</p>
                <p className="text-[#131010]/60 font-bold font-courier text-xs uppercase tracking-widest">© 2025. Built for laughs.</p>
              </div>
            </div>

          </div>
        </div>
      </motion.footer>

    </div>
  );
};

export default HowToPlay;