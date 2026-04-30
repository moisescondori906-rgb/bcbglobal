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
                  isActive ? "text-sav-primary opacity-100" : "opacity-40"
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
