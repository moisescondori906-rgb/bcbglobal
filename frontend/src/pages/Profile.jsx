import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
        <div className="flex items-center gap-5 relative z-10">
          <div className="relative group">
            <div className="absolute inset-0 bg-sav-primary/20 blur-xl rounded-full group-hover:bg-sav-primary/40 transition-all" />
            <div className="w-20 h-20 rounded-3xl bg-sav-surface border-2 border-sav-border flex items-center justify-center relative z-10 shadow-2xl overflow-hidden">
              <User size={40} className="text-sav-primary" strokeWidth={2.5} />
            </div>
            <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-sav-success rounded-xl border-4 border-sav-dark flex items-center justify-center z-20 shadow-lg">
              <Check size={14} className="text-white" strokeWidth={3} />
            </div>
          </div>
          <div className="space-y-1">
            <h2 className="text-2xl font-black text-white uppercase tracking-tight leading-none">
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
          <Card variant="premium" className="p-4 flex items-center justify-between border-sav-primary/20">
            <div className="flex items-center gap-4 pl-2">
              <div className="w-10 h-10 rounded-xl bg-sav-primary/10 flex items-center justify-center text-sav-primary shadow-inner">
                <UserPlus size={20} />
              </div>
              <div className="space-y-0.5">
                <p className="text-[8px] font-black text-sav-muted uppercase tracking-widest">Código de Invitación</p>
                <p className="text-lg font-black text-white uppercase tracking-[0.2em]">{user.codigo_invitacion}</p>
              </div>
            </div>
            <button
              onClick={handleCopy}
              className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center transition-all active:scale-90 shadow-lg",
                copied ? "bg-sav-success text-white" : "bg-sav-surface text-white border border-sav-border"
              )}
            >
              {copied ? <Check size={20} strokeWidth={3} /> : <Copy size={20} />}
            </button>
          </Card>
        )}

        {/* Balance Grid */}
        <div className="grid grid-cols-2 gap-4 relative z-10">
          <Card variant="flat" className="p-5 space-y-2 border-sav-primary/5">
            <div className="flex items-center gap-2 opacity-60">
              <Wallet size={12} className="text-sav-primary" />
              <p className="text-[9px] font-black uppercase tracking-widest">Saldo Activos</p>
            </div>
            <p className="text-xl font-black text-white">{(user?.saldo_principal || 0).toLocaleString()} <span className="text-[10px] text-sav-muted font-bold">BOB</span></p>
          </Card>
          <Card variant="flat" className="p-5 space-y-2 border-sav-primary/5">
            <div className="flex items-center gap-2 opacity-60">
              <TrendingUp size={12} className="text-sav-primary" />
              <p className="text-[9px] font-black uppercase tracking-widest">Comisiones</p>
            </div>
            <p className="text-xl font-black text-white">{(user?.saldo_comisiones || 0).toLocaleString()} <span className="text-[10px] text-sav-muted font-bold">BOB</span></p>
          </Card>
        </div>
      </header>

      <main className="px-5 space-y-6 pb-10">
        {/* Investment Opportunities - Added for Visibility */}
        <section className="relative z-10 space-y-4 pt-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-sav-primary animate-pulse" />
              <h3 className="text-[11px] font-black text-white uppercase tracking-[0.2em]">Oportunidades GLOBAL</h3>
            </div>
            <Link to="/vip" className="text-[9px] font-black text-sav-primary uppercase tracking-widest flex items-center gap-1">
              Ver Catálogo <ChevronRight size={12} />
            </Link>
          </div>

          <div className="flex gap-4 overflow-x-auto pb-4 px-1 no-scrollbar snap-x">
            {niveles.filter(n => (n.deposito || n.costo) > 0).map((n, i) => {
              const esActual = n.id === user?.nivel_id;
              const esSiguiente = n.orden === (niveles.find(l => l.id === user?.nivel_id)?.orden || 0) + 1;
              const rentaDiaria = n.ingreso_diario || (Number(n.num_tareas_diarias || 0) * Number(n.ganancia_tarea || 0));

              return (
                <motion.div
                  key={n.id}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate('/vip')}
                  className={cn(
                    "min-w-[160px] p-5 rounded-[2rem] border transition-all snap-start relative overflow-hidden group cursor-pointer",
                    esActual 
                      ? "bg-sav-primary/10 border-sav-primary/30" 
                      : esSiguiente 
                        ? "bg-white/10 border-sav-primary/40 shadow-[0_10px_30px_-5px_rgba(220,38,38,0.2)]"
                        : "bg-white/5 border-white/5"
                  )}
                >
                  <div className="space-y-3 relative z-10">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-black text-white/90 uppercase tracking-tighter">{n.nombre}</span>
                      {esActual && (
                        <div className="flex items-center gap-1 bg-sav-success/20 px-1.5 py-0.5 rounded-full border border-sav-success/30">
                          <div className="w-1 h-1 rounded-full bg-sav-success animate-pulse" />
                          <span className="text-[7px] font-black text-sav-success">ACTIVO</span>
                        </div>
                      )}
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-[8px] font-black text-sav-muted uppercase tracking-widest leading-none">Renta Diaria</p>
                      <p className="text-lg font-black text-white">+{Number(rentaDiaria).toFixed(2)}</p>
                    </div>
                    <div className="pt-3 border-t border-white/5 flex justify-between items-center">
                      <span className="text-[8px] font-bold text-sav-muted uppercase">Inversión</span>
                      <span className="text-[10px] font-black text-white">{Number(n.deposito).toLocaleString()} BOB</span>
                    </div>
                  </div>
                  {/* Decor */}
                  <div className="absolute right-[-10px] bottom-[-10px] opacity-[0.05] rotate-12 group-hover:rotate-[25deg] transition-transform duration-700">
                    <TrendingUp size={60} />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* Summary Card */}
        <Card className="p-6 space-y-6">
          <div className="flex items-center gap-2 px-1">
            <Trophy size={16} className="text-sav-primary" />
            <h3 className="text-[11px] font-black text-white uppercase tracking-[0.2em]">Resumen Financiero</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-[8px] font-black text-sav-muted uppercase tracking-widest">Ingresos Hoy</p>
              <p className="text-lg font-black text-sav-success">+{stats?.ingresos_hoy?.toLocaleString() || '0.00'}</p>
            </div>
            <div className="space-y-1 text-right">
              <p className="text-[8px] font-black text-sav-muted uppercase tracking-widest">Total Acumulado</p>
              <p className="text-lg font-black text-white">{stats?.ingresos_totales?.toLocaleString() || '0.00'}</p>
            </div>
          </div>
        </Card>

        {/* Menu Items */}
        <section className="space-y-3">
          {menuItems.map((item, i) => (
            <Link key={i} to={item.to}>
              <Card variant="flat" className="p-4 flex items-center justify-between group active:scale-[0.98] transition-all hover:border-sav-primary/20">
                <div className="flex items-center gap-4">
                  <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center", item.bg, item.color)}>
                    <item.icon size={20} />
                  </div>
                  <span className="text-[11px] font-black text-white uppercase tracking-wider">{item.label}</span>
                </div>
                <ChevronRight size={18} className="text-sav-muted group-hover:text-white transition-colors" />
              </Card>
            </Link>
          ))}
        </section>

        {/* Action Buttons */}
        <div className="pt-4 space-y-4">
          <Button variant="secondary" className="border-sav-error/20 text-sav-error" onClick={logout} icon={LogOut}>
            Cerrar Sesión
          </Button>
          <p className="text-[8px] font-bold text-sav-muted text-center uppercase tracking-[0.4em]">
            BCB Global v7.0.0 Institutional
          </p>
        </div>
      </main>
    </Layout>
  );
}
