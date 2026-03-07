import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  CheckCircle, 
  AlertCircle, 
  ArrowLeft, 
  Shield,
  Loader2,
  KeyRound
} from 'lucide-react';

interface Toast {
  id: number;
  type: 'success' | 'error' | 'info';
  message: string;
}

const ForgetPasswordPage: React.FC = () => {
  // --- WIRING INTACT ---
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [otpTimer, setOtpTimer] = useState(0);
  const navigate = useNavigate();

  const addToast = (type: 'success' | 'error' | 'info', message: string) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, 5000);
  };

  useEffect(() => {
    if (otpTimer > 0) {
      const timer = setTimeout(() => setOtpTimer(otpTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpTimer]);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    if (password.length < 8) errors.push('At least 8 characters');
    if (!/[A-Z]/.test(password)) errors.push('One uppercase letter');
    if (!/[a-z]/.test(password)) errors.push('One lowercase letter');
    if (!/\d/.test(password)) errors.push('One number');
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) errors.push('One special character');
    
    return { isValid: errors.length === 0, errors };
  };

  const validateOtp = (otp: string): boolean => {
    return /^\d{6}$/.test(otp);
  };

  useEffect(() => {
    setErrors({});
  }, [email, otp, newPassword, confirmPassword]);

  const sendOtp = async () => {
    const newErrors: {[key: string]: string} = {};

    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    
    try {
      const response = await fetch('/api/send-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, purpose: 'reset' }),
      });

      const data = await response.json();

      if (!response.ok) {
        addToast('error', data.error || 'Failed to send OTP. Please try again.');
        return;
      }

      addToast('success', `OTP sent to ${email}. Check your inbox or Spam!`);
      setStep(2);
      setOtpTimer(300);
    } catch (err) {
      console.error(err);
      addToast('error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async () => {
    const newErrors: {[key: string]: string} = {};

    if (!otp.trim()) {
      newErrors.otp = 'OTP is required';
    } else if (!validateOtp(otp)) {
      newErrors.otp = 'Please enter a valid 6-digit OTP';
    }

    if (!newPassword.trim()) {
      newErrors.newPassword = 'New password is required';
    } else {
      const passwordValidation = validatePassword(newPassword);
      if (!passwordValidation.isValid) {
        newErrors.newPassword = passwordValidation.errors.join(', ');
      }
    }

    if (!confirmPassword.trim()) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    
    try {
      const res = await fetch('/api/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, purpose: 'reset', password: newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        addToast('error', data.error || 'Failed to reset password');
      } else {
        addToast('success', 'Password reset successful! Redirecting to login...');
        setTimeout(() => {
          navigate('/');
        }, 2000);
      }
    } catch (err) {
      console.error(err);
      addToast('error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resendOtp = async () => {
    if (otpTimer > 0) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/send-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, purpose: 'reset' }),
      });

      const data = await response.json();

      if (!response.ok) {
        addToast('error', data.error || 'Failed to resend OTP');
        return;
      }

      addToast('info', 'OTP resent successfully!');
      setOtpTimer(300);
    } catch (err) {
      console.error(err);
      addToast('error', 'Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  // ---------------------

  return (
    <div className="min-h-screen bg-[#FFDDAB] flex flex-col lg:flex-row font-poppins selection:bg-[#D98324] selection:text-white">
      
      {/* Toast Container (Aesthetic match) */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-3 pointer-events-none">
        <AnimatePresence initial={false}>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, x: 40, scale: 0.98 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40, scale: 0.98 }}
              transition={{ layout: { duration: 0.3, ease: 'easeInOut' }, default: { duration: 0.3, ease: 'easeInOut' } }}
              className={`flex items-center gap-3 px-5 py-3 rounded-xl border-2 border-[#131010] shadow-[4px_4px_0px_0px_#131010] pointer-events-auto ${
                toast.type === 'success' ? 'bg-[#5F8B4C] text-white' : 
                toast.type === 'error' ? 'bg-red-500 text-white' : 
                'bg-[#D98324] text-[#131010]'
              }`}
            >
              {toast.type === 'success' && <CheckCircle className="w-5 h-5 shrink-0" strokeWidth={2.5} />}
              {toast.type === 'error' && <AlertCircle className="w-5 h-5 shrink-0" strokeWidth={2.5} />}
              {toast.type === 'info' && <Shield className="w-5 h-5 shrink-0" strokeWidth={2.5} />}
              <span className="font-poppins text-sm font-bold">{toast.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Left Side - Illustration (Bento Style) */}
      <motion.div 
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="lg:w-1/2 bg-[#5F8B4C] border-b-4 lg:border-b-0 lg:border-r-4 border-[#131010] flex items-center justify-center p-8 lg:p-12 relative overflow-hidden"
      >
        <div className="absolute inset-0 opacity-[0.05] bg-[linear-gradient(#131010_1px,transparent_1px),linear-gradient(90deg,#131010_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />
        
        <div className="text-center text-white max-w-md relative z-10">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0, rotate: -5 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mb-8"
          >
            <div className="bg-white p-4 rounded-3xl border-4 border-[#131010] shadow-[8px_8px_0px_0px_#131010] inline-block transform rotate-3 hover:rotate-6 transition-transform">
              <img 
                src='/forget.png' 
                alt="Security Illustration" 
                className="w-48 h-48 lg:w-64 lg:h-64 object-cover rounded-xl border-2 border-[#131010]"
              />
            </div>
          </motion.div>

          <motion.h1 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="font-poppins text-3xl lg:text-5xl font-black mb-4 tracking-tight drop-shadow-[2px_2px_0px_#131010]"
          >
            Secure Recovery
          </motion.h1>
          <motion.p 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="font-medium text-[#FFDDAB] text-lg leading-relaxed"
          >
            Locked out? No stress. Follow the steps to safely reset your password and get back into the lobby.
          </motion.p>
        </div>
      </motion.div>

      {/* Right Side - Form (Tactile Bento) */}
      <motion.div 
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="lg:w-1/2 flex flex-col justify-center p-6 sm:p-8 lg:p-16"
      >
        <div className="w-full max-w-md mx-auto">
          
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center text-[#131010]/60 hover:text-[#131010] transition-colors font-bold text-xs uppercase tracking-wider font-courier mb-8"
          >
            <ArrowLeft size={14} className="mr-1" strokeWidth={3} /> Back to Login
          </button>

          <div className="bg-white rounded-3xl p-8 border-4 border-[#131010] shadow-[8px_8px_0px_0px_#131010]">
            
            {/* Progress Indicator */}
            <motion.div 
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="mb-8"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`flex items-center justify-center w-12 h-12 rounded-xl border-2 transition-all duration-300 font-black ${
                  step >= 1 
                    ? 'bg-[#D98324] text-[#131010] border-[#131010] shadow-[2px_2px_0px_0px_#131010]' 
                    : 'bg-white text-[#131010]/30 border-[#131010]/20'
                }`}>
                  1
                </div>
                <div className={`flex-1 h-2 mx-2 rounded-full transition-all duration-500 border ${
                  step >= 2 ? 'bg-[#131010] border-[#131010]' : 'bg-[#131010]/10 border-transparent'
                }`}></div>
                <div className={`flex items-center justify-center w-12 h-12 rounded-xl border-2 transition-all duration-300 font-black ${
                  step >= 2 
                    ? 'bg-[#5F8B4C] text-white border-[#131010] shadow-[2px_2px_0px_0px_#131010]' 
                    : 'bg-white text-[#131010]/30 border-[#131010]/20'
                }`}>
                  2
                </div>
              </div>
              <div className="flex items-center justify-between font-poppins font-bold text-xs text-[#131010]/60 uppercase tracking-widest">
                <span>Verify</span>
                <span>Reset</span>
              </div>
            </motion.div>

            {/* Step 1: Email Input */}
            {step === 1 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <div>
                  <h2 className="font-black text-[#131010] text-2xl lg:text-3xl mb-2">Find Account</h2>
                  <p className="font-medium text-sm text-[#131010]/60">
                    Enter the email associated with your profile.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="email" className="block text-xs font-bold text-[#131010]/60 uppercase tracking-wider font-courier">
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-4 z-10 pointer-events-none">
                      <Mail size={20} className="text-[#131010]" strokeWidth={2.5} />
                    </div>
                    <input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={loading}
                      className={`
                        w-full px-4 py-3.5 pl-12 
                        bg-[#FFDDAB]/10 text-[#131010] text-base sm:text-sm font-poppins font-semibold
                        border-2 rounded-xl transition-shadow duration-200
                        focus:outline-none focus:bg-white focus:shadow-[2px_2px_0px_0px_#131010]
                        placeholder:text-[#131010]/30 placeholder:font-medium
                        ${errors.email ? 'border-red-500 bg-red-50/50' : 'border-[#131010]'}
                      `}
                    />
                  </div>
                  {errors.email && (
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-1 font-bold text-xs text-red-600 flex items-center">
                      <AlertCircle className="w-3 h-3 mr-1" strokeWidth={2.5} /> {errors.email}
                    </motion.p>
                  )}
                </div>

                <button
                  onClick={sendOtp}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-[#D98324] text-[#131010] border-2 border-[#131010] shadow-[3px_3px_0px_0px_#131010] hover:shadow-[5px_5px_0px_0px_#131010] active:translate-y-[2px] active:shadow-none disabled:opacity-50 disabled:shadow-none disabled:translate-y-[2px] font-bold py-3.5 px-4 rounded-xl transition-all"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Shield size={18} strokeWidth={2.5} /> Send OTP Code</>}
                </button>
              </motion.div>
            )}

            {/* Step 2: OTP and Password Reset */}
            {step === 2 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <div>
                  <h2 className="font-black text-[#131010] text-2xl lg:text-3xl mb-2">Secure Reset</h2>
                  <p className="font-medium text-sm text-[#131010]/60">
                    Code sent to <span className="font-bold text-[#D98324]">{email}</span>
                  </p>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-end">
                    <label htmlFor="otp" className="block text-xs font-bold text-[#131010]/60 uppercase tracking-wider font-courier">
                      Verification Code
                    </label>
                    <span className="text-xs font-bold font-courier text-[#D98324]">
                      {otpTimer > 0 ? formatTime(otpTimer) : 'Expired'}
                    </span>
                  </div>
                  <input
                    id="otp"
                    type="text"
                    placeholder="------"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    maxLength={6}
                    disabled={loading}
                    className={`
                      w-full py-4 border-2 rounded-xl text-center text-2xl font-black font-courier tracking-[0.5em] transition-shadow duration-200
                      focus:outline-none focus:bg-white focus:shadow-[2px_2px_0px_0px_#131010]
                      ${errors.otp ? 'border-red-500 bg-red-50/50' : 'border-[#131010] bg-[#FFDDAB]/10 text-[#131010]'}
                    `}
                  />
                  {errors.otp && (
                    <p className="mt-1 font-bold text-xs text-red-600 flex items-center">
                      <AlertCircle className="w-3 h-3 mr-1" strokeWidth={2.5} /> {errors.otp}
                    </p>
                  )}
                  <div className="text-right">
                    <button
                      onClick={resendOtp}
                      disabled={otpTimer > 0 || loading}
                      className="text-xs font-bold text-[#5F8B4C] hover:text-[#131010] disabled:text-[#131010]/30 transition-colors uppercase tracking-wider font-courier"
                    >
                      Resend Code
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="newPassword" className="block text-xs font-bold text-[#131010]/60 uppercase tracking-wider font-courier">
                    New Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-4 z-10 pointer-events-none">
                      <KeyRound size={20} className="text-[#131010]" strokeWidth={2.5} />
                    </div>
                    <input
                      id="newPassword"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      disabled={loading}
                      className={`
                        w-full px-4 py-3.5 pl-12 pr-12
                        bg-[#FFDDAB]/10 text-[#131010] text-base sm:text-sm font-poppins font-semibold
                        border-2 rounded-xl transition-shadow duration-200
                        focus:outline-none focus:bg-white focus:shadow-[2px_2px_0px_0px_#131010]
                        placeholder:text-[#131010]/30
                        ${errors.newPassword ? 'border-red-500 bg-red-50/50' : 'border-[#131010]'}
                      `}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-4 flex items-center text-[#131010]/40 hover:text-[#131010] transition-colors"
                    >
                      {showPassword ? <Eye size={20} strokeWidth={2.5} /> : <EyeOff size={20} strokeWidth={2.5} />}
                    </button>
                  </div>
                  {errors.newPassword && (
                    <p className="mt-1 font-bold text-xs text-red-600 flex items-center">
                      <AlertCircle className="w-3 h-3 mr-1" strokeWidth={2.5} /> {errors.newPassword}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="confirmPassword" className="block text-xs font-bold text-[#131010]/60 uppercase tracking-wider font-courier">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-4 z-10 pointer-events-none">
                      <Lock size={20} className="text-[#131010]" strokeWidth={2.5} />
                    </div>
                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={loading}
                      className={`
                        w-full px-4 py-3.5 pl-12 pr-12
                        bg-[#FFDDAB]/10 text-[#131010] text-base sm:text-sm font-poppins font-semibold
                        border-2 rounded-xl transition-shadow duration-200
                        focus:outline-none focus:bg-white focus:shadow-[2px_2px_0px_0px_#131010]
                        placeholder:text-[#131010]/30
                        ${errors.confirmPassword ? 'border-red-500 bg-red-50/50' : 'border-[#131010]'}
                      `}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-4 flex items-center text-[#131010]/40 hover:text-[#131010] transition-colors"
                    >
                      {showConfirmPassword ? <Eye size={20} strokeWidth={2.5} /> : <EyeOff size={20} strokeWidth={2.5} />}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="mt-1 font-bold text-xs text-red-600 flex items-center">
                      <AlertCircle className="w-3 h-3 mr-1" strokeWidth={2.5} /> {errors.confirmPassword}
                    </p>
                  )}
                </div>

                <button
                  onClick={resetPassword}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-[#5F8B4C] text-white border-2 border-[#131010] shadow-[3px_3px_0px_0px_#131010] hover:shadow-[5px_5px_0px_0px_#131010] active:translate-y-[2px] active:shadow-none disabled:opacity-50 disabled:shadow-none disabled:translate-y-[2px] font-bold py-3.5 px-4 rounded-xl transition-all mt-6"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Lock size={18} strokeWidth={2.5} /> Confirm Reset</>}
                </button>
              </motion.div>
            )}

          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ForgetPasswordPage;