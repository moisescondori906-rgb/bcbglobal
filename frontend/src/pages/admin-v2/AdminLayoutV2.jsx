import { useState, useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext.jsx';
import { 
  LayoutDashboard, 
  Users, 
  Wallet, 
  CreditCard, 
  Image, 
  QrCode, 
  Gift, 
  Bell, 
  Play, 
  Menu, 
  X, 
  LogOut,
  ChevronRight,
  Layers,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  HelpCircle,
  Trophy,
  Calendar,
  Send,
  Search,
  Settings,
  Database,
  Lock,
  History
} from 'lucide-react';
import Logo from '../../components/Logo.jsx';
import { APP_DISPLAY_NAME } from '../../theme/branding.js';

const menuGroups = [
  {
    title: 'Principal',
    items: [
      { to: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/admin/usuarios', icon: Users, label: 'Usuarios' },
      { to: '/admin/dispositivos', icon: Lock, label: 'Dispositivos' },
    ]
  },
  {
    title: 'Finanzas',
    items: [
      { to: '/admin/recargas', icon: CreditCard, label: 'Recargas' },
      { to: '/admin/retiros', icon: Wallet, label: 'Retiros' },
    ]
  },
  {
    title: 'Operaciones',
    items: [
      { to: '/admin/tareas', icon: Play, label: 'Gestión Tareas' },
      { to: '/admin/niveles', icon: Layers, label: 'Niveles VIP' },
      { to: '/admin/calendario', icon: Calendar, label: 'Calendario' },
      { to: '/admin/ranking', icon: Trophy, label: 'Ranking' },
    ]
  },
  {
    title: 'Sistema',
    items: [
      { to: '/admin/recompensas', icon: Gift, label: 'Premios' },
      { to: '/admin/codigos-canje', icon: Trophy, label: 'Códigos Canje' },
      { to: '/admin/admins', icon: ShieldCheck, label: 'Staff & Turnos' },
      { to: '/admin/telegram', icon: Send, label: 'Bots Telegram' },
      { to: '/admin/cuestionarios', icon: HelpCircle, label: 'Cuestionarios' },
      { to: '/admin/contenido-home', icon: Bell, label: 'Comunicados' },
      { to: '/admin/banners', icon: Image, label: 'Multimedia' },
      { to: '/admin/metodos-qr', icon: QrCode, label: 'Configuración' },
    ]
  }
];

export default function AdminLayoutV2() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
      if (window.innerWidth < 1024) setIsSidebarOpen(false);
      else setIsSidebarOpen(true);
    };
    
    window.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', handleResize);
    
    handleResize(); // Initial check

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Close sidebar on mobile when location changes
  useEffect(() => {
    if (windowWidth < 1024) setIsSidebarOpen(false);
  }, [location.pathname, windowWidth]);

  return (
    <div className="admin-layout min-h-screen font-sans flex overflow-hidden">
      {/* Sidebar Premium */}
      <AnimatePresence mode="wait">
        {isSidebarOpen && (
          <motion.aside 
            initial={windowWidth < 1024 ? { x: -300 } : { width: 0, opacity: 0 }}
            animate={windowWidth < 1024 ? { x: 0 } : { width: 280, opacity: 1 }}
            exit={windowWidth < 1024 ? { x: -300 } : { width: 0, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={`
              fixed lg:relative z-[100] h-screen h-[100dvh] bg-admin-card border-r border-admin-border flex flex-col shadow-2xl overflow-hidden shrink-0
              ${windowWidth < 1024 ? 'w-[280px]' : ''}
            `}
          >
            {/* Header Sidebar */}
            <div className="p-6 flex items-center gap-4 border-b border-admin-border bg-black/40 shrink-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-admin-accent to-violet-500 p-2 shadow-lg shadow-admin-accent/20 border border-white/20">
                <img src="/imag/logo.webp" alt="Logo" className="w-full h-full object-contain brightness-110" />
              </div>
              <div className="flex flex-col overflow-hidden">
                <h1 className="text-lg font-black tracking-tighter text-white uppercase truncate">{APP_DISPLAY_NAME}</h1>
                <p className="text-[9px] font-black text-admin-accent uppercase tracking-[0.3em] animate-pulse">Core Engine</p>
              </div>
            </div>

            {/* Navigation Premium */}
            <nav className="flex-1 overflow-y-auto p-4 space-y-8 custom-scrollbar">
              {menuGroups.map((group, gIdx) => (group.items.length > 0 && (
                <div key={gIdx} className="space-y-2">
                  <p className="px-4 text-[10px] font-black text-white uppercase tracking-[0.2em]">{group.title}</p>
                  <div className="space-y-1">
                    {group.items.map((item) => {
                      const isActive = location.pathname === item.to;
                      return (
                        <Link
                          key={item.to}
                          to={item.to}
                          className={`
                            flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group relative
                            ${isActive 
                              ? 'bg-admin-accent/20 text-white border border-admin-accent/40 shadow-lg shadow-admin-accent/5' 
                              : 'hover:bg-white/10 text-zinc-400 hover:text-white border border-transparent hover:border-white/10'
                            }
                          `}
                        >
                          <item.icon size={18} className={`transition-all duration-300 ${isActive ? 'text-admin-accent scale-110' : 'text-zinc-500 group-hover:text-admin-accent group-hover:scale-110'}`} />
                          <span className="text-[11px] font-black uppercase tracking-tight">{item.label}</span>
                          {isActive && (
                            <motion.div 
                              layoutId="activeIndicator"
                              className="absolute left-0 w-1 h-5 bg-admin-accent rounded-r-full"
                            />
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )))}
            </nav>

            {/* Footer Sidebar / User Info */}
            <div className="p-4 border-t border-admin-border bg-black/40 shrink-0">
              <div className="bg-white/10 border border-white/20 rounded-2xl p-4 mb-3 flex items-center gap-3 shadow-inner">
                <div className="w-10 h-10 rounded-xl bg-zinc-900 flex items-center justify-center text-admin-accent font-black border border-white/10">
                  {user?.nombre_usuario?.charAt(0).toUpperCase()}
                </div>
                <div className="flex flex-col overflow-hidden">
                  <p className="text-xs font-black text-white truncate">{user?.nombre_usuario}</p>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1 h-1 rounded-full bg-emerald-500 shadow-[0_0_5px_#10b981]" />
                    <p className="text-[8px] font-bold text-white uppercase tracking-widest">{user?.rol}</p>
                  </div>
                </div>
              </div>
              <button 
                onClick={logout}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-rose-500/20 text-white hover:bg-rose-500 transition-all duration-300 text-[10px] font-black uppercase tracking-widest border border-rose-500/40"
              >
                <LogOut size={14} /> Desconectarse
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main className="flex-1 h-screen h-[100dvh] overflow-hidden relative flex flex-col bg-admin-bg">
        {/* Top Header Fixed */}
        <header className={`
          z-50 h-16 sm:h-20 px-4 sm:px-8 flex items-center justify-between border-b border-admin-border transition-all duration-300 shrink-0
          ${scrolled ? 'bg-admin-card/95 backdrop-blur-md shadow-2xl' : 'bg-admin-card'}
        `}>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2.5 rounded-xl bg-white/10 border border-white/20 hover:bg-admin-accent hover:border-admin-accent hover:text-white transition-all text-white shadow-sm"
            >
              <Menu size={20} />
            </button>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <h2 className="text-xs sm:text-sm font-black text-white uppercase tracking-tighter">Command Console</h2>
                <div className="hidden xs:block w-1 h-1 rounded-full bg-admin-accent animate-pulse" />
              </div>
              <p className="text-[8px] sm:text-[10px] font-bold text-admin-accent uppercase tracking-[0.2em]">{location.pathname.split('/').pop()?.replace('-', ' ') || 'Dashboard'}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            <div className="hidden lg:flex items-center gap-3 px-4 py-2 rounded-xl bg-black/40 border border-white/20 group focus-within:border-admin-accent/50 transition-all w-64">
              <Search size={14} className="text-white group-focus-within:text-admin-accent" />
              <input 
                type="text" 
                placeholder="Comando rápido..." 
                className="bg-transparent border-none outline-none text-[10px] font-bold text-white w-full placeholder:text-zinc-600"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <button className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center relative text-white hover:bg-admin-accent hover:border-admin-accent cursor-pointer transition-all shadow-sm group">
                <Bell size={18} className="group-hover:rotate-12 transition-transform" />
                <div className="absolute top-2.5 right-2.5 w-2 h-2 bg-admin-accent rounded-full border-2 border-admin-card shadow-[0_0_10px_#6366f1]" />
              </button>
              
              <div className="hidden sm:flex items-center gap-3 pl-2 ml-2 border-l border-white/20">
                <div className="text-right hidden md:block">
                  <p className="text-[10px] font-black text-white uppercase tracking-tighter leading-none">{user?.nombre_usuario}</p>
                  <p className="text-[8px] font-bold text-admin-accent uppercase tracking-widest">{user?.rol}</p>
                </div>
                <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-white/20 flex items-center justify-center text-[10px] font-black text-white shadow-lg">
                  {user?.nombre_usuario?.charAt(0).toUpperCase()}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Content Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-10 custom-scrollbar relative">
          {/* Background Decorative Elements */}
          <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden -z-10 opacity-20">
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-admin-accent/10 blur-[120px] rounded-full" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-violet-500/10 blur-[100px] rounded-full" />
          </div>

          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="max-w-[1600px] mx-auto pb-10"
          >
            <Outlet />
          </motion.div>
        </div>

        {/* Mobile Overlay */}
        <AnimatePresence>
          {isSidebarOpen && windowWidth < 1024 && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-md z-[90] lg:hidden"
            />
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
