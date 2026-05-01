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
  X as CloseIcon,
  ShieldAlert as ShieldAlertIcon,
  Smartphone as SmartphoneIcon
} from 'lucide-react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { cn } from '../lib/utils/cn';
import { displayLevelCode } from '../lib/displayLevel.js';
import BannerCarousel from '../components/dashboard/BannerCarousel';
import ActionGrid from '../components/dashboard/ActionGrid';
import GuideSection from '../components/dashboard/GuideSection';
import FloatingQuestionnaire from '../components/FloatingQuestionnaire';
import GlobalLoader from '../components/ui/GlobalLoader';
import DownloadButton from '../components/DownloadButton';

// Helper para obtener la fecha actual en zona horaria Bolivia
const getBoliviaDate = (date = new Date()) => {
  const boliviaTime = date.toLocaleString('en-US', { timeZone: 'America/La_Paz' });
  return new Date(boliviaTime);
};

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ ingresos_hoy: 0, total_acumulado: 0 });
  const [niveles, setNiveles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pc, setPc] = useState(null);
  const [showSupportMenu, setShowSupportMenu] = useState(false);
  const [securityAlert, setSecurityAlert] = useState(null);

  useEffect(() => {
    if (user?.security_alert) {
      setSecurityAlert(user.security_alert);
    }
  }, [user]);

  const handleClearAlert = async () => {
    try {
      await api.post('/users/clear-security-alert');
      setSecurityAlert(null);
    } catch (err) {
      console.error('Error clearing alert:', err);
    }
  };

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
    { to: '/premios', icon: RouletteIcon, label: 'Premios', color: 'text-amber-400', bg: 'bg-amber-500/10' },
    { to: '/equipo', icon: UsersIcon, label: 'Mi Equipo', color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { to: '/movimientos', icon: FileTextIcon, label: 'Movimientos', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { to: '/acerca-de', icon: InfoIcon, label: 'Nosotros', color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
  ];

  if (loading) return <GlobalLoader />;

  return (
    <Layout>
      <div className="fixed inset-0 bg-sav-dark -z-10" />
      {/* Dynamic Background Effects */}
      <div className="fixed top-[-10%] left-[-10%] w-[50%] h-[50%] bg-sav-primary/10 blur-[120px] rounded-full -z-10 animate-pulse" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-sav-accent/5 blur-[100px] rounded-full -z-10" />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(79,70,229,0.03)_0%,transparent_70%)] -z-10" />
      
      <main className="px-5 space-y-7 pb-12 pt-4 animate-in">
        {/* Alerta de Seguridad */}
        <AnimatePresence>
          {securityAlert && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative p-6 rounded-[2rem] bg-sav-error/10 border border-sav-error/20 backdrop-blur-md shadow-2xl overflow-hidden group"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-sav-error/5 blur-[50px] -z-10" />
              <div className="flex items-start gap-5">
                <div className="w-14 h-14 bg-sav-error/20 rounded-2xl flex items-center justify-center text-sav-error border border-sav-error/20 shadow-lg group-hover:scale-110 transition-transform duration-500">
                  <ShieldAlertIcon size={28} />
                </div>
                <div className="flex-1 space-y-2">
                  <h3 className="text-base font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
                    Aviso de Seguridad
                    <span className="w-1.5 h-1.5 rounded-full bg-sav-error animate-ping" />
                  </h3>
                  <p className="text-[10px] font-bold text-sav-muted uppercase tracking-widest leading-relaxed">
                    {securityAlert}
                  </p>
                  <div className="flex items-center gap-3 pt-2">
                    <button 
                      onClick={handleClearAlert}
                      className="px-4 py-2 rounded-xl bg-sav-error/20 text-sav-error text-[9px] font-black uppercase tracking-widest hover:bg-sav-error hover:text-white transition-all border border-sav-error/10"
                    >
                      Entendido, soy yo
                    </button>
                    <Link 
                      to="/soporte"
                      className="px-4 py-2 rounded-xl bg-black/5 text-gray-900 text-[9px] font-black uppercase tracking-widest hover:bg-black/10 transition-all border border-black/5"
                    >
                      No reconozco esto
                    </Link>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Sync Indicator v10.0.0 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[8px] font-black text-emerald-500/80 uppercase tracking-[0.2em]">Sincronizado v10.0</span>
          </div>
          <div className="text-[8px] font-black text-sav-muted uppercase tracking-[0.2em] italic">
            BCB Global Institutional
          </div>
        </div>

        {/* Header Section */}
        <header className="flex items-center justify-between py-4 px-1">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <SparklesIcon size={14} className="text-sav-primary animate-pulse" />
              <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter drop-shadow-sm">Panel de Socio</h2>
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
            <div className="absolute -inset-3 bg-sav-primary/10 rounded-2xl blur-2xl opacity-0 group-hover:opacity-100 transition-all duration-500" />
            <div className="relative w-12 h-12 rounded-2xl bg-white border border-black/5 flex items-center justify-center text-sav-muted hover:text-gray-900 transition-all duration-300 shadow-sm group-hover:border-sav-primary/30 group-hover:bg-sav-primary/5">
              <BellIcon size={22} className="group-hover:animate-bounce" />
              {/* Notif Badge */}
              <div className="absolute top-2.5 right-2.5 w-2 h-2 bg-sav-primary rounded-full border-2 border-white shadow-[0_0_10px_rgba(220,38,38,0.4)]" />
            </div>
          </Link>
        </header>

        {/* Banner Section */}
        <BannerCarousel banners={pc?.banners || []} />

        {/* Download App Banner - Solo visible en web, oculto en app */}
        <DownloadButton variant="intelligent" />

        {/* Main Wallet Card */}
        <Card variant="premium" className="p-8 border-none bg-gradient-to-br from-sav-primary via-indigo-600 to-indigo-800 relative overflow-hidden group shadow-[0_30px_70px_-15px_rgba(79,70,229,0.3)] active:scale-[0.99] transition-transform duration-500">
          <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-white/10 blur-[80px] rounded-full transition-all group-hover:bg-white/20 duration-1000" />
          <div className="absolute -top-20 -right-20 w-40 h-40 bg-sav-accent/20 blur-[60px] rounded-full" />
          
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div className="flex justify-between items-start">
              <div className="space-y-4">
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-white/70 uppercase tracking-[0.3em] drop-shadow-sm">Balance de Capital</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-5xl font-black text-white tracking-tighter">
                      {(user?.saldo_principal || 0).toLocaleString()}
                    </p>
                    <span className="text-xs font-black text-white/50 uppercase tracking-widest">BOB</span>
                  </div>
                </div>
                
                <div 
                  className="bg-white/10 backdrop-blur-xl border border-white/20 px-4 py-2 rounded-2xl shadow-sm"
                >
                  <p className="text-[8px] font-black text-white/50 uppercase tracking-[0.2em] text-center mb-0.5">Membresía</p>
                  <p className="text-xs font-black text-white uppercase tracking-tighter text-center">{displayLevelCode(user?.nivel_codigo)}</p>
                </div>
              </div>

              <Link to="/recargar">
                <Button variant="ghost" className="w-14 h-14 rounded-2xl bg-white/10 hover:bg-white/20 text-white border border-white/20 shadow-xl" icon={PlusIcon} />
              </Link>
            </div>

            <div className="flex gap-3 pt-4">
              <Link to="/retiro" className="flex-1">
                <Button variant="secondary" className="w-full h-14 text-[11px] font-black tracking-[0.25em] bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-md shadow-sm active:scale-[0.98] transition-all" icon={ArrowDownCircleIcon}>RETIRAR</Button>
              </Link>
            </div>
          </div>
        </Card>

        {/* Quick Stats Grid */}
        <div className="bg-white rounded-[2rem] shadow-xl shadow-black/5 p-7 space-y-7 border border-black/5 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-sav-primary via-rose-500 to-sav-primary opacity-30" />
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-sav-primary/10">
                <TrophyIcon size={16} className="text-sav-primary" />
              </div>
              <h3 className="text-[11px] font-black text-gray-900 uppercase tracking-[0.2em]">Resumen Financiero</h3>
            </div>
            <div className="px-2 py-0.5 rounded-full bg-sav-success/10 border border-sav-success/20">
              <span className="text-[8px] font-black text-sav-success uppercase tracking-widest">+12.5%</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-8 relative">
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-px h-10 bg-black/5" />
            <div className="space-y-1">
              <p className="text-[9px] font-black text-sav-muted uppercase tracking-widest">Ingresos Hoy</p>
              <p className="text-2xl font-black text-sav-success drop-shadow-sm">
                +{(stats?.ingresos_hoy || 0).toLocaleString()} <span className="text-[10px] font-bold opacity-50">BOB</span>
              </p>
            </div>
            <div className="space-y-1 text-right">
              <p className="text-[9px] font-black text-sav-muted uppercase tracking-widest">Total Acumulado</p>
              <p className="text-2xl font-black text-gray-900 drop-shadow-sm">
                {(stats?.total_acumulado || 0).toLocaleString()} <span className="text-[10px] font-bold opacity-50">BOB</span>
              </p>
            </div>
          </div>
        </div>

        {/* Investment Opportunities - Horizontal Scroll */}
        <section className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <TrendingUpIcon size={16} className="text-sav-primary" />
              <h3 className="text-[11px] font-black text-gray-900 uppercase tracking-[0.2em]">Planes de Inversión</h3>
            </div>
            <Link to="/vip" className="text-[9px] font-black text-sav-primary uppercase tracking-widest flex items-center gap-1">
              Ver Todos <ChevronRightIcon size={12} />
            </Link>
          </div>

          <div className="flex gap-4 overflow-x-auto pb-4 px-1 no-scrollbar snap-x">
            {Array.isArray(niveles) && niveles.filter(n => (n.deposito || n.costo) > 0).map((n, i) => {
              const esActual = n.id === user?.nivel_id;
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
                      <p className="text-[8px] font-black text-sav-muted uppercase tracking-widest leading-none">Ganancia Diaria</p>
                      <p className="text-lg font-black text-gray-900">+{Number(n.ingreso_diario || 0).toFixed(2)}</p>
                    </div>
                    <div className="pt-3 border-t border-black/5 flex justify-between items-center">
                      <span className="text-[8px] font-bold text-sav-muted uppercase">Inversión</span>
                      <span className="text-[10px] font-black text-gray-900">{Number(n.deposito).toLocaleString()} BOB</span>
                    </div>
                  </div>
                  {/* Decor */}
                  <div className="absolute right-[-10px] bottom-[-10px] opacity-[0.05] rotate-12 group-hover:rotate-[25deg] transition-transform duration-700 text-gray-900">
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
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-gray-400" />
            <ShieldCheckIcon size={16} className="text-gray-900" />
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-gray-400" />
          </div>
          <p className="text-[9px] font-black text-sav-muted text-center uppercase tracking-[0.4em] opacity-40">
            Seguridad Institucional Garantizada
          </p>
        </div>
      </main>

      <FloatingQuestionnaire />

      {/* Floating Action Menu v10.1.0 (Organized) */}
      <div className="fixed bottom-24 right-6 flex flex-col gap-4 z-[60] items-end">
        <AnimatePresence>
          {showSupportMenu && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.5, y: 50 }}
              className="flex flex-col gap-3 mb-2"
            >
              {/* Ruleta (Now inside support menu for better order) */}
              {pc?.ruleta_activa !== false && (
                <Link to="/premios" className="group flex items-center gap-3 justify-end active:scale-95 transition-transform">
                  <span className="bg-gradient-to-r from-amber-500 to-orange-600 px-4 py-2 rounded-xl text-[9px] font-black text-white uppercase tracking-[0.2em] shadow-lg shadow-orange-500/20 border border-white/20">
                    Centro de Premios
                  </span>
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 via-orange-500 to-rose-600 flex items-center justify-center text-white border border-white/30 shadow-xl relative overflow-hidden">
                    <RouletteIcon size={20} className="animate-spin-slow" />
                  </div>
                </Link>
              )}

              {/* Support Links */}
              <a 
                href={pc?.soporte_canal_url || '#'} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-3 group active:scale-95 transition-transform"
              >
                <span className="bg-white border border-black/5 px-4 py-2 rounded-xl text-[9px] font-black text-gray-900 uppercase tracking-widest shadow-xl">
                  Canal Oficial
                </span>
                <div className="w-12 h-12 rounded-2xl bg-sav-primary flex items-center justify-center text-white border border-white/10 shadow-xl">
                  <UsersIcon size={20} />
                </div>
              </a>
              <a 
                href={pc?.soporte_gerente_url || '#'} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-3 group active:scale-95 transition-transform"
              >
                <span className="bg-white border border-black/5 px-4 py-2 rounded-xl text-[9px] font-black text-gray-900 uppercase tracking-widest shadow-xl">
                  Soporte VIP
                </span>
                <div className="w-12 h-12 rounded-2xl bg-emerald-500 flex items-center justify-center text-white border border-white/10 shadow-xl">
                  <MessageIcon size={20} />
                </div>
              </a>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Toggle Button */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setShowSupportMenu(!showSupportMenu)}
          className={cn(
            "w-14 h-14 rounded-2xl flex items-center justify-center text-white transition-all duration-300 border-2 z-10 shadow-2xl",
            showSupportMenu 
              ? "bg-white border-black/10 text-gray-900 rotate-45" 
              : "bg-gradient-to-br from-sav-primary to-rose-700 border-white/20"
          )}
        >
          {showSupportMenu ? <CloseIcon size={24} /> : <PlusIcon size={28} />}
          
          {/* Notification Dot */}
          {!showSupportMenu && (
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-sav-error rounded-full border-2 border-white flex items-center justify-center">
              <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
            </div>
          )}
        </motion.button>
      </div>
    </Layout>
  );
}
