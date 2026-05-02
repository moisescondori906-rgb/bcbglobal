import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Wallet, 
  Search, 
  Filter, 
  CheckCircle2, 
  XCircle, 
  ExternalLink, 
  Clock, 
  RefreshCw,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Phone,
  Banknote
} from 'lucide-react';
import { api } from '../../lib/api';
import { formatCurrency, formatDate } from '../../utils/format';

export default function AdminRetirosV2() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('pendiente');
  const [rejectId, setRejectId] = useState(null);
  const [motivo, setMotivo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  useEffect(() => {
    fetchRetiros();
  }, []);

  const fetchRetiros = async () => {
    setLoading(true);
    try {
      const data = await api.admin.retiros();
      setList(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching withdrawals:', err);
      setList([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAprobar = async (id) => {
    if (!confirm('¿Seguro que quieres aprobar y pagar este retiro institucional?')) return;
    try {
      await api.admin.aprobarRetiro(id);
      setList(l => l.map(r => r.id === id ? { ...r, estado: 'pagado' } : r));
    } catch (err) {
      alert(err.message);
    }
  };

  const handleRechazarSubmit = async () => {
    if (!motivo.trim()) return alert('Por favor ingresa un motivo');
    try {
      await api.admin.rechazarRetiro(rejectId, motivo);
      setList(l => l.map(r => r.id === rejectId ? { ...r, estado: 'rechazado' } : r));
      setRejectId(null);
      setMotivo('');
    } catch (err) {
      alert(err.message);
    }
  };

  const filteredList = list.filter(r => {
    const matchesSearch = r.nombre_usuario?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          r.id.toString().includes(searchTerm) ||
                          r.telefono?.includes(searchTerm);
    const matchesStatus = filterStatus === 'all' || r.estado === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const paginatedList = filteredList.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(filteredList.length / itemsPerPage);

  return (
    <div className="space-y-6 sm:space-y-10">
      {/* Header Section */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 sm:gap-8">
        <div className="space-y-2">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-rose-500 to-orange-600 text-white shadow-xl shadow-rose-500/20">
              <Wallet size={20} className="sm:w-[24px] sm:h-[24px]" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tighter uppercase italic leading-none">Institutional Withdrawals</h1>
              <p className="text-[8px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] sm:tracking-[0.3em] flex items-center gap-2">
                <ShieldCheck size={12} className="text-rose-500 sm:w-[14px] sm:h-[14px]" /> Liquidación de beneficios
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          <div className="relative group flex-1 min-w-[250px] sm:min-w-[300px]">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-rose-500 transition-colors sm:w-[18px] sm:h-[18px]" />
            <input 
              type="text" 
              placeholder="Buscar por usuario o ID..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#161926] border border-white/5 rounded-xl sm:rounded-2xl py-3 sm:py-4 pl-10 sm:pl-12 pr-4 sm:pr-6 text-[10px] sm:text-xs font-bold text-white outline-none focus:border-rose-500/30 transition-all shadow-2xl"
            />
          </div>
          <select 
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="flex-1 sm:flex-none bg-[#161926] border border-white/5 rounded-xl sm:rounded-2xl py-3 sm:py-4 px-4 sm:px-6 text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-300 outline-none focus:border-rose-500/30 transition-all shadow-2xl appearance-none cursor-pointer"
          >
            <option value="pendiente">Pendientes</option>
            <option value="pagado">Pagados</option>
            <option value="rechazado">Rechazados</option>
            <option value="all">Todo</option>
          </select>
          <button 
            onClick={fetchRetiros}
            className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white/5 border border-white/5 text-slate-400 hover:text-white transition-all shadow-2xl"
          >
            <RefreshCw size={18} className={`${loading ? 'animate-spin' : ''} sm:w-[20px] sm:h-[20px]`} />
          </button>
        </div>
      </div>

      {/* List of Withdrawals */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <AnimatePresence mode="popLayout">
          {loading ? (
            Array(8).fill(0).map((_, i) => (
              <div key={i} className="bg-[#161926] border border-white/5 h-80 rounded-[40px] animate-pulse" />
            ))
          ) : paginatedList.length > 0 ? (
            paginatedList.map((r, index) => (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: index * 0.05 }}
                className="bg-[#161926] border border-white/5 p-8 rounded-[40px] flex flex-col justify-between group hover:border-rose-500/20 transition-all duration-500 shadow-xl shadow-black/20 relative overflow-hidden"
              >
                <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${r.estado === 'pagado' ? 'from-emerald-500 to-teal-500' : 'from-rose-500 to-orange-500'} opacity-[0.03] rounded-bl-full`} />

                <div className="space-y-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center font-black text-rose-500 border border-white/5 shadow-inner">
                        {r.nombre_usuario?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-black text-white uppercase tracking-tighter truncate w-24">{r.nombre_usuario}</p>
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Withdrawal ID: {r.id.substring(0, 8)}...</p>
                      </div>
                    </div>
                    <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border ${
                      r.estado === 'pagado' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 shadow-lg shadow-emerald-500/5' :
                      r.estado === 'rechazado' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20 shadow-lg shadow-rose-500/5' :
                      'bg-amber-500/10 text-amber-500 border-amber-500/20 shadow-lg shadow-amber-500/5'
                    }`}>
                      {r.estado}
                    </span>
                  </div>

                  <div className="bg-[#0f111a] rounded-[30px] p-6 border border-white/5 shadow-inner">
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                      <DollarSign size={10} className="text-rose-500" /> Amount to Pay
                    </p>
                    <div className="flex items-end gap-1.5">
                      <span className="text-3xl font-black text-white tracking-tighter">{formatCurrency(r.monto)}</span>
                      <span className="text-[11px] font-bold text-rose-500 mb-1.5 uppercase tracking-widest italic">BOB</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {(() => {
                      try {
                        const db = typeof r.datos_bancarios === 'string' ? JSON.parse(r.datos_bancarios) : r.datos_bancarios;
                        return (
                          <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/5">
                            <div className="p-2 rounded-xl bg-white/5 text-slate-400">
                              <Banknote size={14} />
                            </div>
                            <div>
                              <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-0.5">{db?.nombre_banco || 'BANCO'}</p>
                              <p className="text-xs font-black text-white uppercase tracking-tight italic">{db?.nombre_titular || 'Sin Titular'}</p>
                              <p className="text-[10px] font-black text-rose-500 tracking-widest">{db?.numero_cuenta || 'S/N'}</p>
                            </div>
                          </div>
                        );
                      } catch (e) {
                        return <p className="text-[10px] text-rose-500">Error en datos bancarios</p>;
                      }
                    })()}
                  </div>
                </div>

                {r.estado === 'pendiente' && (
                  <div className="grid grid-cols-2 gap-4 mt-8">
                    <button 
                      onClick={() => handleAprobar(r.id)}
                      className="flex items-center justify-center gap-2 py-4 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white text-[10px] font-black uppercase tracking-widest shadow-xl shadow-emerald-500/20 hover:scale-[1.02] active:scale-95 transition-all"
                    >
                      <CheckCircle2 size={16} /> Pay
                    </button>
                    <button 
                      onClick={() => setRejectId(r.id)}
                      className="flex items-center justify-center gap-2 py-4 rounded-2xl bg-white/5 border border-white/10 text-rose-500 text-[10px] font-black uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all shadow-xl"
                    >
                      <XCircle size={16} /> Reject
                    </button>
                  </div>
                )}
                
                <div className="mt-6 flex items-center justify-between opacity-50">
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                    <Clock size={12} /> {formatDate(r.created_at)}
                  </p>
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest italic">Live Check</p>
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="col-span-full py-32 flex flex-col items-center gap-6 opacity-30">
              <Zap size={80} className="text-slate-500" />
              <p className="text-xs font-black uppercase tracking-widest text-slate-500">No hay retiros pendientes de liquidación</p>
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
            className="p-4 rounded-2xl bg-[#161926] border border-white/5 text-slate-400 hover:text-white disabled:opacity-20 transition-all shadow-xl"
          >
            <ChevronLeft size={24} />
          </button>
          <div className="px-10 py-4 rounded-2xl bg-sav-primary text-white text-xs font-black uppercase tracking-[0.2em] shadow-2xl shadow-sav-primary/20 border border-white/10">
            Página {currentPage} de {totalPages}
          </div>
          <button 
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(prev => prev + 1)}
            className="p-4 rounded-2xl bg-[#161926] border border-white/5 text-slate-400 hover:text-white disabled:opacity-20 transition-all shadow-xl"
          >
            <ChevronRight size={24} />
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
            className="fixed inset-0 bg-black/90 backdrop-blur-2xl flex items-center justify-center p-6 z-[200]"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 30 }}
              className="bg-[#161926] border border-white/10 p-12 rounded-[50px] max-w-lg w-full shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-rose-600 to-orange-600 shadow-lg shadow-rose-600/50" />
              
              <div className="flex items-center gap-6 mb-10">
                <div className="p-4 rounded-[2rem] bg-rose-500/10 text-rose-500 border border-rose-500/20 shadow-inner">
                  <AlertTriangle size={32} />
                </div>
                <div>
                  <h3 className="text-3xl font-black text-white uppercase tracking-tighter italic">Rechazo de Liquidación</h3>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Protocolo de Seguridad Institucional</p>
                </div>
              </div>

              <div className="space-y-3 mb-10">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2 flex items-center gap-2">
                   Motivo Técnico del Rechazo <Banknote size={10} />
                </label>
                <textarea
                  autoFocus
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  className="w-full px-8 py-6 rounded-[35px] bg-[#0f111a] border border-white/5 focus:outline-none focus:border-rose-500/30 text-xs font-bold text-white min-h-[180px] transition-all resize-none shadow-inner custom-scrollbar"
                  placeholder="Ej: Número de cuenta inválido o actividad sospechosa..."
                />
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => setRejectId(null)} 
                  className="flex-1 px-8 py-5 rounded-[25px] bg-white/5 text-slate-400 font-black text-[11px] uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all border border-white/5"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleRechazarSubmit} 
                  className="flex-1 px-8 py-5 rounded-[25px] bg-rose-600 text-white font-black text-[11px] uppercase tracking-widest hover:bg-rose-500 transition-all shadow-2xl shadow-rose-600/30 active:scale-95"
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
