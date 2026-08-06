import React from 'react';
import { motion } from 'framer-motion';
import { Smartphone, UserCircle2, PencilLine, Wifi, DownloadCloud } from 'lucide-react';

const BentoFeatures: React.FC = () => {
  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8 bg-white border-b-4 border-[#131010]">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl sm:text-4xl md:text-6xl font-black text-[#131010] font-poppins tracking-tight mb-4 px-2"
          >
            The Details
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-xl text-[#131010]/70 font-medium max-w-2xl mx-auto"
          >
            Everything you need for a seamless game night.
          </motion.p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-6 auto-rows-[200px]">
          
          {/* Block 1 (Large) - Mobile First */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="md:col-span-4 lg:col-span-4 row-span-2 bg-[#FFDDAB] rounded-3xl border-4 border-[#131010] p-8 sm:p-12 shadow-[8px_8px_0px_0px_#131010] flex flex-col md:flex-row items-center justify-between gap-8 group overflow-hidden"
          >
            <div className="flex-1 z-10">
              <div className="w-16 h-16 bg-white border-4 border-[#131010] rounded-2xl flex items-center justify-center shadow-[4px_4px_0px_0px_#131010] mb-6 group-hover:-translate-y-2 transition-transform">
                <Smartphone size={32} className="text-[#131010]" strokeWidth={2.5} />
              </div>
              <h3 className="text-3xl sm:text-4xl font-black text-[#131010] font-poppins mb-4">100% Mobile Optimized.</h3>
              <p className="text-lg text-[#131010]/80 font-medium leading-relaxed max-w-md">
                Play on the couch, at the bar, or secretly under the table during a meeting. The UI is built for fat thumbs and fast taps.
              </p>
            </div>
            {/* Visual element */}
            <div className="hidden md:block flex-1 relative h-full min-h-[250px] w-full">
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-48 h-80 bg-white border-4 border-[#131010] rounded-[2rem] shadow-[8px_8px_0px_0px_rgba(0,0,0,0.2)] p-2 transform rotate-12 group-hover:rotate-6 transition-transform duration-500">
                <div className="w-full h-full bg-[#131010] rounded-[1.5rem] p-4 flex flex-col gap-2">
                  <div className="w-full h-24 bg-[#D98324] rounded-lg"></div>
                  <div className="flex-1 bg-[#5F8B4C] rounded-lg"></div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Block 2 (Medium) - Guest Mode */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="md:col-span-2 lg:col-span-2 row-span-1 bg-[#5F8B4C] rounded-3xl border-4 border-[#131010] p-8 shadow-[6px_6px_0px_0px_#131010] flex flex-col justify-end relative overflow-hidden group"
          >
            <div className="absolute top-6 right-6 w-12 h-12 bg-white/20 rounded-full flex items-center justify-center transform group-hover:rotate-12 transition-transform">
              <UserCircle2 size={24} className="text-white" strokeWidth={2.5} />
            </div>
            <h3 className="text-2xl font-black text-white font-poppins mb-2 relative z-10">Guest Mode</h3>
            <p className="text-white/80 font-medium text-sm relative z-10">Jump right into a party without signing up. We don't care.</p>
          </motion.div>

          {/* Block 3 (Medium) - Custom Prompts */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="md:col-span-2 lg:col-span-2 row-span-1 bg-white rounded-3xl border-4 border-[#131010] p-8 shadow-[6px_6px_0px_0px_#131010] flex flex-col justify-end relative overflow-hidden group"
          >
            <div className="absolute top-6 right-6 w-12 h-12 bg-[#FFDDAB] border-2 border-[#131010] rounded-xl flex items-center justify-center transform group-hover:-rotate-12 transition-transform">
              <PencilLine size={24} className="text-[#131010]" strokeWidth={2.5} />
            </div>
            <h3 className="text-2xl font-black text-[#131010] font-poppins mb-2 relative z-10">Custom Prompts</h3>
            <p className="text-[#131010]/70 font-medium text-sm relative z-10">Add inside jokes to the deck and roast your specific friend group.</p>
          </motion.div>

          {/* Block 4 (Small) - Real-time */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="md:col-span-2 lg:col-span-3 row-span-1 bg-[#131010] rounded-3xl border-4 border-[#131010] p-8 shadow-[6px_6px_0px_0px_#D98324] flex items-center gap-6 group"
          >
            <div className="w-16 h-16 bg-[#D98324] rounded-full flex items-center justify-center flex-shrink-0 animate-pulse">
              <Wifi size={28} className="text-[#131010]" strokeWidth={3} />
            </div>
            <div>
              <h3 className="text-xl font-black text-white font-poppins mb-1">Real-time Sync</h3>
              <p className="text-white/60 font-medium text-sm">Powered by WebSockets. Instant updates, zero refreshing.</p>
            </div>
          </motion.div>

          {/* Block 5 (Small) - No App Downloads */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.4 }}
            className="md:col-span-2 lg:col-span-3 row-span-1 bg-[#D98324] rounded-3xl border-4 border-[#131010] p-8 shadow-[6px_6px_0px_0px_#131010] flex items-center gap-6 group overflow-hidden relative"
          >
            <div className="absolute -right-4 -bottom-4 opacity-20 transform group-hover:scale-110 transition-transform">
              <DownloadCloud size={120} />
            </div>
            <div className="relative z-10">
              <h3 className="text-2xl font-black text-[#131010] font-poppins mb-2">No App Downloads</h3>
              <p className="text-[#131010]/80 font-medium text-sm max-w-[200px]">Send a link. Your friends click it. You play. That's it.</p>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
};

export default BentoFeatures;
