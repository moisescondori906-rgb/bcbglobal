import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from './Button';
import { Card } from './Card';

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onCancel}
      />
      <Card className="relative z-10 max-w-md w-full p-8 space-y-6 animate-in zoom-in-95 fade-in duration-200">
        <div className="flex items-start gap-4">
          <div className={`
            w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0
            ${variant === 'danger' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}
          `}>
            <AlertTriangle size={24} />
          </div>
          <div>
            <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">{title}</h3>
            <p className="text-sm text-gray-500 mt-1 font-medium">{message}</p>
          </div>
        </div>
        
        <div className="flex gap-3 pt-2">
          <Button 
            onClick={onCancel} 
            variant="outline" 
            className="flex-1 border-gray-200"
          >
            {cancelText}
          </Button>
          <Button 
            onClick={onConfirm} 
            variant={variant === 'danger' ? 'destructive' : 'default'}
            className="flex-1"
          >
            {confirmText}
          </Button>
        </div>
      </Card>
    </div>
  );
}
