import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from './Button';
import { Card } from './Card';

import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';

export function ConfirmModal({ isOpen, title, message, onConfirm, onCancel, confirmText = 'Confirmar', cancelText = 'Cancelar', variant = 'danger' }) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/90 backdrop-blur-md"
            onClick={onCancel}
          />
          
          <motion.div 
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="relative z-10 max-w-md w-full bg-bcb-card border border-white/10 rounded-m3-lg p-8 shadow-m3-3 overflow-hidden"
          >
            <div className={`absolute top-0 left-0 w-full h-1 ${variant === 'danger' ? 'bg-gradient-to-r from-red-500 to-rose-600 shadow-[0_0_15px_rgba(239,68,68,0.3)]' : 'bg-gradient-to-r from-amber-400 to-amber-600 shadow-[0_0_15px_rgba(245,158,11,0.3)]'}`} />
            
            <button 
              onClick={onCancel}
              className="absolute top-6 right-6 p-2 rounded-lg hover:bg-white/5 text-zinc-500 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>

            <div className="flex flex-col items-center text-center gap-6">
              <div className={`
                w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 border
                ${variant === 'danger' ? 'bg-red-500/10 border-red-500/20 text-red-500 shadow-lg shadow-red-500/5' : 'bg-amber-500/10 border-amber-500/20 text-amber-500 shadow-lg shadow-amber-500/5'}
              `}>
                <AlertTriangle size={28} />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-white tracking-tight">{title}</h3>
                <p className="text-sm font-medium text-zinc-400 leading-relaxed px-4">{message}</p>
              </div>
            </div>
            
            <div className="flex gap-4 pt-8">
              <button 
                onClick={onCancel} 
                className="flex-1 h-12 rounded-m3 bg-white/5 border border-white/5 text-zinc-400 text-[12px] font-bold uppercase tracking-wider hover:bg-white/10 hover:text-white transition-all"
              >
                {cancelText}
              </button>
              <button 
                onClick={onConfirm} 
                className={`flex-1 h-12 rounded-m3 text-white text-[12px] font-bold uppercase tracking-wider transition-all shadow-xl active:scale-95 ${
                  variant === 'danger' 
                    ? 'bg-gradient-to-r from-red-600 to-rose-700 hover:brightness-110 shadow-red-600/20' 
                    : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:brightness-110 shadow-amber-500/20'
                }`}
              >
                {confirmText}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

