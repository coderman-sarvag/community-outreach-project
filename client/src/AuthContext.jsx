import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { api, getToken, setToken } from './api.js';
import { clearPopupsOff } from './popupCookie.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (!getToken()) return setLoading(false);
    api('/auth/me')
      .then((d) => setUser(d.user))
      .catch(() => setToken(null))
      .finally(() => setLoading(false));
  }, []);

  // One live connection per logged-in user
  useEffect(() => {
    if (!user) return;
    const s = io({ auth: { token: getToken() } });
    setSocket(s);
    return () => {
      s.disconnect();
      setSocket(null);
    };
  }, [user?._id]);

  const login = async (email, password) => {
    const d = await api('/auth/login', { method: 'POST', body: { email, password } });
    setToken(d.token);
    clearPopupsOff();
    setUser(d.user);
    return d.user;
  };

  const logout = () => {
    setToken(null);
    clearPopupsOff();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, socket, login, logout }}>{children}</AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
