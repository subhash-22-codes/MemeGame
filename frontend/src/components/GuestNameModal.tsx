import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, X, Loader2, AlertCircle, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface GuestNameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const GuestNameModal: React.FC<GuestNameModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { loginAsGuest } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const validate = (name: string): string | null => {
    if (!name.trim()) return 'Display name is required';
    if (name.trim().length < 2) return 'Must be at least 2 characters';
    if (name.trim().length > 20) return 'Must be 20 characters or less';
    if (!/^[a-zA-Z0-9 _-]+$/.test(name.trim())) return 'Only letters, numbers, spaces, hyphens, and underscores';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const validationError = validate(displayName);
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      await loginAsGuest(displayName.trim());
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create guest session');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-[#131010]/60 backdrop-blur-sm"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Modal */}
          <motion.div
            className="relative w-full max-w-sm bg-white rounded-2xl border-4 border-[#131010] shadow-[8px_8px_0px_0px_#131010] overflow-hidden"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          >
            {/* Header */}
            <div className="bg-[#131010] px-6 py-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#D98324] border-2 border-white/20 rounded-xl flex items-center justify-center">
                  <Zap size={20} className="text-white" strokeWidth={3} />
                </div>
                <div>
                  <h2 className="text-lg font-black text-white font-poppins">Quick Play</h2>
                  <p className="text-white/50 text-xs font-medium font-poppins">No account needed</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              >
                <X size={16} className="text-white" strokeWidth={3} />
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div className="space-y-1.5">
                <label
                  htmlFor="guest-name"
                  className="block text-xs font-bold text-[#131010]/60 uppercase tracking-wider font-courier"
                >
                  Your Display Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center z-10 pointer-events-none">
                    <User size={20} className="text-[#131010]" strokeWidth={2.5} />
                  </div>
                  <input
                    id="guest-name"
                    type="text"
                    value={displayName}
                    onChange={(e) => {
                      setDisplayName(e.target.value);
                      setError('');
                    }}
                    placeholder="e.g. MemeKing42"
                    maxLength={20}
                    autoFocus
                    autoComplete="off"
                    className={`
                      w-full px-4 py-3.5 pl-12
                      bg-[#FFDDAB]/10 text-[#131010] text-base font-poppins font-semibold
                      border-2 rounded-xl transition-shadow duration-200
                      focus:outline-none focus:bg-white focus:shadow-[2px_2px_0px_0px_#131010]
                      placeholder:text-[#131010]/30 placeholder:font-medium
                      ${error ? 'border-red-500 bg-red-50/50' : 'border-[#131010]'}
                    `}
                  />
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

                <p className="text-[#131010]/40 text-xs font-poppins font-medium mt-1">
                  2-20 characters · Letters, numbers, spaces, hyphens
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || !displayName.trim()}
                className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-poppins font-bold text-base text-white bg-[#5F8B4C] border-2 border-[#131010] shadow-[4px_4px_0px_0px_#131010] hover:shadow-[5px_5px_0px_0px_#131010] active:translate-y-[2px] active:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" strokeWidth={3} />
                    Joining...
                  </>
                ) : (
                  <>
                    <Zap size={18} strokeWidth={3} />
                    Jump In
                  </>
                )}
              </button>

              <p className="text-center text-[10px] font-medium text-[#131010]/40 font-poppins">
                Guest sessions last 24 hours · Create an account anytime for permanent stats
              </p>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default GuestNameModal;
