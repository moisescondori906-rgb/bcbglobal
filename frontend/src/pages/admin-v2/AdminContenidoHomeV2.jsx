import { motion } from 'framer-motion';
import { Settings, ShieldCheck, Target, Zap } from 'lucide-react';

export default function AdminContenidoHomeV2() {
  return (
    <div className="space-y-10">
      <div className="flex items-center gap-4">
        <div className="p-3.5 rounded-2xl bg-gradient-to-tr from-sav-primary to-indigo-600 text-white shadow-xl">
          <Settings size={24} />
        </div>
        <div>
          <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic">System Configuration</h1>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] flex items-center gap-2">
            <ShieldCheck size={14} className="text-sav-primary" /> Ajustes globales del ecosistema BCB Global
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
          <h3 className="text-2xl font-black text-white uppercase tracking-tighter italic">Module in Deployment</h3>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest max-w-md">
            Esta sección de configuración avanzada está siendo optimizada para la versión 2.0. Estará disponible en el próximo despliegue.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
