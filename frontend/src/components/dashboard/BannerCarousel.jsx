import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, Sparkles } from 'lucide-react';
import { api } from '../../lib/api';

export default function BannerCarousel({ banners = [] }) {
  const [slide, setSlide] = useState(0);

  // Fallback banners con las nuevas imágenes .webp
  const fallbackBanners = [
    { id: 'f1', titulo: 'Bienvenido a BCB Global', imagen_url: '/imag/carrusel1.webp' },
    { id: 'f2', titulo: 'Gana comisiones diarias', imagen_url: '/imag/carrusel2.webp' },
    { id: 'f3', titulo: 'Invierte y Crece', imagen_url: '/imag/carrusel3.webp' },
    { id: 'f4', titulo: 'Seguridad Institucional', imagen_url: '/imag/carrusel4.webp' }
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

  // Preload the first image for faster loading
  useEffect(() => {
    if (validBanners.length > 0) {
      const firstImageUrl = api.getMediaUrl(validBanners[0]?.imagen_url);
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = firstImageUrl;
      document.head.appendChild(link);
      return () => document.head.removeChild(link);
    }
  }, [validBanners]);

  if (validBanners.length === 0) return (
    <div className="h-48 w-full rounded-3xl bg-bcb-dark/50 border border-white/5 flex flex-col items-center justify-center gap-3 animate-pulse">
      <div className="w-12 h-12 rounded-2xl bg-bcb-primary/10 flex items-center justify-center text-bcb-primary/30">
        <Sparkles size={24} />
      </div>
      <p className="text-[10px] font-black text-bcb-muted uppercase tracking-[0.2em]">Cargando promociones...</p>
    </div>
  );

  return (
    <div className="relative w-full aspect-[2/1] sm:aspect-video min-h-[180px] rounded-[2.5rem] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10 group bg-black">
      <AnimatePresence mode='wait'>
        <motion.div
          key={slide}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.5, ease: "easeInOut" }}
          className="absolute inset-0"
        >
          <img
            src={api.getMediaUrl(validBanners[slide]?.imagen_url)}
            alt={validBanners[slide]?.titulo || 'Promoción'}
            className="w-full h-full object-contain"
            loading={slide === 0 ? 'eager' : 'lazy'}
            fetchPriority={slide === 0 ? 'high' : 'low'}
            decoding="async"
            onError={(e) => { 
              if (e.target.src !== '/imag/carrusel1.webp') {
                e.target.src = '/imag/carrusel1.webp'; 
              }
            }}
          />
          
          <div className="absolute bottom-8 left-8 right-8 z-20">
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
                <div className="h-1 w-8 bg-bcb-primary rounded-full" />
                <span className="text-[10px] font-black text-bcb-primary uppercase tracking-[0.3em]">Exclusivo</span>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Controls - Mejorados visualmente */}
      <div className="absolute inset-y-0 left-4 right-4 flex items-center justify-between pointer-events-none">
        <button 
          onClick={prev}
          className="p-3 rounded-2xl bg-bcb-dark/40 backdrop-blur-xl border border-white/10 text-white opacity-0 group-hover:opacity-100 transition-all pointer-events-auto active:scale-90 hover:bg-bcb-primary/20 hover:border-bcb-primary/30"
        >
          <ChevronLeft size={20} />
        </button>
        <button 
          onClick={next}
          className="p-3 rounded-2xl bg-bcb-dark/40 backdrop-blur-xl border border-white/10 text-white opacity-0 group-hover:opacity-100 transition-all pointer-events-auto active:scale-90 hover:bg-bcb-primary/20 hover:border-bcb-primary/30"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Indicators - Estilo más moderno */}
      <div className="absolute top-6 right-8 flex gap-2 bg-bcb-dark/30 backdrop-blur-md p-2 rounded-full border border-white/5">
        {validBanners.map((_, i) => (
          <div 
            key={i} 
            className={`h-1.5 rounded-full transition-all duration-500 ${i === slide ? 'w-6 bg-bcb-primary' : 'w-1.5 bg-white/20'}`}
          />
        ))}
      </div>
    </div>
  );
}

