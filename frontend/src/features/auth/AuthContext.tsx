import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthUser, ROLES, DEMO_CREDENTIALS } from './types';

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (username: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  signup: (
    username: string,
    password: string,
    fullName: string,
    roleId: string
  ) => Promise<{ success: boolean; error?: string }>;
  loginAsRole: (roleId: string) => void;
  logout: () => void;
  canAccessTab: (tabId: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'ledgerflow_user_session';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem(AUTH_STORAGE_KEY);
        if (saved) {
          return JSON.parse(saved);
        }
      }
    } catch {
      // fallback
    }
    return null;
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  }, [user]);

  const login = async (
    username: string,
    password?: string
  ): Promise<{ success: boolean; error?: string }> => {
    const cleanUser = username.trim().toLowerCase();
    const cleanPass = (password ?? '').trim();

    if (!cleanUser) {
      return { success: false, error: 'Please enter your username.' };
    }
    if (!cleanPass) {
      return { success: false, error: 'Please enter your password.' };
    }

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: cleanUser, password: cleanPass }),
      });

      if (res.ok) {
        const data = await res.json();
        const roleId = data.user?.roleId || 'admin';
        const role = ROLES[roleId] || ROLES.admin;
        const loggedUser: AuthUser = {
          username: data.user.username,
          displayName: data.user.displayName || role.name,
          role,
          avatar: (data.user.displayName || role.name).charAt(0).toUpperCase(),
        };
        setUser(loggedUser);
        return { success: true };
      } else {
        const errData = await res.json().catch(() => ({}));
        const msg = errData.detail || 'Invalid username or password.';
        return { success: false, error: msg };
      }
    } catch {
      // Offline / dev fallback: verify against pre-seeded credentials if API is offline
      const matchedSeed = DEMO_CREDENTIALS.find(
        (c) => c.username.toLowerCase() === cleanUser && c.password === cleanPass
      );
      if (matchedSeed) {
        const role = ROLES[matchedSeed.roleId] || ROLES.admin;
        const loggedUser: AuthUser = {
          username: cleanUser,
          displayName: role.name,
          role,
          avatar: role.name.charAt(0).toUpperCase(),
        };
        setUser(loggedUser);
        return { success: true };
      }
      return { success: false, error: 'Invalid username or password.' };
    }
  };

  const signup = async (
    username: string,
    password: string,
    fullName: string,
    roleId: string
  ): Promise<{ success: boolean; error?: string }> => {
    const cleanUser = username.trim().toLowerCase();
    const cleanPass = password.trim();
    const cleanName = fullName.trim();

    if (!cleanUser || cleanUser.length < 3) {
      return { success: false, error: 'Username must be at least 3 characters long.' };
    }
    if (!cleanPass || cleanPass.length < 4) {
      return { success: false, error: 'Password must be at least 4 characters long.' };
    }
    if (!cleanName) {
      return { success: false, error: 'Please enter your full name.' };
    }

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: cleanUser,
          password: cleanPass,
          full_name: cleanName,
          role_id: roleId,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const userRole = ROLES[data.user.roleId] || ROLES.admin;
        const newUser: AuthUser = {
          username: data.user.username,
          displayName: data.user.displayName,
          role: userRole,
          avatar: data.user.displayName.charAt(0).toUpperCase(),
        };
        setUser(newUser);
        return { success: true };
      } else {
        const errData = await res.json().catch(() => ({}));
        const msg = errData.detail || 'Sign up failed. Please try another username.';
        return { success: false, error: msg };
      }
    } catch {
      return {
        success: false,
        error: 'Backend connection error. Please verify the API server is running.',
      };
    }
  };

  const loginAsRole = (roleId: string) => {
    const role = ROLES[roleId] || ROLES.admin;
    setUser({
      username: roleId,
      displayName: role.name,
      role,
      avatar: role.name.charAt(0).toUpperCase(),
    });
  };

  const logout = () => {
    setUser(null);
  };

  const canAccessTab = (tabId: string): boolean => {
    if (!user) return false;
    if (user.role.id === 'admin') return true; // Admin has full access to ALL pages
    return user.role.allowedTabs.includes(tabId);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        login,
        signup,
        loginAsRole,
        logout,
        canAccessTab,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
