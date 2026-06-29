import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import Header from '../components/Header';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { CONFIG } from '../config';
import { 
  Share2, Copy, Check, Users, Gift, Star, 
  ShieldCheck, Zap, Lock, Info, TrendingUp, 
  AlertCircle, ArrowRight, Trash2, User, 
  Loader2 as LoaderIcon,
  Sparkles,
  Award,
  ChevronRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { displayLevelCode } from '../lib/displayLevel.js';
import { Card } from '../components/ui/Card.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { cn } from '../lib/utils/cn';

const GlobalLoader = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-bcb-bg space-y-6">
    <div className="w-16 h-16 border-4 border-bcb-surface border-t-bcb-primary rounded-full animate-spin" />
    <div className="text-center">
      <p className="text-black font-bold uppercase tracking-[0.4em] text-[10px] animate-pulse">Sincronizando Red</p>
      <p className="text-bcb-muted text-[8px] uppercase tracking-widest mt-2">BCB Global Institutional Network</p>
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
  const [selectedNivel, setSelectedNivel] = useState('A');
  const [deletingId, setDeletingId] = useState(null);

  const fetchReferrals = async () => {
    if (referrals.length === 0) setReferralsLoading(true);
    try {
      const res = await api.get(`/users/my-referrals?nivel=${selectedNivel}`);
      setReferrals(res.items || []);
    } catch (err) {
      console.error('Error fetching referrals:', err);
    } finally {
      setReferralsLoading(false);
    }
  };

  useEffect(() => {
    fetchReferrals();
    const interval = setInterval(fetchReferrals, 10000);
    return () => clearInterval(interval);
  }, [selectedNivel]);

  const handleDeleteReferral = async (referralId) => {
    if (!window.confirm('¿Estás seguro de eliminar a este usuario Pasante? Esta acción no se puede deshacer.')) return;
    
    setDeletingId(referralId);
    try {
      await api.delete(`/users/my-referrals/${referralId}`);
      fetchReferrals();
    } catch (err) {
      alert(err.response?.data?.error || 'Error al eliminar referido');
    } finally {
      setDeletingId(null);
    }
  };

  useEffect(() => {
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
        <div className="px-6 py-12 text-center space-y-10 flex flex-col items-center justify-center min-h-[80vh] animate-in">
          <Card variant="premium" className="w-full flex flex-col items-center p-12 space-y-8">
            <div className="w-24 h-24 bg-rose-50 text-rose-500 rounded-[2.5rem] flex items-center justify-center shadow-sm border border-rose-100 animate-pulse">
              <AlertCircle size={48} strokeWidth={1.5} />
            </div>
            <div className="space-y-4">
              <h2 className="text-3xl font-extrabold text-black uppercase tracking-tight">Acceso Restringido</h2>
              <p className="text-sm text-bcb-text-dim font-medium leading-relaxed max-w-xs mx-auto">
                Tu acceso a invitaciones ha sido <span className="text-rose-600 font-extrabold uppercase">bloqueado temporalmente</span> como sanción institucional.
              </p>
            </div>
            <Link to="/" className="w-full">
              <Button variant="secondary" className="w-full h-14">VOLVER AL PANEL</Button>
            </Link>
          </Card>
        </div>
      </Layout>
    );
  }

  const isPasante = user?.nivel_codigo === 'internar';

  return (
    <Layout>
      <div className="bg-bcb-bg min-h-screen pb-32">
        <Header title="Programa de Referidos" />
        
        <main className="px-6 py-8 space-y-10 max-w-lg mx-auto animate-in">
          {/* Hero Banner Section */}
          <section>
            <Card variant="premium" className="p-10 text-center flex flex-col items-center space-y-6">
              <div className="w-20 h-20 rounded-[2.5rem] bg-bcb-primary/10 border border-bcb-primary/20 flex items-center justify-center text-bcb-primary shadow-sm">
                <Users size={40} strokeWidth={1.5} />
              </div>
              <div className="space-y-2">
                <h2 className="text-3xl font-black text-black uppercase tracking-tight leading-none">¡Expande tu Red!</h2>
                <p className="text-[11px] font-bold text-gray-600 uppercase tracking-[0.3em] mt-1">Gana comisiones por cada nuevo socio</p>
              </div>
            </Card>
          </section>

          {/* Invitation Tools */}
          <section className="space-y-6">
            <div className="flex items-center gap-2 px-1">
              <div className="w-1.5 h-4 bg-bcb-primary rounded-full" />
              <h3 className="text-[13px] font-extrabold text-black uppercase tracking-[0.15em]">Herramientas de Invitación</h3>
            </div>

            <Card className="p-8 space-y-8 bg-white border-black/[0.03] shadow-m3-2">
              <div className="space-y-4 text-center">
                <p className="text-[10px] font-extrabold text-bcb-muted uppercase tracking-[0.25em]">Código Institucional</p>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-16 bg-bcb-surface rounded-2xl flex items-center justify-center border border-black/[0.03] shadow-inner">
                    <span className="text-3xl font-black text-black tracking-[0.3em] uppercase">
                      {user?.codigo_invitacion || '------'}
                    </span>
                  </div>
                  <button 
                    onClick={handleCopyCode}
                    className={cn(
                      "w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-sm active:scale-90",
                      copiedCode ? "bg-emerald-500 text-white" : "bg-bcb-primary text-white shadow-accent-glow"
                    )}
                  >
                    {copiedCode ? <Check size={28} /> : <Copy size={28} />}
                  </button>
                </div>
              </div>

              <div className="h-px bg-black/[0.03] w-full" />

              <div className="space-y-4">
                <p className="text-[10px] font-extrabold text-bcb-muted uppercase tracking-[0.25em] text-center">Enlace de Registro Directo</p>
                <div className="flex items-center gap-3 p-2 bg-bcb-surface rounded-2xl border border-black/[0.03] shadow-inner">
                  <div className="flex-1 truncate px-4">
                    <span className="text-[11px] font-bold text-bcb-muted truncate block">
                      {inviteLink}
                    </span>
                  </div>
                  <Button 
                    onClick={handleCopyLink}
                    className={cn(
                      "px-6 h-12 rounded-xl text-[11px] uppercase tracking-widest",
                      copiedLink ? "bg-emerald-500 shadow-success-glow" : "bg-bcb-primary shadow-accent-glow"
                    )}
                  >
                    {copiedLink ? 'Copiado' : 'Copiar'}
                  </Button>
                </div>
              </div>
            </Card>
          </section>

          {/* Benefits Grid */}
          <section className="space-y-5">
            <div className="flex items-center gap-2 px-1">
              <div className="w-1.5 h-4 bg-emerald-400 rounded-full" />
              <h3 className="text-[13px] font-extrabold text-black uppercase tracking-[0.15em]">Beneficios de Red</h3>
            </div>
            <div className="grid grid-cols-1 gap-4">
              {[
                { icon: Gift, title: 'Bono Directo 10%', desc: 'Comisión por inversión de tus socios Nivel A.', color: 'text-indigo-600', bg: 'bg-indigo-50' },
                { icon: TrendingUp, title: 'Bono Indirecto', desc: 'Gana hasta el 3% por referidos Nivel B y C.', color: 'text-bcb-primary', bg: 'bg-bcb-primary/10' },
                { icon: ShieldCheck, title: 'Red VIP Global', desc: 'Liquidación instantánea de beneficios de red.', color: 'text-emerald-600', bg: 'bg-emerald-50' }
              ].map((b, i) => (
                <Card key={i} className="flex items-center gap-5 p-5 bg-white border-black/[0.03] group hover:border-bcb-primary/30 transition-all shadow-m3-1">
                  <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border border-black/[0.02] transition-transform group-hover:scale-110 shadow-sm", b.bg, b.color)}>
                    <b.icon size={26} strokeWidth={2.5} />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-[13px] font-extrabold text-black uppercase tracking-tight">{b.title}</h4>
                    <p className="text-[10px] text-bcb-muted font-bold uppercase tracking-tight leading-relaxed mt-0.5">{b.desc}</p>
                  </div>
                </Card>
              ))}
            </div>
          </section>

          {isPasante && (
            <Card className="p-6 bg-indigo-50 border border-indigo-100 shadow-sm rounded-3xl animate-pulse">
              <div className="flex items-start gap-4 text-indigo-600">
                <Info size={24} className="shrink-0" />
                <div className="space-y-1">
                  <h4 className="text-[11px] font-extrabold uppercase tracking-widest leading-none mb-1">Nota para Pasantes</h4>
                  <p className="text-[10px] font-bold leading-relaxed uppercase tracking-tight opacity-80">
                    Como Pasante, tus invitaciones son limitadas. Actualiza a un nivel VIP para desbloquear ganancias ilimitadas.
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Referral Management */}
          <section className="space-y-6 pt-4">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-4 bg-bcb-accent rounded-full" />
                <h3 className="text-[13px] font-extrabold text-black uppercase tracking-[0.15em]">Mi Equipo de Red</h3>
              </div>
              <div className="flex bg-bcb-surface p-1.5 rounded-2xl border border-black/[0.03] shadow-inner">
                {['A', 'B', 'C'].map(n => (
                  <button
                    key={n}
                    onClick={() => setSelectedNivel(n)}
                    className={cn(
                      "px-5 py-2 rounded-xl text-[10px] font-black transition-all",
                      selectedNivel === n ? "bg-white text-bcb-primary shadow-m3-1" : "text-bcb-muted hover:text-black"
                    )}
                  >
                    NIVEL {n}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4 pb-12">
              {referralsLoading ? (
                <div className="py-20 flex flex-col items-center justify-center gap-4">
                  <LoaderIcon className="animate-spin text-bcb-primary" size={32} />
                  <p className="text-[10px] font-extrabold text-bcb-muted uppercase tracking-[0.3em]">Sincronizando Red...</p>
                </div>
              ) : referrals.length > 0 ? (
                referrals.map((ref) => (
                  <Card key={ref.id} className="p-5 flex items-center justify-between bg-white border-black/[0.03] shadow-m3-1 group">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-13 h-13 rounded-2xl bg-bcb-surface flex items-center justify-center text-bcb-muted group-hover:bg-bcb-primary/10 group-hover:text-bcb-primary transition-all shadow-sm">
                        <User size={26} strokeWidth={2.5} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-[13px] font-extrabold text-black uppercase tracking-tight truncate">{ref.nombre_usuario}</h4>
                          <Badge variant="info" className="text-[8px] py-0 px-2">{displayLevelCode(ref.nivel_codigo)}</Badge>
                        </div>
                        <p className="text-[11px] font-bold text-bcb-muted tracking-widest">{ref.telefono}</p>
                      </div>
                    </div>
                    {selectedNivel === 'A' && ref.nivel_codigo === 'internar' && (
                      <button 
                        onClick={() => handleDeleteReferral(ref.id)}
                        disabled={deletingId === ref.id}
                        className="w-11 h-11 rounded-xl flex items-center justify-center text-rose-400 hover:bg-rose-50 hover:text-rose-600 transition-all border border-transparent hover:border-rose-100"
                      >
                        {deletingId === ref.id ? <LoaderIcon className="animate-spin" size={20} /> : <Trash2 size={20} />}
                      </button>
                    )}
                  </Card>
                ))
              ) : (
                <div className="py-24 text-center space-y-6">
                   <div className="w-20 h-20 rounded-full border-2 border-dashed border-black/[0.05] flex items-center justify-center mx-auto text-bcb-muted/30">
                      <Users size={32} />
                   </div>
                   <div className="space-y-2">
                      <p className="text-[12px] font-extrabold text-black uppercase tracking-widest">Sin socios registrados</p>
                      <p className="text-[10px] font-bold text-bcb-muted uppercase tracking-tight leading-relaxed max-w-[180px] mx-auto">Comparte tu enlace para comenzar a construir tu red institucional.</p>
                   </div>
                </div>
              )}
            </div>
          </section>
        </main>
      </div>
    </Layout>
  );
}


