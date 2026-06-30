import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home as HomeIcon, Users as UsersIcon, Gem as GemIcon, Wallet as WalletIcon, User as UserIcon, ClipboardList } from 'lucide-react';
import FloatingQuestionnaire from './FloatingQuestionnaire.jsx';
import { cn } from '../lib/utils/cn';

const navItems = [
  { to: '/', icon: HomeIcon, label: 'Inicio' },
  { to: '/tareas', icon: ClipboardList, label: 'Tareas' },
  { to: '/vip', icon: GemIcon, label: 'VIP' },
  { to: '/equipo', icon: UsersIcon, label: 'Mi Equipo' },
  { to: '/usuario', icon: UserIcon, label: 'Perfil' },
];

export default function Layout({ children }) {
  const location = useLocation();
  const isAuthPage = ['/login', '/register'].includes(location.pathname);

  return (
    <div className="app-container">
      {/* Vibrant Background with Image */}
      <div 
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          backgroundImage: 'url("/imag/fondobase.webp")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      />
      {/* Subtle gradient overlay to make text more readable */}
      <div className="fixed inset-0 pointer-events-none z-0 bg-gradient-to-b from-transparent to-black/10" />

      <div className="flex-1 relative z-10 overflow-x-hidden no-scrollbar pb-[calc(100px+env(safe-area-inset-bottom))]">
        {children}
      </div>

      <FloatingQuestionnaire />

      {!isAuthPage && (
        <nav className="fixed bottom-0 left-0 right-0 w-full bg-gradient-to-t from-slate-900/95 via-slate-800/90 to-slate-800/80 backdrop-blur-2xl py-4 sm:py-5 px-5 sm:px-7 z-50 flex items-center justify-around border-t border-white/10 shadow-[0_-20px_60px_-20px_rgba(0,0,0,0.8)] rounded-t-[3xl">
          {navItems.map((item) => {
            const isActive = location.pathname === item.to;
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={cn(
                  "nav-item group relative flex-1 flex flex-col items-center justify-center py-2",
                  isActive ? "text-white" : "text-slate-400"
                )}
              >
                <div className={cn(
                  "transition-all duration-300 p-2 rounded-2xl",
                  isActive ? "bg-gradient-to-br from-indigo-600 to-purple-600 scale-110 shadow-lg shadow-indigo-500/50 border border-indigo-400/30" : "scale-100 group-active:scale-95"
                )}>
                  <Icon className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={isActive ? 2.5 : 2} />
                </div>
                <span className={cn(
                  "text-[7px] sm:text-[10px] font-bold uppercase tracking-[0.25em] mt-1.5 transition-colors leading-none text-center",
                  isActive ? "text-white opacity-100" : "text-slate-400 opacity-80"
                )}>
                  {item.label}
                </span>
                {isActive && (
                  <motion.div
                    layoutId="active-indicator"
                    className="absolute bottom-[-10px] w-12 h-1.5 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full shadow-lg shadow-indigo-500/60"
                  />
                )}
              </NavLink>
            );
          })}
        </nav>
      )}
    </div>
  );
}
