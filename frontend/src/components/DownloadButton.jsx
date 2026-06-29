import React, { useState, useEffect } from 'react';
import { Smartphone, DownloadCloud, AlertCircle, Apple, X, MoreVertical, Share, PlusSquare, Globe, ExternalLink } from 'lucide-react';
import { CONFIG } from '../config.js';

const DownloadButton = ({ variant = 'default' }) => {
  const [showIosModal, setShowIosModal] = useState(false);
  const [device, setDevice] = useState(() => {
    if (typeof window === 'undefined') return 'unknown';
    const ua = navigator.userAgent || navigator.vendor || window.opera;
    const isAndroid = /android/i.test(ua);
    const isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
    if (isAndroid) return 'android';
    if (isIOS) return 'ios';
    return 'desktop';
  });
  const [isInstalled, setIsInstalled] = useState(() => {
    if (typeof window === 'undefined') return false;
    const isStandalone = window.navigator?.standalone || window.matchMedia?.('(display-mode: standalone)').matches;
    const isNative = window.Capacitor?.isNativePlatform?.() || false;
    return isStandalone || isNative;
  });

  useEffect(() => {
    // Re-verificar por si Capacitor se carga después
    const checkCapacitor = () => {
      const isNative = window.Capacitor?.isNativePlatform?.() || false;
      if (isNative) setIsInstalled(true);
    };
    checkCapacitor();
  }, []);

  // Si la aplicación ya está instalada o es nativa, no mostramos los botones de descarga
  if (isInstalled) return null;

  const handleAndroidDownload = () => {
    // Descarga directa del APK desde la carpeta local
    const link = document.createElement('a');
    link.href = CONFIG.APK_DOWNLOAD_URL;
    link.download = 'app-bcb-global.apk';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleIosAction = () => {
    setShowIosModal(true);
  };

  const handleWebAction = () => {
    window.location.href = CONFIG.WEB_URL;
  };

  // Renderizado para el Header (Botón compacto)
  if (variant === 'header') {
    return (
      <>
        <div className="flex items-center gap-1.5">
          {/* Botón para Android/Desktop */}
          {device !== 'ios' ? (
            <a
              href={CONFIG.APK_DOWNLOAD_URL}
              download="app-bcb-global.apk"
              title={device === 'android' ? "📲 Descargar App Android" : "Descargar APK Android"}
              className="w-9 h-9 flex items-center justify-center bg-bcb-primary hover:bg-bcb-accent text-white rounded-xl transition-all active:scale-90 shadow-lg shadow-bcb-primary/20 group"
            >
              <DownloadCloud size={18} className="group-hover:animate-bounce" />
            </a>
          ) : (
            <button
              onClick={handleIosAction}
              title="Información para iPhone"
              className="w-9 h-9 flex items-center justify-center bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/20 transition-all active:scale-90 shadow-lg group"
            >
              <Apple size={18} />
            </button>
          )}
        </div>
        {showIosModal && <IosInstructions onClose={() => setShowIosModal(false)} />}
      </>
    );
  }

  // Renderizado Inteligente para el Dashboard (Parte Superior)
  if (variant === 'intelligent') {
    return (
      <div className="w-full px-4 pt-4 pb-2">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-4 shadow-2xl overflow-hidden relative group">
          {/* Fondo decorativo sutil */}
          <div className="absolute -right-10 -top-10 w-32 h-32 bg-bcb-primary/10 blur-3xl rounded-full group-hover:bg-bcb-primary/20 transition-all duration-700" />
          
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-tr from-bcb-dark to-bcb-surface rounded-2xl flex items-center justify-center shadow-lg border border-white/10">
                {device === 'ios' ? (
                  <Apple className="text-white" size={24} />
                ) : (
                  <DownloadCloud className="text-bcb-primary" size={24} />
                )}
              </div>
              <div className="text-center md:text-left">
                <h3 className="text-sm font-black text-black uppercase tracking-wider">
                  {device === 'ios' ? 'BCB Global en iPhone' : 'BCB Global en Android'}
                </h3>
                <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mt-0.5">
                  {device === 'ios' ? 'Disponible para Android' : 'Descarga la aplicación nativa'}
                </p>
              </div>
            </div>
            
            {device === 'ios' ? (
              <button
                onClick={handleIosAction}
                className="w-full md:w-auto px-8 py-3 bg-bcb-primary hover:bg-bcb-accent text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all shadow-lg shadow-bcb-primary/20 active:scale-95"
              >
                Información iPhone
              </button>
            ) : (
              <a
                href={CONFIG.APK_DOWNLOAD_URL}
                download="app-bcb-global.apk"
                className="w-full md:w-auto px-8 py-3 bg-bcb-primary hover:bg-bcb-accent text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all shadow-lg shadow-bcb-primary/20 active:scale-95 text-center"
              >
                {device === 'android' ? '📲 Descargar App Android' : 'Descargar APK Android'}
              </a>
            )}
          </div>
        </div>
        {showIosModal && <IosInstructions onClose={() => setShowIosModal(false)} />}
      </div>
    );
  }

  // Mantener compatibilidad con otras variantes si existen
  return (
    <div className="w-full flex flex-col items-center justify-center py-6 px-4">
      {/* Botón Simple (Inteligente por defecto) */}
      <div className="relative group w-full max-w-[280px]">
        <div className="absolute -inset-1 bg-gradient-to-r from-bcb-primary/20 to-bcb-accent/20 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
        {device === 'ios' ? (
        <button
          onClick={handleIosAction}
          className="relative w-full flex items-center justify-between px-6 py-4 rounded-2xl shadow-2xl transition-all duration-300 active:scale-95 border border-white/10 group bg-bcb-card text-white"
        >
          <div className="flex items-center gap-4">
            <div className="bg-bcb-surface p-2 rounded-xl shadow-lg transition-transform duration-500 group-hover:rotate-12 border border-white/5">
              <Apple size={24} className="text-white" strokeWidth={2.5} />
            </div>
            <div className="text-left">
              <p className="text-[10px] font-black text-bcb-muted uppercase tracking-widest leading-none mb-1">
                iPhone App
              </p>
              <p className="text-sm font-black text-white uppercase tracking-tight leading-none">
                Descargar App Google
              </p>
            </div>
          </div>
          <ExternalLink size={18} className="text-white/20 group-hover:text-bcb-primary transition-colors" />
        </button>
      ) : (
        <a
          href={CONFIG.APK_DOWNLOAD_URL}
          download="app-bcb-global.apk"
          className="relative w-full flex items-center justify-between px-6 py-4 rounded-2xl shadow-2xl transition-all duration-300 active:scale-95 border border-white/10 group bg-bcb-card text-white"
        >
          <div className="flex items-center gap-4">
            <div className="bg-bcb-surface p-2 rounded-xl shadow-lg transition-transform duration-500 group-hover:rotate-12 border border-white/5">
              <DownloadCloud size={24} className="text-bcb-primary" strokeWidth={2.5} />
            </div>
            <div className="text-left">
              <p className="text-[10px] font-black text-bcb-muted uppercase tracking-widest leading-none mb-1">
                Android App
              </p>
              <p className="text-sm font-black text-white uppercase tracking-tight leading-none">
                {device === 'android' ? '📲 Descargar App Android' : 'Descargar APK Android'}
              </p>
            </div>
          </div>
          <Smartphone size={18} className="text-white/20 group-hover:text-bcb-primary transition-colors" />
        </a>
      )}
      </div>
      {showIosModal && <IosInstructions onClose={() => setShowIosModal(false)} />}
    </div>
  );
};

const IosInstructions = ({ onClose }) => (
  <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-bcb-dark/95 backdrop-blur-md animate-fade-in">
    <div className="w-full max-w-sm bg-bcb-card rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/10 relative">
      <button 
        onClick={onClose}
        className="absolute top-6 right-6 p-2 rounded-full bg-white/5 text-bcb-muted hover:bg-white/10 transition-colors"
      >
        <X size={20} />
      </button>

      <div className="p-8 pt-12 text-center">
        <div className="w-20 h-20 bg-bcb-surface rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-2xl border-2 border-white/5">
          <Apple size={40} className="text-white" strokeWidth={2.5} />
        </div>

        <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-2">Versión para iPhone</h3>
        <p className="text-[10px] font-bold text-bcb-muted uppercase tracking-widest mb-8">
          Esta aplicación está disponible para Android. En iPhone puedes usar la versión web desde el navegador.
        </p>

        <div className="space-y-4 text-left">
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 group">
            <div className="w-10 h-10 rounded-xl bg-bcb-primary text-white flex items-center justify-center font-black shrink-0 shadow-lg">1</div>
            <div className="flex-1">
              <p className="text-[11px] font-black text-white uppercase tracking-tight leading-none mb-1">Abre en Safari</p>
              <p className="text-[10px] font-medium text-bcb-muted">Usa Safari para la mejor experiencia.</p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5">
            <div className="w-10 h-10 rounded-xl bg-bcb-primary text-white flex items-center justify-center font-black shrink-0 shadow-lg">2</div>
            <div className="flex-1">
              <p className="text-[11px] font-black text-white uppercase tracking-tight leading-none mb-1">Toca Compartir</p>
              <p className="text-[10px] font-medium text-bcb-muted flex items-center gap-1.5">
                Busca el icono de compartir <Share size={12} className="text-bcb-primary" /> en la barra inferior.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-4 rounded-2xl bg-bcb-primary/10 border border-bcb-primary/20 border-dashed">
            <div className="w-10 h-10 rounded-xl bg-bcb-primary text-white flex items-center justify-center font-black shrink-0 shadow-lg animate-pulse">3</div>
            <div className="flex-1">
              <p className="text-[11px] font-black text-white uppercase tracking-tight leading-none mb-1">Agregar a inicio</p>
              <p className="text-[10px] font-bold text-bcb-primary/70 flex items-center gap-1.5">
                Selecciona "Agregar a pantalla de inicio" <PlusSquare size={12} />
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-8 py-4 rounded-2xl bg-[#1a1f36] text-white font-black uppercase tracking-[0.2em] text-[10px] shadow-xl active:scale-95 transition-all hover:bg-[#242a45]"
        >
          ¡Entendido, vamos!
        </button>
      </div>
    </div>
  </div>
);

export default DownloadButton;

