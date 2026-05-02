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

  useEffect(() => {
    api.levels.list().then(setNiveles).catch(() => []);
  }, []);

  const formatBOB = (val) => Number(val || 0).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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
      <div className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-slate-50 pb-32">
        <header className="px-4 sm:px-6 py-6 sm:py-8 space-y-5 sm:space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tighter leading-none">Inversiones GLOBAL</h1>
            <Badge variant="outline" className="bg-slate-100 border-slate-200 text-slate-600 font-bold px-3 py-1 text-[10px]">OFICIAL</Badge>
          </div>

          {/* Current Status Card */}
          <Card className="relative overflow-hidden group border-slate-200 bg-white p-5 sm:p-6 shadow-xl">
            <div className="absolute top-0 right-0 p-4 sm:p-6 opacity-5 group-hover:rotate-12 transition-transform">
              <Crown size={60} className="text-sav-primary sm:w-[80px] sm:h-[80px]" />
            </div>
            <div className="relative z-10 flex flex-col items-center py-2 sm:py-4">
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-[1.2rem] sm:rounded-3xl bg-sav-primary/10 border border-sav-primary/20 flex items-center justify-center text-sav-primary mb-3 sm:mb-4 shadow-xl shadow-sav-primary/5">
                <Crown className="w-6 h-6 sm:w-8 sm:h-8" strokeWidth={2.5} />
              </div>
              <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] sm:tracking-[0.3em] mb-1">Tu Nivel Actual</p>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 uppercase tracking-tight">
                {displayLevelCode(user?.nivel_codigo || 'Internar')}
              </h2>
            </div>
          </Card>
        </header>

        <main className="px-4 sm:px-5 space-y-6 pb-10">
          <div className="flex items-center gap-2 px-1 mb-2">
            <Sparkles size={16} className="text-sav-primary" />
            <h2 className="text-[10px] sm:text-[11px] font-black text-slate-900 uppercase tracking-[0.2em]">Portafolio de Inversión</h2>
          </div>

          <div className="space-y-5 sm:space-y-6">
            {Array.isArray(niveles) && niveles.map((nivel, i) => {
              const esActual = nivel.id === user?.nivel_id;
              const esSuperior = esNivelSuperior(nivel);
              const bloqueado = nivel.activo === false;

              return (
                <Card 
                  key={nivel.id} 
                  className={cn(
                    "p-5 sm:p-6 transition-all relative overflow-hidden border-slate-200 shadow-lg",
                    esActual ? "bg-white ring-2 ring-sav-primary ring-opacity-20" : "bg-white",
                    !esActual && !esSuperior && "opacity-40 grayscale"
                  )}
                  delay={i * 0.05}
                >
                  <div className="flex justify-between items-start mb-5 sm:mb-6 gap-2">
                    <div className="flex items-center gap-3 sm:gap-4 flex-1">
                      <div className={cn(
                        "w-11 h-11 sm:w-14 sm:h-14 rounded-xl sm:rounded-[1.2rem] flex items-center justify-center border transition-transform group-hover:scale-110 shrink-0",
                        esActual ? "bg-sav-primary/10 border-sav-primary/20 text-sav-primary" : "bg-slate-50 border-slate-100 text-slate-400"
                      )}>
                        <TrendingUp size={22} className="sm:w-[28px] sm:h-[28px]" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-lg sm:text-xl font-black text-slate-900 uppercase tracking-tighter leading-none truncate">
                          {nivel.nombre}
                        </h3>
                        <div className="flex items-center gap-1 mt-1">
                          <CheckCircle2 size={10} className="text-sav-primary shrink-0" />
                          <p className="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-widest truncate">Activo Institucional</p>
                        </div>
                      </div>
                    </div>
                    <div className="shrink-0">
                      {esActual ? (
                        <Badge variant="success" icon={CheckCircle2}>ACTIVO</Badge>
                      ) : esSuperior && !bloqueado ? (
                        <Button 
                          onClick={() => handleUpgrade(nivel)}
                          className="h-10 sm:h-11 px-4 sm:px-8 text-[9px] sm:text-[10px] font-black tracking-widest uppercase shadow-lg shadow-sav-primary/20 text-white"
                        >
                          INVERTIR
                        </Button>
                      ) : (
                        <Badge variant="outline" className="bg-slate-100 border-slate-200 text-slate-400 text-[10px] font-bold" icon={Lock}>{bloqueado ? 'PRONTO' : 'CERRADO'}</Badge>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:gap-4">
                    {/* Depósito y Tareas */}
                    <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                      <div className="bg-slate-50 rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-slate-100">
                        <p className="text-[7px] sm:text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Depósito</p>
                        <p className="text-base sm:text-lg font-black text-slate-900 tracking-tighter truncate">
                          {formatBOB(nivel.deposito)} <span className="text-[9px] font-bold text-slate-400">BOB</span>
                        </p>
                      </div>
                      <div className="bg-slate-50 rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-slate-100">
                        <p className="text-[7px] sm:text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Tareas</p>
                        <p className="text-base sm:text-lg font-black text-slate-900 tracking-tighter truncate">
                          {nivel.num_tareas_diarias} <span className="text-[9px] font-bold text-slate-400">CUPOS</span>
                        </p>
                      </div>
                    </div>

                    {/* Comisiones y Rentas */}
                    <div className="bg-slate-50 rounded-xl sm:rounded-2xl p-4 sm:p-5 border border-slate-100 space-y-3 sm:space-y-4">
                      <div className="flex justify-between items-center border-b border-slate-200/50 pb-2 sm:pb-3">
                        <span className="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-widest">Pago por Tarea</span>
                        <span className="text-xs font-black text-slate-900">{formatBOB(nivel.ganancia_tarea)} BOB</span>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                        <div className="text-center space-y-1">
                          <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Diario</p>
                          <p className="text-[11px] sm:text-sm font-black text-emerald-600">+{formatBOB(nivel.ingreso_diario)}</p>
                        </div>
                        <div className="text-center space-y-1 border-x border-slate-200/50">
                          <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Mensual</p>
                          <p className="text-[11px] sm:text-sm font-black text-slate-900">{formatBOB(nivel.ingreso_mensual)}</p>
                        </div>
                        <div className="text-center space-y-1">
                          <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Anual</p>
                          <p className="text-[11px] sm:text-sm font-black text-slate-900">{formatBOB(nivel.ingreso_anual)}</p>
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
              <Users size={16} className="text-sav-primary" />
              <h2 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em]">Beneficios por Invitación</h2>
            </div>
            <Card className="p-6 border-dashed border-slate-200 bg-white space-y-6 shadow-sm">
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Nivel A', val: '10%', sub: 'Directo' },
                  { label: 'Nivel B', val: '3%', sub: 'Indirecto' },
                  { label: 'Nivel C', val: '1%', sub: 'Equipo' },
                ].map((item, i) => (
                  <div key={i} className="text-center space-y-1">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{item.label}</p>
                    <p className="text-xl font-black text-slate-900 tracking-tighter">{item.val}</p>
                    <p className="text-[7px] font-bold text-sav-primary uppercase tracking-widest">{item.sub}</p>
                  </div>
                ))}
              </div>
              <div className="pt-6 border-t border-slate-100">
                <p className="text-[10px] font-medium text-slate-500 leading-relaxed text-center italic">
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
