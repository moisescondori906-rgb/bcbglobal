import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import Header from '../components/Header.jsx';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { 
  Users, UserPlus, TrendingUp, Info, 
  ShieldAlert, ChevronRight, Copy, Check,
  Target, Zap, Gem
} from 'lucide-react';

// UI Components
import { Card } from '../components/ui/Card.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { cn } from '../lib/utils/cn';

export default function Team() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchTeam = () => {
      if (!data) setLoading(true);
      api.users.teamReport()
        .then(res => {
          if (isMounted) setData(res);
        })
        .catch(err => {
          console.error('Error fetching team:', err);
          if (isMounted) setData({ resumen: {}, niveles: [] });
        })
        .finally(() => {
          if (isMounted) setLoading(false);
        });
    };

    fetchTeam();
    const interval = setInterval(fetchTeam, 30000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const handleCopy = () => {
    if (!user?.codigo_invitacion) return;
    navigator.clipboard.writeText(user.codigo_invitacion);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <Layout>
        <div className="p-10 flex flex-col items-center justify-center min-h-[70vh] space-y-6 bg-sav-dark">
          <div className="w-16 h-16 border-4 border-black/5 border-t-sav-primary rounded-full animate-spin" />
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-sav-muted animate-pulse">Sincronizando Equipo</p>
        </div>
      </Layout>
    );
  }

  // Si es internar, mostrar bloqueo
  if (user?.nivel_codigo === 'internar') {
    return (
      <Layout>
        <Header title="Informe del equipo" />
        <div className="p-6 flex flex-col items-center justify-center min-h-[70vh] text-center space-y-8 animate-fade bg-sav-dark">
          <Card className="w-full flex flex-col items-center p-10 space-y-6 bg-white border-black/5 shadow-2xl rounded-[3rem]">
            <div className="w-20 h-20 bg-sav-primary/10 text-sav-primary rounded-3xl flex items-center justify-center shadow-lg border border-sav-primary/20">
              <ShieldAlert size={40} />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black uppercase tracking-tight text-gray-900">Función Bloqueada</h2>
              <p className="text-[10px] font-bold text-sav-muted uppercase tracking-widest leading-relaxed">
                Como <span className="text-gray-900 font-black">Internar</span>, aún no puedes acceder al sistema de red de BCB Global.
              </p>
            </div>
            <div className="bg-black/5 p-5 rounded-2xl border border-black/5 text-left w-full">
              <p className="text-[9px] text-sav-primary font-black uppercase tracking-widest mb-2 flex items-center gap-2">
                <Info size={12} /> Requisito:
              </p>
              <p className="text-[10px] text-sav-muted leading-relaxed font-bold uppercase tracking-widest">
                Sube a nivel <span className="text-gray-900">GLOBAL 1</span> o superior para desbloquear comisiones por cada tarea de tu equipo.
              </p>
            </div>
            <Link to="/vip" className="w-full">
              <Button icon={Zap} className="shadow-xl shadow-sav-primary/20">Subir de Nivel Ahora</Button>
            </Link>
          </Card>
        </div>
      </Layout>
    );
  }

  const resumen = data?.resumen || {};
  const niveles = data?.niveles || [];

  return (
    <Layout>
      <Header title="Mi Equipo" />
      <main className="px-5 space-y-6 pb-10 pt-4 animate-fade">
        {/* Invitation Banner */}
        <Card className="p-8 relative overflow-hidden group bg-white border-black/5 shadow-xl shadow-black/5 rounded-[2.5rem]">
          <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform text-gray-900">
            <UserPlus size={80} />
          </div>
          
          <div className="relative z-10 space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-sav-primary/10 border border-sav-primary/20 flex items-center justify-center text-sav-primary shadow-lg">
                <Users size={24} strokeWidth={2.5} />
              </div>
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.3em] text-sav-muted">Crecimiento de Red</p>
                <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Gana Comisiones</h3>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-black/5 border border-black/5 rounded-2xl px-5 py-3.5 flex items-center justify-between shadow-inner">
                <div className="flex flex-col">
                  <span className="text-[8px] font-black text-sav-muted uppercase tracking-widest mb-0.5">Tu Código</span>
                  <span className="text-base font-black text-gray-900 uppercase tracking-[0.2em]">
                    {user?.codigo_invitacion || '---'}
                  </span>
                </div>
                <button 
                  onClick={handleCopy} 
                  className="p-2.5 hover:bg-black/5 rounded-xl transition-all active:scale-90"
                >
                  {copied ? <Check size={18} className="text-sav-success" strokeWidth={3} /> : <Copy size={18} className="text-sav-muted" />}
                </button>
              </div>
              <Link to="/invitar">
                <Button className="w-14 h-14 rounded-2xl shadow-lg shadow-sav-primary/20" icon={ChevronRight} />
              </Link>
            </div>
          </div>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="p-6 bg-white border-black/5 shadow-lg shadow-black/5 rounded-[2rem] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black text-sav-muted uppercase tracking-widest">Ganancia Total</span>
              <TrendingUp size={14} className="text-sav-primary" />
            </div>
            <p className="text-2xl font-black text-gray-900 tracking-tight">{(resumen.ingresos_totales || 0).toFixed(2)}</p>
          </Card>
          <Card className="p-6 bg-white border-black/5 shadow-lg shadow-black/5 rounded-[2rem] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black text-sav-muted uppercase tracking-widest">Miembros</span>
              <Users size={14} className="text-blue-500" />
            </div>
            <p className="text-2xl font-black text-gray-900 tracking-tight">{resumen.total_miembros || 0}</p>
          </Card>
        </div>

        {/* Breakdown by Levels */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 px-1 mb-2">
            <Target size={16} className="text-sav-primary" />
            <h2 className="text-[11px] font-black text-gray-900 uppercase tracking-[0.2em]">Estructura de Red</h2>
          </div>
          
          <div className="space-y-3">
            {Array.isArray(niveles) && niveles.map((n, i) => (
              <Card 
                key={n.nivel} 
                className="p-5 flex items-center gap-4 group hover:border-sav-primary/20 transition-all bg-white border-black/5 shadow-xl shadow-black/5 rounded-[2rem]"
                delay={i * 0.05}
              >
                <div className="w-12 h-12 rounded-2xl bg-sav-dark border border-black/5 flex items-center justify-center text-xs font-black text-gray-900 shadow-lg group-hover:bg-sav-primary/10 transition-colors">
                  {n.nivel}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-[11px] font-black text-gray-900 uppercase tracking-widest">Nivel {n.nivel}</h4>
                    <Badge variant="success" className="px-2 py-0.5">+{n.porcentaje}%</Badge>
                  </div>
                  <div className="flex justify-between text-[9px] font-bold uppercase tracking-widest">
                    <span className="text-sav-muted">Activos: <span className="text-gray-900">{n.total_miembros}</span></span>
                    <span className="text-sav-muted">Comisión: <span className="text-sav-success">{(n.monto_recarga || 0).toFixed(2)} BOB</span></span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* Info Card */}
        <Card className="p-6 border-black/5 bg-white shadow-xl shadow-black/5 rounded-[2rem] relative overflow-hidden">
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-xl bg-sav-primary/10 flex items-center justify-center text-sav-primary shrink-0">
              <Info size={20} />
            </div>
            <div className="space-y-2">
              <p className="text-[11px] font-black text-gray-900 uppercase tracking-widest">Sistema de Comisiones</p>
              <p className="text-[10px] text-sav-muted font-bold leading-relaxed uppercase tracking-widest">
                Cada tarea completada por tus invitados genera beneficios automáticos. <span className="text-gray-900 underline decoration-sav-primary underline-offset-4">¡Tu equipo es tu activo más valioso!</span>
              </p>
            </div>
          </div>
        </Card>
      </main>
    </Layout>
  );
}
