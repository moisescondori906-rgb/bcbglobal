import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext.jsx';
import { ShieldCheck, Smartphone, Lock, ArrowRight, ChevronRight } from 'lucide-react';
import { Button } from '../components/ui/Button.jsx';
import { Input } from '../components/ui/Input.jsx';
import { Card } from '../components/ui/Card.jsx';
import { APP_DISPLAY_NAME } from '../theme/branding.js';

export default function Login() {
  const [numero, setNumero] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, user: currentUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (currentUser) {
      navigate(currentUser.rol === 'admin' ? '/admin' : '/', { replace: true });
    }
  }, [currentUser, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setError('');
    setLoading(true);
    
    try {
      const telefono = '+591' + numero.replace(/\D/g, '').trim();
      const user = await login(telefono, password);
      navigate(user?.rol === 'admin' ? '/admin' : '/');
    } catch (err) {
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 animate-fade">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-10">
          <motion.div 
            initial={{ y: -20 }}
            animate={{ y: 0 }}
            className="inline-block mb-6 relative"
          >
            <div className="absolute inset-0 bg-sav-primary/20 blur-2xl rounded-full" />
            <img src="/imag/logo.png" alt="Logo" className="w-20 h-20 relative z-10" />
          </motion.div>
          <h1 className="text-3xl font-black tracking-tight text-gray-900 mb-2">
            Bienvenido
          </h1>
          <div className="flex items-center justify-center gap-2 opacity-60">
            <ShieldCheck size={12} className="text-sav-primary" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600">Portal Seguro BCB</p>
          </div>
        </div>

        <Card variant="premium" className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <AnimatePresence mode='wait'>
              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-4 rounded-2xl bg-sav-error/10 border border-sav-error/20 text-sav-error text-[10px] font-bold uppercase tracking-widest text-center"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex gap-2">
              <div className="flex-none w-16 h-14 rounded-2xl bg-sav-surface border border-sav-border text-sav-primary font-bold text-sm flex items-center justify-center">
                +591
              </div>
              <Input
                type="tel"
                inputMode="numeric"
                value={numero}
                onChange={(e) => setNumero(e.target.value.replace(/\D/g, '').slice(0, 8))}
                placeholder="Teléfono"
                icon={Smartphone}
                required
              />
            </div>

            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Contraseña"
              icon={Lock}
              showPasswordToggle
              required
            />

            <div className="flex items-center justify-between px-1">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input 
                  type="checkbox" 
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="hidden" 
                />
                <div className={`w-5 h-5 rounded-md border transition-all flex items-center justify-center ${rememberMe ? 'bg-sav-primary border-sav-primary' : 'bg-sav-surface border-sav-border'}`}>
                  {rememberMe && <div className="w-2 h-2 bg-white rounded-sm" />}
                </div>
                <span className="text-[10px] font-bold text-sav-muted uppercase tracking-widest group-hover:text-white transition-colors">Recordarme</span>
              </label>
              <button type="button" className="text-[10px] font-bold text-sav-primary uppercase tracking-widest hover:underline">¿Olvidaste?</button>
            </div>

            <Button 
              type="submit" 
              loading={loading}
              className="mt-4"
              icon={ArrowRight}
            >
              Iniciar Sesión
            </Button>
          </form>
        </Card>

        <div className="mt-10 text-center space-y-4">
          <p className="text-[10px] font-bold text-sav-muted uppercase tracking-[0.2em]">
            ¿No tienes una cuenta?
          </p>
          <Link
            to="/register"
            className="flex items-center justify-center gap-2 text-gray-900 font-bold uppercase tracking-widest text-xs hover:text-sav-primary transition-all group"
          >
            Crear cuenta VIP
            <ChevronRight size={16} className="transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
