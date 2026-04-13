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
      <header className="px-6 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-black text-white uppercase tracking-tighter leading-none">Inversiones GLOBAL</h1>
          <Badge variant="info">OFICIAL</Badge>
        </div>

        {/* Current Status Card */}
        <Card variant="premium" className="relative overflow-hidden group border-sav-primary/30">
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:rotate-12 transition-transform">
            <Crown size={80} />
          </div>
          <div className="relative z-10 flex flex-col items-center py-4">
            <div className="w-16 h-16 rounded-2xl bg-sav-primary/10 border border-sav-primary/20 flex items-center justify-center text-sav-primary mb-4 shadow-lg shadow-sav-primary/10">
              <Crown size={32} strokeWidth={2.5} />
            </div>
            <p className="text-[10px] font-black text-sav-muted uppercase tracking-[0.3em] mb-1">Tu Nivel Actual</p>
            <h2 className="text-3xl font-black text-white uppercase tracking-tight">
              {displayLevelCode(user?.nivel_codigo || 'Internar')}
            </h2>
          </div>
        </Card>
      </header>

      <main className="px-5 space-y-6 pb-10">
        <div className="flex items-center gap-2 px-1 mb-2">
          <Sparkles size={16} className="text-sav-primary" />
          <h2 className="text-[11px] font-black text-white uppercase tracking-[0.2em]">Portafolio de Inversión</h2>
        </div>

        <div className="space-y-6">
          {niveles.map((nivel, i) => {
            const esActual = nivel.id === user?.nivel_id;
            const esSuperior = esNivelSuperior(nivel);
            const bloqueado = nivel.activo === false;

            return (
              <Card 
                key={nivel.id} 
                variant={esActual ? 'premium' : 'flat'}
                className={cn(
                  "p-6 transition-all relative overflow-hidden border-white/5",
                  !esActual && !esSuperior && "opacity-40 grayscale"
                )}
                delay={i * 0.05}
              >
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-14 h-14 rounded-[1.2rem] flex items-center justify-center border transition-transform group-hover:scale-110",
                      esActual ? "bg-sav-primary/10 border-sav-primary/20 text-sav-primary" : "bg-sav-surface border-sav-border text-sav-muted"
                    )}>
                      <TrendingUp size={28} />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-white uppercase tracking-tighter leading-none">
                        {nivel.nombre}
                      </h3>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <CheckCircle2 size={10} className="text-sav-primary" />
                        <p className="text-[9px] font-black text-sav-muted uppercase tracking-widest">Activo Institucional</p>
                      </div>
                    </div>
                  </div>
                  {esActual ? (
                    <Badge variant="success" icon={CheckCircle2}>ACTIVO</Badge>
                  ) : esSuperior && !bloqueado ? (
                    <Button 
                      onClick={() => handleUpgrade(nivel)}
                      className="h-11 px-8 text-[10px] font-black tracking-widest uppercase shadow-lg shadow-sav-primary/20"
                    >
                      INVERTIR
                    </Button>
                  ) : (
                    <Badge variant="muted" icon={Lock}>{bloqueado ? 'PRONTO' : 'CERRADO'}</Badge>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {/* Depósito y Tareas */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-sav-dark/60 backdrop-blur-md rounded-2xl p-4 border border-white/5">
                      <p className="text-[8px] font-black text-sav-muted uppercase tracking-[0.2em] mb-1">Depósito</p>
                      <p className="text-lg font-black text-white tracking-tighter">
                        {formatBOB(nivel.deposito)} <span className="text-[10px] font-bold text-sav-muted">BOB</span>
                      </p>
                    </div>
                    <div className="bg-sav-dark/60 backdrop-blur-md rounded-2xl p-4 border border-white/5">
                      <p className="text-[8px] font-black text-sav-muted uppercase tracking-[0.2em] mb-1">Tareas Diarias</p>
                      <p className="text-lg font-black text-white tracking-tighter">
                        {nivel.num_tareas_diarias} <span className="text-[10px] font-bold text-sav-muted">CUPOS</span>
                      </p>
                    </div>
                  </div>

                  {/* Comisiones y Rentas */}
                  <div className="bg-sav-dark/40 rounded-2xl p-5 border border-white/5 space-y-4">
                    <div className="flex justify-between items-center border-b border-white/5 pb-3">
                      <span className="text-[9px] font-black text-sav-muted uppercase tracking-widest">Pago por Tarea</span>
                      <span className="text-xs font-black text-white">{formatBOB(nivel.ganancia_tarea)} BOB</span>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2">
                      <div className="text-center space-y-1">
                        <p className="text-[7px] font-black text-sav-muted uppercase tracking-widest">Diario</p>
                        <p className="text-sm font-black text-sav-success">+{formatBOB(nivel.ingreso_diario)}</p>
                      </div>
                      <div className="text-center space-y-1 border-x border-white/5">
                        <p className="text-[7px] font-black text-sav-muted uppercase tracking-widest">Mensual</p>
                        <p className="text-sm font-black text-white">{formatBOB(nivel.ingreso_mensual)}</p>
                      </div>
                      <div className="text-center space-y-1">
                        <p className="text-[7px] font-black text-sav-muted uppercase tracking-widest">Anual</p>
                        <p className="text-sm font-black text-white">{formatBOB(nivel.ingreso_anual)}</p>
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
            <h2 className="text-[11px] font-black text-white uppercase tracking-[0.2em]">Beneficios por Invitación</h2>
          </div>
          <Card variant="outline" className="p-6 border-dashed border-sav-primary/20 space-y-6">
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Nivel A', val: '10%', sub: 'Directo' },
                { label: 'Nivel B', val: '3%', sub: 'Indirecto' },
                { label: 'Nivel C', val: '1%', sub: 'Equipo' },
              ].map((item, i) => (
                <div key={i} className="text-center space-y-1">
                  <p className="text-[8px] font-black text-sav-muted uppercase tracking-widest">{item.label}</p>
                  <p className="text-xl font-black text-white tracking-tighter">{item.val}</p>
                  <p className="text-[7px] font-bold text-sav-primary uppercase tracking-widest">{item.sub}</p>
                </div>
              ))}
            </div>
            <div className="pt-4 border-t border-sav-border">
              <p className="text-[10px] text-sav-muted text-center leading-relaxed font-bold uppercase tracking-widest">
                Multiplica tus ganancias construyendo un equipo sólido en BCB Global.
              </p>
            </div>
          </Card>
        </section>
      </main>
    </Layout>
  );
}
