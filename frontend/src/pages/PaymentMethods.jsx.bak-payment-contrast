import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Layout from '../components/Layout';
import Header from '../components/Header';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { isScheduleOpen } from '../lib/schedule';
import { 
  Upload, CheckCircle2, Info, AlertCircle, 
  ShieldCheck, ArrowRight, Loader2, QrCode, 
  CreditCard, Smartphone, Banknote, Clock
} from 'lucide-react';
import imageCompression from 'browser-image-compression';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { cn } from '../lib/utils/cn';

export default function PaymentMethods() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const selectedLevel = location.state?.level;

  const [metodos, setMetodos] = useState([]);
  const [filteredMetodos, setFilteredMetodos] = useState([]);
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [comprobante, setComprobante] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);

  useEffect(() => {
    if (!selectedLevel) {
      navigate('/recharge');
      return;
    }

    const loadMetodos = async () => {
      try {
        const list = await api.recharges.metodos();
        setMetodos(list || []);
        
        // Filtrar métodos por horario
        const available = Array.isArray(list) ? list.filter(m => {
          const schedule = {
            dias_semana: m.dias_semana,
            hora_inicio: m.hora_inicio,
            hora_fin: m.hora_fin,
            enabled: true
          };
          return isScheduleOpen(schedule).ok;
        }) : [];
        setFilteredMetodos(available);
      } catch (err) {
        console.error('Error cargando métodos:', err);
      }
    };
    loadMetodos();
  }, [selectedLevel, navigate]);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
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
    if (!comprobante || !selectedMethod) return setError('Selecciona un método y sube el comprobante');

    setLoading(true);
    setError('');
    try {
      await api.recharges.create({
        monto: parseFloat(selectedLevel.deposito || selectedLevel.costo),
        comprobante_url: comprobante,
        metodo_qr_id: selectedMethod.id,
        modo: 'Compra VIP'
      });
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
        <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center bg-sav-dark">
          <div className="w-24 h-24 rounded-[2.5rem] bg-emerald-500/10 flex items-center justify-center text-emerald-500 mb-8 border border-emerald-500/20 shadow-2xl">
            <CheckCircle2 size={48} />
          </div>
          <h2 className="text-3xl font-black text-white uppercase tracking-tighter mb-4">¡Pago Recibido!</h2>
          <p className="text-sav-muted font-bold text-sm leading-relaxed mb-10 max-w-xs">
            Tu solicitud para <span className="text-white">{selectedLevel?.nombre}</span> está siendo verificada.
          </p>
          <Button onClick={() => navigate('/')} className="w-full max-w-xs h-14 uppercase tracking-widest">
            VOLVER AL INICIO
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-sav-dark pb-32">
        <Header title="Método de Pago" />
        
        <main className="p-6 space-y-8 animate-fade">
          {/* Resumen del Pedido */}
          <section>
            <Card className="p-6 bg-white/5 border-white/5 relative overflow-hidden">
              <div className="flex justify-between items-center relative z-10">
                <div>
                  <p className="text-[9px] font-black text-sav-muted uppercase tracking-widest mb-1">Membresía Seleccionada</p>
                  <h3 className="text-xl font-black text-white uppercase">{selectedLevel?.nombre}</h3>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-black text-sav-muted uppercase tracking-widest mb-1">Total a Pagar</p>
                  <p className="text-2xl font-black text-sav-primary tracking-tighter">
                    {Number(selectedLevel?.deposito || selectedLevel?.costo).toLocaleString('es-BO')} <span className="text-xs">BOB</span>
                  </p>
                </div>
              </div>
            </Card>
          </section>

          {/* Paso 1: Seleccionar Método */}
          <section className="space-y-4">
            <div className="flex items-center gap-3 px-1">
              <div className="w-8 h-8 rounded-xl bg-sav-primary/10 flex items-center justify-center text-sav-primary border border-sav-primary/20">
                <CreditCard size={16} />
              </div>
              <h3 className="text-[11px] font-black text-white uppercase tracking-[0.3em]">1. Selecciona Método</h3>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {filteredMetodos.length > 0 ? (
                filteredMetodos.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setSelectedMethod(m)}
                    className={cn(
                      "w-full p-5 rounded-3xl border flex items-center gap-4 transition-all",
                      selectedMethod?.id === m.id 
                        ? "bg-sav-primary border-sav-primary shadow-lg" 
                        : "bg-white/5 border-white/5 hover:bg-white/10"
                    )}
                  >
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center",
                      selectedMethod?.id === m.id ? "bg-white/20 text-white" : "bg-sav-dark text-sav-primary"
                    )}>
                      {m.tipo === 'qr' ? <QrCode size={24} /> : m.tipo === 'transferencia' ? <Smartphone size={24} /> : <Banknote size={24} />}
                    </div>
                    <div className="text-left">
                      <p className={cn("text-sm font-black uppercase", selectedMethod?.id === m.id ? "text-white" : "text-white/90")}>
                        {m.nombre_banco || 'Pago QR'}
                      </p>
                      <p className={cn("text-[9px] font-bold uppercase tracking-widest", selectedMethod?.id === m.id ? "text-white/60" : "text-sav-muted")}>
                        {m.nombre_titular}
                      </p>
                    </div>
                  </button>
                ))
              ) : (
                <Card className="p-8 text-center border-sav-error/20 bg-sav-error/5">
                  <Clock className="mx-auto text-sav-error mb-4 opacity-50" size={32} />
                  <h4 className="text-xs font-black text-white uppercase tracking-widest mb-2">No hay métodos disponibles</h4>
                  <p className="text-[9px] text-sav-muted font-bold uppercase tracking-wide">
                    En este momento no hay nodos de pago habilitados. Por favor, intenta más tarde dentro del horario de atención.
                  </p>
                </Card>
              )}
            </div>
          </section>

          {/* Paso 2: Escanear y Subir */}
          <AnimatePresence>
            {selectedMethod && (
              <motion.section 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="flex items-center gap-3 px-1">
                  <div className="w-8 h-8 rounded-xl bg-sav-accent/10 flex items-center justify-center text-sav-accent border border-sav-accent/20">
                    <QrCode size={16} />
                  </div>
                  <h3 className="text-[11px] font-black text-white uppercase tracking-[0.3em]">2. Escanea y Sube Voucher</h3>
                </div>

                <Card className="p-8 space-y-8 bg-[#161926] border-white/5 rounded-[2.5rem]">
                  {/* QR Display */}
                  <div className="flex flex-col items-center gap-6">
                    <div className="p-4 bg-white rounded-[2rem] shadow-2xl">
                      <img 
                        src={selectedMethod.imagen_base64 || selectedMethod.imagen_qr_url} 
                        alt="QR Pago" 
                        className="w-48 h-48 object-contain"
                      />
                    </div>
                    <Badge variant="info" className="uppercase tracking-widest text-[9px] px-4 py-1.5">Titular: {selectedMethod.nombre_titular}</Badge>
                  </div>

                  {/* Upload */}
                  <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
                  <button
                    onClick={() => fileRef.current?.click()}
                    disabled={isOptimizing}
                    className={cn(
                      "w-full h-40 rounded-[2.5rem] border-2 border-dashed transition-all flex flex-col items-center justify-center gap-4 relative overflow-hidden",
                      comprobante ? "border-sav-primary/50 bg-sav-primary/5" : "border-white/10 bg-sav-dark/50"
                    )}
                  >
                    {isOptimizing ? (
                      <Loader2 className="animate-spin text-sav-primary" size={32} />
                    ) : comprobante ? (
                      <>
                        <img src={comprobante} alt="Preview" className="absolute inset-0 w-full h-full object-cover opacity-20" />
                        <CheckCircle2 size={32} className="text-sav-primary relative z-10" />
                        <span className="text-[9px] font-black uppercase text-white relative z-10">Imagen Cargada</span>
                      </>
                    ) : (
                      <>
                        <Upload size={32} className="text-sav-muted" />
                        <span className="text-[10px] font-black uppercase text-sav-muted">Subir Comprobante</span>
                      </>
                    )}
                  </button>

                  {error && (
                    <div className="flex items-center gap-2 p-4 rounded-2xl bg-sav-error/10 text-sav-error text-[10px] font-black uppercase">
                      <AlertCircle size={16} /> {error}
                    </div>
                  )}

                  <Button 
                    onClick={handleSubmit} 
                    loading={loading}
                    disabled={!comprobante}
                    className="w-full h-16 rounded-[2rem] shadow-xl"
                  >
                    FINALIZAR COMPRA
                  </Button>
                </Card>
              </motion.section>
            )}
          </AnimatePresence>
        </main>
      </div>
    </Layout>
  );
}
