import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils/cn';

export default function ActionGrid({ items }) {
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const itemAnim = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1 }
  };

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="grid grid-cols-3 gap-4"
    >
      {items.map((item, idx) => {
        const { to, icon: Icon, label, color, bg } = item;
        return (
          <motion.div key={idx} variants={itemAnim}>
            <Link
              to={to}
              className={cn(
                "group flex flex-col items-center gap-3 p-5 rounded-[2.2rem] border border-white/5 transition-all duration-500 hover:border-white/20 active:scale-95 hover:-translate-y-2 relative overflow-hidden shadow-2xl bg-gradient-to-br from-white/[0.03] to-transparent backdrop-blur-xl",
                bg || "bg-white/5"
              )}
            >
              <div className={cn("p-4 rounded-2xl shadow-inner transition-all duration-500 group-hover:scale-110 group-hover:shadow-glow", color || "text-sav-accent")}>
                <Icon size={28} strokeWidth={2} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-700 text-center leading-tight">
                {label}
              </span>
              
              {/* Subtle light reflection effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
            </Link>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
