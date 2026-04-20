import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, 
  ShieldCheck, 
  Plus, 
  Trash2, 
  Edit3, 
  Save, 
  X, 
  Clock, 
  Zap, 
  RefreshCw,
  Target,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Info
} from 'lucide-react';
import { api } from '../../lib/api';

export default function AdminCalendarioV2() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingDay, setEditingDay] = useState(null);
  const [form, setForm] = useState({
    fecha: new Date().toISOString().split('T')[0],
    tareas_habilitadas: true,
    retiros_habilitados: true,
    recargas_habilitadas: true,
    motivo: '',
    reglas_niveles: {}
  });

  useEffect(() => {
    fetchCalendario();
  }, []);

  const fetchCalendario = async () => {
    setLoading(true);
    try {
      const res = await api.admin.calendario();
      setList(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.admin.crearCalendario(form);
      setShowModal(false);
      fetchCalendario();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleDelete = async (fecha) => {
    if (!confirm('¿Eliminar regla especial para esta fecha?')) return;
    try {
      await api.admin.eliminarCalendario(fecha);
      fetchCalendario();
    } catch (err) {
      alert('Error');
    }
  };

  return (
    <div className="space-y-10">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-8">
        <div className="space-y-2">
          <div className="flex items-center gap-4">
            <div className="p-3.5 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 text-white shadow-xl">
              <Calendar size={24} />
            </div>
            <div>
              <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic">Operational Calendar</h1>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] flex items-center gap-2">
                <ShieldCheck size={14} className="text-amber-500" /> Control de operatividad por fechas especiales
              </p>
            </div>
          </div>
        </div>

        <button 
          onClick={() => { setEditingDay(null); setForm({ fecha: new Date().toISOString().split('T')[0], tareas_habilitadas: true, retiros_habilitados: true, recargas_habilitadas: true, motivo: '', reglas_niveles: {} }); setShowModal(true); }}
          className="flex items-center gap-2 px-8 py-4 rounded-2xl bg-sav-primary text-white text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-xl"
        >
          <Plus size={18} /> Add Exception Day
        </button>
      </div>

      <div className="bg-[#161926] border border-white/5 rounded-[45px] shadow-2xl overflow-hidden">
        <div className="p-10 border-b border-white/5 bg-white/[0.01] flex items-center justify-between">
           <h3 className="text-xl font-black text-white uppercase tracking-tighter italic">Exceptions & Maintenance</h3>
           <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <Info size={14} className="text-amber-500" />
              <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest">Las fechas no listadas siguen las reglas por nivel</span>
           </div>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/5">
                <th className="px-10 py-6 text-[9px] font-black text-slate-500 uppercase tracking-widest">Fecha / Evento</th>
                <th className="px-10 py-6 text-[9px] font-black text-slate-500 uppercase tracking-widest">Tareas</th>
                <th className="px-10 py-6 text-[9px] font-black text-slate-500 uppercase tracking-widest">Retiros</th>
                <th className="px-10 py-6 text-[9px] font-black text-slate-500 uppercase tracking-widest">Recargas</th>
                <th className="px-10 py-6 text-[9px] font-black text-slate-500 uppercase tracking-widest text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {list.map((day) => (
                <tr key={day.fecha} className="hover:bg-white/[0.01] transition-colors group">
                  <td className="px-10 py-6">
                    <div className="space-y-1">
                      <p className="text-sm font-black text-white uppercase tracking-tight italic">{new Date(day.fecha).toLocaleDateString('es-BO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                      <p className="text-[9px] font-bold text-amber-500 uppercase tracking-widest">{day.motivo || 'Día de mantenimiento'}</p>
                    </div>
                  </td>
                  <td className="px-10 py-6">
                    <div className={`px-4 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest border w-fit ${day.tareas_habilitadas ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border-rose-500/20'}`}>
                      {day.tareas_habilitadas ? 'Habilitado' : 'Suspendido'}
                    </div>
                  </td>
                  <td className="px-10 py-6">
                    <div className={`px-4 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest border w-fit ${day.retiros_habilitados ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border-rose-500/20'}`}>
                      {day.retiros_habilitados ? 'Habilitado' : 'Suspendido'}
                    </div>
                  </td>
                  <td className="px-10 py-6">
                    <div className={`px-4 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest border w-fit ${day.recargas_habilitadas ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border-rose-500/20'}`}>
                      {day.recargas_habilitadas ? 'Habilitado' : 'Suspendido'}
                    </div>
                  </td>
                  <td className="px-10 py-6 text-right">
                    <button onClick={() => handleDelete(day.fecha)} className="p-3 rounded-xl bg-white/5 text-rose-500 border border-white/5 hover:bg-rose-500 hover:text-white transition-all shadow-lg">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {list.length === 0 && !loading && (
                <tr>
                  <td colSpan="5" className="px-10 py-20 text-center opacity-30">
                    <Zap size={60} className="mx-auto mb-4 text-slate-500" />
                    <p className="text-xs font-black uppercase tracking-widest">No hay fechas especiales configuradas</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {showModal && (
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
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-amber-500 to-orange-600 shadow-lg shadow-amber-500/50" />
              
              <h3 className="text-3xl font-black text-white uppercase tracking-tighter italic mb-8">Exception Protocol</h3>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 italic">Target Date</label>
                  <input 
                    type="date" 
                    value={form.fecha} 
                    onChange={e => setForm({...form, fecha: e.target.value})}
                    className="w-full bg-[#0f111a] border border-white/5 rounded-2xl px-6 py-4 text-xs font-black text-white outline-none focus:border-amber-500/30 shadow-inner"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 italic">Operational Reason</label>
                  <input 
                    type="text" 
                    value={form.motivo} 
                    onChange={e => setForm({...form, motivo: e.target.value})}
                    placeholder="Mantenimiento preventivo..."
                    className="w-full bg-[#0f111a] border border-white/5 rounded-2xl px-6 py-4 text-xs font-black text-white outline-none focus:border-amber-500/30 shadow-inner"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div className="p-4 rounded-2xl bg-[#0f111a] border border-white/5 flex items-center justify-between">
                    <span className="text-[10px] font-black text-white uppercase tracking-widest">Tareas Habilitadas</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" checked={form.tareas_habilitadas} onChange={e => setForm({...form, tareas_habilitadas: e.target.checked})} />
                      <div className="w-11 h-6 bg-slate-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-amber-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all shadow-lg" />
                    </label>
                  </div>
                  <div className="p-4 rounded-2xl bg-[#0f111a] border border-white/5 flex items-center justify-between">
                    <span className="text-[10px] font-black text-white uppercase tracking-widest">Retiros Habilitados</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" checked={form.retiros_habilitados} onChange={e => setForm({...form, retiros_habilitados: e.target.checked})} />
                      <div className="w-11 h-6 bg-slate-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-amber-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all shadow-lg" />
                    </label>
                  </div>
                  <div className="p-4 rounded-2xl bg-[#0f111a] border border-white/5 flex items-center justify-between">
                    <span className="text-[10px] font-black text-white uppercase tracking-widest">Recargas Habilitadas</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" checked={form.recargas_habilitadas} onChange={e => setForm({...form, recargas_habilitadas: e.target.checked})} />
                      <div className="w-11 h-6 bg-slate-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-amber-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all shadow-lg" />
                    </label>
                  </div>
                </div>

                <div className="flex gap-4 pt-6">
                   <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-8 py-5 rounded-[25px] bg-white/5 text-slate-400 font-black text-[11px] uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all border border-white/5">Cancel</button>
                   <button type="submit" className="flex-1 px-8 py-5 rounded-[25px] bg-amber-600 text-white font-black text-[11px] uppercase tracking-widest hover:bg-amber-500 transition-all shadow-2xl shadow-amber-600/30 active:scale-95">Commit Regla</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
