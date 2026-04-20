import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, 
  Edit3, 
  Save, 
  X, 
  Clock, 
  TrendingUp, 
  Zap, 
  ShieldCheck, 
  Layers, 
  AlertTriangle,
  RefreshCw,
  ChevronRight,
  Target,
  Medal,
  Calendar,
  Lock,
  Unlock,
  CheckCircle2
} from 'lucide-react';
import { api } from '../../lib/api';
import { formatCurrency } from '../../utils/format';
import { displayLevelCode } from '../../lib/displayLevel.js';

export default function AdminNivelesV2() {
  const [niveles, setNiveles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    fetchNiveles();
  }, []);

  const fetchNiveles = async () => {
    setLoading(true);
    try {
      const data = await api.admin.niveles();
      const list = Array.isArray(data) ? data : [];
      setNiveles(list.sort((a, b) => (a.orden || 0) - (b.orden || 0)));
    } catch (err) {
      console.error(err);
      setNiveles([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    try {
      const payload = {
        ...editing,
        deposito: Number(editing.deposito || editing.costo || 0),
        ganancia_tarea: Number(editing.ganancia_tarea || 0),
        num_tareas_diarias: Number(editing.num_tareas_diarias || editing.tareas_diarias || 0),
        activo: editing.activo !== false ? 1 : 0,
        retiro_horario_habilitado: editing.retiro_horario_habilitado ? 1 : 0,
        retiro_dia_inicio: Number(editing.retiro_dia_inicio ?? 1),
        retiro_dia_fin: Number(editing.retiro_dia_fin ?? 5)
      };

      await api.admin.updateNivel(editing.id, payload);
      setNiveles(prev => prev.map(n => n.id === editing.id ? editing : n));
      setEditing(null);
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

  return (
    <div className="space-y-10">
      {/* Header Section */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-8">
        <div className="space-y-2">
          <div className="flex items-center gap-4">
            <div className="p-3.5 rounded-2xl bg-gradient-to-tr from-sav-primary to-rose-600 text-white shadow-xl shadow-sav-primary/20">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic">VIP Infrastructure</h1>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] flex items-center gap-2">
                <Target size={14} className="text-sav-primary" /> Configuración de jerarquías y beneficios BCB Global
              </p>
            </div>
          </div>
        </div>

        <button 
          onClick={fetchNiveles}
          className="p-4 rounded-2xl bg-white/5 border border-white/5 text-slate-400 hover:text-white transition-all shadow-2xl self-end xl:self-center"
        >
          <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="bg-amber-500/10 border border-amber-500/20 p-6 rounded-[30px] flex items-start gap-5 relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-6 opacity-[0.05] group-hover:opacity-[0.1] transition-opacity">
          <AlertTriangle size={60} />
        </div>
        <div className="w-12 h-12 rounded-2xl bg-amber-500/20 flex items-center justify-center text-amber-500 shrink-0 shadow-inner border border-amber-500/10">
          <Zap size={24} className="animate-pulse" />
        </div>
        <div className="space-y-1">
          <h4 className="text-xs font-black text-amber-500 uppercase tracking-widest italic">Protocolo de Alta Criticidad</h4>
          <p className="text-[10px] text-slate-400 font-bold uppercase leading-relaxed tracking-wide max-w-4xl">
            Cualquier modificación en los costos de inversión, cuotas de tareas o márgenes de ganancia se aplicará en tiempo real. 
            Este ajuste impacta directamente en el balance financiero y la rentabilidad del ecosistema.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <AnimatePresence mode="popLayout">
          {loading ? (
            Array(5).fill(0).map((_, i) => (
              <div key={i} className="bg-[#161926] border border-white/5 h-24 rounded-[30px] animate-pulse" />
            ))
          ) : niveles.map((nivel, index) => (
            <motion.div 
              key={nivel.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`bg-[#161926] border border-white/5 p-8 rounded-[40px] shadow-2xl transition-all duration-500 group ${editing?.id === nivel.id ? 'ring-2 ring-sav-primary/30 border-sav-primary/20 bg-[#1a1e2e]' : 'hover:border-sav-primary/20'}`}
            >
              {editing?.id === nivel.id ? (
                <div className="space-y-10">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-2 italic">Institutional Name</label>
                      <input
                        type="text"
                        className="w-full px-6 py-4 rounded-2xl bg-[#0f111a] border border-white/5 text-xs font-black text-white outline-none focus:border-sav-primary/30 transition-all shadow-inner"
                        value={editing.nombre}
                        onChange={e => setEditing({...editing, nombre: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-2 italic">Investment Cost (BOB)</label>
                      <input
                        type="number"
                        className="w-full px-6 py-4 rounded-2xl bg-[#0f111a] border border-white/5 text-xs font-black text-sav-primary outline-none focus:border-sav-primary/30 transition-all shadow-inner"
                        value={editing.deposito || editing.costo || 0}
                        onChange={e => setEditing({...editing, deposito: parseFloat(e.target.value), costo: parseFloat(e.target.value)})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-2 italic">Daily Task Quota</label>
                      <input
                        type="number"
                        className="w-full px-6 py-4 rounded-2xl bg-[#0f111a] border border-white/5 text-xs font-black text-white outline-none focus:border-sav-primary/30 transition-all shadow-inner"
                        value={editing.num_tareas_diarias || editing.tareas_diarias || 0}
                        onChange={e => setEditing({...editing, num_tareas_diarias: parseInt(e.target.value), tareas_diarias: parseInt(e.target.value)})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-2 italic">Revenue per Task</label>
                      <input
                        type="number"
                        step="0.01"
                        className="w-full px-6 py-4 rounded-2xl bg-[#0f111a] border border-white/5 text-xs font-black text-emerald-500 outline-none focus:border-sav-primary/30 transition-all shadow-inner"
                        value={editing.ganancia_tarea}
                        onChange={e => setEditing({...editing, ganancia_tarea: parseFloat(e.target.value)})}
                      />
                    </div>
                  </div>

                  <div className="p-8 bg-[#0f111a] rounded-[35px] border border-white/5 shadow-inner space-y-8">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
                          <Clock size={20} />
                        </div>
                        <div>
                          <h4 className="text-sm font-black text-white uppercase tracking-tighter italic">Protocolo de Retiro Específico</h4>
                          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Restricción de horario por nivel VIP</p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer group">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={editing.retiro_horario_habilitado === true}
                          onChange={e => setEditing({...editing, retiro_horario_habilitado: e.target.checked})}
                        />
                        <div className="w-14 h-7 bg-slate-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-sav-primary shadow-lg" />
                      </label>
                    </div>

                    {editing.retiro_horario_habilitado && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="grid grid-cols-1 md:grid-cols-4 gap-6 pt-4 border-t border-white/5"
                      >
                        <div className="space-y-2">
                          <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1 italic">Día Inicio</label>
                          <select
                            className="w-full px-5 py-3.5 rounded-xl bg-[#161926] border border-white/5 text-[10px] font-black text-white uppercase outline-none focus:border-sav-primary/30"
                            value={editing.retiro_dia_inicio ?? 1}
                            onChange={e => setEditing({...editing, retiro_dia_inicio: parseInt(e.target.value)})}
                          >
                            {dias.map((d, i) => <option key={i} value={i}>{d}</option>)}
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1 italic">Día Fin</label>
                          <select
                            className="w-full px-5 py-3.5 rounded-xl bg-[#161926] border border-white/5 text-[10px] font-black text-white uppercase outline-none focus:border-sav-primary/30"
                            value={editing.retiro_dia_fin ?? 5}
                            onChange={e => setEditing({...editing, retiro_dia_fin: parseInt(e.target.value)})}
                          >
                            {dias.map((d, i) => <option key={i} value={i}>{d}</option>)}
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1 italic">Apertura</label>
                          <input
                            type="time"
                            className="w-full px-5 py-3.5 rounded-xl bg-[#161926] border border-white/5 text-[10px] font-black text-white outline-none focus:border-sav-primary/30"
                            value={editing.retiro_hora_inicio || '09:00'}
                            onChange={e => setEditing({...editing, retiro_hora_inicio: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1 italic">Cierre</label>
                          <input
                            type="time"
                            className="w-full px-5 py-3.5 rounded-xl bg-[#161926] border border-white/5 text-[10px] font-black text-white outline-none focus:border-sav-primary/30"
                            value={editing.retiro_hora_fin || '18:00'}
                            onChange={e => setEditing({...editing, retiro_hora_fin: e.target.value})}
                          />
                        </div>
                      </motion.div>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4 pt-4">
                    <button onClick={handleUpdate} className="flex-1 py-5 rounded-2xl bg-sav-primary text-white font-black text-[11px] uppercase tracking-[0.2em] shadow-xl shadow-sav-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3">
                      <Save size={18} /> Deploy Level Updates
                    </button>
                    <button onClick={() => setEditing(null)} className="px-10 py-5 rounded-2xl bg-white/5 border border-white/5 text-slate-400 font-black text-[11px] uppercase tracking-[0.2em] hover:bg-white/10 hover:text-white transition-all flex items-center justify-center gap-3">
                      <X size={18} /> Abort
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
                  <div className="flex items-center gap-6 w-full">
                    <div className="w-16 h-16 rounded-[22px] bg-[#0f111a] flex items-center justify-center text-sav-primary shrink-0 border border-white/5 shadow-inner relative group">
                      <Shield size={32} className="group-hover:scale-110 transition-transform duration-500" />
                      <div className="absolute -top-2 -right-2 w-6 h-6 rounded-lg bg-slate-800 border border-white/10 flex items-center justify-center text-[10px] font-black text-white shadow-xl">
                        {nivel.orden}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="text-xl font-black text-white uppercase tracking-tighter italic">{displayLevelCode(nivel.nombre)}</h3>
                        <div className={`px-4 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border transition-all ${nivel.activo !== false ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 shadow-lg shadow-emerald-500/5' : 'bg-rose-500/10 text-rose-500 border-rose-500/20 shadow-lg shadow-rose-500/5'}`}>
                          {nivel.activo !== false ? <span className="flex items-center gap-1"><Unlock size={10} /> Operational</span> : <span className="flex items-center gap-1"><Lock size={10} /> Locked</span>}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-x-8 gap-y-2">
                        <div className="flex items-center gap-2">
                          <TrendingUp size={14} className="text-sav-primary" />
                          <p className="text-[10px] font-black text-white uppercase tracking-widest">{formatCurrency(nivel.deposito || nivel.costo || 0)} <span className="text-slate-500 opacity-50 italic">BOB Investment</span></p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Layers size={14} className="text-slate-400" />
                          <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{nivel.num_tareas_diarias || nivel.tareas_diarias} <span className="text-slate-500 opacity-50 italic">Daily Tasks</span></p>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 size={14} className="text-emerald-500" />
                          <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">{formatCurrency(nivel.ganancia_tarea)} <span className="text-slate-500 opacity-50 italic">Revenue/Task</span></p>
                        </div>
                        {nivel.retiro_horario_habilitado && (
                          <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20">
                            <Calendar size={12} className="text-amber-500" />
                            <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest">
                              {dias[nivel.retiro_dia_inicio].substring(0, 3)}-{dias[nivel.retiro_dia_fin].substring(0, 3)} ({nivel.retiro_hora_inicio?.substring(0, 5)} - {nivel.retiro_hora_fin?.substring(0, 5)})
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => setEditing(nivel)} 
                    className="w-full lg:w-auto p-5 rounded-[22px] bg-white/5 border border-white/5 text-slate-400 hover:text-sav-primary hover:bg-sav-primary/10 hover:border-sav-primary/20 transition-all flex items-center justify-center gap-3 shadow-xl group/edit"
                  >
                    <Edit3 size={20} className="group-hover/edit:rotate-12 transition-transform" />
                    <span className="text-[10px] font-black uppercase tracking-widest italic">Configure Node</span>
                    <ChevronRight size={16} className="opacity-0 group-hover/edit:opacity-100 group-hover/edit:translate-x-1 transition-all" />
                  </button>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
