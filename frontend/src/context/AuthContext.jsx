import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const isUpdatingRef = useRef(false);

  const logout = useCallback(() => {
    console.log('[Auth] Cerrando sesión...');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('lastUserUpdate');
    // Limpiar estado del popup para que se vuelva a mostrar al iniciar sesión
    sessionStorage.removeItem('sav_popup_seen');
    sessionStorage.removeItem('cv_global_popup_seen');
    setUser(null);
  }, []);

  const getDeviceId = useCallback(() => {
    let id = localStorage.getItem('deviceId');
    if (!id) {
      id = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      localStorage.setItem('deviceId', id);
    }
    return id;
  }, []);

  const loadUser = useCallback(async (force = false) => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }

    const lastUpdate = localStorage.getItem('lastUserUpdate');
    const now = Date.now();
    
    // Evitar recargas si la última fue hace menos de 10 segundos para /me, a menos que sea forzado
    if (!force && lastUpdate && now - parseInt(lastUpdate) < 10000) {
      return;
    }

    if (isUpdatingRef.current && !force) return;
    isUpdatingRef.current = true;

    try {
      const data = await api.get('/users/me');
      if (data && data.id) {
        setUser(data);
        localStorage.setItem('user', JSON.stringify(data));
        localStorage.setItem('lastUserUpdate', Date.now().toString());
      }
    } catch (err) {
      if (err.name === 'AbortError' || err.message?.includes('aborted')) {
        return;
      }
      console.error('[AuthContext] Error loading user:', err.message);
      if (err.status === 401) logout();
    } finally {
      isUpdatingRef.current = false;
      setLoading(false);
    }
  }, [logout]);

  useEffect(() => {
    // Carga inicial al montar el componente
    const init = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        await loadUser();
      } else {
        setLoading(false);
      }
    };
    init();
    
    // Polling ligero: cada 30 segundos para sincronizar saldo/estado
    const pollInterval = setInterval(async () => {
      if (localStorage.getItem('token') && document.visibilityState === 'visible') {
        await loadUser(true);
      }
    }, 30000);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && localStorage.getItem('token')) {
        loadUser(true);
      }
    };

    window.addEventListener('visibilitychange', handleVisibility);
    return () => {
      clearInterval(pollInterval);
      window.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [loadUser]);

  const login = useCallback(async (telefono, password) => {
    const deviceId = getDeviceId();
    const { user: u, token } = await api.auth.login(telefono, password, deviceId);
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(u));
    setUser(u);
    return u;
  }, [getDeviceId]);

  const register = useCallback(async (data) => {
    const deviceId = getDeviceId();
    const { user: u, token } = await api.auth.register({ ...data, deviceId });
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(u));
    setUser(u);
    return u;
  }, [getDeviceId]);

  const refreshUser = useCallback(() => loadUser(true), [loadUser]);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

/* eslint-disable-next-line react-refresh/only-export-components */
export const useAuth = () => useContext(AuthContext);
