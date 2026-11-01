import { useCallback, useEffect, useState } from 'react';
import { api } from './api.js';
import { useAuth } from './AuthContext.jsx';

// Loads the complaints this user may see and keeps them live through the socket
export function useComplaints() {
  const { socket } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setItems(await api('/complaints'));
      setError('');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const upsert = useCallback((c) => {
    setItems((prev) => {
      const i = prev.findIndex((p) => p._id === c._id);
      if (i === -1) return [c, ...prev];
      const next = [...prev];
      next[i] = c;
      return next;
    });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!socket) return;
    socket.on('complaint:new', upsert);
    socket.on('complaint:updated', upsert);
    socket.io.on('reconnect', load); // catch anything missed while offline
    return () => {
      socket.off('complaint:new', upsert);
      socket.off('complaint:updated', upsert);
      socket.io.off('reconnect', load);
    };
  }, [socket, upsert, load]);

  return { items, loading, error, reload: load, upsert };
}
