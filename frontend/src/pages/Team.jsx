import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import Header from '../components/Header.jsx';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { CONFIG } from '../config.js';
import { 
  Users, UserPlus, TrendingUp, Info, 
  ShieldAlert, ChevronRight, Copy, Check,
  Target, Zap, Gem, Star, PieChart as PieChartIcon,
  ChevronDown, ArrowDownCircle, FileText
} from 'lucide-react';

// UI Components
import { Card } from '../components/ui/Card.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { cn } from '../lib/utils/cn';
import { formatCurrency } from '../lib/utils/format';
import { displayLevelCode } from '../lib/displayLevel.js';

import { motion, AnimatePresence } from 'framer-motion';

const PieChart = ({ data }) => {
  const chartData = Array.isArray(data) ? data : [];
  if (chartData.length === 0) return (
    <div className="flex flex-col items-center justify-center p-8 text-center space-y-2">
      <div className="w-16 h-16 rounded-full border-4 border-dashed border-bcb-muted/20" />
      <p className="text-[8px] font-black text-bcb-muted uppercase tracking-widest">Sin datos de ingresos</p>
    </div>
  );

  const total = chartData.reduce((acc, item) => acc + (Number(item.value) || 0), 0);
  if (total === 0) return (
    <div className="flex flex-col items-center justify-center p-8 text-center space-y-2">
      <div className="w-16 h-16 rounded-full border-4 border-dashed border-bcb-muted/20" />
      <p className="text-[8px] font-black text-bcb-muted uppercase tracking-widest">Sin ingresos registrados</p>
    </div>
  );

  let cumulativePercent = 0;
  const colors = [
    { from: '#3b82f6', to: '#2563eb' }, // Azul
    { from: '#10b981', to: '#059669' }, // Verde
    { from: '#f59e0b', to: '#d97706' }, // Ámbar
    { from: '#ef4444', to: '#dc2626' }, // Rojo
    { from: '#8b5cf6', to: '#7c3aed' }, // Violeta
  ];

  const getCoordinatesForPercent = (percent) => {
    const x = Math.cos(2 * Math.PI * percent);
    const y = Math.sin(2 * Math.PI * percent);
    return [x, y];
  };

  return (
    <div className="flex flex-col sm:flex-row items-center gap-8 sm:gap-12 p-2">
      <div className="relative w-40 h-40 sm:w-48 sm:h-48 group">
        <svg viewBox="-1.1 -1.1 2.2 2.2" className="transform -rotate-90 w-full h-full drop-shadow-xl">
          <defs>
            {chartData.map((_, idx) => (
              <linearGradient key={`grad-${idx}`} id={`grad-${idx}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={colors[idx % colors.length].from} />
                <stop offset="100%" stopColor={colors[idx % colors.length].to} />
              </linearGradient>
            ))}
          </defs>
          {chartData.map((item, idx) => {
            const val = Number(item.value) || 0;
            if (val <= 0) return null;
            const [startX, startY] = getCoordinatesForPercent(cumulativePercent);
            const percent = val / total;
            cumulativePercent += percent;
            const [endX, endY] = getCoordinatesForPercent(cumulativePercent);
            const largeArcFlag = percent > 0.5 ? 1 : 0;
            const pathData = `M ${startX} ${startY} A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY} L 0 0`;
            return (
              <motion.path 
                key={idx} 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.1, duration: 0.5 }}
                d={pathData} 
                fill={`url(#grad-${idx})`}
                stroke="rgba(255,255,255,0.2)"
                strokeWidth="0.01"
                className="hover:brightness-110 transition-all cursor-pointer" 
              />
            );
          })}
          {/* Inner circle for Donut effect */}
          <circle cx="0" cy="0" r="0.65" fill="#ffffff" />
        </svg>
        
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center text-center"
          >
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-0.5">Total</p>
            <div className="flex items-baseline gap-0.5">
              <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tighter">
                {formatCurrency(total, 'Bs').trim()}
              </span>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="flex-1 w-full space-y-4">
        {chartData.filter(item => Number(item.value) > 0).map((item, idx) => {
          const val = Number(item.value) || 0;
          const percent = (val / total) * 100;
          return (
            <motion.div 
              key={idx} 
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.3 + idx * 0.1 }}
              className="space-y-1.5"
            >
              <div className="flex justify-between items-end">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full shadow-lg" style={{ background: `linear-gradient(135deg, ${colors[idx % colors.length].from}, ${colors[idx % colors.length].to})` }} />
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{item.name.charAt(0).toUpperCase() + item.name.slice(1)}</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-xs font-black text-slate-900">{percent.toFixed(1)}%</span>
                  <span className="text-[9px] font-bold text-slate-400">{formatCurrency(val)}</span>
                </div>
              </div>
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${percent}%` }}
                  transition={{ duration: 1, delay: 0.5 + idx * 0.1 }}
                  className="h-full rounded-full"
                  style={{ background: `linear-gradient(90deg, ${colors[idx % colors.length].from}, ${colors[idx % colors.length].to})` }}
                />
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default function Team() {
  const { user } = useAuth();
  const canManagePasanteWithdrawals = !['internar', 'pasantia'].includes(String(user?.nivel_codigo || '').toLowerCase());
  const [data, setData] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  
  const [referrals, setReferrals] = useState([]);
  const [referralsLoading, setReferralsLoading] = useState(true);
  const [selectedNivel, setSelectedNivel] = useState('A');
  const [expandedUserId, setExpandedUserId] = useState(null);
  const [isReferralsCollapsed, setIsReferralsCollapsed] = useState(false);
  
  const [pendingWithdrawals, setPendingWithdrawals] = useState([]);
  const [withdrawalsLoading, setWithdrawalsLoading] = useState(false);
  const teamSnapshotRef = useRef('');
  const pendingWithdrawalsSnapshotRef = useRef('');

  const fetchTeam = async (isSilent = false) => {
    if (!isSilent && !data) setLoading(true);
    try {
      const [teamRes, statsRes] = await Promise.all([
        api.users.teamReport(),
        api.get('/users/stats')
      ]);
      const nextSnapshot = `${JSON.stringify(teamRes || {})}::${JSON.stringify(statsRes || {})}`;
      if (teamSnapshotRef.current !== nextSnapshot) {
        teamSnapshotRef.current = nextSnapshot;
        setData(teamRes);
        setStats(statsRes);
      }
    } catch (err) {
      console.error('Error fetching team/stats:', err);
      if (!data) setData({ resumen: {}, niveles: [] });
    } finally {
      setLoading(false);
    }
  };

  const fetchReferrals = async (isSilent = false) => {
    if (!isSilent && referrals.length === 0) setReferralsLoading(true);
    try {
      const res = await api.get(`/users/my-referrals?nivel=${selectedNivel}`);
      setReferrals(res.items || []);
    } catch (err) {
      console.error('Error fetching referrals:', err);
    } finally {
      setReferralsLoading(false);
    }
  };

  useEffect(() => {
    fetchTeam();
    const interval = setInterval(() => fetchTeam(true), 15000);
    return () => clearInterval(interval);
  }, []);

  const fetchPendingWithdrawals = async (isSilent = false) => {
    if (!canManagePasanteWithdrawals) {
      pendingWithdrawalsSnapshotRef.current = '[]';
      setPendingWithdrawals([]);
      setWithdrawalsLoading(false);
      return;
    }

    if (!isSilent && pendingWithdrawals.length === 0) setWithdrawalsLoading(true);
    try {
      const res = await api.get('/users/my-team/pending-withdrawals');
      const nextItems = res || [];
      const nextSnapshot = JSON.stringify(nextItems);
      if (pendingWithdrawalsSnapshotRef.current !== nextSnapshot) {
        pendingWithdrawalsSnapshotRef.current = nextSnapshot;
        setPendingWithdrawals(nextItems);
      }
    } catch (err) {
      console.error('Error fetching pending withdrawals:', err);
    } finally {
      if (!isSilent) setWithdrawalsLoading(false);
    }
  };

  const approveWithdrawal = async (retiroId) => {
    try {
      await api.post(`/users/my-team/withdrawals/${retiroId}/approve`);
      await fetchPendingWithdrawals();
    } catch (err) {
      console.error('Error approving withdrawal:', err);
    }
  };

  const rejectWithdrawal = async (retiroId) => {
    try {
      await api.post(`/users/my-team/withdrawals/${retiroId}/reject`, { motivo: 'Rechazado por reclutador' });
      await fetchPendingWithdrawals();
    } catch (err) {
      console.error('Error rejecting withdrawal:', err);
    }
  };

  useEffect(() => {
    fetchReferrals();
    if (canManagePasanteWithdrawals) {
      fetchPendingWithdrawals();
    } else {
      pendingWithdrawalsSnapshotRef.current = '[]';
      setPendingWithdrawals([]);
    }
    const interval = setInterval(() => {
      fetchReferrals(true);
      if (canManagePasanteWithdrawals) {
        fetchPendingWithdrawals(true);
      }
    }, 15000);
    return () => clearInterval(interval);
  }, [selectedNivel, canManagePasanteWithdrawals]);

  const handleCopy = async () => {
    if (!user?.codigo_invitacion) return;
    try {
      const invitationLink = `${CONFIG.WEB_URL}/register?ref=${user.codigo_invitacion}`;
      await navigator.clipboard.writeText(invitationLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };



  if (loading && !data) {
    return (
      <Layout>
        <div className="p-10 flex flex-col items-center justify-center min-h-[70vh] space-y-6">
          <div className="w-16 h-16 border-4 border-slate-200 border-t-bcb-primary rounded-full animate-spin" />
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 animate-pulse">Sincronizando Equipo</p>
        </div>
      </Layout>
    );
  }

  const resumen = data?.resumen || {};
  const niveles = Array.isArray(data?.niveles) ? data.niveles : [];
  return (
    <Layout>
      <Header title="Informe del equipo" />
      
      <main className="px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8 pb-32 animate-fade">
        {/* Invitation Banner */}
        <Card className="p-6 sm:p-8 bg-bcb-primary text-white shadow-xl shadow-bcb-primary/20 relative overflow-hidden rounded-[2rem] sm:rounded-[3rem] group">
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
            <UserPlus size={100} />
          </div>
          <div className="relative z-10 space-y-4 sm:space-y-6">
            <div className="space-y-1">
              <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight">Expande tu Red</h2>
              <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest opacity-80">Invita amigos y gana comisiones de por vida.</p>
            </div>
            
            <div className="flex flex-col gap-3">
              <div className="flex-1 bg-white/20 backdrop-blur-md rounded-2xl p-4 border border-white/20 flex items-center justify-between">
                <div className="flex-1 min-w-0 space-y-0.5">
                  <p className="text-[8px] font-black uppercase tracking-widest opacity-60">Enlace de Invitación</p>
                  <p className="text-lg font-black tracking-tighter truncate">
                    {user?.codigo_invitacion ? `${CONFIG.WEB_URL}/register?ref=${user.codigo_invitacion}` : '---'}
                  </p>
                </div>
                <button 
                  onClick={handleCopy}
                  className="p-3 bg-white text-bcb-primary rounded-xl shadow-lg active:scale-90 transition-all"
                >
                  {copied ? <Check size={20} /> : <Copy size={20} />}
                </button>
              </div>
              <Link to="/invitar" className="sm:w-full">
                <Button variant="secondary" icon={Zap} className="w-full h-full py-4 sm:px-8 bg-white/10 border-white/20 text-white hover:bg-white/20">
                  Ver Más Opciones
                </Button>
              </Link>
            </div>
          </div>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <Card className="p-5 sm:p-7 bg-white border-2 border-slate-100 shadow-xl shadow-slate-200/50 rounded-2xl sm:rounded-[2.5rem] space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest truncate">Ganancia Total</span>
              <TrendingUp size={16} className="text-bcb-primary shrink-0" />
            </div>
            <p className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tighter truncate">{(Number(resumen.ingresos_totales) || 0).toFixed(2)}</p>
          </Card>
          <Card className="p-5 sm:p-7 bg-white border-2 border-slate-100 shadow-xl shadow-slate-200/50 rounded-2xl sm:rounded-[2.5rem] space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest truncate">Miembros</span>
              <Users size={16} className="text-blue-600 shrink-0" />
            </div>
            <p className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tighter truncate">{resumen.total_miembros || 0}</p>
          </Card>
        </div>

        {/* Pending Withdrawals Section */}
        {canManagePasanteWithdrawals && (
        <section className="px-1 space-y-4">
          <div className="flex items-center gap-2">
            <ArrowDownCircle size={16} className="text-bcb-primary" />
            <h3 className="text-[10px] sm:text-[11px] font-black text-slate-900 uppercase tracking-[0.2em]">Retiros Pendientes de Pasantes</h3>
          </div>
          
          <Card className="bg-white border-slate-200 shadow-xl shadow-slate-200/50 rounded-[1.5rem] sm:rounded-[2.5rem] overflow-hidden">
            {withdrawalsLoading ? (
              <div className="p-10 flex flex-col items-center justify-center space-y-4">
                <div className="w-8 h-8 border-2 border-slate-200 border-t-bcb-primary rounded-full animate-spin" />
                <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Cargando retiros...</p>
              </div>
            ) : pendingWithdrawals.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {pendingWithdrawals.map((retiro) => (
                  <div key={retiro.id} className="p-5 sm:p-6 flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-bcb-primary/10 border-2 border-bcb-primary/20 flex items-center justify-center text-bcb-primary">
                          <ArrowDownCircle size={24} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-tight truncate">{retiro.usuario_nombre || '---'}</p>
                          <p className="text-[9px] text-slate-500 font-mono tracking-widest">
                            {retiro.telefono || '---'}
                          </p>
                        </div>
                      </div>
                      <p className="text-xl sm:text-2xl font-black text-slate-900 tracking-tighter">-{Number(retiro.monto).toFixed(2)} Bs</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <Button 
                        onClick={() => approveWithdrawal(retiro.id)}
                        variant="secondary" 
                        className="h-12 sm:h-14 bg-emerald-500 text-white border-emerald-500 hover:bg-emerald-600"
                      >
                        Aprobar
                      </Button>
                      <Button 
                        onClick={() => rejectWithdrawal(retiro.id)} 
                        variant="secondary" 
                        className="h-12 sm:h-14 bg-red-500 text-white border-red-500 hover:bg-red-600"
                      >
                        Rechazar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-200">
                  <FileText size={28} />
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Sin retiros pendientes</p>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">No hay retiros pendientes de tus pasantes.</p>
                </div>
              </div>
            )}
          </Card>
        </section>
        )}

        {/* Módulo: Análisis de Ingresos */}
        <section className="px-1">
          <Card className="bg-white border-slate-200 p-6 sm:p-8 rounded-[1.5rem] sm:rounded-[2.5rem] shadow-xl shadow-slate-200/50 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <h3 className="text-[10px] sm:text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                  <PieChartIcon size={14} className="text-bcb-primary" /> Análisis de Ingresos
                </h3>
                <p className="text-[8px] sm:text-[9px] text-slate-400 font-bold uppercase tracking-widest">Desglose de tus ganancias acumuladas.</p>
              </div>
            </div>
            
            <PieChart data={stats?.pie_chart || []} />
          </Card>
        </section>

        {/* Módulo: Porcentaje de Ganancias por Red */}
        <section className="px-1">
          <Card className="bg-bcb-primary/5 border-bcb-primary/10 p-5 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:rotate-12 transition-transform">
              <Zap size={60} className="text-bcb-primary" />
            </div>
            <div className="relative z-10 space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-bcb-primary/10 flex items-center justify-center text-bcb-primary">
                  <Star size={16} />
                </div>
                <h3 className="text-[10px] sm:text-[11px] font-black text-slate-900 uppercase tracking-[0.2em]">Comisiones por Niveles</h3>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-white/80 backdrop-blur-sm p-3 rounded-xl border border-slate-200 text-center shadow-sm">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter mb-1">Nivel A</p>
                  <p className="text-sm sm:text-base font-black text-bcb-primary">10%</p>
                </div>
                <div className="bg-white/80 backdrop-blur-sm p-3 rounded-xl border border-slate-200 text-center shadow-sm">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter mb-1">Nivel B</p>
                  <p className="text-sm sm:text-base font-black text-bcb-primary">3.5%</p>
                </div>
                <div className="bg-white/80 backdrop-blur-sm p-3 rounded-xl border border-slate-200 text-center shadow-sm">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter mb-1">Nivel C</p>
                  <p className="text-sm sm:text-base font-black text-bcb-primary">1%</p>
                </div>
              </div>
            </div>
          </Card>
        </section>

        {/* Breakdown by Levels */}
        <section className="px-1 space-y-4">
          <div className="flex items-center gap-2 px-1">
            <Target size={16} className="text-bcb-primary" />
            <h3 className="text-[10px] sm:text-[11px] font-black text-slate-900 uppercase tracking-[0.2em]">Estructura de Red</h3>
          </div>
          
          <div className="space-y-3">
            {niveles.map((n, i) => (
              <Card key={i} className="bg-white border-slate-200 p-4 sm:p-5 flex items-center justify-between rounded-2xl sm:rounded-[2rem] shadow-lg shadow-slate-200/50 hover:border-bcb-primary/20 transition-all group">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-bcb-primary/5 flex items-center justify-center text-bcb-primary group-hover:bg-bcb-primary group-hover:text-white transition-all duration-500">
                    <span className="text-sm sm:text-base font-black">L{i+1}</span>
                  </div>
                  <div>
                    <p className="text-[10px] sm:text-[11px] font-black text-slate-900 uppercase tracking-tight">Nivel {n.nivel}</p>
                    <p className="text-[8px] sm:text-[9px] font-bold text-slate-400 uppercase tracking-widest">{n.total_miembros || 0} Integrantes</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs sm:text-sm font-black text-slate-900">{(Number(n.monto_recarga) || 0).toFixed(2)} Bs</p>
                  <p className="text-[8px] font-black text-bcb-success uppercase tracking-widest">+{n.porcentaje}% Comisión</p>
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* Miembros por nivel */}
        <section className="space-y-4">
          <button
            onClick={() => setIsReferralsCollapsed(!isReferralsCollapsed)}
            className="w-full flex items-center justify-between px-1 text-left"
          >
            <div className="flex flex-col gap-1">
              <h3 className="text-[10px] sm:text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                <Users size={14} className="text-bcb-primary" /> Miembros por nivel
              </h3>
              <p className="text-[8px] sm:text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                Gestiona los integrantes de tu red.
              </p>
            </div>
            <motion.div
              animate={{ rotate: isReferralsCollapsed ? -90 : 0 }}
              transition={{ duration: 0.3 }}
            >
              <ChevronRight size={20} className="text-slate-400" />
            </motion.div>
          </button>

          <AnimatePresence>
            {!isReferralsCollapsed && (
              <motion.div
                initial={{ height: 0, opacity: 0, x: -20 }}
                animate={{ height: 'auto', opacity: 1, x: 0 }}
                exit={{ height: 0, opacity: 0, x: -20 }}
                transition={{ duration: 0.4, ease: 'easeInOut' }}
                className="overflow-hidden"
              >
                <div className="flex gap-2 px-1 mb-4">
                  {['A', 'B', 'C'].map((nivel) => (
                    <button
                      key={nivel}
                      onClick={() => setSelectedNivel(nivel)}
                      className={cn(
                        "flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border",
                        selectedNivel === nivel 
                          ? "bg-bcb-primary text-white border-bcb-primary shadow-lg shadow-bcb-primary/20" 
                          : "bg-white text-slate-400 border-slate-200 hover:border-bcb-primary/20"
                      )}
                    >
                      Nivel {nivel}
                    </button>
                  ))}
                </div>

                <Card className="bg-white border-slate-200 shadow-xl shadow-slate-200/50 rounded-[1.5rem] sm:rounded-[2.5rem] overflow-hidden">
                  <div className="divide-y divide-slate-100">
                    {referralsLoading && referrals.length === 0 ? (
                      <div className="p-10 flex flex-col items-center justify-center space-y-4">
                        <div className="w-8 h-8 border-2 border-slate-200 border-t-bcb-primary rounded-full animate-spin" />
                        <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Cargando nivel {selectedNivel}...</p>
                      </div>
                    ) : referrals.length > 0 ? (
                      referrals.map((ref, idx) => (
                        <div key={ref.id} className="border-b border-slate-100 last:border-0">
                          <motion.div 
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            onClick={() => setExpandedUserId(expandedUserId === ref.id ? null : ref.id)}
                            className="p-5 sm:p-6 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer"
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-slate-100 border-2 border-slate-200 flex items-center justify-center text-slate-500 font-black text-sm sm:text-base shadow-sm">
                                {ref.nombre_usuario?.charAt(0).toUpperCase() || '?'}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-tight truncate">
                                  {ref.nombre_usuario}
                                </p>
                                <p class="text-[10px] sm:text-[11px] font-bold text-slate-500 tracking-[0.1em]">
                                  {ref.telefono}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <div className="text-right space-y-1">
                                <div className="inline-block px-2.5 py-1 rounded-lg bg-bcb-primary/10 border-2 border-bcb-primary/20">
                                  <p className="text-[9px] sm:text-[10px] font-black text-bcb-primary uppercase tracking-widest">
                                    {displayLevelCode(ref.nivel_codigo)}
                                  </p>
                                </div>
                                <p className="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-tighter">
                                  {ref.created_at ? new Date(ref.created_at).toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '---'}
                                </p>
                              </div>
                              
                              <motion.div
                                animate={{ rotate: expandedUserId === ref.id ? 90 : 0 }}
                                transition={{ duration: 0.2 }}
                              >
                                <ChevronRight size={20} className="text-slate-400" />
                              </motion.div>
                            </div>
                          </motion.div>

                          <AnimatePresence>
                            {expandedUserId === ref.id && (
                              <motion.div
                                initial={{ width: 0, opacity: 0, overflow: 'hidden' }}
                                animate={{ width: '100%', opacity: 1, overflow: 'visible' }}
                                exit={{ width: 0, opacity: 0, overflow: 'hidden' }}
                                transition={{ duration: 0.3, ease: 'easeInOut' }}
                              >
                                <div className="px-5 sm:px-6 pb-5 sm:pb-6 bg-slate-50/50">
                                  <div className="grid grid-cols-2 gap-3 text-xs">
                                    <div className="space-y-1">
                                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.1em]">ID Usuario</p>
                                      <p className="font-black text-slate-800 truncate">{ref.id}</p>
                                    </div>
                                    <div className="space-y-1">
                                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.1em]">Fecha Registro</p>
                                      <p className="font-black text-slate-800">
                                        {ref.created_at ? new Date(ref.created_at).toLocaleDateString('es-BO', { 
                                          day: '2-digit', 
                                          month: 'long', 
                                          year: 'numeric' 
                                        }) : '---'}
                                      </p>
                                    </div>
                                    {ref.nivel && (
                                      <div className="space-y-1">
                                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.1em]">Nivel</p>
                                        <p className="font-black text-slate-800">{ref.nivel}</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      ))
                    ) : (
                      <div className="p-12 flex flex-col items-center justify-center text-center space-y-4">
                        <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-200">
                          <Users size={28} />
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Sin miembros</p>
                          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">No hay usuarios registrados en el Nivel {selectedNivel}.</p>
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Info Card */}
        <Card className="p-6 bg-slate-50 border-slate-100 rounded-[2rem] flex items-center gap-4">
          <div className="w-12 h-12 bg-bcb-primary/5 rounded-2xl flex items-center justify-center text-bcb-primary">
            <Info size={24} />
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Soporte de Red</p>
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
              Si tienes problemas con tus comisiones, contacta a tu asesor de cuenta.
            </p>
          </div>
        </Card>
      </main>
    </Layout>
  );
}
