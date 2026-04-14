import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

/**
 * Hook para manejar el botón físico de Atrás en Android usando Capacitor.
 * Implementa la lógica de navegación paso a paso y salida controlada.
 */
export const useAndroidBackHandler = (activeTask, onCloseTask) => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Solo registrar el listener si estamos en una plataforma nativa (Android/iOS)
    if (!Capacitor.isNativePlatform()) return;

    const backButtonListener = App.addListener('backButton', ({ canGoBack }) => {
      const path = location.pathname;

      console.log(`[AndroidBack] Botón presionado en ruta: ${path}, canGoBack: ${canGoBack}`);

      // 1. Prioridad: Cerrar tarea activa si existe
      if (activeTask && onCloseTask) {
        console.log('[AndroidBack] Cerrando tarea activa...');
        onCloseTask();
        return;
      }

      // 2. Pantalla de Inicio (Inicio -> Salir de la App)
      // Si estamos en el Dashboard de usuario o admin, salimos.
      if (path === '/' || path === '/admin') {
        console.log('[AndroidBack] En Inicio. Saliendo de la aplicación...');
        App.exitApp();
        return;
      }

      // 3. Comportamiento por defecto: Intentar volver atrás en el historial
      // Si canGoBack es true (Capacitor detecta historial), usamos back()
      if (canGoBack) {
        console.log('[AndroidBack] Usando historial de navegación...');
        window.history.back();
      } else {
        // 4. Fallback inteligente: si no hay historial, volver al inicio en lugar de cerrar la app
        // Esto previene que entrar directo a una subruta y dar atrás cierre la app.
        console.log('[AndroidBack] Sin historial. Forzando navegación a Inicio.');
        // Verificamos si es admin para enviarlo a su inicio correcto
        const isAdmin = path.startsWith('/admin');
        navigate(isAdmin ? '/admin' : '/', { replace: true });
      }
    });

    return () => {
      console.log('[AndroidBack] Limpiando listener...');
      backButtonListener.then(l => l.remove());
    };
  }, [location.pathname, activeTask, onCloseTask, navigate]);
};
