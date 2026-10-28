import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import type { AuthUser } from './types';
import { authApi } from './api';

interface AuthContextValue {
  user: AuthUser | null;
  initializing: boolean;
  sessionExpiringSoon: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithWindows: () => Promise<boolean>;
  register: (fullName: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  dismissSessionWarning: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const WARNING_LEAD_MS = 5 * 60 * 1000;

function loadStoredUser(): AuthUser | null {
  const raw = localStorage.getItem('user');
  return raw ? (JSON.parse(raw) as AuthUser) : null;
}

function decodeJwtExpiryMs(token: string): number | null {
  try {
    const payloadPart = token.split('.')[1];
    const base64 = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join('')
    );
    const payload = JSON.parse(json) as { exp?: number };
    return payload.exp ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(loadStoredUser());
  const [initializing, setInitializing] = useState(!loadStoredUser());
  const [sessionExpiringSoon, setSessionExpiringSoon] = useState(false);

  const warnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const expireTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearSessionTimers() {
    if (warnTimerRef.current) clearTimeout(warnTimerRef.current);
    if (expireTimerRef.current) clearTimeout(expireTimerRef.current);
    warnTimerRef.current = null;
    expireTimerRef.current = null;
  }

  function scheduleSessionTimers(token: string) {
    clearSessionTimers();
    const expiryMs = decodeJwtExpiryMs(token);
    if (!expiryMs) return;

    const now = Date.now();
    const msUntilExpiry = expiryMs - now;
    const msUntilWarning = msUntilExpiry - WARNING_LEAD_MS;

    setSessionExpiringSoon(false);

    if (msUntilExpiry <= 0) {
      logout();
      return;
    }

    if (msUntilWarning <= 0) {
      setSessionExpiringSoon(true);
    } else {
      warnTimerRef.current = setTimeout(() => setSessionExpiringSoon(true), msUntilWarning);
    }

    expireTimerRef.current = setTimeout(() => {
      logout();
    }, msUntilExpiry);
  }

  function persist(token: string, user: AuthUser) {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    setUser(user);
    scheduleSessionTimers(token);
  }

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (user && storedToken) {
      scheduleSessionTimers(storedToken);
      setInitializing(false);
      return;
    }
    authApi.windowsLogin().then((result) => {
      if (result) persist(result.token, result.user);
      setInitializing(false);
    });

    return () => clearSessionTimers();
  }, []);

  async function login(email: string, password: string) {
    const { token, user } = await authApi.login(email, password);
    persist(token, user);
  }

  async function loginWithWindows(): Promise<boolean> {
    const result = await authApi.windowsLogin();
    if (result) {
      persist(result.token, result.user);
      return true;
    }
    return false;
  }

  async function register(fullName: string, email: string, password: string) {
    const { token, user } = await authApi.register(fullName, email, password);
    persist(token, user);
  }

  function logout() {
    clearSessionTimers();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setSessionExpiringSoon(false);
  }

  function dismissSessionWarning() {
    setSessionExpiringSoon(false);
  }

  return (
    <AuthContext.Provider
      value={{ user, initializing, sessionExpiringSoon, login, loginWithWindows, register, logout, dismissSessionWarning }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth, AuthProvider içinde kullanılmalı');
  return ctx;
}
