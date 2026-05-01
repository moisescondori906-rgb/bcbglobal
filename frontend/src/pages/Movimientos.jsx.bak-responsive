import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Layout from '../components/Layout';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { 
  History, ArrowUpCircle, ArrowDownCircle, 
  FileText, Clock, Filter, CheckCircle2, 
  AlertCircle, XCircle, Loader2
} from 'lucide-react';

// UI Components
import { Card } from '../components/ui/Card.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { cn } from '../lib/utils/cn';

export default function Movimientos() {
  const { user } = useAuth();
  const [tab, setTab] = useState('todo');
  const [data, setData] = useState({ recargas: [], retiros: [] });
  const [loading, setLoading] = useState(true);

  const fetchMovs = useCallback(async (isInitial = false) => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    if (isInitial) setLoading(true);
    
    // Timeout de seguridad por si algo en la cadena de promesas falla silenciosamente
    const safetyTimeout = setTimeout(() => {
      setLoading(false);
    }, 15000);

    try {
      console.log('[Movimientos] Fetching list...');
      const recargas = await api.recharges.list().catch((err) => {
        console.error('[Movimientos] Error in recharges:', err);
        return [];
      });
      const retiros = await api.withdrawals.list().catch((err) => {
        console.error('[Movimientos] Error in withdrawals:', err);
        return [];
      });

      console.log('[Movimientos] Received:', { recargas, retiros });

      setData({ 
        recargas: Array.isArray(recargas) ? recargas : [], 
        retiros: Array.isArray(retiros) ? retiros : [] 
      });
    } catch (err) {
      console.error('[Movimientos] Fetch fatal error:', err);
    } finally {
      clearTimeout(safetyTimeout);
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchMovs(true);
    const interval = setInterval(() => fetchMovs(false), 30000);
    return () => clearInterval(interval);
  }, [fetchMovs]);

  const combinedItems = [
    ...(Array.isArray(data.recargas) ? data.recargas : []).map(r => ({ ...r, tipo_visual: 'recarga' })),
    ...(Array.isArray(data.retiros) ? data.retiros : []).map(r => ({ ...r, tipo_visual: 'retiro' }))
  ].sort((a, b) => {
    const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
    return dateB - dateA;
  });

  const filteredItems = tab === 'todo' 
    ? combinedItems 
    : (tab === 'recargas' 
        ? combinedItems.filter(i => i.tipo_visual === 'recarga') 
        : combinedItems.filter(i => i.tipo_visual === 'retiro')
      );

  const getStatusBadge = (estado) => {
    const e = String(estado || '').toLowerCase();
    if (['aprobada', 'aprobado', 'completado', 'pagado'].includes(e)) return <Badge variant="success" icon={CheckCircle2}>COMPLETADO</Badge>;
    if (['rechazada', 'rechazado', 'error'].includes(e)) return <Badge variant="error" icon={XCircle}>RECHAZADO</Badge>;
    return <Badge variant="warning" icon={Loader2} className="animate-pulse">PENDIENTE</Badge>;
  };

  if (loading && combinedItems.length === 0) {
    return (
      <Layout>
        <div className="p-10 flex flex-col items-center justify-center min-h-[70vh] space-y-6">
          <div className="w-16 h-16 border-4 border-sav-primary/10 border-t-sav-primary rounded-full animate-spin" />
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-sav-muted animate-pulse">Cargando Historial</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <header className="px-6 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-black text-white uppercase tracking-tighter leading-none">Movimientos</h1>
          <Badge variant="info">AUDITORÍA</Badge>
        </div>

        <div className="flex bg-sav-surface p-1.5 rounded-2xl border border-sav-border shadow-inner">
          {[
            { id: 'todo', label: 'Todos', icon: History },
            { id: 'recargas', label: 'Recargas', icon: ArrowUpCircle },
            { id: 'retiros', label: 'Retiros', icon: ArrowDownCircle }
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                tab === t.id 
                  ? "bg-sav-primary text-white shadow-lg shadow-sav-primary/20 scale-[1.02]" 
                  : "text-sav-muted hover:text-white"
              )}
            >
              <t.icon size={14} />
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </header>

      <main className="px-5 space-y-4 pb-10">
        <AnimatePresence mode="popLayout">
          {filteredItems.map((item, i) => {
            const isRecarga = item.tipo_visual === 'recarga';
            return (
              <Card 
                key={item.id} 
                variant="flat" 
                className="p-5 flex items-center gap-4 animate-in group border-sav-primary/5"
                delay={i * 0.03}
              >
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center border transition-transform group-hover:scale-105",
                  isRecarga ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-sav-accent/10 border-sav-accent/20 text-sav-accent"
                )}>
                  {isRecarga ? <ArrowUpCircle size={24} /> : <ArrowDownCircle size={24} />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-2">
                    <div className="min-w-0">
                      <h4 className="text-[11px] font-black text-white uppercase tracking-tight truncate leading-none">
                        {isRecarga ? 'Depósito Bancario' : 'Retiro a Cuenta'}
                      </h4>
                      <p className="text-[8px] text-sav-muted font-mono tracking-widest mt-1">
                        ID: {item.id?.slice(0, 12).toUpperCase()}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={cn(
                        "text-base font-black tracking-tight leading-none mb-1",
                        isRecarga ? "text-sav-success" : "text-white"
                      )}>
                        {isRecarga ? '+' : '-'}{Number(item.monto).toLocaleString()}
                      </p>
                      <span className="text-[8px] font-black text-sav-muted uppercase tracking-widest">BOB</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-3 border-t border-sav-border">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1 text-[8px] font-bold text-sav-muted uppercase tracking-widest">
                        <Clock size={10} />
                        {new Date(item.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    {getStatusBadge(item.estado)}
                  </div>
                </div>
              </Card>
            );
          })}
        </AnimatePresence>

        {filteredItems.length === 0 && !loading && (
          <div className="py-20 flex flex-col items-center justify-center text-center space-y-4 opacity-40">
            <FileText size={48} />
            <p className="text-[10px] font-black uppercase tracking-widest">Sin transacciones registradas</p>
          </div>
        )}
      </main>
    </Layout>
  );
}
