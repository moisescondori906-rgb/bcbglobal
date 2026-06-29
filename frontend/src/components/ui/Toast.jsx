import { useState, useEffect, useCallback } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { cn } from '../../lib/utils/cn';

const toastIcons = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const toastStyles = {
  success: 'bg-zinc-950/80 backdrop-blur-2xl text-emerald-400 border-emerald-500/20 shadow-[0_0_40px_rgba(16,185,129,0.15)]',
  error: 'bg-zinc-950/80 backdrop-blur-2xl text-rose-400 border-rose-500/20 shadow-[0_0_40px_rgba(244,63,94,0.15)]',
  warning: 'bg-zinc-950/80 backdrop-blur-2xl text-amber-400 border-amber-500/20 shadow-[0_0_40px_rgba(245,158,11,0.15)]',
  info: 'bg-zinc-950/80 backdrop-blur-2xl text-bcb-accent border-bcb-accent/20 shadow-[0_0_40px_rgba(59,130,246,0.15)]',
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type, duration }]);
    
    if (duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <>
      {children}
      <div className="fixed bottom-6 right-6 z-[9999] space-y-3 flex flex-col items-end pointer-events-none">
        {toasts.map(toast => {
          const Icon = toastIcons[toast.type];
          return (
            <div
              key={toast.id}
              className={cn(
                "flex items-center gap-4 px-6 py-4 rounded-[1.5rem] border shadow-2xl min-w-[320px] max-w-[450px] pointer-events-auto",
                "animate-in slide-in-from-right-5 fade-in duration-500",
                toastStyles[toast.type]
              )}
            >
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border",
                toast.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20' :
                toast.type === 'error' ? 'bg-rose-500/10 border-rose-500/20' :
                toast.type === 'warning' ? 'bg-amber-500/10 border-amber-500/20' :
                'bg-bcb-accent/10 border-bcb-accent/20'
              )}>
                <Icon size={20} strokeWidth={2.5} />
              </div>
              <p className="flex-1 text-[12px] font-bold tracking-wide leading-relaxed">{toast.message}</p>
              <button
                onClick={() => removeToast(toast.id)}
                className="p-2 hover:bg-white/5 rounded-lg transition-colors text-zinc-500 hover:text-white"
              >
                <X size={16} strokeWidth={2.5} />
              </button>
            </div>
          );
        })}
      </div>
    </>
  );
}

export function useToast() {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type, duration }]);
    
    if (duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return { toasts, addToast, removeToast };
}

export function ToastContainer({ toasts, onRemove }) {
  return (
    <div className="fixed bottom-6 right-6 z-[9999] space-y-3 flex flex-col">
      {toasts.map(toast => {
        const Icon = toastIcons[toast.type];
        return (
          <div
            key={toast.id}
            className={cn(
              "flex items-center gap-3 px-5 py-4 rounded-2xl border shadow-2xl min-w-[300px] max-w-[400px]",
              "animate-in slide-in-from-right-5 fade-in duration-300",
              toastStyles[toast.type]
            )}
          >
            <Icon size={20} />
            <p className="flex-1 text-sm font-bold">{toast.message}</p>
            <button
              onClick={() => onRemove(toast.id)}
              className="p-1 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

