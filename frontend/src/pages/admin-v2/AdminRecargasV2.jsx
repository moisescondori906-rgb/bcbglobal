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
      setList(l => l.map(r => r.id === id ? { ...r, estado: 'completada' } : r));
    } catch (err) {
      alert(err.message);
    }
  };

  const handleTomar = async (id) => {
    try {
      await api.post(`/admin/recargas/${id}/tomar`);
      setList(l => l.map(r => r.id === id ? { ...r, estado_operativo: 'tomado', operador_nombre: 'Yo' } : r));
      alert('Caso tomado correctamente.');
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
    const matchesSearch = r.nombre_usuario?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          r.id.toString().includes(searchTerm);
    const matchesStatus = filterStatus === 'all' || r.estado === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const paginatedList = filteredList.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(filteredList.length / itemsPerPage);

  return (
    <div className="space-y-10 sm:space-y-14 pb-20">
      {/* Header Section */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-8">
        <div className="space-y-2">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 rounded-[2rem] bg-gradient-to-tr from-emerald-500 to-teal-600 text-white shadow-2xl shadow-emerald-500/20 border border-white/10 flex items-center justify-center shrink-0">
              <CreditCard size={28} />
            </div>
            <div>
              <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tighter uppercase italic leading-none">Inbound Capital</h1>
              <p className="text-[10px] font-black text-admin-muted uppercase tracking-[0.3em] mt-1 flex items-center gap-2">
                <ShieldCheck size={14} className="text-emerald-500" /> Verificación de ingresos institucionales
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="relative group flex-1 min-w-[320px]">
            <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-emerald-500 transition-colors" />
            <input 
              type="text" 
              placeholder="Buscar por usuario, ID o teléfono..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="admin-input !h-14 pl-14 !text-base !rounded-2xl shadow-inner"
            />
          </div>
          <div className="relative group min-w-[180px]">
            <Filter className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-emerald-500 transition-colors" size={18} />
            <select 
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="admin-input !h-14 pl-14 appearance-none cursor-pointer !text-sm !rounded-2xl shadow-inner"
            >
              <option value="pendiente">Pendientes</option>
              <option value="completada">Aprobadas</option>
              <option value="rechazada">Rechazadas</option>
              <option value="all">Todo</option>
            </select>
          </div>
          <button 
            onClick={fetchRecargas}
            className="admin-button-secondary !h-14 !w-14 !p-0 !rounded-2xl shadow-xl active:scale-95"
          >
            <RefreshCw size={22} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Stats Quick View */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Waitlist', value: list.filter(r => r.estado === 'pendiente').length, color: 'text-amber-500', bg: 'bg-amber-500/5', border: 'border-amber-500/10' },
          { label: 'Verified', value: list.filter(r => r.estado === 'completada' || r.estado === 'aprobada').length, color: 'text-emerald-500', bg: 'bg-emerald-500/5', border: 'border-emerald-500/10' },
          { label: 'Discarded', value: list.filter(r => r.estado === 'rechazada').length, color: 'text-rose-500', bg: 'bg-rose-500/5', border: 'border-rose-500/10' },
          { label: 'Daily Ops', value: list.length, color: 'text-admin-accent', bg: 'bg-admin-accent/5', border: 'border-admin-accent/10' },
        ].map((stat, i) => (
          <div key={i} className={`admin-card p-6 sm:p-8 flex flex-col gap-2 ${stat.bg} ${stat.border}`}>
            <span className="text-[10px] font-black text-admin-muted uppercase tracking-[0.2em]">{stat.label}</span>
            <span className={`text-3xl sm:text-4xl font-black ${stat.color} tracking-tighter`}>{stat.value}</span>
          </div>
        ))}
      </div>

      {/* Grid of Recharge Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        <AnimatePresence mode="popLayout">
          {loading ? (
            Array(8).fill(0).map((_, i) => (
              <div key={i} className="admin-card h-[400px] animate-pulse bg-white/[0.02]" />
            ))
          ) : paginatedList.length > 0 ? (
            paginatedList.map((r, index) => (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                transition={{ delay: index * 0.05, duration: 0.4 }}
                className="admin-card p-8 flex flex-col justify-between group hover:border-emerald-500/40 hover:shadow-admin-glow transition-all duration-500 relative"
              >
                <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${r.estado === 'completada' || r.estado === 'aprobada' ? 'from-emerald-500 to-teal-500' : 'from-rose-500 to-orange-500'} opacity-[0.03] rounded-bl-full blur-2xl group-hover:opacity-[0.08] transition-opacity duration-700`} />

                <div className="space-y-8 relative z-10">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-white shadow-xl border border-white/10 shrink-0 transition-transform group-hover:scale-110 duration-500 ${r.estado === 'completada' || r.estado === 'aprobada' ? 'bg-emerald-600' : r.estado === 'rechazada' ? 'bg-rose-600' : 'bg-zinc-800'}`}>
                        {r.nombre_usuario?.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-base font-black text-white uppercase tracking-tighter italic group-hover:text-emerald-500 transition-colors">{r.nombre_usuario}</p>
                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">Node ID: {r.id.substring(0, 8)}</p>
                      </div>
                    </div>
                    <span className={`admin-badge shrink-0 ${
                      r.estado === 'completada' || r.estado === 'aprobada' ? 'admin-badge-success' :
                      r.estado === 'rechazada' ? 'admin-badge-error' :
                      'admin-badge-warning'
                    }`}>
                      {r.estado === 'completada' || r.estado === 'aprobada' ? 'Verified' : r.estado}
                    </span>
                  </div>

                  <div className="bg-white/[0.03] rounded-[2rem] p-8 border border-white/5 shadow-inner group-hover:bg-black/20 group-hover:border-white/10 transition-all duration-500 text-center">
                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] mb-3 flex items-center justify-center gap-2">
                      <Zap size={14} className="text-emerald-500" /> Inyección de Capital
                    </p>
                    <div className="flex items-baseline justify-center gap-2">
                      <span className="text-4xl font-black text-white tracking-tighter italic group-hover:scale-110 transition-transform duration-500">{formatCurrency(r.monto)}</span>
                      <span className="text-[11px] font-black text-emerald-500 uppercase tracking-widest italic opacity-70">Bs</span>
                    </div>
                  </div>

                  {r.estado_operativo === 'tomado' && (
                    <div className="flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 animate-pulse-subtle">
                      <ShieldCheck size={16} className="text-blue-500" />
                      <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest truncate">Operador: {r.operador_nombre}</p>
                    </div>
                  )}

                  <div className="space-y-4">
                    {r.comprobante_url ? (
                      <a 
                        href={api.getMediaUrl(r.comprobante_url)} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="flex items-center justify-center gap-3 w-full h-14 rounded-2xl bg-white/5 border border-white/5 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 hover:bg-emerald-500 hover:text-white hover:border-emerald-500 transition-all duration-500 group/btn shadow-xl"
                      >
                        <ImageIcon size={18} className="group-hover/btn:scale-110 group-hover/btn:rotate-6 transition-transform" /> 
                        Ver Comprobante
                      </a>
                    ) : (
                      <div className="flex items-center justify-center gap-3 w-full h-14 rounded-2xl bg-white/[0.01] border border-dashed border-white/5 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">
                        <AlertTriangle size={18} /> Sin Comprobante
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-10 space-y-5 relative z-10">
                  {r.estado === 'pendiente' && (
                    <div className="flex flex-col gap-3">
                      {r.estado_operativo !== 'tomado' ? (
                        <button 
                          onClick={() => handleTomar(r.id)}
                          className="admin-button-secondary !h-14 w-full flex items-center justify-center gap-3 !bg-white/5 hover:!bg-emerald-500 hover:!text-white group/btn transition-all duration-500"
                        >
                          <Zap size={16} className="text-emerald-500 group-hover/btn:text-white transition-colors" /> Claim Node
                        </button>
                      ) : (
                        <div className="grid grid-cols-2 gap-4">
                          <button 
                            onClick={() => handleAprobar(r.id)}
                            className="admin-button-primary !h-14 !bg-emerald-600 hover:!bg-emerald-500 !shadow-emerald-600/20 flex items-center justify-center gap-2"
                          >
                            <CheckCircle2 size={16} /> Approve
                          </button>
                          <button 
                            onClick={() => setRejectId(r.id)}
                            className="admin-button-secondary !h-14 !text-rose-500 hover:!bg-rose-500 hover:!text-white border-rose-500/20 flex items-center justify-center gap-2"
                          >
                            <XCircle size={16} /> Reject
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between px-2 pt-2 border-t border-white/5 opacity-50 group-hover:opacity-100 transition-opacity">
                    <div className="flex items-center gap-2">
                      <Clock size={12} className="text-zinc-500" />
                      <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">{formatDate(r.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <ShieldCheck size={10} className="text-emerald-500" />
                      <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest italic">{r.modo}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="col-span-full py-32 flex flex-col items-center justify-center opacity-20 gap-8">
              <div className="w-28 h-28 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700 shadow-2xl">
                <CreditCard size={48} className="text-zinc-500" />
              </div>
              <p className="text-sm font-black uppercase tracking-[0.4em] text-zinc-500">No nodes waiting for verification</p>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Pagination Premium */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-10 border-t border-white/5">
        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">
          Page <span className="text-white">{currentPage}</span> of <span className="text-white">{totalPages}</span> — Showing <span className="text-white">{filteredList.length}</span> nodes
        </p>
        <div className="flex items-center gap-2">
          <button 
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(prev => prev - 1)}
            className="admin-button-secondary !h-12 !w-12 !p-0 !rounded-xl disabled:opacity-20 shadow-xl"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="flex items-center gap-1.5 px-3 py-1 bg-white/[0.03] rounded-xl border border-white/5">
            {[...Array(Math.min(5, totalPages))].map((_, i) => {
              let pageNum = i + 1;
              if (totalPages > 5 && currentPage > 3) {
                pageNum = currentPage - 2 + i;
                if (pageNum > totalPages) pageNum = totalPages - (4 - i);
              }
              if (pageNum <= 0) return null;
              if (pageNum > totalPages) return null;
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-10 h-10 rounded-lg text-[11px] font-black transition-all ${currentPage === pageNum ? 'bg-admin-accent text-white shadow-lg shadow-admin-accent/20 scale-110' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>
          <button 
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(prev => prev + 1)}
            className="admin-button-secondary !h-12 !w-12 !p-0 !rounded-xl disabled:opacity-20 shadow-xl"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

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
