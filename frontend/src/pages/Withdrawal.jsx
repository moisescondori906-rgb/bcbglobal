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
  Plus as PlusIcon,
  Building2 as BuildingIcon
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
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const [montos, setMontos] = useState([25, 100, 500, 1500, 5000, 10000]);
  const [tarjetas, setTarjetas] = useState([]);
  const [tarjetaId, setTarjetaId] = useState('');
  const [tipoBilletera, setTipoBilletera] = useState('principal');
  const [monto, setMonto] = useState(500);
  const [password, setPassword] = useState('');
  const [comprobanteFile, setComprobanteFile] = useState(null);
  const [comprobantePreview, setComprobantePreview] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [pc, setPc] = useState(null);
  const [userLevel, setUserLevel] = useState(null);
  const [niveles, setNiveles] = useState([]);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [hasWithdrawalToday, setHasWithdrawalToday] = useState(false);
  const [hasSignature, setHasSignature] = useState(true); // Ya viene por defecto
  
  // Security Status State
  const [securityStatus, setSecurityStatus] = useState({
    tiene_password_fondo: true,
    tiene_cuenta_bancaria: true,
    loading: true
  });

  // Fund Password Setup State
  const [fundPass, setFundPass] = useState({ password_fondo: '', confirm_password_fondo: '' });
  
  // Bank Account Setup State
  const [bankAcc, setBankAcc] = useState({ banco: 'banco_union', titular: '', numero_cuenta: '', tipo_cuenta: 'Caja de ahorro', ci_nit: '' });

  const fetchSecurityStatus = async () => {
    try {
      const status = await api.users.securityStatus();
      setSecurityStatus({ ...status, loading: false });
      return status;
    } catch (err) {
      console.error('Error fetching security status:', err);
      setSecurityStatus(prev => ({ ...prev, loading: false }));
    }
  };

  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      const status = await fetchSecurityStatus();
      
      if (status?.tiene_password_fondo && status?.tiene_cuenta_bancaria) {
        // Cargar datos necesarios para el retiro solo si ya tiene seguridad configurada
        api.withdrawals.montos().then(data => {
          if (isMounted) setMontos(data || [25, 100, 500, 1500, 5000, 10000]);
        }).catch(() => {});
        
        api.users.getBankAccounts().then((list) => {
          if (!isMounted) return;
          setTarjetas(list || []);
          if (list && list[0]) setTarjetaId(list[0].id);
        }).catch(() => {
          if (isMounted) setTarjetas([]);
        });

        const withdrawalsRes = await api.withdrawals.list().catch(() => []);
        if (isMounted) {
          const boliviaNow = getBoliviaNow();
          const todayStr = boliviaNow.getFullYear() + '-' + String(boliviaNow.getMonth() + 1).padStart(2, '0') + '-' + String(boliviaNow.getDate()).padStart(2, '0');
          const alreadyDone = Array.isArray(withdrawalsRes) && withdrawalsRes.some(w => w.estado !== 'rechazado' && w.created_at && w.created_at.split('T')[0] === todayStr);
          setHasWithdrawalToday(alreadyDone);
        }
      }
    };

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

    init();

    return () => { isMounted = false; };
  }, [user?.id]);

  const handleFundPasswordSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.users.setFundPassword(fundPass);
      await refreshUser();
      await fetchSecurityStatus();
    } catch (err) {
      setError(err.message || 'Error al configurar contraseña de fondos');
    } finally {
      setLoading(false);
    }
  };

  const handleBankAccountSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.users.createBankAccount(bankAcc);
      await fetchSecurityStatus();
      // Recargar tarjetas para el selector de retiro
      const list = await api.users.getBankAccounts();
      setTarjetas(list || []);
      if (list && list[0]) setTarjetaId(list[0].id);
    } catch (err) {
      setError(err.message || 'Error al registrar cuenta bancaria');
    } finally {
      setLoading(false);
    }
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setIsOptimizing(true);
    try {
      const options = { maxSizeMB: 0.8, maxWidthOrHeight: 1200, useWebWorker: true, fileType: 'image/jpeg', initialQuality: 0.85 };
      const compressedFile = await imageCompression(file, options);
      setComprobanteFile(compressedFile);
      const reader = new FileReader();
      reader.onload = () => {
        setComprobantePreview(reader.result);
        setIsOptimizing(false);
      };
      reader.readAsDataURL(compressedFile);
    } catch (err) {
      setComprobanteFile(file);
      const reader = new FileReader();
      reader.onload = () => { setComprobantePreview(reader.result); setIsOptimizing(false); };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password) { setError('Ingresa tu contraseña de fondos.'); return; }
    if (!comprobanteFile) { setError('Debes subir una imagen o comprobante.'); return; }
    
    setLoading(true);
    setError('');
    try {
      const idempotencyKey = `withdraw_${user.id}_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      const formData = new FormData();
      formData.append('monto', monto);
      formData.append('tipo_billetera', tipoBilletera);
      formData.append('password_fondo', password);
      formData.append('tarjeta_id', tarjetaId);
      formData.append('comprobante', comprobanteFile);
      formData.append('idempotency_key', idempotencyKey);

      await api.withdrawals.create(formData);
      navigate('/ganancias');
    } catch (err) {
      setError(err.message || 'Error al solicitar retiro');
    } finally {
      setLoading(false);
    }
  };

  if (securityStatus.loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-sav-dark flex items-center justify-center">
          <LoaderIcon className="text-sav-primary animate-spin" size={40} />
        </div>
      </Layout>
    );
  }

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

  // --- VALIDACIÓN DE DÍAS (Sincronizado con Backend v12.0.0) ---
  const boliviaNow = getBoliviaNow();
  const today = boliviaNow.getDay(); // 0=Dom, 1=Lun, 2=Mar... 6=Sab
  
  // Reglas Globales desde Configuración
  const globalSchedule = pc?.horario_retiro || { enabled: true, dias_semana: [2, 3, 4] };
  const globalAllowedDays = Array.isArray(globalSchedule.dias_semana) ? globalSchedule.dias_semana : [2, 3, 4];

  // Si el nivel tiene horario específico configurado, usamos ese rango
  let isAllowedDay = false;
  if (userLevel?.retiro_horario_habilitado) {
    const start = Number(userLevel.retiro_dia_inicio);
    const end = Number(userLevel.retiro_dia_fin);
    if (start <= end) isAllowedDay = today >= start && today <= end;
    else isAllowedDay = today >= start || today <= end;
  } else {
    // Usar la regla general (Martes a Jueves por defecto)
    isAllowedDay = globalAllowedDays.includes(today);
  }

  const isInternar = userLevel?.codigo === 'internar' || userLevel?.codigo === 'pasantia';
  const canWithdrawToday = isAllowedDay && !isInternar;

  const DAY_NAMES = { 0: 'Domingo', 1: 'Lunes', 2: 'Martes', 3: 'Miércoles', 4: 'Jueves', 5: 'Viernes', 6: 'Sábado' };
  const globalAllowedNames = globalAllowedDays.map(d => DAY_NAMES[d]).join(', ');

  return (
    <Layout>
      <div className="min-h-screen bg-sav-dark">
        <Header 
          title="Retiro de Fondos" 
          rightAction={
            <Link to="/ganancias" className="text-sav-primary text-[9px] font-black uppercase tracking-widest bg-sav-primary/10 px-4 py-2 rounded-xl border border-sav-primary/20">
              Historial
            </Link>
          } 
        />
        
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
                  {(tipoBilletera === 'principal' ? saldoPrincipal : saldoComisiones).toLocaleString()}
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

          {/* FLUJO OBLIGATORIO */}
          {!securityStatus.tiene_password_fondo ? (
            /* PASO 1: CONTRASEÑA DE FONDOS */
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <Card variant="flat" className="p-6 bg-amber-500/5 border-amber-500/10 rounded-[2rem]">
                <div className="flex items-center gap-4 mb-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                    <ShieldCheckIcon size={24} />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-white uppercase tracking-widest leading-none mb-1">Paso 1: Seguridad</h3>
                    <p className="text-[10px] text-sav-muted font-bold uppercase tracking-tight">Configura tu contraseña de fondos</p>
                  </div>
                </div>
                <p className="text-[11px] text-sav-muted font-medium leading-relaxed">
                  Para proteger tus retiros, debes configurar una contraseña especial (diferente a la de login).
                </p>
              </Card>

              <form onSubmit={handleFundPasswordSubmit} className="space-y-6">
                <Card variant="outline" className="p-6 space-y-5 bg-white/[0.02] border-white/5 rounded-[2.5rem]">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-sav-muted uppercase tracking-[0.2em] ml-2">Nueva Contraseña de Fondos</label>
                    <div className="relative">
                      <Input
                        type="password"
                        value={fundPass.password_fondo}
                        onChange={(e) => setFundPass({ ...fundPass, password_fondo: e.target.value })}
                        className="w-full"
                        required
                        minLength={6}
                        placeholder="Mínimo 6 caracteres"
                        showPasswordToggle
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-sav-muted uppercase tracking-[0.2em] ml-2">Confirmar Contraseña</label>
                    <div className="relative">
                      <Input
                        type="password"
                        value={fundPass.confirm_password_fondo}
                        onChange={(e) => setFundPass({ ...fundPass, confirm_password_fondo: e.target.value })}
                        className="w-full"
                        required
                        minLength={6}
                        placeholder="Repite la contraseña"
                        showPasswordToggle
                      />
                    </div>
                  </div>
                </Card>

                <Button 
                  type="submit" 
                  loading={loading}
                  className="w-full h-16 rounded-3xl text-xs font-black tracking-[0.2em]"
                >
                  GUARDAR CONTRASEÑA DE FONDOS
                </Button>
              </form>
            </motion.div>
          ) : !securityStatus.tiene_cuenta_bancaria ? (
            /* PASO 2: CUENTA BANCARIA */
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <Card variant="flat" className="p-6 bg-sav-primary/5 border-sav-primary/10 rounded-[2rem]">
                <div className="flex items-center gap-4 mb-3">
                  <div className="w-12 h-12 rounded-2xl bg-sav-primary/10 flex items-center justify-center text-sav-primary">
                    <CreditCardIcon size={24} />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-white uppercase tracking-widest leading-none mb-1">Paso 2: Cuenta Bancaria</h3>
                    <p className="text-[10px] text-sav-muted font-bold uppercase tracking-tight">Registra dónde recibirás tus fondos</p>
                  </div>
                </div>
                <p className="text-[11px] text-sav-muted font-medium leading-relaxed">
                  Ingresa los datos exactos de tu cuenta bancaria para evitar demoras en tus pagos.
                </p>
              </Card>

              <form onSubmit={handleBankAccountSubmit} className="space-y-6">
                <Card variant="outline" className="p-6 space-y-5 bg-white/[0.02] border-white/5 rounded-[2.5rem]">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-sav-muted uppercase tracking-[0.2em] ml-2">Banco o Plataforma</label>
                    <select 
                      value={bankAcc.banco} 
                      onChange={(e) => setBankAcc({ ...bankAcc, banco: e.target.value })} 
                      className="w-full bg-sav-surface border border-sav-border rounded-2xl px-5 py-4 text-white font-bold text-sm focus:border-sav-primary/30 outline-none appearance-none"
                    >
                      <option value="banco_union" className="bg-sav-dark">Banco Unión</option>
                      <option value="yape" className="bg-sav-dark">Yape / Celular</option>
                      <option value="yasta" className="bg-sav-dark">Yasta</option>
                      <option value="banco_mercantil" className="bg-sav-dark">Banco Mercantil</option>
                      <option value="banco_ganadero" className="bg-sav-dark">Banco Ganadero</option>
                      <option value="banco_nacional" className="bg-sav-dark">Banco Nacional de Bolivia</option>
                      <option value="banco_economico" className="bg-sav-dark">Banco Económico</option>
                      <option value="otro" className="bg-sav-dark">Otro Banco</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-sav-muted uppercase tracking-[0.2em] ml-2">Nombre del Titular</label>
                    <Input
                      value={bankAcc.titular}
                      onChange={(e) => setBankAcc({ ...bankAcc, titular: e.target.value })}
                      placeholder="Nombre completo"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-sav-muted uppercase tracking-[0.2em] ml-2">Número de Cuenta / Celular</label>
                    <Input
                      value={bankAcc.numero_cuenta}
                      onChange={(e) => setBankAcc({ ...bankAcc, numero_cuenta: e.target.value })}
                      placeholder="Número de cuenta o celular"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-sav-muted uppercase tracking-[0.2em] ml-2">Tipo de Cuenta</label>
                      <Input
                        value={bankAcc.tipo_cuenta}
                        onChange={(e) => setBankAcc({ ...bankAcc, tipo_cuenta: e.target.value })}
                        placeholder="Caja de ahorro..."
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-sav-muted uppercase tracking-[0.2em] ml-2">CI / NIT</label>
                      <Input
                        value={bankAcc.ci_nit}
                        onChange={(e) => setBankAcc({ ...bankAcc, ci_nit: e.target.value })}
                        placeholder="Documento de identidad"
                      />
                    </div>
                  </div>
                </Card>

                <Button 
                  type="submit" 
                  loading={loading}
                  className="w-full h-16 rounded-3xl text-xs font-black tracking-[0.2em]"
                >
                  REGISTRAR CUENTA BANCARIA
                </Button>
              </form>
            </motion.div>
          ) : (
            /* PASO 3: FORMULARIO DE RETIRO */
            <div className="space-y-8 animate-fade">
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
                  <Card variant="flat" className="p-5 sm:p-6 border-amber-500/20 bg-amber-500/10 flex flex-col gap-5">
                    <div className="flex items-center gap-2 sm:gap-3 text-amber-500">
                      <ClockIcon size={18} />
                      <h3 className="text-[10px] sm:text-xs font-black uppercase tracking-widest">Días no permitidos</h3>
                    </div>
                    
                    <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-4 border border-amber-500/10 space-y-3">
                      <div className="flex justify-between items-center px-1">
                        <span className="text-[8px] font-black text-amber-600/60 uppercase tracking-widest">Cronograma Semanal</span>
                        <span className="text-[8px] font-black text-amber-600 uppercase tracking-widest">Bolivia Time</span>
                      </div>
                      <div className="grid grid-cols-7 gap-1.5">
                        {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((day, i) => {
                          let isAllowed = false;
                          if (userLevel?.retiro_horario_habilitado) {
                            const start = Number(userLevel.retiro_dia_inicio);
                            const end = Number(userLevel.retiro_dia_fin);
                            if (start <= end) isAllowed = i >= start && i <= end;
                            else isAllowed = i >= start || i <= end;
                          } else {
                            isAllowed = globalAllowedDays.includes(i);
                          }
                          const isToday = today === i;
                          return (
                            <div key={i} className="flex flex-col items-center gap-1.5">
                              <span className="text-[8px] font-black text-slate-400">{day}</span>
                              <div className={cn(
                                "w-full aspect-square rounded-lg flex items-center justify-center text-[9px] font-black transition-all",
                                isAllowed 
                                  ? "bg-sav-primary text-white shadow-md shadow-sav-primary/20" 
                                  : "bg-white/50 text-slate-300 border border-slate-100",
                                isToday && !isAllowed && "border-amber-500/40 ring-1 ring-amber-500/20"
                              )}>
                                {i === 0 ? 7 : i}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
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

                {/* Selección de Cuenta */}
                <section className="space-y-5 sm:space-y-6">
                  <div className="flex items-center gap-2 sm:gap-3 px-1">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 border border-blue-500/20 shadow-lg">
                      <CreditCardIcon size={14} className="sm:w-[16px] sm:h-[16px]" />
                    </div>
                    <h2 className="text-[10px] sm:text-[11px] font-black text-gray-900 uppercase tracking-[0.2em] sm:tracking-[0.3em]">3. Cuenta Bancaria</h2>
                  </div>
                  
                  <div className="space-y-3">
                    {tarjetas.map(t => {
                      const active = tarjetaId === t.id;
                      return (
                        <Card 
                          key={t.id}
                          variant={active ? 'premium' : 'flat'}
                          className={cn(
                            "p-4 flex items-center justify-between cursor-pointer border transition-all duration-300",
                            active ? "border-blue-500/40 bg-blue-500/10" : "bg-white border-black/5 shadow-sm"
                          )}
                          onClick={() => setTarjetaId(t.id)}
                        >
                          <div className="flex items-center gap-3">
                            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", active ? "bg-white/10 text-white" : "bg-blue-500/10 text-blue-500")}>
                              <BuildingIcon size={20} />
                            </div>
                            <div>
                              <p className={cn("text-[9px] font-black uppercase tracking-widest", active ? "text-white/60" : "text-sav-muted")}>{t.banco}</p>
                              <p className="text-sm font-black text-gray-900">{t.numero_cuenta}</p>
                            </div>
                          </div>
                          <div className={cn(
                            "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all", 
                            active ? "border-white bg-white text-blue-500" : "border-black/10"
                          )}>
                            {active && <CheckIcon size={12} strokeWidth={4} />}
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </section>

                {/* Comprobante / Imagen */}
                <section className="space-y-5 sm:space-y-6">
                  <div className="flex items-center gap-2 sm:gap-3 px-1">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20 shadow-lg">
                      <UploadIcon size={14} className="sm:w-[16px] sm:h-[16px]" />
                    </div>
                    <h2 className="text-[10px] sm:text-[11px] font-black text-gray-900 uppercase tracking-[0.2em] sm:tracking-[0.3em]">4. Comprobante</h2>
                  </div>
                  
                  <Card 
                    variant="outline" 
                    className={cn(
                      "p-8 sm:p-10 border-2 border-dashed flex flex-col items-center justify-center text-center gap-4 sm:gap-5 relative overflow-hidden group transition-all duration-500 cursor-pointer",
                      comprobantePreview ? "border-emerald-500/40 bg-emerald-500/5" : "border-black/10 bg-white hover:border-sav-primary/40 hover:bg-sav-primary/5 shadow-sm"
                    )}
                    onClick={() => fileRef.current?.click()}
                  >
                    <input type="file" ref={fileRef} className="hidden" onChange={handleFile} accept="image/*" />
                    {comprobantePreview ? (
                      <>
                        <img src={comprobantePreview} className="absolute inset-0 w-full h-full object-cover opacity-20 blur-[2px]" />
                        <div className="relative z-10 w-24 h-24 rounded-3xl overflow-hidden border-2 border-emerald-500 shadow-2xl">
                          <img src={comprobantePreview} className="w-full h-full object-cover" />
                        </div>
                        <div className="relative z-10 space-y-1">
                          <p className="text-xs font-black text-gray-900 uppercase tracking-widest">Imagen Cargada</p>
                          <p className="text-[8px] text-emerald-600 font-bold uppercase tracking-[0.2em] bg-emerald-500/10 px-4 py-1 rounded-full">Cambiar Imagen</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl sm:rounded-3xl bg-slate-50 flex items-center justify-center text-sav-muted group-hover:bg-sav-primary group-hover:text-white transition-all duration-500 border border-black/5 shadow-inner">
                          {isOptimizing ? <LoaderIcon size={28} className="animate-spin" /> : <UploadIcon size={28} />}
                        </div>
                        <div className="space-y-1.5 sm:space-y-2">
                          <p className="text-[10px] sm:text-xs font-black text-sav-muted uppercase tracking-[0.2em] group-hover:text-sav-primary transition-colors">Sube un comprobante</p>
                          <p className="text-[8px] sm:text-[9px] text-gray-300 font-bold uppercase tracking-[0.3em]">Requisito obligatorio para retiro</p>
                        </div>
                      </>
                    )}
                  </Card>
                </section>

                {/* Seguridad Final */}
                <section className="space-y-5 sm:space-y-6">
                  <div className="flex items-center gap-2 sm:gap-3 px-1">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/20 shadow-lg">
                      <LockIcon size={14} className="sm:w-[16px] sm:h-[16px]" />
                    </div>
                    <h2 className="text-[10px] sm:text-[11px] font-black text-gray-900 uppercase tracking-[0.2em] sm:tracking-[0.3em]">5. Confirmación</h2>
                  </div>
                  
                  <div className="space-y-4">
                    <Input
                      type="password"
                      placeholder="Contraseña de fondos"
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
                        <p className="text-[9px] sm:text-[10px] font-black text-gray-900 uppercase tracking-widest group-hover:text-sav-primary transition-colors">Autorización de Transacción</p>
                        <p className="text-[7px] sm:text-[8px] text-sav-muted font-medium uppercase tracking-widest leading-relaxed">Confirmo que los datos son correctos y autorizo el procesamiento.</p>
                      </div>
                    </div>
                  </div>
                </section>

                <div className="pt-2 sm:pt-4">
                  <Button 
                    type="submit" 
                    loading={loading} 
                    disabled={!canWithdrawToday || fueraHorario || hasWithdrawalToday || !comprobanteFile || !password || !hasSignature}
                    className="h-16 sm:h-20 w-full rounded-2xl sm:rounded-[2rem] text-xs sm:text-sm tracking-[0.2em] sm:tracking-[0.3em] shadow-xl active:scale-95 transition-all uppercase font-black"
                  >
                    {!canWithdrawToday 
                      ? 'FUERA DE DÍA ASIGNADO' 
                      : 'SOLICITAR RETIRO'
                    }
                  </Button>
                </div>
              </form>
            </div>
          )}
        </main>
      </div>
    </Layout>
  );
}
