import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Layout from '../components/Layout';
import Header from '../components/Header';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { 
  User, 
  Phone, 
  CreditCard, 
  Lock, 
  ChevronRight, 
  Sparkles, 
  ShieldCheck, 
  Zap, 
  LogOut,
  Building2 as BuildingIcon 
} from 'lucide-react';
import { Card } from '../components/ui/Card.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { cn } from '../lib/utils/cn';
import { displayLevelCode } from '../lib/displayLevel.js';

export default function Security() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [tarjetas, setTarjetas] = useState([]);
  const [componentLoading, setComponentLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = async () => {
    setError(null);
    try {
      const data = await api.users.tarjetas();
      setTarjetas(data);
    } catch (err) {
      console.error("Error loading tarjetas:", err);
      setError("No se pudieron cargar las cuentas bancarias. Intenta de nuevo más tarde.");
      setTarjetas([]);
    } finally {
      setComponentLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      load();
    } else {
      setComponentLoading(false);
    }
  }, [user]);

  if (!user || componentLoading) {
    return (
      <Layout>
        <Header title="Seguridad Premium" />
        <main className="p-5 space-y-6 pb-32 animate-fade flex items-center justify-center min-h-[70vh]">
          <div className="w-16 h-16 border-4 border-bcb-surface border-t-bcb-primary rounded-full animate-spin" />
        </main>
      </Layout>
    );
  }

  const handleLogout = async () => {
    if (window.confirm('¿Estás seguro de que deseas cerrar sesión?')) {
      await logout();
      navigate('/login');
    }
  };

  return (
    <Layout>
      <div className="bg-bcb-bg min-h-screen pb-32">
        <Header title="Seguridad Premium" />
        
        <main className="px-6 py-8 space-y-10 max-w-lg mx-auto animate-in">
          {error && (
            <div className="bg-rose-50 border border-rose-100 text-rose-600 px-5 py-4 rounded-3xl text-[11px] font-black uppercase tracking-widest text-center shadow-sm">
              {error}
            </div>
          )}
          
          <section>
            <Card variant="premium" className="p-8 flex flex-col items-center text-center">
              <div className="relative mb-6">
                <div className="w-20 h-20 rounded-[2.5rem] bg-bcb-surface border-4 border-white flex items-center justify-center shadow-m3-2">
                  <User size={40} className="text-bcb-muted" strokeWidth={1.5} />
                </div>
                <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-bcb-primary rounded-2xl border-4 border-white flex items-center justify-center shadow-accent-glow">
                  <ShieldCheck size={16} className="text-white" strokeWidth={3} />
                </div>
              </div>
              
              <div className="space-y-1.5">
                <h2 className="text-2xl font-black text-black tracking-tight uppercase leading-none">{user?.nombre_usuario}</h2>
                <div className="flex items-center justify-center gap-2">
                  <Badge variant="info" className="py-0.5 px-2 text-[8px]">
                    {displayLevelCode(user?.nivel_codigo || 'internar')}
                  </Badge>
                  <span className="text-[10px] font-extrabold text-bcb-muted uppercase tracking-widest">ID: {user?.id?.slice(0, 8).toUpperCase()}</span>
                </div>
              </div>
            </Card>
          </section>

          <section className="space-y-5">
            <div className="flex items-center gap-2 px-1">
              <div className="w-1.5 h-4 bg-bcb-primary rounded-full" />
              <h3 className="text-[13px] font-extrabold text-black uppercase tracking-[0.15em]">Identidad Digital</h3>
            </div>
            
            <div className="grid gap-4">
              <Card className="p-5 flex items-center justify-between bg-white border-black/[0.03] shadow-m3-1">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-500 border border-indigo-100 shadow-sm">
                    <Phone size={22} strokeWidth={2.5} />
                  </div>
                  <div>
                    <p className="text-[9px] font-extrabold text-bcb-muted uppercase tracking-widest mb-0.5">Línea Móvil</p>
                    <p className="text-[15px] font-black text-black tracking-tight">{user?.telefono || '—'}</p>
                  </div>
                </div>
                <Badge variant="success" className="text-[8px] py-0.5">VERIFICADO</Badge>
              </Card>

              <Card className="p-5 flex items-center justify-between bg-white border-black/[0.03] shadow-m3-1">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-bcb-primary/10 flex items-center justify-center text-bcb-primary border border-bcb-primary/20 shadow-sm">
                    <User size={22} strokeWidth={2.5} />
                  </div>
                  <div>
                    <p className="text-[9px] font-extrabold text-bcb-muted uppercase tracking-widest mb-0.5">Nombre Institucional</p>
                    <p className="text-[15px] font-black text-black tracking-tight truncate max-w-[150px]">{user?.nombre_real || 'No configurado'}</p>
                  </div>
                </div>
                <ChevronRight size={20} className="text-bcb-muted" strokeWidth={2.5} />
              </Card>
            </div>
          </section>

          <section className="space-y-5">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-4 bg-emerald-400 rounded-full" />
                <h3 className="text-[13px] font-extrabold text-black uppercase tracking-[0.15em]">Cuentas de Retiro</h3>
              </div>
              <Link to="/vincular-tarjeta" className="text-[11px] font-black text-bcb-primary uppercase tracking-widest flex items-center gap-1 hover:translate-x-1 transition-all">
                + Vincular <ChevronRight size={14} strokeWidth={3} />
              </Link>
            </div>

            {tarjetas.length === 0 ? (
              <Card className="p-10 text-center border-dashed border-black/[0.1] bg-bcb-surface/50 flex flex-col items-center gap-4 group hover:border-bcb-primary/30 transition-all">
                <CreditCard size={40} className="text-bcb-muted group-hover:text-bcb-primary transition-colors" strokeWidth={1.5} />
                <p className="text-[10px] font-extrabold text-bcb-muted uppercase tracking-widest leading-relaxed">Sin cuentas institucionales vinculadas.</p>
              </Card>
            ) : (
              <div className="space-y-4">
                {tarjetas.map((t) => (
                  <Card key={t.id} className="p-5 flex items-center justify-between bg-white border-black/[0.03] shadow-m3-1">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-500 border border-emerald-100 shadow-sm">
                        <BuildingIcon size={24} strokeWidth={2} />
                      </div>
                      <div>
                        <p className="text-[10px] font-extrabold text-emerald-600 uppercase tracking-widest mb-0.5">
                          {t.tipo === 'qr' ? 'BANCO / QR' : (t.nombre_banco || 'BANCO')}
                        </p>
                        <p className="text-[15px] font-black text-black tracking-[0.1em]">****{t.numero_masked}</p>
                      </div>
                    </div>
                    <Badge variant="success" className="text-[8px] py-0.5">ACTIVA</Badge>
                  </Card>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-5">
            <div className="flex items-center gap-2 px-1">
              <div className="w-1.5 h-4 bg-amber-400 rounded-full" />
              <h3 className="text-[13px] font-extrabold text-black uppercase tracking-[0.15em]">Gestión de Seguridad</h3>
            </div>

            <div className="bg-white rounded-[2.5rem] border border-black/[0.03] overflow-hidden shadow-m3-2 divide-y divide-black/[0.03]">
              <Link to="/cambiar-contrasena" className="flex items-center justify-between p-6 hover:bg-bcb-surface transition-all group">
                <div className="flex items-center gap-5">
                  <div className="w-11 h-11 rounded-xl bg-bcb-primary/10 flex items-center justify-center text-bcb-primary border border-bcb-primary/20 shadow-sm group-hover:rotate-6 transition-all">
                    <Lock size={20} strokeWidth={2.5} />
                  </div>
                  <div>
                    <p className="text-[12px] font-black text-black uppercase tracking-widest mb-0.5">Acceso al Sistema</p>
                    <p className="text-[9px] font-bold text-bcb-muted uppercase tracking-widest">Actualizar contraseña de login</p>
                  </div>
                </div>
                <ChevronRight size={20} className="text-bcb-muted group-hover:text-bcb-primary transition-colors" strokeWidth={2.5} />
              </Link>

              <Link to="/cambiar-contrasena-fondo" className="flex items-center justify-between p-6 hover:bg-bcb-surface transition-all group">
                <div className="flex items-center gap-5">
                  <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500 border border-amber-100 shadow-sm group-hover:rotate-6 transition-all">
                    <Zap size={20} strokeWidth={2.5} />
                  </div>
                  <div>
                    <p className="text-[12px] font-black text-black uppercase tracking-widest mb-0.5">PIN de Transacciones</p>
                    <p className="text-[9px] font-bold text-bcb-muted uppercase tracking-widest">
                      {user?.tiene_password_fondo ? 'Actualizar código PIN de retiro' : 'Configurar por primera vez'}
                    </p>
                  </div>
                </div>
                <ChevronRight size={20} className="text-bcb-muted group-hover:text-bcb-primary transition-colors" strokeWidth={2.5} />
              </Link>
            </div>
          </section>

          <button
            onClick={handleLogout}
            className="w-full h-16 rounded-[2rem] bg-rose-50 border border-rose-100 text-rose-500 flex items-center justify-center gap-3 hover:bg-rose-100 transition-all shadow-sm active:scale-[0.98] group"
          >
            <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" strokeWidth={2.5} />
            <span className="text-[13px] font-black uppercase tracking-[0.2em]">Finalizar Conexión</span>
          </button>
        </main>
      </div>
    </Layout>
  );
}


