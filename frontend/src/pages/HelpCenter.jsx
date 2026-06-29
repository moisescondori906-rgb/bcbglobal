import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import Header from '../components/Header';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { 
  PlayCircle as PlayIcon, 
  HelpCircle as HelpIcon, 
  ChevronRight as ChevronIcon, 
  Zap as ZapIcon, 
  ArrowUpCircle as ArrowUpIcon, 
  ArrowDownCircle as ArrowDownIcon, 
  ShieldCheck as ShieldIcon, 
  Sparkles as SparklesIcon,
  MessageCircle as MessageIcon,
  Users as UsersIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils/cn';
import { api } from '../lib/api';

export default function HelpCenter() {
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [pc, setPc] = useState(null);

  useEffect(() => {
    api.publicContent().then(setPc).catch(() => {});
  }, []);

  const guides = [
    {
      id: 'recharges',
      title: 'Cómo Recargar',
      description: 'Aprende a subir de nivel y activar tu membresía Global.',
      icon: ArrowUpIcon,
      color: 'text-bcb-primary',
      bg: 'bg-bcb-primary/10',
      videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ', 
    },
    {
      id: 'withdrawals',
      title: 'Cómo Retirar',
      description: 'Guía paso a paso para cobrar tus ganancias de forma segura.',
      icon: ArrowDownIcon,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ', 
    },
    {
      id: 'tasks',
      title: 'Realizar Tareas',
      description: 'Maximiza tus ingresos diarios completando tareas correctamente.',
      icon: ZapIcon,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
      videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ', 
    },
    {
      id: 'security',
      title: 'Seguridad',
      description: 'Protege tu cuenta y configura tu contraseña de fondo.',
      icon: ShieldIcon,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
      videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ', 
    }
  ];

  return (
    <Layout>
      <Header title="Centro de Ayuda" />
      
      <main className="p-6 space-y-8 pb-32 animate-fade">
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-black uppercase tracking-tighter">Guías de Usuario</h2>
          <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">Aprende a usar BCB Global como un profesional</p>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {guides.map((guide) => {
            const Icon = guide.icon;
            return (
              <Card 
                key={guide.id}
                onClick={() => setSelectedVideo(guide)}
                className="p-5 flex items-center gap-5 bg-white border-gray-100 hover:border-bcb-primary/30 transition-all group cursor-pointer"
              >
                <div className={cn(
                  "w-14 h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 shadow-inner",
                  guide.bg,
                  guide.color
                )}>
                  <Icon size={28} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-black text-black uppercase tracking-wider truncate">{guide.title}</h3>
                  <p className="text-[10px] text-gray-600 font-bold leading-relaxed mt-0.5 uppercase tracking-wide line-clamp-2">
                    {guide.description}
                  </p>
                </div>
                <div className="p-2 rounded-xl bg-gray-100 group-hover:bg-bcb-primary group-hover:text-white transition-all">
                  <PlayIcon size={20} />
                </div>
              </Card>
            );
          })}
        </div>

        <div className="space-y-4">
          <h2 className="text-[11px] font-black text-black uppercase tracking-[0.3em] ml-1">Contactos Directos</h2>
          
          <div className="grid grid-cols-1 gap-4">
            <a href={pc?.soporte_gerente_url || '#'} target="_blank" rel="noopener noreferrer">
              <Card className="p-6 flex items-center justify-between bg-emerald-500/5 border-emerald-500/20 hover:bg-emerald-500/10 transition-all group">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                    <MessageIcon size={24} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-black uppercase tracking-widest">WhatsApp Gerente</h3>
                    <p className="text-[9px] text-gray-600 font-bold uppercase tracking-widest">Atención personalizada</p>
                  </div>
                </div>
                <ChevronIcon size={18} className="text-gray-500 group-hover:text-black transition-colors" />
              </Card>
            </a>

            <a href={pc?.soporte_canal_url || '#'} target="_blank" rel="noopener noreferrer">
              <Card className="p-6 flex items-center justify-between bg-bcb-primary/5 border-bcb-primary/20 hover:bg-bcb-primary/10 transition-all group">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-bcb-primary/10 flex items-center justify-center text-bcb-primary group-hover:scale-110 transition-transform">
                    <UsersIcon size={24} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-black uppercase tracking-widest">Canal Oficial</h3>
                    <p className="text-[9px] text-gray-600 font-bold uppercase tracking-widest">Noticias y Actualizaciones</p>
                  </div>
                </div>
                <ChevronIcon size={18} className="text-gray-500 group-hover:text-black transition-colors" />
              </Card>
            </a>
          </div>
        </div>

        <Card variant="premium" className="p-8 relative overflow-hidden text-center space-y-4 shadow-2xl">
          <div className="absolute top-0 right-0 p-6 opacity-10">
            <SparklesIcon size={60} />
          </div>
          <div className="relative z-10">
            <h3 className="text-lg font-black text-black uppercase tracking-tighter">¿Problemas Técnicos?</h3>
            <p className="text-[10px] text-gray-700 font-bold uppercase tracking-widest leading-relaxed mt-2">
              Nuestro equipo de soporte está disponible 24/7 para resolver tus dudas institucionales.
            </p>
            <div className="pt-6">
              <a href={pc?.soporte_gerente_url || '#'} target="_blank" rel="noopener noreferrer">
                <Button className="w-full h-14 text-[11px] font-black tracking-[0.2em] uppercase shadow-bcb-glow">
                  SOLICITAR ASISTENCIA
                </Button>
              </a>
            </div>
          </div>
        </Card>
      </main>

      {/* Video Modal */}
      <AnimatePresence>
        {selectedVideo && (
          <div key="modal-container" className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              key="modal-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedVideo(null)}
              className="absolute inset-0 bg-bcb-dark/95 backdrop-blur-xl"
            />
            <motion.div
              key="modal-content"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-bcb-dark border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl"
            >
              <div className="aspect-video w-full bg-black">
                <iframe 
                  width="100%" 
                  height="100%" 
                  src={selectedVideo.videoUrl} 
                  title={selectedVideo.title}
                  frameBorder="0" 
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                  allowFullScreen
                ></iframe>
              </div>
              <div className="p-8 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className={cn("p-3 rounded-xl", selectedVideo.bg, selectedVideo.color)}>
                    {selectedVideo.icon && (
                      <selectedVideo.icon size={20} />
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-wider">{selectedVideo.title}</h3>
                    <p className="text-[9px] text-bcb-muted font-bold uppercase tracking-widest">Video Tutorial</p>
                  </div>
                </div>
                <Button 
                  onClick={() => setSelectedVideo(null)}
                  variant="secondary"
                  className="h-12 px-6 rounded-xl text-[10px] font-black tracking-widest"
                >
                  CERRAR
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Layout>
  );
}


