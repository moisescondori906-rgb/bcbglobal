import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, Sparkles } from 'lucide-react';
import { api } from '../../lib/api';

export default function BannerCarousel({ banners = [] }) {
  const [slide, setSlide] = useState(0);

  // Fallback banners si no hay datos del API
  const fallbackBanners = [
    { id: 'f1', titulo: 'Bienvenido a BCB Global', imagen_url: '/imag/carrusel1.png' },
    { id: 'f2', titulo: 'Gana comisiones diarias', imagen_url: '/imag/carrusel1.png' }
  ];

  // Asegurar que banners sea un array válido y tenga contenido
  const validBanners = Array.isArray(banners) && banners.length > 0 ? banners : fallbackBanners;

  useEffect(() => {
    if (validBanners.length <= 1) return;
    const t = setInterval(() => setSlide((s) => (s + 1) % validBanners.length), 5000);
    return () => clearInterval(t);
  }, [validBanners.length]);

  const next = () => setSlide((s) => (s + 1) % validBanners.length);
  const prev = () => setSlide((s) => (s - 1 + validBanners.length) % validBanners.length);

  if (validBanners.length === 0) return (
    <div className="h-48 w-full rounded-3xl bg-sav-dark/50 border border-white/5 flex flex-col items-center justify-center gap-3 animate-pulse">
      <div className="w-12 h-12 rounded-2xl bg-sav-primary/10 flex items-center justify-center text-sav-primary/30">
        <Sparkles size={24} />
      </div>
      <p className="text-[10px] font-black text-sav-muted uppercase tracking-[0.2em]">Cargando promociones...</p>
    </div>
  );

  return (
    <div className="relative h-60 w-full rounded-[2.5rem] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10 group">
      <AnimatePresence mode='wait'>
        <motion.div
          key={slide}
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
          className="absolute inset-0"
        >
          <img
            src={api.getMediaUrl(validBanners[slide]?.imagen_url)}
            alt={validBanners[slide]?.titulo || 'Promoción'}
            className="w-full h-full object-cover"
            onError={(e) => { 
              if (e.target.src !== '/imag/carrusel1.png') {
                e.target.src = '/imag/carrusel1.png'; 
              }
            }}
          />
          {/* Overlay gradiente más sofisticado y oscuro para legibilidad */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-900/40 via-transparent to-transparent" />
          
          <div className="absolute bottom-8 left-8 right-8">
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="space-y-2"
            >
              {validBanners[slide]?.titulo && (
                <h3 className="text-xl font-black text-white uppercase tracking-tighter drop-shadow-2xl leading-tight max-w-[80%]">
                  {validBanners[slide].titulo}
                </h3>
              )}
              <div className="flex items-center gap-2">
                <div className="h-1 w-8 bg-sav-primary rounded-full" />
                <span className="text-[10px] font-black text-sav-primary uppercase tracking-[0.3em]">Exclusivo</span>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Controls - Mejorados visualmente */}
      <div className="absolute inset-y-0 left-4 right-4 flex items-center justify-between pointer-events-none">
        <button 
          onClick={prev}
          className="p-3 rounded-2xl bg-sav-dark/40 backdrop-blur-xl border border-white/10 text-white opacity-0 group-hover:opacity-100 transition-all pointer-events-auto active:scale-90 hover:bg-sav-primary/20 hover:border-sav-primary/30"
        >
          <ChevronLeft size={20} />
        </button>
        <button 
          onClick={next}
          className="p-3 rounded-2xl bg-sav-dark/40 backdrop-blur-xl border border-white/10 text-white opacity-0 group-hover:opacity-100 transition-all pointer-events-auto active:scale-90 hover:bg-sav-primary/20 hover:border-sav-primary/30"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Indicators - Estilo más moderno */}
      <div className="absolute top-6 right-8 flex gap-2 bg-sav-dark/30 backdrop-blur-md p-2 rounded-full border border-white/5">
        {validBanners.map((_, i) => (
          <div 
            key={i} 
            className={`h-1.5 rounded-full transition-all duration-500 ${i === slide ? 'w-6 bg-sav-primary' : 'w-1.5 bg-white/20'}`}
          />
        ))}
      </div>
    </div>
  );
}
