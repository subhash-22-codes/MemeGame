import React from 'react';
import { motion } from 'framer-motion';
import { Users, EyeOff, Zap } from 'lucide-react';

const WhyMemeGame: React.FC = () => {
  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8 bg-white border-b-4 border-[#131010] overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16 sm:mb-24">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl sm:text-4xl md:text-6xl font-black text-[#131010] font-poppins tracking-tight mb-4 px-2"
          >
            Why is this <span className="text-[#D98324] underline decoration-4 underline-offset-8">different?</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-xl text-[#131010]/70 font-medium max-w-2xl mx-auto"
          >
            We took everything annoying about party games and threw it in the trash.
          </motion.p>
        </div>

        <div className="grid md:grid-cols-3 gap-12 lg:gap-16">
          {/* Feature 1 */}
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="flex flex-col items-center text-center"
          >
            <div className="w-20 h-20 bg-[#FFDDAB] rounded-2xl border-4 border-[#131010] shadow-[6px_6px_0px_0px_#131010] flex items-center justify-center mb-8 transform -rotate-3 hover:rotate-0 transition-transform">
              <Users size={32} className="text-[#131010]" strokeWidth={2.5} />
            </div>
            <h3 className="text-2xl font-black text-[#131010] mb-4 font-poppins">No Single Dictator</h3>
            <p className="text-[#131010]/80 font-medium leading-relaxed">
              Unlike other games where one boring judge decides who wins, our <strong className="text-[#D98324]">Community Voting</strong> means everyone judges everyone. Democracy is hilarious.
            </p>
          </motion.div>

          {/* Feature 2 */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex flex-col items-center text-center mt-0 md:mt-12"
          >
            <div className="w-20 h-20 bg-[#5F8B4C] rounded-2xl border-4 border-[#131010] shadow-[6px_6px_0px_0px_#131010] flex items-center justify-center mb-8 transform rotate-3 hover:rotate-0 transition-transform">
              <EyeOff size={32} className="text-white" strokeWidth={2.5} />
            </div>
            <h3 className="text-2xl font-black text-[#131010] mb-4 font-poppins">Total Anonymity</h3>
            <p className="text-[#131010]/80 font-medium leading-relaxed">
              Nobody knows who dropped the meme until the votes are locked in. Play dirty without the immediate guilt. (The guilt comes later).
            </p>
          </motion.div>

          {/* Feature 3 */}
          <motion.div 
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex flex-col items-center text-center mt-0 md:mt-24"
          >
            <div className="w-20 h-20 bg-[#D98324] rounded-2xl border-4 border-[#131010] shadow-[6px_6px_0px_0px_#131010] flex items-center justify-center mb-8 transform -rotate-6 hover:rotate-0 transition-transform">
              <Zap size={32} className="text-[#131010]" strokeWidth={2.5} />
            </div>
            <h3 className="text-2xl font-black text-[#131010] mb-4 font-poppins">Real-Time Chaos</h3>
            <p className="text-[#131010]/80 font-medium leading-relaxed">
              Lightning-fast rounds keep the energy peaking. No waiting around for that one friend who always takes 10 minutes to take their turn.
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default WhyMemeGame;
