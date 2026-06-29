import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, 
  TrendingUp, 
  DollarSign, 
  CreditCard, 
  ArrowUpRight, 
  ArrowDownRight, 
  Activity,
  Zap,
  Target,
  BarChart3,
  RefreshCw,
  Clock,
  ShieldCheck,
  Send,
  Bell
} from 'lucide-react';
import { api } from '../../lib/api';
import { formatCurrency } from '../../utils/format';

const StatCard = ({ title, value, change, icon: Icon, color, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.5 }}
    className="admin-card p-6 relative overflow-hidden group hover:border-admin-accent/30 transition-all duration-500 hover:shadow-admin-glow"
  >
    <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${color} opacity-[0.03] rounded-bl-full group-hover:opacity-[0.07] transition-all duration-700 blur-2xl`} />
    
    <div className="flex items-start justify-between mb-6 relative z-10">
      <div className="p-3.5 rounded-2xl bg-zinc-900 border border-white/20 shadow-inner group-hover:scale-110 group-hover:bg-admin-accent/20 group-hover:border-admin-accent/40 transition-all duration-500 text-admin-accent">
        <Icon size={22} />
      </div>
      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border-2 transition-all duration-500 ${change > 0 ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' : 'bg-rose-500/20 text-rose-400 border-rose-500/40'}`}>
        {change > 0 ? <ArrowUpRight size={12} className="animate-bounce" /> : <ArrowDownRight size={12} />}
        {Math.abs(change)}%
      </div>
    </div>

    <div className="space-y-1 relative z-10">
      <p className="text-[10px] font-black text-admin-muted uppercase tracking-[0.2em]">{title}</p>
      <div className="flex items-baseline gap-1">
        <h3 className="text-3xl font-black text-white tracking-tighter group-hover:text-admin-accent transition-colors duration-500">{value}</h3>
      </div>
    </div>
  </motion.div>
);

export default function AdminDashboardV2() {
  const [stats, setStats] = useState({
    usuarios: 0,
    recargas_hoy: 0,
    retiros_hoy: 0,
    balance_total: 0,
    actividad_24h: 8.5,
    usuarios_activos: 124,
    tareas_completadas: 450
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await api.get('/admin/stats');
        if (data && typeof data === 'object') {
          setStats(prev => ({ ...prev, ...data }));
        }
      } catch (err) {
        console.error('Error fetching admin stats:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="space-y-8 sm:space-y-12">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
        <div className="space-y-2">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-admin-accent/10 flex items-center justify-center border border-admin-accent/20 shrink-0 shadow-lg shadow-admin-accent/5">
              <Zap size={24} className="text-admin-accent animate-pulse" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tighter uppercase italic leading-none">System Intelligence</h1>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <p className="text-[10px] sm:text-xs font-bold text-admin-muted uppercase tracking-[0.3em] flex items-center gap-2">
                  Operaciones en tiempo real
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => window.location.reload()}
            className="admin-button-secondary flex items-center gap-2"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Actualizar
          </button>
          <div className="admin-button-primary flex items-center gap-2">
            <ShieldCheck size={14} /> Acceso Seguro
          </div>
        </div>
      </div>

      {/* Primary Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Nodos de Usuario" 
          value={stats.usuarios} 
          change={+12.4} 
          icon={Users} 
          color="from-indigo-500 to-blue-600"
          delay={0.1}
        />
        <StatCard 
          title="Inyección Capital (24h)" 
          value={formatCurrency(stats.recargas_hoy)} 
          change={+5.2} 
          icon={CreditCard} 
          color="from-emerald-500 to-teal-600"
          delay={0.2}
        />
        <StatCard 
          title="Extracción Nodos (24h)" 
          value={formatCurrency(stats.retiros_hoy)} 
          change={-2.1} 
          icon={DollarSign} 
          color="from-rose-500 to-orange-600"
          delay={0.3}
        />
        <StatCard 
          title="Liquidez Sistema" 
          value={formatCurrency(stats.balance_total)} 
          change={+8.5} 
          icon={TrendingUp} 
          color="from-violet-500 to-purple-600"
          delay={0.4}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Real-time Activity Feed */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="xl:col-span-2 admin-card p-6 sm:p-10"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-12">
            <div className="flex items-center gap-5">
              <div className="p-4 rounded-[2rem] bg-amber-500/20 border border-amber-500/40 text-amber-500 shadow-xl shadow-amber-500/5">
                <BarChart3 size={24} />
              </div>
              <div>
                <h3 className="text-2xl font-black text-white uppercase tracking-tighter italic">Flujo Transaccional</h3>
                <p className="text-[10px] font-bold text-white uppercase tracking-[0.2em]">Monitoreo de actividad por hora</p>
              </div>
            </div>
            <div className="flex items-center gap-4 bg-zinc-900 p-2 rounded-2xl border border-white/20 self-start sm:self-center shadow-inner">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-admin-accent/20 rounded-xl border border-admin-accent/40">
                <div className="w-1.5 h-1.5 rounded-full bg-admin-accent shadow-[0_0_8px_#6366f1]" />
                <span className="text-[9px] font-black text-white uppercase">Actual</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-white/40" />
                <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Media</span>
              </div>
            </div>
          </div>

          <div className="h-64 sm:h-80 flex items-end justify-between gap-3 sm:gap-6 mb-10 px-2">
            {[45, 60, 40, 80, 55, 90, 70, 85, 100, 75, 65, 95].map((h, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-4 group/bar relative">
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-admin-accent text-white text-[10px] font-black px-2.5 py-1 rounded-lg opacity-0 group-hover/bar:opacity-100 transition-all duration-300 shadow-xl shadow-admin-accent/20 translate-y-2 group-hover/bar:translate-y-0">
                  {h}%
                </div>
                <div className="w-full relative h-full flex items-end">
                  <div 
                    className="w-full bg-gradient-to-t from-admin-accent/10 to-admin-accent/40 rounded-t-xl transition-all duration-700 group-hover/bar:from-admin-accent/30 group-hover/bar:to-admin-accent group-hover/bar:shadow-admin-glow" 
                    style={{ height: `${h}%` }}
                  />
                </div>
                <span className="text-[9px] font-black text-zinc-600 uppercase tracking-tighter group-hover:text-zinc-400 transition-colors">{i * 2}:00</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 pt-10 border-t border-white/20">
            <div className="space-y-2">
              <p className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Active Nodes</p>
              <p className="text-3xl font-black text-white tracking-tighter">{stats.usuarios_activos}</p>
            </div>
            <div className="space-y-2">
              <p className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Processed Tasks</p>
              <p className="text-3xl font-black text-white tracking-tighter">{stats.tareas_completadas}</p>
            </div>
            <div className="space-y-2">
              <p className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Network Load</p>
              <div className="flex items-center gap-3">
                <p className="text-3xl font-black text-emerald-400 tracking-tighter italic uppercase">Optimal</p>
                <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_15px_rgba(16,185,129,0.5)]" />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Quick Actions & System Status */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6 }}
          className="space-y-8"
        >
          <div className="bg-gradient-to-br from-admin-accent to-violet-700 rounded-[2.5rem] p-10 text-white relative overflow-hidden shadow-2xl shadow-admin-accent/20 group">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 group-hover:rotate-12 transition-all duration-1000">
              <Target size={160} />
            </div>
            <h3 className="text-2xl font-black italic uppercase tracking-tighter mb-2">Performance Goal</h3>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-10 opacity-70">Volumen Semanal Proyectado</p>
            <div className="text-5xl font-black mb-10 tracking-tighter flex items-baseline gap-2">
              84.5% <span className="text-sm font-bold opacity-40">/ 100%</span>
            </div>
            <div className="w-full bg-black/20 h-4 rounded-full overflow-hidden mb-4 shadow-inner p-1">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: '84.5%' }}
                transition={{ duration: 2, ease: "circOut" }}
                className="bg-white h-full rounded-full shadow-[0_0_20px_white]" 
              />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">Optimización Requerida: 15.5%</p>
          </div>

          <div className="admin-card p-8">
            <div className="flex items-center justify-between mb-8">
              <h4 className="text-xs font-black text-white uppercase tracking-[0.3em]">System Logs</h4>
              <div className="flex gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-admin-accent shadow-admin-glow" />
                <div className="w-1.5 h-1.5 rounded-full bg-white/40" />
                <div className="w-1.5 h-1.5 rounded-full bg-white/40" />
              </div>
            </div>
            <div className="space-y-5">
              <div className="flex items-center gap-5 p-4 rounded-2xl bg-zinc-900 border border-white/20 hover:border-admin-accent/50 hover:bg-zinc-800 transition-all cursor-pointer group shadow-inner">
                <div className="p-3 rounded-xl bg-admin-accent/20 text-admin-accent shrink-0 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-admin-accent/10 transition-all border border-admin-accent/20">
                  <Send size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-black text-white truncate uppercase tracking-tight">Telegram Gateway</p>
                  <p className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest mt-0.5">Cluster #1 Online</p>
                </div>
                <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981]" />
              </div>
              <div className="flex items-center gap-5 p-4 rounded-2xl bg-zinc-900 border border-white/10 opacity-60 hover:opacity-100 transition-all cursor-not-allowed grayscale">
                <div className="p-3 rounded-xl bg-zinc-800 text-zinc-500 shrink-0 border border-white/5">
                  <Bell size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-black text-zinc-400 truncate uppercase tracking-tight">SQL Maintenance</p>
                  <p className="text-[9px] font-bold text-zinc-600 uppercase italic mt-0.5">Programado: 24 May</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
