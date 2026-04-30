import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import Header from '../components/Header';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
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

  useEffect(() => {
    setLoading(false);
  }, []);

  const inviteLink = `https://bcb-global.com/register?ref=${user?.codigo_invitacion || ''}`;

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
      
      <div className="p-6 space-y-8 pb-32 animate-fade">
        {/* Banner Principal Hero - Premium Light */}
        <Card className="relative overflow-hidden p-10 text-center border-black/5 bg-white shadow-xl shadow-black/5 rounded-[3rem]">
          <div className="absolute top-0 right-0 w-32 h-32 bg-sav-primary/5 rounded-full -mr-16 -mt-16 blur-3xl opacity-50" />
          <div className="relative z-10 flex flex-col items-center space-y-6">
            <div className="relative">
              <div className="absolute -inset-2 bg-sav-primary/10 blur-md rounded-full animate-pulse" />
              <div className="relative w-20 h-20 bg-white rounded-[2rem] flex items-center justify-center shadow-xl border border-black/5">
                <Users size={32} className="text-sav-primary" />
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-black uppercase tracking-tighter text-gray-900">¡Invita y Gana!</h2>
              <div className="h-1 w-12 bg-sav-primary/20 rounded-full mx-auto" />
              <p className="text-[10px] text-sav-muted font-black uppercase tracking-[0.4em] mt-3">Construye tu equipo hoy</p>
            </div>
          </div>
        </Card>

        {/* Card de Información de Invitación - Light Style */}
        <Card className="p-8 space-y-8 bg-white border-black/5 shadow-xl shadow-black/5 rounded-[2.5rem]">
          <div className="space-y-8">
            {/* Código de Invitación */}
            <div className="flex flex-col items-center space-y-4">
              <span className="text-[10px] font-black text-sav-muted uppercase tracking-[0.3em]">Tu código exclusivo</span>
              <div className="flex items-center gap-4 w-full">
                <div className="flex-1 bg-black/5 py-5 rounded-[1.5rem] border border-black/5 text-center shadow-inner group hover:border-sav-primary/30 transition-all">
                  <span className="text-4xl font-black text-gray-900 tracking-[0.3em]">
                    {user?.codigo_invitacion || '------'}
                  </span>
                </div>
                <button 
                  onClick={handleCopyCode}
                  className={cn(
                    "w-16 h-16 rounded-[1.5rem] transition-all duration-300 flex items-center justify-center shadow-xl active:scale-90",
                    copiedCode ? "bg-emerald-500 text-white shadow-emerald-500/20" : "bg-sav-primary text-white shadow-sav-primary/20"
                  )}
                >
                  {copiedCode ? <Check size={28} /> : <Copy size={28} />}
                </button>
              </div>
            </div>

            <div className="h-px bg-gradient-to-r from-transparent via-black/5 to-transparent w-full" />

            {/* Enlace de Invitación */}
            <div className="flex flex-col items-center space-y-4">
              <span className="text-[10px] font-black text-sav-muted uppercase tracking-[0.3em]">Enlace de acceso directo</span>
              <div className="flex items-center gap-3 w-full bg-black/5 p-2 rounded-2xl border border-black/5 shadow-inner">
                <div className="flex-1 truncate px-4">
                  <span className="text-[10px] font-bold text-sav-muted tracking-tight">
                    {inviteLink}
                  </span>
                </div>
                <Button 
                  onClick={handleCopyLink}
                  className={cn(
                    "h-12 px-6 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all shadow-lg",
                    copiedLink ? "bg-emerald-500" : "bg-white border border-black/5 text-gray-900"
                  )}
                >
                  {copiedLink ? <Check size={14} className="mr-2" /> : <Share2 size={14} className="mr-2" />}
                  {copiedLink ? 'COPIADO' : 'COPIAR'}
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Beneficios - Premium List */}
        <div className="space-y-4">
          <h3 className="text-[11px] font-black text-gray-900/40 uppercase tracking-[0.3em] px-1 flex items-center gap-2">
            <Zap size={14} className="text-sav-primary" /> Beneficios de Red
          </h3>
          <div className="grid grid-cols-1 gap-4">
            {[
              { icon: Gift, title: 'Bono de Invitación (10%)', desc: 'Gana el 10% de la inversión inicial de tus invitados directos.', color: 'text-sav-primary', bg: 'bg-sav-primary/10' },
              { icon: TrendingUp, title: 'Crecimiento de Red', desc: 'Comisiones del 3% y 1% por referidos de segundo y tercer nivel.', color: 'text-blue-500', bg: 'bg-blue-500/10' },
              { icon: ShieldCheck, title: 'Crecimiento Seguro', desc: 'Sistema de red transparente y retiro garantizado.', color: 'text-emerald-500', bg: 'bg-emerald-500/10' }
            ].map((b, i) => (
              <Card key={i} className="flex items-center gap-5 p-5 bg-white border-black/5 group hover:border-sav-primary/20 transition-all duration-500 shadow-xl shadow-black/5 rounded-[2rem]">
                <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-inner border border-black/5 transition-transform group-hover:scale-110", b.bg, b.color)}>
                  <b.icon size={28} />
                </div>
                <div>
                  <h4 className="text-sm font-black text-gray-900 uppercase tracking-wider">{b.title}</h4>
                  <p className="text-[10px] text-sav-muted font-bold leading-relaxed mt-1 uppercase tracking-wide">{b.desc}</p>
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
      </div>
    </Layout>
  );
}
