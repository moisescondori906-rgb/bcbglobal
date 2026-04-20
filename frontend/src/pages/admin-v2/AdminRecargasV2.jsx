import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CreditCard, 
  Search, 
  Filter, 
  CheckCircle2, 
  XCircle, 
  ExternalLink, 
  Clock, 
  RefreshCw,
  Image as ImageIcon,
  User,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Zap,
  DollarSign
} from 'lucide-react';
import { api } from '../../lib/api';
import { formatCurrency, formatDate } from '../../utils/format';

export default function AdminRecargasV2() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('pendiente');
  const [rejectId, setRejectId] = useState(null);
  const [motivo, setMotivo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  useEffect(() => {
    fetchRecargas();
  }, []);

  const fetchRecargas = async () => {
    setLoading(true);
    try {
      const data = await api.admin.recargas();
      setList(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching recharges:', err);
      setList([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAprobar = async (id) => {
    if (!confirm('¿Seguro que quieres aprobar esta recarga institucional?')) return;
    try {
      await api.admin.aprobarRecarga(id);
      setList(l => l.map(r => r.id === id ? { ...r, estado: 'aprobada' } : r));
    } catch (err) {
      alert(err.message);
    }
  };

  const handleRechazarSubmit = async () => {
    if (!motivo.trim()) return alert('Por favor ingresa un motivo');
    try {
      await api.admin.rechazarRecarga(rejectId, motivo);
      setList(l => l.map(r => r.id === rejectId ? { ...r, estado: 'rechazada' } : r));
      setRejectId(null);
      setMotivo('');
    } catch (err) {
      alert(err.message);
    }
  };

  const filteredList = list.filter(r => {
    const matchesSearch = r.usuario?.nombre_usuario?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          r.id.toString().includes(searchTerm);
    const matchesStatus = filterStatus === 'all' || r.estado === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const paginatedList = filteredList.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(filteredList.length / itemsPerPage);

  return (
    <div className="space-y-10">
      {/* Header Section */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-8">
        <div className="space-y-2">
          <div className="flex items-center gap-4">
            <div className="p-3.5 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white shadow-xl shadow-emerald-500/20">
              <CreditCard size={24} />
            </div>
            <div>
              <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic">Institutional Recharges</h1>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] flex items-center gap-2">
                <ShieldCheck size={14} className="text-emerald-500" /> Verificación de ingresos BCB Global
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="relative group flex-1 min-w-[300px]">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-emerald-500 transition-colors" />
            <input 
              type="text" 
              placeholder="Buscar por usuario o ID..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#161926] border border-white/5 rounded-2xl py-4 pl-12 pr-6 text-xs font-bold text-white outline-none focus:border-emerald-500/30 transition-all shadow-2xl"
            />
          </div>
          <select 
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-[#161926] border border-white/5 rounded-2xl py-4 px-6 text-[10px] font-black uppercase tracking-widest text-slate-300 outline-none focus:border-emerald-500/30 transition-all shadow-2xl appearance-none cursor-pointer"
          >
            <option value="pendiente">Solo Pendientes</option>
            <option value="aprobada">Aprobadas</option>
            <option value="rechazada">Rechazadas</option>
            <option value="all">Todo el Historial</option>
          </select>
          <button 
            onClick={fetchRecargas}
            className="p-4 rounded-2xl bg-white/5 border border-white/5 text-slate-400 hover:text-white transition-all shadow-2xl"
          >
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Grid de Recargas (Cards Modernos) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <AnimatePresence mode="popLayout">
          {loading ? (
            Array(8).fill(0).map((_, i) => (
              <div key={i} className="bg-[#161926] border border-white/5 h-64 rounded-[30px] animate-pulse" />
            ))
          ) : paginatedList.length > 0 ? (
            paginatedList.map((r, index) => (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: index * 0.05 }}
                className="bg-[#161926] border border-white/5 p-6 rounded-[30px] flex flex-col justify-between group hover:border-emerald-500/20 transition-all duration-500 shadow-xl shadow-black/20"
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center font-black text-emerald-500 border border-white/5">
                        {r.usuario?.nombre_usuario?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-xs font-black text-white uppercase tracking-tighter truncate w-24">{r.usuario?.nombre_usuario}</p>
                        <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">ID: {r.id}</p>
                      </div>
                    </div>
                    <span className={`px-3 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest border ${
                      r.estado === 'aprobada' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                      r.estado === 'rechazada' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' :
                      'bg-amber-500/10 text-amber-500 border-amber-500/20'
                    }`}>
                      {r.estado}
                    </span>
                  </div>

                  <div className="bg-[#0f111a] rounded-2xl p-4 border border-white/5">
                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Monto Depositado</p>
                    <div className="flex items-end gap-1">
                      <span className="text-2xl font-black text-white tracking-tighter">{formatCurrency(r.monto)}</span>
                      <span className="text-[10px] font-bold text-emerald-500 mb-1 uppercase tracking-widest italic">BOB</span>
                    </div>
                  </div>

                  {r.comprobante_url ? (
                    <a 
                      href={r.comprobante_url} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-white/5 border border-white/5 text-[9px] font-black uppercase tracking-widest text-slate-400 hover:bg-emerald-500 hover:text-white transition-all group"
                    >
                      <ImageIcon size={14} className="group-hover:animate-bounce" /> Ver Comprobante
                    </a>
                  ) : (
                    <div className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-white/[0.02] border border-dashed border-white/5 text-[9px] font-black uppercase tracking-widest text-slate-600">
                      <AlertTriangle size={14} /> Sin Imagen
                    </div>
                  )}
                </div>

                {r.estado === 'pendiente' && (
                  <div className="grid grid-cols-2 gap-3 mt-6">
                    <button 
                      onClick={() => handleAprobar(r.id)}
                      className="flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-emerald-500 text-white text-[9px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:scale-[1.02] active:scale-95 transition-all"
                    >
                      <CheckCircle2 size={14} /> Aprobar
                    </button>
                    <button 
                      onClick={() => setRejectId(r.id)}
                      className="flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-white/5 border border-white/5 text-rose-500 text-[9px] font-black uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all"
                    >
                      <XCircle size={14} /> Rechazar
                    </button>
                  </div>
                )}
                
                <div className="mt-4 flex items-center justify-between opacity-40">
                  <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1">
                    <Clock size={10} /> {formatDate(r.created_at)}
                  </p>
                  <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest italic">{r.modo}</p>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="col-span-full py-32 flex flex-col items-center gap-6 opacity-30">
              <Zap size={80} className="text-slate-500" />
              <p className="text-xs font-black uppercase tracking-widest text-slate-500">No hay registros pendientes</p>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 pt-10">
          <button 
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(prev => prev - 1)}
            className="p-4 rounded-2xl bg-white/5 border border-white/5 text-slate-400 hover:text-white disabled:opacity-20 transition-all shadow-xl"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="px-8 py-4 rounded-2xl bg-[#161926] border border-white/5 text-[10px] font-black uppercase tracking-widest text-white shadow-xl">
            Página {currentPage} de {totalPages}
          </div>
          <button 
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(prev => prev + 1)}
            className="p-4 rounded-2xl bg-white/5 border border-white/5 text-slate-400 hover:text-white disabled:opacity-20 transition-all shadow-xl"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      )}

      {/* Modal Rechazo V2 */}
      <AnimatePresence>
        {rejectId && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center p-6 z-[200]"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-[#161926] border border-white/10 p-10 rounded-[40px] max-w-lg w-full shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-rose-500 to-orange-500" />
              
              <div className="flex items-center gap-4 mb-8">
                <div className="p-3 rounded-2xl bg-rose-500/10 text-rose-500 border border-rose-500/20">
                  <AlertTriangle size={24} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-white uppercase tracking-tighter italic">Rechazo Institucional</h3>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">BCB Global Security System</p>
                </div>
              </div>

              <div className="space-y-2 mb-8">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Motivo del rechazo (Visible al usuario)</label>
                <textarea
                  autoFocus
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  className="w-full px-6 py-5 rounded-3xl bg-[#0f111a] border border-white/5 focus:outline-none focus:border-rose-500/30 text-xs font-bold text-white min-h-[150px] transition-all resize-none shadow-inner"
                  placeholder="Ej: Comprobante ilegible o falso detectado..."
                />
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => setRejectId(null)} 
                  className="flex-1 px-8 py-5 rounded-2xl bg-white/5 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleRechazarSubmit} 
                  className="flex-1 px-8 py-5 rounded-2xl bg-rose-600 text-white font-black text-[10px] uppercase tracking-widest hover:bg-rose-500 transition-all shadow-xl shadow-rose-600/20 active:scale-95"
                >
                  Confirmar Rechazo
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
