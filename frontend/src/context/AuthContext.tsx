import React, { createContext, useContext, useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import { API_URL } from '../config';

type User = {
  id: string;
  username: string;
  email?: string;
  avatar?: string;
  isGuest?: boolean;
};

type JWTPayload = {
  exp: number;
  email?: string;
  id?: string;
  username?: string;
  isGuest?: boolean;
};


type AuthContextType = {
  user: User | null;
  isAuthenticated: boolean;
  isGuest: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginAsGuest: (displayName: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  sendOtp: (email: string, purpose: 'register' | 'reset') => Promise<void>;
  verifyOtp: (params: { email: string; otp: string; purpose: 'register' | 'reset'; username?: string; password?: string; guestId?: string; }) => Promise<void>;
  logout: () => void;
  authFetch: (url: string, options?: RequestInit) => Promise<Response>;
  getToken: () => string | null;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [otpContext, setOtpContext] = useState<{ email: string; purpose: 'register' | 'reset'; pending: boolean; temp?: { username?: string; password?: string } } | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');

    if (storedUser && token) {
      try {
        const decoded: JWTPayload = jwtDecode<JWTPayload>(token);
        const isExpired = decoded.exp * 1000 < Date.now();

        if (!isExpired) {
          setUser(JSON.parse(storedUser));
        } else {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      } catch (error) {
        console.error('Invalid token:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }

    setLoading(false);
  }, []);

  const loginAsGuest = async (displayName: string) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/guest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create guest session');
      }
      
      const guestUser: User = {
        ...data.user,
        isGuest: true
      };
      
      setUser(guestUser);
      localStorage.setItem('user', JSON.stringify(guestUser));
      localStorage.setItem('token', data.token);
    } catch (error) {
      console.error('Guest login failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (username: string, email: string, password: string) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }
      // Expect OTP to be sent; set pending OTP state
      setOtpContext({ email, purpose: 'register', pending: true, temp: { username, password } });
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }
      setUser(data.user);
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('token', data.token);
      if (data.sessionId) localStorage.setItem('sessionId', data.sessionId);
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const sendOtp = async (email: string, purpose: 'register' | 'reset') => {
    const response = await fetch(`${API_URL}/api/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, purpose })
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to send OTP');
    }
    setOtpContext({ email, purpose, pending: true, temp: otpContext?.temp });
  };

  const verifyOtp = async (params: { email: string; otp: string; purpose: 'register' | 'reset'; username?: string; password?: string; guestId?: string; }) => {
    setLoading(true);
    try {
      const payload = {
        ...params,
        guestId: params.guestId || (user?.isGuest ? user.id : undefined)
      };
      const response = await fetch(`${API_URL}/api/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'OTP verification failed');
      }
      setUser(data.user);
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('token', data.token);
      if (data.sessionId) {
        localStorage.setItem('sessionId', data.sessionId);
      }
      setOtpContext(null);
    } catch (error) {
      console.error('OTP verification failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('sessionId');
  };

  const getToken = () => localStorage.getItem('token');

  const authFetch = async (url: string, options: RequestInit = {}) => {
    const token = getToken();
    const headers = {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    return fetch(url, { ...options, headers });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isGuest: !!user?.isGuest,
        loading,
        login,
        loginAsGuest,
        register,
        sendOtp,
        verifyOtp,
        logout,
        authFetch,
        getToken
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthProvider;
