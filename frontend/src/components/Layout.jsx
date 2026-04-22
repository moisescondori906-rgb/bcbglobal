import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home as HomeIcon, Users as UsersIcon, Gem as GemIcon, Wallet as WalletIcon, User as UserIcon, Smartphone, ShieldCheck, CheckCircle2, XCircle } from 'lucide-react';
import FloatingQuestionnaire from './FloatingQuestionnaire.jsx';
import { cn } from '../lib/utils/cn';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../lib/api';
import { AnimatePresence } from 'framer-motion';
import { Button } from './ui/Button.jsx';

const navItems = [
  { to: '/', icon: HomeIcon, label: 'Inicio' },
  { to: '/tareas', icon: UsersIcon, label: 'Tareas' },
  { to: '/vip', icon: GemIcon, label: 'VIP' },
  { to: '/ganancias', icon: WalletIcon, label: 'Billetera' },
  { to: '/usuario', icon: UserIcon, label: 'Perfil' },
];

export default function Layout({ children }) {
  const location = useLocation();
  const { user, refreshUser } = useAuth();
  const isAuthPage = ['/login', '/register'].includes(location.pathname);
  const [processing, setProcessing] = useState(false);

  const handleProcessDevice = async (id, status) => {
    setProcessing(true);
    try {
      await api.post(`/users/device-requests/${id}`, { status });
      await refreshUser();
    } catch (err) {
      alert(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const pendingRequest = user?.pending_device_requests?.[0];

  return (
    <div className="app-container">
      {/* Security Alert Modal */}
      <AnimatePresence>
        {pendingRequest && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="w-full max-w-sm bg-[#161926] border border-sav-primary/30 p-8 rounded-[2.5rem] shadow-2xl space-y-8 text-center"
            >
              <div className="relative">
                <div className="w-20 h-20 bg-sav-primary/10 rounded-3xl flex items-center justify-center mx-auto text-sav-primary border border-sav-primary/20 animate-pulse">
                  <Smartphone size={40} />
                </div>
                <div className="absolute -top-2 -right-2 bg-sav-error text-white p-2 rounded-full shadow-lg">
                  <ShieldCheck size={16} />
                </div>
              </div>
              
              <div className="space-y-3">
                <h3 className="text-2xl font-black text-white uppercase tracking-tight italic">Alerta de Seguridad</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                  Se ha detectado un intento de vinculación desde un nuevo dispositivo. ¿Eres tú?
                </p>
              </div>

              <div className="bg-black/40 rounded-2xl p-5 border border-white/5 space-y-4 text-left">
                <div>
                  <p className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Modelo de Dispositivo</p>
                  <p className="text-sm font-black text-white tracking-tight italic uppercase">{pendingRequest.modelo_dispositivo}</p>
                </div>
                <div>
                  <p className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">ID Único</p>
                  <p className="text-[10px] font-bold text-sav-primary tracking-widest truncate">{pendingRequest.device_id}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Button 
                  onClick={() => handleProcessDevice(pendingRequest.id, 'aprobado')}
                  loading={processing}
                  className="bg-emerald-600 hover:bg-emerald-500 border-none h-14"
                  icon={CheckCircle2}
                >
                  Sí, soy yo
                </Button>
                <Button 
                  onClick={() => handleProcessDevice(pendingRequest.id, 'rechazado')}
                  loading={processing}
                  variant="outline"
                  className="border-white/10 text-slate-400 hover:bg-sav-error hover:text-white hover:border-sav-error h-14"
                  icon={XCircle}
                >
                  No soy yo
                </Button>
              </div>
              
              <p className="text-[8px] font-bold text-slate-600 uppercase tracking-widest">
                Si rechazas, el otro dispositivo será bloqueado permanentemente.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Aurora Background Effect */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] -left-[10%] w-[60%] h-[40%] bg-sav-primary/10 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute bottom-[-10%] -right-[10%] w-[60%] h-[40%] bg-sav-accent/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <div className="flex-1 relative z-10 overflow-x-hidden no-scrollbar pb-32">
        {children}
      </div>

      <FloatingQuestionnaire />

      {!isAuthPage && (
        <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] nav-blur py-4 px-4 z-50 flex items-center justify-around">
          {navItems.map((item) => {
            const isActive = location.pathname === item.to;
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={cn(
                  "nav-item group",
                  isActive ? "nav-item-active" : "text-sav-muted"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="active-pill"
                    className="absolute -top-1 w-8 h-1 bg-sav-primary rounded-full shadow-[0_0_15px_rgba(220,38,38,0.8)]"
                  />
                )}
                <div className={cn(
                  "transition-all duration-300",
                  isActive ? "scale-110 drop-shadow-[0_0_10px_rgba(220,38,38,0.5)]" : "scale-100 opacity-60 group-active:scale-90"
                )}>
                  <Icon size={26} strokeWidth={isActive ? 2.5 : 1.5} />
                </div>
                <span className={cn(
                  "text-[9px] font-black uppercase tracking-widest transition-all",
                  isActive ? "text-white opacity-100" : "opacity-40"
                )}>
                  {item.label}
                </span>
              </NavLink>
            );
          })}
        </nav>
      )}
    </div>
  );
}
