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
  ChevronRight, Heart, Coffee, Sun, Home, Calendar
} from 'lucide-react';
import { useAndroidBackHandler } from '../hooks/useAndroidBackHandler.js';
import { cn } from '../lib/utils/cn';

// UI Components
import { Card } from '../components/ui/Card.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Badge } from '../components/ui/Badge.jsx';

import { getperuNow as getBoliviaNow } from '../utils/time';

// Helper to map task name to logo file
const getLogoForTask = (taskName) => {
  const name = taskName.toLowerCase();
  if (name.includes('ferrari')) return 'logoferrari.webp';
  if (name.includes('adidas')) return 'logoadidas.webp';
  if (name.includes('nike')) return 'logonike.webp';
  if (name.includes('coca')) return 'logococacola.webp';
  if (name.includes('tesla')) return 'logotesla.webp';
  if (name.includes('puma')) return 'logopuma.webp';
  if (name.includes('gucci')) return 'logogucci.webp';
  if (name.includes('chanel')) return 'logochanel.webp';
  if (name.includes('rolex')) return 'logorolex.webp';
  if (name.includes('mcdonald')) return 'logomcdonals.webp';
  if (name.includes('lamborghini')) return 'logolamborghini.webp';
  if (name.includes('dior')) return 'logodior.webp';
  return 'logo.webp'; // Fallback
};

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
  const [quizStep, setQuizStep] = useState(false);
  const [quizOptions, setQuizOptions] = useState([]);
  const [correctAnswer, setCorrectAnswer] = useState('');
  const [quizError, setQuizError] = useState(false);
  const [videoLoading, setVideoLoading] = useState(false);
  const videoRef = useRef(null);
  const preloadedVideosRef = useRef(new Map()); // Almacenamos videos pre-cargados

  // Generar opciones aleatorias para el cuestionario
  const generateQuiz = (task) => {
    if (!task) return;
    const correct = task.nombre || 'Campaña';
    // Opciones muy fáciles y relacionadas con marcas populares
    const easyOptions = [
      'Adidas', 'Nike', 'Coca-Cola', 'Ferrari', 
      'Tesla', 'Puma', 'Gucci', 'Chanel', 
      'Rolex', 'McDonald\'s', 'Lamborghini', 'Dior',
      'Amazon', 'Apple', 'Samsung', 'Pepsi'
    ];
    
    // Filtrar la correcta y tomar 2 falsas de forma aleatoria
    const filteredFake = easyOptions.filter(o => o.toLowerCase() !== correct.toLowerCase());
    const shuffledFake = [...filteredFake].sort(() => 0.5 - Math.random());
    const fakeOptions = shuffledFake.slice(0, 2);
    
    const options = [correct, ...fakeOptions].sort(() => 0.5 - Math.random());
    
    setQuizOptions(options);
    setCorrectAnswer(correct);
    setQuizStep(true);
    setSurveyVisible(true);
  };

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
      // Usar getBoliviaNow para asegurar consistencia si se llegara a usar para lógica de tiempo local
      if (document.visibilityState === 'visible' && !activeTask) fetchTasks();
    }, 60000); // Polling cada 60s en lugar de 20s para reducir carga de red
    return () => clearInterval(interval);
  }, [activeTask]);

  // Pre-cargar videos de tareas cuando estén disponibles
  useEffect(() => {
    if (data?.tareas && data.tareas.length > 0) {
      data.tareas.forEach(task => {
        const videoUrl = api.getMediaUrl(task.video_url);
        if (!preloadedVideosRef.current.has(videoUrl)) {
          // Creamos un elemento video en memoria para pre-cargar
          const preloadVideo = document.createElement('video');
          preloadVideo.src = videoUrl;
          preloadVideo.muted = true;
          preloadVideo.preload = 'auto';
          preloadVideo.playsInline = true;
          preloadVideo.style.display = 'none';
          
          // Iniciamos la carga
          preloadVideo.load();
          
          // Almacenamos en ref para reutilizar luego
          preloadedVideosRef.current.set(videoUrl, preloadVideo);
        }
      });
    }
  }, [data?.tareas]);

  useEffect(() => {
    if (activeTask && videoRef.current) {
      const videoElement = videoRef.current;
      setVideoLoading(true);

      // Intentamos reproducir inmediatamente, sin esperar a canplay
      // Esto hace que se reproduzca al tiro
      videoElement.muted = false;
      videoElement.playsInline = true;
      videoElement.preload = 'auto';
      videoElement.currentTime = 0;
      
      // Intentamos reproducir sin esperar eventos
      videoElement.play().catch(err => {
        console.log('Autoplay prevented, waiting for user interaction', err);
      });
      
      // Pero también escuchamos canplaythrough para quitar el loading rápido
      const handleCanPlay = () => {
        setVideoLoading(false);
      };
      
      videoElement.addEventListener('canplay', handleCanPlay);
      videoElement.addEventListener('canplaythrough', handleCanPlay);
      
      // Si el video ya está cargado, quitar loading inmediatamente
      if (videoElement.readyState >= 3) {
        setVideoLoading(false);
      }
      
      return () => {
        videoElement.removeEventListener('canplay', handleCanPlay);
        videoElement.removeEventListener('canplaythrough', handleCanPlay);
      };
    }
  }, [activeTask?.id]);

  useEffect(() => {
    let interval;
    if (activeTask && !surveyVisible && timer > 0) {
      interval = setInterval(() => setTimer(t => t - 1), 1000);
    } else if (timer === 0 && activeTask && !surveyVisible) {
      setSurveyVisible(true);
      generateQuiz(activeTask); // Generar el cuestionario cuando el tiempo termine
    }
    return () => clearInterval(interval);
  }, [activeTask, surveyVisible, timer]);

  useAndroidBackHandler(activeTask, () => setActiveTask(null));

  const startTask = (task) => {
    if (data?.tareas_restantes <= 0) {
      setErrorMessage('Límite diario de tareas alcanzado. Sube de nivel para realizar más tareas.');
      setShowResult(true);
      setIsCorrect(false);
      return;
    }
    setActiveTask(task);
    setTimer(10);
    setSurveyVisible(false);
    setSelectedOption('');
    setShowResult(false);
    setVideoFinished(false);
    setQuizStep(false); // Resetear quiz step
    setQuizError(false); // Resetear quiz error
    window.scrollTo(0, 0);
  };

  const handleVideoEnd = () => {
    setVideoFinished(true);
    generateQuiz(activeTask);
  };

  const handleQuizAnswer = (option) => {
    if (option === correctAnswer) {
      setQuizError(false);
      completeTask();
    } else {
      setQuizError(true);
      // Resetear el error después de un momento
      setTimeout(() => setQuizError(false), 2000);
    }
  };

  const completeTask = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      // Generar idempotency_key única para evitar doble cobro
      const idempotency_key = `task_${activeTask.id}_${Date.now()}`;
      
      const res = await api.tasks.responder(activeTask.id, { idempotency_key });
      setShowResult(true);
      setEarnedAmount(res.monto);
      setIsCorrect(true); // Siempre correcto en este modo simplificado
      refreshUser();
    } catch (err) {
      setErrorMessage(err.message || 'Error de conexión');
      setShowResult(true);
      setIsCorrect(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading && !activeTask) {
    return (
      <Layout>
        <div className="p-10 flex flex-col items-center justify-center min-h-[70vh] space-y-6">
          <div className="w-16 h-16 border-4 border-bcb-primary/10 border-t-bcb-primary rounded-full animate-spin" />
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-bcb-muted animate-pulse">Sincronizando BCB</p>
        </div>
      </Layout>
    );
  }

  if ((error || data?.bloqueado) && !activeTask) {
    const isLevelBlocked = data && !data.tareas_restantes && data.num_tareas_diarias === 0;
    
    // Determinar el título basado en el mensaje del backend
    let displayTitle = isLevelBlocked ? 'Sube de Nivel' : 'Acceso Restringido';
    let displayMessage = error || data?.mensaje || (isLevelBlocked ? 'Tu nivel actual no tiene tareas disponibles. Adquiere un nivel GLOBAL para comenzar.' : 'Las tareas no están disponibles en este momento.');
    let Icon = ShieldCheck;
    let iconColor = "bg-amber-500/10 text-amber-500";
    let isSunday = false;

    const boliviaNow = getBoliviaNow();
    const today = boliviaNow.getDay();
    const msg = (error || data?.mensaje || '').toLowerCase();

    if (today === 0) { // Domingo
      isSunday = true;
      displayTitle = 'DOMINGO DE DESCANSO';
      displayMessage = 'Hoy no hay tareas disponibles. En BCB Global también valoramos el descanso. Aprovecha este día para compartir con tu familia, relajarte y disfrutar de un lindo domingo. Las tareas volverán a estar disponibles mañana.';
      Icon = Heart;
      iconColor = "bg-bcb-primary/10 text-bcb-primary";
    } else if (msg.includes('domingo')) {
      isSunday = true;
      displayTitle = 'DOMINGO DE DESCANSO';
      displayMessage = 'Hoy no hay tareas disponibles. En BCB Global también valoramos el descanso. Aprovecha este día para compartir con tu familia, relajarte y disfrutar de un lindo domingo. Las tareas volverán a estar disponibles mañana.';
      Icon = Heart;
      iconColor = "bg-bcb-primary/10 text-bcb-primary";
    } else if (msg.includes('feriado')) {
      displayTitle = 'Tareas suspendidas';
    } else if (msg.includes('mantenimiento')) {
      displayTitle = 'Sistema en mantenimiento';
    }

    return (
      <Layout>
        <div className="p-6 flex flex-col items-center justify-center min-h-[70vh] text-center space-y-8">
          <Card variant="premium" className="w-full flex flex-col items-center p-10 space-y-6">
            <div className={cn(
              "w-20 h-20 rounded-3xl flex items-center justify-center shadow-2xl",
              iconColor
            )}>
              <Icon size={48} />
            </div>
            <div className="space-y-4">
              <h2 className={cn(
                "text-2xl font-black uppercase tracking-tight leading-none",
                isSunday ? "text-bcb-primary" : "text-gray-900"
              )}>
                {displayTitle}
              </h2>
              <div className="space-y-4">
                {isSunday ? (
                  <>
                    <p className="text-sm font-bold text-gray-900 uppercase tracking-tight">
                      Hoy no hay tareas disponibles
                    </p>
                    <p className="text-[10px] font-bold text-bcb-muted uppercase tracking-widest leading-relaxed max-w-[280px] mx-auto">
                      En BCB Global también valoramos el descanso. Aprovecha este día para compartir con tu familia, relajarte y disfrutar de un lindo domingo.
                    </p>
                    <p className="text-[9px] font-black text-bcb-primary uppercase tracking-[0.2em]">
                      Las tareas volverán a estar disponibles mañana.
                    </p>
                  </>
                ) : (
                  <p className="text-[10px] font-bold text-bcb-muted uppercase tracking-widest leading-relaxed max-w-[250px]">
                    {displayMessage}
                  </p>
                )}
              </div>
            </div>
            <Button onClick={() => navigate('/')} variant="outline" className="border-black/5 text-[10px] h-12 uppercase tracking-widest">Volver al Inicio</Button>
          </Card>
          
          {(data?.bloqueado || isLevelBlocked) && !isSunday && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full">
              <Link to="/vip" className="w-full">
                <Button variant="primary" className="shadow-bcb-glow text-[10px] h-14 uppercase tracking-widest">Mejorar a VIP ahora</Button>
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
        <div className="min-h-screen flex flex-col animate-fade pb-10">
          <header className="px-6 py-6 flex items-center justify-between sticky top-0 z-50 nav-blur">
            <button onClick={() => setActiveTask(null)} className="p-2 bg-white rounded-xl border border-bcb-border text-gray-900">
              <X size={20} />
            </button>
            <div className="text-center">
              <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-bcb-muted leading-none mb-1">Campaña Activa</h2>
              <p className="text-xs font-black text-gray-900 uppercase tracking-tight">{activeTask.nombre}</p>
            </div>
            <div className="w-10" />
          </header>

          <main className="px-5 py-6 space-y-6 flex-1 max-w-[430px] mx-auto w-full">
            {/* Video Card */}
            <div className="relative aspect-video rounded-3xl overflow-hidden border border-bcb-border bg-black shadow-2xl">
              <video 
                ref={videoRef}
                src={api.getMediaUrl(activeTask.video_url)}
                className={cn("w-full h-full object-cover transition-opacity", videoLoading ? "opacity-50" : "opacity-100")}
                onEnded={handleVideoEnd}
                playsInline
                autoPlay
                muted={false}
                preload="auto"
                controls={false}
              />
              
              {/* Indicador de carga de video */}
              {videoLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm">
                  <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin mb-3" />
                  <p className="text-xs font-black text-white uppercase tracking-widest">Buscando videos promocionales para poder cobrar...</p>
                </div>
              )}

            </div>

            <AnimatePresence mode="wait">
              {showResult ? (
                <Card variant="premium" className="text-center p-10 space-y-6 animate-in">
                  <div className={cn(
                    "w-20 h-20 rounded-3xl mx-auto flex items-center justify-center shadow-lg",
                    isCorrect ? "bg-bcb-success/20 text-bcb-success" : "bg-bcb-error/20 text-bcb-error"
                  )}>
                    {isCorrect ? <Trophy size={40} /> : <AlertCircle size={40} />}
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-black uppercase tracking-tight text-black">
                      {isCorrect ? '¡Felicidades!' : 'Reintenta'}
                    </h3>
                    <p className="text-[10px] font-bold text-black uppercase tracking-widest">
                      {isCorrect ? `Has ganado ${earnedAmount} Bs` : errorMessage}
                    </p>
                  </div>
                  <Button onClick={() => { setActiveTask(null); fetchTasks(); }} className="bg-bcb-primary text-white">Continuar</Button>
                </Card>
              ) : (videoFinished || surveyVisible) ? (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6 p-8 bg-white rounded-3xl border border-slate-100 shadow-xl"
                >
                  <div className="text-center space-y-2">
                    <h3 className="text-lg font-black text-black uppercase tracking-tighter">Cuestionario de Verificación</h3>
                    <p className="text-[11px] font-bold text-black uppercase tracking-widest">¿Qué marca o campaña acabas de visualizar?</p>
                  </div>

                  <div className="grid gap-3">
                    {quizOptions.length > 0 ? quizOptions.map((option, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleQuizAnswer(option)}
                        className={cn(
                          "w-full p-4 rounded-2xl text-[12px] font-black uppercase tracking-widest transition-all border-2",
                          "hover:scale-[1.02] active:scale-98",
                          "bg-slate-50 border-slate-100 text-black hover:border-bcb-primary/30"
                        )}
                      >
                        {option}
                      </button>
                    )) : (
                      <p className="text-[10px] font-black text-slate-400 uppercase text-center py-4">Generando opciones...</p>
                    )}
                  </div>

                  {quizError && (
                    <motion.p 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-center text-[10px] font-black text-red-600 uppercase tracking-widest"
                    >
                      Respuesta incorrecta. Inténtalo de nuevo.
                    </motion.p>
                  )}
                </motion.div>
              ) : (
                <Card variant="flat" className="p-6 flex items-center gap-4 animate-in">
                  <div className="w-12 h-12 bg-bcb-primary/10 rounded-2xl flex items-center justify-center text-bcb-primary animate-pulse">
                    <Clock size={24} />
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] font-black text-black uppercase tracking-widest">Analizando contenido...</p>
                    <p className="text-xs font-black text-black uppercase tracking-tight mt-1">Espera {timer} segundos</p>
                  </div>
                </Card>
              )}
            </AnimatePresence>
          </main>
        </div>
      </Layout>
    );
  }

  const currentLevel = niveles.find(n => String(n.id) === String(user?.nivel_id));
  const taskReward = Number(data?.ganancia_tarea || currentLevel?.ganancia_tarea || 0);
  const tareasCompletadas = Number(data?.tareas_completadas || 0);
  const tareasRestantes = Number(data?.tareas_restantes || 0);
  const totalDiarias = Number(data?.num_tareas_diarias || currentLevel?.num_tareas_diarias || (tareasCompletadas + tareasRestantes));
  const progress = totalDiarias > 0 ? (tareasCompletadas / totalDiarias) * 100 : 0;

  if (!data && !loading) {
    return (
      <Layout>
        <div className="p-10 flex flex-col items-center justify-center min-h-[70vh] text-center space-y-4">
          <AlertCircle size={48} className="text-bcb-muted" />
          <p className="text-[10px] font-black uppercase tracking-widest text-bcb-muted">No se pudo cargar la información de tareas</p>
          <Button onClick={fetchTasks} variant="outline" size="sm">Reintentar</Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <header className="px-6 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-black text-gray-900 uppercase tracking-tighter leading-none">Tareas</h1>
          <Badge variant="info">{data?.nivel || 'Cargando...'}</Badge>
        </div>
        
        <Card variant="flat" className="p-6 space-y-4 border-black/5 bg-white shadow-xl shadow-black/5">
          <div className="flex justify-between items-end">
            <div className="space-y-1">
              <p className="text-[10px] font-black text-bcb-muted uppercase tracking-widest">Progreso Diario</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-gray-900">{tareasCompletadas}</span>
                <span className="text-xs font-bold text-bcb-muted uppercase">/ {totalDiarias}</span>
              </div>
            </div>
            <span className="text-[10px] font-black text-bcb-primary uppercase tracking-widest">{Math.round(progress)}%</span>
          </div>
          <div className="h-2 bg-black/5 rounded-full overflow-hidden border border-black/5">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              className="h-full bg-bcb-primary shadow-[0_0_10px_rgba(220,38,38,0.2)]" 
            />
          </div>
        </Card>
      </header>

      <main className="px-5 space-y-4 pb-10">
        <div className="flex items-center gap-2 px-1 mb-2">
          <Target size={16} className="text-bcb-primary" />
          <h2 className="text-[11px] font-black text-gray-900 uppercase tracking-[0.2em]">Disponibles Ahora</h2>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {data?.tareas?.map((t, i) => (
            <Card 
              key={`${t.id}-${i}`} // Usar i para evitar problemas de key si hay pocos videos
              variant="outline" 
              className={cn(
                "p-4 flex items-center gap-4 active:scale-[0.98] transition-all cursor-pointer group bg-white border-black/5",
                data.tareas_restantes <= 0 && "opacity-60 grayscale-[0.5]"
              )}
              onClick={() => startTask(t)}
              delay={i * 0.05}
            >
              <div className="relative w-20 h-20 rounded-2xl overflow-hidden border border-black/5 shrink-0 bg-white">
                <img 
                  src={`/imag/logotareas/${getLogoForTask(t.nombre)}`} 
                  alt={`Logo ${t.nombre}`}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center justify-between">
                  <Badge className="px-2 py-0.5" variant="info">VIDEO</Badge>
                  <span className="text-sm font-black text-bcb-success">+{(taskReward || 0).toFixed(2)} <span className="text-[9px]">Bs</span></span>
                </div>
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight truncate">{t.nombre}</h3>
                <p className="text-[10px] text-bcb-muted font-bold uppercase tracking-widest flex items-center gap-1.5">
                  <Clock size={10} /> 10 segundos
                </p>
              </div>
              <ArrowRight size={18} className="text-bcb-muted group-hover:text-bcb-primary group-hover:translate-x-1 transition-all" />
            </Card>
          ))}
          
          {(!data?.tareas || data.tareas.length === 0) && (
            <div className="py-20 flex flex-col items-center justify-center text-center space-y-4 opacity-40">
              <ClipboardList size={48} className="text-gray-400" />
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">No hay tareas pendientes</p>
            </div>
          )}
        </div>

        {/* Visibility Everywhere - Investment Opportunities */}
        <section className="space-y-4 pt-6">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <TrendingUp size={16} className="text-bcb-primary" />
              <h3 className="text-[11px] font-black text-gray-900 uppercase tracking-[0.2em]">Sube de Nivel</h3>
            </div>
            <Link to="/vip" className="text-[9px] font-black text-bcb-primary uppercase tracking-widest flex items-center gap-1">
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
                    esActual ? "bg-bcb-primary/10 border-bcb-primary/30" : "bg-black/5 border-black/5"
                  )}
                >
                  <div className="space-y-3 relative z-10">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-black text-gray-900 uppercase tracking-tighter">{n.nombre}</span>
                      {esActual && <div className="w-1.5 h-1.5 rounded-full bg-bcb-success animate-pulse" />}
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-[8px] font-black text-bcb-muted uppercase tracking-widest leading-none">Ganancia Diaria</p>
                      <p className="text-lg font-black text-gray-900">+{Number(n.ingreso_diario || (Number(n.num_tareas_diarias || 0) * Number(n.ganancia_tarea || 0))).toFixed(2)} <span className="text-[9px] opacity-60">Bs</span></p>
                    </div>
                  </div>
                  <div className="absolute right-[-10px] bottom-[-10px] opacity-[0.05] rotate-12 group-hover:rotate-[25deg] transition-transform duration-700 text-gray-900">
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


