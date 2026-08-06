import React from 'react';
import { motion } from 'framer-motion';
import { Headphones, GraduationCap, Building2, Sofa } from 'lucide-react';

interface UseCaseProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
  delay: number;
}

const UseCaseCard: React.FC<UseCaseProps> = ({ icon, title, description, color, delay }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      viewport={{ once: true, margin: "-50px" }}
      className={`relative p-6 rounded-2xl border-4 border-[#131010] shadow-[6px_6px_0px_0px_#131010] hover:shadow-[8px_8px_0px_0px_#131010] hover:-translate-y-1 transition-all duration-300 ${color} overflow-hidden group`}
    >
      {/* Decorative dot pattern */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-[radial-gradient(#131010_2px,transparent_2px)] [background-size:12px_12px] opacity-10 group-hover:scale-110 transition-transform duration-500 rounded-bl-full" />
      
      <div className="w-14 h-14 bg-white border-2 border-[#131010] rounded-xl shadow-[4px_4px_0px_0px_#131010] flex items-center justify-center mb-6 relative z-10">
        {icon}
      </div>
      
      <h3 className="text-xl font-black text-[#131010] mb-2 font-poppins relative z-10">{title}</h3>
      <p className="text-[#131010]/80 font-medium text-sm leading-relaxed relative z-10">{description}</p>
    </motion.div>
  );
};

const PerfectFor: React.FC = () => {
  const cases = [
    {
      icon: <Headphones size={28} className="text-[#131010]" strokeWidth={2.5} />,
      title: "Discord Calls",
      description: "Liven up the Friday night server. Screen share the game board while everyone plays on their phones.",
      color: "bg-[#FFDDAB]",
      delay: 0.1
    },
    {
      icon: <GraduationCap size={28} className="text-[#131010]" strokeWidth={2.5} />,
      title: "College Dorms",
      description: "The ultimate pre-game icebreaker. Find out who actually has a sense of humor in your friend group.",
      color: "bg-[#D98324]",
      delay: 0.2
    },
    {
      icon: <Building2 size={28} className="text-[#131010]" strokeWidth={2.5} />,
      title: "Team Events",
      description: "Find out which coworker has the most unhinged humor. (HR approved... mostly).",
      color: "bg-[#5F8B4C]",
      delay: 0.3
    },
    {
      icon: <Sofa size={28} className="text-[#131010]" strokeWidth={2.5} />,
      title: "Couch Co-op",
      description: "Cast it to the living room TV. No controllers needed—everyone just uses their own smartphone.",
      color: "bg-white",
      delay: 0.4
    }
  ];

  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8 bg-[#131010] border-b-4 border-[#131010]">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="inline-block px-4 py-1.5 rounded-full bg-white/10 border-2 border-white/20 text-white font-bold text-sm mb-4 tracking-wider uppercase font-courier"
          >
            Where does it belong?
          </motion.div>
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl sm:text-4xl md:text-5xl font-black text-white font-poppins px-2"
          >
            Perfect For...
          </motion.h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          {cases.map((useCase, index) => (
            <UseCaseCard key={index} {...useCase} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default PerfectFor;
