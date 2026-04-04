import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

// Sets all required axios headers for the authenticated user
function setAxiosHeaders(userData) {
  axios.defaults.headers.common['Authorization'] = `Bearer ${userData.token}`;
  // These headers let the backend reconstruct the user when the in-memory
  // store has been wiped (e.g. after a server restart)
  axios.defaults.headers.common['X-User-Name']  = userData.name  || '';
  axios.defaults.headers.common['X-User-Email'] = userData.email || '';
  axios.defaults.headers.common['X-User-Role']  = userData.role  || 'user';
}

function clearAxiosHeaders() {
  delete axios.defaults.headers.common['Authorization'];
  delete axios.defaults.headers.common['X-User-Name'];
  delete axios.defaults.headers.common['X-User-Email'];
  delete axios.defaults.headers.common['X-User-Role'];
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('sakhi_user');
    if (stored) {
      const parsed = JSON.parse(stored);
      setUser(parsed);
      setAxiosHeaders(parsed);
    }
    setLoading(false);
  }, []);

  const login = (userData) => {
    setUser(userData);
    localStorage.setItem('sakhi_user', JSON.stringify(userData));
    setAxiosHeaders(userData);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('sakhi_user');
    clearAxiosHeaders();
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
