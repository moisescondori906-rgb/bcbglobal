import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import Layout from '../components/Layout.jsx';
import RouletteWheel from '../components/dashboard/RouletteWheel.jsx';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { 
  Trophy, 
  Sparkles, 
  History, 
  Wallet, 
  ChevronRight, 
  Coins,
  AlertCircle,
  CheckCircle2,
  Lock,
  UserPlus,
  Gift,
  ArrowRight
} from 'lucide-react';
import { displayLevelCode } from '../lib/displayLevel.js';
import { formatTime } from '../lib/utils/format';

export default function Recompensas() {
  const { user, refreshUser } = useAuth();
  const [premios, setPremios] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [config, setConfig] = useState(null);
  const [teamStats, setTeamStats] = useState(null);
  const [spinning, setSpinning] = useState(false);
  const [targetIndex, setTargetIndex] = useState(-1);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [punished, setPunished] = useState(false);
  const [error, setError] = useState(null);
  const [codigoCanje, setCodigoCanje] = useState("");
  const [cargandoCanje, setCargandoCanje] = useState(false);
  const [mensajeCanje, setMensajeCanje] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const loadData = () => {
      Promise.all([
        api.sorteo.premios().catch(() => []),
        api.sorteo.historial().catch(() => []),
        api.sorteo.config().catch(() => null),
        api.users.team().catch(() => null)
      ]).then(([p, h, c, t]) => {
        if (isMounted) {
          setPremios(p || []);
          setHistorial(h || []);
          setConfig(c);
          setTeamStats(t);
          setLoading(false);
        }
      }).catch(err => {
        console.error('Error cargando datos de ruleta:', err);
        if (isMounted) setLoading(false);
      });
    };

    loadData();

    // Polling de respaldo para historial, config y premios cada 20 segundos
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible' && !spinning) {
        api.sorteo.premios().then(data => {
          if (isMounted) setPremios(data || []);
        }).catch(() => {});
        
        api.sorteo.historial().then(data => {
          if (isMounted) setHistorial(data || []);
        }).catch(() => {});
        
        api.sorteo.config().then(data => {
          if (isMounted) setConfig(data || null);
        }).catch(() => {});
      }
    }, 20000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [spinning]);

  const spinWheel = async () => {
    if (spinning || premios.length === 0 || (Number(user?.tickets_ruleta) || 0) < 1) return;
    
    setError(null);
    setResult(null);
    
    try {
      const idempotency_key = `spin_${user.id}_${Date.now()}`;
      const res = await api.sorteo.girar({ idempotency_key });
      
      if (res.ok) {
        const premioIndex = premios.findIndex(p => p.id === res.premio.id);
        setTargetIndex(premioIndex);
        setSpinning(true);
        // Guardar el premio temporalmente para mostrarlo al final de la animación
        setResult(res.premio);
      }
    } catch (err) {
      setError(err.message || 'Error al girar la ruleta');
      setSpinning(false);
    }
  };

  const handleSpinComplete = () => {
    setSpinning(false);
    setTargetIndex(-1);
    
    // Lanzar confeti si es un premio bueno
    if (result && Number(result.valor) > 0) {
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#f59e0b', '#10b981', '#ec4899', '#a855f7']
      });
    }

    refreshUser();
    api.sorteo.historial().then(data => {
       if (data) setHistorial(data);
    });
  };

  const handleCanjearCodigo = async (e) => {
    e.preventDefault();
    if (!codigoCanje.trim()) return;
    
    setCargandoCanje(true);
    setMensajeCanje(null);
    
    try {
      const res = await api.users.canjearCodigo(codigoCanje.trim().toUpperCase());
      setMensajeCanje({ tipo: "exito", texto: `¡Felicidades! Has canjeado ${res.valor} Bs exitosamente.` });
      setCodigoCanje("");
      refreshUser();
      
      // Lanzar confeti
      confetti({
        particleCount: 100,
        spread: 60,
        origin: { y: 0.5 },
        colors: ['#f59e0b', '#10b981', '#6366f1']
      });
    } catch (err) {
      setMensajeCanje({ tipo: "error", texto: err.message || "Error al canjear el código. Intenta nuevamente." });
    } finally {
      setCargandoCanje(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-amber-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (punished) {
    return (
      <Layout>
        <div className="p-8 text-center space-y-6 flex flex-col items-center justify-center min-h-[70vh] bg-white">
          <div className="w-24 h-24 bg-rose-50 text-rose-600 rounded-[2.5rem] flex items-center justify-center shadow-xl border border-rose-100 animate-pulse">
            <AlertCircle size={48} strokeWidth={1.5} />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Premios Bloqueados</h2>
            <p className="text-sm text-gray-400 font-medium leading-relaxed max-w-xs mx-auto">
              Tu acceso a la ruleta de premios ha sido <span className="text-rose-600 font-bold uppercase">bloqueado por hoy</span> como castigo por no responder el cuestionario obligatorio de ayer.
            </p>
          </div>
          <div className="bg-amber-50 p-6 rounded-[2rem] border border-amber-100 text-left w-full shadow-inner">
            <p className="text-[10px] text-amber-700 font-black uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
              <AlertCircle size={14} /> Nota:
            </p>
            <p className="text-xs text-amber-600 leading-relaxed font-medium">
              Asegúrate de responder el cuestionario de hoy para evitar ser sancionado nuevamente mañana.
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  // Si las recompensas no son visibles según el admin
  if (config && !config.recompensas_visibles) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6 text-center">
          <div className="max-w-xs">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6 text-gray-400">
              <Lock size={40} />
            </div>
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter mb-2">Sección Bloqueada</h2>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest leading-relaxed">
              El administrador ha desactivado temporalmente el centro de recompensas.
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  // Bloqueo para Internar (RELAJADO: Mostrar página pero deshabilitar giro)
  const isInternar = user?.nivel_codigo === 'internar';

  const amigosRequeridos = config?.recompensa_amigos_cantidad || 10;
  const nivelMinimoAmigos = config?.recompensa_amigos_nivel_minimo || 'Global';
  const nivelMinimoAmigosLabel = displayLevelCode(nivelMinimoAmigos);
  const totalAmigosA = teamStats?.niveles?.[0]?.total_miembros || 0;
  
  // Lógica para verificar si cumple requisitos del reto de amigos
  const cumpleNivel = !isInternar; 
  const cumpleAmigos = totalAmigosA >= amigosRequeridos;
  const retoAmigosHabilitado = cumpleNivel && cumpleAmigos;

  return (
    <Layout>
      <style>{`
        @keyframes flap {
          0%   { transform: translateX(-50%) rotate(0deg); }
          45%  { transform: translateX(-50%) rotate(-13deg); }
          100% { transform: translateX(-50%) rotate(2deg); }
        }
      `}</style>
      <div className="bg-gray-50 min-h-screen pb-24">
        {/* Header Section */}
        <div className="pt-12 pb-8 px-6">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-100 border border-amber-200 mb-6 shadow-xl">
              <Sparkles className="text-amber-500 animate-pulse" size={16} />
              <span className="text-[10px] font-black text-amber-700 uppercase tracking-[0.4em]">Sorteo Premium Global</span>
            </div>
            <h1 className="text-5xl sm:text-7xl font-black text-slate-900 uppercase tracking-tighter mb-4 leading-none drop-shadow-sm">
              GIRA Y <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 via-emerald-500 to-pink-500">GANA</span>
            </h1>
            <p className="text-slate-400 text-[10px] sm:text-xs font-bold max-w-xs mx-auto uppercase tracking-[0.2em] leading-relaxed">
              Sistema de recompensas verificado. Premios instantáneos acreditados a tu balance.
            </p>
          </div>
        </div>

        {/* Main Content */}
        <div className="px-6 max-w-4xl mx-auto space-y-8">
          {/* Código de Canje Section */}
          <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-[2.5rem] p-6 border border-violet-100 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-violet-100 flex items-center justify-center text-violet-600 border border-violet-200">
                <Gift size={24} />
              </div>
              <div>
                <h2 className="font-black text-gray-900 uppercase tracking-tight text-base">Canjear Código</h2>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Introduce tu código para reclamar recompensas</p>
              </div>
            </div>
            
            <form onSubmit={handleCanjearCodigo} className="space-y-4">
              <div className="relative">
                <input
                  type="text"
                  value={codigoCanje}
                  onChange={(e) => setCodigoCanje(e.target.value)}
                  placeholder="Introduce tu código (ej: BCB-2024)"
                  className="w-full bg-white border border-violet-200 rounded-2xl px-5 py-4 text-sm font-black text-gray-900 placeholder-gray-400 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all uppercase tracking-widest"
                  disabled={cargandoCanje}
                />
              </div>
              
              {mensajeCanje && (
                <div className={`flex items-center gap-2 px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border ${
                  mensajeCanje.tipo === "exito" 
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                    : "bg-rose-50 text-rose-700 border-rose-200"
                }`}>
                  {mensajeCanje.tipo === "exito" ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                  {mensajeCanje.texto}
                </div>
              )}
              
              <button
                type="submit"
                disabled={cargandoCanje || !codigoCanje.trim()}
                className={`w-full py-4 rounded-[2rem] font-black uppercase tracking-[0.2em] text-[10px] transition-all duration-300 ${
                  cargandoCanje || !codigoCanje.trim()
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                    : "bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-xl hover:scale-[1.02] active:scale-[0.98]"
                }`}
              >
                {cargandoCanje ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Canjeando...
                  </span>
                ) : (
                  "Canjear Código"
                )}
              </button>
            </form>
          </div>
          {/* Wheel Container */}
          <div className="relative flex flex-col items-center">
            <RouletteWheel 
              premios={premios}
              spinning={spinning}
              targetIndex={targetIndex}
              onSpinComplete={handleSpinComplete}
            />

            {/* Spin Button Section */}
            <div className="mt-12 text-center space-y-6 w-full max-w-sm">
              <button
                onClick={spinWheel}
                disabled={spinning || premios.length === 0 || (Number(user?.tickets_ruleta) || 0) < 1}
                className={`
                  w-full h-16 rounded-[2rem] font-black uppercase tracking-[0.2em] transition-all duration-500 relative overflow-hidden group
                  ${spinning || premios.length === 0 || (Number(user?.tickets_ruleta) || 0) < 1
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-amber-500 to-emerald-500 text-white shadow-[0_20px_50px_-10px_rgba(245,158,11,0.5)] hover:scale-[1.02] active:scale-[0.98]'
                  }
                `}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shimmer" />
                <span className="relative z-10 flex items-center justify-center gap-3">
                  {spinning ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Girando...
                    </>
                  ) : (
                    <>
                      <Sparkles size={20} className="text-amber-200" />
                      Girar Ahora
                    </>
                  )}
                </span>
              </button>

              <div className="flex items-center justify-center gap-8 py-4 bg-white backdrop-blur-sm rounded-3xl border border-amber-100 shadow-xl">
                <div className="text-center">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Costo</p>
                  <div className="flex items-center gap-1.5 justify-center">
                    <Trophy size={14} className="text-amber-500" />
                    <span className="text-sm font-black text-slate-900">1 Ticket</span>
                  </div>
                </div>
                <div className="w-px h-8 bg-slate-200" />
                <div className="text-center">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Tus Tickets</p>
                  <div className="flex items-center gap-1.5 justify-center">
                    <Sparkles size={14} className="text-amber-500 animate-pulse" />
                    <span className="text-sm font-black text-slate-900">{user?.tickets_ruleta || 0}</span>
                  </div>
                </div>
              </div>
            </div>

            {error && (
              <div className="mt-6 flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-50 text-rose-500 border border-rose-100 animate-shake">
                <AlertCircle size={16} />
                <span className="text-[10px] font-black uppercase tracking-widest">{error}</span>
              </div>
            )}
          </div>



          {/* User Stats Card */}
          <div className="bg-white rounded-[2.5rem] p-8 shadow-xl shadow-black/5 border border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 border border-amber-100">
                <Trophy size={28} />
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Tus Tickets de Ruleta</p>
                <p className="text-2xl font-black text-gray-900">
                  {user?.tickets_ruleta || 0}
                  <span className="text-xs font-bold text-gray-400 ml-2 uppercase tracking-tighter">Tickets</span>
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Saldo Total</p>
              <p className="text-sm font-black text-gray-900">
                {((Number(user?.saldo_comisiones) || 0) + (Number(user?.saldo_principal) || 0)).toFixed(2)} Bs
              </p>
            </div>
          </div>

          {/* Desafíos Especiales */}
          <div className="space-y-4">
            <h2 className="text-xs font-black text-gray-900 uppercase tracking-[0.2em] px-2">Desafíos Especiales</h2>
            
            <div className="grid grid-cols-1 gap-4">
              {/* Reto de Invitados (Dinámico) */}
              {config?.recompensa_amigos_activa && (
                <div className={`group relative overflow-hidden bg-white rounded-[2rem] p-6 border transition-all duration-300 ${retoAmigosHabilitado ? 'border-emerald-100 ring-1 ring-emerald-50 hover:shadow-2xl' : 'opacity-60 grayscale'}`}>
                  <div className="flex items-start justify-between relative z-10">
                    <div className="flex gap-4">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border transition-colors ${retoAmigosHabilitado ? 'bg-emerald-50 border-emerald-100 text-emerald-500' : 'bg-gray-50 border-gray-100 text-gray-400'}`}>
                        <UserPlus size={28} />
                      </div>
                      <div>
                        <h3 className="font-black text-gray-900 uppercase tracking-tight text-base mb-1">Invitado Estrella</h3>
                        <p className="text-xs text-gray-400 font-medium leading-relaxed max-w-[200px] uppercase tracking-wide">
                          Invita a {amigosRequeridos} amigos (Nivel {nivelMinimoAmigosLabel}+) para un Giro Gratis Especial.
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xl font-black block leading-none text-gray-900">{totalAmigosA}/{amigosRequeridos}</span>
                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Amigos</span>
                    </div>
                  </div>
                  
                  <div className="mt-6 flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-2">
                      <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${retoAmigosHabilitado ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                        {retoAmigosHabilitado ? '¡Reclama tu Giro!' : 'En Progreso'}
                      </div>
                      {!cumpleNivel && (
                        <div className="flex items-center gap-1 text-[8px] font-black text-rose-500 uppercase">
                          <Lock size={10} />
                          Requiere Global1+
                        </div>
                      )}
                    </div>
                    
                    {retoAmigosHabilitado ? (
                      <button 
                        onClick={spinWheel}
                        className="flex items-center gap-2 bg-amber-500 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-600 transition-colors group/btn shadow-lg"
                      >
                        Girar Ahora
                        <ArrowRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                      </button>
                    ) : (
                      <button className="flex items-center gap-2 bg-gray-100 text-gray-400 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest cursor-not-allowed">
                        Bloqueado
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Otros desafíos pueden ir aquí bajo la misma lógica */}
            </div>
          </div>

          {/* Winners History (Estilo Ultra Llamativo) */}
          <div className="relative group px-2">
            {/* Efecto de resplandor de fondo */}
            <div className="absolute -inset-1 bg-gradient-to-r from-amber-500 to-pink-500 rounded-[2.5rem] blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
            
            <div className="relative bg-white rounded-[2.2rem] p-7 shadow-2xl border border-amber-50 overflow-hidden">
              {/* Adornos de fondo */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-50 rounded-full -mr-16 -mt-16 blur-3xl opacity-50" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-pink-50 rounded-full -ml-12 -mb-12 blur-2xl opacity-30" />

              <div className="flex items-center justify-between mb-8 relative z-10">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-6 bg-gradient-to-b from-amber-400 to-pink-500 rounded-full shadow-[0_0_15px_rgba(245,158,11,0.5)]" />
                  <div>
                    <h3 className="text-sm font-black text-gray-900 uppercase tracking-[0.25em] leading-none mb-1">Ganadores en Vivo</h3>
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
                      <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest">Actividad en tiempo real</span>
                    </div>
                  </div>
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-slate-900 text-white border border-slate-800 text-[8px] font-black uppercase tracking-[0.2em] shadow-lg">
                  LIVE FEED
                </div>
              </div>

              <div className="space-y-4 relative z-10">
                {historial.length > 0 ? historial.slice(0, 5).map((win, i) => (
                  <div 
                    key={win.id}
                    className="flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-gray-50 to-white border border-gray-100 hover:border-amber-200 hover:shadow-md transition-all duration-300 animate-fade-in group/item"
                    style={{ animationDelay: `${i * 150}ms` }}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-11 h-11 rounded-xl bg-white shadow-sm flex items-center justify-center text-amber-500 border border-amber-100 group-hover/item:scale-110 transition-transform duration-500">
                        <Trophy size={20} strokeWidth={2.5} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-gray-900 tracking-tighter uppercase mb-0.5">
                          Usuario {win.telefono_masked || '****'}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <History size={10} className="text-gray-400" />
                          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                            {formatTime(win.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end">
                      <div className="flex items-center gap-1 bg-amber-50 px-3 py-1 rounded-lg border border-amber-100 mb-1">
                        <Sparkles size={12} className="text-amber-500" />
                        <span className="text-sm font-black text-amber-600 tracking-tight">+{win.monto || win.valor_premio}</span>
                        <span className="text-[8px] font-black text-amber-400">Bs</span>
                      </div>
                      <span className="text-[7px] font-black text-gray-300 uppercase tracking-[0.2em]">{win.premio_nombre || 'Premio'}</span>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-12 opacity-40">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-dashed border-gray-200">
                      <Trophy size={24} className="text-gray-300" />
                    </div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Esperando nuevos ganadores...</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Win Modal */}
        <AnimatePresence>
          {result && !spinning && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-6"
            >
              <motion.div 
                initial={{ scale: 0.8, y: 20, rotate: -5 }}
                animate={{ scale: 1, y: 0, rotate: 0 }}
                exit={{ scale: 0.8, y: 20, rotate: 5 }}
                className="w-full max-w-sm bg-white rounded-[3.5rem] shadow-[0_30px_100px_rgba(0,0,0,0.3)] p-12 text-center relative overflow-hidden"
              >
                {/* Adornos Premium */}
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-amber-400 via-emerald-400 to-pink-500" />
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl" />
                <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-pink-500/10 rounded-full blur-3xl" />

                <motion.div 
                  initial={{ rotate: -180, scale: 0 }}
                  animate={{ rotate: 0, scale: 1 }}
                  transition={{ type: "spring", damping: 15, stiffness: 100 }}
                  className="w-32 h-32 bg-gradient-to-tr from-amber-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-amber-500/30 relative overflow-hidden"
                >
                  {result.imagen_url && result.imagen_url !== 'null' ? (
                    <img src={api.getMediaUrl(result.imagen_url)} className="w-full h-full object-cover" alt={result.nombre} />
                  ) : (
                    <Trophy size={64} className="text-white drop-shadow-lg" />
                  )}
                  <motion.div 
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="absolute -inset-2 border-2 border-amber-500/20 rounded-full" 
                  />
                </motion.div>
                
                <p className="text-[10px] font-black text-amber-500 uppercase tracking-[0.4em] mb-3">{result.nombre || '¡Giro Exitoso!'}</p>
                <h2 className="text-4xl font-black text-gray-900 uppercase tracking-tighter mb-2 leading-none">
                  {result.valor > 0 ? (
                    <><span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-600 to-pink-600">{result.valor} Bs</span></>
                  ) : (
                    <span className="text-gray-400">¡GRACIAS POR PARTICIPAR!</span>
                  )}
                </h2>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-10 italic">
                  {result.valor > 0 ? 'El premio ha sido acreditado a tu balance de comisiones' : 'No te rindas, la suerte está cerca'}
                </p>
                
                <button
                  type="button"
                  onClick={() => setResult(null)}
                  className="w-full py-5 rounded-[2rem] bg-slate-900 text-white font-black uppercase tracking-[0.2em] text-[10px] shadow-2xl hover:bg-slate-800 active:scale-95 transition-all"
                >
                  Confirmar y Continuar
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Layout>
  );
}
