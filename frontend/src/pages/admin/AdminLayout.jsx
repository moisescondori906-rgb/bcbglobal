import { useState, Component } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
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
  Calendar
} from 'lucide-react';
import Logo from '../../components/Logo.jsx';
import { APP_DISPLAY_NAME } from '../../theme/branding.js';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Admin Error Boundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#1a1f36] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl">
            <div className="w-20 h-20 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="text-red-600" size={40} />
            </div>
            <h2 className="text-2xl font-black text-[#1a1f36] mb-4 uppercase tracking-tight">Error en el Panel</h2>
            <p className="text-slate-600 mb-8 font-medium">
              Ha ocurrido un error inesperado en esta sección del panel de administración.
            </p>
            <div className="bg-slate-50 rounded-xl p-4 mb-8 text-left overflow-auto max-h-40">
              <code className="text-xs text-red-500 font-mono">
                {this.state.error?.message || 'Error desconocido'}
              </code>
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="w-full py-4 bg-[#1a1f36] text-white rounded-2xl font-bold hover:bg-[#2d3558] transition-all active:scale-95 shadow-lg shadow-indigo-900/20"
            >
              Recargar Panel
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const menu = [
    { to: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/admin/usuarios', icon: Users, label: 'Usuarios' },
    { to: '/admin/ranking', icon: Trophy, label: 'Ranking Invitados' },
    { to: '/admin/cuestionarios', icon: HelpCircle, label: 'Cuestionarios y Castigos' },
    { to: '/admin/niveles', icon: Layers, label: 'Niveles VIP' },
    { to: '/admin/recargas', icon: CreditCard, label: 'Recargas' },
    { to: '/admin/retiros', icon: Wallet, label: 'Retiros' },
    { to: '/admin/tareas', icon: Play, label: 'Tareas' },
    { to: '/admin/metodos-qr', icon: QrCode, label: 'Imágenes Recarga' },
    { to: '/admin/recompensas', icon: Gift, label: 'Premios y Recompensas' },
    { to: '/admin/admins', icon: ShieldCheck, label: 'Gestión Admins y Turnos' },
    { to: '/admin/calendario', icon: Calendar, label: 'Calendario Operativo' },
    { to: '/admin/banners', icon: Image, label: 'Banners' },
    { to: '/admin/contenido-home', icon: Bell, label: 'Contenido y horarios' },
  ];

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  return (
    <div className="min-h-screen bg-sav-dark flex flex-col md:flex-row relative overflow-x-hidden">
      <header className="md:hidden bg-sav-card text-white p-4 flex items-center justify-between sticky top-0 z-50 shadow-lg border-b border-white/5">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleSidebar}
            className="p-2.5 bg-white/10 rounded-xl border border-white/10 active:scale-90 transition-all hover:bg-sav-accent/15"
          >
            {isSidebarOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
          <div className="flex flex-col">
            <h1 className="text-lg font-black tracking-tighter uppercase leading-none">{APP_DISPLAY_NAME} Admin</h1>
            <p className="text-[8px] font-black tracking-[0.2em] text-sav-accent/70 uppercase">Panel de Control</p>
          </div>
        </div>
        <div className="w-10 h-10 rounded-xl bg-sav-accent/20 border border-sav-accent/30 flex items-center justify-center font-black text-xs text-sav-accent">
          {user?.nombre_usuario?.substring(0, 2).toUpperCase()}
        </div>
      </header>

      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-sav-dark/85 backdrop-blur-sm z-[60] md:hidden animate-in fade-in duration-300"
          onClick={toggleSidebar}
          role="presentation"
        />
      )}

      <aside className={`
        fixed md:sticky top-0 h-screen w-72 bg-sav-card text-white z-[70] border-r border-white/5
        transition-all duration-500 ease-out flex flex-col
        ${isSidebarOpen ? 'left-0' : '-left-full md:left-0'}
        shadow-[25px_0_50px_rgba(0,0,0,0.5)] md:shadow-none
      `}>
        {/* Logo Section */}
        <div className="p-8 hidden md:block">
          <div className="flex items-center gap-4 group cursor-pointer">
            <div className="w-12 h-12 rounded-2xl bg-white/10 p-2 border border-white/10 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shadow-xl">
              <img src="/imag/logo.png" alt={APP_DISPLAY_NAME} className="w-full h-full object-contain" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-xl font-black tracking-tighter uppercase leading-none">{APP_DISPLAY_NAME}</h1>
              <p className="text-[9px] font-black tracking-[0.3em] text-sav-accent/45 uppercase">Administrador</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1.5 overflow-y-auto no-scrollbar py-6 md:py-0 px-4">
          {menu.map((item) => {
            const { to, icon: MenuIcon, label } = item;
            const isActive = location.pathname === to;
            return (
              <Link
                key={to}
                to={to}
                onClick={() => setIsSidebarOpen(false)}
                className={`
                  flex items-center justify-between group px-4 py-3.5 rounded-2xl transition-all duration-300
                  ${isActive
                    ? 'bg-gradient-to-r from-sav-accent to-red-500 text-white font-black shadow-sav-glow scale-[1.02] border border-white/20'
                    : 'text-white/55 hover:bg-white/[0.06] hover:text-white border border-transparent'
                  }
                `}
              >
                <div className="flex items-center gap-3.5">
                  <MenuIcon size={20} strokeWidth={isActive ? 2.5 : 2} className={isActive ? 'text-white' : 'text-white/25 group-hover:text-sav-accent/80 transition-colors'} />
                  <span className="text-[11px] uppercase tracking-tighter font-bold">{label}</span>
                </div>
                {isActive && <ChevronRight size={14} className="animate-in slide-in-from-left-2 duration-300" />}
              </Link>
            );
          })}
        </nav>

        {/* User / Logout */}
        <div className="p-6 border-t border-sav-accent/10 bg-sav-dark/40">
          <div className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-white/[0.04] border border-sav-accent/10 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-sav-accent/20 flex items-center justify-center text-sav-accent font-black text-xs border border-sav-accent/25">
                {user?.nombre_usuario?.substring(0, 2).toUpperCase()}
              </div>
              <div className="flex flex-col overflow-hidden">
                <p className="text-xs font-black truncate uppercase tracking-tighter">{user?.nombre_usuario}</p>
                <p className="text-[8px] font-black text-white/20 uppercase tracking-widest truncate">{user?.rol}</p>
              </div>
            </div>
          </div>
          <button 
            onClick={logout}
            className="w-full py-4 rounded-2xl bg-rose-500/10 text-rose-500 font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 hover:bg-rose-500 hover:text-white transition-all duration-300 shadow-lg shadow-rose-950/20"
          >
            <LogOut size={16} /> Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Contenido Principal */}
      <main className="flex-1 min-h-screen relative overflow-x-hidden">
        <div className="p-4 md:p-10 max-w-7xl mx-auto space-y-4">
          <div className="sav-card p-4 md:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-300">Panel Administrativo</p>
                <h2 className="text-lg md:text-xl font-black uppercase tracking-tight text-white">{APP_DISPLAY_NAME} Control Center</h2>
              </div>
              <div className="text-right">
                <p className="text-[9px] uppercase tracking-widest text-white/45 font-black">{user?.rol}</p>
                <p className="text-xs font-black text-rose-200 truncate max-w-[180px]">{user?.nombre_usuario}</p>
              </div>
            </div>
          </div>
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </div>
      </main>
    </div>
  );
}
