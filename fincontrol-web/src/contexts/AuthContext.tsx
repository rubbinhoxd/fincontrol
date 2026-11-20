import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import { isJwtExpired } from '../utils/jwt';

interface AuthContextType {
  token: string | null;
  userName: string | null;
  login: (token: string, name: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

/**
 * Le token+userName do localStorage mas rejeita se o JWT ja expirou.
 * Impede o estado "parece logado mas as APIs retornam 401" que gera
 * dashboard/listas vazias no primeiro load.
 */
function loadInitialAuth(): { token: string | null; userName: string | null } {
  const token = localStorage.getItem('token');
  const userName = localStorage.getItem('userName');
  if (token && isJwtExpired(token)) {
    localStorage.removeItem('token');
    localStorage.removeItem('userName');
    return { token: null, userName: null };
  }
  return { token, userName };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const initial = loadInitialAuth();
  const [token, setToken] = useState<string | null>(initial.token);
  const [userName, setUserName] = useState<string | null>(initial.userName);

  const login = (token: string, name: string) => {
    localStorage.setItem('token', token);
    localStorage.setItem('userName', name);
    setToken(token);
    setUserName(name);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userName');
    setToken(null);
    setUserName(null);
  };

  return (
    <AuthContext.Provider value={{ token, userName, login, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
