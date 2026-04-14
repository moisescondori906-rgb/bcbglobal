import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

export function useAndroidBackHandler(isModalOpen, onModalClose) {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const rootPages = ['/', '/dashboard', '/login', '/register'];
    const isRoot = rootPages.includes(location.pathname);

    const handleBack = () => {
      // Si hay un modal o vista activa (como una tarea abierta), la cerramos primero
      if (isModalOpen && onModalClose) {
        onModalClose();
        return;
      }

      if (isRoot) return;

      // Usamos el historial real del navegador
      if (window.history.length > 1) {
        window.history.back();
      } else {
        navigate('/', { replace: true });
      }
    };

    // Escuchar el botón de atrás físico (Android/Capacitor)
    const backListener = Capacitor.isNativePlatform() 
      ? App.addListener('backButton', handleBack)
      : null;

    // También para navegadores convencionales (opcional pero recomendado)
    document.addEventListener('backbutton', handleBack, false);
    
    return () => {
      if (backListener) backListener.remove();
      document.removeEventListener('backbutton', handleBack);
    };
  }, [navigate, location.pathname, isModalOpen, onModalClose]);
}
