import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.request.use(
  (config) => {
    const onPortal = typeof window !== 'undefined' && window.location.pathname.startsWith('/portal');
    const token = localStorage.getItem(onPortal ? 'userToken' : 'adminToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || '';
    const isAuthCall =
      url.includes('/auth/admin/login') ||
      url.includes('/auth/user/login') ||
      url.includes('/auth/user/logout') ||
      url.includes('/auth/admin/logout') ||
      url.includes('/auth/verify');

    if (status === 401 && !isAuthCall) {
      const onPortal = window.location.pathname.startsWith('/portal');
      if (onPortal) {
        localStorage.removeItem('userToken');
        if (window.location.pathname !== '/portal/login') {
          window.location.href = '/portal/login';
        }
      } else {
        localStorage.removeItem('adminToken');
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
