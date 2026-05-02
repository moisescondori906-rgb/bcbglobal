import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { 
  User, Users, UserPlus, FileText, Gift, 
  ShieldCheck, CreditCard, ChevronRight, 
  TrendingUp, Trophy, Copy, Check, Lock, 
  Wallet, LogOut, Settings, Bell, Info,
  Sparkles, Zap
} from 'lucide-react';
import { displayLevelCode } from '../lib/displayLevel.js';

// UI Components
import { Card } from '../components/ui/Card.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { cn } from '../lib/utils/cn';

export default function Profile() {
  const { user, logout, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [copied, setCopied] = useState(false);
  const [niveles, setNiveles] = useState([]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [statsData, nivelesData] = await Promise.all([
          api.users.stats(),
          api.levels.list()
        ]);
        setStats(statsData);
        setNiveles(nivelesData || []);
      } catch (err) {
        console.error(err);
      }
    };
    fetchStats();
    
    // El refresh de datos ahora se maneja por polling o navegación, 
    // eliminamos Supabase para coherencia con MySQL.
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [user?.id]);

  const handleCopy = () => {
    if (!user?.codigo_invitacion) return;
    navigator.clipboard.writeText(user.codigo_invitacion);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const menuItems = [
    { to: '/vip', icon: TrendingUp, label: 'Membresía VIP', color: 'text-sav-primary', bg: 'bg-sav-primary/10' },
    { to: '/invitar', icon: UserPlus, label: 'Invitar Amigos', color: 'text-orange-400', bg: 'bg-orange-500/10' },
    { to: '/equipo', icon: Users, label: 'Mi Equipo', color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { to: '/movimientos', icon: FileText, label: 'Movimientos', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { to: '/seguridad', icon: ShieldCheck, label: 'Seguridad', color: 'text-amber-400', bg: 'bg-amber-500/10' },
    { to: '/vincular-tarjeta', icon: CreditCard, label: 'Método de Pago', color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
    { to: '/acerca-de', icon: Info, label: 'Acerca de Nosotros', color: 'text-sav-primary', bg: 'bg-sav-primary/10' },
  ];

  return (
    <Layout>
      <header className="px-4 sm:px-6 py-8 sm:py-10 space-y-6 sm:space-y-8 relative overflow-hidden">
        {/* Profile Header */}
        <div className="flex items-center gap-4 sm:gap-6">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-tr from-sav-primary to-rose-500 rounded-2xl sm:rounded-3xl blur opacity-20 group-hover:opacity-40 transition-opacity" />
            <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl sm:rounded-3xl bg-white border border-black/5 flex items-center justify-center text-sav-primary shadow-xl overflow-hidden shrink-0">
              <User size={32} className="sm:w-[40px] sm:h-[40px]" strokeWidth={1.5} />
              <div className="absolute bottom-0 left-0 w-full h-1.5 bg-sav-primary opacity-20" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 sm:w-7 sm:h-7 bg-sav-success rounded-lg sm:rounded-xl border-2 sm:border-4 border-sav-dark flex items-center justify-center shadow-lg">
              <Check size={12} className="text-white sm:w-[14px] sm:h-[14px]" strokeWidth={3} />
            </div>
          </div>
          
          <div className="space-y-1 min-w-0">
            <h2 className="text-xl sm:text-2xl font-black text-gray-900 uppercase tracking-tight leading-none truncate">
              {user?.nombre_usuario}
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="info" className="px-1.5 py-0.5 text-[8px] sm:text-[10px]">
                {displayLevelCode(user?.nivel_codigo || 'internar')}
              </Badge>
              <span className="text-[8px] sm:text-[10px] font-bold text-sav-muted uppercase tracking-widest truncate">ID: {user?.id?.slice(0, 8)}</span>
            </div>
          </div>
        </div>

        {/* Invitation Code */}
        {user?.codigo_invitacion && (
          <div className="bg-white rounded-[1.5rem] sm:rounded-[2rem] p-5 sm:p-7 shadow-xl shadow-black/5 border border-black/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 rotate-12">
              <UserPlus size={80} className="sm:w-[100px] sm:h-[100px]" />
            </div>
            <div className="relative z-10 space-y-3 sm:space-y-4">
              <div className="flex items-center gap-2">
                <UserPlus size={14} className="text-sav-primary sm:w-[16px] sm:h-[16px]" />
                <h3 className="text-[10px] sm:text-[11px] font-black text-gray-900 uppercase tracking-[0.2em]">Código de Invitación</h3>
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="flex-1 bg-slate-50 border border-slate-100 rounded-xl sm:rounded-2xl px-4 sm:px-6 py-3 sm:py-4 min-w-0">
                  <p className="text-base sm:text-lg font-black text-gray-900 uppercase tracking-[0.2em] truncate text-center">{user.codigo_invitacion}</p>
                </div>
                <button 
                  onClick={handleCopy}
                  className={cn(
                    "w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center transition-all shadow-lg active:scale-90 shrink-0",
                    copied ? "bg-sav-success text-white" : "bg-white text-gray-900 border border-slate-200"
                  )}
                >
                  {copied ? <Check size={18} className="sm:w-[20px] sm:h-[20px]" /> : <Copy size={18} className="sm:w-[20px] sm:h-[20px]" />}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Wallet Balance Cards */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <div className="bg-white rounded-[1.5rem] sm:rounded-[2rem] p-4 sm:p-6 shadow-lg shadow-black/5 border border-black/5 space-y-2.5 sm:space-y-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-sav-primary/10 flex items-center justify-center text-sav-primary">
              <Wallet size={18} className="sm:w-[20px] sm:h-[20px]" />
            </div>
            <div className="space-y-0.5">
              <p className="text-[8px] sm:text-[9px] font-black text-sav-muted uppercase tracking-widest truncate">Saldo Principal</p>
              <p className="text-lg sm:text-xl font-black text-gray-900 truncate">{(user?.saldo_principal || 0).toLocaleString()} <span className="text-[9px] text-sav-muted font-bold">BOB</span></p>
            </div>
          </div>
          <div className="bg-white rounded-[1.5rem] sm:rounded-[2rem] p-4 sm:p-6 shadow-lg shadow-black/5 border border-black/5 space-y-2.5 sm:space-y-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-sav-success/10 flex items-center justify-center text-sav-success">
              <TrendingUp size={18} className="sm:w-[20px] sm:h-[20px]" />
            </div>
            <div className="space-y-0.5">
              <p className="text-[8px] sm:text-[9px] font-black text-sav-muted uppercase tracking-widest truncate">Comisiones</p>
              <p className="text-lg sm:text-xl font-black text-gray-900 truncate">{(user?.saldo_comisiones || 0).toLocaleString()} <span className="text-[9px] text-sav-muted font-bold">BOB</span></p>
            </div>
          </div>
        </div>
      </header>

      <main className="px-4 sm:px-5 space-y-6 pb-10">
        {/* Investment Opportunities - Quick Access */}
        <section className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <Trophy size={16} className="text-sav-primary" />
              <h3 className="text-[10px] sm:text-[11px] font-black text-gray-900 uppercase tracking-[0.2em]">Oportunidades GLOBAL</h3>
            </div>
            <Link to="/vip" className="text-[9px] font-black text-sav-primary uppercase tracking-widest flex items-center gap-1">
              Ver Todo <ChevronRight size={12} />
            </Link>
          </div>

          <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-4 px-1 no-scrollbar snap-x">
            {Array.isArray(niveles) && niveles.filter(n => (n.deposito || n.costo) > 0).map((n, i) => {
              const esActual = n.id === user?.nivel_id;
              const rentaDiaria = n.ingreso_diario || (Number(n.num_tareas_diarias || 0) * Number(n.ganancia_tarea || 0));
              return (
                <Link 
                  key={n.id} 
                  to="/vip"
                  className={cn(
                    "min-w-[140px] sm:min-w-[160px] p-4 sm:p-5 rounded-[1.5rem] sm:rounded-[2rem] border transition-all snap-start relative overflow-hidden group",
                    esActual ? "bg-sav-primary/10 border-sav-primary/30" : "bg-white border-black/5 shadow-sm"
                  )}
                >
                  <div className="space-y-3 relative z-10 min-w-0">
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-[9px] sm:text-[10px] font-black text-gray-900 uppercase tracking-tighter truncate">{n.nombre}</span>
                      {esActual && <div className="w-1.5 h-1.5 rounded-full bg-sav-success animate-pulse shrink-0" />}
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-[7px] sm:text-[8px] font-black text-sav-muted uppercase tracking-widest leading-none">Renta Diaria</p>
                      <p className="text-base sm:text-lg font-black text-gray-900 truncate">+{Number(rentaDiaria || 0).toFixed(2)}</p>
                    </div>
                    <div className="pt-2 sm:pt-3 border-t border-black/5 flex justify-between items-center">
                      <span className="text-[7px] sm:text-[8px] font-bold text-sav-muted uppercase">Inversión</span>
                      <span className="text-[9px] sm:text-[10px] font-black text-gray-900">{Number(n.deposito).toLocaleString()}</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Global Financial Stats */}
        <section className="bg-white rounded-[1.5rem] sm:rounded-[2rem] p-5 sm:p-7 shadow-xl shadow-black/5 border border-black/5 space-y-5 sm:space-y-6">
          <div className="flex items-center gap-2 px-1">
            <TrendingUp size={16} className="text-sav-primary" />
            <h3 className="text-[10px] sm:text-[11px] font-black text-gray-900 uppercase tracking-[0.2em]">Resumen Financiero</h3>
          </div>
          
          <div className="grid grid-cols-2 gap-4 sm:gap-6 relative">
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-px h-8 sm:h-10 bg-black/5" />
            <div className="space-y-1 min-w-0 px-1">
              <p className="text-[8px] sm:text-[9px] font-black text-sav-muted uppercase tracking-widest truncate">Total Ganado</p>
              <p className="text-base sm:text-lg font-black text-gray-900 truncate">{(stats?.total_acumulado || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="space-y-1 text-right min-w-0 px-1">
              <p className="text-[8px] sm:text-[9px] font-black text-sav-muted uppercase tracking-widest truncate">Tareas Hoy</p>
              <p className="text-base sm:text-lg font-black text-sav-success truncate">+{stats?.tareas_hoy || 0}</p>
            </div>
          </div>
        </section>

        {/* Action Menu */}
        <div className="bg-white rounded-[1.5rem] sm:rounded-[2rem] shadow-xl shadow-black/5 border border-black/5 overflow-hidden divide-y divide-black/5">
          {menuItems.map((item, i) => (
            <Link 
              key={i} 
              to={item.to}
              className="flex items-center justify-between p-4 sm:p-5 hover:bg-black/5 transition-colors group active:bg-black/5"
            >
              <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-sav-muted group-hover:text-sav-primary group-hover:bg-sav-primary/10 transition-all shrink-0">
                  <item.icon size={18} className="sm:w-[20px] sm:h-[20px]" />
                </div>
                <span className="text-[10px] sm:text-[11px] font-black text-gray-900 uppercase tracking-wider truncate">{item.label}</span>
              </div>
              <ChevronRight size={16} className="text-sav-muted group-hover:text-sav-primary transition-colors shrink-0 ml-2" />
            </Link>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="pt-4 space-y-4 pb-12">
          <Button 
            variant="danger" 
            className="w-full h-14 sm:h-16 rounded-2xl sm:rounded-3xl text-[11px] sm:text-xs font-black tracking-[0.2em] shadow-xl shadow-sav-error/20 active:scale-[0.98]"
            onClick={logout}
            icon={LogOut}
          >
            CERRAR SESIÓN
          </Button>
          
          <div className="flex flex-col items-center gap-2 py-4 opacity-40">
            <div className="flex items-center gap-2">
              <ShieldCheck size={14} />
              <p className="text-[8px] font-black uppercase tracking-[0.4em]">Seguridad Institucional BCB</p>
            </div>
          </div>
        </div>
      </main>
    </Layout>
  );
}
