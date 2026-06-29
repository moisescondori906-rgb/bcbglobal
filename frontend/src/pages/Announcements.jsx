import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Bell as BellIcon, 
  ChevronLeft as ChevronLeftIcon, 
  Calendar as CalendarIcon,
  Megaphone as AnnouncementIcon,
  Image as ImageIcon,
  Sparkles as SparklesIcon
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { Card } from '../components/ui/Card';
import { api } from '../lib/api';
import GlobalLoader from '../components/ui/GlobalLoader';
import { formatDate } from '../lib/utils/format';

export default function Announcements() {
  const navigate = useNavigate();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const data = await api.get('/home-announcements');
        setAnnouncements(data?.items || []);
      } catch (err) {
        console.error('Error fetching announcements:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnnouncements();
  }, []);

  if (loading) return <GlobalLoader />;

  return (
    <Layout>
      <div className="fixed inset-0 bg-white -z-10" />
      
      <main className="px-5 pt-6 pb-20 space-y-8">
        {/* Header Ultra Clean */}
        <header className="flex items-center gap-5">
          <button 
            onClick={() => navigate(-1)}
            className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-900 active:scale-90 transition-all shadow-sm"
          >
            <ChevronLeftIcon size={24} />
          </button>
          <div className="space-y-0.5">
            <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Anuncios</h1>
            <p className="text-[10px] font-black text-bcb-primary uppercase tracking-[0.2em] opacity-60">Centro de Comunicados</p>
          </div>
        </header>

        {/* Announcements List */}
        <div className="space-y-8">
          {!Array.isArray(announcements) || announcements.length === 0 ? (
            <div className="py-24 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-20 h-20 rounded-3xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-200">
                <AnnouncementIcon size={40} />
              </div>
              <div className="space-y-1">
                <p className="text-base font-black text-slate-900 uppercase tracking-widest">Sin anuncios</p>
                <p className="text-[11px] text-slate-400 font-bold px-10 uppercase tracking-tight">No hay comunicados globales activos.</p>
              </div>
            </div>
          ) : (
            announcements.map((item, idx) => (
              <motion.div
                key={item.id || idx}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1, type: "spring", damping: 20 }}
              >
                <div className="space-y-4">
                  {/* Date Badge */}
                  <div className="flex items-center gap-2 px-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-bcb-primary" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                      {formatDate(item.created_at)}
                    </span>
                  </div>

                  <Card className="overflow-hidden border-none shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] bg-white rounded-[2.5rem]">
                    {item.imagen_url && (
                      <div className="relative aspect-video w-full overflow-hidden bg-slate-950">
                        <img 
                          src={api.getMediaUrl(item.imagen_url)} 
                          alt={item.titulo}
                          className="w-full h-full object-contain p-4"
                        />
                      </div>
                    )}
                    
                    <div className="p-8 space-y-4">
                      <div className="space-y-2">
                        <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight leading-tight">
                          {item.titulo || 'Comunicado Oficial'}
                        </h3>
                        <div className="h-1 w-12 bg-bcb-primary/10 rounded-full" />
                      </div>

                      <p className="text-[13px] text-slate-600 font-bold leading-relaxed whitespace-pre-wrap">
                        {item.mensaje}
                      </p>

                      <div className="pt-4 flex items-center gap-2 opacity-40">
                        <SparklesIcon size={12} className="text-bcb-primary" />
                        <span className="text-[8px] font-black text-slate-900 uppercase tracking-[0.3em]">BCB Global Tech</span>
                      </div>
                    </div>
                  </Card>
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* Minimal Footer */}
        <div className="pt-10 pb-10 flex flex-col items-center gap-4">
          <div className="w-12 h-1 bg-slate-100 rounded-full" />
          <p className="text-[9px] font-black text-slate-300 text-center uppercase tracking-[0.5em]">
            Fin de los comunicados
          </p>
        </div>
      </main>
    </Layout>
  );
}

