
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Ghost } from 'lucide-react';

const NotFound: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#FFDDAB] flex items-center justify-center p-4">
      {/* Nice Balanced Bento Container */}
      <div className="w-full max-w-md animate-in fade-in zoom-in duration-300">
        
        {/* Top Section: The Big 404 */}
        <div className="bg-[#D98324] border-2 border-[#131010] shadow-[4px_4px_0px_0px_#131010] rounded-2xl p-8 mb-4 flex flex-col items-center justify-center relative overflow-hidden">
          {/* Subtle pattern background */}
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#131010_1px,transparent_1px)] bg-[size:10px_10px]" />
          
          <Ghost className="w-12 h-12 text-[#131010] mb-2 animate-bounce" strokeWidth={2.5} />
          <h1 className="text-7xl font-black font-poppins text-[#131010] tracking-tighter relative z-10">
            404
          </h1>
        </div>

        {/* Bottom Section: The Message & Action */}
        <div className="bg-white border-2 border-[#131010] shadow-[4px_4px_0px_0px_#131010] rounded-2xl p-6 text-center">
          <h2 className="text-xl font-black font-poppins text-[#131010] uppercase mb-2">
            Oops! Page Gone.
          </h2>
          <p className="text-xs font-bold font-courier text-[#131010]/40 uppercase tracking-widest mb-6">
            Even the best memes get lost sometimes.
          </p>

          <button
            onClick={() => navigate('/')}
            className="w-full flex items-center justify-center gap-3 py-4 bg-[#5F8B4C] text-white border-2 border-[#131010] shadow-[4px_4px_0px_0px_#131010] active:translate-y-[2px] active:shadow-none rounded-xl font-black font-poppins text-sm uppercase tracking-widest transition-all hover:bg-[#4a6d3b]"
          >
            <Home size={20} strokeWidth={3} />
            Back to Dashboard
          </button>
        </div>

        
      </div>
    </div>
  );
};

export default NotFound;