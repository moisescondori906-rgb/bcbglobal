import { useState } from 'react';
import Layout from '../components/Layout';
import Header from '../components/Header';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Info, TrendingUp, UsersRound, Wallet, 
  ChevronRight, Globe, ShieldCheck, Target, 
  Sparkles, Award, Zap, Building2, BarChart3
} from 'lucide-react';
import { Card } from '../components/ui/Card.jsx';
import { Badge } from '../components/ui/Badge';
import { cn } from '../lib/utils/cn';

export default function AboutUs() {
  const [activeTab, setActiveTab] = useState('empresa');

  const tabs = [
    { id: 'empresa', label: 'Empresa', icon: Building2, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { id: 'inversion', label: 'Inversión', icon: BarChart3, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { id: 'referidos', label: 'Referidos', icon: UsersRound, color: 'text-amber-400', bg: 'bg-amber-500/10' },
    { id: 'retiros', label: 'Retiros', icon: Wallet, color: 'text-purple-400', bg: 'bg-purple-500/10' },
  ];

  const content = {
    empresa: {
      title: "BCB Global Institucional",
      subtitle: "Líderes en Gestión de Activos Digitales",
      description: "Fundada en Colorado, EE.UU., BCB Global es una plataforma de vanguardia diseñada para democratizar el acceso a mercados de alta rentabilidad mediante la tecnología blockchain y el marketing de tareas digitales.",
      items: [
        { icon: Globe, text: "Sede central en Colorado, Estados Unidos." },
        { icon: ShieldCheck, text: "Protocolos de seguridad bancaria de grado militar." },
        { icon: Target, text: "Misión: Crear libertad financiera sostenible." }
      ]
    },
    inversion: {
      title: "Modelo de Rentabilidad",
      subtitle: "Crecimiento Exponencial Seguro",
      description: "Nuestro sistema permite a los usuarios capitalizar su tiempo. Al adquirir un nivel GLOBAL, participas en campañas de marketing de alto valor, recibiendo dividendos diarios por cada tarea completada.",
      items: [
        { icon: TrendingUp, text: "Retorno de inversión optimizado por niveles." },
        { icon: Zap, text: "Activación instantánea de beneficios VIP." },
        { icon: BarChart3, text: "Cálculos transparentes: Diario, Mensual y Anual." }
      ]
    },
    referidos: {
      title: "Programa de Afiliados",
      subtitle: "Construye tu propia Red de Ingresos",
      description: "Premia tu liderazgo expandiendo la comunidad. BCB Global ofrece uno de los sistemas de referidos más competitivos del mercado, permitiéndote ganar comisiones pasivas de por vida.",
      items: [
        { icon: Award, text: "Nivel 1: 10% de bonificación directa." },
        { icon: UsersRound, text: "Nivel 2 y 3: Comisiones por red activa." },
        { icon: Sparkles, text: "Bonos especiales por liderazgo y volumen." }
      ]
    },
    retiros: {
      title: "Sistema de Pagos",
      subtitle: "Calendario de Retiros Institucional",
      description: "Para garantizar la liquidez y rapidez del sistema, BCB Global opera bajo un cronograma de retiros unificado. Todos los niveles Globales pueden solicitar sus fondos durante la ventana operativa semanal.",
      items: [
        { icon: ShieldCheck, text: "Retiros habilitados de Martes a Jueves." },
        { icon: Wallet, text: "Se permite 1 retiro por día por usuario." },
        { icon: ShieldCheck, text: "Firma Digital requerida para procesar el pago." }
      ]
    }
  };

  return (
    <Layout>
      <Header title="Institucional" />
      <main className="p-5 space-y-6 pb-20 animate-fade">
        
        {/* Tab Navigation Estilizada */}
        <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar -mx-1 px-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border",
                  isActive 
                    ? "bg-sav-primary border-sav-primary text-white shadow-lg shadow-sav-primary/20 scale-105" 
                    : "bg-white/5 border-white/10 text-sav-muted hover:bg-white/10"
                )}
              >
                <Icon size={14} className={isActive ? "text-white" : tab.color} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content Area con Animación */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <Card variant="premium" className="p-8 relative overflow-hidden min-h-[420px] bg-white shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] border-sav-primary/30">
              <div className="absolute top-0 right-0 p-8 opacity-[0.03] text-sav-primary">
                {(() => {
                  const Icon = tabs.find(t => t.id === activeTab).icon;
                  return <Icon size={180} />;
                })()}
              </div>

              <div className="relative z-10 space-y-6">
                <div className="space-y-2">
                  <Badge variant="info" className="mb-2 bg-sav-primary text-white border-sav-primary shadow-sm">BCB GLOBAL OFFICIAL</Badge>
                  <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter leading-none drop-shadow-sm">
                    {content[activeTab].title}
                  </h2>
                  <p className="text-[13px] font-black text-sav-primary uppercase tracking-[0.25em] bg-sav-primary/5 py-1 px-3 rounded-lg inline-block">
                    {content[activeTab].subtitle}
                  </p>
                </div>

                <p className="text-[15px] text-slate-700 font-bold leading-relaxed border-l-4 border-sav-primary/30 pl-4 py-1">
                  {content[activeTab].description}
                </p>

                {activeTab === 'retiros' && (
                  <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100 shadow-inner space-y-4">
                    <div className="flex justify-between items-center px-1">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ventana Operativa</span>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-sav-primary animate-pulse" />
                        <span className="text-[9px] font-black text-sav-primary uppercase tracking-widest">Bolivia Time</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-7 gap-2">
                      {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((day, i) => {
                        const isAllowed = i >= 1 && i <= 3; // M, M, J (Martes=1, Miércoles=2, Jueves=3 en este array de 0-6)
                        return (
                          <div key={i} className="space-y-2 flex flex-col items-center">
                            <span className="text-[10px] font-black text-slate-400">{day}</span>
                            <div className={cn(
                              "w-full aspect-square rounded-xl flex items-center justify-center text-[11px] font-black transition-all",
                              isAllowed 
                                ? "bg-sav-primary text-white shadow-lg shadow-sav-primary/30 scale-110" 
                                : "bg-white text-slate-300 border border-slate-100"
                            )}>
                              {i + 1}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="pt-2 flex items-center justify-center gap-4">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-sav-primary" />
                        <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Habilitado</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-white border border-slate-200" />
                        <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Cerrado</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-5 pt-4">
                  {content[activeTab].items.map((item, i) => (
                    <div key={i} className="flex items-center gap-4 group">
                      <div className="w-11 h-11 rounded-2xl bg-sav-primary text-white flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-sav-primary/30">
                        <item.icon size={20} strokeWidth={2.5} />
                      </div>
                      <span className="text-[13px] font-black text-slate-800 uppercase tracking-tight">{item.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </motion.div>
        </AnimatePresence>

        {/* Footer Info */}
        <div className="text-center space-y-2 opacity-30 pt-4">
          <p className="text-[8px] font-black text-sav-muted uppercase tracking-[0.4em]">© 2026 BCB Global Asset Management</p>
          <p className="text-[7px] font-bold text-sav-muted uppercase tracking-widest">Colorado, USA • Global Operations</p>
        </div>

      </main>
    </Layout>
  );
}
