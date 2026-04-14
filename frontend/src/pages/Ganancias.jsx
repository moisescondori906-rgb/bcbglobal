import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Layout from '../components/Layout';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { 
  Wallet, TrendingUp, History, Target, 
  ArrowUpCircle, ArrowDownCircle, AlertCircle,
  Trophy, Users, UserPlus, Filter, Clock
} from 'lucide-react';

// UI Components
import { Card } from '../components/ui/Card.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { cn } from '../lib/utils/cn';

const categories = [
  { id: 'todo', label: 'Todo', icon: History },
  { id: 'tareas', label: 'Tareas', icon: Trophy },
  { id: 'comisiones', label: 'Comisiones', icon: Users },
  { id: 'invitaciones', label: 'Invitados', icon: UserPlus },
  { id: 'recargas', label: 'Recargas', icon: ArrowUpCircle },
  { id: 'retiros', label: 'Retiros', icon: ArrowDownCircle },
  { id: 'otros', label: 'Otros', icon: Filter }
];

export default function Ganancias() {
  const { user, refreshUser } = useAuth();
  const [tab, setTab] = useState('todo');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [punished, setPunished] = useState(false);

  const fetchData = async () => {
    try {
      if (!data) setLoading(true);
      const [res] = await Promise.all([
        api.users.earnings().catch(err => {
          console.error('Error earnings:', err);
          return { history: [], summary: { total: 0, hoy: 0 } };
        })
      ]);
      setData(res);
    } catch (err) {
      console.error('Error general fetchData Ganancias:', err);
      setError('No se pudo sincronizar el historial.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') fetchData();
    }, 15000);
    
    return () => {
      clearInterval(interval);
    };
  }, [user?.id]);

  const historyList = Array.isArray(data?.history) ? data.history.filter(item => {
    if (tab === 'todo') return true;
    const tipo = item.tipo_movimiento?.toLowerCase() || '';
    const filters = {
      tareas: ['ganancia_tarea', 'tarea_completada'],
      comisiones: ['comision_subordinado', 'comision_red'],
      invitaciones: ['recompensa_invitacion', 'bono_invitado'],
      recargas: ['recarga', 'deposito'],
      retiros: ['retiro', 'extraccion'],
      otros: ['ajuste_admin', 'bono_manual', 'premio_ruleta']
    };
    return filters[tab]?.some(f => tipo.includes(f));
  }) : [];

  if (loading && !data) {
    return (
      <Layout>
        <div className="p-10 flex flex-col items-center justify-center min-h-[70vh] space-y-6">
          <div className="w-16 h-16 border-4 border-sav-primary/10 border-t-sav-primary rounded-full animate-spin" />
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-sav-muted animate-pulse">Sincronizando Billetera</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <header className="px-6 py-8 space-y-6">
```

old_str:
```
  const fetchData = async () => {
    try {
      if (!data) setLoading(true);
      const res = await api.users.earnings().catch(err => {
        console.error('Error earnings:', err);
        return { history: [], summary: { total: 0, hoy: 0 } };
      });
      setData(res);
    } catch (err) {
      console.error('Error general fetchData Ganancias:', err);
      setError('No se pudo sincronizar el historial.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') fetchData();
    }, 15000);
    
    return () => {
      clearInterval(interval);
    };
  }, [user?.id]);

  const historyList = Array.isArray(data?.history) ? data.history.filter(item => {
    if (tab === 'todo') return true;
    const tipo = item.tipo_movimiento?.toLowerCase() || '';
    const filters = {
      tareas: ['ganancia_tarea', 'tarea_completada'],
      comisiones: ['comision_subordinado', 'comision_red'],
      invitaciones: ['recompensa_invitacion', 'bono_invitado'],
      recargas: ['recarga', 'deposito'],
      retiros: ['retiro', 'extraccion'],
      otros: ['ajuste_admin', 'bono_manual', 'premio_ruleta']
    };
    return filters[tab]?.some(f => tipo.includes(f));
  }) : [];

  if (loading && !data) {
    return (
      <Layout>
        <div className="p-10 flex flex-col items-center justify-center min-h-[70vh] space-y-6">
          <div className="w-16 h-16 border-4 border-sav-primary/10 border-t-sav-primary rounded-full animate-spin" />
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-sav-muted animate-pulse">Sincronizando Billetera</p>
        </div>
      </Layout>
    );
  }

  if (punished) {
    return (
      <Layout>
        <div className="p-6 flex flex-col items-center justify-center min-h-[70vh] text-center space-y-8">
          <Card variant="premium" className="w-full flex flex-col items-center p-10 space-y-6">
            <div className="w-20 h-20 bg-sav-error/10 text-sav-error rounded-3xl flex items-center justify-center animate-pulse">
              <AlertCircle size={48} />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black uppercase tracking-tight text-white">Acceso Restringido</h2>
              <p className="text-[10px] font-bold text-sav-muted uppercase tracking-widest leading-relaxed">
                Tu sistema de ganancias ha sido bloqueado por hoy debido al cuestionario obligatorio.
              </p>
            </div>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <header className="px-6 py-8 space-y-6">
```
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-black text-white uppercase tracking-tighter leading-none">Billetera</h1>
          <Badge variant="info">FINTECH</Badge>
        </div>

        <Card variant="premium" className="p-8 space-y-8 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
            <TrendingUp size={80} />
          </div>
          <div className="space-y-1 relative z-10">
            <p className="text-[10px] font-black text-sav-muted uppercase tracking-[0.3em]">Balance Acumulado</p>
            <div className="flex items-baseline gap-2">
              <h2 className="text-4xl font-black text-white tracking-tighter uppercase">
                {(data?.summary?.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </h2>
              <span className="text-sm font-black text-sav-muted tracking-widest uppercase">BOB</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 relative z-10 pt-4 border-t border-white/5">
            <div className="space-y-1">
              <p className="text-[9px] font-black text-sav-muted uppercase tracking-widest">Hoy</p>
              <p className="text-lg font-black text-sav-success">
                +{(data?.summary?.hoy || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="space-y-1 text-right">
              <p className="text-[9px] font-black text-sav-muted uppercase tracking-widest">Comisiones</p>
              <p className="text-lg font-black text-white">
                {(user?.saldo_comisiones || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </Card>
      </header>

      <main className="px-5 space-y-6 pb-10">
        {/* Horizontal Scroll Categories */}
        <section>
          <div className="flex items-center gap-2 px-1 mb-4">
            <Target size={14} className="text-sav-primary" />
            <h2 className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Filtrar por categoría</h2>
          </div>
          <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-5 px-5 pb-2">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setTab(cat.id)}
                className={cn(
                  "flex items-center gap-2 px-6 py-3.5 rounded-2xl whitespace-nowrap text-[9px] font-black uppercase tracking-widest border transition-all active:scale-95",
                  tab === cat.id 
                    ? "bg-sav-primary border-sav-primary text-white shadow-lg shadow-sav-primary/20" 
                    : "bg-sav-surface border-sav-border text-sav-muted hover:border-white/20"
                )}
              >
                <cat.icon size={14} strokeWidth={2.5} />
                {cat.label}
              </button>
            ))}
          </div>
        </section>

        {/* Transaction History */}
        <section className="space-y-4">
          <div className="flex items-center justify-between px-1 mb-2">
            <h2 className="text-[11px] font-black text-white uppercase tracking-[0.2em] flex items-center gap-2">
              <History size={14} className="text-sav-primary" /> Historial Reciente
            </h2>
            <Badge variant="muted" className="px-2 py-0.5">{historyList.length}</Badge>
          </div>

          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {historyList.map((item, i) => {
                const isPositive = !['retiro', 'extraccion', 'ajuste_admin_negativo'].some(t => item.tipo_movimiento?.toLowerCase().includes(t));
                return (
                  <Card 
                    key={item.id || i} 
                    variant="flat" 
                    className="p-4 flex items-center gap-4 group animate-in"
                    delay={i * 0.03}
                  >
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center border transition-transform group-hover:scale-105",
                      isPositive ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-sav-error/10 border-sav-error/20 text-sav-error"
                    )}>
                      {isPositive ? <ArrowUpCircle size={24} /> : <ArrowDownCircle size={24} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="text-[10px] font-black text-white uppercase tracking-tight truncate">
                          {item.tipo_movimiento?.replace(/_/g, ' ')}
                        </h4>
                        <span className={cn(
                          "text-sm font-black tracking-tight",
                          isPositive ? "text-sav-success" : "text-sav-error"
                        )}>
                          {isPositive ? '+' : ''}{item.monto?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-sav-muted">
                        <div className="flex items-center gap-1 text-[8px] font-bold uppercase tracking-widest">
                          <Clock size={10} />
                          {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div className="w-1 h-1 bg-sav-border rounded-full" />
                        <span className="text-[8px] font-bold uppercase tracking-widest">
                          {new Date(item.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </AnimatePresence>
            
            {historyList.length === 0 && (
              <div className="py-20 flex flex-col items-center justify-center text-center space-y-4 opacity-40">
                <History size={48} />
                <p className="text-[10px] font-black uppercase tracking-widest">No hay movimientos registrados</p>
              </div>
            )}
          </div>
        </section>
      </main>
    </Layout>
  );
}
