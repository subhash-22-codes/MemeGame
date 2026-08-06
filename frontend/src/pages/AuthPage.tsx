import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import AuthForm from '../components/AuthForm';

const AuthPage: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const isRegisterParams = searchParams.get('register') === 'true';
    
    const [isRegisterMode, setIsRegisterMode] = useState(isRegisterParams);

    const handleModeChange = (isRegister: boolean) => {
        setIsRegisterMode(isRegister);
    };

    return (
        <div className="min-h-screen bg-[#FFDDAB] flex flex-col lg:flex-row font-poppins selection:bg-[#D98324] selection:text-white">
            {/* Left Side - Illustration (Bento Style) */}
            <motion.div
                initial={{ opacity: 0, x: -40 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                className="lg:w-1/2 bg-[#5F8B4C] border-b-4 lg:border-b-0 lg:border-r-4 border-[#131010] flex items-center justify-center p-8 lg:p-12 relative overflow-hidden hidden md:flex"
            >
                <div className="absolute inset-0 opacity-[0.05] bg-[linear-gradient(#131010_1px,transparent_1px),linear-gradient(90deg,#131010_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

                <div className="text-center text-white max-w-md relative z-10">
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0, rotate: -5 }}
                        animate={{ scale: 1, opacity: 1, rotate: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="mb-8 flex justify-center"
                    >
                        <div className="bg-white p-4 rounded-3xl border-4 border-[#131010] shadow-[8px_8px_0px_0px_#131010] inline-block transform rotate-3 hover:rotate-6 transition-transform">
                            {/* Re-using one of the meme images or generic party icon for vibe */}
                            <div className="w-48 h-48 lg:w-64 lg:h-64 rounded-xl border-2 border-[#131010] bg-[#FFDDAB] flex items-center justify-center overflow-hidden">
                                <span className="text-7xl">🎉</span>
                            </div>
                        </div>
                    </motion.div>

                    <motion.h1
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ duration: 0.5, delay: 0.3 }}
                        className="font-poppins text-3xl lg:text-5xl font-black mb-4 tracking-tight drop-shadow-[2px_2px_0px_#131010]"
                    >
                        {isRegisterMode ? 'Join the Party' : 'Welcome Back'}
                    </motion.h1>
                    <motion.p
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ duration: 0.5, delay: 0.4 }}
                        className="font-medium text-[#FFDDAB] text-lg leading-relaxed"
                    >
                        {isRegisterMode 
                            ? 'Create an account to save your best memes, track your score, and prove you are the funniest in the squad.'
                            : 'Sign in to access your dashboard, review your past games, and host new parties.'}
                    </motion.p>
                </div>
            </motion.div>

            {/* Right Side - Form (Tactile Bento) */}
            <motion.div
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                className="lg:w-1/2 flex flex-col justify-center p-6 sm:p-8 lg:p-16 w-full"
            >
                <div className="w-full max-w-md mx-auto">
                    <button
                        onClick={() => navigate('/')}
                        className="inline-flex items-center text-[#131010]/60 hover:text-[#131010] transition-colors font-bold text-xs uppercase tracking-wider font-courier mb-8"
                    >
                        <ArrowLeft size={14} className="mr-1" strokeWidth={3} /> Back to Landing
                    </button>

                    <div className="bg-white rounded-3xl p-6 sm:p-8 border-4 border-[#131010] shadow-[8px_8px_0px_0px_#131010]">
                        <div className="mb-8">
                            <h2 className="font-black text-[#131010] text-2xl lg:text-3xl mb-2">
                                {isRegisterMode ? 'Create Account' : 'Sign In'}
                            </h2>
                            <p className="font-medium text-sm text-[#131010]/60">
                                {isRegisterMode ? 'Ready for absolute chaos?' : 'Enter your credentials to jump back in.'}
                            </p>
                        </div>

                        <AuthForm 
                            defaultIsRegister={isRegisterParams}
                            onModeChange={handleModeChange}
                        />
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default AuthPage;
