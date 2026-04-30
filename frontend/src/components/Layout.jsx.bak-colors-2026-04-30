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
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-15%] -left-[10%] w-[80%] h-[50%] bg-sav-primary/5 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] -right-[10%] w-[60%] h-[40%] bg-sav-accent/5 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <div className="flex-1 relative z-10 overflow-x-hidden no-scrollbar pb-32">
        {children}
      </div>

      <FloatingQuestionnaire />

      {!isAuthPage && (
        <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[92%] max-w-[400px] bg-white/80 backdrop-blur-2xl py-3 px-6 z-50 flex items-center justify-around rounded-[2.5rem] border border-white/40 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.15)]">
          {navItems.map((item) => {
            const isActive = location.pathname === item.to;
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={cn(
                  "nav-item group relative",
                  isActive ? "nav-item-active" : "text-slate-400"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="active-pill"
                    className="absolute -bottom-1 w-1.5 h-1.5 bg-sav-primary rounded-full shadow-sav-glow"
                  />
                )}
                <div className={cn(
                  "transition-all duration-500 p-2 rounded-2xl",
                  isActive ? "bg-sav-primary/10 scale-110" : "scale-100 group-active:scale-90"
                )}>
                  <Icon size={24} strokeWidth={isActive ? 2.5 : 1.5} />
                </div>
                <span className={cn(
                  "text-[8px] font-black uppercase tracking-[0.2em] transition-all mt-0.5",
                  isActive ? "text-sav-primary opacity-100" : "opacity-0 scale-0 h-0 overflow-hidden"
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
