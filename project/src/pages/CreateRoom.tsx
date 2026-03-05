import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Share2, Settings, Users, Clock, Play, Info, CheckCircle, Sparkles, Lock, Unlock, User, FileText, AlertCircle, X } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { useAuth } from '../context/AuthContext';

interface FormData {
  roomName: string;
  description: string;
  isPublic: boolean;
  totalRounds: number;
}

interface FormErrors {
  roomName?: string;
  description?: string;
}

const CreateRoom: React.FC = () => {
  const navigate = useNavigate();
  const { createRoom, connectionState } = useGame();
  const { user } = useAuth();
  
  const [formData, setFormData] = useState<FormData>({
    roomName: '',
    description: '',
    isPublic: true,
    totalRounds: 8
  });
  
  const [errors, setErrors] = useState<FormErrors>({});
  const [isCreating, setIsCreating] = useState(false);
  const [globalError, setGlobalError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [buttonHover, setButtonHover] = useState(false);
  
  // Validation functions
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    
    if (!formData.roomName.trim()) {
      newErrors.roomName = 'Room name is required';
    } else if (formData.roomName.trim().length < 3) {
      newErrors.roomName = 'Room name must be at least 3 characters';
    } else if (formData.roomName.trim().length > 30) {
      newErrors.roomName = 'Room name must be less than 30 characters';
    }
    
    if (formData.description.length > 150) {
      newErrors.description = 'Description must be less than 150 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleInputChange = (field: keyof FormData, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear specific field error when user starts typing
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
    setGlobalError('');
  };
  
  const handleCreateRoom = async () => {
    if (!user) {
      setGlobalError('You must be logged in to create a room');
      return;
    }

    if (connectionState !== 'connected') {
      setGlobalError('Connecting to server... please wait a moment and try again.');
      return;
    }

    if (!validateForm()) {
      return;
    }

    setIsCreating(true);
    setGlobalError('');

    try {
      console.log('[CREATE_ROOM] Attempting to create room with settings:', {
        rounds: formData.totalRounds,
        roundsPerJudge: 5, // Fixed default value
      });

      const roomId = await createRoom({
        rounds: formData.totalRounds,
        roundsPerJudge: 5, // Fixed default value
      });

      console.log('[CREATE_ROOM] Room created successfully with ID:', roomId);
      
      // Show success state briefly before navigation
      setShowSuccess(true);
      setTimeout(() => {
        navigate(`/room/${roomId}`, { state: { isHost: true } });
      }, 1500);

    } catch (error) {
      console.error('Failed to create room:', error);
      setGlobalError(error instanceof Error ? error.message : 'Failed to create room. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleCancel = () => {
    navigate('/dashboard');
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#FFDDAB] via-[#FFDDAB]/90 to-[#FFDDAB]/80 flex items-center justify-center p-4">
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-white/30 text-center max-w-sm w-full transform transition-all duration-500 hover:scale-105 p-8">
          <div className="w-16 h-16 bg-gradient-to-br from-[#5F8B4C] to-[#7BA05C] rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
            <Info className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-[#131010] mb-2" style={{ fontFamily: 'Poppins, sans-serif' }}>
            Authentication Required
          </h2>
          <p className="text-[#131010]/70 mb-6" style={{ fontFamily: 'Courier, monospace' }}>
            Please log in to create a game room
          </p>
          <button
            onClick={() => navigate('/login')}
            className="w-full bg-gradient-to-r from-[#5F8B4C] to-[#7BA05C] text-white py-3 px-6 rounded-xl font-semibold transition-all duration-300 hover:shadow-lg hover:scale-105 transform focus:outline-none focus:ring-4 focus:ring-[#5F8B4C]/30"
            style={{ fontFamily: 'Poppins, sans-serif' }}
            aria-label="Go to login page"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  // Success state
  if (showSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#FFDDAB] via-[#FFDDAB]/90 to-[#FFDDAB]/80 flex items-center justify-center p-4">
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-white/30 text-center max-w-md w-full transform transition-all duration-500 scale-105 p-8 animate-success">
          <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-white animate-bounce" />
          </div>
          <h2 className="text-3xl font-bold text-[#131010] mb-3" style={{ fontFamily: 'Poppins, sans-serif' }}>
            Room Created!
          </h2>
          <p className="text-[#131010]/70 mb-4" style={{ fontFamily: 'Courier, monospace' }}>
            "{formData.roomName}" is ready for players
          </p>
          <div className="flex items-center justify-center space-x-2 text-sm text-[#131010]/60">
            <div className="w-2 h-2 bg-[#5F8B4C] rounded-full animate-pulse"></div>
            <span style={{ fontFamily: 'Courier, monospace' }}>Redirecting to game room...</span>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFDDAB] via-[#FFDDAB]/90 to-[#FFDDAB]/80 py-4 sm:py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="mb-6 sm:mb-8 animate-fade-in">
          <button
            onClick={() => navigate('/dashboard')}
            className="group flex items-center text-[#131010]/70 hover:text-[#5F8B4C] transition-all duration-300 mb-4 sm:mb-6 font-medium transform hover:-translate-x-1 focus:outline-none focus:ring-2 focus:ring-[#5F8B4C]/30 rounded-lg p-2 -m-2"
            style={{ fontFamily: 'Courier, monospace' }}
            aria-label="Back to dashboard"
          >
            <ArrowLeft size={20} className="mr-2 transition-transform duration-300 group-hover:-translate-x-1" />
            Back to Dashboard
          </button>
          
          <div className="text-center mb-6 sm:mb-8">
            <div className="inline-flex items-center gap-3 mb-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-[#5F8B4C] to-[#7BA05C] rounded-full flex items-center justify-center">
                <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <h1 className="text-2xl sm:text-4xl lg:text-5xl font-bold text-[#D98324] tracking-tight" style={{ fontFamily: 'Poppins, sans-serif' }}>
                Create Game Room
              </h1>
            </div>
            <p className="text-base sm:text-lg text-[#131010]/80 max-w-2xl mx-auto leading-relaxed px-4" style={{ fontFamily: 'Courier, monospace' }}>
              Configure your game settings and invite players to join your session
            </p>
          </div>
        </div>
        
        {/* Global Error Alert */}
        {globalError && (
          <div className="mb-6 sm:mb-8 max-w-4xl mx-auto animate-slide-down">
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
                <div className="ml-3 flex-1">
                  <p className="text-red-700 font-medium" style={{ fontFamily: 'Courier, monospace' }}>
                    {globalError}
                  </p>
                </div>
                <button
                  onClick={() => setGlobalError('')}
                  className="ml-4 text-red-400 hover:text-red-600 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500/30 rounded p-1"
                  aria-label="Dismiss error"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          </div>
        )}
        
        <div className="grid xl:grid-cols-3 gap-6 lg:gap-8">
          {/* Main Configuration Panel */}
          <div className="xl:col-span-2 animate-fade-in-up">
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden transform transition-all duration-300 hover:shadow-2xl">
              {/* Panel Header */}
              <div className="bg-gradient-to-r from-[#5F8B4C] to-[#7BA05C] px-4 sm:px-6 py-4 sm:py-5">
                <h2 className="text-lg sm:text-xl font-bold text-white flex items-center" style={{ fontFamily: 'Poppins, sans-serif' }}>
                  <Settings size={20} className="mr-3 flex-shrink-0" />
                  Game Configuration
                </h2>
                <p className="text-white/90 mt-1 text-xs sm:text-sm" style={{ fontFamily: 'Courier, monospace' }}>
                  Customize your gaming experience
                </p>
              </div>
              
              {/* Configuration Content */}
              <div className="p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8">
                {/* Room Name Field */}
                <div className="space-y-3">
                  <label 
                    htmlFor="roomName"
                    className="flex items-center text-base sm:text-lg font-semibold text-[#131010]" 
                    style={{ fontFamily: 'Poppins, sans-serif' }}
                  >
                    <User size={20} className="mr-3 text-[#5F8B4C] flex-shrink-0" />
                    Room Name *
                  </label>
                  <div className="relative">
                    <input
                      id="roomName"
                      type="text"
                      value={formData.roomName}
                      onChange={(e) => handleInputChange('roomName', e.target.value)}
                      placeholder="Enter a catchy room name..."
                      maxLength={30}
                      className={`w-full px-4 py-3 sm:py-4 text-black text-base border-2 rounded-xl transition-all duration-300 focus:outline-none focus:ring-4 bg-white/50 backdrop-blur-sm ${
                        errors.roomName 
                          ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' 
                          : 'border-gray-200 focus:border-[#5F8B4C] focus:ring-[#5F8B4C]/20'
                      }`}
                      style={{ fontFamily: 'Courier, monospace' }}
                      aria-invalid={!!errors.roomName}
                      aria-describedby={errors.roomName ? 'roomName-error' : 'roomName-help'}
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-gray-400">
                      {formData.roomName.length}/30
                    </div>
                  </div>
                  {errors.roomName ? (
                    <p id="roomName-error" className="text-red-600 text-sm flex items-center" style={{ fontFamily: 'Courier, monospace' }}>
                      <AlertCircle size={14} className="mr-1 flex-shrink-0" />
                      {errors.roomName}
                    </p>
                  ) : (
                    <p id="roomName-help" className="text-[#131010]/60 text-sm" style={{ fontFamily: 'Courier, monospace' }}>
                      Choose a memorable name that players will recognize
                    </p>
                  )}
                </div>

                {/* Description Field */}
                <div className="space-y-3">
                  <label 
                    htmlFor="description"
                    className="flex items-center text-base sm:text-lg font-semibold text-[#131010]" 
                    style={{ fontFamily: 'Poppins, sans-serif' }}
                  >
                    <FileText size={20} className="mr-3 text-[#5F8B4C] flex-shrink-0" />
                    Description (Optional)
                  </label>
                  <div className="relative">
                    <textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      placeholder="Describe your game room or add special rules..."
                      maxLength={150}
                      rows={3}
                      className={`w-full px-4 py-3 text-black text-base border-2 rounded-xl transition-all duration-300 focus:outline-none focus:ring-4 bg-white/50 backdrop-blur-sm resize-none ${
                        errors.description 
                          ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' 
                          : 'border-gray-200 focus:border-[#5F8B4C] focus:ring-[#5F8B4C]/20'
                      }`}
                      style={{ fontFamily: 'Courier, monospace' }}
                      aria-invalid={!!errors.description}
                      aria-describedby={errors.description ? 'description-error' : 'description-help'}
                    />
                    <div className="absolute right-3 bottom-3 text-xs text-gray-400">
                      {formData.description.length}/150
                    </div>
                  </div>
                  {errors.description ? (
                    <p id="description-error" className="text-red-600 text-sm flex items-center" style={{ fontFamily: 'Courier, monospace' }}>
                      <AlertCircle size={14} className="mr-1 flex-shrink-0" />
                      {errors.description}
                    </p>
                  ) : (
                    <p id="description-help" className="text-[#131010]/60 text-sm" style={{ fontFamily: 'Courier, monospace' }}>
                      Help players understand what makes your room special
                    </p>
                  )}
                </div>

                {/* Visibility Toggle */}
                <div className="space-y-3">
                  <label className="flex items-center text-base sm:text-lg font-semibold text-[#131010]" style={{ fontFamily: 'Poppins, sans-serif' }}>
                    {formData.isPublic ? (
                      <Unlock size={20} className="mr-3 text-[#5F8B4C] flex-shrink-0" />
                    ) : (
                      <Lock size={20} className="mr-3 text-[#5F8B4C] flex-shrink-0" />
                    )}
                    Room Visibility
                  </label>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => handleInputChange('isPublic', true)}
                      className={`p-4 rounded-xl border-2 transition-all duration-300 text-left transform hover:scale-105 focus:outline-none focus:ring-4 ${
                        formData.isPublic
                          ? 'border-[#5F8B4C] bg-[#5F8B4C]/10 focus:ring-[#5F8B4C]/20'
                          : 'border-gray-200 bg-white/30 hover:border-gray-300 focus:ring-gray-300/20'
                      }`}
                      aria-pressed={formData.isPublic}
                    >
                      <div className="flex items-center space-x-3 mb-2">
                        <Unlock size={18} className={formData.isPublic ? 'text-[#5F8B4C]' : 'text-gray-400'} />
                        <span className={`font-semibold ${formData.isPublic ? 'text-[#5F8B4C]' : 'text-gray-600'}`} style={{ fontFamily: 'Poppins, sans-serif' }}>
                          Public Room
                        </span>
                      </div>
                      <p className="text-sm text-[#131010]/70" style={{ fontFamily: 'Courier, monospace' }}>
                        Anyone can find and join your room
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleInputChange('isPublic', false)}
                      className={`p-4 rounded-xl border-2 transition-all duration-300 text-left transform hover:scale-105 focus:outline-none focus:ring-4 ${
                        !formData.isPublic
                          ? 'border-[#5F8B4C] bg-[#5F8B4C]/10 focus:ring-[#5F8B4C]/20'
                          : 'border-gray-200 bg-white/30 hover:border-gray-300 focus:ring-gray-300/20'
                      }`}
                      aria-pressed={!formData.isPublic}
                    >
                      <div className="flex items-center space-x-3 mb-2">
                        <Lock size={18} className={!formData.isPublic ? 'text-[#5F8B4C]' : 'text-gray-400'} />
                        <span className={`font-semibold ${!formData.isPublic ? 'text-[#5F8B4C]' : 'text-gray-600'}`} style={{ fontFamily: 'Poppins, sans-serif' }}>
                          Private Room
                        </span>
                      </div>
                      <p className="text-sm text-[#131010]/70" style={{ fontFamily: 'Courier, monospace' }}>
                        Only invited players can join
                      </p>
                    </button>
                  </div>
                </div>

                {/* Total Rounds Setting */}
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <label className="flex items-center text-base sm:text-lg font-semibold text-[#131010]" style={{ fontFamily: 'Poppins, sans-serif' }}>
                      <Clock size={20} className="mr-3 text-[#5F8B4C] flex-shrink-0" />
                      Total Rounds
                    </label>
                    <div className="bg-gradient-to-r from-[#D98324] to-[#E69B3A] px-4 py-2 rounded-xl text-white font-bold text-lg shadow-md min-w-[60px] text-center transform transition-all duration-300 hover:scale-105">
                      {formData.totalRounds}
                    </div>
                  </div>
                  
                  <div className="relative">
                    <input
                      type="range"
                      min="3"
                      max="8"
                      step="1"
                      value={formData.totalRounds}
                      onChange={(e) =>
                        handleInputChange("totalRounds", parseInt(e.target.value))
                      }
                      className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer slider transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-4 focus:ring-[#5F8B4C]/20"
                      style={{
                        background: `linear-gradient(
                          to right,
                          #5F8B4C 0%,
                          #5F8B4C ${((formData.totalRounds - 3) / 5) * 100}%,
                          #e5e7eb ${((formData.totalRounds - 3) / 5) * 100}%,
                          #e5e7eb 100%
                        )`
                      }}
                      aria-label={`Total rounds: ${formData.totalRounds}`}
                    />
                    <div
                      className="flex justify-between text-sm text-[#131010]/60 mt-2"
                      style={{ fontFamily: "Courier, monospace" }}
                    >
                      <span>3</span>
                      <span className="text-center">Rounds</span>
                      <span>8</span>
                    </div>
                  </div>
                  <p className="text-[#131010]/70 text-sm leading-relaxed" style={{ fontFamily: 'Courier, monospace' }}>
                    Determines the total number of rounds in your game session. Recommended: 5-8 rounds for optimal engagement.
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Game Information Sidebar */}
          <div className="xl:col-span-1 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden sticky top-8 transform transition-all duration-300 hover:shadow-2xl">
              {/* Sidebar Header */}
              <div className="bg-gradient-to-r from-[#D98324] to-[#E69B3A] px-4 sm:px-6 py-4 sm:py-5">
                <h3 className="text-base sm:text-lg font-bold text-white flex items-center" style={{ fontFamily: 'Poppins, sans-serif' }}>
                  <Info size={18} className="mr-3 flex-shrink-0" />
                  Setup Guide
                </h3>
              </div>
              
              {/* Setup Steps */}
              <div className="p-4 sm:p-6">
                <div className="space-y-4">
                  {[
                    {
                      step: 1,
                      title: 'Host Privileges',
                      description: 'You will be the game host with full control over game flow and settings.',
                      icon: <CheckCircle size={16} />
                    },
                    {
                      step: 2,
                      title: 'Invite Players',
                      description: 'Share the room link with friends. Minimum 3 players recommended for best experience.',
                      icon: <Users size={16} />
                    },
                    {
                      step: 3,
                      title: 'Start Game',
                      description: 'Launch the game when all players have joined and are ready to play.',
                      icon: <Play size={16} />
                    }
                  ].map((item, index) => (
                    <div 
                      key={item.step} 
                      className="flex items-start space-x-3 p-3 rounded-xl bg-gray-50/50 hover:bg-gray-50 transition-all duration-300 transform hover:scale-105"
                      style={{ animationDelay: `${0.2 + index * 0.1}s` }}
                    >
                      <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-[#5F8B4C] to-[#7BA05C] rounded-full flex items-center justify-center text-white text-sm font-bold">
                        {item.step}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-[#131010] text-sm mb-1" style={{ fontFamily: 'Poppins, sans-serif' }}>
                          {item.title}
                        </h4>
                        <p className="text-[#131010]/70 text-xs leading-relaxed" style={{ fontFamily: 'Courier, monospace' }}>
                          {item.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Game Stats Preview */}
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h4 className="font-semibold text-[#131010] mb-3 text-sm" style={{ fontFamily: 'Poppins, sans-serif' }}>
                    Game Preview
                  </h4>
                  <div className="grid grid-cols-1 gap-3">
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-3 rounded-lg text-center transform transition-all duration-300 hover:scale-105">
                      <div className="text-lg font-bold text-[#5F8B4C]" style={{ fontFamily: 'Poppins, sans-serif' }}>
                        {formData.totalRounds}
                      </div>
                      <div className="text-xs text-[#131010]/70" style={{ fontFamily: 'Courier, monospace' }}>
                        Total Rounds
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-3 rounded-lg text-center transform transition-all duration-300 hover:scale-105">
                      <div className="text-lg font-bold text-[#5F8B4C] flex items-center justify-center gap-1" style={{ fontFamily: 'Poppins, sans-serif' }}>
                        {formData.isPublic ? <Unlock size={16} /> : <Lock size={16} />}
                        {formData.isPublic ? 'Public' : 'Private'}
                      </div>
                      <div className="text-xs text-[#131010]/70" style={{ fontFamily: 'Courier, monospace' }}>
                        Room Type
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Action Buttons Section */}
        <div className="mt-8 sm:mt-12 text-center animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center max-w-lg mx-auto">
            {/* Cancel Button */}
            <button
              onClick={handleCancel}
              disabled={isCreating}
              className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg font-semibold text-[#131010] bg-white/80 border-2 border-gray-200 rounded-xl sm:rounded-2xl shadow-lg hover:shadow-xl transform transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none focus:outline-none focus:ring-4 focus:ring-gray-300/20 min-w-[140px]"
              style={{ fontFamily: 'Poppins, sans-serif' }}
            >
              Cancel
            </button>

            {/* Create Button */}
            <button
              onClick={handleCreateRoom}
              disabled={isCreating || !formData.roomName.trim()}
              onMouseEnter={() => setButtonHover(true)}
              onMouseLeave={() => setButtonHover(false)}
              className="group relative w-full sm:w-auto inline-flex items-center justify-center px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg font-bold text-white bg-gradient-to-r from-[#5F8B4C] to-[#7BA05C] rounded-xl sm:rounded-2xl shadow-xl hover:shadow-2xl transform transition-all duration-500 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none min-w-[200px] overflow-hidden focus:outline-none focus:ring-4 focus:ring-[#5F8B4C]/30"
              style={{ fontFamily: 'Poppins, sans-serif' }}
            >
              {/* Button Background Effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-[#4A6B3A] to-[#5F8B4C] rounded-xl sm:rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              
              {/* Shine Effect */}
              <div className={`absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 transform transition-transform duration-700 ${
                buttonHover ? 'translate-x-[100%]' : '-translate-x-[100%]'
              }`}></div>
              
              {/* Button Content */}
              <div className="relative flex items-center space-x-3">
                {isCreating ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Creating Room...</span>
                  </>
                ) : (
                  <>
                    <Share2 size={20} className="transition-transform duration-300 group-hover:scale-110 flex-shrink-0" />
                    <span>Create & Share Game</span>
                  </>
                )}
              </div>
            </button>
          </div>
          
          <p className="mt-4 text-[#131010]/60 text-sm max-w-md mx-auto px-4" style={{ fontFamily: 'Courier, monospace' }}>
            Your game room will be created instantly and ready for players to join
          </p>
        </div>
      </div>
      
      {/* Custom Styles */}
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes fade-in-up {
          from { 
            opacity: 0; 
            transform: translateY(20px); 
          }
          to { 
            opacity: 1; 
            transform: translateY(0); 
          }
        }
        
        @keyframes slide-down {
          from { 
            opacity: 0; 
            transform: translateY(-20px); 
          }
          to { 
            opacity: 1; 
            transform: translateY(0); 
          }
        }
        
        @keyframes success {
          0% { 
            opacity: 0; 
            transform: scale(0.9) translateY(20px); 
          }
          100% { 
            opacity: 1; 
            transform: scale(1) translateY(0); 
          }
        }
        
        .animate-fade-in {
          animation: fade-in 0.6s ease-out;
        }
        
        .animate-fade-in-up {
          animation: fade-in-up 0.6s ease-out;
        }
        
        .animate-slide-down {
          animation: slide-down 0.4s ease-out;
        }
        
        .animate-success {
          animation: success 0.6s ease-out;
        }
        
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #5F8B4C;
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(0,0,0,0.2);
          transition: all 0.2s ease;
        }
        
        .slider::-webkit-slider-thumb:hover {
          transform: scale(1.2);
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        }
        
        .slider::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #5F8B4C;
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 6px rgba(0,0,0,0.2);
          transition: all 0.2s ease;
        }
        
        .slider::-moz-range-thumb:hover {
          transform: scale(1.2);
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        }

        /* Mobile optimizations */
        @media (max-width: 640px) {
          .animate-fade-in-up {
            animation-delay: 0s !important;
          }
        }
      `}</style>
    </div>
  );
};

export default CreateRoom;