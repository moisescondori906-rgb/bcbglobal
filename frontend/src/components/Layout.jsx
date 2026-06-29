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
        <nav className="fixed bottom-0 left-0 right-0 w-full bg-white/40 backdrop-blur-md py-3 sm:py-4 px-4 sm:px-6 z-50 flex items-center justify-around border-t-2 border-slate-200/50 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)]">
          {navItems.map((item) => {
            const isActive = location.pathname === item.to;
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={cn(
                  "nav-item group relative flex-1 flex flex-col items-center justify-center py-1",
                  isActive ? "text-indigo-900" : "text-slate-500"
                )}
              >
                <div className={cn(
                  "transition-all duration-300 p-1.5 rounded-xl",
                  isActive ? "bg-indigo-100 scale-110 shadow-sm border border-indigo-200" : "scale-100 group-active:scale-95"
                )}>
                  <Icon className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={isActive ? 3 : 2} />
                </div>
                <span className={cn(
                  "text-[6.5px] sm:text-[9px] font-black uppercase tracking-widest mt-1 transition-colors leading-none text-center",
                  isActive ? "text-indigo-900 opacity-100" : "text-slate-600 opacity-90"
                )}>
                  {item.label}
                </span>
                {isActive && (
                  <motion.div
                    layoutId="active-indicator"
                    className="absolute top-0 w-8 h-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full shadow-md shadow-indigo-500/40"
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
