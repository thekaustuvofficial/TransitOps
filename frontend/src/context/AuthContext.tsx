import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { User } from '../types';
import { db } from '../lib/db';

const SESSION_KEY = 'transitops_session_v1';

interface AuthCtx {
  user: User | null;
  login: (email: string, password: string) => User | null;
  logout: () => void;
  setRole: (role: User['role']) => void;
}

const Ctx = createContext<AuthCtx | null>(null);

function loadSession(): User | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(loadSession);

  const login = useCallback((email: string, password: string) => {
    const found = db.authenticate(email, password);
    if (found) {
      setUser(found);
      localStorage.setItem(SESSION_KEY, JSON.stringify(found));
    }
    return found;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(SESSION_KEY);
  }, []);

  const setRole = useCallback((role: User['role']) => {
    setUser((curr) => {
      if (!curr) return null;
      const updated = { ...curr, role };
      localStorage.setItem(SESSION_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  return <Ctx.Provider value={{ user, login, logout, setRole }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
