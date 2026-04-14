import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Layout from '../components/Layout';
import Header from '../components/Header';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { User, Phone, CreditCard, Lock, ChevronRight, Sparkles, ShieldCheck, BadgeCheck, Zap } from 'lucide-react';
import { Card } from '../components/ui/Card.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { cn } from '../lib/utils/cn';
import { displayLevelCode } from '../lib/displayLevel.js';

export default function Security() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [tarjetas, setTarjetas] = useState([]);

  const load = () => {
    api.users.tarjetas().then(setTarjetas).catch(() => setTarjetas([]));
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <Layout>
      <Header title="Seguridad & Perfil" />
      <main className="p-5 space-y-6 pb-32 animate-fade">
        
        {/* User Info Card */}
        <Card variant="premium" className="p-8 relative overflow-hidden group border-sav-primary/20">
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:rotate-12 transition-transform">
            <ShieldCheck size={80} />
          </div>
          
          <div className="relative z-10 flex flex-col items-center text-center space-y-4">
            <div className="relative">
              <div className="w-20 h-20 rounded-[2rem] bg-sav-surface border-2 border-sav-primary/30 flex items-center justify-center shadow-2xl">
                <User size={40} className="text-sav-primary" strokeWidth={2.5} />
              </div>
              <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-sav-success rounded-xl border-4 border-sav-dark flex items-center justify-center shadow-lg">
                <BadgeCheck size={16} className="text-white" strokeWidth={3} />
              </div>
            </div>
            
            <div className="space-y-1">
              <h2 className="text-2xl font-black text-white uppercase tracking-tight">{user?.nombre_usuario}</h2>
              <div className="flex items-center justify-center gap-2">
                <Badge variant="info" className="px-2 py-0.5 border-sav-primary/20">
                  {displayLevelCode(user?.nivel_codigo || 'internar')}
                </Badge>
                <span className="text-[10px] font-black text-sav-muted uppercase tracking-widest">ID: {user?.id?.slice(0, 8)}</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Info Grid */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 px-1 mb-2">
            <Sparkles size={14} className="text-sav-primary" />
            <h3 className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Datos de la Cuenta</h3>
          </div>
          
          <Card variant="flat" className="p-5 flex items-center justify-between group border-white/5 bg-white/[0.02]">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20">
                <Phone size={20} />
              </div>
              <div>
                <p className="text-[8px] font-black text-sav-muted uppercase tracking-widest">Teléfono</p>
                <p className="text-sm font-black text-white uppercase tracking-tight">{user?.telefono || '—'}</p>
              </div>
            </div>
          </Card>

          <Card variant="flat" className="p-5 flex items-center justify-between group border-white/5 bg-white/[0.02]">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-400 border border-orange-500/20">
                <User size={20} />
              </div>
              <div>
                <p className="text-[8px] font-black text-sav-muted uppercase tracking-widest">Nombre Real</p>
                <p className="text-sm font-black text-white uppercase tracking-tight">{user?.nombre_real || 'No configurado'}</p>
              </div>
            </div>
          </Card>
        </section>

        {/* Banking Accounts */}
        <section className="space-y-3">
          <div className="flex items-center justify-between px-1 mb-2">
            <div className="flex items-center gap-2">
              <CreditCard size={14} className="text-sav-primary" />
              <h3 className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Retiros</h3>
            </div>
            <Link to="/vincular-tarjeta" className="text-[9px] font-black text-sav-primary uppercase tracking-[0.2em] border-b border-sav-primary/30 pb-0.5">
              + Vincular Nueva
            </Link>
          </div>

          {tarjetas.length === 0 ? (
            <Card variant="outline" className="p-8 text-center border-dashed border-sav-border opacity-60">
              <CreditCard size={32} className="mx-auto mb-3 text-sav-muted" />
              <p className="text-[10px] font-bold text-sav-muted uppercase tracking-widest">Sin cuentas vinculadas</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {tarjetas.map((t) => (
                <Card key={t.id} variant="flat" className="p-5 flex items-center justify-between border-emerald-500/10 bg-emerald-500/[0.02]">
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
                      <CreditCard size={20} />
                    </div>
                    <div>
                      <p className="text-[8px] font-black text-sav-muted uppercase tracking-widest">
                        {t.tipo === 'yape' ? 'Yape / QR' : (t.nombre_banco || 'Cuenta Bancaria')}
                      </p>
                      <p className="text-sm font-black text-white uppercase tracking-[0.1em]">****{t.numero_masked}</p>
                    </div>
                  </div>
                  <Badge variant="success" className="text-[8px] py-0.5">ACTIVA</Badge>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Passwords Section */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 px-1 mb-2">
            <Lock size={14} className="text-sav-primary" />
            <h3 className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Gestión de Seguridad</h3>
          </div>

          <Link to="/cambiar-contrasena">
            <Card variant="flat" className="p-5 flex items-center justify-between active:scale-[0.98] transition-all hover:border-sav-primary/20 border-white/5 bg-white/[0.02] mb-3">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-sav-primary/10 flex items-center justify-center text-sav-primary border border-sav-primary/20">
                  <Lock size={20} />
                </div>
                <div>
                  <p className="text-[11px] font-black text-white uppercase tracking-widest">Contraseña Login</p>
                  <p className="text-[8px] font-bold text-sav-muted uppercase tracking-widest">Actualizar acceso</p>
                </div>
              </div>
              <ChevronRight size={18} className="text-sav-muted" />
            </Card>
          </Link>

          <Link to="/cambiar-contrasena-fondo">
            <Card variant="flat" className="p-5 flex items-center justify-between active:scale-[0.98] transition-all hover:border-sav-primary/20 border-white/5 bg-white/[0.02]">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400 border border-amber-500/20">
                  <Zap size={20} />
                </div>
                <div>
                  <p className="text-[11px] font-black text-white uppercase tracking-widest">Contraseña de Fondo</p>
                  <p className="text-[8px] font-bold text-sav-muted uppercase tracking-widest">
                    {user?.tiene_password_fondo ? 'Cambiar seguridad' : 'Configurar por primera vez'}
                  </p>
                </div>
              </div>
              <ChevronRight size={18} className="text-sav-muted" />
            </Card>
          </Link>
        </section>

        {/* Logout Button */}
        <div className="pt-4">
          <button
            onClick={logout}
            className="w-full py-5 rounded-[1.5rem] bg-sav-error/10 text-sav-error border border-sav-error/20 font-black uppercase tracking-[0.3em] text-[10px] active:scale-[0.98] transition-all shadow-lg shadow-sav-error/5"
          >
            Finalizar Sesión
          </button>
        </div>

      </main>
    </Layout>
  );
}
