import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Smartphone, 
  Search, 
  CheckCircle2, 
  XCircle, 
  RefreshCw,
  ShieldCheck,
  Lock,
  Clock
} from 'lucide-react';
import { api } from '../../lib/api';
import { formatDate } from '../../utils/format';

export default function AdminDispositivosV2() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const data = await api.get('/admin/device-requests');
      setList(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching device requests:', err);
      setList([]);
    } finally {
      setLoading(false);
    }
  };

  const handleProcess = async (id, status) => {
    if (!confirm(`¿Seguro que quieres ${status} esta solicitud de acceso?`)) return;
    try {
      await api.post(`/admin/device-requests/${id}`, { status });
      setList(l => l.filter(r => r.id !== id));
      alert(`Solicitud ${status} con éxito`);
    } catch (err) {
      alert(err.message);
    }
  };

  const filteredList = list.filter(r => {
    return r.nombre_usuario?.toLowerCase().includes(searchTerm.toLowerCase()) || 
           r.telefono?.includes(searchTerm) ||
           r.device_id?.includes(searchTerm);
  });

  return (
    <div className="space-y-10 animate-in">
      {/* Header Section */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-8">
        <div className="space-y-2">
          <div className="flex items-center gap-4">
            <div className="p-3.5 rounded-2xl bg-gradient-to-tr from-bcb-primary to-rose-600 text-white shadow-xl shadow-bcb-primary/20">
              <Lock size={24} />
            </div>
            <div>
              <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic">Seguridad de Acceso</h1>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] flex items-center gap-2">
                <ShieldCheck size={14} className="text-bcb-primary" /> Control de dispositivos BCB Global
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="relative group flex-1 min-w-[200px] sm:min-w-[300px]">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-bcb-primary transition-colors" />
            <input 
              type="text" 
              placeholder="Buscar por usuario, teléfono o ID..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="admin-input pl-12 !h-14"
            />
          </div>
          <button 
            onClick={fetchRequests}
            className="p-4 rounded-2xl bg-white/5 border border-white/5 text-slate-400 hover:text-white transition-all shadow-2xl hover:bg-white/10"
          >
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Grid de Solicitudes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <AnimatePresence mode="popLayout">
          {loading ? (
            Array(4).fill(0).map((_, i) => (
              <div key={i} className="admin-card h-64 animate-pulse" />
            ))
          ) : filteredList.length > 0 ? (
            filteredList.map((r, index) => (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: index * 0.05 }}
                className="admin-card p-6 flex flex-col justify-between group border-white/5 hover:border-bcb-primary/40 transition-all duration-500 shadow-xl"
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center font-black text-bcb-primary border border-white/5 shadow-inner">
                        <Smartphone size={20} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-black text-white uppercase tracking-tighter truncate w-28 sm:w-32">{r.nombre_usuario}</p>
                        <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">{r.telefono}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-black/40 rounded-2xl p-4 border border-white/5 space-y-3 shadow-inner group-hover:bg-black/60 transition-colors">
                    <div>
                      <p className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Modelo Detectado</p>
                      <p className="text-xs font-black text-white tracking-tight uppercase italic">{r.modelo_dispositivo || 'Desconocido'}</p>
                    </div>
                    <div>
                      <p className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Device ID</p>
                      <p className="text-[9px] font-bold text-bcb-primary tracking-widest truncate">{r.device_id}</p>
                    </div>
                    <div className="flex items-center gap-2 pt-2 border-t border-white/5 opacity-60">
                      <Clock size={12} className="text-slate-500" />
                      <p className="text-[9px] font-bold text-slate-500">{formatDate(r.created_at)}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-6">
                  <button 
                    onClick={() => handleProcess(r.id, 'aprobado')}
                    className="flex items-center justify-center gap-2 py-3.5 rounded-xl bg-bcb-primary text-white text-[9px] font-black uppercase tracking-widest shadow-lg shadow-bcb-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
                  >
                    <CheckCircle2 size={14} /> Aprobar
                  </button>
                  <button 
                    onClick={() => handleProcess(r.id, 'rechazado')}
                    className="flex items-center justify-center gap-2 py-3.5 rounded-xl bg-white/5 border border-white/10 text-rose-500 text-[9px] font-black uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all shadow-lg"
                  >
                    <XCircle size={14} /> Rechazar
                  </button>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="col-span-full py-20 text-center space-y-4">
              <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto text-slate-700">
                <Smartphone size={40} />
              </div>
              <p className="text-xs font-black text-slate-500 uppercase tracking-[0.3em]">No hay solicitudes pendientes</p>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

