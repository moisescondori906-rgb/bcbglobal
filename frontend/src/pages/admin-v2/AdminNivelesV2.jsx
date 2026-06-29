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
    <div className="space-y-10 sm:space-y-14 pb-20">
      {/* Header Section */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-8">
        <div className="space-y-2">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 rounded-[2rem] bg-gradient-to-tr from-admin-accent to-violet-600 text-white shadow-2xl shadow-admin-accent/20 border border-white/10 flex items-center justify-center shrink-0">
              <ShieldCheck size={28} />
            </div>
            <div>
              <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tighter uppercase italic leading-none">VIP Infrastructure</h1>
              <p className="text-[10px] font-black text-admin-muted uppercase tracking-[0.3em] mt-1 flex items-center gap-2">
                <Target size={14} className="text-admin-accent" /> Configuración de jerarquías y beneficios globales
              </p>
            </div>
          </div>
        </div>

        <button 
          onClick={fetchNiveles}
          className="admin-button-secondary !h-14 !w-14 !p-0 !rounded-2xl shadow-xl active:scale-95"
        >
          <RefreshCw size={22} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="bg-amber-500/10 border border-amber-500/20 p-8 rounded-[2.5rem] flex items-start gap-6 relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-8 opacity-[0.05] group-hover:opacity-[0.1] transition-opacity duration-700">
          <AlertTriangle size={80} />
        </div>
        <div className="w-14 h-14 rounded-2xl bg-amber-500/20 flex items-center justify-center text-amber-500 shrink-0 shadow-inner border border-amber-500/10">
          <Zap size={28} className="animate-pulse" />
        </div>
        <div className="space-y-2 relative z-10">
          <h4 className="text-sm font-black text-amber-500 uppercase tracking-widest italic">Protocolo de Alta Criticidad</h4>
          <p className="text-[11px] text-zinc-400 font-bold uppercase leading-relaxed tracking-wide max-w-4xl">
            Cualquier modificación en los costos de inversión, cuotas de tareas o márgenes de ganancia se aplicará en tiempo real. 
            Este ajuste impacta directamente en el balance financiero y la rentabilidad del ecosistema global.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        <AnimatePresence mode="popLayout">
          {loading ? (
            Array(5).fill(0).map((_, i) => (
              <div key={i} className="admin-card h-32 animate-pulse bg-white/[0.02]" />
            ))
          ) : niveles.map((nivel, index) => (
            <motion.div 
              key={nivel.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05, duration: 0.4 }}
              className={`admin-card p-10 group ${editing?.id === nivel.id ? 'ring-2 ring-admin-accent/50 border-admin-accent/30 !bg-white/[0.03]' : 'hover:border-admin-accent/30 hover:shadow-admin-glow'}`}
            >
              {editing?.id === nivel.id ? (
                <div className="space-y-12">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1 italic">Institutional Name</label>
                      <input
                        type="text"
                        className="admin-input !h-14 !bg-black/20 !rounded-2xl !px-6 shadow-inner"
                        value={editing.nombre}
                        onChange={e => setEditing({...editing, nombre: e.target.value})}
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1 italic">Investment Cost (Bs)</label>
                      <input
                        type="number"
                        className="admin-input !h-14 !bg-black/20 !rounded-2xl !px-6 !text-admin-accent shadow-inner"
                        value={editing.deposito || editing.costo || 0}
                        onChange={e => setEditing({...editing, deposito: parseFloat(e.target.value), costo: parseFloat(e.target.value)})}
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1 italic">Daily Task Quota</label>
                      <input
                        type="number"
                        className="admin-input !h-14 !bg-black/20 !rounded-2xl !px-6 shadow-inner"
                        value={editing.num_tareas_diarias || editing.tareas_diarias || 0}
                        onChange={e => setEditing({...editing, num_tareas_diarias: parseInt(e.target.value), tareas_diarias: parseInt(e.target.value)})}
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1 italic">Revenue per Task</label>
                      <input
                        type="number"
                        step="0.01"
                        className="admin-input !h-14 !bg-black/20 !rounded-2xl !px-6 !text-emerald-500 shadow-inner"
                        value={editing.ganancia_tarea}
                        onChange={e => setEditing({...editing, ganancia_tarea: parseFloat(e.target.value)})}
                      />
                    </div>
                  </div>

                  <div className="p-10 bg-black/20 rounded-[2.5rem] border border-white/5 shadow-inner space-y-10">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-5">
                        <div className="p-4 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 shadow-lg shadow-amber-500/5">
                          <Clock size={24} />
                        </div>
                        <div>
                          <h4 className="text-base font-black text-white uppercase tracking-tighter italic">Protocolo de Retiro Específico</h4>
                          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Restricción de horario por nivel VIP</p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer group">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={editing.retiro_horario_habilitado === true}
                          onChange={e => setEditing({...editing, retiro_horario_habilitado: e.target.checked})}
                        />
                        <div className="w-16 h-8 bg-zinc-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-1 after:left-[4px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-6 after:w-7 after:transition-all peer-checked:bg-admin-accent shadow-xl" />
                      </label>
                    </div>

                    {editing.retiro_horario_habilitado && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="grid grid-cols-1 md:grid-cols-4 gap-8 pt-8 border-t border-white/5"
                      >
                        <div className="space-y-3">
                          <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1 italic">Día Inicio</label>
                          <select
                            className="admin-input !h-14 !bg-black/20 !rounded-2xl !px-6 appearance-none cursor-pointer"
                            value={editing.retiro_dia_inicio ?? 1}
                            onChange={e => setEditing({...editing, retiro_dia_inicio: parseInt(e.target.value)})}
                          >
                            {dias.map((d, i) => <option key={i} value={i}>{d}</option>)}
                          </select>
                        </div>
                        <div className="space-y-3">
                          <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1 italic">Día Fin</label>
                          <select
                            className="admin-input !h-14 !bg-black/20 !rounded-2xl !px-6 appearance-none cursor-pointer"
                            value={editing.retiro_dia_fin ?? 5}
                            onChange={e => setEditing({...editing, retiro_dia_fin: parseInt(e.target.value)})}
                          >
                            {dias.map((d, i) => <option key={i} value={i}>{d}</option>)}
                          </select>
                        </div>
                        <div className="space-y-3">
                          <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1 italic">Apertura</label>
                          <input
                            type="time"
                            className="admin-input !h-14 !bg-black/20 !rounded-2xl !px-6"
                            value={editing.retiro_hora_inicio || '09:00'}
                            onChange={e => setEditing({...editing, retiro_hora_inicio: e.target.value})}
                          />
                        </div>
                        <div className="space-y-3">
                          <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1 italic">Cierre</label>
                          <input
                            type="time"
                            className="admin-input !h-14 !bg-black/20 !rounded-2xl !px-6"
                            value={editing.retiro_hora_fin || '18:00'}
                            onChange={e => setEditing({...editing, retiro_hora_fin: e.target.value})}
                          />
                        </div>
                      </motion.div>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row gap-6 pt-6">
                    <button onClick={handleUpdate} className="admin-button-primary flex-1 !h-16 !text-[11px] !tracking-[0.3em] !rounded-2xl shadow-2xl shadow-admin-accent/20 flex items-center justify-center gap-4">
                      <Save size={20} /> Deploy Level Updates
                    </button>
                    <button onClick={() => setEditing(null)} className="admin-button-secondary !h-16 !px-10 !rounded-2xl flex items-center justify-center gap-4">
                      <X size={20} /> Abort
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col lg:flex-row items-center justify-between gap-10">
                  <div className="flex items-center gap-8 w-full">
                    <div className="w-20 h-20 rounded-[2rem] bg-black/40 flex items-center justify-center text-admin-accent shrink-0 border border-white/5 shadow-inner relative group/icon">
                      <Shield size={36} className="group-hover/icon:scale-110 group-hover/icon:rotate-6 transition-all duration-700" />
                      <div className="absolute -top-3 -right-3 w-8 h-8 rounded-xl bg-zinc-800 border border-white/10 flex items-center justify-center text-xs font-black text-white shadow-2xl">
                        {nivel.orden}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0 space-y-3">
                      <div className="flex items-center gap-4 flex-wrap">
                        <h3 className="text-2xl font-black text-white uppercase tracking-tighter italic group-hover:text-admin-accent transition-colors duration-500">{displayLevelCode(nivel.nombre)}</h3>
                        <div className={`admin-badge ${nivel.activo !== false ? 'admin-badge-success' : 'admin-badge-error'}`}>
                          {nivel.activo !== false ? <span className="flex items-center gap-1.5"><Unlock size={12} strokeWidth={3} /> Operational</span> : <span className="flex items-center gap-1.5"><Lock size={12} strokeWidth={3} /> Locked</span>}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-x-10 gap-y-3">
                        <div className="flex items-center gap-3">
                          <div className="p-1.5 rounded-lg bg-admin-accent/10 text-admin-accent">
                            <TrendingUp size={16} />
                          </div>
                          <p className="text-[11px] font-black text-white uppercase tracking-widest">{formatCurrency(nivel.deposito || nivel.costo || 0)} <span className="text-zinc-600 italic ml-1">Investment</span></p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="p-1.5 rounded-lg bg-zinc-800 text-zinc-500">
                            <Layers size={16} />
                          </div>
                          <p className="text-[11px] font-black text-zinc-300 uppercase tracking-widest">{nivel.num_tareas_diarias || nivel.tareas_diarias} <span className="text-zinc-600 italic ml-1">Daily Tasks</span></p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500">
                            <CheckCircle2 size={16} />
                          </div>
                          <p className="text-[11px] font-black text-emerald-500 uppercase tracking-widest">{formatCurrency(nivel.ganancia_tarea)} <span className="text-zinc-600 italic ml-1">Revenue/Task</span></p>
                        </div>
                        {nivel.retiro_horario_habilitado && (
                          <div className="flex items-center gap-3 px-4 py-1.5 rounded-xl bg-amber-500/5 border border-amber-500/10 shadow-inner">
                            <Calendar size={14} className="text-amber-500" />
                            <p className="text-[10px] font-black text-amber-500 uppercase tracking-[0.2em]">
                              {dias[nivel.retiro_dia_inicio].substring(0, 3)}-{dias[nivel.retiro_dia_fin].substring(0, 3)} ({nivel.retiro_hora_inicio?.substring(0, 5)} - {nivel.retiro_hora_fin?.substring(0, 5)})
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => setEditing(nivel)} 
                    className="w-full lg:w-auto admin-button-secondary !h-16 !px-8 !rounded-[1.5rem] flex items-center justify-center gap-4 group/edit shadow-xl"
                  >
                    <Edit3 size={20} className="group-hover/edit:rotate-12 transition-transform" />
                    <span className="text-[11px] font-black uppercase tracking-[0.2em] italic">Configure Node</span>
                    <ChevronRight size={18} className="opacity-0 group-hover/edit:opacity-100 group-hover/edit:translate-x-1 transition-all" />
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





