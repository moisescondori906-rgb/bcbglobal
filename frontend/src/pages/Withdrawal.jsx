import { useState, useEffect } from 'react';
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
  Lock as LockIcon,
  Plus as PlusIcon,
  Building2 as BuildingIcon,
  X as XIcon,
  QrCode as QrCodeIcon,
  Upload as UploadIcon
} from 'lucide-react';
import { isScheduleOpen, getperuNow as getBoliviaNow } from '../lib/schedule';

// UI Components
import { Card } from '../components/ui/Card.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { Input } from '../components/ui/Input.jsx';
import { cn } from '../lib/utils/cn';

function getBoliviaDateKeyFromValue(value) {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return String(value);

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;

  const boliviaDate = new Date(parsed.toLocaleString('en-US', { timeZone: 'America/La_Paz' }));
  return [
    boliviaDate.getFullYear(),
    String(boliviaDate.getMonth() + 1).padStart(2, '0'),
    String(boliviaDate.getDate()).padStart(2, '0')
  ].join('-');
}

export default function Withdrawal() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [montos, setMontos] = useState([25, 100, 500, 1500, 5000, 10000]);
  const [tarjetas, setTarjetas] = useState([]);
  const [tarjetaId, setTarjetaId] = useState('');
  const [tipoBilletera, setTipoBilletera] = useState('principal');
  const [monto, setMonto] = useState(0);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [pc, setPc] = useState(null);
  const [userLevel, setUserLevel] = useState(null);
  const [niveles, setNiveles] = useState([]);
  const [hasWithdrawalToday, setHasWithdrawalToday] = useState(false);
  const [hasSignature, setHasSignature] = useState(true); // Ya viene por defecto
  const [qrImage, setQrImage] = useState(null); // QR obligatorio para solicitar el retiro

  const isInternar = userLevel?.codigo === 'internar' || userLevel?.codigo === 'pasantia';
  const COMISION_RETIRO = isInternar ? 0 : (pc?.comision_retiro || 10) / 100; // 0% comision para pasantes, 10% para VIP
  const montoRecibir = monto > 0 ? (monto * (1 - COMISION_RETIRO)).toFixed(2) : '0.00';
  const comisionMonto = monto > 0 ? (monto * COMISION_RETIRO).toFixed(2) : '0.00';
  
  // Security Status State
  const [securityStatus, setSecurityStatus] = useState({
    tiene_password_fondo: true,
    tiene_cuenta_bancaria: true,
    loading: true
  });

  // Fund Password Setup State
  const [fundPass, setFundPass] = useState({ password_fondo: '', confirm_password_fondo: '' });
  
  // Bank Account Setup State
  const ALLOWED_BANKS = ['Yape', 'Yasta', 'Yo Lo Pago', 'Banco Union', 'Mercantil'];
const [bankAcc, setBankAcc] = useState({ banco: 'Yape', titular: '', numero_cuenta: '', tipo_cuenta: 'Caja de ahorro', ci_nit: '' });
const [showWithdrawModal, setShowWithdrawModal] = useState(false);

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
        const levelsList = await api.levels.list().catch(() => []);
        const foundLevel = user?.nivel_id && Array.isArray(levelsList)
          ? levelsList.find(l => String(l.id) === String(user.nivel_id))
          : null;

        if (isMounted) {
          setNiveles(levelsList || []);
          if (foundLevel) {
            setUserLevel(foundLevel);
            if (foundLevel.codigo === 'internar' || foundLevel.codigo === 'pasantia') {
              setMontos([10]);
              setMonto(10);
            } else {
              const withdrawalAmounts = await api.withdrawals.montos().catch(() => null);
              if (isMounted) {
                setMontos(withdrawalAmounts || [25, 100, 500, 1500, 5000, 10000]);
              }
            }
          }
        }

        const bankAccounts = await api.users.getBankAccounts().catch(() => []);
        if (isMounted) {
          setTarjetas(bankAccounts || []);
          if (bankAccounts && bankAccounts[0]) setTarjetaId(bankAccounts[0].id);
        }

        const withdrawalsRes = await api.withdrawals.list().catch(() => []);
        if (isMounted) {
          const boliviaNow = getBoliviaNow();
          const todayStr = boliviaNow.getFullYear() + '-' + String(boliviaNow.getMonth() + 1).padStart(2, '0') + '-' + String(boliviaNow.getDate()).padStart(2, '0');
          const isInternLevel = ['internar', 'pasantia'].includes(String(foundLevel?.codigo || userLevel?.codigo || '').toLowerCase());

          const alreadyDone = Array.isArray(withdrawalsRes) && withdrawalsRes.some((w) => {
            if (isInternLevel) {
              return true;
            }

            const retiroDateKey = getBoliviaDateKeyFromValue(w?.fecha_dia) || getBoliviaDateKeyFromValue(w?.created_at);
            return retiroDateKey === todayStr;
          });
            
          setHasWithdrawalToday(alreadyDone);
        }
      }
    };

    api.publicContent().then(data => {
      if (isMounted) setPc(data || null);
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

  // Auto-lock monto to 10 for internar/pasantia users
  useEffect(() => {
    if (isInternar && monto !== 10) {
      setMonto(10);
    }
  }, [isInternar, monto]);

  const getTodayWithdrawalStatus = async () => {
    const withdrawalsRes = await api.withdrawals.list().catch(() => []);
    const currentLevel = userLevel || niveles.find(l => String(l.id) === String(user?.nivel_id));
    const boliviaNow = getBoliviaNow();
    const todayStr = boliviaNow.getFullYear() + '-' + String(boliviaNow.getMonth() + 1).padStart(2, '0') + '-' + String(boliviaNow.getDate()).padStart(2, '0');
    const isInternLevel = ['internar', 'pasantia'].includes(String(currentLevel?.codigo || '').toLowerCase());

    const alreadyDone = Array.isArray(withdrawalsRes) && withdrawalsRes.some((w) => {
      if (isInternLevel) {
        return true;
      }

      const retiroDateKey = getBoliviaDateKeyFromValue(w?.fecha_dia) || getBoliviaDateKeyFromValue(w?.created_at);
      return retiroDateKey === todayStr;
    });

    return { alreadyDone, currentLevel };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password) { setError('Ingresa tu contraseña de fondos.'); return; }
    if (!qrImage) { setError('Debes subir tu codigo QR antes de solicitar el retiro.'); return; }
    
    setShowWithdrawModal(true);
  };

  const confirmWithdrawal = async () => {
    setShowWithdrawModal(false);
    setLoading(true);
    setError('');
    try {
      const { alreadyDone } = await getTodayWithdrawalStatus();
      if (alreadyDone) {
        setHasWithdrawalToday(true);
        setError(
          isInternar
            ? 'Ya realizaste tu único retiro como pasante. Para seguir retirando, asciende a nivel global.'
            : 'Ya realizaste una solicitud de retiro hoy. Puedes volver a retirar después del reinicio diario.'
        );
        return;
      }

      const idempotencyKey = `withdraw_${user.id}_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      const requestData = {
        monto: monto,
        tipo_billetera: tipoBilletera,
        password_fondo: password,
        tarjeta_id: tarjetaId,
        comprobante_url: qrImage,
        idempotency_key: idempotencyKey
      };

      await api.withdrawals.create(requestData);
      setHasWithdrawalToday(true);
      navigate('/ganancias');
    } catch (err) {
      if (err.status === 409) {
        setHasWithdrawalToday(true);
      }
      setError(err.message || 'Error al solicitar retiro');
    } finally {
      setLoading(false);
    }
  };

  if (securityStatus.loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-bcb-dark flex items-center justify-center">
          <LoaderIcon className="text-bcb-primary animate-spin" size={40} />
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

  // --- VALIDACIÓN DE DÍAS: Lunes a Sábado ---
  const boliviaNow = getBoliviaNow();
  const today = boliviaNow.getDay(); // 0=Dom, 1=Lun, 2=Mar... 6=Sab
  
  // Regla General: Lunes a Viernes (1-5) para todos los niveles
  const globalAllowedDays = [1, 2, 3, 4, 5];

  // La lógica de niveles específicos se anula para seguir la regla general de Lunes a Viernes
  const isAllowedDay = globalAllowedDays.includes(today);
  const canWithdrawToday = isAllowedDay;

  const DAY_NAMES = { 0: 'Domingo', 1: 'Lunes', 2: 'Martes', 3: 'Miércoles', 4: 'Jueves', 5: 'Viernes', 6: 'Sábado' };
  const globalAllowedNames = globalAllowedDays.map(d => DAY_NAMES[d]).join(', ');

  return (
    <Layout>
      <div className="min-h-screen bg-bcb-dark">
        <Header 
          title="Retiro de Fondos" 
          rightAction={
            <Link to="/ganancias" className="text-bcb-primary text-[9px] font-black uppercase tracking-widest bg-bcb-primary/10 px-4 py-2 rounded-xl border border-bcb-primary/20">
              Historial
            </Link>
          } 
        />
        
        {/* Background Decor */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-gradient-to-b from-bcb-primary/5 to-transparent blur-[120px]" />
          <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-bcb-accent/5 rounded-full blur-[100px]" />
        </div>

        <main className="px-4 sm:px-6 py-6 sm:py-8 space-y-8 sm:space-y-10 pb-32 animate-fade">
          {/* Balance Card - Ultra Legibilidad */}
          <Card variant="premium" className="relative overflow-hidden group bg-gradient-to-br from-indigo-900 via-indigo-800 to-indigo-900 p-6 sm:p-8 border-none shadow-2xl shadow-indigo-200">
            <div className="absolute top-0 right-0 p-6 sm:p-8 opacity-10 group-hover:scale-110 transition-transform">
              <WalletIcon size={60} className="text-white sm:w-[100px] sm:h-[100px]" />
            </div>
            <div className="relative z-10 space-y-1 sm:space-y-2">
              <p className="text-[10px] font-black text-white/90 uppercase tracking-[0.2em] sm:tracking-[0.3em] drop-shadow-sm">Capital Disponible</p>
              <div className="flex items-baseline gap-2 sm:gap-3 overflow-hidden">
                <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tighter truncate drop-shadow-lg">
                  {(tipoBilletera === 'principal' ? saldoPrincipal : saldoComisiones).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </h2>
                <span className="text-[10px] sm:text-xs font-black text-white uppercase tracking-widest shrink-0">Bs</span>
              </div>
            </div>
          </Card>

          <AnimatePresence>
            {error && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <Card className="p-4 sm:p-5 bg-bcb-error/10 border-bcb-error/20 flex items-start sm:items-center gap-3 sm:gap-4 shadow-xl">
                  <AlertCircleIcon size={18} className="text-bcb-error shrink-0 mt-0.5 sm:mt-0" />
                  <p className="text-[9px] sm:text-[10px] text-bcb-error font-black uppercase tracking-[0.15em] sm:tracking-[0.2em] leading-relaxed">{error}</p>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* FLUJO OBLIGATORIO */}
          {!securityStatus.tiene_password_fondo ? (
            /* PASO 1: CONTRASEÑA DE FONDOS */
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <Card variant="flat" className="p-6 bg-indigo-50 border-2 border-indigo-100 rounded-[2rem]">
                <div className="flex items-center gap-4 mb-3">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-900 border border-indigo-200">
                    <ShieldCheckIcon size={24} strokeWidth={3} />
                  </div>
                  <div>
                    <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-widest leading-none mb-1">Paso 1: Seguridad</h3>
                    <p className="text-[10px] text-indigo-900 font-black uppercase tracking-tight">Configura tu contraseña de fondos</p>
                  </div>
                </div>
                <p className="text-[11px] text-slate-700 font-black leading-relaxed">
                  Para proteger tus retiros, debes configurar una contraseña especial (diferente a la de login).
                </p>
              </Card>

              <form onSubmit={handleFundPasswordSubmit} className="space-y-6">
                <Card variant="outline" className="p-6 space-y-5 bg-white/[0.02] border-white/5 rounded-[2.5rem]">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-bcb-muted uppercase tracking-[0.2em] ml-2">Nueva Contraseña de Fondos</label>
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
                    <label className="text-[9px] font-black text-bcb-muted uppercase tracking-[0.2em] ml-2">Confirmar Contraseña</label>
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
              <Card variant="flat" className="p-6 bg-emerald-50 border-2 border-emerald-100 rounded-[2rem]">
                <div className="flex items-center gap-4 mb-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-900 border border-emerald-200">
                    <BuildingIcon size={24} strokeWidth={3} />
                  </div>
                  <div>
                    <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-widest leading-none mb-1">Paso 2: Cuenta Bancaria</h3>
                    <p className="text-[10px] text-emerald-900 font-black uppercase tracking-tight">Vincula tu cuenta de retiro</p>
                  </div>
                </div>
                <p className="text-[11px] text-slate-700 font-black leading-relaxed">
                  Registra los datos de tu cuenta bancaria o billetera digital para recibir tus fondos.
                </p>
              </Card>

              <form onSubmit={handleBankAccountSubmit} className="space-y-6">
                <Card variant="outline" className="p-6 space-y-5 bg-white/[0.02] border-white/5 rounded-[2.5rem]">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-bcb-muted uppercase tracking-[0.2em] ml-2">Banco o Plataforma</label>
                    <select 
                      value={bankAcc.banco}
                      onChange={(e) => setBankAcc({ ...bankAcc, banco: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-2xl h-14 px-6 text-sm font-black text-slate-900 outline-none focus:border-bcb-primary/30 transition-all appearance-none cursor-pointer"
                    >
                      {ALLOWED_BANKS.map((bank) => (
                        <option key={bank} value={bank} className="bg-white text-slate-900">{bank}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-bcb-muted uppercase tracking-[0.2em] ml-2">Nombre del Titular</label>
                    <Input
                      value={bankAcc.titular}
                      onChange={(e) => setBankAcc({ ...bankAcc, titular: e.target.value })}
                      placeholder="Nombre completo"
                      required
                    />
                  </div>

                  {/* Account Number / Phone for QR */}
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-bcb-muted uppercase tracking-[0.2em] ml-2">Nro de Cuenta o Teléfono (QR)</label>
                    <Input 
                      placeholder="Nro de cuenta o celular" 
                      value={bankAcc.numero_cuenta} 
                      onChange={(e) => setBankAcc({ ...bankAcc, numero_cuenta: e.target.value })} 
                      className="bg-[#161926] border-white/5 rounded-2xl h-14"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-bcb-muted uppercase tracking-[0.2em] ml-2">Tipo de Cuenta</label>
                      <Input
                        value={bankAcc.tipo_cuenta}
                        onChange={(e) => setBankAcc({ ...bankAcc, tipo_cuenta: e.target.value })}
                        placeholder="Caja de ahorro..."
                      />
                    </div>
                    {/* CI Field */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-2">CI del Titular</label>
                      <Input 
                        placeholder="Ej: 70001234" 
                        value={bankAcc.ci_nit} 
                        onChange={(e) => setBankAcc({ ...bankAcc, ci_nit: e.target.value })} 
                        className="bg-white border-slate-300 rounded-2xl h-14 font-black"
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
                    <div className="space-y-1">
                      <p className="text-[9px] sm:text-[10px] font-black text-amber-500 uppercase tracking-widest leading-relaxed">
                        {isInternar 
                          ? "Ya realizaste tu único retiro como pasante. Para seguir retirando, asciende a nivel global."
                          : "Solo puedes realizar 1 retiro por día."
                        }
                      </p>
                    </div>
                  </Card>
                )}

              {/* Imagen al final y completa */}
              <div className="w-full rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl bg-white/5">
                <img src="/imag/retiros.webp" alt="Información de Retiros" className="w-full h-auto object-contain" />
              </div>

              {/* Formulario de Retiro */}
              {!isAllowedDay && userLevel && (
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                  <Card variant="flat" className="p-5 sm:p-6 border-amber-500/20 bg-amber-500/10 flex flex-col gap-5">
                    <div className="flex items-center gap-2 sm:gap-3 text-amber-500">
                      <ClockIcon size={18} />
                      <h3 className="text-[10px] sm:text-xs font-black uppercase tracking-widest">Días no permitidos</h3>
                    </div>
                    
                    <div className="bg-white rounded-2xl p-4 border-2 border-amber-200 shadow-sm space-y-3">
                      <div className="flex justify-between items-center px-1">
                        <span className="text-[9px] font-black text-amber-700 uppercase tracking-widest">Cronograma Semanal</span>
                        <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Bolivia Time</span>
                      </div>
                      <div className="grid grid-cols-7 gap-1.5">
                        {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((day, i) => {
                          const isAllowed = globalAllowedDays.includes(i);
                          const isToday = today === i;
                          return (
                            <div key={i} className="flex flex-col items-center gap-1.5">
                              <span className="text-[9px] font-black text-slate-600">{day}</span>
                              <div className={cn(
                                "w-full aspect-square rounded-lg flex items-center justify-center text-[10px] font-black transition-all border-2",
                                isAllowed 
                                  ? "bg-indigo-900 text-white border-indigo-900 shadow-md shadow-indigo-100" 
                                  : "bg-slate-50 text-slate-400 border-slate-100",
                                isToday && !isAllowed && "border-amber-500 bg-amber-50 text-amber-700"
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



              <form onSubmit={handleSubmit} className="space-y-8 sm:space-y-10">
                {/* Origen de Fondos */}
                <section className="space-y-5 sm:space-y-6">
                  <div className="flex items-center gap-2 sm:gap-3 px-1">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-bcb-primary/10 flex items-center justify-center text-bcb-primary border border-bcb-primary/20 shadow-lg">
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
                            active ? "border-bcb-primary/40 bg-bcb-primary/10 scale-[1.01] sm:scale-[1.02] shadow-xl sm:shadow-2xl" : "border-black/5 bg-white shadow-sm hover:bg-black/5"
                          )}
                          onClick={() => setTipoBilletera(b.id)}
                        >
                          <div className="flex items-center gap-4 sm:gap-5 min-w-0">
                            <div className={cn(
                              "w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-inner shrink-0",
                              active ? "bg-white/10 text-white" : "bg-bcb-primary/5 text-bcb-primary"
                            )}>
                              <Icon size={20} className="sm:w-[24px] sm:h-[24px]" />
                            </div>
                            <div className="space-y-0.5 sm:space-y-1 min-w-0">
                              <p className={cn("text-[8px] sm:text-[9px] font-black uppercase tracking-widest truncate", active ? "text-white/60" : "text-bcb-muted")}>{b.label}</p>
                              <p className="text-xl sm:text-2xl font-black text-gray-900 tracking-tighter truncate">{b.val.toLocaleString()} <span className="text-[9px] text-gray-400 uppercase">Bs</span></p>
                            </div>
                          </div>
                          <div className={cn(
                            "w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 flex items-center justify-center transition-all shrink-0", 
                            active ? "border-white bg-white text-bcb-primary" : "border-black/10"
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
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-bcb-accent/10 flex items-center justify-center text-bcb-accent border border-bcb-accent/20 shadow-lg">
                        <BanknoteIcon size={14} className="sm:w-[16px] sm:h-[16px]" />
                      </div>
                      <h2 className="text-[10px] sm:text-[11px] font-black text-gray-900 uppercase tracking-[0.2em] sm:tracking-[0.3em]">2. Monto a Retirar</h2>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    {isInternar ? (
                      /* Para pasantes: monto fijo de 10 Bs, no editable */
                      <div className="relative group">
                        <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 font-black text-lg">Bs</div>
                        <input
                          type="text"
                          value="10"
                          disabled
                          className="w-full h-16 pl-14 pr-6 rounded-2xl border-2 border-slate-200 bg-slate-50 text-lg font-black text-slate-700 outline-none cursor-not-allowed shadow-sm"
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2">
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-full">
                            Monto Fijo
                          </span>
                        </div>
                      </div>
                    ) : (
                      /* Para otros usuarios: monto editable */
                      <>
                        <div className="relative group">
                          <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 font-black text-lg">Bs</div>
                          <input
                            type="number"
                            value={monto || ''}
                            onChange={(e) => setMonto(Number(e.target.value))}
                            placeholder="Ingresa la cantidad"
                            className="w-full h-16 pl-14 pr-6 rounded-2xl border-2 border-slate-100 bg-white text-lg font-black text-black outline-none focus:border-bcb-primary/30 transition-all shadow-sm"
                          />
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
                                  ? "bg-bcb-primary border-bcb-primary text-white shadow-lg sm:shadow-[0_15px_30px_rgba(220,38,38,0.2)] scale-[1.05]" 
                                  : "bg-white border-black/5 text-bcb-muted hover:bg-black/5 shadow-sm"
                              )}
                            >
                              {m}
                            </button>
                          ))}
                        </div>
                      </>
                    )}

                    {/* Resumen de Comisión */}
                    <AnimatePresence>
                      {monto > 0 && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-2"
                        >
                          <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest">
                            <span className="text-slate-400">Comisión de Retiro ({pc?.comision_retiro || 10}%)</span>
                            <span className="text-red-500">-{comisionMonto} Bs</span>
                          </div>
                          <div className="flex justify-between items-center text-[11px] font-black uppercase tracking-widest pt-2 border-t border-slate-200">
                            <span className="text-slate-900">Monto Neto a Recibir</span>
                            <span className="text-bcb-primary text-lg tracking-tighter">{montoRecibir} Bs</span>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
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
                            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", active ? "bg-white/10 text-black" : "bg-blue-500/10 text-black")}>
                              <BuildingIcon size={20} />
                            </div>
                            <div>
                              <p className={cn("text-[9px] font-black uppercase tracking-widest", active ? "text-black/60" : "text-black")}>{t.banco}</p>
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

                {/* Subir QR (Obligatorio) */}
                <section className="space-y-5 sm:space-y-6">
                  <div className="flex items-center gap-2 sm:gap-3 px-1">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500 border border-purple-500/20 shadow-lg">
                      <QrCodeIcon size={14} className="sm:w-[16px] sm:h-[16px]" />
                    </div>
                    <h2 className="text-[10px] sm:text-[11px] font-black text-gray-900 uppercase tracking-[0.2em] sm:tracking-[0.3em]">4. Comprobante QR (Obligatorio)</h2>
                  </div>
                  
                  <Card className="p-4 sm:p-6 border-black/5 bg-white shadow-sm">
                    <div className="space-y-4">
                      <p className="text-[9px] sm:text-[10px] text-slate-600 font-black uppercase tracking-widest">
                        Debes subir el QR antes de confirmar tu solicitud de retiro.
                      </p>
                      {qrImage ? (
                        <div className="relative">
                          <img 
                            src={qrImage} 
                            alt="Comprobante QR" 
                            className="w-full h-48 object-contain rounded-2xl border-2 border-purple-100" 
                          />
                          <button
                            type="button"
                            onClick={() => setQrImage(null)}
                            className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                          >
                            <XIcon size={16} />
                          </button>
                        </div>
                      ) : (
                        <label className="flex flex-col items-center justify-center gap-3 py-8 border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:border-purple-300 hover:bg-purple-50 transition-all">
                          <UploadIcon size={32} className="text-slate-400" />
                          <div className="text-center space-y-1">
                            <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest">
                              Haz clic para subir tu QR
                            </p>
                            <p className="text-[8px] text-slate-500 uppercase tracking-widest">
                              PNG, JPG o WEBP (obligatorio)
                            </p>
                          </div>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                if (!file.type.startsWith('image/')) {
                                  setError('El comprobante QR debe ser una imagen valida.');
                                  return;
                                }
                                const reader = new FileReader();
                                reader.onload = (e) => {
                                  setError('');
                                  setQrImage(e.target.result);
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                        </label>
                      )}
                    </div>
                  </Card>
                </section>

                {/* Mensaje para pasantes */}
                {isInternar && (
                  <section className="space-y-5 sm:space-y-6">
                    <Card className="p-4 sm:p-6 bg-yellow-50 border-2 border-yellow-200 shadow-sm">
                      <div className="flex items-start gap-3">
                        <InfoIcon size={24} className="text-yellow-600 shrink-0" />
                        <div>
                          <h3 className="text-[10px] sm:text-[11px] font-black text-yellow-900 uppercase tracking-widest mb-2">Atención Pasante</h3>
                          <p className="text-[9px] sm:text-[10px] text-yellow-800 leading-relaxed">
                            Comunicate con tu reclutador para gestionar tu retiro.
                          </p>
                        </div>
                      </div>
                    </Card>
                  </section>
                )}

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
                        hasSignature ? "bg-bcb-primary border-bcb-primary text-white" : "border-black/10 bg-white"
                      )}>
                        {hasSignature && <CheckIcon size={12} strokeWidth={4} />}
                      </div>
                      <div className="space-y-1">
                        <p className="text-[9px] sm:text-[10px] font-black text-gray-900 uppercase tracking-widest group-hover:text-bcb-primary transition-colors">Autorización de Transacción</p>
                        <p className="text-[7px] sm:text-[8px] text-bcb-muted font-medium uppercase tracking-widest leading-relaxed">Confirmo que los datos son correctos y autorizo el procesamiento.</p>
                      </div>
                    </div>
                  </div>
                </section>

                <div className="pt-2 sm:pt-4">
                  <Button 
                    type="submit" 
                    loading={loading} 
                    disabled={!canWithdrawToday || fueraHorario || hasWithdrawalToday || !password || !hasSignature || !qrImage}
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
        
        {/* Withdrawal Verification Modal */}
        <AnimatePresence>
          {showWithdrawModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-white rounded-[2.5rem] p-6 sm:p-8 max-w-md w-full shadow-2xl"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600">
                      <QrCodeIcon size={24} />
                    </div>
                    <h3 className="text-lg font-black text-gray-900 uppercase tracking-wide">VERIFICACIÓN</h3>
                  </div>
                  <button onClick={() => setShowWithdrawModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                    <XIcon size={20} className="text-gray-500" />
                  </button>
                </div>
                
                <div className="space-y-4 mb-6">
                  <p className="text-sm font-bold text-gray-700 leading-relaxed">
                    El código QR debe coincidir con el número de cuenta bancaria registrado. Si no coincide, el retiro será rechazado y no podrás retirar durante el día.
                  </p>
                  <p className="text-xs font-black text-amber-600 uppercase tracking-widest bg-amber-50 p-3 rounded-xl">
                    Asegúrate de que todos los datos sean correctos antes de continuar.
                  </p>
                </div>
                
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowWithdrawModal(false)}
                    className="flex-1 h-14 rounded-2xl text-sm font-black tracking-[0.2em]"
                  >
                    CANCELAR
                  </Button>
                  <Button
                    onClick={confirmWithdrawal}
                    loading={loading}
                    className="flex-1 h-14 rounded-2xl bg-amber-600 hover:bg-amber-700 text-sm font-black tracking-[0.2em]"
                  >
                    CONTINUAR
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Layout>
  );
}
