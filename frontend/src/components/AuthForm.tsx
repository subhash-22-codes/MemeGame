import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LogIn, UserCircle2, Eye, EyeOff, AlertCircle,
    Mail, Lock, KeyRound
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { useNavigate, Link } from 'react-router-dom';

// --- Tactile Button Component ---
interface ButtonProps {
    children: React.ReactNode;
    variant?: 'primary' | 'outline' | 'secondary';
    size?: 'sm' | 'md' | 'lg';
    fullWidth?: boolean;
    loading?: boolean;
    disabled?: boolean;
    icon?: React.ReactNode;
    type?: 'button' | 'submit';
    onClick?: () => void;
}

const Button: React.FC<ButtonProps> = ({
    children,
    variant = 'primary',
    size = 'md',
    fullWidth = false,
    loading = false,
    disabled = false,
    icon,
    type = 'button',
    onClick
}) => {
    const baseClasses = "inline-flex items-center justify-center font-poppins font-bold transition-all duration-150 border-2 border-[#131010] focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed active:translate-y-[2px] active:shadow-none";

    const variants = {
        primary: "bg-[#D98324] text-[#131010] shadow-[3px_3px_0px_0px_#131010] hover:shadow-[5px_5px_0px_0px_#131010]",
        outline: "bg-white text-[#131010] shadow-[3px_3px_0px_0px_#131010] hover:shadow-[5px_5px_0px_0px_#131010] hover:bg-[#FFDDAB]",
        secondary: "bg-[#5F8B4C] text-white shadow-[3px_3px_0px_0px_#131010] hover:shadow-[5px_5px_0px_0px_#131010]"
    };

    const sizes = {
        sm: "px-4 py-2 text-sm rounded-lg",
        md: "px-6 py-3 text-base rounded-xl",
        lg: "px-8 py-4 text-lg rounded-xl"
    };

    const widthClass = fullWidth ? "w-full" : "";

    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled || loading}
            className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${widthClass}`}
        >
            {loading ? (
                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full mr-2 animate-spin" />
            ) : icon ? (
                <span className="mr-2">{icon}</span>
            ) : null}
            {children}
        </button>
    );
};

// --- Tactile Input Component ---
interface InputProps {
    id: string;
    type: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string;
    required?: boolean;
    icon?: React.ReactNode;
    error?: string;
    label: string;
}

const Input: React.FC<InputProps> = ({
    id,
    type,
    value,
    onChange,
    placeholder,
    required,
    icon,
    error,
    label
}) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === 'password';
    const actualType = isPassword && showPassword ? 'text' : type;

    return (
        <div className="space-y-1.5">
            <label htmlFor={id} className="block text-xs font-bold text-[#131010]/60 uppercase tracking-wider font-courier">
                {label}
            </label>
            <div className="relative">
                {icon && (
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center z-10 pointer-events-none">
                        {React.cloneElement(icon as React.ReactElement, {
                            className: 'text-[#131010] w-5 h-5',
                            strokeWidth: 2.5
                        })}
                    </div>
                )}
                <input
                    id={id}
                    type={actualType}
                    value={value}
                    onChange={onChange}
                    required={required}
                    placeholder={placeholder}
                    className={`
            w-full px-4 py-3.5 ${icon ? 'pl-12' : ''} ${isPassword ? 'pr-12' : ''}
            bg-[#FFDDAB]/10 text-[#131010] text-base sm:text-sm font-poppins font-semibold
            border-2 rounded-xl transition-shadow duration-200
            focus:outline-none focus:bg-white focus:shadow-[2px_2px_0px_0px_#131010]
            placeholder:text-[#131010]/30 placeholder:font-medium
            ${error ? 'border-red-500 bg-red-50/50' : 'border-[#131010]'}
          `}
                />
                {isPassword && (
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center z-10 text-[#131010]/60 hover:text-[#131010] transition-colors"
                    >
                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                )}
            </div>
            <AnimatePresence>
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="flex items-center text-red-600 text-xs font-bold font-poppins mt-1"
                    >
                        <AlertCircle size={14} className="mr-1" strokeWidth={2.5} />
                        {error}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export interface AuthFormProps {
    defaultIsRegister?: boolean;
    onSuccess?: () => void;
    onModeChange?: (isRegister: boolean, step: 'form' | 'otp') => void;
}

const AuthForm: React.FC<AuthFormProps> = ({ defaultIsRegister = false, onSuccess, onModeChange }) => {
    const { login, sendOtp, verifyOtp } = useAuth();
    const navigate = useNavigate();

    const [isRegister, setIsRegister] = useState(defaultIsRegister);
    const [step, setStep] = useState<'form' | 'otp'>('form');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Form state
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
    const [otp, setOtp] = useState('');

    useEffect(() => {
        setIsRegister(defaultIsRegister);
        setStep('form');
        setEmail('');
        setPassword('');
        setUsername('');
        setOtp('');
        setError('');
        if (onModeChange) onModeChange(defaultIsRegister, 'form');
    }, [defaultIsRegister]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (step === 'form') {
                if (isRegister) {
                    // Trigger OTP send
                    await sendOtp(email, 'register');
                    setStep('otp');
                    if (onModeChange) onModeChange(isRegister, 'otp');
                } else {
                    await login(email, password);
                    toast.success('Welcome back!');
                    if (onSuccess) onSuccess();
                    navigate('/dashboard');
                }
            } else {
                // OTP step
                await verifyOtp({ email, otp, purpose: 'register', username, password });
                toast.success('Registration successful!');
                if (onSuccess) onSuccess();
                navigate('/dashboard');
            }
        } catch (err: any) {
            setError(err.message || 'Authentication failed');
        } finally {
            setLoading(false);
        }
    };

    const toggleMode = () => {
        setIsRegister(!isRegister);
        setStep('form');
        setError('');
        if (onModeChange) onModeChange(!isRegister, 'form');
    };

    const handleBackToRegistration = () => {
        setStep('form');
        if (onModeChange) onModeChange(isRegister, 'form');
    };

    return (
        <div className="w-full">
            {error && (
                <div className="mb-6 p-4 bg-red-100 border-2 border-red-500 rounded-xl flex items-start gap-3 text-red-700 font-medium text-sm">
                    <AlertCircle className="shrink-0 mt-0.5" size={18} strokeWidth={2.5} />
                    <p>{error}</p>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
                {step === 'form' ? (
                    <>
                        {isRegister && (
                            <Input
                                id="username"
                                label="Username"
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="e.g. MemeLord99"
                                icon={<UserCircle2 />}
                                required
                            />
                        )}
                        <Input
                            id="email"
                            label="Email Address"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@example.com"
                            icon={<Mail />}
                            required
                        />
                        <div className="space-y-2">
                            <Input
                                id="password"
                                label="Password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Super secret password"
                                icon={<Lock />}
                                required
                            />
                            {!isRegister && (
                                <div className="text-right">
                                    <Link 
                                        to="/forgot-password" 
                                        className="text-xs font-bold text-[#D98324] hover:text-[#131010] transition-colors"
                                    >
                                        Forgot Password?
                                    </Link>
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="space-y-4">
                        <p className="text-sm font-medium text-[#131010]/70 text-center mb-4">
                            We sent a 6-digit code to <br />
                            <span className="font-bold text-[#131010]">{email}</span>
                        </p>
                        <Input
                            id="otp"
                            label="Verification Code"
                            type="text"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value)}
                            placeholder="123456"
                            icon={<KeyRound />}
                            required
                        />
                    </div>
                )}

                <div className="pt-4">
                    <Button
                        type="submit"
                        variant="primary"
                        fullWidth
                        size="lg"
                        loading={loading}
                        icon={step === 'otp' ? <KeyRound /> : <LogIn />}
                    >
                        {step === 'otp'
                            ? 'Verify & Join'
                            : isRegister
                                ? 'Create Account'
                                : 'Sign In'}
                    </Button>
                </div>
            </form>

            {step === 'form' && (
                <div className="mt-8 pt-6 border-t-2 border-[#131010]/10 text-center">
                    <p className="text-sm font-medium text-[#131010]/70">
                        {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
                        <button
                            type="button"
                            onClick={toggleMode}
                            className="font-bold text-[#D98324] hover:underline underline-offset-4"
                        >
                            {isRegister ? 'Sign in' : 'Create one'}
                        </button>
                    </p>
                </div>
            )}

            {step === 'otp' && (
                <div className="mt-8 pt-6 border-t-2 border-[#131010]/10 text-center">
                    <button
                        type="button"
                        onClick={handleBackToRegistration}
                        className="font-bold text-[#131010]/60 hover:text-[#131010] text-sm hover:underline underline-offset-4"
                    >
                        Back to registration
                    </button>
                </div>
            )}
        </div>
    );
};

export default AuthForm;
