import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Layout from '../components/Layout';
import Header from '../components/Header';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { isScheduleOpen } from '../lib/schedule';
import { 
  Clock, Sparkles, Zap, ArrowRight, Loader2,
  TrendingUp, Award, Crown
} from 'lucide-react';
import { displayLevelCode } from '../lib/displayLevel.js';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { cn } from '../lib/utils/cn';

export default function Recharge() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [niveles, setNiveles] = useState([]);
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [isMounted, setIsMounted] = useState(false);
  const [isScheduleLocked, setIsScheduleLocked] = useState(false);
  const [scheduleMsg, setScheduleMsg] = useState('');

  useEffect(() => {
    setIsMounted(true);
    
    const loadData = async () => {
      try {
        const data = await api.levels.list();
        setNiveles(data || []);
      } catch (err) {
        console.error('Error cargando niveles:', err);
      }
    };

    loadData();
    api.publicContent().then(data => {
      if (data?.horario_recarga) {
        const sched = isScheduleOpen(data.horario_recarga);
        if (!sched.ok) {
          setIsScheduleLocked(true);
          setScheduleMsg(sched.message);
        }
      }
    }).catch(() => {});
  }, []);

  const handleLevelSelect = (level) => {
    // Si ya está seleccionado, lo deseleccionamos para forzar re-render de AnimatePresence
    if (selectedLevel?.id === level.id) {
      setSelectedLevel(null);
    } else {
      setSelectedLevel(level);
    }
  };

  const handleContinue = () => {
    if (!selectedLevel) return;
    navigate('/pagar', { state: { level: selectedLevel } });
  };

  if (!user && isMounted) {
    return (
      <Layout>
        <div className="min-h-[80vh] flex flex-col items-center justify-center bg-sav-dark p-10">
          <div className="relative">
            <Loader2 className="animate-spin text-sav-primary mb-4" size={40} />
            <div className="absolute inset-0 bg-sav-primary/20 blur-xl animate-pulse" />
          </div>
          <p className="text-[10px] font-black text-sav-muted uppercase tracking-[0.3em] animate-pulse">Sincronizando Perfil...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-sav-dark">
        <Header title="Subir de Nivel" />
        
        {/* Background Decor */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-gradient-to-b from-sav-primary/5 to-transparent blur-[120px]" />
        </div>

        <main className="p-6 space-y-10 pb-32 animate-fade">
          {/* Nivel Actual */}
          <section className="relative">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative z-10"
            >
              <Card variant="premium" className="relative overflow-hidden p-8 text-center border-none shadow-[0_30px_60px_-15px_rgba(220,38,38,0.3)]">
                <div className="relative z-10">
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 mb-6 backdrop-blur-md">
                    <div className="w-1.5 h-1.5 bg-sav-primary rounded-full animate-pulse" />
                    <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Socio Activo</span>
                  </div>
                  
                  <h2 className="text-4xl font-black tracking-tighter text-white uppercase drop-shadow-2xl mb-2">
                    {displayLevelCode(user?.nivel_codigo)}
                  </h2>
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Nivel de Membresía</span>
                  </div>
                </div>
              </Card>
            </motion.div>
          </section>

          {isScheduleLocked && (
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
              <Card className="p-5 border-sav-error/30 bg-sav-error/5 flex items-start gap-4 shadow-xl">
                <div className="p-2.5 rounded-xl bg-sav-error/10 text-sav-error shadow-inner">
                  <Clock size={20} />
                </div>
                <div>
                  <h4 className="text-xs font-black text-sav-error uppercase tracking-widest mb-1">Horario Restringido</h4>
                  <p className="text-[10px] text-sav-error/70 font-bold uppercase leading-relaxed tracking-wide">{scheduleMsg}</p>
                </div>
              </Card>
            </motion.div>
          )}

          {/* Step 1: Selection */}
          <section className="space-y-6">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-sav-primary/10 flex items-center justify-center text-sav-primary border border-sav-primary/20 shadow-lg">
                  <TrendingUp size={16} />
                </div>
                <h3 className="text-[11px] font-black text-white uppercase tracking-[0.3em]">1. Escoge el nivel a comprar</h3>
              </div>
              <Badge variant="info" className="bg-white/5 border-white/10 px-3 py-1 text-[10px] font-black">BCB GLOBAL</Badge>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {niveles.filter(n => (n.deposito || n.costo) > 0).map((n, i) => {
                const isSelected = selectedLevel?.id === n.id;
                const isCurrent = n.id === user?.nivel_id;
                const isHigher = n.orden > (niveles.find(lvl => lvl.id === user?.nivel_id)?.orden || 0);

                return (
                  <motion.button
                    key={n.id}
                    disabled={isCurrent || !isHigher}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => handleLevelSelect(n)}
                    className={cn(
                      "w-full text-left p-5 rounded-[2rem] border transition-all duration-300 relative overflow-hidden group",
                      isSelected 
                        ? "bg-sav-primary border-sav-primary shadow-[0_20px_40px_-10px_rgba(220,38,38,0.4)]" 
                        : "bg-[#161926] border-white/5 hover:border-white/10",
                      (isCurrent || !isHigher) && "opacity-40 grayscale cursor-not-allowed"
                    )}
                  >
                    <div className="flex justify-between items-center relative z-10">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "text-xs font-black uppercase tracking-widest",
                            isSelected ? "text-white" : "text-white/90"
                          )}>
                            {displayLevelCode(n.nombre)}
                          </span>
                          {isCurrent && <Badge variant="success" className="text-[7px] py-0">ACTUAL</Badge>}
                        </div>
                        <div className="flex items-baseline gap-1">
                          <span className={cn(
                            "text-2xl font-black tracking-tighter",
                            isSelected ? "text-white" : "text-white"
                          )}>
                            {Number(n.deposito || n.costo).toLocaleString('es-BO')}
                          </span>
                          <span className="text-[10px] font-bold opacity-60">BOB</span>
                        </div>
                      </div>

                      <div className="text-right space-y-1">
                        <p className={cn("text-[8px] font-black uppercase tracking-widest", isSelected ? "text-white/60" : "text-sav-muted")}>Renta Diaria</p>
                        <p className={cn("text-sm font-black", isSelected ? "text-white" : "text-sav-success")}>
                          +{Number(n.ingreso_diario || (Number(n.num_tareas_diarias || 0) * Number(n.ganancia_tarea || 0))).toLocaleString('es-BO', { minimumFractionDigits: 2 })} <span className="text-[8px]">BOB</span>
                        </p>
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </section>

          {/* Sticky Continue Button */}
          <div className="h-24" /> {/* Spacer to allow scrolling past the button */}
          <AnimatePresence mode="wait">
            {selectedLevel && (
              <motion.div 
                key="sticky-button"
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 50 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="fixed bottom-24 left-0 right-0 p-6 z-[100] flex justify-center pointer-events-none"
              >
                <div className="w-full max-w-md pointer-events-auto">
                  <Button 
                    onClick={handleContinue}
                    className="w-full h-16 rounded-[2rem] shadow-[0_20px_50px_-10px_rgba(220,38,38,0.5)] flex items-center justify-center gap-3 group bg-sav-primary hover:bg-sav-primary/90 transition-all border-none"
                  >
                    <span className="text-xs font-black uppercase tracking-[0.2em]">Continuar al Pago</span>
                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </Layout>
  );
}