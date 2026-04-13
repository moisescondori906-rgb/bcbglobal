import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Wallet as WalletIcon, 
  TrendingUp as TrendingUpIcon, 
  Target as TargetIcon, 
  ShieldCheck as ShieldCheckIcon, 
  ArrowUpCircle as ArrowUpCircleIcon, 
  ArrowDownCircle as ArrowDownCircleIcon, 
  Bell as BellIcon,
  ChevronRight as ChevronRightIcon, 
  PlayCircle as PlayCircleIcon, 
  Sparkles as SparklesIcon, 
  Zap as ZapIcon, 
  Trophy as TrophyIcon, 
  Users as UsersIcon,
  FileText as FileTextIcon,
  HelpCircle as HelpCircleIcon,
  Info as InfoIcon,
  MessageCircle as MessageIcon,
  Compass as RouletteIcon,
  Plus as PlusIcon,
  X as CloseIcon
} from 'lucide-react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { cn } from '../lib/utils/cn';
import BannerCarousel from '../components/dashboard/BannerCarousel';
import ActionGrid from '../components/dashboard/ActionGrid';
import GuideSection from '../components/dashboard/GuideSection';
import FloatingQuestionnaire from '../components/FloatingQuestionnaire';
import GlobalLoader from '../components/ui/GlobalLoader';

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ ingresos_hoy: 0, total_acumulado: 0 });
  const [niveles, setNiveles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pc, setPc] = useState(null);
  const [showSupportMenu, setShowSupportMenu] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      try {
        const [statsData, pcData, nivelesData] = await Promise.all([
          api.get('/users/stats'),
          api.publicContent(),
          api.levels.list()
        ]);
        
        if (isMounted) {
          setStats({
            ingresos_hoy: statsData?.ingresos_hoy ?? 0,
            total_acumulado: statsData?.total_acumulado ?? 0
          });
          setPc(pcData);
          setNiveles(nivelesData || []);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) setLoading(false);
      }
    };
    loadData();
    return () => { isMounted = false; };
  }, []);

  const actionItems = [
    { to: '/vip', icon: TrendingUpIcon, label: 'Membresía VIP', color: 'text-sav-primary', bg: 'bg-sav-primary/10' },
    { to: '/invitar', icon: UsersIcon, label: 'Invitar', color: 'text-orange-400', bg: 'bg-orange-500/10' },
    { to: '/recompensas', icon: RouletteIcon, label: 'Ruleta', color: 'text-amber-400', bg: 'bg-amber-500/10' },
    { to: '/equipo', icon: UsersIcon, label: 'Mi Equipo', color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { to: '/movimientos', icon: FileTextIcon, label: 'Movimientos', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { to: '/acerca-de', icon: InfoIcon, label: 'Nosotros', color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
  ];

  if (loading) return <GlobalLoader />;

  return (
    <Layout>
      <div className="fixed inset-0 bg-sav-dark -z-10" />
      {/* Dynamic Background Effects */}
      <div className="fixed top-[-10%] left-[-10%] w-[50%] h-[50%] bg-sav-primary/20 blur-[120px] rounded-full -z-10 animate-pulse" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-rose-600/10 blur-[100px] rounded-full -z-10" />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(220,38,38,0.05)_0%,transparent_70%)] -z-10" />
      
      <main className="px-5 space-y-7 pb-12 pt-4">
        {/* Header Section */}
        <header className="flex items-center justify-between py-4 px-1">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <SparklesIcon size={14} className="text-sav-primary animate-pulse" />
              <h2 className="text-2xl font-black text-white uppercase tracking-tighter drop-shadow-sm">Panel de Socio</h2>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative w-1.5 h-1.5">
                <div className="absolute inset-0 rounded-full bg-sav-success animate-ping opacity-75" />
                <div className="relative w-full h-full rounded-full bg-sav-success" />
              </div>
              <p className="text-[9px] font-black text-sav-muted uppercase tracking-[0.2em]">Servidor Institucional Online</p>
            </div>
          </div>
          <Link to="/mensajes" className="relative group">
            <div className="absolute -inset-3 bg-sav-primary/20 rounded-2xl blur-2xl opacity-0 group-hover:opacity-100 transition-all duration-500" />
            <div className="relative w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-sav-muted hover:text-white transition-all duration-300 backdrop-blur-md group-hover:border-sav-primary/50 group-hover:bg-sav-primary/5">
              <BellIcon size={22} className="group-hover:animate-bounce" />
              {/* Notif Badge */}
              <div className="absolute top-2.5 right-2.5 w-2 h-2 bg-sav-primary rounded-full border-2 border-sav-dark shadow-[0_0_10px_rgba(220,38,38,0.8)]" />
            </div>
          </Link>
        </header>

        {/* Banner Section */}
        <BannerCarousel banners={pc?.banners || []} />

        {/* Main Wallet Card */}
        <Card variant="premium" className="p-8 border-none bg-gradient-to-br from-sav-primary via-sav-primary to-rose-700 relative overflow-hidden group shadow-[0_30px_70px_-15px_rgba(220,38,38,0.5)] active:scale-[0.99] transition-transform duration-500">
          {/* Decorative Elements */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 blur-[90px] rounded-full -mr-40 -mt-40 transition-all group-hover:bg-white/20 group-hover:scale-125 duration-1000" />
          <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-black/40 blur-[80px] rounded-full transition-all group-hover:bg-black/60 duration-1000" />
          
          {/* Animated Light Sweep */}
          <motion.div 
            animate={{ x: ['-200%', '200%'] }}
            transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-[35deg]"
          />

          <div className="absolute right-[-10px] top-[-10px] opacity-[0.08] rotate-12 group-hover:rotate-[20deg] group-hover:scale-110 transition-all duration-1000">
            <WalletIcon size={180} />
          </div>

          <div className="relative z-10 space-y-10">
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center backdrop-blur-md shadow-inner">
                    <ZapIcon size={12} className="text-amber-300" />
                  </div>
                  <p className="text-[10px] font-black text-white/90 uppercase tracking-[0.3em] drop-shadow-sm">Balance de Capital</p>
                </div>
                <div className="flex items-baseline gap-2">
                  <p className="text-5xl font-black text-white tracking-tighter drop-shadow-[0_4px_12px_rgba(0,0,0,0.3)]">
                    {(user?.saldo_principal ?? 0).toLocaleString()}
                  </p>
                  <span className="text-xs font-black text-white/60 uppercase tracking-widest">BOB</span>
                </div>
              </div>
              <motion.div 
                whileHover={{ scale: 1.05 }}
                className="bg-black/20 backdrop-blur-xl border border-white/10 px-4 py-2 rounded-2xl shadow-xl"
              >
                <p className="text-[8px] font-black text-white/50 uppercase tracking-[0.2em] text-center mb-0.5">Membresía</p>
                <p className="text-xs font-black text-white uppercase tracking-tighter text-center">{user?.nivel_codigo || 'Global 1'}</p>
              </motion.div>
            </div>

            <div className="flex gap-4 pt-2">
              <Link to="/recargar" className="w-full">
                <Button variant="secondary" className="w-full h-14 text-[11px] font-black tracking-[0.25em] bg-white text-sav-primary border-none hover:bg-white/90 shadow-[0_10px_25px_-5px_rgba(255,255,255,0.4)] active:scale-[0.98] transition-all" icon={ArrowUpCircleIcon}>DEPOSITAR</Button>
              </Link>
              <Link to="/retiro" className="w-full">
                <Button variant="secondary" className="w-full h-14 text-[11px] font-black tracking-[0.25em] bg-black/20 hover:bg-black/30 border-white/10 text-white backdrop-blur-md active:scale-[0.98] transition-all" icon={ArrowDownCircleIcon}>RETIRAR</Button>
              </Link>
            </div>
          </div>
        </Card>

        {/* Quick Stats Grid */}
        <div className="glass-card shadow-[0_20px_50px_rgba(0,0,0,0.3)] p-7 space-y-7 border-white/5 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-sav-primary via-rose-500 to-sav-primary opacity-50" />
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-sav-primary/10">
                <TrophyIcon size={16} className="text-sav-primary" />
              </div>
              <h3 className="text-[11px] font-black text-white uppercase tracking-[0.2em]">Resumen Financiero</h3>
            </div>
            <div className="px-2 py-0.5 rounded-full bg-sav-success/10 border border-sav-success/20">
              <span className="text-[8px] font-black text-sav-success uppercase tracking-widest">+12.5%</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-8 relative">
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-px h-10 bg-white/5" />
            <div className="space-y-1">
              <p className="text-[9px] font-black text-sav-muted uppercase tracking-widest">Ingresos Hoy</p>
              <p className="text-2xl font-black text-sav-success drop-shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                +{(stats?.ingresos_hoy ?? 0).toLocaleString()} <span className="text-[10px] font-bold opacity-50">BOB</span>
              </p>
            </div>
            <div className="space-y-1 text-right">
              <p className="text-[9px] font-black text-sav-muted uppercase tracking-widest">Total Acumulado</p>
              <p className="text-2xl font-black text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]">
                {(stats?.total_acumulado ?? 0).toLocaleString()} <span className="text-[10px] font-bold opacity-50">BOB</span>
              </p>
            </div>
          </div>
        </div>

        {/* Investment Opportunities - Horizontal Scroll */}
        <section className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <TrendingUpIcon size={16} className="text-sav-primary" />
              <h3 className="text-[11px] font-black text-white uppercase tracking-[0.2em]">Planes de Inversión</h3>
            </div>
            <Link to="/vip" className="text-[9px] font-black text-sav-primary uppercase tracking-widest flex items-center gap-1">
              Ver Todos <ChevronRightIcon size={12} />
            </Link>
          </div>

          <div className="flex gap-4 overflow-x-auto pb-4 px-1 no-scrollbar snap-x">
            {niveles.filter(n => (n.deposito || n.costo) > 0).map((n, i) => {
              const esActual = n.id === user?.nivel_id;
              return (
                <Link 
                  key={n.id} 
                  to="/vip"
                  className={cn(
                    "min-w-[160px] p-5 rounded-[2rem] border transition-all snap-start relative overflow-hidden group",
                    esActual ? "bg-sav-primary/10 border-sav-primary/30" : "bg-white/5 border-white/5"
                  )}
                >
                  <div className="space-y-3 relative z-10">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-black text-white/90 uppercase tracking-tighter">{n.nombre}</span>
                      {esActual && <div className="w-1.5 h-1.5 rounded-full bg-sav-success animate-pulse" />}
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-[8px] font-black text-sav-muted uppercase tracking-widest leading-none">Renta Diaria</p>
                      <p className="text-lg font-black text-white">+{Number(n.ingreso_diario).toFixed(2)}</p>
                    </div>
                    <div className="pt-3 border-t border-white/5 flex justify-between items-center">
                      <span className="text-[8px] font-bold text-sav-muted uppercase">Inversión</span>
                      <span className="text-[10px] font-black text-white">{Number(n.deposito).toLocaleString()} BOB</span>
                    </div>
                  </div>
                  {/* Decor */}
                  <div className="absolute right-[-10px] bottom-[-10px] opacity-[0.05] rotate-12 group-hover:rotate-[25deg] transition-transform duration-700">
                    <TrendingUpIcon size={60} />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Actions Grid */}
        <ActionGrid items={actionItems} />

        {/* Tutorial Section */}
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-sav-primary/20 to-rose-500/20 rounded-[2rem] blur opacity-50 group-hover:opacity-100 transition duration-1000" />
          <GuideSection text={pc?.marquee_text || "Bienvenido a BCB Global Institutional — Liderando la Inversión Publicitaria"} />
        </div>

        {/* Footer Brand */}
        <div className="pt-6 pb-4 space-y-4">
          <div className="flex items-center justify-center gap-4 opacity-30">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-white" />
            <ShieldCheckIcon size={16} className="text-white" />
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-white" />
          </div>
          <p className="text-[9px] font-black text-sav-muted text-center uppercase tracking-[0.5em] drop-shadow-sm">BCB Global v7.0.0 Institutional — Colorado, USA</p>
        </div>
      </main>

      <FloatingQuestionnaire />

      {/* Floating Action Buttons */}
      <motion.div 
        drag
        dragConstraints={{ left: -300, right: 0, top: -500, bottom: 0 }}
        className="fixed bottom-24 right-6 flex flex-col gap-5 z-[60]"
      >
        <AnimatePresence>
          {showSupportMenu && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.8 }}
              className="flex flex-col gap-4 mb-2 items-end"
            >
              <a 
                href={pc?.soporte_canal_url || '#'} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-3 group active:scale-95 transition-transform"
              >
                <motion.span 
                  initial={{ x: 10, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  className="bg-sav-dark/95 backdrop-blur-2xl border border-white/20 px-4 py-2.5 rounded-2xl text-[10px] font-black text-white uppercase tracking-widest shadow-[0_10px_30px_rgba(0,0,0,0.5)] border-l-4 border-l-sav-primary"
                >
                  Canal Oficial
                </motion.span>
                <div className="w-14 h-14 rounded-[1.5rem] bg-gradient-to-br from-sav-primary to-rose-700 shadow-[0_15px_40px_-5px_rgba(220,38,38,0.6)] flex items-center justify-center text-white border-2 border-white/20 transition-all group-hover:scale-110 group-hover:rotate-6 group-hover:shadow-sav-primary/40 relative overflow-hidden">
                  <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <UsersIcon size={24} className="relative z-10" />
                </div>
              </a>
              <a 
                href={pc?.soporte_gerente_url || '#'} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-3 group active:scale-95 transition-transform"
              >
                <motion.span 
                  initial={{ x: 10, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="bg-sav-dark/95 backdrop-blur-2xl border border-white/20 px-4 py-2.5 rounded-2xl text-[10px] font-black text-white uppercase tracking-widest shadow-[0_10px_30px_rgba(0,0,0,0.5)] border-l-4 border-l-emerald-500"
                >
                  Soporte VIP
                </motion.span>
                <div className="w-14 h-14 rounded-[1.5rem] bg-gradient-to-br from-emerald-500 to-teal-700 shadow-[0_15px_40px_-5px_rgba(16,185,129,0.6)] flex items-center justify-center text-white border-2 border-white/20 transition-all group-hover:scale-110 group-hover:-rotate-6 group-hover:shadow-emerald-500/40 relative overflow-hidden">
                  <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <MessageIcon size={24} className="relative z-10" />
                </div>
              </a>
            </motion.div>
          )}
        </AnimatePresence>

        {pc?.ruleta_activa !== false && (
          <Link to="/recompensas" className="group active:scale-90 transition-transform flex items-center gap-3 justify-end">
            <motion.span 
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-gradient-to-r from-amber-500 to-orange-600 px-4 py-2 rounded-2xl text-[10px] font-black text-white uppercase tracking-[0.2em] shadow-lg shadow-orange-500/20 border border-white/20"
            >
              Ruleta
            </motion.span>
            <motion.div 
              animate={{ 
                y: [0, -8, 0],
                boxShadow: [
                  "0 20px 40px -10px rgba(245,158,11,0.5)",
                  "0 30px 60px -10px rgba(245,158,11,0.8)",
                  "0 20px 40px -10px rgba(245,158,11,0.5)"
                ]
              }}
              transition={{ 
                y: { repeat: Infinity, duration: 2.5, ease: "easeInOut" },
                boxShadow: { repeat: Infinity, duration: 2.5, ease: "easeInOut" }
              }}
              className="w-16 h-16 rounded-[1.8rem] bg-gradient-to-br from-amber-400 via-orange-500 to-rose-600 flex items-center justify-center text-white relative overflow-hidden border-2 border-white/40 shadow-2xl"
            >
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-white/20" />
              <RouletteIcon size={32} className="animate-spin-slow drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]" />
              
              {/* Partículas de brillo */}
              <motion.div 
                animate={{ opacity: [0, 1, 0], scale: [0.5, 1.2, 0.5], rotate: 45 }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="absolute top-2 left-2 text-white/40"
              >
                <SparklesIcon size={12} />
              </motion.div>

              <motion.div 
                animate={{ scale: [1, 1.4, 1], opacity: [0.5, 1, 0.5] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="absolute -top-1 -right-1 w-5 h-5 bg-sav-error rounded-full border-2 border-white shadow-lg flex items-center justify-center"
              >
                <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
              </motion.div>
            </motion.div>
          </Link>
        )}

        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setShowSupportMenu(!showSupportMenu)}
          className={cn(
            "w-16 h-16 rounded-[1.8rem] flex items-center justify-center text-white transition-all duration-500 border-2 relative overflow-hidden group",
            showSupportMenu 
              ? "bg-sav-dark border-white/20 rotate-90 shadow-none" 
              : "bg-gradient-to-br from-sav-primary via-sav-primary to-rose-700 border-white/20 shadow-[0_20px_50px_-10px_rgba(220,38,38,0.7)]"
          )}
        >
          {/* Shimmer Effect */}
          {!showSupportMenu && (
            <motion.div 
              animate={{ x: ['-100%', '100%'] }}
              transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12"
            />
          )}
          
          <AnimatePresence mode="wait">
            {showSupportMenu ? (
              <motion.div key="close" initial={{ opacity: 0, rotate: -90 }} animate={{ opacity: 1, rotate: 0 }} exit={{ opacity: 0, rotate: 90 }}>
                <CloseIcon size={28} />
              </motion.div>
            ) : (
              <motion.div key="plus" initial={{ opacity: 0, rotate: 90 }} animate={{ opacity: 1, rotate: 0 }} exit={{ opacity: 0, rotate: -90 }}>
                <PlusIcon size={32} />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>
      </motion.div>
    </Layout>
  );
}
