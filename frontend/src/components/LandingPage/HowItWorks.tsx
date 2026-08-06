import React from 'react';
import { motion } from 'framer-motion';
interface TimelineStepProps {
  number: number;
  imageSrc?: string;
  icon?: React.ReactNode;
  title: string;
  description: string;
  isReversed?: boolean;
}

const TimelineStep: React.FC<TimelineStepProps> = ({ number, imageSrc, icon, title, description, isReversed = false }) => {
  return (
    <div className={`flex flex-col ${isReversed ? 'lg:flex-row-reverse' : 'lg:flex-row'} items-center gap-8 lg:gap-16 relative z-10`}>
      {/* Text Content */}
      <motion.div
        initial={{ opacity: 0, x: isReversed ? 50 : -50 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.6, type: "spring" }}
        className="flex-1 text-center lg:text-left relative w-full lg:w-auto"
      >
        <div className={`hidden lg:flex absolute top-1/2 -translate-y-1/2 ${isReversed ? '-left-12' : '-right-12'} w-24 h-1 border-t-4 border-dashed border-[#131010]/30 -z-10`} />

        <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl border-4 border-[#131010] shadow-[4px_4px_0px_0px_#131010] bg-white font-black text-xl mb-6 ${isReversed ? 'lg:ml-auto' : ''}`}>
          {number}
        </div>
        <h3 className="text-3xl font-black text-[#131010] mb-4 font-poppins">{title}</h3>
        <p className="text-lg text-[#131010]/80 font-medium leading-relaxed max-w-md mx-auto lg:mx-0">
          {description}
        </p>
      </motion.div>

      {/* Visual / Screenshot */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9, rotate: isReversed ? 2 : -2 }}
        whileInView={{ opacity: 1, scale: 1, rotate: isReversed ? -2 : 2 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.6, type: "spring" }}
        className="flex-1 w-full max-w-sm lg:max-w-none"
      >
        <div className="bg-white rounded-3xl border-4 border-[#131010] shadow-[8px_8px_0px_0px_#131010] p-2 aspect-[4/3] sm:aspect-video flex flex-col relative overflow-hidden group">
          {/* Fake Header */}
          <div className="flex items-center gap-2 p-2 border-b-2 border-[#131010]/10 mb-2">
            <div className="w-3 h-3 rounded-full bg-red-400"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
            <div className="w-3 h-3 rounded-full bg-green-400"></div>
          </div>

          {/* Content Area */}
          <div className="flex-1 bg-[#131010]/5 rounded-xl flex items-center justify-center relative overflow-hidden">
            {imageSrc ? (
              <img src={imageSrc} alt={title} className="w-full h-full object-cover rounded-xl" />
            ) : (
              <>
                {icon}
                {/* Overlay instruction */}
                <div className="absolute inset-0 bg-[#131010]/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-sm z-20">
                  <p className="text-white font-bold text-center px-4">
                    [ Insert Real App Screenshot Here ]
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const HowItWorks: React.FC = () => {
  return (
    <section className="py-24 lg:py-32 px-4 sm:px-6 lg:px-8 bg-[#FFDDAB] border-b-4 border-[#131010] relative overflow-hidden">
      {/* Winding Path Background Line (Desktop only) */}
      <div className="hidden lg:block absolute left-1/2 top-48 bottom-48 w-1 border-l-4 border-dashed border-[#131010]/20 -translate-x-1/2" />

      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-20 lg:mb-32">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl sm:text-4xl md:text-6xl font-black text-[#131010] font-poppins tracking-tight px-2"
          >
            How it Works
          </motion.h2>
        </div>

        <div className="space-y-24 lg:space-y-32">
          <TimelineStep
            number={1}
            title="Create a Room"
            description="One person hosts. Everyone else joins on their phone using a 6-letter code. No accounts required if you're lazy."
            imageSrc="/home.webp"
            isReversed={false}
          />

          <TimelineStep
            number={2}
            title="Spin the Prompt"
            description="The game drops a wildly specific, probably inappropriate prompt. Your goal is to find the perfect reaction."
            imageSrc="/spin.webp"
            isReversed={true}
          />

          <TimelineStep
            number={3}
            title="Choose Your Weapon"
            description="Select the funniest meme from your hand. You submit it anonymously, so don't hold back."
            imageSrc="/memegallery.webp"
            isReversed={false}
          />

          <TimelineStep
            number={4}
            title="Community Voting"
            description="The memes are revealed. Everyone ranks their top 3 favorites. This is where friendships are tested."
            imageSrc="/cvoting.webp"
            isReversed={true}
          />

          <TimelineStep
            number={5}
            title="Crown the Winner"
            description="Points are tallied. The funniest degenerate takes the crown for the round. Then, you do it all over again."
            imageSrc="/finalscores.webp"
            isReversed={false}
          />
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
