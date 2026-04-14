import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Layout from '../components/Layout';
import Header from '../components/Header';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Lock, ShieldCheck, Zap, KeyRound, Save, AlertCircle } from 'lucide-react';
import { Card } from '../components/ui/Card.jsx';
import { Button } from '../components/ui/Button.jsx';

export default function CambiarContrasenaFondo() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const tieneFondo = !!user?.tiene_password_fondo;
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [nueva2, setNueva2] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (nueva !== nueva2) {
      setError('Las contraseñas nuevas no coinciden');
      return;
    }
    if (tieneFondo && !actual) {
      setError('Debes escribir la contraseña actual del fondo');
      return;
    }
    setLoading(true);
    try {
      const body = { password_nueva: nueva };
      if (tieneFondo) body.password_actual = actual;
      await api.users.changeFundPassword(body);
      await refreshUser?.();
      alert('Contraseña del fondo actualizada');
      navigate('/seguridad');
    } catch (err) {
      setError(err.message || 'Error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <Header title={tieneFondo ? "Clave de Transacción" : "Seguridad de Fondos"} />
      <main className="p-5 space-y-6 animate-fade">
        
        {/* Banner de Advertencia/Información */}
        <Card variant="flat" className="p-6 bg-amber-500/5 border-amber-500/10 rounded-[2rem]">
          <div className="flex items-center gap-4 mb-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500">
              <Zap size={24} />
            </div>
            <div>
              <h3 className="text-xs font-black text-white uppercase tracking-widest leading-none mb-1">Firma Digital</h3>
              <p className="text-[10px] text-sav-muted font-bold uppercase tracking-tight">Autorización de Retiros</p>
            </div>
          </div>
          <p className="text-[11px] text-sav-muted font-medium leading-relaxed">
            {tieneFondo
              ? 'Por seguridad, ingresa tu clave de fondo actual antes de realizar el cambio. Esta clave es obligatoria para procesar cualquier retiro.'
              : 'Configura una clave de 6 dígitos para autorizar tus movimientos financieros. Es diferente a tu clave de acceso.'}
          </p>
        </Card>

        <form onSubmit={submit} className="space-y-6">
          {error && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-4 rounded-2xl bg-sav-error/10 border border-sav-error/20 text-sav-error text-[10px] font-black uppercase tracking-widest text-center"
            >
              {error}
            </motion.div>
          )}
          
          <Card variant="outline" className="p-6 space-y-5 bg-white/[0.02] border-white/5 rounded-[2.5rem]">
            {tieneFondo && (
              <div className="space-y-2">
                <label className="text-[9px] font-black text-sav-muted uppercase tracking-[0.2em] ml-2">Clave Actual del Fondo</label>
                <div className="relative">
                  <input
                    type="password"
                    value={actual}
                    onChange={(e) => setActual(e.target.value)}
                    className="w-full bg-sav-surface/50 px-6 py-4 rounded-2xl border border-sav-border focus:border-amber-500/50 focus:outline-none transition-all text-sm font-black text-white placeholder:text-sav-muted/30"
                    required
                    placeholder="Contraseña actual"
                    autoComplete="current-password"
                  />
                  <KeyRound className="absolute right-5 top-1/2 -translate-y-1/2 text-sav-muted/30" size={18} />
                </div>
              </div>
            )}
            
            <div className="space-y-2">
              <label className="text-[9px] font-black text-sav-muted uppercase tracking-[0.2em] ml-2">Nueva Clave de Fondo</label>
              <div className="relative">
                <input
                  type="password"
                  value={nueva}
                  onChange={(e) => setNueva(e.target.value)}
                  className="w-full bg-sav-surface/50 px-6 py-4 rounded-2xl border border-sav-border focus:border-amber-500/50 focus:outline-none transition-all text-sm font-black text-white placeholder:text-sav-muted/30"
                  required
                  minLength={6}
                  placeholder="6 caracteres numéricos"
                  autoComplete="new-password"
                />
                <ShieldCheck className="absolute right-5 top-1/2 -translate-y-1/2 text-sav-muted/30" size={18} />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[9px] font-black text-sav-muted uppercase tracking-[0.2em] ml-2">Repetir Nueva Clave</label>
              <div className="relative">
                <input
                  type="password"
                  value={nueva2}
                  onChange={(e) => setNueva2(e.target.value)}
                  className="w-full bg-sav-surface/50 px-6 py-4 rounded-2xl border border-sav-border focus:border-amber-500/50 focus:outline-none transition-all text-sm font-black text-white placeholder:text-sav-muted/30"
                  required
                  minLength={6}
                  placeholder="Confirmar clave"
                />
                <ShieldCheck className="absolute right-5 top-1/2 -translate-y-1/2 text-sav-muted/30" size={18} />
              </div>
            </div>
          </Card>

          <Button 
            type="submit" 
            disabled={loading} 
            icon={Save}
            className="py-5 rounded-[1.8rem] bg-amber-600 hover:bg-amber-700 shadow-2xl shadow-amber-600/20"
          >
            {loading ? 'Validando...' : (tieneFondo ? 'Sincronizar Cambios' : 'Activar Firma Digital')}
          </Button>
        </form>

        <div className="flex flex-col items-center gap-2 pt-4 opacity-30">
          <Zap size={24} className="text-sav-muted" />
          <p className="text-[8px] font-black text-sav-muted uppercase tracking-[0.4em]">Protección de Activos BCB</p>
        </div>
      </main>
    </Layout>
  );
}
