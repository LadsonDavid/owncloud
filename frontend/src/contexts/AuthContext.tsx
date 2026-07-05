import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { authAPI } from '../services/api';
import { User, LoginCredentials, RegisterCredentials, AuthContextType } from '../types';
import jwtDecode from 'jwt-decode';

// Create the Auth Context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Custom hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Define the props for AuthProvider
interface AuthProviderProps {
  children: ReactNode;
}

// JWT token interface
interface JwtPayload {
  sub: string;
  id: string;
  email: string;
  exp: number;
}

// Auth Provider Component
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  // Check if token exists and is valid on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const decoded = jwtDecode<JwtPayload>(token);
        
        // Check if token is expired
        if (decoded.exp * 1000 < Date.now()) {
          localStorage.removeItem('token');
          setIsAuthenticated(false);
          setUser(null);
        } else {
          setIsAuthenticated(true);
          // You can fetch user data here if needed
          // For now, we'll just use the token data
          setUser({
            id: decoded.id,
            username: decoded.sub,
            email: decoded.email || '',
            is_active: true,
            created_at: new Date().toISOString()
          });
        }
      } catch (err) {
        localStorage.removeItem('token');
        setIsAuthenticated(false);
        setUser(null);
      }
    }
    setLoading(false);
  }, []);

  const login = async (credentials: LoginCredentials) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await authAPI.login(credentials);
      localStorage.setItem('token', response.access_token);
      
      const decoded = jwtDecode<JwtPayload>(response.access_token);
      
      setUser({
        id: decoded.id,
        username: decoded.sub,
        email: '', // We don't have this in the token
        is_active: true,
        created_at: new Date().toISOString()
      });
      
      setIsAuthenticated(true);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to login');
    } finally {
      setLoading(false);
    }
  };

  const register = async (credentials: RegisterCredentials) => {
    try {
      setLoading(true);
      setError(null);
      
      await authAPI.register(credentials);
      
      // Auto login after successful registration
      await login({
        username: credentials.username,
        password: credentials.password
      });
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to register');
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setIsAuthenticated(false);
  };

  const clearError = () => {
    setError(null);
  };

  const value = {
    user,
    isAuthenticated,
    login,
    register,
    logout,
    error,
    clearError,
    loading
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext; 