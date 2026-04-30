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
      <header className="px-6 py-10 space-y-8 relative overflow-hidden">
        {/* Profile Header */}
        <div className="flex items-center gap-6">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-tr from-sav-primary to-rose-500 rounded-3xl blur opacity-20 group-hover:opacity-40 transition-opacity" />
            <div className="relative w-20 h-20 rounded-3xl bg-white border border-black/5 flex items-center justify-center text-sav-primary shadow-xl overflow-hidden">
              <User size={40} strokeWidth={1.5} />
              <div className="absolute bottom-0 left-0 w-full h-1.5 bg-sav-primary opacity-20" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-sav-success rounded-xl border-4 border-sav-dark flex items-center justify-center shadow-lg">
              <Check size={14} className="text-white" strokeWidth={3} />
            </div>
          </div>
          
          <div className="space-y-1">
            <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight leading-none">
              {user?.nombre_usuario}
            </h2>
            <div className="flex items-center gap-2">
              <Badge variant="info" className="px-2 py-0.5">
                {displayLevelCode(user?.nivel_codigo || 'internar')}
              </Badge>
              <span className="text-[10px] font-bold text-sav-muted uppercase tracking-widest">ID: {user?.id?.slice(0, 8)}</span>
            </div>
          </div>
        </div>

        {/* Invitation Code */}
        {user?.codigo_invitacion && (
          <div className="bg-white rounded-[2rem] p-7 shadow-xl shadow-black/5 border border-black/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 rotate-12">
              <UserPlus size={100} />
            </div>
            <div className="relative z-10 space-y-4">
              <div className="flex items-center gap-2">
                <UserPlus size={16} className="text-sav-primary" />
                <h3 className="text-[11px] font-black text-gray-900 uppercase tracking-[0.2em]">Código de Invitación</h3>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-black/5 border border-black/5 rounded-2xl px-6 py-4">
                  <p className="text-lg font-black text-gray-900 uppercase tracking-[0.2em]">{user.codigo_invitacion}</p>
                </div>
                <button 
                  onClick={handleCopy}
                  className={cn(
                    "w-14 h-14 rounded-2xl flex items-center justify-center transition-all shadow-lg active:scale-90",
                    copied ? "bg-sav-success text-white" : "bg-white text-gray-900 border border-black/5"
                  )}
                >
                  {copied ? <Check size={20} /> : <Copy size={20} />}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Wallet Balance Cards */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-[2rem] p-6 shadow-lg shadow-black/5 border border-black/5 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-sav-primary/10 flex items-center justify-center text-sav-primary">
              <Wallet size={20} />
            </div>
            <div className="space-y-0.5">
              <p className="text-[9px] font-black text-sav-muted uppercase tracking-widest">Saldo Principal</p>
              <p className="text-xl font-black text-gray-900">{(user?.saldo_principal || 0).toLocaleString()} <span className="text-[10px] text-sav-muted font-bold">BOB</span></p>
            </div>
          </div>
          <div className="bg-white rounded-[2rem] p-6 shadow-lg shadow-black/5 border border-black/5 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-sav-success/10 flex items-center justify-center text-sav-success">
              <TrendingUp size={20} />
            </div>
            <div className="space-y-0.5">
              <p className="text-[9px] font-black text-sav-muted uppercase tracking-widest">Comisiones</p>
              <p className="text-xl font-black text-gray-900">{(user?.saldo_comisiones || 0).toLocaleString()} <span className="text-[10px] text-sav-muted font-bold">BOB</span></p>
            </div>
          </div>
        </div>
      </header>

      <main className="px-5 space-y-6 pb-10">
        {/* Investment Opportunities - Quick Access */}
        <section className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <Trophy size={16} className="text-sav-primary" />
              <h3 className="text-[11px] font-black text-gray-900 uppercase tracking-[0.2em]">Oportunidades GLOBAL</h3>
            </div>
            <Link to="/vip" className="text-[9px] font-black text-sav-primary uppercase tracking-widest flex items-center gap-1">
              Ver Todo <ChevronRight size={12} />
            </Link>
          </div>

          <div className="flex gap-4 overflow-x-auto pb-4 px-1 no-scrollbar snap-x">
            {Array.isArray(niveles) && niveles.filter(n => (n.deposito || n.costo) > 0).map((n, i) => {
              const esActual = n.id === user?.nivel_id;
              const rentaDiaria = n.ingreso_diario || (Number(n.num_tareas_diarias || 0) * Number(n.ganancia_tarea || 0));
              return (
                <Link 
                  key={n.id} 
                  to="/vip"
                  className={cn(
                    "min-w-[160px] p-5 rounded-[2rem] border transition-all snap-start relative overflow-hidden group",
                    esActual ? "bg-sav-primary/10 border-sav-primary/30" : "bg-white border-black/5 shadow-sm"
                  )}
                >
                  <div className="space-y-3 relative z-10">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-black text-gray-900 uppercase tracking-tighter">{n.nombre}</span>
                      {esActual && <div className="w-1.5 h-1.5 rounded-full bg-sav-success animate-pulse" />}
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-[8px] font-black text-sav-muted uppercase tracking-widest leading-none">Renta Diaria</p>
                      <p className="text-lg font-black text-gray-900">+{Number(rentaDiaria || 0).toFixed(2)}</p>
                    </div>
                    <div className="pt-3 border-t border-black/5 flex justify-between items-center">
                      <span className="text-[8px] font-bold text-sav-muted uppercase">Inversión</span>
                      <span className="text-[10px] font-black text-gray-900">{Number(n.deposito).toLocaleString()} BOB</span>
                    </div>
                  </div>
                  <div className="absolute right-[-10px] bottom-[-10px] opacity-[0.05] rotate-12 group-hover:rotate-[25deg] transition-transform duration-700 text-gray-900">
                    <TrendingUp size={60} />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Global Financial Stats */}
        <section className="bg-white rounded-[2rem] p-7 shadow-xl shadow-black/5 border border-black/5 space-y-6">
          <div className="flex items-center gap-2">
            <TrendingUp size={16} className="text-sav-primary" />
            <h3 className="text-[11px] font-black text-gray-900 uppercase tracking-[0.2em]">Resumen Financiero</h3>
          </div>
          
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-1">
              <p className="text-[9px] font-black text-sav-muted uppercase tracking-widest">Total Ganado</p>
              <p className="text-lg font-black text-gray-900">{(stats?.total_acumulado || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="space-y-1 text-right border-l border-black/5 pl-6">
              <p className="text-[9px] font-black text-sav-muted uppercase tracking-widest">Tareas Hoy</p>
              <p className="text-lg font-black text-sav-success">+{stats?.tareas_hoy || 0}</p>
            </div>
          </div>
        </section>

        {/* Action Menu */}
        <div className="bg-white rounded-[2rem] shadow-xl shadow-black/5 border border-black/5 overflow-hidden divide-y divide-black/5">
          {menuItems.map((item, i) => (
            <Link 
              key={i} 
              to={item.to}
              className="flex items-center justify-between p-5 hover:bg-black/5 transition-colors group"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-sav-dark border border-black/5 flex items-center justify-center text-sav-muted group-hover:text-sav-primary group-hover:bg-sav-primary/10 transition-all">
                  <item.icon size={20} />
                </div>
                <span className="text-[11px] font-black text-gray-900 uppercase tracking-wider">{item.label}</span>
              </div>
              <div className="flex items-center gap-3">
                <ChevronRight size={18} className="text-sav-muted group-hover:text-sav-primary transition-colors" />
              </div>
            </Link>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="pt-4 space-y-4">
          <Button 
            variant="danger" 
            className="w-full h-16 rounded-3xl text-xs font-black tracking-[0.2em] shadow-2xl shadow-sav-error/20"
            onClick={logout}
            icon={LogOut}
          >
            CERRAR SESIÓN
          </Button>
          
          <div className="flex flex-col items-center gap-2 py-4">
            <div className="flex items-center gap-2 grayscale opacity-40">
              <ShieldCheck size={14} />
              <p className="text-[8px] font-black uppercase tracking-[0.4em]">Seguridad Institucional BCB</p>
            </div>
            <p className="text-[7px] font-bold text-sav-muted uppercase tracking-widest">Versión 7.0.4 - Sincronizada</p>
          </div>
        </div>
      </main>
    </Layout>
  );
}
