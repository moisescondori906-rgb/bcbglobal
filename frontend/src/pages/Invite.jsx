import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import Header from '../components/Header';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { CONFIG } from '../config';
import { Share2, Copy, Check, Users, Gift, Star, ShieldCheck, Zap, Lock, Info, TrendingUp, AlertCircle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { displayLevelCode } from '../lib/displayLevel.js';
import { Card } from '../components/ui/Card.jsx';
import { Button } from '../components/ui/Button.jsx';
import { cn } from '../lib/utils/cn';

const GlobalLoader = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-sav-dark space-y-6">
    <div className="relative">
      <div className="w-16 h-16 border-4 border-black/5 border-t-sav-primary rounded-full animate-spin"></div>
      <div className="absolute inset-0 bg-sav-primary/10 blur-xl rounded-full animate-pulse"></div>
    </div>
    <div className="text-center">
      <p className="text-gray-900 font-black uppercase tracking-[0.3em] text-[10px] animate-pulse">Cargando BCB Global</p>
      <p className="text-sav-muted text-[8px] uppercase tracking-widest mt-2">Institutional Grade Platform</p>
    </div>
  </div>
);

export default function Invite() {
  const { user } = useAuth();
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [punished, setPunished] = useState(false);
  const [loading, setLoading] = useState(true);
  const [referrals, setReferrals] = useState([]);
  const [referralsLoading, setReferralsLoading] = useState(true);

  useEffect(() => {
    const fetchReferrals = async () => {
      try {
        const res = await api.get('/users/my-referrals');
        setReferrals(res.items || []);
      } catch (err) {
        console.error('Error fetching referrals:', err);
      } finally {
        setReferralsLoading(false);
      }
    };
    fetchReferrals();
    setLoading(false);
  }, []);

  const inviteLink = `${CONFIG.WEB_URL}/register?ref=${user?.codigo_invitacion || ''}`;

  const handleCopyCode = async () => {
    if (!user?.codigo_invitacion) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(user.codigo_invitacion);
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
      } else {
        throw new Error('Clipboard API not available');
      }
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(inviteLink);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      } else {
        throw new Error('Clipboard API not available');
      }
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  if (loading) return <GlobalLoader />;

  if (punished) {
    return (
      <Layout>
        <Header title="Invitación Bloqueada" />
        <div className="p-8 text-center space-y-8 flex flex-col items-center justify-center min-h-[70vh] animate-fade">
          <div className="w-24 h-24 bg-sav-error/10 text-sav-error rounded-[2.5rem] flex items-center justify-center shadow-2xl border border-sav-error/20 animate-pulse">
            <AlertCircle size={48} strokeWidth={1.5} />
          </div>
          <div className="space-y-3">
            <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">Acceso Restringido</h2>
            <p className="text-sm text-sav-muted font-bold leading-relaxed max-w-xs mx-auto">
              Tu acceso a invitaciones ha sido <span className="text-sav-error uppercase">bloqueado temporalmente</span> como sanción por incumplimiento de tareas obligatorias.
            </p>
          </div>
          <Card className="p-6 bg-amber-500/5 border-amber-500/20 text-left w-full shadow-2xl">
            <div className="flex items-center gap-2 mb-3 text-amber-500">
              <Info size={16} />
              <p className="text-[10px] font-black uppercase tracking-[0.2em]">Nota Importante</p>
            </div>
            <p className="text-xs text-amber-500/80 leading-relaxed font-bold uppercase tracking-wider">
              Asegúrate de completar todas tus tareas y cuestionarios diariamente para restaurar tus privilegios de socio.
            </p>
          </Card>
          <Link to="/" className="w-full">
            <Button variant="secondary" className="w-full h-14 rounded-2xl text-[10px] font-black tracking-widest bg-white border-black/5 text-gray-900 shadow-sm">
              VOLVER AL PANEL
            </Button>
          </Link>
        </div>
      </Layout>
    );
  }

  const isPasante = user?.nivel_codigo === 'internar';

  return (
    <Layout>
      <Header title="Código de invitación" />
      
      <div className="px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8 pb-32 animate-fade">
        {/* Banner Principal Hero - Premium Light */}
        <Card className="relative overflow-hidden p-6 sm:p-10 text-center border-black/5 bg-white shadow-xl shadow-black/5 rounded-[2rem] sm:rounded-[3rem]">
          <div className="absolute top-0 right-0 w-32 h-32 bg-sav-primary/5 rounded-full -mr-16 -mt-16 blur-3xl opacity-50" />
          <div className="relative z-10 flex flex-col items-center space-y-4 sm:space-y-6">
            <div className="relative">
              <div className="absolute -inset-2 bg-sav-primary/10 blur-md rounded-full animate-pulse" />
              <div className="relative w-16 h-16 sm:w-20 sm:h-20 bg-white rounded-2xl sm:rounded-[2rem] flex items-center justify-center shadow-xl border border-black/5">
                <Users size={28} className="text-sav-primary sm:w-[32px] sm:h-[32px]" />
              </div>
            </div>
            <div className="space-y-1 sm:space-y-2">
              <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tighter text-gray-900 leading-none">¡Invita y Gana!</h2>
              <div className="h-1 w-10 sm:w-12 bg-sav-primary/20 rounded-full mx-auto" />
              <p className="text-[8px] sm:text-[10px] text-sav-muted font-black uppercase tracking-[0.3em] sm:tracking-[0.4em] mt-2">Construye tu equipo hoy</p>
            </div>
          </div>
        </Card>

        {/* Card de Información de Invitación - Light Style */}
        <Card className="p-6 sm:p-8 space-y-6 sm:space-y-8 bg-white border-black/5 shadow-xl shadow-black/5 rounded-[1.5rem] sm:rounded-[2.5rem]">
          <div className="space-y-6 sm:space-y-8">
            {/* Código de Invitación */}
            <div className="flex flex-col items-center space-y-3 sm:space-y-4">
              <span className="text-[8px] sm:text-[10px] font-black text-sav-muted uppercase tracking-[0.2em] sm:tracking-[0.3em]">Tu código exclusivo</span>
              <div className="flex items-center gap-3 sm:gap-4 w-full">
                <div className="flex-1 bg-slate-50 py-4 sm:py-5 rounded-xl sm:rounded-[1.5rem] border border-slate-100 text-center shadow-inner group hover:border-sav-primary/30 transition-all min-w-0">
                  <span className="text-2xl sm:text-4xl font-black text-gray-900 tracking-[0.2em] sm:tracking-[0.3em] truncate block px-2">
                    {user?.codigo_invitacion || '------'}
                  </span>
                </div>
                <button 
                  onClick={handleCopyCode}
                  className={cn(
                    "w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-[1.5rem] transition-all duration-300 flex items-center justify-center shadow-xl active:scale-90 shrink-0",
                    copiedCode ? "bg-emerald-500 text-white shadow-emerald-500/20" : "bg-sav-primary text-white shadow-sav-primary/20"
                  )}
                >
                  {copiedCode ? <Check size={24} className="sm:w-[28px] sm:h-[28px]" /> : <Copy size={24} className="sm:w-[28px] sm:h-[28px]" />}
                </button>
              </div>
            </div>

            <div className="h-px bg-gradient-to-r from-transparent via-black/5 to-transparent w-full" />

            {/* Enlace de Invitación */}
            <div className="flex flex-col items-center space-y-3 sm:space-y-4">
              <span className="text-[8px] sm:text-[10px] font-black text-sav-muted uppercase tracking-[0.2em] sm:tracking-[0.3em]">Enlace de acceso directo</span>
              <div className="flex items-center gap-2 sm:gap-3 w-full bg-slate-50 p-2 rounded-xl sm:rounded-2xl border border-slate-100 shadow-inner min-w-0">
                <div className="flex-1 truncate px-3 sm:px-4">
                  <span className="text-[8px] sm:text-[10px] font-bold text-sav-muted tracking-tight truncate block">
                    {inviteLink}
                  </span>
                </div>
                <Button 
                  onClick={handleCopyLink}
                  className={cn(
                    "h-10 sm:h-12 px-4 sm:px-6 rounded-lg sm:rounded-xl text-[8px] sm:text-[10px] font-black tracking-widest uppercase transition-all shadow-lg shrink-0",
                    copiedLink ? "bg-emerald-500 text-white" : "bg-white border border-slate-200 text-gray-900"
                  )}
                >
                  {copiedLink ? <Check size={12} className="mr-1.5 sm:mr-2" /> : <Share2 size={12} className="mr-1.5 sm:mr-2" />}
                  {copiedLink ? 'COPIADO' : 'COPIAR'}
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Beneficios - Premium List */}
        <div className="space-y-4 sm:space-y-5">
          <h3 className="text-[10px] sm:text-[11px] font-black text-gray-900/40 uppercase tracking-[0.2em] sm:tracking-[0.3em] px-1 flex items-center gap-2">
            <Zap size={14} className="text-sav-primary" /> Beneficios de Red
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:gap-4">
            {[
              { icon: Gift, title: 'Bono Invitación (10%)', desc: '10% de la inversión de tus directos.', color: 'text-sav-primary', bg: 'bg-sav-primary/10' },
              { icon: TrendingUp, title: 'Crecimiento de Red', desc: '3% y 1% por referidos indirectos.', color: 'text-blue-500', bg: 'bg-blue-500/10' },
              { icon: ShieldCheck, title: 'Seguridad Total', desc: 'Sistema transparente y garantizado.', color: 'text-emerald-500', bg: 'bg-emerald-500/10' }
            ].map((b, i) => (
              <Card key={i} className="flex items-center gap-4 sm:gap-5 p-4 sm:p-5 bg-white border-black/5 group hover:border-sav-primary/20 transition-all duration-500 shadow-xl shadow-black/5 rounded-2xl sm:rounded-[2rem]">
                <div className={cn("w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 shadow-inner border border-black/5 transition-transform group-hover:scale-110", b.bg, b.color)}>
                  <b.icon size={24} className="sm:w-[28px] sm:h-[28px]" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-[11px] sm:text-sm font-black text-gray-900 uppercase tracking-wider truncate">{b.title}</h4>
                  <p className="text-[8px] sm:text-[10px] text-sav-muted font-bold leading-relaxed mt-0.5 sm:mt-1 uppercase tracking-wide truncate sm:whitespace-normal">{b.desc}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {isPasante && (
          <Card className="p-6 bg-sav-primary/10 border-sav-primary/20 shadow-xl shadow-sav-primary/5 rounded-[2rem] animate-pulse">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-sav-primary/20 flex items-center justify-center text-sav-primary shrink-0">
                <Star size={24} fill="currentColor" />
              </div>
              <div className="space-y-2">
                <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest">Aviso para Pasantes</h4>
                <p className="text-[10px] text-sav-muted font-bold uppercase tracking-widest leading-relaxed">
                  Puedes invitar amigos ahora, pero <span className="text-sav-primary">no recibirás comisiones</span> hasta que subas a un nivel VIP. ¡Sube de nivel para empezar a ganar!
                </p>
                <Link to="/vip" className="inline-block pt-2">
                  <Button variant="outline" className="h-8 px-4 rounded-lg text-[8px] font-black tracking-widest uppercase border-sav-primary/30 text-sav-primary hover:bg-sav-primary hover:text-white transition-all">
                    SUBIR A VIP AHORA
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        )}

        {/* Sección de Usuarios Registrados */}
        <div className="space-y-4 sm:space-y-5">
          <div className="flex flex-col gap-1 px-1">
            <h3 className="text-[10px] sm:text-[11px] font-black text-gray-900 uppercase tracking-[0.2em] sm:tracking-[0.3em] flex items-center gap-2">
              <Users size={14} className="text-sav-primary" /> Usuarios registrados con mi código
            </h3>
            <p className="text-[8px] sm:text-[9px] text-sav-muted font-bold uppercase tracking-widest">
              Estos son los usuarios que se registraron usando tu invitación.
            </p>
          </div>

          <Card className="bg-white border-black/5 shadow-xl shadow-black/5 rounded-[1.5rem] sm:rounded-[2.5rem] overflow-hidden">
            {referralsLoading ? (
              <div className="p-12 flex flex-col items-center justify-center space-y-4">
                <div className="w-8 h-8 border-4 border-black/5 border-t-sav-primary rounded-full animate-spin"></div>
                <p className="text-[8px] font-black text-sav-muted uppercase tracking-widest">Cargando invitados...</p>
              </div>
            ) : referrals.length > 0 ? (
              <div className="divide-y divide-slate-50 max-h-[400px] overflow-y-auto custom-scrollbar">
                {referrals.map((ref, idx) => (
                  <div key={ref.id} className="p-4 sm:p-5 flex items-center justify-between group hover:bg-slate-50/50 transition-all">
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-slate-50 flex items-center justify-center text-sav-primary font-black text-[10px] sm:text-xs shadow-inner group-hover:bg-white transition-all">
                        {idx + 1}
                      </div>
                      <div className="space-y-1">
                        <p className="text-[11px] sm:text-sm font-black text-gray-900 uppercase tracking-wide truncate max-w-[120px] sm:max-w-none">
                          {ref.nombre_usuario}
                        </p>
                        <p className="text-[9px] sm:text-[10px] font-bold text-sav-primary tracking-widest">
                          {ref.telefono_masked}
                        </p>
                      </div>
                    </div>
                    <div className="text-right space-y-1">
                      <div className="inline-block px-2 py-1 rounded-lg bg-sav-primary/10 border border-sav-primary/20">
                        <p className="text-[8px] sm:text-[9px] font-black text-sav-primary uppercase tracking-widest">
                          {ref.nivel}
                        </p>
                      </div>
                      <p className="text-[7px] sm:text-[8px] font-bold text-sav-muted uppercase tracking-tighter">
                        {new Date(ref.created_at).toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-16 h-16 rounded-[1.5rem] bg-slate-50 flex items-center justify-center text-slate-200">
                  <Users size={32} />
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-gray-900 uppercase tracking-widest">Sin invitados</p>
                  <p className="text-[8px] font-bold text-sav-muted uppercase tracking-widest leading-relaxed">
                    Aún no tienes usuarios registrados <br/> con tu código de invitación.
                  </p>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </Layout>
  );
}
