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
  TrendingUp, Award, Crown, Lock
} from 'lucide-react';
import { displayLevelCode } from '../lib/displayLevel.js';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { cn } from '../lib/utils/cn';
import { getRechargeSchedule } from '../lib/operationSchedules.js';

export default function Recharge() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [niveles, setNiveles] = useState([]);
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [isMounted, setIsMounted] = useState(false);
  const [isScheduleLocked, setIsScheduleLocked] = useState(false);
  const [scheduleMsg, setScheduleMsg] = useState('');
  const [globalConfig, setGlobalConfig] = useState({
    bloquear_niveles_superiores_enabled: true,
    mensaje_niveles_superiores: 'Niveles disponibles solamente para líderes',
    nivel_minimo_lider: 4
  });

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
      if (data) {
        setGlobalConfig({
          bloquear_niveles_superiores_enabled: data.bloquear_niveles_superiores_enabled ?? true,
          mensaje_niveles_superiores: data.mensaje_niveles_superiores ?? 'Niveles disponibles solamente para líderes',
          nivel_minimo_lider: data.nivel_minimo_lider ?? 4
        });
      }
    }).catch(() => {});

    const sched = isScheduleOpen(getRechargeSchedule());
    if (!sched.ok) {
      setIsScheduleLocked(true);
      setScheduleMsg(sched.message);
    }
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
        <div className="min-h-[80vh] flex flex-col items-center justify-center bg-bcb-dark p-10">
          <div className="relative">
            <Loader2 className="animate-spin text-bcb-primary mb-4" size={40} />
            <div className="absolute inset-0 bg-bcb-primary/20 blur-xl animate-pulse" />
          </div>
          <p className="text-[10px] font-black text-bcb-muted uppercase tracking-[0.3em] animate-pulse">Sincronizando Perfil...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-bcb-dark pb-10">
        <Header title="Subir de Nivel" />
        
        <main className="px-4 sm:px-6 space-y-8 sm:space-y-10 pb-10 animate-fade pt-4">
          {/* Nivel Actual */}
          <section className="relative">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative z-10"
            >
              <Card className="relative overflow-hidden p-6 sm:p-8 text-center bg-bcb-card border-white/5 shadow-2xl space-y-6">
                <div className="relative z-10">
                  <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full bg-white/5 border border-white/5 mb-4 sm:mb-6">
                    <div className="w-1.5 h-1.5 bg-bcb-primary rounded-full animate-pulse" />
                    <span className="text-[9px] sm:text-[10px] font-black text-bcb-muted uppercase tracking-[0.2em]">Socio Activo</span>
                  </div>
                  
                  <h2 className="text-3xl sm:text-4xl font-black tracking-tighter text-white uppercase mb-1 sm:mb-2">
                    {displayLevelCode(user?.nivel_codigo)}
                  </h2>
                  <div className="flex items-center justify-center gap-2 mb-6">
                    <span className="text-[9px] sm:text-[10px] font-bold text-bcb-muted uppercase tracking-widest">Nivel de Membresía</span>
                  </div>
                  
                  {/* Imagen de Tabla de Inversiones */}
                  <img 
                    src="/imag/tabla_invercion.webp" 
                    alt="Tabla de Inversiones" 
                    className="w-full h-auto rounded-2xl object-cover"
                  />
                </div>
              </Card>
            </motion.div>
          </section>

          {isScheduleLocked && (
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
              <Card className="p-4 sm:p-5 border-bcb-error/30 bg-bcb-error/5 flex items-start gap-3 sm:gap-4 shadow-xl">
                <div className="p-2 sm:p-2.5 rounded-xl bg-bcb-error/10 text-bcb-error shadow-inner shrink-0">
                  <Clock size={18} className="sm:w-[20px] sm:h-[20px]" />
                </div>
                <div>
                  <h4 className="text-[11px] sm:text-xs font-black text-bcb-error uppercase tracking-widest mb-1">Horario Restringido</h4>
                  <p className="text-[9px] sm:text-[10px] text-bcb-error/70 font-bold uppercase leading-relaxed tracking-wide">{scheduleMsg}</p>
                </div>
              </Card>
            </motion.div>
          )}

          {/* Step 1: Selection */}
          <section className="space-y-5 sm:space-y-6">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-bcb-primary/10 flex items-center justify-center text-bcb-primary border border-bcb-primary/20 shadow-lg shrink-0">
                  <TrendingUp size={14} className="sm:w-[16px] sm:h-[16px]" />
                </div>
                <h3 className="text-[10px] sm:text-[11px] font-black text-white uppercase tracking-[0.2em] sm:tracking-[0.3em]">1. Selecciona Nivel</h3>
              </div>
              <Badge variant="outline" className="bg-white/5 border-white/5 px-2 sm:px-3 py-1 text-[9px] sm:text-[10px] font-black text-bcb-muted">BCB GLOBAL</Badge>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:gap-4">
              {niveles.filter(n => (n.deposito || n.costo) > 0).map((n, i) => {
                const isSelected = selectedLevel?.id === n.id;
                const isCurrent = n.id === user?.nivel_id;
                const userLevelOrder = niveles.find(lvl => lvl.id === user?.nivel_id)?.orden || 0;
                const isHigher = n.orden > userLevelOrder;
                const shouldBlock = globalConfig.bloquear_niveles_superiores_enabled && 
                  n.orden >= globalConfig.nivel_minimo_lider && 
                  userLevelOrder < globalConfig.nivel_minimo_lider;

                return (
                  <motion.button
                    key={n.id}
                    disabled={isCurrent || !isHigher || shouldBlock}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => handleLevelSelect(n)}
                    className={cn(
                      "w-full text-left p-4 sm:p-5 rounded-2xl sm:rounded-[2rem] border transition-all duration-300 relative overflow-hidden group",
                      isSelected 
                        ? "bg-bcb-primary border-bcb-primary shadow-lg sm:shadow-[0_20px_40px_-10px_rgba(220,38,38,0.4)]" 
                        : "bg-bcb-card border-white/5 hover:border-bcb-primary/20 shadow-sm",
                      (isCurrent || !isHigher) && "opacity-40 grayscale cursor-not-allowed",
                      shouldBlock && "cursor-not-allowed"
                    )}
                  >
                    {shouldBlock && (
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center z-20 backdrop-blur-[2px]">
                        <div className="bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 backdrop-blur-md px-10 py-7 rounded-[2.5rem] border-4 border-white/60 shadow-[0_0_40px_rgba(168,85,247,0.5)]">
                          <div className="flex items-center gap-4">
                            <div className="animate-bounce">
                              <Lock size={32} className="text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.7)]" />
                            </div>
                            <p className="text-white font-black text-base sm:text-xl text-center uppercase tracking-[0.3em] drop-shadow-[0_0_10px_rgba(255,255,255,0.6)] bg-gradient-to-r from-white via-yellow-100 to-white bg-clip-text text-transparent">
                              {globalConfig.mensaje_niveles_superiores}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    <div className="flex justify-between items-center relative z-10 min-w-0">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "text-[10px] sm:text-xs font-black uppercase tracking-widest truncate",
                            isSelected ? "text-white" : "text-slate-900"
                          )}>
                            {n.nombre}
                          </span>
                          {isCurrent && <Badge variant="success" className="text-[7px] py-0">ACTUAL</Badge>}
                        </div>
                        <div className="flex items-baseline gap-1 overflow-hidden">
                          <span className={cn(
                            "text-xl sm:text-2xl font-black tracking-tighter truncate",
                            isSelected ? "text-white" : "text-slate-900"
                          )}>
                            {Number(n.deposito || n.costo).toLocaleString('es-BO')}
                          </span>
                          <span className={cn("text-[9px] sm:text-[10px] font-bold shrink-0", isSelected ? "text-white/70" : "text-slate-500")}>Bs</span>
                        </div>
                      </div>

                      <div className="text-right space-y-0.5 sm:space-y-1 shrink-0 ml-2">
                        <p className={cn("text-[7px] sm:text-[8px] font-black uppercase tracking-widest", isSelected ? "text-white/70" : "text-slate-500")}>Renta Diaria</p>
                        <p className={cn("text-xs sm:text-sm font-black truncate", isSelected ? "text-white" : "text-emerald-600")}>
                          +{Number(n.ingreso_diario || (Number(n.num_tareas_diarias || 0) * Number(n.ganancia_tarea || 0))).toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </section>


          <AnimatePresence mode="wait">
            {selectedLevel && (
              <motion.div 
                key="sticky-button"
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 50 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="fixed bottom-[calc(100px+env(safe-area-inset-bottom))] left-0 right-0 p-4 sm:p-6 z-[100] flex justify-center pointer-events-none"
              >
                <div className="w-full max-w-[420px] pointer-events-auto px-4 sm:px-0">
                  <Button 
                    onClick={handleContinue}
                    className="w-full h-14 sm:h-16 rounded-xl sm:rounded-[2rem] shadow-2xl flex items-center justify-center gap-3 group bg-bcb-primary border-none text-white font-black uppercase tracking-widest"
                  >
                    <span>Continuar al Pago</span>
                    <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform sm:w-[18px] sm:h-[18px]" />
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
