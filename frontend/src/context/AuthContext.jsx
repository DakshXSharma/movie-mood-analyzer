import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('mma_auth_token'));
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ watched_count: 0, watchlist_count: 0, top_mood: null });

  // Custom fetch with auth header
  const authFetch = useCallback(async (url, options = {}) => {
    const headers = {
      ...(options.headers || {}),
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const res = await fetch(url, { ...options, headers });
    return res;
  }, [token]);

  // Refresh user stats (watched count, watchlist count, top mood)
  const refreshStats = useCallback(async () => {
    try {
      const res = await authFetch('/api/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  }, [authFetch]);

  // Check current user profile with token on mount
  useEffect(() => {
    const verifyUser = async () => {
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }
      try {
        const res = await fetch('/api/auth/me', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
          refreshStats();
        } else {
          // Token expired or invalid
          localStorage.removeItem('mma_auth_token');
          setToken(null);
          setUser(null);
        }
      } catch (err) {
        console.error('Auth verification error:', err);
      } finally {
        setLoading(false);
      }
    };
    verifyUser();
  }, [token, refreshStats]);

  const login = async (email, password) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to login');
    }
    localStorage.setItem('mma_auth_token', data.token);
    setToken(data.token);
    setUser(data.user);
    refreshStats();
    return data.user;
  };

  const signup = async (name, email, password) => {
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to create account');
    }
    localStorage.setItem('mma_auth_token', data.token);
    setToken(data.token);
    setUser(data.user);
    refreshStats();
    return data.user;
  };

  const logout = async () => {
    try {
      if (token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      }
    } catch (e) {
      console.error('Logout error:', e);
    } finally {
      localStorage.removeItem('mma_auth_token');
      setToken(null);
      setUser(null);
      setStats({ watched_count: 0, watchlist_count: 0, top_mood: null });
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      stats,
      refreshStats,
      login,
      signup,
      logout,
      authFetch
    }}>
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
