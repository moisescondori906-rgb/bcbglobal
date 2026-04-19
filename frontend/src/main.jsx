import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ui/ErrorBoundary'

// --- MECANISMO DE LIMPIEZA NUCLEAR v7.0.5 ---
const APP_VERSION = '7.0.5';
const currentVersion = localStorage.getItem('global_app_version');

if (currentVersion !== APP_VERSION) {
  console.log(`[BCB-GLOBAL] Actualizando a v${APP_VERSION}. Limpiando estados antiguos...`);
  // Limpiar Service Workers y Caché de forma segura
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(regs => regs.forEach(r => r.unregister()));
  }
  if ('caches' in window) {
    caches.keys().then(names => names.forEach(n => caches.delete(n)));
  }
  localStorage.setItem('global_app_version', APP_VERSION);
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

// Capturar el evento de instalación globalmente para usarlo en cualquier momento
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  window.deferredPrompt = e;
});
