import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [apiVersion, setApiVersion] = useState(localStorage.getItem('apiVersion') || '1.0.0');
  const isUpdatingRef = useRef(false);

  const checkVersion = useCallback(async () => {
    if (isUpdatingRef.current) return;
    try {
      const health = await api.get('/health');
      const currentVersion = localStorage.getItem('apiVersion') || '1.0.0';
      
      if (health && health.version && health.version !== currentVersion) {
        console.log(`[VERSION] New version detected: ${health.version} (current: ${currentVersion}). Reloading...`);
        localStorage.setItem('apiVersion', health.version);
        setApiVersion(health.version);
        
        // Evitar múltiples recargas simultáneas
        if (!sessionStorage.getItem('reloading-for-version')) {
          sessionStorage.setItem('reloading-for-version', 'true');
          setTimeout(() => {
            sessionStorage.removeItem('reloading-for-version');
            window.location.reload();
          }, 1000);
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.warn('[VersionCheck] Error checking backend version:', err.message);
      }
    }
  }, []); // apiVersion eliminado de dependencias para evitar bucles si cambia el estado

  const logout = useCallback(() => {
    console.log('[Auth] Cerrando sesión...');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('lastUserUpdate');
    localStorage.removeItem('apiVersion');
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
    
    // Evitar recargas si la última fue hace menos de 5 segundos para /me, a menos que sea forzado
    if (!force && lastUpdate && now - parseInt(lastUpdate) < 5000) {
      return;
    }

    if (isUpdatingRef.current && !force) return;
    isUpdatingRef.current = true;

    try {
      // 1. Cargar usuario
      const data = await api.get('/users/me');
      if (data && data.id) {
        setUser(data);
        localStorage.setItem('user', JSON.stringify(data));
        localStorage.setItem('lastUserUpdate', Date.now().toString());
      }
      
      // 2. Verificar versión en segundo plano cada 5 cargas de usuario
      if (Math.random() < 0.2) {
        checkVersion();
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
  }, [logout, checkVersion]);

  useEffect(() => {
    // Carga inicial al montar el componente
    const init = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        await loadUser(true);
        await checkVersion();
      } else {
        setLoading(false);
      }
    };
    init();
    
    // Polling adaptativo: cada 15 segundos para sincronizar saldo/estado
    const pollInterval = setInterval(async () => {
      if (localStorage.getItem('token') && document.visibilityState === 'visible') {
        await loadUser(true);
      }
    }, 15000);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && localStorage.getItem('token')) {
        loadUser(true);
        checkVersion();
      }
    };

    window.addEventListener('visibilitychange', handleVisibility);
    return () => {
      clearInterval(pollInterval);
      window.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [loadUser, checkVersion]);

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
