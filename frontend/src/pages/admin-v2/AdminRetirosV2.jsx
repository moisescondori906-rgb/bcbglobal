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
  Banknote,
  CreditCard
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
  const [summary, setSummary] = useState(null);
  const itemsPerPage = 8;

  useEffect(() => {
    fetchRetiros();
    fetchSummary();
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

  const fetchSummary = async () => {
    try {
      const data = await api.get('/admin/retiros/resumen-diario');
      setSummary(data);
    } catch (err) {
      console.error('Error fetching daily summary:', err);
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

  const handleTomar = async (id) => {
    try {
      await api.post(`/admin/retiros/${id}/tomar`);
      setList(l => l.map(r => r.id === id ? { ...r, estado_operativo: 'tomado', operador_nombre: 'Yo' } : r));
      alert('Caso tomado correctamente.');
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
    <div className="space-y-10 sm:space-y-14 pb-20">
      {/* Daily Summary Section */}
      {summary && (
        <div className="admin-card p-8 sm:p-10 relative group">
          <div className="absolute top-0 right-0 w-80 h-80 bg-rose-500 opacity-[0.02] rounded-bl-full pointer-events-none group-hover:opacity-[0.05] transition-all duration-1000 blur-3xl" />
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-10 relative z-10">
            <div className="flex items-center gap-5">
              <div className="p-4 rounded-[2rem] bg-rose-500/10 text-rose-500 border border-rose-500/20 shadow-xl shadow-rose-500/5">
                <Zap size={28} className="animate-pulse" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-white uppercase tracking-tighter italic leading-none mb-1">Financial Intelligence</h2>
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                  <p className="text-[10px] font-black text-admin-muted uppercase tracking-[0.3em] flex items-center gap-2">
                    Resumen Operativo: {formatDate(summary.fecha)}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-black/20 px-4 py-2 rounded-xl border border-white/5 flex items-center gap-3">
              <Clock size={14} className="text-zinc-500" />
              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Real-time Stats</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
            {[
              { label: 'Solicitado', val: summary.total_solicitado, color: 'text-white', bg: 'bg-white/[0.03]' },
              { label: 'Pagado Neto', val: summary.total_pagado_neto, color: 'text-emerald-500', bg: 'bg-emerald-500/5', border: 'border-emerald-500/10' },
              { label: 'Fee 15%', val: summary.total_descontado_15, color: 'text-rose-500', bg: 'bg-rose-500/5', border: 'border-rose-500/10' },
              { label: 'Ops 5%', val: summary.ganancia_operadores_5, color: 'text-blue-500', bg: 'bg-blue-500/5', border: 'border-blue-500/10' },
              { label: 'Net 10%', val: summary.comision_retiro_10, color: 'text-amber-500', bg: 'bg-amber-500/5', border: 'border-amber-500/10' },
              { label: 'Processed', val: summary.cantidad_procesados, color: 'text-white', bg: 'bg-white/[0.03]', isNum: true },
            ].map((item, i) => (
              <div key={i} className={`${item.bg} p-6 rounded-3xl border ${item.border || 'border-white/5'} shadow-inner group/item hover:scale-[1.02] hover:bg-black/40 transition-all duration-500`}>
                <p className="text-[9px] font-black text-admin-muted uppercase tracking-[0.2em] mb-2">{item.label}</p>
                <p className={`text-xl font-black ${item.color} tracking-tighter group-hover:scale-110 transition-transform origin-left`}>{item.isNum ? item.val : formatCurrency(item.val)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-8">
        <div className="space-y-2">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 rounded-[2rem] bg-gradient-to-tr from-rose-500 to-orange-600 text-white shadow-2xl shadow-rose-500/20 border border-white/10 flex items-center justify-center shrink-0">
              <Wallet size={28} />
            </div>
            <div>
              <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tighter uppercase italic leading-none">Liquidation Node</h1>
              <p className="text-[10px] font-black text-admin-muted uppercase tracking-[0.3em] mt-1 flex items-center gap-2">
                <ShieldCheck size={14} className="text-rose-500" /> Aprobación de retiros institucionales
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="relative group flex-1 min-w-[320px]">
            <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-rose-500 transition-colors" />
            <input 
              type="text" 
              placeholder="Buscar por usuario, ID o teléfono..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="admin-input !h-14 pl-14 !text-base !rounded-2xl shadow-inner"
            />
          </div>
          <div className="relative group min-w-[180px]">
            <Filter className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-rose-500 transition-colors" size={18} />
            <select 
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="admin-input !h-14 pl-14 appearance-none cursor-pointer !text-sm !rounded-2xl shadow-inner"
            >
              <option value="pendiente">Pendientes</option>
              <option value="pagado">Pagados</option>
              <option value="rechazado">Rechazados</option>
              <option value="all">Todos</option>
            </select>
          </div>
          <button 
            onClick={fetchRetiros}
            className="admin-button-secondary !h-14 !w-14 !p-0 !rounded-2xl shadow-xl active:scale-95"
          >
            <RefreshCw size={22} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Grid of Withdrawals */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        <AnimatePresence mode="popLayout">
          {loading ? (
            Array(8).fill(0).map((_, i) => (
              <div key={i} className="admin-card h-[420px] animate-pulse bg-white/[0.02]" />
            ))
          ) : paginatedList.length > 0 ? (
            paginatedList.map((r, index) => (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                transition={{ delay: index * 0.05, duration: 0.4 }}
                className="admin-card p-8 flex flex-col justify-between group hover:border-rose-500/40 hover:shadow-admin-glow transition-all duration-500 relative"
              >
                <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${r.estado === 'pagado' ? 'from-emerald-500 to-teal-500' : 'from-rose-500 to-orange-500'} opacity-[0.03] rounded-bl-full blur-2xl group-hover:opacity-[0.08] transition-opacity duration-700`} />

                <div className="space-y-8 relative z-10">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-white shadow-xl border border-white/10 shrink-0 transition-transform group-hover:scale-110 duration-500 ${r.estado === 'pagado' ? 'bg-emerald-600' : r.estado === 'rechazado' ? 'bg-rose-600' : 'bg-zinc-800'}`}>
                        {r.nombre_usuario?.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-base font-black text-white uppercase tracking-tighter truncate italic group-hover:text-rose-500 transition-colors">{r.nombre_usuario}</p>
                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">Node ID: {r.id.substring(0, 8)}</p>
                      </div>
                    </div>
                    <span className={`admin-badge shrink-0 ${
                      r.estado === 'pagado' ? 'admin-badge-success' :
                      r.estado === 'rechazado' ? 'admin-badge-error' :
                      'admin-badge-warning'
                    }`}>
                      {r.estado}
                    </span>
                  </div>

                  <div className="bg-white/[0.03] rounded-[2rem] p-8 border border-white/5 shadow-inner group-hover:bg-black/20 group-hover:border-white/10 transition-all duration-500 text-center">
                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] mb-3 flex items-center justify-center gap-2">
                      <Banknote size={14} className="text-rose-500" /> Monto a Liquidar
                    </p>
                    <div className="flex items-baseline justify-center gap-2">
                      <span className="text-4xl font-black text-white tracking-tighter italic group-hover:scale-110 transition-transform duration-500">{formatCurrency(r.monto)}</span>
                      <span className="text-[11px] font-black text-rose-500 uppercase tracking-widest italic opacity-70">Bs</span>
                    </div>
                  </div>

                  {r.estado_operativo === 'tomado' && (
                    <div className="flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 animate-pulse-subtle">
                      <ShieldCheck size={16} className="text-blue-500" />
                      <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Operador: {r.operador_nombre}</p>
                    </div>
                  )}

                  <div className="space-y-4">
                    {(() => {
                      try {
                        const db = typeof r.datos_bancarios === 'string' ? JSON.parse(r.datos_bancarios) : r.datos_bancarios;
                        return (
                          <div className="p-5 rounded-2xl bg-black/20 border border-white/5 hover:border-white/10 transition-all group-hover:shadow-lg">
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em]">{db?.nombre_banco || 'ENTIDAD BANCARIA'}</span>
                              <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-500">
                                <CreditCard size={12} />
                              </div>
                            </div>
                            <p className="text-sm font-black text-white tracking-[0.15em] mb-1 truncate">{db?.numero_cuenta || '—'}</p>
                            <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest truncate">{db?.nombre_titular || '—'}</p>
                          </div>
                        );
                      } catch (e) {
                        return (
                          <div className="p-5 rounded-2xl bg-rose-500/5 border border-rose-500/10 flex items-center gap-3">
                            <AlertTriangle size={18} className="text-rose-500" />
                            <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Error de Datos</p>
                          </div>
                        );
                      }
                    })()}
                  </div>
                </div>

                <div className="mt-10 space-y-5 relative z-10">
                  {r.estado === 'pendiente' && (
                    <div className="flex flex-col gap-3">
                      {r.estado_operativo !== 'tomado' ? (
                        <button 
                          onClick={() => handleTomar(r.id)}
                          className="admin-button-secondary !h-14 w-full flex items-center justify-center gap-3 !bg-white/5 hover:!bg-admin-accent hover:!text-white group/btn transition-all duration-500"
                        >
                          <Zap size={16} className="text-rose-500 group-hover/btn:text-white transition-colors" /> Claim Node
                        </button>
                      ) : (
                        <div className="grid grid-cols-2 gap-4">
                          <button 
                            onClick={() => handleAprobar(r.id)}
                            className="admin-button-primary !h-14 !bg-emerald-600 hover:!bg-emerald-500 !shadow-emerald-600/20 flex items-center justify-center gap-2"
                          >
                            <CheckCircle2 size={16} /> Pay
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
                      <Phone size={10} className="text-rose-500" />
                      <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest italic">{r.telefono || '—'}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="col-span-full py-32 flex flex-col items-center justify-center opacity-20 gap-8">
              <div className="w-28 h-28 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700 shadow-2xl">
                <Wallet size={48} className="text-zinc-500" />
              </div>
              <p className="text-sm font-black uppercase tracking-[0.4em] text-zinc-500">No nodes waiting for liquidation</p>
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

      {/* Reject Modal Premium */}
      <AnimatePresence>
        {rejectId && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center p-4 z-[200]"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-admin-card border border-admin-border p-8 sm:p-12 rounded-[2.5rem] max-w-lg w-full shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-rose-500 to-orange-500 shadow-[0_0_15px_rgba(244,63,94,0.3)]" />
              
              <div className="flex items-center gap-5 mb-10">
                <div className="p-4 rounded-2xl bg-rose-500/10 text-rose-500 border border-rose-500/20 shadow-lg shadow-rose-500/5">
                  <XCircle size={28} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-white uppercase tracking-tighter italic leading-none">Reject Liquidation</h3>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] mt-1">Caso ID: {rejectId.substring(0, 8)}</p>
                </div>
              </div>

              <div className="space-y-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1 italic">Motivo del Rechazo</label>
                  <textarea 
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    placeholder="Ej. Datos bancarios incorrectos, sospecha de fraude..."
                    className="admin-input !h-32 !py-5 !bg-black/20 !rounded-2xl !px-6 resize-none custom-scrollbar"
                    required
                  />
                  <p className="text-[8px] font-bold text-zinc-600 uppercase tracking-widest ml-2 italic">El usuario podrá ver este motivo en su panel.</p>
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    onClick={() => setRejectId(null)}
                    className="admin-button-secondary flex-1"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleRechazarSubmit}
                    className="admin-button-primary flex-1 !bg-rose-600 !shadow-rose-600/20"
                  >
                    Confirmar Rechazo
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
