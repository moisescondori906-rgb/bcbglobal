import React from 'react';
import { Card } from './Card';
import { Button } from './Button';
import { AlertCircle, RefreshCw } from 'lucide-react';

/**
 * ErrorBoundary - Captura errores de renderizado en React.
 * Evita que un error en un componente rompa toda la aplicación.
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Error capturado:', error);
    console.error('[ErrorBoundary] Stack:', errorInfo.componentStack);
    
    // Si es un error de carga de chunk que el lazyWithRetry no atrapó
    if (error.message?.includes('chunk') || error.message?.includes('module')) {
      const lastReload = sessionStorage.getItem('last-chunk-reload');
      const now = Date.now();
      if (!lastReload || now - parseInt(lastReload) > 10000) {
        sessionStorage.setItem('last-chunk-reload', now.toString());
        window.location.reload();
      }
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-sav-dark flex items-center justify-center p-6">
          <Card variant="premium" className="max-w-md w-full p-8 text-center space-y-6">
            <div className="w-20 h-20 bg-sav-error/10 text-sav-error rounded-3xl flex items-center justify-center mx-auto animate-pulse">
              <AlertCircle size={48} />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black uppercase tracking-tight text-white">Algo salió mal</h2>
              <p className="text-[10px] font-bold text-sav-muted uppercase tracking-widest leading-relaxed">
                La aplicación ha experimentado un error inesperado de renderizado.
              </p>
            </div>
            <Button 
              onClick={() => window.location.reload()}
              icon={RefreshCw}
              className="w-full"
            >
              Recargar Aplicación
            </Button>
            {process.env.NODE_ENV === 'development' && (
              <pre className="text-[8px] text-rose-400 bg-black/50 p-4 rounded-xl overflow-auto text-left max-h-40 no-scrollbar">
                {this.state.error?.toString()}
              </pre>
            )}
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
