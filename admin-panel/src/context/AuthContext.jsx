import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('adminToken'));

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/portal')) {
      setLoading(false);
      return;
    }
    if (token) {
      verifyToken();
    } else {
      setLoading(false);
    }
  }, [token]);

  const verifyToken = async () => {
    try {
      const response = await api.get('/auth/verify');
      setUser(response.data.user);
    } catch (error) {
      console.error('Token verification failed:', error);
      localStorage.removeItem('adminToken');
      setToken(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/admin/login', { email, password });
      const { token, user } = response.data;
      
      localStorage.setItem('adminToken', token);
      setToken(token);
      setUser(user);
      
      return { success: true, user };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.error || 'Login failed' 
      };
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/admin/logout');
    } catch (error) {
      // still clear local session
    }
    localStorage.removeItem('adminToken');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
};