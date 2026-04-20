import { motion } from 'framer-motion';
import { Calendar, ShieldCheck, Target, Zap } from 'lucide-react';

export default function AdminCalendarioV2() {
  return (
    <div className="space-y-10">
      <div className="flex items-center gap-4">
        <div className="p-3.5 rounded-2xl bg-gradient-to-tr from-sav-primary to-indigo-600 text-white shadow-xl">
          <Calendar size={24} />
        </div>
        <div>
          <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic">Operational Calendar</h1>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] flex items-center gap-2">
            <ShieldCheck size={14} className="text-sav-primary" /> Cronograma de eventos y pagos globales
          </p>
        </div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#161926] border border-white/5 p-20 rounded-[40px] flex flex-col items-center gap-6 text-center shadow-2xl"
      >
        <div className="p-6 rounded-[2rem] bg-sav-primary/10 text-sav-primary border border-sav-primary/20 shadow-inner">
          <Zap size={60} className="animate-pulse" />
        </div>
        <div className="space-y-2">
          <h3 className="text-2xl font-black text-white uppercase tracking-tighter italic">Schedule Manager V2.0</h3>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest max-w-md">
            El sistema de calendario se está integrando con los turnos de operadores de Telegram.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
