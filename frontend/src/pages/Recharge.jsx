import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Layout from '../components/Layout';
import Header from '../components/Header';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { isScheduleOpen } from '../lib/schedule';
import { 
  Upload, CheckCircle2, Lock, Info, Clock, AlertCircle, 
  Sparkles, Zap, ShieldCheck, ArrowRight, Loader2, Image as ImageIcon,
  CreditCard, Wallet, QrCode, ArrowUpCircle, TrendingUp
} from 'lucide-react';
import imageCompression from 'browser-image-compression';
import { displayLevelCode } from '../lib/displayLevel.js';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { cn } from '../lib/utils/cn';

export default function Recharge() {
  const { user } = useAuth();
  const location = useLocation();
  const fileRef = useRef(null);
  const [metodos, setMetodos] = useState([]);
  const [niveles, setNiveles] = useState([]);
  const [monto, setMonto] = useState('');
  const [modo, setModo] = useState('Recarga Saldo');
  const [comprobante, setComprobante] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pc, setPc] = useState(null);
  const [success, setSuccess] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isMounted, setIsMounted] = useState(false);
  const [isScheduleLocked, setIsScheduleLocked] = useState(false);
  const [scheduleMsg, setScheduleMsg] = useState('');
  const [isOptimizing, setIsOptimizing] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const saved = localStorage.getItem('last_recharge_time');
    if (saved && !isNaN(parseInt(saved))) {
      const timestamp = parseInt(saved);
      const diff = Date.now() - timestamp;
      const remaining = Math.max(0, (25 * 60 * 1000) - diff);
      if (remaining > 0) setTimeLeft(remaining);
    }
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    
    const loadData = async () => {
      try {
        const list = await api.recharges.metodos();
        if (isMounted) setMetodos(list || []);
      } catch (err) {
        console.error('Error cargando métodos:', err);
      }
    };

    loadData();
    api.levels.list().then(data => isMounted && setNiveles(data || [])).catch(() => {});
    api.publicContent().then(data => {
      if (isMounted) {
        setPc(data || null);
        if (data?.horario_recarga) {
          const sched = isScheduleOpen(data.horario_recarga);
          if (!sched.ok) {
            setIsScheduleLocked(true);
            setScheduleMsg(sched.message);
          }
        }
      }
    }).catch(() => {});

    if (location.state?.monto) setMonto(location.state.monto.toString());
    if (location.state?.modo) setModo(location.state.modo);
  }, [isMounted, location.state]);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Por favor selecciona un archivo de imagen válido');
      return;
    }
    
    setError('');
    setIsOptimizing(true);
    try {
      const options = { maxSizeMB: 0.8, maxWidthOrHeight: 1600, useWebWorker: true };
      const compressedFile = await imageCompression(file, options);
      const reader = new FileReader();
      reader.onload = () => {
        setComprobante(reader.result);
        setIsOptimizing(false);
      };
      reader.readAsDataURL(compressedFile);
    } catch (err) {
      setIsOptimizing(false);
      setError('Error al procesar la imagen');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isScheduleLocked) return;
    if (!monto || !comprobante) return setError('Completa todos los campos y sube el comprobante');

    setLoading(true);
    setError('');
    try {
      await api.recharges.create({
        monto: parseFloat(monto),
        comprobante_url: comprobante,
        metodo_qr_id: metodos[0]?.id,
        modo
      });
      localStorage.setItem('last_recharge_time', Date.now().toString());
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Error al enviar la solicitud');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Layout>
        <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center animate-fade bg-sav-dark">
          <div className="w-24 h-24 rounded-[2.5rem] bg-emerald-500/10 flex items-center justify-center text-emerald-500 mb-8 border border-emerald-500/20 shadow-2xl shadow-emerald-500/20">
            <CheckCircle2 size={48} />
          </div>
          <h2 className="text-3xl font-black text-white uppercase tracking-tighter mb-4">¡Solicitud Enviada!</h2>
          <p className="text-sav-muted font-bold text-sm leading-relaxed mb-10 max-w-xs">
            Tu recarga de <span className="text-white">{monto} BOB</span> está siendo verificada. El saldo se reflejará en tu cuenta en unos minutos.
          </p>
          <Link to="/" className="w-full max-w-xs">
            <Button className="w-full h-14 rounded-2xl text-[11px] font-black tracking-widest uppercase shadow-xl shadow-sav-primary/20">
              VOLVER AL INICIO
            </Button>
          </Link>
        </div>
      </Layout>
    );
  }

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
          <div className="absolute -top-20 -right-20 w-80 h-80 bg-sav-accent/5 rounded-full blur-[100px]" />
        </div>

        <main className="p-6 space-y-10 pb-32 animate-fade">
        {/* Nivel Actual - Ultra Premium */}
        <section className="relative">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative z-10"
          >
            <Card variant="premium" className="relative overflow-hidden p-8 text-center border-none shadow-[0_30px_60px_-15px_rgba(220,38,38,0.3)]">
              {/* Animated rings */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border border-white/5 rounded-full animate-[ping_4s_infinite]" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border border-white/10 rounded-full animate-[ping_6s_infinite]" />
              
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

        <form onSubmit={handleSubmit} className="space-y-10">
          {/* Step 1: Selection */}
          <section className="space-y-6">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-sav-primary/10 flex items-center justify-center text-sav-primary border border-sav-primary/20 shadow-lg">
                  <TrendingUp size={16} />
                </div>
                <h3 className="text-[11px] font-black text-white uppercase tracking-[0.3em]">1. Selecciona tu Próximo Nivel</h3>
              </div>
              <Badge variant="info" className="bg-white/5 border-white/10 px-3 py-1 text-[10px] font-black">BCB GLOBAL</Badge>
            </div>

            <div className="space-y-4">
              {niveles.filter(n => (n.deposito || n.costo) >= 0).map((n, i) => {
                const isActive = monto === (n.deposito || n.costo).toString();
                const isLocked = n.bloqueado;
                const isCurrent = n.id === user?.nivel_id;
                
                return (
                  <motion.button
                    key={n.id}
                    type="button"
                    disabled={isLocked || isCurrent}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => {
                      setMonto((n.deposito || n.costo).toString());
                      setModo('Compra VIP');
                    }}
                    className={cn(
                      "w-full text-left p-5 rounded-[2rem] border transition-all duration-500 relative overflow-hidden group",
                      isActive 
                        ? "bg-sav-primary border-sav-primary shadow-[0_20px_40px_rgba(220,38,38,0.3)] scale-[1.02]" 
                        : "bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/20 shadow-xl",
                      (isLocked || isCurrent) && "opacity-40 grayscale cursor-not-allowed"
                    )}
                  >
                    <div className="flex justify-between items-center relative z-10">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "text-xs font-black uppercase tracking-widest",
                            isActive ? "text-white" : "text-white/90"
                          )}>
                            {displayLevelCode(n.nombre)}
                          </span>
                          {isCurrent && <Badge variant="success" className="text-[7px] py-0">ACTUAL</Badge>}
                        </div>
                        <div className="flex items-baseline gap-1">
                          <span className={cn(
                            "text-2xl font-black tracking-tighter",
                            isActive ? "text-white" : "text-white"
                          )}>
                            {Number(n.deposito || n.costo).toLocaleString('es-BO')}
                          </span>
                          <span className="text-[10px] font-bold opacity-60">BOB</span>
                        </div>
                      </div>

                      <div className="text-right space-y-1">
                        <p className={cn("text-[8px] font-black uppercase tracking-widest", isActive ? "text-white/60" : "text-sav-muted")}>Renta Diaria</p>
                        <p className={cn("text-sm font-black", isActive ? "text-white" : "text-sav-success")}>
                          +{Number(n.ingreso_diario || (Number(n.num_tareas_diarias || 0) * Number(n.ganancia_tarea || 0))).toLocaleString('es-BO', { minimumFractionDigits: 2 })} <span className="text-[8px]">BOB</span>
                        </p>
                      </div>
                    </div>

                    <div className={cn(
                      "mt-4 pt-4 border-t flex justify-between items-center relative z-10",
                      isActive ? "border-white/10" : "border-white/5"
                    )}>
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col">
                          <span className={cn("text-[7px] font-black uppercase tracking-widest", isActive ? "text-white/60" : "text-sav-muted")}>Tareas</span>
                          <span className="text-[10px] font-black text-white">{n.num_tareas_diarias} Cupos</span>
                        </div>
                        <div className="w-px h-6 bg-white/10" />
                        <div className="flex flex-col">
                          <span className={cn("text-[7px] font-black uppercase tracking-widest", isActive ? "text-white/60" : "text-sav-muted")}>Pago/Tarea</span>
                          <span className="text-[10px] font-black text-white">{Number(n.ganancia_tarea || 0).toFixed(2)} BOB</span>
                        </div>
                      </div>
                      
                      {isActive && (
                        <div className="bg-white text-sav-primary p-1 rounded-full shadow-lg border border-sav-primary">
                          <CheckCircle2 size={10} />
                        </div>
                      )}
                    </div>

                    {/* Decorative Background Icon */}
                    <div className="absolute right-[-10px] bottom-[-10px] opacity-[0.03] rotate-12 group-hover:rotate-[20deg] transition-transform duration-700">
                      <TrendingUp size={100} />
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </section>

          {/* Step 2: Payment */}
          <section className="space-y-6">
            <div className="flex items-center gap-3 px-1">
              <div className="w-8 h-8 rounded-xl bg-sav-accent/10 flex items-center justify-center text-sav-accent border border-sav-accent/20 shadow-lg">
                <QrCode size={16} />
              </div>
              <h3 className="text-[11px] font-black text-white uppercase tracking-[0.3em]">2. Realiza el Pago QR</h3>
            </div>

            <Card className="p-10 border-white/5 bg-gradient-to-br from-white/[0.03] to-transparent relative overflow-hidden group shadow-2xl">
              <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-sav-primary/10 blur-[60px] rounded-full group-hover:scale-150 transition-transform duration-1000" />
              
              {metodos.length > 0 ? (
                <div className="flex flex-col items-center gap-8 relative z-10">
                  <div className="relative group/qr">
                    {/* QR Frame Decor */}
                    <div className="absolute -inset-4 border-2 border-sav-primary/20 rounded-[2.5rem] opacity-0 group-hover/qr:opacity-100 transition-all duration-500 scale-90 group-hover/qr:scale-100" />
                    <div className="absolute -inset-1 bg-gradient-to-tr from-sav-primary/40 to-sav-accent/40 blur-md opacity-0 group-hover/qr:opacity-100 transition-all duration-500" />
                    
                    <div className="relative p-5 bg-white rounded-[2rem] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] transition-all duration-500 group-hover/qr:translate-y-[-5px]">
                      <img 
                        src={metodos[0].imagen_base64 || metodos[0].imagen_qr_url} 
                        alt="QR Pago" 
                        className="w-52 h-52 object-contain"
                        onError={(e) => {
                          e.target.src = 'https://placehold.co/400x400?text=QR+NO+DISPONIBLE';
                        }}
                      />
                    </div>
                  </div>
                  
                  <div className="text-center space-y-2">
                    <p className="text-[9px] font-black text-sav-muted uppercase tracking-[0.4em]">Titular Verificado</p>
                    <div className="px-6 py-2.5 rounded-2xl bg-white/5 border border-white/10 shadow-inner">
                      <p className="text-sm font-black text-white uppercase tracking-tight">{metodos[0].nombre_titular}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4 py-16">
                  <div className="relative">
                    <Loader2 className="animate-spin text-sav-primary" size={40} />
                    <div className="absolute inset-0 bg-sav-primary/20 blur-xl animate-pulse" />
                  </div>
                  <p className="text-[10px] font-black text-sav-muted uppercase tracking-[0.3em] animate-pulse">Sincronizando Pasarela...</p>
                </div>
              )}
            </Card>
          </section>

          {/* Step 3: Confirmation */}
          <section className="space-y-6">
            <div className="flex items-center gap-3 px-1">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20 shadow-lg">
                <Upload size={16} />
              </div>
              <h3 className="text-[11px] font-black text-white uppercase tracking-[0.3em]">3. Confirma tu Operación</h3>
            </div>

            <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
            
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={() => fileRef.current?.click()}
              className={cn(
                "w-full min-h-[16rem] rounded-[3rem] border-2 border-dashed transition-all duration-500 flex flex-col items-center justify-center gap-5 overflow-hidden group relative shadow-[0_40px_80px_-20px_rgba(0,0,0,0.4)]",
                comprobante 
                  ? "border-emerald-500/40 bg-emerald-500/5" 
                  : "border-white/10 bg-white/[0.02] hover:border-sav-primary/40 hover:bg-sav-primary/5"
              )}
            >
              {comprobante ? (
                <>
                  <img src={comprobante} alt="Preview" className="absolute inset-0 w-full h-full object-cover opacity-20 blur-[2px]" />
                  <div className="relative z-10 w-20 h-20 rounded-3xl bg-emerald-500 text-white flex items-center justify-center shadow-[0_20px_40px_rgba(16,185,129,0.3)]">
                    <CheckCircle2 size={40} />
                  </div>
                  <div className="relative z-10 text-center space-y-1">
                    <p className="text-sm font-black text-white uppercase tracking-widest">Voucher Detectado</p>
                    <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-[0.2em] bg-emerald-500/10 px-4 py-1 rounded-full">Toca para reemplazar</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center text-sav-muted group-hover:bg-sav-primary group-hover:text-white transition-all duration-500 shadow-inner border border-white/5">
                    <Upload size={32} />
                  </div>
                  <div className="text-center space-y-2">
                    <p className="text-xs font-black text-sav-muted uppercase tracking-[0.2em] group-hover:text-white transition-colors">Seleccionar Captura de Pantalla</p>
                    <p className="text-[9px] text-white/10 font-bold uppercase tracking-[0.3em]">JPG • PNG • MÁXIMO 2MB</p>
                  </div>
                </>
              )}
              
              {isOptimizing && (
                <div className="absolute inset-0 bg-sav-dark/90 backdrop-blur-xl flex flex-col items-center justify-center gap-4 z-20">
                  <div className="relative">
                    <Loader2 className="animate-spin text-sav-primary" size={48} />
                    <div className="absolute inset-0 bg-sav-primary/30 blur-2xl animate-pulse" />
                  </div>
                  <p className="text-[11px] font-black text-white uppercase tracking-[0.4em] animate-pulse">Optimizando Imagen...</p>
                </div>
              )}
            </motion.button>
          </section>

          {error && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="p-5 border-sav-error/30 bg-sav-error/5 flex items-center gap-4 shadow-xl">
                <AlertCircle size={20} className="text-sav-error shrink-0" />
                <p className="text-[10px] text-sav-error font-black uppercase tracking-[0.2em] leading-relaxed">{error}</p>
              </Card>
            </motion.div>
          )}

          <div className="pt-4">
            <Button 
              type="submit" 
              loading={loading}
              disabled={isScheduleLocked || !monto || !comprobante}
              className="w-full h-20 rounded-[2rem] text-sm font-black tracking-[0.3em] shadow-[0_25px_50px_-12px_rgba(220,38,38,0.4)] active:scale-95 transition-all uppercase"
            >
              ENVIAR PARA REVISIÓN
            </Button>
          </div>
        </form>

        {/* Footer Info */}
        <Card className="p-8 bg-sav-primary/5 border-sav-primary/10 rounded-[2.5rem] relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-5">
            <ShieldCheck size={60} />
          </div>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 rounded-xl bg-sav-primary/10 flex items-center justify-center text-sav-primary shadow-inner">
              <Info size={20} />
            </div>
            <p className="text-[11px] text-white font-black uppercase tracking-[0.2em]">Protocolo de Verificación</p>
          </div>
          <p className="text-[10px] text-sav-muted font-bold leading-relaxed uppercase tracking-widest text-justify">
            Las recargas son procesadas individualmente por nuestro equipo financiero. 
            El tiempo promedio de aprobación es de <span className="text-white">15 a 45 minutos</span>. 
            Asegúrate de que el voucher sea de la transacción actual y se vea claramente el código de operación.
          </p>
   </Card>
        </main>
      </div>
    </Layout>
  );
}