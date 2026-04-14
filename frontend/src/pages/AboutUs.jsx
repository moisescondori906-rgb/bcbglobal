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
      description: "Para garantizar la liquidez y rapidez del sistema, BCB Global opera bajo un cronograma estricto de retiros asignado por nivel. Asegúrate de solicitar tu retiro el día correspondiente.",
      items: [
        { icon: Wallet, text: "GLOBAL 1: Martes" },
        { icon: Wallet, text: "GLOBAL 2: Miércoles" },
        { icon: Wallet, text: "GLOBAL 3: Jueves" },
        { icon: Wallet, text: "GLOBAL 4: Viernes" },
        { icon: Wallet, text: "GLOBAL 5 a 9: Sábado" },
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
            <Card variant="premium" className="p-8 relative overflow-hidden min-h-[400px]">
              <div className="absolute top-0 right-0 p-8 opacity-5">
                {(() => {
                  const Icon = tabs.find(t => t.id === activeTab).icon;
                  return <Icon size={180} />;
                })()}
              </div>

              <div className="relative z-10 space-y-6">
                <div className="space-y-2">
                  <Badge variant="info" className="mb-2">BCB GLOBAL OFFICIAL</Badge>
                  <h2 className="text-3xl font-black text-white uppercase tracking-tighter leading-none">
                    {content[activeTab].title}
                  </h2>
                  <p className="text-xs font-black text-sav-primary uppercase tracking-[0.2em]">
                    {content[activeTab].subtitle}
                  </p>
                </div>

                <p className="text-sm text-sav-muted font-medium leading-relaxed">
                  {content[activeTab].description}
                </p>

                <div className="space-y-4 pt-4">
                  {content[activeTab].items.map((item, i) => (
                    <div key={i} className="flex items-center gap-4 group">
                      <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-sav-primary group-hover:scale-110 transition-transform">
                        <item.icon size={18} />
                      </div>
                      <span className="text-xs font-bold text-white/80 uppercase tracking-wide">{item.text}</span>
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
