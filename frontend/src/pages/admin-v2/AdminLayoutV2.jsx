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
  Database
} from 'lucide-react';
import Logo from '../../components/Logo.jsx';
import { APP_DISPLAY_NAME } from '../../theme/branding.js';

const menuGroups = [
  {
    title: 'Principal',
    items: [
      { to: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/admin/usuarios', icon: Users, label: 'Usuarios' },
      { to: '/admin/ranking', icon: Trophy, label: 'Ranking Invitados' },
    ]
  },
  {
    title: 'Finanzas',
    items: [
      { to: '/admin/recargas', icon: CreditCard, label: 'Recargas' },
      { to: '/admin/retiros', icon: Wallet, label: 'Retiros' },
      { to: '/admin/metodos-qr', icon: QrCode, label: 'Métodos de Pago' },
    ]
  },
  {
    title: 'Operaciones',
    items: [
      { to: '/admin/tareas', icon: Play, label: 'Gestión Tareas' },
      { to: '/admin/niveles', icon: Layers, label: 'Niveles VIP' },
      { to: '/admin/calendario', icon: Calendar, label: 'Calendario' },
    ]
  },
  {
    title: 'Sistema',
    items: [
      { to: '/admin/recompensas', icon: Gift, label: 'Premios' },
      { to: '/admin/admins', icon: ShieldCheck, label: 'Staff & Turnos' },
      { to: '/admin/telegram', icon: Send, label: 'Bots Telegram' },
      { to: '/admin/cuestionarios', icon: HelpCircle, label: 'Cuestionarios' },
      { to: '/admin/banners', icon: Image, label: 'Multimedia' },
      { to: '/admin/contenido-home', icon: Bell, label: 'Configuración' },
    ]
  }
];

export default function AdminLayoutV2() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Responsive sidebar handling
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) setIsSidebarOpen(false);
      else setIsSidebarOpen(true);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeResizeListener?.(handleResize);
  }, []);

  return (
    <div className="min-h-screen bg-[#0f111a] text-slate-200 flex overflow-hidden">
      {/* Sidebar Ultra Modern */}
      <motion.aside 
        initial={false}
        animate={{ width: isSidebarOpen ? 280 : 0, opacity: isSidebarOpen ? 1 : 0 }}
        className="fixed lg:relative z-[100] h-screen bg-[#161926] border-r border-white/5 flex flex-col shadow-2xl overflow-hidden"
      >
        {/* Header Sidebar */}
        <div className="p-6 flex items-center gap-4 border-b border-white/5 bg-[#1a1e2e]">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sav-primary to-rose-500 p-2 shadow-lg shadow-sav-primary/20">
            <img src="/imag/logo.png" alt="Logo" className="w-full h-full object-contain" />
          </div>
          <div className="flex flex-col overflow-hidden">
            <h1 className="text-lg font-black tracking-tighter text-white uppercase truncate">{APP_DISPLAY_NAME}</h1>
            <p className="text-[8px] font-bold text-sav-primary uppercase tracking-[0.2em]">Console V2.0</p>
          </div>
        </div>

        {/* Navigation Scrollable */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-8 no-scrollbar">
          {menuGroups.map((group, gIdx) => (group.items.length > 0 && (
            <div key={gIdx} className="space-y-2">
              <p className="px-4 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">{group.title}</p>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const isActive = location.pathname === item.to;
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      className={`
                        flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group
                        ${isActive 
                          ? 'bg-sav-primary/10 text-white border border-sav-primary/20 shadow-lg shadow-sav-primary/5' 
                          : 'hover:bg-white/[0.03] text-slate-400 hover:text-slate-200 border border-transparent'
                        }
                      `}
                    >
                      <item.icon size={18} className={`transition-colors ${isActive ? 'text-sav-primary' : 'text-slate-500 group-hover:text-slate-300'}`} />
                      <span className="text-[11px] font-bold uppercase tracking-tight">{item.label}</span>
                      {isActive && (
                        <motion.div 
                          layoutId="activeIndicator"
                          className="ml-auto w-1 h-4 bg-sav-primary rounded-full"
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
        <div className="p-4 border-t border-white/5 bg-[#1a1e2e]/50">
          <div className="bg-[#1a1e2e] border border-white/5 rounded-2xl p-4 mb-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-sav-primary font-black border border-white/5 shadow-inner">
              {user?.nombre_usuario?.charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col overflow-hidden">
              <p className="text-xs font-black text-white truncate">{user?.nombre_usuario}</p>
              <p className="text-[8px] font-bold text-sav-primary uppercase tracking-widest">{user?.rol}</p>
            </div>
          </div>
          <button 
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-all duration-300 text-[10px] font-black uppercase tracking-widest border border-rose-500/20"
          >
            <LogOut size={14} /> Salir del Sistema
          </button>
        </div>
      </motion.aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Top Header Fixed */}
        <header className={`
          z-50 h-20 px-8 flex items-center justify-between border-b border-white/5 transition-all duration-300
          ${scrolled ? 'bg-[#0f111a]/80 backdrop-blur-xl shadow-xl' : 'bg-transparent'}
        `}>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-slate-400"
            >
              {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <div className="hidden sm:flex flex-col">
              <h2 className="text-sm font-black text-white uppercase tracking-tighter">Panel de Control</h2>
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">BCB Global Institutional</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/5">
              <Search size={16} className="text-slate-500" />
              <input 
                type="text" 
                placeholder="Buscar en el sistema..." 
                className="bg-transparent border-none outline-none text-[11px] font-bold text-slate-300 w-48"
              />
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Sistema Online</span>
            </div>
          </div>
        </header>

        {/* Content Container */}
        <div className="flex-1 overflow-y-auto p-6 md:p-10 bg-[#0f111a] custom-scrollbar">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-7xl mx-auto"
          >
            <Outlet />
          </motion.div>
        </div>

        {/* Overlay for mobile */}
        <AnimatePresence>
          {isSidebarOpen && window.innerWidth < 1024 && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90]"
            />
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
