import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext.jsx';
import { Smartphone, User, Lock, Key, ArrowRight, ChevronLeft } from 'lucide-react';
import { Button } from '../components/ui/Button.jsx';
import { Input } from '../components/ui/Input.jsx';
import { PhoneInputWithCountry } from '../components/ui/PhoneInputWithCountry.jsx';
import { Card } from '../components/ui/Card.jsx';

export default function Register() {
  const [searchParams] = useSearchParams();
  const refCode = searchParams.get('ref');

  const [data, setData] = useState({
    telefono: '',
    nombre_usuario: '',
    password: '',
    repeat_password: '',
    codigo_invitacion: refCode || '',
  });

  useEffect(() => {
    if (refCode) {
      setData(prev => ({ ...prev, codigo_invitacion: refCode }));
    }
  }, [refCode]);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (k, v) => setData((d) => ({ ...d, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setError('');
    if (data.password !== data.repeat_password) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setLoading(true);
    try {
      const inviteCode = String(data.codigo_invitacion || '').trim().toUpperCase();
      await register({
        telefono: data.telefono.trim(),
        nombre_usuario: data.nombre_usuario,
        password: data.password,
        codigo_invitacion: inviteCode,
      });
      navigate('/');
    } catch (err) {
      setError(err.message || 'Error al registrarse');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Image */}
      <img 
        src="/imag/fondologin.webp" 
        alt="Fondo" 
        className="fixed inset-0 w-full h-full object-cover pointer-events-none z-[-1]"
        style={{ 
          filter: 'none', 
          imageRendering: 'auto',
          transform: 'translateZ(0)'
        }}
      />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm relative z-10"
      >
        <div className="text-center mb-10">
          <motion.div 
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className="inline-block mb-6 p-4 bg-white/40 backdrop-blur-md shadow-2xl rounded-[3rem] border border-slate-200/30"
          >
            <img src="/imag/logo-carrusel.webp" alt="Logo" className="w-20 h-20" />
          </motion.div>
          <h1 className="text-3xl font-black tracking-tight text-black mb-2 uppercase">
            Únete a BCB
          </h1>
          <p className="text-[10px] font-bold tracking-[0.4em] text-black/40 uppercase">Crea tu cuenta VIP</p>
        </div>

        <Card variant="premium" className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode='wait'>
              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-4 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-[10px] font-bold uppercase tracking-widest text-center"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <PhoneInputWithCountry
              value={data.telefono}
              onChange={(telefono) => handleChange('telefono', telefono)}
              error={error}
              placeholder="Número de celular"
            />

            <Input
              value={data.nombre_usuario}
              onChange={(e) => handleChange('nombre_usuario', e.target.value)}
              placeholder="Nombre de Usuario"
              icon={User}
              required
            />

            <Input
              type="password"
              value={data.password}
              onChange={(e) => handleChange('password', e.target.value)}
              placeholder="Contraseña"
              icon={Lock}
              showPasswordToggle
              required
            />

            <Input
              type="password"
              value={data.repeat_password}
              onChange={(e) => handleChange('repeat_password', e.target.value)}
              placeholder="Confirmar Contraseña"
              icon={Lock}
              required
            />

            <Input
              value={data.codigo_invitacion}
              onChange={(e) => handleChange('codigo_invitacion', e.target.value)}
              placeholder="Código Invitación"
              icon={Key}
              readOnly={!!refCode}
              required
            />

            <Button 
              type="submit" 
              loading={loading}
              className="mt-4"
              icon={ArrowRight}
            >
              Registrarse
            </Button>
          </form>
        </Card>

        <div className="mt-8 text-center">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-black/40 font-black uppercase tracking-widest text-[10px] hover:text-black transition-colors group"
          >
            <ChevronLeft size={16} className="transition-transform group-hover:-translate-x-1" />
            Ya tengo una cuenta
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
