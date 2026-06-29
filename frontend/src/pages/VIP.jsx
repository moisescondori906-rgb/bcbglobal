import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { 
  Crown, CheckCircle2, Lock, TrendingUp, 
  Users, Sparkles, Clock, ChevronRight, 
  ShieldCheck, ArrowUpCircle 
} from 'lucide-react';
import { displayLevelCode } from '../lib/displayLevel.js';
import { cn } from '../lib/utils/cn';

// UI Components
import { Card } from '../components/ui/Card.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Badge } from '../components/ui/Badge.jsx';

export default function VIP() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [niveles, setNiveles] = useState([]);
  const [globalConfig, setGlobalConfig] = useState({
    bloquear_niveles_superiores_enabled: true,
    mensaje_niveles_superiores: 'Niveles disponibles solamente para líderes',
    nivel_minimo_lider: 4
  });

  useEffect(() => {
    Promise.all([
      api.levels.list().then(setNiveles).catch(() => []),
      api.publicContent().then(data => {
        if (data) {
          setGlobalConfig({
            bloquear_niveles_superiores_enabled: data.bloquear_niveles_superiores_enabled ?? true,
            mensaje_niveles_superiores: data.mensaje_niveles_superiores ?? 'Niveles disponibles solamente para líderes',
            nivel_minimo_lider: data.nivel_minimo_lider ?? 4
          });
        }
      }).catch(() => {})
    ]);
  }, []);

  const formatBs = (val) => Number(val || 0).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const handleUpgrade = (nivel) => {
    navigate('/recargar', {
      state: {
        monto: nivel.deposito,
        modo: 'Compra VIP',
        nivelId: nivel.id,
        nivelNombre: nivel.nombre
      }
    });
  };

  const esNivelSuperior = (nivel) => {
    const currentNivel = niveles.find(n => n.id === user?.nivel_id);
    if (!currentNivel) return true;
    return (nivel.orden || 0) > (currentNivel.orden || 0);
  };

  return (
    <Layout>
      <div className="min-h-screen pb-32">
        <header className="px-4 sm:px-6 py-6 sm:py-8 space-y-5 sm:space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tighter leading-none">Inversiones GLOBAL</h1>
            <Badge variant="outline" className="bg-white border-slate-200 text-slate-500 font-bold px-3 py-1 text-[10px]">OFICIAL</Badge>
          </div>

          {/* Current Status Card */}
          <Card className="relative overflow-hidden group border-2 border-slate-200 bg-white/40 backdrop-blur-md p-5 sm:p-6 shadow-2xl shadow-slate-200">
            <div className="absolute top-0 right-0 p-4 sm:p-6 opacity-10 group-hover:rotate-12 transition-transform">
              <Crown size={60} className="text-indigo-900 sm:w-[80px] sm:h-[80px]" />
            </div>
            <div className="relative z-10 flex flex-col items-center py-2 sm:py-4">
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-[1.2rem] sm:rounded-3xl bg-indigo-50 border-2 border-indigo-100 flex items-center justify-center text-indigo-900 mb-3 sm:mb-4 shadow-sm">
                <Crown className="w-6 h-6 sm:w-8 sm:h-8" strokeWidth={3} />
              </div>
              <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] sm:tracking-[0.3em] mb-1">Tu Nivel Actual</p>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 uppercase tracking-tight">
                {displayLevelCode(user?.nivel_codigo || 'Internar')}
              </h2>
              <div className="w-full mt-6 rounded-2xl overflow-hidden border-2 border-slate-200 shadow-lg bg-white p-2">
                <img src="/imag/tabla_invercion.webp" alt="Tabla de Inversión" className="w-full h-auto object-contain contrast-125 rounded-xl" />
              </div>
            </div>
          </Card>
        </header>

        <main className="px-4 sm:px-5 space-y-6 pb-10">
          <div className="flex items-center gap-2 px-1 mb-2">
            <Sparkles size={16} className="text-bcb-primary" />
            <h2 className="text-[10px] sm:text-[11px] font-black text-slate-900 uppercase tracking-[0.2em]">Portafolio de Inversión</h2>
          </div>

          <div className="space-y-5 sm:space-y-6">
            {Array.isArray(niveles) && niveles.map((nivel, i) => {
              const esActual = nivel.id === user?.nivel_id;
              const esSuperior = esNivelSuperior(nivel);
              const bloqueado = nivel.activo === false;
              
              const userLevelOrder = niveles.find(lvl => lvl.id === user?.nivel_id)?.orden || 0;
              const shouldBlock = globalConfig.bloquear_niveles_superiores_enabled && 
                nivel.orden >= globalConfig.nivel_minimo_lider && 
                userLevelOrder < globalConfig.nivel_minimo_lider;

              return (
                <Card 
                  key={nivel.id} 
                  className={cn(
                    "p-5 sm:p-6 transition-all relative overflow-hidden border-2 border-slate-200 shadow-2xl shadow-slate-200",
                    esActual ? "bg-white/40 backdrop-blur-md ring-2 ring-indigo-900 ring-opacity-10" : "bg-white/40 backdrop-blur-md",
                    !esActual && !esSuperior && "opacity-40 grayscale"
                  )}
                  delay={i * 0.05}
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
                  <div className="flex justify-between items-start mb-5 sm:mb-6 gap-2 relative z-10">
                    <div className="flex items-center gap-3 sm:gap-4 flex-1">
                      <div className={cn(
                        "w-11 h-11 sm:w-14 sm:h-14 rounded-xl sm:rounded-[1.2rem] flex items-center justify-center border-2 transition-transform group-hover:scale-110 shrink-0",
                        esActual ? "bg-indigo-50 border-indigo-100 text-indigo-900" : "bg-slate-50 border-slate-200 text-slate-600"
                      )}>
                        <TrendingUp size={22} className="sm:w-[28px] sm:h-[28px]" strokeWidth={3} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-lg sm:text-xl font-black text-slate-900 uppercase tracking-tighter leading-none truncate">
                          {nivel.nombre}
                        </h3>
                        <div className="flex items-center gap-1 mt-1">
                          <CheckCircle2 size={10} className="text-emerald-600 shrink-0" />
                          <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest truncate">Activo Institucional</p>
                        </div>
                      </div>
                    </div>
                    <div className="shrink-0">
                      {esActual ? (
                        <Badge variant="success" icon={CheckCircle2} className="bg-emerald-100 text-emerald-900 border-emerald-200">ACTIVO</Badge>
                      ) : (esSuperior && !bloqueado && !shouldBlock) ? (
                        <Button 
                          onClick={() => handleUpgrade(nivel)}
                          className="h-10 sm:h-11 px-4 sm:px-8 text-[10px] font-black tracking-widest uppercase shadow-xl shadow-indigo-100 text-white bg-indigo-900"
                        >
                          INVERTIR
                        </Button>
                      ) : (
                        <Badge variant="outline" className="bg-slate-100 border-slate-200 text-slate-600 text-[10px] font-black" icon={Lock}>{bloqueado ? 'PRONTO' : 'CERRADO'}</Badge>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:gap-4">
                    {/* Depósito y Tareas */}
                    <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                      <div className="bg-slate-50 rounded-xl sm:rounded-2xl p-3 sm:p-4 border-2 border-slate-100">
                        <p className="text-[8px] font-black text-slate-600 uppercase tracking-[0.2em] mb-1">Depósito</p>
                        <p className="text-base sm:text-lg font-black text-slate-900 tracking-tighter truncate">
                          {formatBs(nivel.deposito)} <span className="text-[10px] font-black text-slate-500">Bs</span>
                        </p>
                      </div>
                      <div className="bg-slate-50 rounded-xl sm:rounded-2xl p-3 sm:p-4 border-2 border-slate-100">
                        <p className="text-[8px] font-black text-slate-600 uppercase tracking-[0.2em] mb-1">Tareas</p>
                        <p className="text-base sm:text-lg font-black text-slate-900 tracking-tighter truncate">
                          {nivel.num_tareas_diarias} <span className="text-[10px] font-black text-slate-500">CUPOS</span>
                        </p>
                      </div>
                    </div>

                    {/* Comisiones y Rentas */}
                    <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 border-2 border-slate-200 space-y-3 sm:space-y-4 shadow-sm">
                      <div className="flex justify-between items-center border-b-2 border-slate-100 pb-2 sm:pb-3">
                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Pago por Tarea</span>
                        <span className="text-xs font-black text-slate-900">{formatBs(nivel.ganancia_tarea)} Bs</span>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                        <div className="text-center space-y-1">
                          <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Diario</p>
                          <p className="text-[11px] sm:text-sm font-black text-emerald-700">+{formatBs(nivel.ingreso_diario)}</p>
                        </div>
                        <div className="text-center space-y-1 border-x-2 border-slate-100">
                          <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Mensual</p>
                          <p className="text-[11px] sm:text-sm font-black text-slate-900">{formatBs(nivel.ingreso_mensual)}</p>
                        </div>
                        <div className="text-center space-y-1">
                          <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Anual</p>
                          <p className="text-[11px] sm:text-sm font-black text-slate-900">{formatBs(nivel.ingreso_anual)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Benefits Section */}
          <section className="space-y-4 pt-4">
            <div className="flex items-center gap-2 px-1 mb-2">
              <Users size={16} className="text-indigo-900" />
              <h2 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em]">Beneficios por Invitación</h2>
            </div>
            <Card className="p-6 border-2 border-dashed border-slate-300 bg-white space-y-6 shadow-2xl shadow-slate-200">
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Nivel A', val: '10%', sub: 'Directo' },
                  { label: 'Nivel B', val: '3%', sub: 'Indirecto' },
                  { label: 'Nivel C', val: '1%', sub: 'Equipo' },
                ].map((item, i) => (
                  <div key={i} className="text-center space-y-1">
                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{item.label}</p>
                    <p className="text-xl font-black text-slate-900 tracking-tighter">{item.val}</p>
                    <p className="text-[8px] font-black text-indigo-900 uppercase tracking-widest">{item.sub}</p>
                  </div>
                ))}
              </div>
              <div className="pt-6 border-t-2 border-slate-100">
                <p className="text-[11px] font-black text-slate-600 leading-relaxed text-center italic">
                  * Las comisiones se acreditan instantáneamente al saldo de equipo tras la validación de la tarea por parte de su referido.
                </p>
              </div>
            </Card>
          </section>
        </main>
      </div>
    </Layout>
  );
}

