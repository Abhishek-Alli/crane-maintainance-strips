import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize auth state from localStorage
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    const savedToken = localStorage.getItem('token');

    if (savedUser && savedToken) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
        setToken(savedToken);
      } catch (error) {
        console.error('Failed to parse saved user:', error);
        localStorage.removeItem('user');
        localStorage.removeItem('token');
      }
    }
    setLoading(false);
  }, []);

  const login = (userData, authToken) => {
    setUser(userData);
    setToken(authToken);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('token', authToken);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  };

  const isAuthenticated = () => {
    return !!user && !!token;
  };

  const isAdmin = () => {
    return user?.role === 'ADMIN' || user?.user_type === 'ADMIN';
  };

  const isOperator = () => {
    return user?.role === 'OPERATOR';
  };

  const isHBM = () => {
    const ut = user?.loginType || user?.user_type;
    return ut === 'HBM_CHECKSHEETS' || user?.user_type === 'ADMIN';
  };

  const isCraneMaintenance = () => {
    const ut = user?.loginType || user?.user_type;
    return ut === 'CRANE_MAINTENANCE' || user?.user_type === 'ADMIN';
  };

  const getUserType = () => {
    return user?.loginType || user?.user_type || 'CRANE_MAINTENANCE';
  };

  const getDepartmentId = () => {
    return user?.department_id;
  };

  const value = {
    user,
    token,
    loading,
    isAuthenticated,
    isAdmin,
    isOperator,
    isHBM,
    isCraneMaintenance,
    getUserType,
    getDepartmentId,
    login,
    logout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export default AuthContext;
