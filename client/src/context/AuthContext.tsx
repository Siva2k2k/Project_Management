import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User, LoginCredentials, RegisterData, AuthContextType } from '../types';
import { authService, setAccessToken, getAccessToken } from '../services';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user;

  // Initialize auth state on mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        const hasAccessToken = !!getAccessToken();

        if (hasAccessToken) {
          // We have an access token, try to get profile
          // If token is expired, axios interceptor will handle refresh
          const profile = await authService.getProfile();
          setUser(profile);
        } else {
          // No access token - not authenticated
          // Don't try to refresh as it will fail if there's no refresh token cookie
          setUser(null);
          setAccessToken(null);
          setIsLoading(false);
        }
      } catch (error) {
        // Authentication failed
        setUser(null);
        setAccessToken(null);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = useCallback(async (credentials: LoginCredentials): Promise<void> => {
    const { user: userData } = await authService.login(credentials);
    setUser(userData);
  }, []);

  const register = useCallback(async (data: RegisterData): Promise<void> => {
    const { user: userData } = await authService.register(data);
    setUser(userData);
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    try {
      await authService.logout();
    } finally {
      setUser(null);
    }
  }, []);

  const refreshToken = useCallback(async (): Promise<void> => {
    await authService.refreshToken();
  }, []);

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    login,
    register,
    logout,
    refreshToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
