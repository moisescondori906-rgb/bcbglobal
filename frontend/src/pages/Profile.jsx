import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import Header from '../components/Header.jsx';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { 
  User, ShieldCheck, ChevronRight, LogOut, 
  Wallet, TrendingUp, HelpCircle, Info, 
  Settings, Bell, Share2, Zap, Star, Gift,
  Calendar, Clock, DollarSign
} from 'lucide-react';

// UI Components
import { Card } from '../components/ui/Card.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { cn } from '../lib/utils/cn';
import { displayLevelCode } from '../lib/displayLevel.js';

export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchStats = async () => {
      try {
        const data = await api.get('/users/stats');
        if (isMounted) setStats(data);
      } catch (err) {
        console.error('Error fetching stats:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchStats();
    return () => { isMounted = false; };
  }, []);

  const handleLogout = async () => {
    if (window.confirm('¿Estás seguro de que deseas cerrar sesión?')) {
      await logout();
      navigate('/login');
    }
  };

  const menuItems = [
    { to: '/ganancias', icon: Wallet, label: 'Mi Billetera', color: 'text-bcb-success', bg: 'bg-emerald-50' },
    { to: '/vip', icon: TrendingUp, label: 'Membresía VIP', color: 'text-bcb-primary', bg: 'bg-bcb-primary/5' },
    { to: '/premios', icon: Gift, label: 'Premios y Regalos', color: 'text-amber-500', bg: 'bg-amber-50' },
    { to: '/seguridad', icon: Settings, label: 'Seguridad y Cuenta', color: 'text-slate-500', bg: 'bg-slate-50' },
    { to: '/ayuda', icon: HelpCircle, label: 'Centro de Ayuda', color: 'text-blue-500', bg: 'bg-blue-50' },
  ];

  return (
    <Layout>
      <Header title="Mi Perfil" />
      
      <main className="px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8 pb-32 animate-fade">
        {/* User Identity Card */}
        <section className="relative">
          <Card className="p-6 sm:p-8 bg-white/40 backdrop-blur-md text-black border-2 border-slate-200 shadow-2xl shadow-slate-200 rounded-[2.5rem] sm:rounded-[3rem] overflow-hidden group">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-50 rounded-full blur-3xl group-hover:bg-indigo-100 transition-all duration-700" />
            
            <div className="flex items-center gap-5 sm:gap-7 relative z-10">
              <div className="relative">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-gradient-to-br from-indigo-900 to-indigo-700 p-0.5 shadow-lg shadow-indigo-100">
                  <div className="w-full h-full rounded-[1.4rem] bg-white flex items-center justify-center overflow-hidden">
                    <User size={32} className="text-indigo-900" />
                  </div>
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full border-4 border-white flex items-center justify-center shadow-sm">
                  <ShieldCheck size={10} className="text-white" strokeWidth={4} />
                </div>
              </div>
              
              <div className="space-y-1.5 min-w-0">
                <h2 className="text-xl sm:text-2xl font-black tracking-tight truncate uppercase !text-black">{user?.nombre_usuario || 'Usuario'}</h2>
                <div className="flex items-center gap-2">
                  <Badge variant="info" className="bg-indigo-100 text-indigo-900 border-indigo-200 font-black">
                    {displayLevelCode(user?.nivel_codigo)}
                  </Badge>
                  <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{user?.telefono}</p>
                </div>
              </div>
            </div>
          </Card>
        </section>

        {/* v12.8.1 - Resumen Financiero "Llamativo" */}
        <section className="px-1">
          <div className="bg-white/40 backdrop-blur-md rounded-[2rem] sm:rounded-[3rem] p-1 shadow-2xl shadow-slate-200 border-2 border-slate-200 overflow-hidden">
            <div className="bg-gradient-to-br from-indigo-50/50 via-transparent to-rose-50/50 p-6 sm:p-8 space-y-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-900 border border-indigo-200">
                    <TrendingUp size={16} strokeWidth={3} />
                  </div>
                  <h3 className="text-[10px] sm:text-[11px] font-black text-slate-900 uppercase tracking-[0.2em]">Resumen de Ganancias</h3>
                </div>
                <Badge variant="success" className="animate-pulse bg-emerald-100 text-emerald-900 border-emerald-200">En Tiempo Real</Badge>
              </div>

              {/* Grid Principal */}
              <div className="grid grid-cols-2 gap-6 sm:gap-10">
                <div className="space-y-2 group">
                  <div className="flex items-center gap-2">
                    <Zap size={12} className="text-indigo-600" />
                    <p className="text-[8px] sm:text-[9px] font-black text-slate-600 uppercase tracking-widest">Hoy</p>
                  </div>
                  <p className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tighter">
                    <span className="text-xs sm:text-sm font-bold mr-1 text-slate-400">Bs</span>
                    {(stats?.ingresos_hoy || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                </div>

                <div className="space-y-2 group text-right">
                  <div className="flex items-center gap-2 justify-end">
                    <Calendar size={12} className="text-slate-600" />
                    <p className="text-[8px] sm:text-[9px] font-black text-slate-600 uppercase tracking-widest">Ayer</p>
                  </div>
                  <p className="text-2xl sm:text-3xl font-black text-slate-700 tracking-tighter">
                    <span className="text-xs sm:text-sm font-bold mr-1 text-slate-400">Bs</span>
                    {(stats?.ingresos_ayer || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              {/* Grid Secundario (Semana / Mes) */}
              <div className="grid grid-cols-2 gap-4 pt-6 border-t-2 border-slate-100">
                <div className="bg-slate-50 p-4 rounded-2xl space-y-1 border border-slate-200 hover:bg-slate-100 transition-colors">
                  <div className="flex items-center gap-1.5">
                    <Clock size={10} className="text-indigo-600" />
                    <p className="text-[7px] font-black text-slate-600 uppercase tracking-widest">Esta Semana</p>
                  </div>
                  <p className="text-sm sm:text-base font-black text-slate-900">
                    <span className="text-[8px] text-slate-400 mr-0.5">Bs</span>
                    {(stats?.ingresos_semana || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl space-y-1 border border-slate-200 hover:bg-slate-100 transition-colors">
                  <div className="flex items-center gap-1.5">
                    <Star size={10} className="text-rose-600" />
                    <p className="text-[7px] font-black text-slate-600 uppercase tracking-widest">Este Mes</p>
                  </div>
                  <p className="text-sm sm:text-base font-black text-slate-900">
                    <span className="text-[8px] text-slate-400 mr-0.5">Bs</span>
                    {(stats?.ingresos_mes || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              {/* Total Acumulado - Banner Destacado */}
              <div className="mt-4 bg-slate-900 p-5 rounded-[1.5rem] flex items-center justify-between shadow-xl shadow-slate-300 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5 text-white">
                  <DollarSign size={80} />
                </div>
                <div className="relative z-10 space-y-0.5">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">Saldo Total Institucional</p>
                  <p className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    <span className="text-xs font-bold text-indigo-400 mr-1">Bs</span>
                    {(stats?.saldo_total_actual || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="relative z-10 text-right space-y-0.5">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">Tareas Totales</p>
                  <div className="flex items-center gap-2 justify-end">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <p className="text-xl sm:text-2xl font-black text-emerald-400">+{stats?.total_completadas || 0}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Wallet & VIP Quick Access */}
        <section className="grid grid-cols-2 gap-4">
          <Link to="/ganancias">
            <Card className="p-5 bg-emerald-50 border-emerald-100 hover:border-bcb-success/30 transition-all rounded-2xl sm:rounded-3xl flex flex-col items-center gap-3 group">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-bcb-success flex items-center justify-center group-hover:scale-110 transition-transform">
                <Wallet size={24} />
              </div>
              <p className="text-[10px] font-black text-bcb-success uppercase tracking-widest">Billetera</p>
            </Card>
          </Link>
          <Link to="/vip">
            <Card className="p-5 bg-bcb-primary/5 border-bcb-primary/10 hover:border-bcb-primary/30 transition-all rounded-2xl sm:rounded-3xl flex flex-col items-center gap-3 group">
              <div className="w-12 h-12 rounded-2xl bg-bcb-primary/10 text-bcb-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                <TrendingUp size={24} />
              </div>
              <p className="text-[10px] font-black text-bcb-primary uppercase tracking-widest">Subir VIP</p>
            </Card>
          </Link>
        </section>

        {/* Menu Items */}
        <section className="bg-white rounded-[1.5rem] sm:rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
          <div className="divide-y divide-slate-100">
            {menuItems.map((item, idx) => (
              <Link 
                key={idx} 
                to={item.to}
                className="flex items-center justify-between p-5 sm:p-6 hover:bg-slate-50 active:bg-slate-100 transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110", item.bg)}>
                    <item.icon size={20} className={item.color} />
                  </div>
                  <span className="text-[11px] sm:text-xs font-black text-slate-700 uppercase tracking-widest">{item.label}</span>
                </div>
                <ChevronRight size={16} className="text-slate-300 group-hover:text-bcb-primary transition-colors" />
              </Link>
            ))}
          </div>
        </section>

        {/* Logout Button */}
        <button 
          onClick={handleLogout}
          className="w-full h-16 rounded-[1.5rem] sm:rounded-[2.5rem] bg-red-50 border border-red-100 text-bcb-error flex items-center justify-center gap-3 hover:bg-red-100 transition-all group active:scale-[0.98]"
        >
          <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-[11px] font-black uppercase tracking-[0.2em]">Cerrar Sesión</span>
        </button>
      </main>
    </Layout>
  );
}

