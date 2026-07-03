import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Layout from '../components/Layout';
import Header from '../components/Header';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { 
  Wallet, TrendingUp, History, Target, 
  ArrowUpCircle, ArrowDownCircle, AlertCircle,
  Trophy, Users, UserPlus, Filter, Clock,
  Sparkles, DollarSign, ChevronRight, CheckCircle2
} from 'lucide-react';
import { formatDate } from '../lib/utils/format';

// UI Components
import { Card } from '../components/ui/Card.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { Button } from '../components/ui/Button.jsx';
import { cn } from '../lib/utils/cn';

const APPROVED_STATES = new Set(['completada', 'completado', 'aprobada', 'aprobado', 'aceptada', 'aceptado', 'pagado']);
const REJECTED_STATES = new Set(['rechazada', 'rechazado']);

function normalizeText(value) {
  return String(value || '').trim();
}

function prettifyMovementType(value) {
  return normalizeText(value).replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
}

function getRequestStatusInfo(rawState) {
  const state = normalizeText(rawState).toLowerCase();
  if (REJECTED_STATES.has(state)) return { text: 'Rechazado', variant: 'error' };
  if (APPROVED_STATES.has(state)) return { text: 'Aprobado', variant: 'success' };
  return { text: 'Revisando', variant: 'warning' };
}

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
  const { user } = useAuth();
  const [tab, setTab] = useState('todo');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [punished, setPunished] = useState(false);

  const fetchData = async () => {
    try {
      if (!data) setLoading(true);
      const [earningsRes, recargasRes, retirosRes] = await Promise.all([
        api.users.earnings().catch(() => ({
          history: [],
          summary: { total: 0, hoy: 0 }
        })),
        api.recharges.list().catch(() => []),
        api.withdrawals.list().catch(() => [])
      ]);
      setData({
        history: earningsRes?.history || [],
        summary: earningsRes?.summary || { total: 0, hoy: 0 },
        recargas: Array.isArray(recargasRes) ? recargasRes : [],
        retiros: Array.isArray(retirosRes) ? retirosRes : []
      });
    } catch (err) {
      console.error('Error fetching earnings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') fetchData();
    }, 15000);
    return () => clearInterval(interval);
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

  const recargasList = Array.isArray(data?.recargas) ? data.recargas : [];
  const retirosList = Array.isArray(data?.retiros) ? data.retiros : [];
  const recargasMap = new Map(recargasList.map(item => [String(item.id), item]));
  const retirosMap = new Map(retirosList.map(item => [String(item.id), item]));

  const enrichedHistory = historyList.map((item) => {
    const referenceId = normalizeText(item.referencia_id);
    if (referenceId && recargasMap.has(referenceId)) {
      return { ...item, __activityKind: 'recarga', __linkedOperation: recargasMap.get(referenceId) };
    }
    if (referenceId && retirosMap.has(referenceId)) {
      return { ...item, __activityKind: 'retiro', __linkedOperation: retirosMap.get(referenceId) };
    }
    return { ...item, __activityKind: 'movement', __linkedOperation: null };
  });

  const referenceIds = new Set(enrichedHistory.map(item => normalizeText(item.referencia_id)).filter(Boolean));

  const pendingRecargasWithoutMovement = recargasList
    .filter(item => !referenceIds.has(String(item.id)))
    .map(item => ({
      ...item,
      __activityKind: 'recarga',
      __linkedOperation: item,
      __syntheticId: `recarga:${item.id}`,
      tipo_movimiento: 'recarga',
      descripcion: 'Solicitud de recarga',
      referencia_id: item.id
    }));

  const pendingRetirosWithoutMovement = retirosList
    .filter(item => !referenceIds.has(String(item.id)))
    .map(item => ({
      ...item,
      __activityKind: 'retiro',
      __linkedOperation: item,
      __syntheticId: `retiro:${item.id}`,
      tipo_movimiento: 'retiro',
      descripcion: 'Solicitud de retiro',
      referencia_id: item.id
    }));

  const activityItems = [...enrichedHistory, ...pendingRecargasWithoutMovement, ...pendingRetirosWithoutMovement]
    .sort((a, b) => {
      const dateA = new Date(a.created_at || a.fecha || a.procesado_at || 0).getTime();
      const dateB = new Date(b.created_at || b.fecha || b.procesado_at || 0).getTime();
      return dateB - dateA;
    });

  const filteredActivityItems = activityItems.filter((item) => {
    if (tab === 'todo') return true;
    if (tab === 'recargas') return item.__activityKind === 'recarga';
    if (tab === 'retiros') {
      return item.__activityKind === 'retiro' || normalizeText(item.tipo_movimiento).toLowerCase().includes('reembolso_retiro');
    }
    if (item.__activityKind === 'recarga' || item.__activityKind === 'retiro') return false;

    const tipo = normalizeText(item.tipo_movimiento).toLowerCase();
    const filters = {
      tareas: ['ganancia_tarea', 'tarea_completada'],
      comisiones: ['comision_subordinado', 'comision_red'],
      invitaciones: ['recompensa_invitacion', 'bono_invitado'],
      otros: ['ajuste_admin', 'bono_manual', 'premio_ruleta', 'canje_codigo']
    };
    return filters[tab]?.some(f => tipo.includes(f));
  });

  if (loading && !data) {
    return (
      <Layout>
        <div className="p-10 flex flex-col items-center justify-center min-h-[70vh] space-y-6">
          <div className="w-16 h-16 border-4 border-bcb-surface border-t-bcb-primary rounded-full animate-spin" />
          <p className="text-[11px] font-extrabold uppercase tracking-[0.3em] text-bcb-muted animate-pulse">Sincronizando Billetera</p>
        </div>
      </Layout>
    );
  }

  if (punished) {
    return (
      <Layout>
        <div className="px-6 py-12 flex flex-col items-center justify-center min-h-[80vh] text-center space-y-8">
          <Card variant="premium" className="w-full flex flex-col items-center p-12 space-y-8">
            <div className="w-24 h-24 bg-rose-50 text-rose-500 rounded-[2.5rem] flex items-center justify-center border border-rose-100 shadow-sm animate-pulse">
              <AlertCircle size={48} strokeWidth={1.5} />
            </div>
            <div className="space-y-4">
              <h2 className="text-3xl font-extrabold text-black uppercase tracking-tight">Acceso Restringido</h2>
              <p className="text-sm text-bcb-text-dim font-medium leading-relaxed max-w-xs mx-auto">
                Tu sistema de ganancias ha sido <span className="text-rose-600 font-extrabold uppercase">restringido por hoy</span> debido a normativas de seguridad institucional.
              </p>
            </div>
            <Button onClick={() => window.location.reload()} variant="primary" className="w-full h-14 uppercase tracking-widest">VERIFICAR ESTADO</Button>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="bg-bcb-bg min-h-screen pb-32">
        <Header title="Mi Billetera Global" />
        
        <main className="px-6 py-8 space-y-10 max-w-lg mx-auto animate-in">
          {/* Main Wallet Card */}
          <section>
            <Card variant="premium" className="p-8 space-y-10">
              <div className="flex justify-between items-start">
                <div className="space-y-1.5">
                  <p className="text-[11px] font-extrabold text-bcb-muted uppercase tracking-[0.2em]">Capital Acumulado</p>
                  <div className="flex items-baseline gap-2">
                <h2 className="text-5xl font-black text-black tracking-tighter">
                  {(data?.summary?.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </h2>
                <span className="text-lg font-black text-bcb-primary uppercase tracking-widest">Bs</span>
              </div>
                </div>
                <div className="w-14 h-14 rounded-2xl bg-bcb-primary/10 flex items-center justify-center text-bcb-primary shadow-sm border border-bcb-primary/20">
                   <Wallet size={28} strokeWidth={1.5} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8 pt-8 border-t border-black/[0.03]">
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold text-bcb-muted uppercase tracking-widest">Misiones (Hoy)</p>
                  <p className="text-2xl font-black text-black tracking-tight">
                    {(data?.summary?.tareas_today || data?.summary?.tareas_hoy || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="space-y-1.5 text-right">
                  <p className="text-[10px] font-bold text-bcb-muted uppercase tracking-widest">Red (Hoy)</p>
                  <p className="text-2xl font-black text-emerald-600 tracking-tight">
                    {(data?.summary?.comisiones_today || data?.summary?.comisiones_hoy || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </Card>
          </section>

          {/* Filters Horizontal Scroll */}
          <section className="space-y-5">
            <div className="flex items-center gap-2 px-1">
              <div className="w-1.5 h-4 bg-bcb-primary rounded-full" />
              <h3 className="text-[13px] font-extrabold text-black uppercase tracking-[0.15em]">Filtrar Historial</h3>
            </div>
            <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-6 px-6 pb-2">
              {categories.map(cat => {
                const isActive = tab === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setTab(cat.id)}
                    className={cn(
                      "flex items-center gap-2.5 px-6 py-3.5 rounded-2xl whitespace-nowrap text-[11px] font-black uppercase tracking-widest transition-all duration-500 shadow-sm",
                      isActive 
                        ? "bg-bcb-primary text-white shadow-accent-glow -translate-y-1" 
                        : "bg-white/40 backdrop-blur-md text-bcb-muted border border-black/[0.03] hover:bg-bcb-surface"
                    )}
                  >
                    <cat.icon size={16} strokeWidth={isActive ? 3 : 2} />
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Activity List */}
          <section className="space-y-6 pb-12">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-[13px] font-extrabold text-black uppercase tracking-[0.15em] flex items-center gap-2">
                <History size={18} className="text-bcb-primary" strokeWidth={2.5} /> Actividad Reciente
              </h2>
              <Badge variant="info">{filteredActivityItems.length} EVENTOS</Badge>
            </div>

            <div className="space-y-4">
              <AnimatePresence mode="popLayout">
                {filteredActivityItems.map((item, i) => {
                  const tipoLower = item.tipo_movimiento?.toLowerCase() || '';
                  const linkedOperation = item.__linkedOperation || null;
                  const activityKind = item.__activityKind;
                  const isPositive = activityKind === 'recarga'
                    ? true
                    : activityKind === 'retiro'
                      ? false
                      : !['retiro', 'extraccion', 'ajuste_admin_negativo'].some(t => tipoLower.includes(t));
                  const isTarea = ['ganancia_tarea', 'tarea_completada'].some(t => tipoLower.includes(t));
                  const isPremio = ['premio_ruleta'].some(t => tipoLower.includes(t));
                  const statusInfo = activityKind === 'recarga' || activityKind === 'retiro'
                    ? getRequestStatusInfo(linkedOperation?.estado || item.estado)
                    : tipoLower.includes('reembolso_retiro') || normalizeText(item.descripcion).toLowerCase().includes('rechazado')
                      ? { text: 'Rechazado', variant: 'error' }
                      : null;
                  const title = activityKind === 'recarga'
                    ? 'Solicitud de recarga'
                    : activityKind === 'retiro'
                      ? 'Solicitud de retiro'
                      : (normalizeText(item.descripcion) || prettifyMovementType(item.tipo_movimiento) || 'Movimiento');
                  const amount = Math.abs(Number(item.monto || 0));
                  
                  return (
                    <motion.div
                      layout
                      key={item.id || i}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <Card className="p-5 flex items-center gap-5 bg-white border-black/[0.03] hover:shadow-m3-2 transition-all group">
                        <div className={cn(
                          "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border shadow-sm transition-all duration-500 group-hover:rotate-6",
                          isPositive ? "bg-emerald-50 border-emerald-100 text-emerald-500" : "bg-rose-50 border-rose-100 text-rose-500"
                        )}>
                          {isPositive ? <ArrowUpCircle size={24} strokeWidth={2} /> : <ArrowDownCircle size={24} strokeWidth={2} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-[12px] font-extrabold text-black uppercase tracking-tight truncate group-hover:text-bcb-primary transition-colors">
                            {title}
                          </h4>
                          <div className="flex items-center gap-3 mt-1">
                            <div className="flex items-center gap-1.5 opacity-60">
                              <Clock size={10} strokeWidth={3} />
                              <p className="text-[9px] font-bold text-bcb-muted uppercase tracking-widest truncate">
                                {formatDate(item.created_at)}
                              </p>
                            </div>
                            {statusInfo ? (
                              <Badge variant={statusInfo.variant} icon={statusInfo.variant === 'success' ? CheckCircle2 : undefined}>
                                {statusInfo.text}
                              </Badge>
                            ) : (isTarea || isPremio) ? (
                              <Badge variant="success" icon={CheckCircle2}>Procesado</Badge>
                            ) : null}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className={cn(
                            "text-lg font-black tracking-tighter",
                            isPositive ? "text-emerald-600" : "text-black"
                          )}>
                            {isPositive ? '+' : '-'}{amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </p>
                          <p className="text-[9px] font-black text-bcb-muted uppercase tracking-widest">Bs</p>
                        </div>
                      </Card>
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {filteredActivityItems.length === 0 && (
                <div className="py-24 flex flex-col items-center justify-center text-center space-y-6">
                  <div className="w-24 h-24 rounded-[3rem] bg-bcb-surface border-2 border-dashed border-black/[0.05] flex items-center justify-center text-bcb-muted/30">
                    <History size={48} strokeWidth={1.5} />
                  </div>
                  <div className="space-y-2">
                    <p className="text-[13px] font-extrabold text-black uppercase tracking-widest">Sin actividad</p>
                    <p className="text-[11px] font-bold text-bcb-muted uppercase tracking-tight leading-relaxed max-w-[180px] mx-auto">Comienza a realizar tareas para ver tus ganancias aquí.</p>
                  </div>
                </div>
              )}
            </div>
          </section>
        </main>
      </div>
    </Layout>
  );
}
