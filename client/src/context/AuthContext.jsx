import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api from '../services/api.js';
import { connectSocket, disconnectSocket } from '../services/socket.js';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [socket, setSocket] = useState(null);
  const [loading, setLoading] = useState(Boolean(localStorage.getItem('vp_token')));

  const logout = useCallback(() => {
    localStorage.removeItem('vp_token');
    disconnectSocket();
    setSocket(null);
    setUser(null);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('vp_token');
    if (!token) return;
    api.get('/auth/me')
      .then((r) => { setUser(r.data.user); setSocket(connectSocket(token)); })
      .catch(() => logout())
      .finally(() => setLoading(false));
  }, [logout]);

  useEffect(() => {
    window.addEventListener('vp:logout', logout);
    return () => window.removeEventListener('vp:logout', logout);
  }, [logout]);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('vp_token', data.token);
    setUser(data.user);
    setSocket(connectSocket(data.token));
  }, []);

  const value = useMemo(() => ({ user, socket, loading, login, logout, isAdmin: user?.role === 'ADMIN' }), [user, socket, loading, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
