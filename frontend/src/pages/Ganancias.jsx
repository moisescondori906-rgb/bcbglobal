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
      const res = await api.users.earnings().catch(err => {
        console.error('Error earnings API:', err);
        return { 
          history: [], 
          summary: { total: 0, hoy: 0 } 
        };
      });
      // Asegurar estructura mínima para evitar errores de renderizado
      setData({
        history: res?.history || [],
        summary: res?.summary || { total: 0, hoy: 0 }
      });
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
      <header className="px-4 sm:px-6 py-6 sm:py-8 space-y-5 sm:space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tighter leading-none">Billetera</h1>
          <Badge variant="info">FINTECH</Badge>
        </div>

        <Card variant="premium" className="p-6 sm:p-8 space-y-6 sm:space-y-8 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 sm:p-8 opacity-10 group-hover:scale-110 transition-transform">
            <TrendingUp size={60} className="sm:w-[80px] sm:h-[80px]" />
          </div>
          <div className="space-y-1 relative z-10">
            <p className="text-[9px] sm:text-[10px] font-black text-sav-muted uppercase tracking-[0.2em] sm:tracking-[0.3em]">Balance Acumulado</p>
            <div className="flex items-baseline gap-2 overflow-hidden">
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tighter uppercase truncate">
                {(data?.summary?.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </h2>
              <span className="text-xs sm:text-sm font-black text-sav-muted tracking-widest uppercase shrink-0">BOB</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 relative z-10 pt-4 border-t border-slate-100">
            <div className="space-y-1">
              <p className="text-[8px] sm:text-[9px] font-black text-sav-muted uppercase tracking-widest">Hoy</p>
              <p className="text-base sm:text-lg font-black text-sav-success truncate">
                +{(data?.summary?.hoy || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="space-y-1 text-right">
              <p className="text-[8px] sm:text-[9px] font-black text-sav-muted uppercase tracking-widest">Comisiones</p>
              <p className="text-base sm:text-lg font-black text-slate-900 truncate">
                {(user?.saldo_comisiones || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </Card>
      </header>

      <main className="px-4 sm:px-5 space-y-6 pb-10">
        <section>
          <div className="flex items-center gap-2 px-1 mb-3 sm:mb-4">
            <Target size={14} className="text-sav-primary" />
            <h2 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em]">Filtrar por categoría</h2>
          </div>
          <div className="flex gap-2.5 overflow-x-auto no-scrollbar -mx-4 px-4 pb-2">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setTab(cat.id)}
                className={cn(
                  "flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3.5 rounded-xl sm:rounded-2xl whitespace-nowrap text-[9px] font-black uppercase tracking-widest border transition-all active:scale-95",
                  tab === cat.id 
                    ? "bg-sav-primary border-sav-primary text-white shadow-lg shadow-sav-primary/20" 
                    : "bg-white border-sav-border text-sav-muted hover:border-sav-primary/20"
                )}
              >
                <cat.icon size={13} className="sm:w-[14px] sm:h-[14px]" strokeWidth={2.5} />
                {cat.label}
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between px-1 mb-2">
            <h2 className="text-[10px] sm:text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
              <History size={14} className="text-sav-primary" /> Historial Reciente
            </h2>
            <Badge variant="muted" className="px-2 py-0.5">{historyList.length}</Badge>
          </div>

          <div className="space-y-2.5 sm:space-y-3">
            <AnimatePresence mode="popLayout">
              {historyList.map((item, i) => {
                const tipoLower = item.tipo_movimiento?.toLowerCase() || '';
                const isPositive = !['retiro', 'extraccion', 'ajuste_admin_negativo'].some(t => tipoLower.includes(t));
                return (
                  <motion.div
                    layout
                    key={item.id || i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="group"
                  >
                    <Card variant="flat" className="p-3 sm:p-4 flex items-center gap-3 sm:gap-4 transition-all hover:border-sav-primary/10 active:scale-[0.98] bg-white">
                      <div className={cn(
                        "w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 transition-colors",
                        isPositive ? "bg-sav-success/10 text-sav-success" : "bg-sav-error/10 text-sav-error"
                      )}>
                        {isPositive ? <ArrowUpCircle size={20} className="sm:w-[24px] sm:h-[24px]" /> : <ArrowDownCircle size={20} className="sm:w-[24px] sm:h-[24px]" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-[10px] sm:text-[11px] font-black text-slate-900 uppercase tracking-wide truncate">
                          {item.descripcion || item.tipo_movimiento}
                        </h4>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Clock size={9} className="text-sav-muted shrink-0" />
                          <p className="text-[8px] sm:text-[9px] font-bold text-sav-muted uppercase tracking-wider truncate">
                            {new Date(item.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={cn(
                          "text-sm sm:text-base font-black tracking-tight",
                          isPositive ? "text-sav-success" : "text-sav-error"
                        )}>
                          {isPositive ? '+' : '-'}{Math.abs(Number(item.monto)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-[8px] sm:text-[9px] font-bold text-sav-muted uppercase tracking-tighter">BOB</p>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {historyList.length === 0 && (
              <div className="py-16 sm:py-20 flex flex-col items-center justify-center space-y-4">
                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-white border border-sav-border rounded-2xl sm:rounded-3xl flex items-center justify-center text-sav-muted/30">
                  <History size={28} className="sm:w-[32px] sm:h-[32px]" />
                </div>
                <p className="text-[9px] sm:text-[10px] font-black text-sav-muted uppercase tracking-[0.2em]">Sin movimientos</p>
              </div>
            )}
          </div>
        </section>
      </main>
    </Layout>
  );
}
