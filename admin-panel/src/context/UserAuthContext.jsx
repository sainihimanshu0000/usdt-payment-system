import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../services/api';

const UserAuthContext = createContext();

export const useUserAuth = () => useContext(UserAuthContext);

export const UserAuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('userToken'));

  useEffect(() => {
    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/portal')) {
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
      if (response.data.user?.role !== 'user') {
        throw new Error('Not a user session');
      }
      setUser(response.data.user);
    } catch (error) {
      localStorage.removeItem('userToken');
      setToken(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/user/login', { email, password });
      const { token: nextToken, user: nextUser } = response.data;
      localStorage.setItem('userToken', nextToken);
      setToken(nextToken);
      setUser(nextUser);
      return { success: true, user: nextUser };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Login failed'
      };
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/user/logout');
    } catch (error) {
      // still clear local session
    }
    localStorage.removeItem('userToken');
    setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    const response = await api.get('/users/me');
    setUser({ ...user, ...response.data, role: 'user' });
    return response.data;
  };

  return (
    <UserAuthContext.Provider value={{ user, token, loading, login, logout, refreshUser, isAuthenticated: !!token }}>
      {children}
    </UserAuthContext.Provider>
  );
};
