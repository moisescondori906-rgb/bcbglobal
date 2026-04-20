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
    className="bg-[#161926] border border-white/5 p-6 rounded-3xl relative overflow-hidden group hover:border-sav-primary/20 transition-all duration-500 shadow-xl shadow-black/20"
  >
    <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${color} opacity-[0.03] rounded-bl-full group-hover:opacity-[0.08] transition-opacity duration-500`} />
    
    <div className="flex items-start justify-between mb-6">
      <div className={`p-4 rounded-2xl bg-gradient-to-br ${color} bg-opacity-10 border border-white/5 shadow-lg group-hover:scale-110 transition-transform duration-500`}>
        <Icon size={24} className="text-white" />
      </div>
      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${change > 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
        {change > 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
        {Math.abs(change)}%
      </div>
    </div>

    <div className="space-y-1">
      <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{title}</p>
      <h3 className="text-3xl font-black text-white tracking-tighter">{value}</h3>
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
        const { data } = await api.get('/admin/stats');
        if (data) setStats(prev => ({ ...prev, ...data }));
      } catch (err) {
        console.error('Error fetching admin stats:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="space-y-10">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sav-primary/20 flex items-center justify-center border border-sav-primary/20">
              <Zap size={20} className="text-sav-primary animate-pulse" />
            </div>
            <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic">Institutional Command Center</h1>
          </div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-[0.3em] flex items-center gap-2">
            <Activity size={14} className="text-sav-primary" /> Monitoreo en tiempo real de BCB Global
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#161926] border border-white/5 text-[10px] font-black uppercase tracking-widest text-slate-300 hover:bg-white/5 hover:text-white transition-all shadow-xl"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Actualizar Datos
          </button>
          <div className="px-6 py-3 rounded-2xl bg-sav-primary/10 border border-sav-primary/20 text-[10px] font-black uppercase tracking-widest text-sav-primary shadow-lg shadow-sav-primary/10 flex items-center gap-2">
            <Clock size={14} /> 20:45 UTC-4
          </div>
        </div>
      </div>

      {/* Primary Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Usuarios" 
          value={stats.usuarios} 
          change={+12.4} 
          icon={Users} 
          color="from-blue-500 to-indigo-600"
          delay={0.1}
        />
        <StatCard 
          title="Recargas Hoy" 
          value={formatCurrency(stats.recargas_hoy)} 
          change={+5.2} 
          icon={CreditCard} 
          color="from-emerald-500 to-teal-600"
          delay={0.2}
        />
        <StatCard 
          title="Retiros Hoy" 
          value={formatCurrency(stats.retiros_hoy)} 
          change={-2.1} 
          icon={DollarSign} 
          color="from-rose-500 to-orange-600"
          delay={0.3}
        />
        <StatCard 
          title="Balance Sistema" 
          value={formatCurrency(stats.balance_total)} 
          change={+8.5} 
          icon={TrendingUp} 
          color="from-violet-500 to-purple-600"
          delay={0.4}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Real-time Activity Feed */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="lg:col-span-2 bg-[#161926] border border-white/5 rounded-[40px] p-8 relative overflow-hidden shadow-2xl"
        >
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500">
                <BarChart3 size={20} />
              </div>
              <div>
                <h3 className="text-xl font-black text-white uppercase tracking-tighter italic">Actividad Operativa</h3>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Últimas 24 horas</p>
              </div>
            </div>
            <div className="flex gap-2">
              <div className="w-3 h-3 rounded-full bg-sav-primary shadow-lg shadow-sav-primary/50" />
              <div className="w-3 h-3 rounded-full bg-slate-700" />
            </div>
          </div>

          <div className="h-64 flex items-end justify-between gap-3 mb-8">
            {[45, 60, 40, 80, 55, 90, 70, 85, 100, 75, 65, 95].map((h, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-3">
                <div 
                  className="w-full bg-gradient-to-t from-sav-primary to-rose-500 rounded-t-xl opacity-20 hover:opacity-100 transition-opacity duration-300" 
                  style={{ height: `${h}%` }}
                />
                <span className="text-[8px] font-bold text-slate-600 uppercase tracking-tighter">0{i}:00</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-6 pt-8 border-t border-white/5">
            <div className="space-y-1">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Active Users</p>
              <p className="text-2xl font-black text-white tracking-tighter">{stats.usuarios_activos}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Task Throughput</p>
              <p className="text-2xl font-black text-white tracking-tighter">{stats.tareas_completadas}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">System Load</p>
              <p className="text-2xl font-black text-emerald-500 tracking-tighter">OPTIMAL</p>
            </div>
          </div>
        </motion.div>

        {/* Quick Actions & System Status */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6 }}
          className="space-y-6"
        >
          <div className="bg-gradient-to-br from-sav-primary to-rose-600 rounded-[40px] p-8 text-white relative overflow-hidden shadow-2xl shadow-sav-primary/20">
            <div className="absolute top-0 right-0 p-8 opacity-20">
              <Target size={120} />
            </div>
            <h3 className="text-2xl font-black italic uppercase tracking-tighter mb-2">Meta Semanal</h3>
            <p className="text-[10px] font-black uppercase tracking-widest mb-6 opacity-80">Volumen de Transacciones</p>
            <div className="text-4xl font-black mb-8 tracking-tighter">84.5%</div>
            <div className="w-full bg-white/20 h-3 rounded-full overflow-hidden mb-2 shadow-inner">
              <div className="bg-white h-full w-[84.5%] rounded-full" />
            </div>
            <p className="text-[9px] font-bold uppercase tracking-widest text-white/70">Faltan 15.5% para completar</p>
          </div>

          <div className="bg-[#161926] border border-white/5 rounded-[40px] p-8 shadow-xl">
            <h4 className="text-xs font-black text-slate-500 uppercase tracking-[0.3em] mb-6">Alertas del Sistema</h4>
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-3 rounded-2xl bg-white/5 border border-white/5">
                <div className="p-2 rounded-xl bg-sav-primary/10 text-sav-primary">
                  <Send size={16} />
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="text-[10px] font-black text-white truncate uppercase tracking-tight">Bot Telegram Activo</p>
                  <p className="text-[8px] font-bold text-slate-500 uppercase">Instancia Principal OK</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-3 rounded-2xl bg-white/5 border border-white/5 opacity-50">
                <div className="p-2 rounded-xl bg-slate-800 text-slate-500">
                  <Bell size={16} />
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="text-[10px] font-black text-slate-400 truncate uppercase tracking-tight">Mantenimiento SQL</p>
                  <p className="text-[8px] font-bold text-slate-600 uppercase italic">Próximo: 24 Abril</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
