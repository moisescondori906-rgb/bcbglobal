import { useState, useEffect, useRef } from 'react';
import Layout from '../components/Layout.jsx';
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

export default function Recompensas() {
  const { user, refreshUser } = useAuth();
  const [premios, setPremios] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [config, setConfig] = useState(null);
  const [teamStats, setTeamStats] = useState(null);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState(null);
  const [rotation, setRotation] = useState(0);
  const [loading, setLoading] = useState(true);
  const [punished, setPunished] = useState(false);
  const [error, setError] = useState(null);
  const wheelRef = useRef(null);

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

    // Polling de respaldo para historial y config cada 20 segundos
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible' && !spinning) {
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
        setSpinning(true);
        
        const premioIndex = premios.findIndex(p => p.id === res.premio.id);
        const count = premios.length || 1;
        const segmentAngle = 360 / count;
        const extraRounds = 10 * 360; 
        const targetAngle = extraRounds + (360 - (premioIndex * segmentAngle)) - (segmentAngle / 2);
        
        const newRotation = rotation + targetAngle + (360 - (rotation % 360));
        setRotation(newRotation);

        setTimeout(() => {
          setSpinning(false);
          setResult(res.premio);
          refreshUser();
          api.sorteo.historial().then(data => {
             if (data) setHistorial(data);
          });
        }, 5000);
      }
    } catch (err) {
      setError(err.message || 'Error al girar la ruleta');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1a1f36] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin" />
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
            <h2 className="text-2xl font-black text-[#1a1f36] uppercase tracking-tighter">Premios Bloqueados</h2>
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
            <h2 className="text-xl font-black text-[#1a1f36] uppercase tracking-tighter mb-2">Sección Bloqueada</h2>
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
      <div className="bg-gray-50 min-h-screen pb-24">
        {isInternar && (
          <div className="bg-sav-primary/10 border-b border-sav-primary/20 p-4 text-center">
            <p className="text-[10px] font-black text-sav-primary uppercase tracking-widest flex items-center justify-center gap-2">
               <Lock size={14} /> La ruleta requiere nivel GLOBAL 1 o superior para participar
            </p>
          </div>
        )}
        {/* Header Section */}
        <div className="bg-[#1a1f36] pt-12 pb-32 px-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full -mr-48 -mt-48 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-rose-500/10 rounded-full -ml-32 -mb-32 blur-3xl" />
          
          <div className="relative z-10 max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 backdrop-blur-md mb-6">
              <Sparkles className="text-amber-400" size={16} />
              <span className="text-[10px] font-black text-white uppercase tracking-[0.3em]">Ruleta de la Suerte Premium</span>
            </div>
            <h1 className="text-5xl font-black text-white uppercase tracking-tighter mb-4 leading-none">
              GIRA Y <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-rose-400">GANA</span>
            </h1>
            <p className="text-white/40 text-xs font-bold max-w-xs mx-auto uppercase tracking-widest leading-relaxed">
              Prueba tu suerte hoy. Cada giro es una oportunidad de multiplicar tus activos.
            </p>
          </div>
        </div>

        {/* Main Content */}
        <div className="px-6 -mt-20 max-w-4xl mx-auto space-y-8">
          {/* Wheel Container */}
          <div className="relative flex flex-col items-center">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-4 z-30">
              <div className="w-8 h-10 bg-white rounded-b-full shadow-2xl flex items-center justify-center border-x-4 border-b-4 border-[#1a1f36]">
                <div className="w-2 h-2 bg-rose-500 rounded-full animate-pulse" />
              </div>
            </div>

            <div className="relative w-80 h-80 md:w-96 md:h-96 rounded-full border-8 border-[#1a1f36] shadow-[0_0_50px_rgba(0,0,0,0.2)] overflow-hidden bg-white">
              <div 
                ref={wheelRef}
                className="w-full h-full transition-transform duration-[5000ms] cubic-bezier(0.15, 0, 0.15, 1)"
                style={{ transform: `rotate(${rotation}deg)` }}
              >
                <svg viewBox="0 0 100 100" className="w-full h-full">
                  {Array.isArray(premios) && premios.map((premio, i) => {
                    const count = premios.length || 1;
                    const angle = 360 / count;
                    const rotationAngle = i * angle;
                    const x1 = 50 + 50 * Math.cos((Math.PI * (rotationAngle - 90)) / 180);
                    const y1 = 50 + 50 * Math.sin((Math.PI * (rotationAngle - 90)) / 180);
                    const x2 = 50 + 50 * Math.cos((Math.PI * (rotationAngle + angle - 90)) / 180);
                    const y2 = 50 + 50 * Math.sin((Math.PI * (rotationAngle + angle - 90)) / 180);
                    
                    return (
                      <g key={premio.id}>
                        <path 
                          d={`M 50 50 L ${x1} ${y1} A 50 50 0 0 1 ${x2} ${y2} Z`}
                          fill={premio.color || (i % 2 === 0 ? '#7f1d1d' : '#991b1b')}
                          stroke="white"
                          strokeWidth="0.2"
                        />
                        <text
                          x="50"
                          y="20"
                          fill="white"
                          fontSize="3.5"
                          fontWeight="900"
                          textAnchor="middle"
                          transform={`rotate(${rotationAngle + angle/2}, 50, 50)`}
                          style={{ textTransform: 'uppercase', paintOrder: 'stroke', stroke: 'rgba(0,0,0,0.2)', strokeWidth: '0.1px' }}
                        >
                          {premio.valor} BOB
                        </text>
                      </g>
                    );
                  })}
                  {(!Array.isArray(premios) || premios.length === 0) && (
                    <circle cx="50" cy="50" r="50" fill="#f3f4f6" />
                  )}
                </svg>
              </div>
              
              {premios.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center text-center p-10 bg-white/80 backdrop-blur-sm z-20">
                  <div className="max-w-[200px]">
                    <AlertCircle className="text-gray-300 mx-auto mb-4" size={48} />
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-tight">
                      Ruleta en mantenimiento. Contacta con soporte.
                    </p>
                  </div>
                </div>
              )}
              
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-[#1a1f36] border-4 border-white shadow-2xl flex items-center justify-center z-20">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-rose-500 animate-pulse flex items-center justify-center">
                  <Coins className="text-white" size={20} />
                </div>
              </div>
            </div>

            {/* Spin Button */}
            <div className="mt-12 text-center w-full max-w-xs">
              <button
                onClick={spinWheel}
                disabled={spinning || premios.length === 0 || (Number(user?.tickets_ruleta) || 0) < 1 || isInternar}
                className={`
                  w-full py-5 rounded-2xl font-black uppercase tracking-[0.2em] transition-all duration-300
                  ${spinning || premios.length === 0 || (Number(user?.tickets_ruleta) || 0) < 1 || isInternar
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-[#1a1f36] text-white shadow-[0_20px_40px_rgba(26,31,54,0.3)] hover:scale-[1.02] active:scale-[0.98]'
                  }
                `}
              >
                {spinning ? 'Girando...' : isInternar ? 'Nivel Insuficiente' : 'Girar Ahora'}
              </button>

              <div className="mt-6 flex items-center justify-center gap-6">
                <div className="text-center">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Costo</p>
                  <div className="flex items-center gap-1.5 justify-center">
                    <Trophy size={14} className="text-amber-500" />
                    <span className="text-sm font-black text-[#1a1f36]">1 Ticket</span>
                  </div>
                </div>
                <div className="w-px h-8 bg-gray-200" />
                <div className="text-center">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Tus Tickets</p>
                  <div className="flex items-center gap-1.5 justify-center">
                    <Sparkles size={14} className="text-indigo-500" />
                    <span className="text-sm font-black text-[#1a1f36]">{user?.tickets_ruleta || 0}</span>
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
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100">
                <Trophy size={28} />
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Tus Tickets de Ruleta</p>
                <p className="text-2xl font-black text-[#1a1f36]">
                  {user?.tickets_ruleta || 0}
                  <span className="text-xs font-bold text-gray-400 ml-2 uppercase tracking-tighter">Tickets</span>
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Saldo Total</p>
              <p className="text-sm font-black text-[#1a1f36]">
                {((Number(user?.saldo_comisiones) || 0) + (Number(user?.saldo_principal) || 0)).toFixed(2)} BOB
              </p>
            </div>
          </div>

          {/* Desafíos Especiales */}
          <div className="space-y-4">
            <h2 className="text-xs font-black text-[#1a1f36] uppercase tracking-[0.2em] px-2">Desafíos Especiales</h2>
            
            <div className="grid grid-cols-1 gap-4">
              {/* Reto de Invitados (Dinámico) */}
              {config?.recompensa_amigos_activa && (
                <div className={`group relative overflow-hidden bg-white rounded-[2rem] p-6 border transition-all duration-300 ${retoAmigosHabilitado ? 'border-indigo-100 ring-1 ring-indigo-50 hover:shadow-2xl' : 'opacity-60 grayscale'}`}>
                  <div className="flex items-start justify-between relative z-10">
                    <div className="flex gap-4">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border transition-colors ${retoAmigosHabilitado ? 'bg-indigo-50 border-indigo-100 text-indigo-500' : 'bg-gray-50 border-gray-100 text-gray-400'}`}>
                        <UserPlus size={28} />
                      </div>
                      <div>
                        <h3 className="font-black text-[#1a1f36] uppercase tracking-tight text-base mb-1">Invitado Estrella</h3>
                        <p className="text-xs text-gray-400 font-medium leading-relaxed max-w-[200px] uppercase tracking-wide">
                          Invita a {amigosRequeridos} amigos (Nivel {nivelMinimoAmigosLabel}+) para un Giro Gratis Especial.
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xl font-black block leading-none text-[#1a1f36]">{totalAmigosA}/{amigosRequeridos}</span>
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
                        className="flex items-center gap-2 bg-[#1a1f36] text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-colors group/btn"
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
            <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-[2.5rem] blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
            
            <div className="relative bg-white rounded-[2.2rem] p-7 shadow-2xl border border-emerald-50 overflow-hidden">
              {/* Adornos de fondo */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full -mr-16 -mt-16 blur-3xl opacity-50" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-teal-50 rounded-full -ml-12 -mb-12 blur-2xl opacity-30" />

              <div className="flex items-center justify-between mb-8 relative z-10">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-6 bg-gradient-to-b from-emerald-400 to-teal-600 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.5)]" />
                  <div>
                    <h3 className="text-sm font-black text-[#1a1f36] uppercase tracking-[0.25em] leading-none mb-1">Ganadores en Vivo</h3>
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                      <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">Actividad en tiempo real</span>
                    </div>
                  </div>
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-[#1a1f36] text-white text-[8px] font-black uppercase tracking-[0.2em] shadow-lg">
                  LIVE FEED
                </div>
              </div>

              <div className="space-y-4 relative z-10">
                {historial.length > 0 ? historial.slice(0, 5).map((win, i) => (
                  <div 
                    key={win.id}
                    className="flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-gray-50 to-white border border-gray-100 hover:border-emerald-200 hover:shadow-md transition-all duration-300 animate-fade-in group/item"
                    style={{ animationDelay: `${i * 150}ms` }}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-11 h-11 rounded-xl bg-white shadow-sm flex items-center justify-center text-emerald-500 border border-emerald-50 group-hover/item:scale-110 transition-transform duration-500">
                        <Trophy size={20} strokeWidth={2.5} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-[#1a1f36] tracking-tighter uppercase mb-0.5">
                          {win.usuario?.nombre_usuario?.slice(0, 3)}***{win.usuario?.nombre_usuario?.slice(-2)}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <History size={10} className="text-gray-400" />
                          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                            {new Date(win.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end">
                      <div className="flex items-center gap-1 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-100 mb-1">
                        <Sparkles size={12} className="text-emerald-500" />
                        <span className="text-sm font-black text-emerald-600 tracking-tight">+{win.monto}</span>
                        <span className="text-[8px] font-black text-emerald-400">BOB</span>
                      </div>
                      <span className="text-[7px] font-black text-gray-300 uppercase tracking-[0.2em]">Puntaje Obtenido</span>
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
        {result && !spinning && (
          <div className="fixed inset-0 z-50 bg-[#1a1f36]/90 backdrop-blur-xl flex items-center justify-center p-6 animate-fade-in">
            <div className="w-full max-w-sm bg-white rounded-[3rem] shadow-2xl p-10 text-center animate-scale-in relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 to-rose-500" />
              
              <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-8 border border-emerald-100 shadow-inner relative">
                <div className="absolute inset-0 bg-emerald-400/20 rounded-full animate-ping" />
                <CheckCircle2 size={48} className="text-emerald-500 relative z-10" />
              </div>
              
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.3em] mb-2">¡Felicidades!</h3>
              <h2 className="text-3xl font-black text-[#1a1f36] uppercase tracking-tighter mb-6 leading-none">
                Has Ganado <span className="text-emerald-500">{result.valor} BOB</span>
              </h2>
              
              <button
                type="button"
                onClick={() => setResult(null)}
                className="w-full py-5 rounded-2xl bg-[#1a1f36] text-white font-black uppercase tracking-[0.2em] text-xs shadow-xl active:scale-95 transition-all"
              >
                Continuar Jugando
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
