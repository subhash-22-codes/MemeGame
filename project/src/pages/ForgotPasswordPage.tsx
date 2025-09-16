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

  // Toast functionality
  const addToast = (type: 'success' | 'error' | 'info', message: string) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, 5000);
  };

  // OTP Timer
  useEffect(() => {
    if (otpTimer > 0) {
      const timer = setTimeout(() => setOtpTimer(otpTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpTimer]);

  // Validation functions
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

  // Clear errors when inputs change
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
      setOtpTimer(300); // 5 minutes
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

  return (
    <div className="min-h-screen bg-[#FFDDAB] flex flex-col lg:flex-row">
      {/* Toast Container */}
       <div className="fixed top-4 right-4 z-50 flex flex-col gap-3 pointer-events-none">
    <AnimatePresence initial={false}>
      {toasts.map((toast) => (
        <motion.div
          key={toast.id}
          layout
          initial={{ opacity: 0, x: 40, scale: 0.98 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 40, scale: 0.98 }}
          transition={{
            layout: { duration: 0.3, ease: 'easeInOut' },
            default: { duration: 0.3, ease: 'easeInOut' },
          }}
          className={`flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg pointer-events-auto ${
            toast.type === 'success'
              ? 'bg-[#5F8B4C] text-white'
              : toast.type === 'error'
              ? 'bg-red-500 text-white'
              : 'bg-[#D98324] text-white'
          }`}
        >
          {toast.type === 'success' && <CheckCircle className="w-5 h-5" />}
          {toast.type === 'error' && <AlertCircle className="w-5 h-5" />}
          {toast.type === 'info' && <Shield className="w-5 h-5" />}
          <span className="font-courier text-sm font-medium">{toast.message}</span>
        </motion.div>
      ))}
    </AnimatePresence>
  </div>

      {/* Left Side - Illustration */}
      <motion.div 
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="lg:w-1/2 bg-gradient-to-br from-[#5F8B4C] to-[#4A7039] flex items-center justify-center p-8 lg:p-12"
      >
        <div className="text-center text-white max-w-md">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mb-8"
          >
             <img 
                src='/forget.png' 
                alt="Security Illustration" 
                className="w-64 h-64 mx-auto object-cover rounded-full shadow-2xl ring-8 ring-white/20"
              />
          </motion.div>
          <motion.h1 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="font-poppins text-3xl lg:text-4xl font-bold mb-4"
          >
            Secure Password Recovery
          </motion.h1>
          <motion.p 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="font-courier text-[#FFDDAB] text-lg leading-relaxed"
          >
            Your security is our priority. Follow our simple steps to safely reset your password and regain access to your account.
          </motion.p>
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="flex justify-center mt-8 space-x-4"
          >
            <div className="w-3 h-3 bg-white rounded-full opacity-60"></div>
            <div className="w-3 h-3 bg-white rounded-full opacity-40"></div>
            <div className="w-3 h-3 bg-white rounded-full opacity-40"></div>
          </motion.div>
        </div>
      </motion.div>

      {/* Right Side - Form */}
      <motion.div 
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="lg:w-1/2 flex items-center justify-center p-8 lg:p-12"
      >
        <div className="w-full max-w-md">
          {/* Progress Indicator */}
          <motion.div 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="mb-8"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`flex items-center justify-center w-12 h-12 rounded-full transition-all duration-300 ${
                step >= 1 ? 'bg-[#5F8B4C] text-white shadow-lg' : 'bg-white text-[#131010] border-2 border-gray-200'
              }`}>
                <Mail className="w-6 h-6" />
              </div>
              <div className={`flex-1 h-2 mx-4 rounded-full transition-all duration-500 ${
                step >= 2 ? 'bg-[#5F8B4C]' : 'bg-gray-200'
              }`}></div>
              <div className={`flex items-center justify-center w-12 h-12 rounded-full transition-all duration-300 ${
                step >= 2 ? 'bg-[#5F8B4C] text-white shadow-lg' : 'bg-white text-[#131010] border-2 border-gray-200'
              }`}>
                <KeyRound className="w-6 h-6" />
              </div>
            </div>
            <div className="flex items-center justify-between font-courier text-sm text-[#131010]">
              <span>Email Verification</span>
              <span>Reset Password</span>
            </div>
          </motion.div>

          {/* Step 1: Email Input */}
          {step === 1 && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="space-y-6"
            >
              <div className="text-center mb-8">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                >
                  <Shield className="w-16 h-16 text-[#D98324] mx-auto mb-4" />
                </motion.div>
                <h2 className="font-poppins text-[#5F8B4C] text-2xl lg:text-3xl font-bold mb-2">
                  Forgot Password?
                </h2>
                <p className="font-courier text-[#131010] opacity-70">
                  Don't worry! Enter your email address and we'll send you a verification code.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label htmlFor="email" className="block font-poppins text-sm font-medium text-[#5F8B4C] mb-2">
                    Email Address
                  </label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[#5F8B4C] w-5 h-5 transition-all group-focus-within:text-[#D98324]" />
                    <input
                      id="email"
                      type="email"
                      placeholder="Enter your email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={`w-full pl-12 pr-4 py-4 border-2 rounded-xl font-courier text-[#131010] focus:ring-2 focus:ring-[#D98324] focus:border-[#D98324] focus:outline-none transition-all duration-200 ${
                        errors.email ? 'border-red-500 bg-red-50 placeholder-red-400' : 'border-[#5F8B4C] bg-white placeholder-gray-400'
                      }`}
                      disabled={loading}
                    />
                  </div>
                  {errors.email && (
                    <motion.p 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-2 font-courier text-sm text-red-600 flex items-center gap-1"
                    >
                      <AlertCircle className="w-4 h-4" />
                      {errors.email}
                    </motion.p>
                  )}
                </div>

                <motion.button
                  whileHover={{ y: -2 }}
                  whileTap={{ y: 0 }}
                  onClick={sendOtp}
                  disabled={loading}
                  className="w-full bg-[#5F8B4C] hover:bg-[#4A7039] disabled:opacity-50 disabled:cursor-not-allowed text-white font-poppins font-semibold py-4 px-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Sending OTP...
                    </>
                  ) : (
                    <>
                      <Mail className="w-5 h-5" />
                      Send Verification Code
                    </>
                  )}
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* Step 2: OTP and Password Reset */}
          {step === 2 && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="space-y-6"
            >
              <div className="text-center mb-8">
                <motion.button
                  whileHover={{ x: -2 }}
                  onClick={() => setStep(1)}
                  className="inline-flex items-center gap-2 text-[#5F8B4C] hover:text-[#4A7039] mb-4 transition-colors font-courier"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to email
                </motion.button>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                >
                  <Lock className="w-16 h-16 text-[#D98324] mx-auto mb-4" />
                </motion.div>
                <h2 className="font-poppins text-[#5F8B4C] text-2xl lg:text-3xl font-bold mb-2">
                  Reset Your Password
                </h2>
                <p className="font-courier text-[#131010] opacity-70">
                  Enter the verification code sent to <span className="font-poppins font-semibold text-[#D98324]">{email}</span>
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label htmlFor="otp" className="block font-poppins text-sm font-medium text-[#5F8B4C] mb-2">
                    Verification Code
                  </label>
                  <div className="relative group">
                    <Shield className="absolute left-4 top-1/2 -translate-y-1/2 text-[#5F8B4C] transition-all group-focus-within:text-[#D98324]" />
                    
                    <input
                      id="otp"
                      type="text"
                      placeholder="Enter 6-digit code"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className={`
                        w-full pl-12 pr-4 py-4 
                        rounded-xl border-2
                        transition-all duration-300 ease-in-out
                        text-center text-lg font-monaco tracking-[0.5em]
                        focus:ring-2 focus:outline-none focus:ring-[#D98324] focus:border-[#D98324]
                        placeholder:text-gray-400
                        ${errors.otp 
                          ? 'border-red-400 bg-red-50 text-red-700' 
                          : 'border-[#5F8B4C] bg-white text-[#131010]'
                        }
                        disabled:opacity-50 disabled:cursor-not-allowed
                      `}
                      maxLength={6}
                      disabled={loading}
                    />
                  </div>

                  {errors.otp && (
                    <motion.p 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-2 font-courier text-sm text-red-600 flex items-center gap-1"
                    >
                      <AlertCircle className="w-4 h-4" />
                      {errors.otp}
                    </motion.p>
                  )}
                  <div className="mt-2 flex items-center justify-between font-courier text-sm">
                    <span className="text-[#131010] opacity-70">
                      {otpTimer > 0 ? `Resend in ${formatTime(otpTimer)}` : 'Code expired'}
                    </span>
                    <button
                      onClick={resendOtp}
                      disabled={otpTimer > 0 || loading}
                      className="text-[#5F8B4C] hover:text-[#4A7039] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Resend Code
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="newPassword" className="block font-poppins text-sm font-medium text-[#5F8B4C] mb-2">
                    New Password
                  </label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[#5F8B4C] w-5 h-5 transition-all group-focus-within:text-[#D98324]" />
                    <input
                      id="newPassword"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Create a strong password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className={`w-full pl-12 pr-14 py-4 border-2 rounded-xl focus:ring-2 focus:ring-[#D98324] focus:border-[#D98324] focus:outline-none transition-all duration-200 font-courier text-[#131010] ${
                        errors.newPassword ? 'border-red-500 bg-red-50' : 'border-[#5F8B4C] bg-white'
                      }`}
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-[#5F8B4C] hover:text-[#D98324] transition-colors"
                    >
                      {showPassword ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                    </button>
                  </div>
                  {errors.newPassword && (
                    <motion.p 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-2 font-courier text-sm text-red-600 flex items-center gap-1"
                    >
                      <AlertCircle className="w-4 h-4" />
                      {errors.newPassword}
                    </motion.p>
                  )}
                  {newPassword && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-3 p-3 bg-white rounded-lg border border-[#5F8B4C]/20"
                    >
                      <p className="font-courier text-xs text-[#131010] opacity-70 mb-2">Password must contain:</p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {[
                          { check: newPassword.length >= 8, text: '8+ characters' },
                          { check: /[A-Z]/.test(newPassword), text: 'Uppercase' },
                          { check: /[a-z]/.test(newPassword), text: 'Lowercase' },
                          { check: /\d/.test(newPassword), text: 'Number' },
                          { check: /[!@#$%^&*(),.?":{}|<>]/.test(newPassword), text: 'Special char' }
                        ].map((item, index) => (
                          <div key={index} className={`flex items-center gap-1 font-courier ${item.check ? 'text-[#5F8B4C]' : 'text-[#131010] opacity-50'}`}>
                            <CheckCircle className="w-3 h-3" />
                            {item.text}
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block font-poppins text-sm font-medium text-[#5F8B4C] mb-2">
                    Confirm Password
                  </label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[#5F8B4C] w-5 h-5 transition-all group-focus-within:text-[#D98324]" />
                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Confirm your new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={`w-full pl-12 pr-14 py-4 border-2 rounded-xl focus:ring-2 focus:ring-[#D98324] focus:border-[#D98324] focus:outline-none transition-all duration-200 font-courier text-[#131010] ${
                        errors.confirmPassword ? 'border-red-500 bg-red-50' : 'border-[#5F8B4C] bg-white'
                      }`}
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-[#5F8B4C] hover:text-[#D98324] transition-colors"
                    >
                      {showConfirmPassword ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <motion.p 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-2 font-courier text-sm text-red-600 flex items-center gap-1"
                    >
                      <AlertCircle className="w-4 h-4" />
                      {errors.confirmPassword}
                    </motion.p>
                  )}
                  {confirmPassword && newPassword === confirmPassword && (
                    <motion.p 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-2 font-courier text-sm text-[#5F8B4C] flex items-center gap-1"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Passwords match
                    </motion.p>
                  )}
                </div>

                <motion.button
                  whileHover={{ y: -2 }}
                  whileTap={{ y: 0 }}
                  onClick={resetPassword}
                  disabled={loading}
                  className="w-full bg-[#5F8B4C] hover:bg-[#4A7039] disabled:opacity-50 disabled:cursor-not-allowed text-white font-poppins font-semibold py-4 px-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Resetting Password...
                    </>
                  ) : (
                    <>
                      <Lock className="w-5 h-5" />
                      Reset Password
                    </>
                  )}
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* Footer */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-8 text-center"
          >
            <p className="font-courier text-sm text-[#131010] opacity-70">
              Remember your password?{' '}
              <button
                onClick={() => navigate('/')}
                className="text-[#5F8B4C] hover:text-[#4A7039] font-poppins font-medium transition-colors"
              >
                Back to login
              </button>
            </p>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export default ForgetPasswordPage;