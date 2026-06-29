import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Megaphone, ChevronRight as ChevronRightIcon, BellRing } from 'lucide-react';
import { cn } from '../../lib/utils/cn';
import { api } from '../../lib/api';

export default function FloatingAnnouncements({ announcements, onClose }) {
  const [visibleItems, setVisibleItems] = useState([]);

  useEffect(() => {
    if (announcements && announcements.length > 0) {
      const newItems = announcements.map(ann => ({
        ...ann,
        id: ann.id || Math.random().toString(36).substr(2, 9),
        startTime: Date.now()
      }));
      setVisibleItems(newItems);
    }
  }, [announcements]);

  const handleRemove = (id) => {
    setVisibleItems(prev => prev.filter(item => item.id !== id));
    if (onClose) onClose(id);
  };

  return (
    <div className="fixed bottom-24 md:bottom-8 md:right-8 z-[100000] flex flex-col-reverse gap-3 w-full max-w-[95vw] md:max-w-[380px] pointer-events-none left-1/2 -translate-x-1/2 md:left-auto md:translate-x-0 px-4 md:px-0">
      <AnimatePresence mode="popLayout">
        {visibleItems.map((item) => (
          <NotificationItem
            key={item.id}
            item={item}
            onRemove={() => handleRemove(item.id)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

function NotificationItem({ item, onRemove }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ 
        opacity: 1, 
        y: 0, 
        scale: 1,
        transition: {
          type: "spring",
          stiffness: 260,
          damping: 20
        }
      }}
      exit={{ opacity: 0, scale: 0.95, y: 20, transition: { duration: 0.2 } }}
      className={cn(
        "pointer-events-auto relative w-full",
        "bg-white rounded-[2.5rem] flex flex-col overflow-hidden",
        "shadow-[0_25px_60px_-15px_rgba(0,0,0,0.15)] border border-slate-100",
        "z-[100000] group"
      )}
    >
      {/* Botón Cerrar (Estilo Flotante sobre imagen) */}
      <button
        onClick={onRemove}
        className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-black/20 hover:bg-black/40 text-white backdrop-blur-md transition-all flex items-center justify-center active:scale-90"
      >
        <X size={20} strokeWidth={2.5} />
      </button>

      {/* Imagen de Ancho Completo */}
      <div className="relative w-full aspect-video overflow-hidden">
        {item.imagen_url ? (
          <img
            src={api.getMediaUrl(item.imagen_url)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            alt="Anuncio BCB"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-bcb-primary to-indigo-600 flex items-center justify-center text-white">
            <BellRing size={48} strokeWidth={1.5} className="animate-pulse" />
          </div>
        )}
      </div>

      <div className="p-8 space-y-4">
        {/* Título */}
        <div className="space-y-1">
          <h4 className="text-2xl font-black text-slate-900 leading-tight tracking-tighter uppercase italic">
            {item.titulo || 'BCB Global Institucional'}
          </h4>
        </div>
        
        {/* Mensaje */}
        <p className="text-sm font-bold text-slate-500 leading-relaxed">
          {item.mensaje}
        </p>

        {/* Botón de Acción Principal */}
        <button
          onClick={onRemove}
          className="w-full py-4 mt-2 rounded-2xl bg-bcb-primary text-white text-[11px] font-black uppercase tracking-[0.2em] shadow-xl shadow-bcb-primary/25 hover:brightness-110 active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-2 group/btn"
        >
          <span>Entendido</span>
          <ChevronRightIcon size={16} strokeWidth={3} className="group-hover/btn:translate-x-1 transition-transform" />
        </button>
      </div>
    </motion.div>
  );
}