import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Layout from '../components/Layout';
import Header from '../components/Header';
import { api } from '../lib/api';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { 
  ShieldCheck as ShieldCheckIcon, 
  User as UserIcon, 
  Building2 as BuildingIcon, 
  Hash as HashIcon, 
  AlertCircle as AlertCircleIcon, 
  Info as InfoIcon,
  X as XIcon
} from 'lucide-react';
import { cn } from '../lib/utils/cn';

const ALLOWED_BANKS = ['Yape', 'Yasta', 'Yo Lo Pago', 'Banco Union', 'Mercantil'];

export default function VincularTarjeta() {
  const navigate = useNavigate();
  const [nombreBanco, setNombreBanco] = useState('');
  const [tipo, setTipo] = useState('Yape');
  const [numero, setNumero] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(true);

  const submit = async (e) => {
    e.preventDefault();
    if (numero.length < 4) return setError('El número debe tener al menos 4 dígitos');
    
    setError('');
    setLoading(true);
    try {
      await api.users.addTarjeta({
        nombre_banco: nombreBanco,
        tipo,
        numero_cuenta: numero,
      });
      navigate('/seguridad');
    } catch (err) {
      setError(err.message || 'Error al guardar la cuenta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <Header title="Vincular Cuenta" />
      
      {/* Overlay Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[2.5rem] p-6 sm:p-8 max-w-md w-full shadow-2xl"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-qr-code">
                    <rect width="5" height="5" x="3" y="3" rx="1"></rect>
                    <rect width="5" height="5" x="16" y="3" rx="1"></rect>
                    <rect width="5" height="5" x="3" y="16" rx="1"></rect>
                    <path d="M21 16h-3a2 2 0 0 0-2 2v3"></path>
                    <path d="M21 21v.01"></path>
                    <path d="M12 7v3a2 2 0 0 1-2 2H7"></path>
                    <path d="M3 12h.01"></path>
                    <path d="M12 3h.01"></path>
                    <path d="M12 16v.01"></path>
                    <path d="M16 12h1"></path>
                    <path d="M21 12v.01"></path>
                    <path d="M12 21v-1"></path>
                  </svg>
                </div>
                <h3 className="text-lg font-black text-gray-900 uppercase tracking-wide">VERIFICACIÓN</h3>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
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
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 h-14 rounded-2xl text-sm font-black tracking-[0.2em] border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                CANCELAR
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 h-14 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-black tracking-[0.2em] transition-colors"
              >
                CONTINUAR
              </button>
            </div>
          </motion.div>
        </div>
      )}
      
      <div className="p-6 space-y-8 animate-fade">
        <div className="flex flex-col items-center text-center space-y-4 mb-2">
          <div className="w-16 h-16 rounded-3xl bg-bcb-primary/10 flex items-center justify-center text-bcb-primary border border-bcb-primary/20 shadow-xl">
            <ShieldCheckIcon size={32} />
          </div>
          <div>
            <h2 className="text-xl font-black text-white uppercase tracking-tighter">Seguridad de Cobro</h2>
            <p className="text-[10px] text-bcb-muted font-bold uppercase tracking-widest mt-1">Configura tu método de retiro preferido</p>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-6">
          <Card className="p-6 space-y-6 bg-white/[0.02] border-white/5 shadow-2xl">
            {error && (
              <div className="p-4 rounded-2xl bg-bcb-error/10 border border-bcb-error/20 flex items-center gap-3 animate-shake">
                <AlertCircleIcon size={18} className="text-bcb-error shrink-0" />
                <p className="text-[10px] text-bcb-error font-black uppercase tracking-widest leading-relaxed">{error}</p>
              </div>
            )}

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">
                <UserIcon size={12} /> Propietario de la Cuenta
              </label>
              <input
                value={nombreBanco}
                onChange={(e) => setNombreBanco(e.target.value)}
                className="w-full bg-white/5 border border-white/5 rounded-2xl px-5 py-4 text-white font-bold text-sm focus:border-bcb-primary/30 focus:bg-white/10 transition-all outline-none placeholder:text-white/10"
                required
                placeholder="Nombre completo"
              />
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">
                <BuildingIcon size={12} /> Banco o Plataforma
              </label>
              <select 
                value={tipo} 
                onChange={(e) => setTipo(e.target.value)} 
                className="w-full bg-white/5 border border-white/5 rounded-2xl px-5 py-4 text-white font-bold text-sm focus:border-bcb-primary/30 focus:bg-white/10 transition-all outline-none appearance-none"
              >
                {ALLOWED_BANKS.map((bank) => (
                  <option key={bank} value={bank} className="bg-bcb-dark">{bank}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">
                <HashIcon size={12} /> Número de Cuenta / Celular
              </label>
              <input
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
                className="w-full bg-white/5 border border-white/5 rounded-2xl px-5 py-4 text-white font-bold text-sm focus:border-bcb-primary/30 focus:bg-white/10 transition-all outline-none placeholder:text-white/10"
                required
                placeholder="Mínimo 4 dígitos"
              />
              <div className="flex items-start gap-2 mt-2 px-1">
                <InfoIcon size={12} className="text-bcb-muted mt-0.5" />
                <p className="text-[9px] text-bcb-muted font-bold uppercase tracking-widest leading-relaxed">
                  Por seguridad, solo guardamos los últimos 4 dígitos para visualización.
                </p>
              </div>
            </div>
          </Card>

          <Button
            type="submit"
            loading={loading}
            className="w-full h-16 rounded-3xl text-xs font-black tracking-[0.2em] shadow-2xl shadow-bcb-primary/20 active:scale-95 transition-all"
          >
            GUARDAR CONFIGURACIÓN
          </Button>
        </form>

        <Card className="p-6 bg-bcb-primary/5 border-bcb-primary/10 rounded-[2rem]">
          <p className="text-[10px] text-bcb-muted font-bold leading-relaxed uppercase tracking-widest text-center">
            Asegúrate de que los datos sean correctos. BCB Global no se hace responsable por transferencias a cuentas configuradas erróneamente.
          </p>
        </Card>
      </div>
    </Layout>
  );
}

