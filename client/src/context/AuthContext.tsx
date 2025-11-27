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
          // No access token in memory - try to refresh from httpOnly cookie
          // This handles the case when the app hot reloads and loses in-memory token
          try {
            const newAccessToken = await authService.refreshToken();
            // Only try to get profile if refresh was successful
            if (newAccessToken) {
              const profile = await authService.getProfile();
              setUser(profile);
            } else {
              setUser(null);
              setAccessToken(null);
            }
          } catch (refreshError) {
            // No valid refresh token - user is not authenticated
            // Don't redirect here, let ProtectedRoute handle it
            setUser(null);
            setAccessToken(null);
          }
        }
      } catch (error) {
        // Authentication failed
        setUser(null);
        setAccessToken(null);
      } finally {
        // Always set loading to false, even if there were errors
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
    setUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
