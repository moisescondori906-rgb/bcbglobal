import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home as HomeIcon, Users as UsersIcon, Gem as GemIcon, Wallet as WalletIcon, User as UserIcon } from 'lucide-react';
import FloatingQuestionnaire from './FloatingQuestionnaire.jsx';
import { cn } from '../lib/utils/cn';

const navItems = [
  { to: '/', icon: HomeIcon, label: 'Inicio' },
  { to: '/tareas', icon: UsersIcon, label: 'Tareas' },
  { to: '/vip', icon: GemIcon, label: 'VIP' },
  { to: '/ganancias', icon: WalletIcon, label: 'Billetera' },
  { to: '/usuario', icon: UserIcon, label: 'Perfil' },
];

export default function Layout({ children }) {
  const location = useLocation();
  const isAuthPage = ['/login', '/register'].includes(location.pathname);

  return (
    <div className="app-container">
      {/* Aurora Background Effect - Más llamativo */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-20%] -left-[20%] w-[100%] h-[70%] bg-sav-primary/10 rounded-full blur-[140px] animate-pulse" />
        <div className="absolute bottom-[-15%] -right-[15%] w-[80%] h-[60%] bg-sav-accent/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/4 right-[-10%] w-[50%] h-[40%] bg-sav-accent-hot/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '4s' }} />
      </div>

      <div className="flex-1 relative z-10 overflow-x-hidden no-scrollbar pb-32">
        {children}
      </div>

      <FloatingQuestionnaire />

      {!isAuthPage && (
        <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[94%] max-w-[420px] bg-white/90 backdrop-blur-3xl py-4 px-6 z-50 flex items-center justify-around rounded-[3rem] border border-white shadow-[0_25px_60px_-15px_rgba(0,0,0,0.2)]">
          {navItems.map((item) => {
            const isActive = location.pathname === item.to;
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={cn(
                  "nav-item group relative",
                  isActive ? "text-sav-primary" : "text-slate-500"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="active-pill"
                    className="absolute -bottom-1 w-2 h-2 bg-sav-primary rounded-full shadow-sav-glow"
                  />
                )}
                <div className={cn(
                  "transition-all duration-500 p-2.5 rounded-2xl",
                  isActive ? "bg-sav-primary/10 scale-110 shadow-inner" : "scale-100 group-active:scale-90"
                )}>
                  <Icon size={26} strokeWidth={isActive ? 3 : 2} />
                </div>
                <span className={cn(
                  "text-[9px] font-black uppercase tracking-[0.15em] transition-all mt-1",
                  isActive ? "opacity-100" : "opacity-0 scale-0 h-0 overflow-hidden"
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
