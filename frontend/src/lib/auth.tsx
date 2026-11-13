import { createContext, useContext, useState, type ReactNode } from 'react';
import { api } from './api';
import type { AuthResponse, User } from '../types';

export interface LoginBody { Email: string; Password: string }
export interface RegisterBody { FullName: string; Email: string; Phone: string; Password: string }

interface AuthContextValue {
  user: User | null;
  login: (body: LoginBody) => Promise<void>;
  register: (body: RegisterBody) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readUser(): User | null {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null') as User | null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(readUser);

  const save = ({ token, user }: AuthResponse) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    setUser(user);
  };
  const login = async (body: LoginBody) => save((await api.post<AuthResponse>('/auth/login', body)).data);
  const register = async (body: RegisterBody) => save((await api.post<AuthResponse>('/auth/register', body)).data);
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  return <AuthContext.Provider value={{ user, login, register, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth phải dùng bên trong AuthProvider');
  return ctx;
}
