import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Layout from '../components/Layout';
import Header from '../components/Header';
import { api } from '../lib/api';
import { Lock, ShieldCheck, AlertCircle, Save, KeyRound } from 'lucide-react';
import { Card } from '../components/ui/Card.jsx';
import { Button } from '../components/ui/Button.jsx';

export default function CambiarContrasena() {
  const navigate = useNavigate();
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
    setLoading(true);
    try {
      await api.users.changePassword({ password_actual: actual, password_nueva: nueva });
      alert('Contraseña de inicio de sesión actualizada');
      navigate('/seguridad');
    } catch (err) {
      setError(err.message || 'Error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <Header title="Seguridad de Acceso" />
      <main className="p-5 space-y-6 animate-fade">
        
        {/* Banner Informativo */}
        <Card variant="flat" className="p-6 bg-sav-primary/5 border-sav-primary/10 rounded-[2rem]">
          <div className="flex items-center gap-4 mb-3">
            <div className="w-12 h-12 rounded-2xl bg-sav-primary/10 flex items-center justify-center text-sav-primary">
              <KeyRound size={24} />
            </div>
            <div>
              <h3 className="text-xs font-black text-white uppercase tracking-widest leading-none mb-1">Cambio de Clave</h3>
              <p className="text-[10px] text-sav-muted font-bold uppercase tracking-tight">Acceso a la plataforma</p>
            </div>
          </div>
          <p className="text-[11px] text-sav-muted font-medium leading-relaxed">
            Para proteger tu cuenta, es obligatorio ingresar tu contraseña actual antes de establecer una nueva. Usa una combinación segura.
          </p>
        </Card>

        <form onSubmit={submit} className="space-y-6">
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-2xl bg-sav-error/10 border border-sav-error/20 text-sav-error text-[10px] font-black uppercase tracking-widest text-center"
            >
              {error}
            </motion.div>
          )}

          <Card variant="outline" className="p-6 space-y-5 bg-white/[0.02] border-white/5 rounded-[2.5rem]">
            <div className="space-y-2">
              <label className="text-[9px] font-black text-sav-muted uppercase tracking-[0.2em] ml-2">Contraseña Actual</label>
              <div className="relative">
                <input
                  type="password"
                  value={actual}
                  onChange={(e) => setActual(e.target.value)}
                  className="w-full bg-sav-surface/50 px-6 py-4 rounded-2xl border border-sav-border focus:border-sav-primary/50 focus:outline-none transition-all text-sm font-black text-white placeholder:text-sav-muted/30"
                  required
                  placeholder="Tu clave actual"
                  autoComplete="current-password"
                />
                <Lock className="absolute right-5 top-1/2 -translate-y-1/2 text-sav-muted/30" size={18} />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[9px] font-black text-sav-muted uppercase tracking-[0.2em] ml-2">Nueva Contraseña</label>
              <div className="relative">
                <input
                  type="password"
                  value={nueva}
                  onChange={(e) => setNueva(e.target.value)}
                  className="w-full bg-sav-surface/50 px-6 py-4 rounded-2xl border border-sav-border focus:border-sav-primary/50 focus:outline-none transition-all text-sm font-black text-white placeholder:text-sav-muted/30"
                  required
                  minLength={6}
                  placeholder="Mínimo 6 caracteres"
                  autoComplete="new-password"
                />
                <ShieldCheck className="absolute right-5 top-1/2 -translate-y-1/2 text-sav-muted/30" size={18} />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[9px] font-black text-sav-muted uppercase tracking-[0.2em] ml-2">Confirmar Nueva</label>
              <div className="relative">
                <input
                  type="password"
                  value={nueva2}
                  onChange={(e) => setNueva2(e.target.value)}
                  className="w-full bg-sav-surface/50 px-6 py-4 rounded-2xl border border-sav-border focus:border-sav-primary/50 focus:outline-none transition-all text-sm font-black text-white placeholder:text-sav-muted/30"
                  required
                  minLength={6}
                  placeholder="Repite la clave"
                />
                <ShieldCheck className="absolute right-5 top-1/2 -translate-y-1/2 text-sav-muted/30" size={18} />
              </div>
            </div>
          </Card>

          <Button 
            type="submit" 
            disabled={loading}
            icon={Save}
            className="py-5 rounded-[1.8rem] shadow-2xl shadow-sav-primary/20"
          >
            {loading ? 'Sincronizando...' : 'Actualizar Acceso'}
          </Button>
        </form>

        <div className="flex flex-col items-center gap-2 pt-4 opacity-30">
          <ShieldCheck size={24} className="text-sav-muted" />
          <p className="text-[8px] font-black text-sav-muted uppercase tracking-[0.4em]">Protección BCB Global</p>
        </div>
      </main>
    </Layout>
  );
}
