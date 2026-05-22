import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Restore session from localStorage on page refresh
    const stored = localStorage.getItem('ai_fin_user');
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        localStorage.removeItem('ai_fin_user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const res = await axios.post('http://localhost:8000/api/login', { email, password });
    const userData = res.data.user;
    setUser(userData);
    localStorage.setItem('ai_fin_user', JSON.stringify(userData));
    return res.data;
  };

  const signup = async (username, email, password) => {
    const res = await axios.post('http://localhost:8000/api/signup', { username, email, password });
    return res.data;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('ai_fin_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
