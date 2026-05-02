import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, 
  Users, 
  Plus, 
  Trash2, 
  Edit3, 
  Shield, 
  Save, 
  X, 
  Lock, 
  Eye, 
  CheckCircle2, 
  Clock,
  Settings,
  RefreshCw,
  Zap,
  ShieldCheck,
  Target,
  Bell,
  Calendar,
  EyeOff,
  Search,
  ChevronRight,
  MoreVertical,
  Activity,
  History
} from 'lucide-react';
import { api } from '../../lib/api';
import { cn } from '../../lib/utils/cn';

function parseDiasOperativos(value) {
  if (Array.isArray(value)) return value.map(Number).filter(n => Number.isFinite(n));
  if (value == null || value === '') return [1, 2, 3, 4, 5, 6, 0];

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map(Number).filter(n => Number.isFinite(n));
    } catch {}

    return value
      .split(',')
      .map(v => Number(v.trim()))
      .filter(n => Number.isFinite(n));
  }

  return [1, 2, 3, 4, 5, 6, 0];
}

export default function AdminTelegramV2() {
  const [equipos, setEquipos] = useState([]);
  const [integrantes, setIntegrantes] = useState([]);
  const [bots, setBots] = useState([]);
  const [horarios, setHorarios] = useState({ 
    hora_inicio: '08:00', 
    hora_fin: '22:00', 
    dias_operativos: [1,2,3,4,5,6,7],
    activo: true,
    visibilidad_numero: 'parcial'
  });
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showEquipoModal, setShowEquipoModal] = useState(false);
  const [showIntegranteModal, setShowIntegranteModal] = useState(false);
  const [showBotModal, setShowBotModal] = useState(false);
  
  const [editingEquipo, setEditingEquipo] = useState(null);
  const [editingIntegrante, setEditingIntegrante] = useState(null);
  const [editingBot, setEditingBot] = useState(null);
  
  const [equipoForm, setEquipoForm] = useState({ nombre: '', tipo: 'secretaria', chat_id: '', activo: true });
  const [integranteForm, setIntegranteForm] = useState({ telegram_user_id: '', nombre_visible: '', equipo_id: '', activo: true });
  const [botForm, setBotForm] = useState({ alias: '', token: '', proposito: '', activo: true });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [e, i, h, log, b] = await Promise.all([
        api.admin.telegram.equipos(),
        api.admin.telegram.integrantes(),
        api.admin.telegram.horarios(),
        api.admin.telegram.historial(),
        api.admin.telegram.bots()
      ]);
      setEquipos(e || []);
      setIntegrantes(i || []);
      setHistorial(log || []);
      setBots(b || []);
      
      setHorarios({ 
        hora_inicio: h?.hora_inicio || '08:00', 
        hora_fin: h?.hora_fin || '22:00', 
        dias_operativos: parseDiasOperativos(h?.dias_operativos),
        activo: h?.activo === true || h?.activo === 1 || h?.activo === '1',
        visibilidad_numero: h?.visibilidad_numero || 'parcial'
      });
    } catch (err) {
      console.error('[ADMIN RENDER/API ERROR] Telegram:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEquipo = async (e) => {
    e.preventDefault();
    try {
      if (editingEquipo) await api.admin.telegram.updateEquipo(editingEquipo.id, equipoForm);
      else await api.admin.telegram.crearEquipo(equipoForm);
      setShowEquipoModal(false);
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSaveIntegrante = async (e) => {
    e.preventDefault();
    try {
      if (editingIntegrante) await api.admin.telegram.updateIntegrante(editingIntegrante.id, integranteForm);
      else await api.admin.telegram.crearIntegrante(integranteForm);
      setShowIntegranteModal(false);
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSaveHorarios = async () => {
    try {
      await api.admin.telegram.updateHorarios(horarios);
      alert('Configuración Global Actualizada');
    } catch (err) {
      alert(err.message);
    }
  };

  const toggleDia = (dia) => {
    const current = [...horarios.dias_operativos];
    const index = current.indexOf(dia);
    if (index > -1) current.splice(index, 1);
    else current.push(dia);
    setHorarios({ ...horarios, dias_operativos: current });
  };

  return (
    <div className="space-y-10">
      {/* Header Section */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-8">
        <div className="space-y-2">
          <div className="flex items-center gap-4">
            <div className="p-3.5 rounded-2xl bg-gradient-to-tr from-blue-500 to-indigo-600 text-white shadow-xl shadow-blue-500/20">
              <Send size={24} />
            </div>
            <div>
              <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic">Telegram Command Center</h1>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] flex items-center gap-2">
                <ShieldCheck size={14} className="text-blue-500" /> Control de flujos operativos y bots institucionales
              </p>
            </div>
          </div>
        </div>

        <button 
          onClick={fetchData}
          className="p-4 rounded-2xl bg-white/5 border border-white/5 text-slate-400 hover:text-white transition-all shadow-2xl self-end xl:self-center"
        >
          <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start">
        
        {/* Teams & Members Column */}
        <div className="xl:col-span-2 space-y-8">
          
          {/* Teams Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#161926] border border-white/5 rounded-[40px] shadow-2xl overflow-hidden"
          >
            <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-500 border border-blue-500/20 shadow-inner">
                  <Shield size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white uppercase tracking-tighter italic">Equipos Operativos</h3>
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Canales de notificación y control</p>
                </div>
              </div>
              <button 
                onClick={() => { setEditingEquipo(null); setEquipoForm({ nombre: '', tipo: 'secretaria', chat_id: '', activo: true }); setShowEquipoModal(true); }}
                className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-blue-500 transition-all shadow-xl shadow-blue-600/20"
              >
                <Plus size={16} /> Add Team
              </button>
            </div>

            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="px-8 py-5 text-[9px] font-black text-slate-500 uppercase tracking-widest">Equipo</th>
                    <th className="px-8 py-5 text-[9px] font-black text-slate-500 uppercase tracking-widest">Protocolo</th>
                    <th className="px-8 py-5 text-[9px] font-black text-slate-500 uppercase tracking-widest">Chat ID</th>
                    <th className="px-8 py-5 text-[9px] font-black text-slate-500 uppercase tracking-widest">Status</th>
                    <th className="px-8 py-5 text-[9px] font-black text-slate-500 uppercase tracking-widest text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.03]">
                  {Array.isArray(equipos) && equipos.map(e => (
                    <tr key={e.id} className="hover:bg-white/[0.01] transition-colors group">
                      <td className="px-8 py-5">
                        <p className="text-xs font-black text-white uppercase tracking-tight italic">{e.nombre_equipo || e.nombre}</p>
                      </td>
                      <td className="px-8 py-5">
                        <span className={`px-3 py-1 rounded-xl text-[8px] font-black uppercase tracking-widest border ${(e.tipo_equipo || e.tipo) === 'administradores' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20 shadow-lg shadow-rose-500/5' : 'bg-blue-500/10 text-blue-500 border-blue-500/20'}`}>
                          {e.tipo_equipo || e.tipo}
                        </span>
                      </td>
                      <td className="px-8 py-5">
                        <code className="text-[10px] font-mono text-slate-500 bg-[#0f111a] px-2 py-1 rounded-lg border border-white/5">{e.telegram_chat_id || e.chat_id}</code>
                      </td>
                      <td className="px-8 py-5">
                        <div className={`w-2 h-2 rounded-full ${e.activo ? 'bg-emerald-500 shadow-lg shadow-emerald-500/50 animate-pulse' : 'bg-slate-700'}`} />
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => { setEditingEquipo(e); setEquipoForm({ nombre: e.nombre_equipo || e.nombre, tipo: e.tipo_equipo || e.tipo, chat_id: e.telegram_chat_id || e.chat_id, activo: !!e.activo }); setShowEquipoModal(true); }} className="p-2 rounded-xl bg-white/5 text-blue-500 hover:bg-blue-500 hover:text-white transition-all shadow-lg border border-white/5"><Edit3 size={14} /></button>
                          <button onClick={async () => { if(confirm('¿Eliminar equipo?')) { await api.admin.telegram.eliminarEquipo(e.id); fetchData(); } }} className="p-2 rounded-xl bg-white/5 text-rose-500 hover:bg-rose-500 hover:text-white transition-all shadow-lg border border-white/5"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>

          {/* Members Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-[#161926] border border-white/5 rounded-[40px] shadow-2xl overflow-hidden"
          >
            <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 shadow-inner">
                  <Users size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white uppercase tracking-tighter italic">Integrantes (Operadores)</h3>
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Responsables de la gestión operativa</p>
                </div>
              </div>
              <button 
                onClick={() => { setEditingIntegrante(null); setIntegranteForm({ telegram_user_id: '', nombre_visible: '', equipo_id: equipos[0]?.id || '', activo: true }); setShowIntegranteModal(true); }}
                className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-600/20"
              >
                <Plus size={16} /> Add Operator
              </button>
            </div>

            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="px-8 py-5 text-[9px] font-black text-slate-500 uppercase tracking-widest">Operador</th>
                    <th className="px-8 py-5 text-[9px] font-black text-slate-500 uppercase tracking-widest">Telegram ID</th>
                    <th className="px-8 py-5 text-[9px] font-black text-slate-500 uppercase tracking-widest">Asignación</th>
                    <th className="px-8 py-5 text-[9px] font-black text-slate-500 uppercase tracking-widest">Status</th>
                    <th className="px-8 py-5 text-[9px] font-black text-slate-500 uppercase tracking-widest text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.03]">
                  {Array.isArray(integrantes) && integrantes.map(i => (
                    <tr key={i.id} className="hover:bg-white/[0.01] transition-colors group">
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-[#0f111a] flex items-center justify-center font-black text-indigo-500 text-[10px] border border-white/5 shadow-inner">
                            {(i.nombre_visible || i.nombre || '?').charAt(0).toUpperCase()}
                          </div>
                          <p className="text-xs font-black text-white uppercase tracking-tight">{i.nombre_visible || i.nombre}</p>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <code className="text-[10px] font-mono text-slate-500 bg-[#0f111a] px-2 py-1 rounded-lg border border-white/5">{i.telegram_user_id || i.telegram_id}</code>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-2">
                          <Shield size={12} className="text-indigo-500" />
                          <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{equipos.find(e => e.id === i.equipo_id)?.nombre_equipo || equipos.find(e => e.id === i.equipo_id)?.nombre || 'Sin Equipo'}</p>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className={`w-2 h-2 rounded-full ${i.activo ? 'bg-indigo-500 shadow-lg shadow-indigo-500/50' : 'bg-slate-700'}`} />
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => { setEditingIntegrante(i); setIntegranteForm({ telegram_user_id: i.telegram_user_id || i.telegram_id, nombre_visible: i.nombre_visible || i.nombre, equipo_id: i.equipo_id || '', activo: !!i.activo }); setShowIntegranteModal(true); }} className="p-2 rounded-xl bg-white/5 text-indigo-500 hover:bg-indigo-500 hover:text-white transition-all shadow-lg border border-white/5"><Edit3 size={14} /></button>
                          <button onClick={async () => { if(confirm('¿Eliminar integrante?')) { await api.admin.telegram.eliminarIntegrante(i.id); fetchData(); } }} className="p-2 rounded-xl bg-white/5 text-rose-500 hover:bg-rose-500 hover:text-white transition-all shadow-lg border border-white/5"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        </div>

        {/* Configuration Column */}
        <div className="space-y-8">
          
          {/* Global Config Card */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-[#161926] border border-white/5 p-8 rounded-[40px] shadow-2xl relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-8 opacity-[0.03]">
              <Settings size={100} />
            </div>

            <div className="flex items-center gap-4 mb-8">
              <div className="p-3 rounded-2xl bg-sav-primary/10 text-sav-primary border border-sav-primary/20 shadow-inner">
                <Activity size={20} />
              </div>
              <h3 className="text-xl font-black text-white uppercase tracking-tighter italic">Global Config</h3>
            </div>

            <div className="space-y-8">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap size={14} className="text-sav-primary" />
                    <span className="text-[10px] font-black text-white uppercase tracking-widest">Estado del Servicio</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={horarios.activo} onChange={e => setHorarios({...horarios, activo: e.target.checked})} />
                    <div className="w-11 h-6 bg-slate-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-sav-primary after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all shadow-lg shadow-black/40" />
                  </label>
                </div>

                <div className="p-6 bg-[#0f111a] rounded-3xl border border-white/5 shadow-inner space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 space-y-1">
                      <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest italic">Apertura</p>
                      <input type="time" value={horarios.hora_inicio} onChange={e => setHorarios({...horarios, hora_inicio: e.target.value})} className="w-full bg-[#161926] border border-white/5 rounded-xl px-4 py-3 text-[10px] font-black text-white outline-none focus:border-sav-primary/30 shadow-inner" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest italic">Cierre</p>
                      <input type="time" value={horarios.hora_fin} onChange={e => setHorarios({...horarios, hora_fin: e.target.value})} className="w-full bg-[#161926] border border-white/5 rounded-xl px-4 py-3 text-[10px] font-black text-white outline-none focus:border-sav-primary/30 shadow-inner" />
                    </div>
                  </div>

                  <div className="space-y-2 pt-2">
                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest italic mb-2 flex items-center gap-2"><Calendar size={10} /> Días de Operación</p>
                    <div className="flex justify-between gap-1">
                      {[1,2,3,4,5,6,0].map(d => {
                        const labels = ['D','L','M','X','J','V','S'];
                        const active = horarios.dias_operativos.includes(d);
                        return (
                          <button 
                            key={d} 
                            onClick={() => toggleDia(d)}
                            className={`flex-1 aspect-square rounded-xl text-[10px] font-black transition-all border ${active ? 'bg-sav-primary text-white border-sav-primary shadow-lg shadow-sav-primary/20' : 'bg-[#161926] text-slate-600 border-white/5 hover:border-white/10'}`}
                          >
                            {labels[d]}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest italic mb-2 flex items-center gap-2"><Lock size={10} /> Privacy Protocol</p>
                  <select 
                    value={horarios.visibilidad_numero} 
                    onChange={e => setHorarios({...horarios, visibilidad_numero: e.target.value})}
                    className="w-full bg-[#0f111a] border border-white/5 rounded-2xl px-6 py-4 text-[10px] font-black text-white uppercase tracking-widest outline-none focus:border-sav-primary/30 shadow-inner appearance-none cursor-pointer"
                  >
                    <option value="completo">Mostrar Números Completos</option>
                    <option value="parcial">Ocultar 3 Dígitos (Parcial)</option>
                    <option value="oculto">Ocultar Totalmente</option>
                  </select>
                </div>
              </div>

              <button 
                onClick={handleSaveHorarios}
                className="w-full py-5 rounded-2xl bg-sav-primary text-white font-black text-[11px] uppercase tracking-[0.2em] shadow-xl shadow-sav-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
              >
                <Save size={18} /> Commit Configuration
              </button>
            </div>
          </motion.div>

          {/* Operational Log Card */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-[#161926] border border-white/5 p-8 rounded-[40px] shadow-2xl relative overflow-hidden"
          >
            <div className="flex items-center gap-4 mb-8">
              <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shadow-inner">
                <History size={20} />
              </div>
              <h3 className="text-xl font-black text-white uppercase tracking-tighter italic">Live Audit Log</h3>
            </div>

            <div className="space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
              {historial.length > 0 ? historial.map((log, i) => (
                <div key={i} className="flex gap-4 p-4 rounded-2xl bg-[#0f111a] border border-white/5 group hover:border-emerald-500/20 transition-all">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0 group-hover:animate-pulse" />
                  <div className="space-y-1 overflow-hidden">
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-tight leading-relaxed">{log.mensaje || 'Actividad detectada'}</p>
                    <p className="text-[8px] font-bold text-slate-600 uppercase tracking-widest italic">{new Date(log.created_at).toLocaleString()}</p>
                  </div>
                </div>
              )) : (
                <div className="py-20 flex flex-col items-center gap-4 opacity-20">
                  <Target size={40} />
                  <p className="text-[10px] font-black uppercase tracking-widest">No activity logs found</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Modals for Team/Member */}
      <AnimatePresence>
        {(showEquipoModal || showIntegranteModal) && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center p-6 z-[200]"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 30 }}
              className="bg-[#161926] border border-white/10 p-10 rounded-[45px] max-w-lg w-full shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-600 to-indigo-600 shadow-lg shadow-blue-600/50" />
              
              <div className="flex items-center gap-6 mb-10">
                <div className="p-4 rounded-[1.8rem] bg-blue-500/10 text-blue-500 border border-blue-500/20 shadow-inner">
                  {showEquipoModal ? <Shield size={28} /> : <Users size={28} />}
                </div>
                <div>
                  <h3 className="text-2xl font-black text-white uppercase tracking-tighter italic">{showEquipoModal ? (editingEquipo ? 'Update Team Node' : 'Initialize New Team') : (editingIntegrante ? 'Configure Operator' : 'Onboard New Operator')}</h3>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">BCB Global Operational Security</p>
                </div>
              </div>

              <form onSubmit={showEquipoModal ? handleSaveEquipo : handleSaveIntegrante} className="space-y-6">
                {showEquipoModal ? (
                  <>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 italic">Nombre del Equipo</label>
                      <input type="text" value={equipoForm.nombre} onChange={e => setEquipoForm({...equipoForm, nombre: e.target.value})} placeholder="Ej. Equipo Auditoría" className="w-full px-6 py-4 rounded-2xl bg-[#0f111a] border border-white/5 text-xs font-bold text-white outline-none focus:border-blue-500/30 transition-all shadow-inner" required />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 italic">Protocolo de Operación</label>
                      <select value={equipoForm.tipo} onChange={e => setEquipoForm({...equipoForm, tipo: e.target.value})} className="w-full px-6 py-4 rounded-2xl bg-[#0f111a] border border-white/5 text-[10px] font-black text-white uppercase tracking-widest outline-none focus:border-blue-500/30 shadow-inner appearance-none cursor-pointer">
                        <option value="secretaria">Secretaría (General)</option>
                        <option value="administradores">Administradores (Full Access)</option>
                        <option value="retiros">Retiros (Finanzas)</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 italic">Telegram Chat ID</label>
                      <input type="text" value={equipoForm.chat_id} onChange={e => setEquipoForm({...equipoForm, chat_id: e.target.value})} placeholder="-100123456789" className="w-full px-6 py-4 rounded-2xl bg-[#0f111a] border border-white/5 text-[10px] font-mono text-slate-400 outline-none focus:border-blue-500/30 transition-all shadow-inner" required />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 italic">Nombre Visible del Operador</label>
                      <input type="text" value={integranteForm.nombre_visible} onChange={e => setIntegranteForm({...integranteForm, nombre_visible: e.target.value})} placeholder="Ej. Agente 007" className="w-full px-6 py-4 rounded-2xl bg-[#0f111a] border border-white/5 text-xs font-bold text-white outline-none focus:border-indigo-500/30 transition-all shadow-inner" required />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 italic">Telegram User ID</label>
                      <input type="text" value={integranteForm.telegram_user_id} onChange={e => setIntegranteForm({...integranteForm, telegram_user_id: e.target.value})} placeholder="123456789" className="w-full px-6 py-4 rounded-2xl bg-[#0f111a] border border-white/5 text-[10px] font-mono text-slate-400 outline-none focus:border-indigo-500/30 transition-all shadow-inner" required />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 italic">Equipo de Asignación</label>
                      <select value={integranteForm.equipo_id} onChange={e => setIntegranteForm({...integranteForm, equipo_id: e.target.value})} className="w-full px-6 py-4 rounded-2xl bg-[#0f111a] border border-white/5 text-[10px] font-black text-white uppercase tracking-widest outline-none focus:border-indigo-500/30 shadow-inner appearance-none cursor-pointer">
                        {Array.isArray(equipos) && equipos.map(e => <option key={e.id} value={e.id}>{e.nombre_equipo || e.nombre} ({(e.tipo_equipo || e.tipo || 'unknown').toUpperCase()})</option>)}
                      </select>
                    </div>
                  </>
                )}

                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => { setShowEquipoModal(false); setShowIntegranteModal(false); }} className="flex-1 px-8 py-5 rounded-[22px] bg-white/5 text-slate-400 font-black text-[11px] uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all border border-white/5">Cancel</button>
                  <button type="submit" className="flex-1 px-8 py-5 rounded-[22px] bg-blue-600 text-white font-black text-[11px] uppercase tracking-widest hover:bg-blue-500 transition-all shadow-2xl shadow-blue-600/30 active:scale-95">Deploy Node</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
