import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, Medal, Star } from 'lucide-react';

const ScoringPodium: React.FC = () => {
  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8 bg-[#131010] border-b-4 border-[#131010] relative overflow-hidden">
      {/* Decorative background grid */}
      <div className="absolute inset-0 opacity-[0.05] bg-[linear-gradient(#ffffff_1px,transparent_1px),linear-gradient(90deg,#ffffff_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

      <div className="max-w-5xl mx-auto relative z-10">
        <div className="text-center mb-16">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl sm:text-4xl md:text-6xl font-black text-white font-poppins tracking-tight mb-4 px-2"
          >
            How Scoring Works
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-xl text-[#FFDDAB]/70 font-medium max-w-2xl mx-auto"
          >
            Because it's not a real game if you can't aggressively flex your points.
          </motion.p>
        </div>

        {/* The Detailed Scoring Table */}
        <div className="bg-[#1C1919] rounded-3xl border-4 border-[#2A2525] p-1 sm:p-6 shadow-[8px_8px_0px_0px_#000000] overflow-hidden">
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[500px]">
              <thead>
                <tr className="border-b-4 border-[#2A2525]">
                  <th className="py-5 px-6 text-gray-500 font-black uppercase tracking-widest text-xs sm:text-sm">Action / Event</th>
                  <th className="py-5 px-6 text-gray-500 font-black uppercase tracking-widest text-xs sm:text-sm">Description</th>
                  <th className="py-5 px-6 text-gray-500 font-black uppercase tracking-widest text-xs sm:text-sm text-right">Points Awarded</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-[#2A2525]">
                
                {/* Rank 1 */}
                <tr className="hover:bg-[#2A2525]/30 transition-colors group">
                  <td className="py-6 px-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-yellow-400 rounded-full border-2 border-[#131010] flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                        <Trophy size={20} className="text-yellow-900" />
                      </div>
                      <span className="font-black text-white text-lg sm:text-xl">1st Place Vote</span>
                    </div>
                  </td>
                  <td className="py-6 px-6 text-gray-400 font-medium leading-relaxed max-w-sm">
                    Received when another player selects your meme as their absolute favorite for the round.
                  </td>
                  <td className="py-6 px-6 text-right font-black text-[#D98324] text-3xl font-courier">+5</td>
                </tr>

                {/* Rank 2 */}
                <tr className="hover:bg-[#2A2525]/30 transition-colors group">
                  <td className="py-6 px-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gray-300 rounded-full border-2 border-[#131010] flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                        <Medal size={20} className="text-gray-700" />
                      </div>
                      <span className="font-black text-white text-lg sm:text-xl">2nd Place Vote</span>
                    </div>
                  </td>
                  <td className="py-6 px-6 text-gray-400 font-medium leading-relaxed max-w-sm">
                    Received when another player ranks your meme as their second choice.
                  </td>
                  <td className="py-6 px-6 text-right font-black text-white text-3xl font-courier">+3</td>
                </tr>

                {/* Rank 3 */}
                <tr className="hover:bg-[#2A2525]/30 transition-colors group">
                  <td className="py-6 px-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-amber-700 rounded-full border-2 border-[#131010] flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                        <Medal size={20} className="text-amber-300" />
                      </div>
                      <span className="font-black text-white text-lg sm:text-xl">3rd Place Vote</span>
                    </div>
                  </td>
                  <td className="py-6 px-6 text-gray-400 font-medium leading-relaxed max-w-sm">
                    Received when another player ranks your meme as their third choice.
                  </td>
                  <td className="py-6 px-6 text-right font-black text-white text-3xl font-courier">+1</td>
                </tr>

                {/* MVP */}
                <tr className="hover:bg-[#2A2525]/30 transition-colors group bg-[#5F8B4C]/10">
                  <td className="py-6 px-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-[#5F8B4C] rounded-full border-2 border-[#131010] flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                        <Star size={20} className="text-white" />
                      </div>
                      <span className="font-black text-[#5F8B4C] text-lg sm:text-xl">MVP Bonus</span>
                    </div>
                  </td>
                  <td className="py-6 px-6 text-gray-400 font-medium leading-relaxed max-w-sm">
                    Awarded to the player whose meme gathers the highest total score in a single round.
                  </td>
                  <td className="py-6 px-6 text-right font-black text-[#5F8B4C] text-3xl font-courier">+5</td>
                </tr>

              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ScoringPodium;
