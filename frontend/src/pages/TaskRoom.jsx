import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext.jsx';
import Layout from '../components/Layout.jsx';
import { api } from '../lib/api.js';
import { 
  ShieldCheck, Play, Check, Clock, Wallet, 
  ArrowRight, X, Sparkles, AlertCircle, 
  ClipboardList, Trophy, Target, TrendingUp,
  ChevronRight
} from 'lucide-react';
import { useAndroidBackHandler } from '../hooks/useAndroidBackHandler.js';
import { cn } from '../lib/utils/cn';

// UI Components
import { Card } from '../components/ui/Card.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Badge } from '../components/ui/Badge.jsx';

export default function TaskRoom() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const [data, setData] = useState(null);
  const [niveles, setNiveles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTask, setActiveTask] = useState(null);
  const [timer, setTimer] = useState(10);
  const [surveyVisible, setSurveyVisible] = useState(false);
  const [selectedOption, setSelectedOption] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [videoFinished, setVideoFinished] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [earnedAmount, setEarnedAmount] = useState(0);
  const [isCorrect, setIsCorrect] = useState(false);
  const [correctAnswerFromServer, setCorrectAnswerFromServer] = useState('');
  const videoRef = useRef(null);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const [res, nivelesData] = await Promise.all([
        api.tasks.list(),
        api.levels.list()
      ]);
      setData(res);
      setNiveles(nivelesData || []);
      if (res.error) setError(res.error);
    } catch (err) {
      setError(err.message || 'Error de conexión.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible' && !activeTask) fetchTasks();
    }, 20000);
    return () => clearInterval(interval);
  }, [activeTask]);

  useEffect(() => {
    if (activeTask && videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {
        videoRef.current.muted = true;
        videoRef.current.play();
      });
    }
  }, [activeTask?.id]);

  useEffect(() => {
    let interval;
    if (activeTask && !surveyVisible && timer > 0) {
      interval = setInterval(() => setTimer(t => t - 1), 1000);
    } else if (timer === 0 && activeTask && !surveyVisible) {
      setSurveyVisible(true);
    }
    return () => clearInterval(interval);
  }, [activeTask, surveyVisible, timer]);

  useAndroidBackHandler(activeTask, () => setActiveTask(null));

  const startTask = (task) => {
    if (data.tareas_restantes <= 0) return;
    setActiveTask(task);
    setTimer(10);
    setSurveyVisible(false);
    setSelectedOption('');
    setShowResult(false);
    setVideoFinished(false);
    window.scrollTo(0, 0);
  };

  const onConfirmResponse = async () => {
    if (!selectedOption || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const res = await api.tasks.responder(activeTask.id, selectedOption);
      setShowResult(true);
      setEarnedAmount(res.monto);
      setCorrectAnswerFromServer(res.respuesta_correcta);
      setIsCorrect(res.correcta);
      if (res.correcta) refreshUser();
      else setErrorMessage(res.mensaje || 'Respuesta incorrecta');
    } catch (err) {
      setErrorMessage(err.message || 'Error de conexión');
      setShowResult(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading && !activeTask) {
    return (
      <Layout>
        <div className="p-10 flex flex-col items-center justify-center min-h-[70vh] space-y-6">
          <div className="w-16 h-16 border-4 border-sav-primary/10 border-t-sav-primary rounded-full animate-spin" />
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-sav-muted animate-pulse">Sincronizando BCB</p>
        </div>
      </Layout>
    );
  }

  if ((error || data?.bloqueado) && !activeTask) {
    const isSunday = new Date().getDay() === 0;
    const isHoliday = error?.includes('feriado') || error?.includes('suspendidas');

    return (
      <Layout>
        <div className="p-6 flex flex-col items-center justify-center min-h-[70vh] text-center space-y-8">
          <Card variant="premium" className="w-full flex flex-col items-center p-10 space-y-6">
            <div className={cn(
              "w-20 h-20 rounded-3xl flex items-center justify-center shadow-2xl",
              (isSunday || isHoliday) ? "bg-amber-500/10 text-amber-500" : "bg-sav-error/10 text-sav-error"
            )}>
              {(isSunday || isHoliday) ? <Clock size={48} /> : <ShieldCheck size={48} />}
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black uppercase tracking-tight text-white leading-none">
                {isSunday ? 'Descanso Dominical' : (isHoliday ? 'Día No Laboral' : 'Acceso Restringido')}
              </h2>
              <p className="text-[10px] font-bold text-sav-muted uppercase tracking-widest leading-relaxed max-w-[250px]">
                {error || data?.mensaje || 'Las tareas no están disponibles en este momento.'}
              </p>
            </div>
            <Button onClick={() => navigate('/')} variant="outline" className="border-white/10 text-[10px] h-12 uppercase tracking-widest">Volver al Inicio</Button>
          </Card>
          
          {(data?.bloqueado || (!isSunday && !isHoliday)) && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full">
              <Link to="/vip" className="w-full">
                <Button variant="primary" className="shadow-sav-glow text-[10px] h-14 uppercase tracking-widest">Mejorar a GLOBAL ahora</Button>
              </Link>
            </motion.div>
          )}
        </div>
      </Layout>
    );
  }

  if (activeTask) {
    return (
      <Layout>
        <div className="min-h-screen bg-sav-dark flex flex-col animate-fade pb-10">
          <header className="px-6 py-6 flex items-center justify-between sticky top-0 z-50 nav-blur">
            <button onClick={() => setActiveTask(null)} className="p-2 bg-sav-surface rounded-xl border border-sav-border text-white">
              <X size={20} />
            </button>
            <div className="text-center">
              <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-sav-muted leading-none mb-1">Campaña Activa</h2>
              <p className="text-xs font-black text-white uppercase tracking-tight">{activeTask.nombre}</p>
            </div>
            <div className="w-10" />
          </header>

          <main className="px-5 py-6 space-y-6 flex-1 max-w-[430px] mx-auto w-full">
            {/* Video Card */}
            <div className="relative aspect-video rounded-3xl overflow-hidden border border-sav-border bg-black shadow-2xl">
              <video 
                ref={videoRef}
                src={activeTask.video_url}
                className="w-full h-full object-cover"
                onEnded={() => setVideoFinished(true)}
                playsInline
                autoPlay
              />
              {!surveyVisible && !showResult && (
                <div className="absolute top-4 right-4 px-3 py-1.5 bg-sav-dark/60 backdrop-blur-md rounded-xl border border-white/10 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-sav-primary rounded-full animate-ping" />
                  <span className="text-xs font-black text-white">{timer}s</span>
                </div>
              )}
            </div>

            <AnimatePresence mode="wait">
              {showResult ? (
                <Card variant="premium" className="text-center p-10 space-y-6 animate-in">
                  <div className={cn(
                    "w-20 h-20 rounded-3xl mx-auto flex items-center justify-center shadow-lg",
                    isCorrect ? "bg-sav-success/20 text-sav-success" : "bg-sav-error/20 text-sav-error"
                  )}>
                    {isCorrect ? <Trophy size={40} /> : <AlertCircle size={40} />}
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-black uppercase tracking-tight text-white">
                      {isCorrect ? '¡Felicidades!' : 'Reintenta'}
                    </h3>
                    <p className="text-[10px] font-bold text-sav-muted uppercase tracking-widest">
                      {isCorrect ? `Has ganado ${earnedAmount} BOB` : errorMessage}
                    </p>
                  </div>
                  <Button onClick={() => { setActiveTask(null); fetchTasks(); }}>Continuar</Button>
                </Card>
              ) : surveyVisible ? (
                <Card className="p-8 space-y-6 animate-in">
                  <div className="text-center space-y-2">
                    <Badge variant="info">Verificación de Usuario</Badge>
                    <h3 className="text-lg font-black text-white uppercase tracking-tight leading-tight">
                      {activeTask.pregunta}
                    </h3>
                  </div>
                  <div className="space-y-3">
                    {activeTask.opciones?.map((opt, i) => (
                      <button
                        key={i}
                        onClick={() => setSelectedOption(opt)}
                        className={cn(
                          "w-full h-14 px-6 rounded-2xl border text-[11px] font-black uppercase tracking-widest text-left flex items-center justify-between transition-all",
                          selectedOption === opt 
                            ? "bg-sav-primary border-sav-primary text-white shadow-lg shadow-sav-primary/20" 
                            : "bg-sav-surface border-sav-border text-sav-muted hover:border-white/20"
                        )}
                      >
                        {opt}
                        {selectedOption === opt && <Check size={16} />}
                      </button>
                    ))}
                  </div>
                  <Button 
                    onClick={onConfirmResponse} 
                    loading={isSubmitting} 
                    disabled={!selectedOption}
                  >
                    Confirmar Respuesta
                  </Button>
                </Card>
              ) : (
                <Card variant="flat" className="p-6 flex items-center gap-4 animate-in">
                  <div className="w-12 h-12 bg-sav-primary/10 rounded-2xl flex items-center justify-center text-sav-primary animate-pulse">
                    <Clock size={24} />
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] font-black text-sav-muted uppercase tracking-widest">Analizando contenido...</p>
                    <p className="text-xs font-black text-white uppercase tracking-tight mt-1">Espera {timer} segundos</p>
                  </div>
                </Card>
              )}
            </AnimatePresence>
          </main>
        </div>
      </Layout>
    );
  }

  const currentLevel = niveles.find(n => n.id === user?.nivel_id);
  const taskReward = Number(currentLevel?.ganancia_tarea || 0);
  const tareasCompletadas = Number(data?.tareas_completadas || 0);
  const tareasRestantes = Number(data?.tareas_restantes || 0);
  const totalDiarias = tareasCompletadas + tareasRestantes;
  const progress = totalDiarias > 0 ? (tareasCompletadas / totalDiarias) * 100 : 0;

  return (
    <Layout>
      <header className="px-6 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-black text-white uppercase tracking-tighter leading-none">Tareas</h1>
          <Badge variant="info">{data?.nivel || 'Cargando...'}</Badge>
        </div>
        
        <Card variant="flat" className="p-6 space-y-4 border-sav-primary/10 bg-gradient-to-br from-sav-card to-sav-dark">
          <div className="flex justify-between items-end">
            <div className="space-y-1">
              <p className="text-[10px] font-black text-sav-muted uppercase tracking-widest">Progreso Diario</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-white">{tareasCompletadas}</span>
                <span className="text-xs font-bold text-sav-muted uppercase">/ {totalDiarias}</span>
              </div>
            </div>
            <span className="text-[10px] font-black text-sav-primary uppercase tracking-widest">{Math.round(progress)}%</span>
          </div>
          <div className="h-2 bg-sav-surface rounded-full overflow-hidden border border-sav-border">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              className="h-full bg-sav-primary shadow-[0_0_10px_rgba(220,38,38,0.5)]" 
            />
          </div>
        </Card>
      </header>

      <main className="px-5 space-y-4 pb-10">
        <div className="flex items-center gap-2 px-1 mb-2">
          <Target size={16} className="text-sav-primary" />
          <h2 className="text-[11px] font-black text-white uppercase tracking-[0.2em]">Disponibles Ahora</h2>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {data?.tareas?.map((t, i) => (
            <Card 
              key={t.id} 
              variant="outline" 
              className="p-4 flex items-center gap-4 active:scale-[0.98] transition-all cursor-pointer group"
              onClick={() => startTask(t)}
              delay={i * 0.05}
            >
              <div className="relative w-20 h-20 rounded-2xl overflow-hidden border border-sav-border shrink-0">
                <img src="/imag/logo.jpeg" alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                <div className="absolute inset-0 bg-sav-dark/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Play size={24} className="text-white fill-white" />
                </div>
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center justify-between">
                  <Badge className="px-2 py-0.5" variant="info">VIDEO</Badge>
                  <span className="text-sm font-black text-sav-success">+{taskReward.toFixed(2)} <span className="text-[9px]">BOB</span></span>
                </div>
                <h3 className="text-sm font-black text-white uppercase tracking-tight truncate">{t.nombre}</h3>
                <p className="text-[10px] text-sav-muted font-bold uppercase tracking-widest flex items-center gap-1.5">
                  <Clock size={10} /> 10 segundos
                </p>
              </div>
              <ArrowRight size={18} className="text-sav-muted group-hover:text-sav-primary group-hover:translate-x-1 transition-all" />
            </Card>
          ))}
          
          {(!data?.tareas || data.tareas.length === 0) && (
            <div className="py-20 flex flex-col items-center justify-center text-center space-y-4 opacity-40">
              <ClipboardList size={48} />
              <p className="text-[10px] font-black uppercase tracking-widest">No hay tareas pendientes</p>
            </div>
          )}
        </div>

        {/* Visibility Everywhere - Investment Opportunities */}
        <section className="space-y-4 pt-6">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <TrendingUp size={16} className="text-sav-primary" />
              <h3 className="text-[11px] font-black text-white uppercase tracking-[0.2em]">Sube de Nivel</h3>
            </div>
            <Link to="/vip" className="text-[9px] font-black text-sav-primary uppercase tracking-widest flex items-center gap-1">
              Ver VIP <ChevronRight size={12} />
            </Link>
          </div>

          <div className="flex gap-4 overflow-x-auto pb-4 px-1 no-scrollbar snap-x">
            {niveles.filter(n => (n.deposito || n.costo) > 0).map((n, i) => {
              const esActual = n.id === user?.nivel_id;
              return (
                <Link 
                  key={n.id} 
                  to="/vip"
                  className={cn(
                    "min-w-[150px] p-5 rounded-[2rem] border transition-all snap-start relative overflow-hidden group",
                    esActual ? "bg-sav-primary/10 border-sav-primary/30" : "bg-white/5 border-white/5"
                  )}
                >
                  <div className="space-y-3 relative z-10">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-black text-white/90 uppercase tracking-tighter">{n.nombre}</span>
                      {esActual && <div className="w-1.5 h-1.5 rounded-full bg-sav-success animate-pulse" />}
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-[8px] font-black text-sav-muted uppercase tracking-widest leading-none">Ganancia Diaria</p>
                      <p className="text-lg font-black text-white">+{Number(n.ingreso_diario || (Number(n.num_tareas_diarias || 0) * Number(n.ganancia_tarea || 0))).toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="absolute right-[-10px] bottom-[-10px] opacity-[0.05] rotate-12 group-hover:rotate-[25deg] transition-transform duration-700">
                    <TrendingUp size={50} />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      </main>
    </Layout>
  );
}
