import { motion } from 'framer-motion';
import { cn } from '../../lib/utils/cn';

export default function StatCard({ label, value, icon: Icon, color, bg, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.5 }}
      className={cn(
        "relative overflow-hidden rounded-[2rem] p-5 border border-white/5 shadow-2xl backdrop-blur-3xl",
        bg || "bg-white/5"
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={cn("p-3 rounded-2xl bg-white/5 border border-white/5", color || "text-sav-accent")}>
          <Icon size={20} strokeWidth={2.5} />
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[8px] font-black uppercase tracking-[0.3em] text-sav-muted mb-1">
            {label}
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-black text-slate-900 tracking-tighter">{value}</span>
            <span className="text-[9px] font-bold text-sav-muted uppercase">BOB</span>
          </div>
        </div>
      </div>
      
      {/* Decorative pulse line at the bottom */}
      <div className={cn("h-1 w-12 rounded-full", color?.replace('text-', 'bg-') || "bg-sav-accent")} />
      
      {/* Background glow */}
      <div className={cn(
        "absolute -bottom-10 -right-10 w-24 h-24 blur-[50px] opacity-10 rounded-full",
        color?.replace('text-', 'bg-') || "bg-sav-accent"
      )} />
    </motion.div>
  );
}
