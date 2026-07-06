import { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import type { Role } from '../types';
import { authLogger } from '../utils/logger';

interface UserData { username: string; email: string; role: Role }

interface AuthContextType {
  user: UserData | null;
  login: (username: string, password: string) => Promise<Role>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserData | null>(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      authLogger.info('User restored from session', {
        file: 'src/context/AuthContext.tsx', function: 'AuthProvider',
      });
    }
    try { return stored ? JSON.parse(stored) : null; } catch { localStorage.removeItem('user'); return null; }
  });
  const navigate = useNavigate();

  const login = useCallback(async (username: string, password: string) => {
    authLogger.info(`Login attempt: ${username}`, {
      file: 'src/context/AuthContext.tsx', function: 'login',
    });
    try {
      const res = await api.post('/auth/login', { username, password });
      const { token, username: uname, email, role } = res.data;
      localStorage.setItem('token', token);
      const userData: UserData = { username: uname, email, role };
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      authLogger.info(`Login successful: ${uname} (${role})`, {
        file: 'src/context/AuthContext.tsx', function: 'login',
      });
      return role;
    } catch (err: any) {
      authLogger.warn(`Login failed: ${username}`, {
        file: 'src/context/AuthContext.tsx', function: 'login',
        message: err.response?.data?.message || err.message,
      });
      throw err;
    }
  }, []);

  const logout = useCallback(() => {
    const currentUser = user?.username;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    navigate('/login');
    authLogger.info(`Logout: ${currentUser || 'unknown'}`, {
      file: 'src/context/AuthContext.tsx', function: 'logout',
    });
  }, [navigate, user]);

  const value = useMemo(() => ({ user, login, logout, isAuthenticated: !!user }), [user, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
