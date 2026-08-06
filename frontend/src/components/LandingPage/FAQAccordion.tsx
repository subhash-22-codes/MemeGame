import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

const faqs = [
  {
    question: "Is it really free?",
    answer: "Yes. 100% free. No paywalls, no premium subscriptions, no hidden microtransactions to buy better memes."
  },
  {
    question: "Do I need to create an account?",
    answer: "Nope! We built Guest Mode for the lazy ones. Just type your name, join with the room code, and start playing immediately. (Though creating an account lets you save your stats)."
  },
  {
    question: "Can I play on my phone?",
    answer: "Yes, MemeGame is Mobile-First. We actually recommend playing on your phone while casting or screen-sharing the main game board on a TV or laptop."
  },
  {
    question: "How many players do I need?",
    answer: "You need at least 3 players (1 host, 2 submitters). It gets incredibly chaotic around 5-10 players. More than 15 and the voting phase becomes a bloodbath."
  },
  {
    question: "How long does a game take?",
    answer: "Most games last about 15-20 minutes, but you can keep hitting 'Next Round' for as long as your group's attention span holds up."
  },
  {
    question: "Do Guests lose their score if they disconnect?",
    answer: "If a Guest disconnects, they just need to rejoin using the same room code and their exact Guest Name. The game will automatically reconnect them to their score."
  }
];

const FAQItem = ({ faq, isOpen, toggleOpen }: { faq: typeof faqs[0], isOpen: boolean, toggleOpen: () => void }) => {
  return (
    <div className="mb-4">
      <button
        onClick={toggleOpen}
        className="w-full flex items-center justify-between bg-white p-6 rounded-2xl border-4 border-[#131010] shadow-[4px_4px_0px_0px_#131010] hover:bg-[#FFDDAB] transition-colors focus:outline-none"
      >
        <span className="font-black text-[#131010] text-lg text-left font-poppins pr-4">{faq.question}</span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="flex-shrink-0"
        >
          <ChevronDown size={24} strokeWidth={3} className="text-[#131010]" />
        </motion.div>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-6 bg-white/50 border-x-4 border-b-4 border-[#131010] rounded-b-2xl -mt-4 pt-8 shadow-[4px_4px_0px_0px_#131010]">
              <p className="text-[#131010]/80 font-medium leading-relaxed">{faq.answer}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const FAQAccordion: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0); // First one open by default

  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8 bg-white border-b-4 border-[#131010]">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-16">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl sm:text-4xl md:text-5xl font-black text-[#131010] font-poppins tracking-tight mb-4 px-2"
          >
            Got Questions?
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-xl text-[#131010]/70 font-medium"
          >
            We've got answers. Probably.
          </motion.p>
        </div>

        <div className="space-y-2">
          {faqs.map((faq, index) => (
            <FAQItem 
              key={index} 
              faq={faq} 
              isOpen={openIndex === index} 
              toggleOpen={() => setOpenIndex(openIndex === index ? null : index)} 
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default FAQAccordion;
