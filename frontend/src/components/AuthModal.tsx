import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import AuthForm from './AuthForm';

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    defaultIsRegister?: boolean;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, defaultIsRegister = false }) => {
    const [isRegister, setIsRegister] = useState(defaultIsRegister);
    const [step, setStep] = useState<'form' | 'otp'>('form');

    useEffect(() => {
        if (isOpen) {
            setIsRegister(defaultIsRegister);
            setStep('form');
        }
    }, [isOpen, defaultIsRegister]);

    const handleModeChange = (newIsRegister: boolean, newStep: 'form' | 'otp') => {
        setIsRegister(newIsRegister);
        setStep(newStep);
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-[#131010]/60 backdrop-blur-sm"
                />

                {/* Modal */}
                <motion.div
                    initial={{ opacity: 0, y: "100%", scale: 1 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: "100%", scale: 1 }}
                    transition={{ type: "spring", damping: 25, stiffness: 200 }}
                    className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl border-t-4 sm:border-4 border-[#131010] shadow-[0px_-8px_0px_0px_rgba(19,16,16,0.1)] sm:shadow-[8px_8px_0px_0px_#131010] overflow-hidden flex flex-col max-h-[90vh]"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b-4 border-[#131010] bg-[#FFDDAB]">
                        <h2 className="text-2xl font-black text-[#131010] font-poppins flex items-center gap-2">
                            {step === 'otp' ? 'Verify Email' : isRegister ? 'Join the Party' : 'Welcome Back'}
                        </h2>
                        <button
                            onClick={onClose}
                            className="w-10 h-10 rounded-xl bg-white border-2 border-[#131010] flex items-center justify-center text-[#131010] hover:bg-[#131010] hover:text-white transition-colors shadow-[2px_2px_0px_0px_#131010] active:translate-y-[2px] active:shadow-none"
                        >
                            <X size={20} strokeWidth={3} />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="p-6 sm:p-8 overflow-y-auto">
                        <AuthForm 
                            defaultIsRegister={defaultIsRegister} 
                            onSuccess={onClose} 
                            onModeChange={handleModeChange}
                        />
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default AuthModal;
