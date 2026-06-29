import { useState, useEffect } from 'react';

export default function GlobalLoader() {
  const [showError, setShowError] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowError(true);
    }, 15000); // 15 segundos de timeout
    return () => clearTimeout(timer);
  }, []);

  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white space-y-10 p-8 text-center relative overflow-hidden">
      {/* Ambient Soft Glow Background (Matching Reference) */}
      <div className="absolute top-[30%] left-[20%] w-[100%] h-[100%] bg-rose-100/30 rounded-full blur-[100px] animate-pulse" />
      <div className="absolute top-[10%] right-[10%] w-[60%] h-[60%] bg-blue-100/20 rounded-full blur-[80px]" />
      
      <div className="relative z-10 flex flex-col items-center">
        {/* Spinner Minimalista (Matching Reference) */}
        <div className="relative mb-12">
          <div className="w-20 h-20 border-[1px] border-slate-200 border-t-slate-400 rounded-full animate-spin"></div>
        </div>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-slate-900 font-black uppercase tracking-[0.3em] text-[12px] opacity-80">Sincronizando Sistema</p>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em]">BCB Global Tech 2026</p>
          </div>
          
          {showError && (
            <div className="animate-in fade-in slide-in-from-top-2 space-y-4 max-w-xs mx-auto pt-8">
              <p className="text-red-500 text-[11px] font-black uppercase tracking-widest leading-relaxed">
                Revisa tu conexión a internet
              </p>
              <button 
                onClick={handleRetry}
                className="px-10 py-4 rounded-2xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl active:scale-95 transition-all"
              >
                REINTENTAR
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
