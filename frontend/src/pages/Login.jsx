import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext.jsx';
import { ShieldCheck, Lock, ArrowRight, ChevronRight } from 'lucide-react';
import { Button } from '../components/ui/Button.jsx';
import { Input } from '../components/ui/Input.jsx';
import { PhoneInputWithCountry } from '../components/ui/PhoneInputWithCountry.jsx';
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
      const telefono = numero.trim();
      const user = await login(telefono, password);
      navigate(user?.rol === 'admin' ? '/admin' : '/');
    } catch (err) {
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-sav-dark relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-sav-primary/10 blur-[100px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-sav-accent/5 blur-[100px] rounded-full" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm relative z-10"
      >
        <div className="text-center mb-10">
          <motion.div 
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className="inline-block mb-6 p-4 bg-white rounded-[2rem] shadow-2xl shadow-sav-primary/10 border border-slate-200"
          >
            <img src="/imag/logo.png" alt="Logo" className="w-20 h-20" />
          </motion.div>
          <h1 className="text-4xl font-black tracking-tighter text-slate-900 mb-2 uppercase">
            Bienvenido
          </h1>
          <div className="flex items-center justify-center gap-2">
            <ShieldCheck size={14} className="text-sav-primary" />
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-sav-muted">Portal Seguro BCB</p>
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
              <PhoneInputWithCountry
                value={numero}
                onChange={setNumero}
                placeholder="Teléfono (ej: 70000001)"
                className="flex-1"
                error={error}
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
                <div className={`w-5 h-5 rounded-md border transition-all flex items-center justify-center ${rememberMe ? 'bg-sav-primary border-sav-primary' : 'bg-slate-100 border-slate-200'}`}>
                  {rememberMe && <div className="w-2 h-2 bg-white rounded-sm" />}
                </div>
                <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest group-hover:text-slate-900 transition-colors">Recordarme</span>
              </label>
              <button type="button" className="text-[10px] font-black text-sav-primary uppercase tracking-widest hover:underline">¿Olvidaste?</button>
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
