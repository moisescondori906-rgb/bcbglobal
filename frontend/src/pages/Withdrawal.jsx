import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Layout from '../components/Layout';
import Header from '../components/Header';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { 
  Eye as EyeIcon, 
  EyeOff as EyeOffIcon, 
  Check as CheckIcon, 
  Upload as UploadIcon, 
  Info as InfoIcon, 
  AlertCircle as AlertCircleIcon, 
  Clock as ClockIcon, 
  Wallet as WalletIcon, 
  Sparkles as SparklesIcon, 
  CheckCircle2 as CheckCircleIcon, 
  ChevronRight as ChevronRightIcon, 
  ArrowUpCircle as ArrowUpCircleIcon, 
  ShieldCheck as ShieldCheckIcon, 
  Loader2 as LoaderIcon, 
  ArrowRight as ArrowRightIcon,
  TrendingUp as TrendingUpIcon, 
  CreditCard as CreditCardIcon, 
  Banknote as BanknoteIcon, 
  QrCode as QrCodeIcon,
  Lock as LockIcon,
  Plus as PlusIcon
} from 'lucide-react';
import { isScheduleOpen, getBoliviaNow } from '../lib/schedule';
import imageCompression from 'browser-image-compression';

// UI Components
import { Card } from '../components/ui/Card.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { Input } from '../components/ui/Input.jsx';
import { cn } from '../lib/utils/cn';

export default function Withdrawal() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const [montos, setMontos] = useState([25, 100, 500, 1500, 5000, 10000]);
  const [tarjetas, setTarjetas] = useState([]);
  const [tarjetaId, setTarjetaId] = useState('');
  const [tipoBilletera, setTipoBilletera] = useState('principal');
  const [monto, setMonto] = useState(500);
  const [password, setPassword] = useState('');
  const [qrImage, setQrImage] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [pc, setPc] = useState(null);
  const [userLevel, setUserLevel] = useState(null);
  const [niveles, setNiveles] = useState([]);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [hasWithdrawalToday, setHasWithdrawalToday] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [isPunished, setIsPunished] = useState(false);

  useEffect(() => {
    let isMounted = true;
    if (user && !user.tiene_password_fondo) {
      navigate('/cambiar-contrasena-fondo');
      return;
    }

    const checkStatus = async () => {
      try {
        const withdrawalsRes = await api.withdrawals.list();
        
        if (!isMounted) return;
        
        // Verificación básica en frontend (El backend valida rigurosamente)
        const boliviaNow = getBoliviaNow();
        const todayStr = boliviaNow.getFullYear() + '-' + String(boliviaNow.getMonth() + 1).padStart(2, '0') + '-' + String(boliviaNow.getDate()).padStart(2, '0');
        const alreadyDone = Array.isArray(withdrawalsRes) && withdrawalsRes.some(w => w.estado !== 'rechazado' && w.created_at && w.created_at.split('T')[0] === todayStr);
        setHasWithdrawalToday(alreadyDone);
      } catch (err) {
        console.error('Error status check:', err);
      }
    };

    api.withdrawals.montos().then(data => {
      if (isMounted) setMontos(data || [25, 100, 500, 1500, 5000, 10000]);
    }).catch(() => {});
    
    api.users.tarjetas().then((list) => {
      if (!isMounted) return;
      setTarjetas(list || []);
      if (list && list.length === 0) {
        navigate('/vincular-tarjeta');
        return;
      }
      if (list && list[0]) setTarjetaId(list[0].id);
    }).catch(() => {
      if (isMounted) setTarjetas([]);
    });

    api.publicContent().then(data => {
      if (isMounted) setPc(data || null);
    }).catch(() => {});

    api.levels.list().then((list) => {
      if (!isMounted) return;
      setNiveles(list || []);
      if (user?.nivel_id && list) {
        const found = list.find(l => String(l.id) === String(user.nivel_id));
        if (found) setUserLevel(found);
      }
    }).catch(() => {});

    checkStatus();

    return () => { isMounted = false; };
  }, [user?.id, navigate]);

  const saldoPrincipal = user?.saldo_principal ?? 0;
  const saldoComisiones = user?.saldo_comisiones ?? 0;
  
  let horarioRet;
  let schedRet = { ok: true };
  
  if (userLevel && userLevel.retiro_horario_habilitado) {
    const diasHabilitados = [];
    let currentDay = userLevel.retiro_dia_inicio;
    const endDay = userLevel.retiro_dia_fin;
    if (currentDay <= endDay) {
      for (let i = currentDay; i <= endDay; i++) diasHabilitados.push(i);
    } else {
      for (let i = currentDay; i <= 6; i++) diasHabilitados.push(i);
      for (let i = 0; i <= endDay; i++) diasHabilitados.push(i);
    }
    horarioRet = {
      enabled: true,
      dias_semana: diasHabilitados,
      hora_inicio: userLevel.retiro_hora_inicio?.substring(0, 5),
      hora_fin: userLevel.retiro_hora_fin?.substring(0, 5)
    };
    schedRet = isScheduleOpen(horarioRet);
  } else if (pc?.horario_retiro) {
    horarioRet = pc.horario_retiro;
    schedRet = isScheduleOpen(horarioRet);
  }

  const fueraHorario = horarioRet?.enabled && !schedRet.ok;
  const msgHorario = !schedRet.ok ? schedRet.message : '';

  // --- VALIDACIÓN DE DÍAS SEGÚN NIVEL ---
  const boliviaNow = getBoliviaNow();
  const today = boliviaNow.getDay(); // 0=Dom, 1=Lun, 2=Mar... 6=Sab
  
  // Regla Global: Martes a Jueves (2, 3, 4)
  const isAllowedDay = today >= 2 && today <= 4;
  const isInternar = userLevel?.codigo === 'internar' || userLevel?.codigo === 'pasantia';
  const canWithdrawToday = isAllowedDay && !isInternar;

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setIsOptimizing(true);
    try {
      const options = { maxSizeMB: 0.8, maxWidthOrHeight: 1200, useWebWorker: true, fileType: 'image/jpeg', initialQuality: 0.85 };
      const compressedFile = await imageCompression(file, options);
      const reader = new FileReader();
      reader.onload = () => {
        setQrImage(reader.result);
        setIsOptimizing(false);
      };
      reader.readAsDataURL(compressedFile);
    } catch (err) {
      const reader = new FileReader();
      reader.onload = () => { setQrImage(reader.result); setIsOptimizing(false); };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password) { setError('Ingresa tu contraseña de fondo.'); return; }
    if (!qrImage) { setError('Sube tu código QR.'); return; }
    if (!hasSignature) { setError('Debes aceptar la firma digital para continuar.'); return; }
    
    setLoading(true);
    setError('');
    try {
      await api.withdrawals.create({ 
        monto, 
        tipo_billetera: tipoBilletera, 
        password_fondo: password, 
        qr_retiro: qrImage, 
        firma_digital: true,
        tarjeta_id: tarjetaId || undefined 
      });
      navigate('/ganancias');
    } catch (err) {
      // Capturar mensaje del backend (incluyendo calendario/feriados)
      setError(err.response?.data?.error || err.message || 'Error al solicitar retiro');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-sav-dark">
        <Header title="Retiro de Fondos" rightAction={<Link to="/ganancias" className="text-sav-primary text-[9px] font-black uppercase tracking-widest bg-sav-primary/10 px-4 py-2 rounded-xl border border-sav-primary/20">Historial</Link>} />
        
        {/* Background Decor */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-gradient-to-b from-sav-primary/5 to-transparent blur-[120px]" />
          <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-sav-accent/5 rounded-full blur-[100px]" />
        </div>

        <main className="px-4 sm:px-6 py-6 sm:py-8 space-y-8 sm:space-y-10 pb-32 animate-fade">
        {/* Balance Card */}
        <Card variant="premium" className="relative overflow-hidden group bg-gradient-to-br from-sav-primary to-indigo-800 p-6 sm:p-8 border-none shadow-sav-glow">
          <div className="absolute top-0 right-0 p-6 sm:p-8 opacity-10 group-hover:scale-110 transition-transform">
            <WalletIcon size={60} className="text-white sm:w-[100px] sm:h-[100px]" />
          </div>
          <div className="relative z-10 space-y-1 sm:space-y-2">
            <p className="text-[9px] sm:text-[10px] font-black text-white/60 uppercase tracking-[0.2em] sm:tracking-[0.3em]">Capital Disponible</p>
            <div className="flex items-baseline gap-2 sm:gap-3 overflow-hidden">
              <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tighter truncate">
                {user?.saldo_principal?.toLocaleString()}
              </h2>
              <span className="text-[10px] sm:text-xs font-black text-white/40 uppercase tracking-widest shrink-0">BOB</span>
            </div>
          </div>
        </Card>

        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <Card className="p-4 sm:p-5 bg-sav-error/10 border-sav-error/20 flex items-start sm:items-center gap-3 sm:gap-4 shadow-xl">
                <AlertCircleIcon size={18} className="text-sav-error shrink-0 mt-0.5 sm:mt-0" />
                <p className="text-[9px] sm:text-[10px] text-sav-error font-black uppercase tracking-[0.15em] sm:tracking-[0.2em] leading-relaxed">{error}</p>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Alerta de Horario */}
        {fueraHorario && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="p-4 sm:p-5 bg-amber-500/10 border-amber-500/20 flex items-start sm:items-center gap-3 sm:gap-4">
              <ClockIcon size={18} className="text-amber-500 shrink-0 mt-0.5 sm:mt-0" />
              <p className="text-[9px] sm:text-[10px] text-amber-500 font-black uppercase tracking-widest">{msgHorario || 'Fuera de horario de retiro'}</p>
            </Card>
          </motion.div>
        )}

        {hasWithdrawalToday && (
          <Card className="p-4 sm:p-6 border-amber-500/20 bg-amber-500/5 flex items-start sm:items-center gap-3 sm:gap-4">
            <ClockIcon size={20} className="text-amber-500 shrink-0 mt-0.5 sm:mt-0" />
            <p className="text-[9px] sm:text-[10px] font-black text-amber-500 uppercase tracking-widest leading-relaxed">
              Solo puedes realizar 1 retiro por día.
            </p>
          </Card>
        )}

        {/* Alerta de Día de Retiro */}
        {!isAllowedDay && !isInternar && userLevel && (
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <Card variant="flat" className="p-5 sm:p-6 border-amber-500/20 bg-amber-500/10 flex flex-col gap-3">
              <div className="flex items-center gap-2 sm:gap-3 text-amber-500">
                <ClockIcon size={18} />
                <h3 className="text-[10px] sm:text-xs font-black uppercase tracking-widest">Días no permitidos</h3>
              </div>
              <p className="text-[9px] sm:text-[10px] text-sav-muted font-bold uppercase tracking-widest leading-relaxed">
                Los retiros están disponibles de martes a jueves, según horario de Bolivia.
                <br/>Por favor, regresa en los días permitidos para procesar tu solicitud.
              </p>
            </Card>
          </motion.div>
        )}

        {isInternar && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            <Card variant="premium" className="p-6 sm:p-8 border-sav-primary/20 bg-sav-primary/5 flex flex-col items-center gap-4 text-center">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-sav-primary/10 flex items-center justify-center text-sav-primary shadow-inner">
                <LockIcon size={28} className="sm:w-[32px] sm:h-[32px]" />
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                <h3 className="text-xs sm:text-sm font-black text-gray-900 uppercase tracking-widest">Retiros Deshabilitados</h3>
                <p className="text-[9px] sm:text-[10px] font-bold text-sav-muted uppercase tracking-widest leading-relaxed">
                  El nivel Internar no tiene habilitados los retiros. <br/>
                  Debes estar en un nivel global para solicitar retiros.
                </p>
              </div>
              <Button onClick={() => navigate('/vip')} variant="primary" className="mt-2 text-[10px] py-3 h-12 w-full max-w-[200px]">Ver Niveles VIP</Button>
            </Card>
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8 sm:space-y-10">
          {/* Origen de Fondos */}
          <section className="space-y-5 sm:space-y-6">
            <div className="flex items-center gap-2 sm:gap-3 px-1">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-sav-primary/10 flex items-center justify-center text-sav-primary border border-sav-primary/20 shadow-lg">
                <WalletIcon size={14} className="sm:w-[16px] sm:h-[16px]" />
              </div>
              <h2 className="text-[10px] sm:text-[11px] font-black text-gray-900 uppercase tracking-[0.2em] sm:tracking-[0.3em]">1. Origen de Fondos</h2>
            </div>
            
            <div className="grid grid-cols-1 gap-3 sm:gap-4">
              {[
                { id: 'principal', label: 'Saldo Principal', val: saldoPrincipal, icon: BanknoteIcon },
                { id: 'comisiones', label: 'Billetera Comisiones', val: saldoComisiones, icon: TrendingUpIcon }
              ].map(b => {
                const Icon = b.icon;
                const active = tipoBilletera === b.id;
                return (
                  <Card 
                    key={b.id}
                    variant={active ? 'premium' : 'flat'}
                    className={cn(
                      "p-4 sm:p-6 flex items-center justify-between cursor-pointer border transition-all duration-500",
                      active ? "border-sav-primary/40 bg-sav-primary/10 scale-[1.01] sm:scale-[1.02] shadow-xl sm:shadow-2xl" : "border-black/5 bg-white shadow-sm hover:bg-black/5"
                    )}
                    onClick={() => setTipoBilletera(b.id)}
                  >
                    <div className="flex items-center gap-4 sm:gap-5 min-w-0">
                      <div className={cn(
                        "w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-inner shrink-0",
                        active ? "bg-white/10 text-white" : "bg-sav-primary/5 text-sav-primary"
                      )}>
                        <Icon size={20} className="sm:w-[24px] sm:h-[24px]" />
                      </div>
                      <div className="space-y-0.5 sm:space-y-1 min-w-0">
                        <p className={cn("text-[8px] sm:text-[9px] font-black uppercase tracking-widest truncate", active ? "text-white/60" : "text-sav-muted")}>{b.label}</p>
                        <p className="text-xl sm:text-2xl font-black text-gray-900 tracking-tighter truncate">{b.val.toLocaleString()} <span className="text-[9px] text-gray-400 uppercase">BOB</span></p>
                      </div>
                    </div>
                    <div className={cn(
                      "w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 flex items-center justify-center transition-all shrink-0", 
                      active ? "border-white bg-white text-sav-primary" : "border-black/10"
                    )}>
                      {active && <CheckIcon size={12} className="sm:w-[14px] sm:h-[14px]" strokeWidth={4} />}
                    </div>
                  </Card>
                );
              })}
            </div>
          </section>

          {/* Visibility Everywhere - Reinvest Suggestion */}
          <section className="space-y-5 sm:space-y-6">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/20 shadow-lg">
                  <TrendingUpIcon size={14} className="sm:w-[16px] sm:h-[16px]" />
                </div>
                <h2 className="text-[10px] sm:text-[11px] font-black text-gray-900 uppercase tracking-[0.2em] sm:tracking-[0.3em]">¿Reinvertir?</h2>
              </div>
              <Link to="/vip" className="text-[8px] sm:text-[9px] font-black text-sav-primary uppercase tracking-widest flex items-center gap-1">
                Opciones <ChevronRightIcon size={10} />
              </Link>
            </div>

            <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-2 px-1 no-scrollbar snap-x">
              {niveles.filter(n => (n.deposito || n.costo) > 0).map((n, i) => {
                const esActual = n.id === user?.nivel_id;
                const esSuperior = n.orden > (userLevel?.orden || 0);
                
                if (!esSuperior && !esActual) return null;

                return (
                  <motion.div
                    key={n.id}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => navigate('/vip')}
                    className={cn(
                      "min-w-[130px] sm:min-w-[140px] p-3 sm:p-4 rounded-2xl sm:rounded-3xl border transition-all snap-start relative overflow-hidden group cursor-pointer",
                      esActual ? "bg-sav-primary/10 border-sav-primary/20" : "bg-white border-black/5"
                    )}
                  >
                    <div className="space-y-1.5 sm:space-y-2 relative z-10 min-w-0">
                      <p className="text-[8px] sm:text-[9px] font-black text-gray-900 uppercase tracking-tighter truncate">{n.nombre}</p>
                      <div className="space-y-0.5">
                        <p className="text-[6px] sm:text-[7px] font-black text-sav-muted uppercase tracking-widest leading-none">Renta Diaria</p>
                        <p className="text-xs sm:text-sm font-black text-sav-success truncate">+{Number(n.ingreso_diario || (Number(n.num_tareas_diarias || 0) * Number(n.ganancia_tarea || 0))).toFixed(2)} BOB</p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </section>

          {/* Monto a Retirar */}
          <section className="space-y-5 sm:space-y-6">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-sav-accent/10 flex items-center justify-center text-sav-accent border border-sav-accent/20 shadow-lg">
                  <BanknoteIcon size={14} className="sm:w-[16px] sm:h-[16px]" />
                </div>
                <h2 className="text-[10px] sm:text-[11px] font-black text-gray-900 uppercase tracking-[0.2em] sm:tracking-[0.3em]">2. Monto</h2>
              </div>
              <Badge variant="info" className="bg-slate-100 border-slate-200 text-slate-600 text-[9px] sm:text-[10px] font-black tracking-widest px-2 sm:px-3">BOB</Badge>
            </div>
            
            <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
              {montos.map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMonto(m)}
                  className={cn(
                    "h-12 sm:h-16 rounded-xl sm:rounded-[1.5rem] border text-[10px] sm:text-[11px] font-black uppercase tracking-widest transition-all duration-300",
                    monto === m 
                      ? "bg-sav-primary border-sav-primary text-white shadow-lg sm:shadow-[0_15px_30px_rgba(220,38,38,0.2)] scale-[1.05]" 
                      : "bg-white border-black/5 text-sav-muted hover:bg-black/5 shadow-sm"
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
          </section>

          {/* Verificación QR */}
          <section className="space-y-5 sm:space-y-6">
            <div className="flex items-center gap-2 sm:gap-3 px-1">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20 shadow-lg">
                <QrCodeIcon size={14} className="sm:w-[16px] sm:h-[16px]" />
              </div>
              <h2 className="text-[10px] sm:text-[11px] font-black text-gray-900 uppercase tracking-[0.2em] sm:tracking-[0.3em]">3. Código QR</h2>
            </div>
            
            <Card 
              variant="outline" 
              className={cn(
                "p-8 sm:p-10 border-2 border-dashed flex flex-col items-center justify-center text-center gap-4 sm:gap-5 relative overflow-hidden group transition-all duration-500 cursor-pointer",
                qrImage ? "border-emerald-500/40 bg-emerald-500/5" : "border-black/10 bg-white hover:border-sav-primary/40 hover:bg-sav-primary/5 shadow-sm"
              )}
              onClick={() => fileRef.current?.click()}
            >
              <input type="file" ref={fileRef} className="hidden" onChange={handleFile} accept="image/*" />
              {qrImage ? (
                <>
                  <img src={qrImage} className="absolute inset-0 w-full h-full object-cover opacity-20 blur-[2px]" />
                  <div className="relative z-10 w-20 h-20 sm:w-24 sm:h-24 rounded-2xl sm:rounded-3xl overflow-hidden border-2 border-emerald-500 shadow-xl sm:shadow-2xl">
                    <img src={qrImage} className="w-full h-full object-cover" />
                  </div>
                  <div className="relative z-10 space-y-1">
                    <p className="text-xs sm:text-sm font-black text-gray-900 uppercase tracking-widest">Código Detectado</p>
                    <p className="text-[8px] sm:text-[9px] text-emerald-600 font-bold uppercase tracking-[0.2em] bg-emerald-500/10 px-3 sm:px-4 py-1 rounded-full">Reemplazar</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl sm:rounded-3xl bg-slate-50 flex items-center justify-center text-sav-muted group-hover:bg-sav-primary group-hover:text-white transition-all duration-500 border border-black/5 shadow-inner">
                    {isOptimizing ? <LoaderIcon size={28} className="animate-spin" /> : <UploadIcon size={28} className="sm:w-[32px] sm:h-[32px]" />}
                  </div>
                  <div className="space-y-1.5 sm:space-y-2">
                    <p className="text-[10px] sm:text-xs font-black text-sav-muted uppercase tracking-[0.2em] group-hover:text-sav-primary transition-colors">Sube tu código de cobro</p>
                    <p className="text-[8px] sm:text-[9px] text-gray-300 font-bold uppercase tracking-[0.3em]">Yape, Bancos, QR</p>
                  </div>
                </>
              )}
            </Card>
          </section>

          {/* Seguridad */}
          <section className="space-y-5 sm:space-y-6">
            <div className="flex items-center gap-2 sm:gap-3 px-1">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/20 shadow-lg">
                <LockIcon size={14} className="sm:w-[16px] sm:h-[16px]" />
              </div>
              <h2 className="text-[10px] sm:text-[11px] font-black text-gray-900 uppercase tracking-[0.2em] sm:tracking-[0.3em]">4. Confirmación</h2>
            </div>
            
            <div className="space-y-4">
              <Input
                type="password"
                placeholder="Contraseña de retiro"
                value={password}
                onChange={e => setPassword(e.target.value)}
                showPasswordToggle
                icon={ShieldCheckIcon}
                className="h-14 sm:h-16 rounded-xl sm:rounded-2xl bg-white border-black/5 shadow-sm"
              />

              <div className="px-1 flex items-start gap-3 group cursor-pointer" onClick={() => setHasSignature(!hasSignature)}>
                <div className={cn(
                  "w-5 h-5 rounded border-2 flex items-center justify-center transition-all mt-0.5 shrink-0",
                  hasSignature ? "bg-sav-primary border-sav-primary text-white" : "border-black/10 bg-white"
                )}>
                  {hasSignature && <CheckIcon size={12} strokeWidth={4} />}
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] sm:text-[10px] font-black text-gray-900 uppercase tracking-widest group-hover:text-sav-primary transition-colors">Firma Digital de Retiro</p>
                  <p className="text-[7px] sm:text-[8px] text-sav-muted font-medium uppercase tracking-widest leading-relaxed">Confirmo que los datos son correctos y autorizo el procesamiento.</p>
                </div>
              </div>
            </div>
          </section>

          <div className="pt-2 sm:pt-4">
            <Button 
              type="submit" 
              loading={loading} 
              disabled={!canWithdrawToday || fueraHorario || hasWithdrawalToday || isPunished || !qrImage || !password || !hasSignature}
              className="h-16 sm:h-20 w-full rounded-2xl sm:rounded-[2rem] text-xs sm:text-sm tracking-[0.2em] sm:tracking-[0.3em] shadow-xl sm:shadow-[0_25px_50px_-12px_rgba(220,38,38,0.4)] active:scale-95 transition-all uppercase font-black"
            >
              {!isAllowedDay ? 'FUERA DE DÍA PERMITIDO' : 'SOLICITAR RETIRO'}
            </Button>
          </div>

          <Card className="p-4 sm:p-6 bg-slate-50 border-slate-200 rounded-xl sm:rounded-[2rem] flex items-start gap-3 sm:gap-4 shadow-sm">
            <InfoIcon size={18} className="text-sav-primary shrink-0 mt-0.5" />
            <div className="space-y-1 min-w-0">
              <p className="text-[9px] sm:text-[10px] font-black text-slate-900 uppercase tracking-widest">Información importante</p>
              <p className="text-[8px] sm:text-[9px] text-slate-500 font-bold uppercase tracking-[0.05em] leading-relaxed">
                Los retiros están disponibles de martes a jueves, según horario de Bolivia.<br/>
                Se permite 1 retiro por día. El plazo de procesamiento es de 2 a 24 horas.
              </p>
            </div>
          </Card>
        </form>
      </main>
    </div>
  </Layout>
);
}
