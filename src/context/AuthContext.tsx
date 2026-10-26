import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserPreferences } from '../types';
import { api } from '../api';

interface AuthContextType {
  user: User | null;
  preferences: UserPreferences | null;
  loading: boolean;
  error: string | null;
  aiConfigured: boolean;
  login: (data: { email: string; password: string }) => Promise<void>;
  register: (data: { email: string; password: string; name: string; learningGoal?: string; preferredLanguage?: string }) => Promise<void>;
  demoLogin: () => Promise<void>;
  logout: () => Promise<void>;
  updatePreferences: (data: Partial<UserPreferences>) => Promise<void>;
  updateProfile: (data: { name: string; avatarUrl?: string }) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aiConfigured, setAiConfigured] = useState(false);

  const refreshUser = async () => {
    const token = localStorage.getItem('mf_token');
    if (!token) {
      setUser(null);
      setPreferences(null);
      setLoading(false);
      return;
    }

    try {
      const res = await api.getMe();
      setUser(res.user);
      if (res.preferences) setPreferences(res.preferences);
      setAiConfigured(res.aiConfigured);
      setError(null);
    } catch (err: any) {
      console.warn('Session check failed:', err.message);
      localStorage.removeItem('mf_token');
      setUser(null);
      setPreferences(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (data: { email: string; password: string }) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.login(data);
      setUser(res.user);
      if (res.preferences) setPreferences(res.preferences);
    } catch (err: any) {
      setError(err.message || 'Login failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const register = async (data: { email: string; password: string; name: string; learningGoal?: string; preferredLanguage?: string }) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.register(data);
      setUser(res.user);
      if (res.preferences) setPreferences(res.preferences);
    } catch (err: any) {
      setError(err.message || 'Registration failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const demoLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.demoLogin();
      setUser(res.user);
      if (res.preferences) setPreferences(res.preferences);
      setAiConfigured(true);
    } catch (err: any) {
      setError(err.message || 'Demo login failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch {
      // ignore
    } finally {
      setUser(null);
      setPreferences(null);
    }
  };

  const updatePreferences = async (data: Partial<UserPreferences>) => {
    try {
      const res = await api.updatePreferences(data);
      setPreferences(res.preferences);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const updateProfile = async (data: { name: string; avatarUrl?: string }) => {
    try {
      const res = await api.updateProfile(data);
      setUser(prev => prev ? { ...prev, ...res.user } : res.user);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        preferences,
        loading,
        error,
        aiConfigured,
        login,
        register,
        demoLogin,
        logout,
        updatePreferences,
        updateProfile,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
