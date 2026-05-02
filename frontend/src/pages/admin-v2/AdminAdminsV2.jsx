import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldCheck, 
  Plus, 
  Trash2, 
  Edit3, 
  Save, 
  X, 
  Clock, 
  Bell, 
  BellOff, 
  Search, 
  RefreshCw, 
  Zap, 
  User, 
  Target, 
  Shield, 
  CheckCircle2, 
  AlertTriangle,
  Calendar,
  ChevronRight,
  MoreVertical,
  Activity,
  Send
} from 'lucide-react';
import { api } from '../../lib/api';

function parseDiasSemana(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  return String(value).split(',').map(v => v.trim()).filter(Boolean);
}

const diasOptions = [
  { label: 'Lunes', value: 'lunes' },
  { label: 'Martes', value: 'martes' },
  { label: 'Miércoles', value: 'miercoles' },
  { label: 'Jueves', value: 'jueves' },
  { label: 'Viernes', value: 'viernes' },
  { label: 'Sábado', value: 'sabado' },
  { label: 'Domingo', value: 'domingo' }
];

export default function AdminAdminsV2() {
  const [admins, setAdmins] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [notifyGroupAlways, setNotifyGroupAlways] = useState(true);
  const [formData, setFormData] = useState({
    nombre: '',
    telefono: '',
    telegram_user_id: '',
    telegram_username: '',
    hora_inicio_turno: '00:00',
    hora_fin_turno: '23:59',
    activo: true,
    recibe_notificaciones: true,
    qr_base64: '',
    dias_semana: []
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [adminsRes, usersRes, pc] = await Promise.all([
        api.get('/admin/admins'),
        api.get('/admin/usuarios'),
        api.get('/public-content')
      ]);
      setAdmins(Array.isArray(adminsRes) ? adminsRes : []);
      setUsers(Array.isArray(usersRes) ? usersRes : []);
      if (pc) setNotifyGroupAlways(pc.notificar_grupo_recargas_siempre === 'true');
    } catch (err) {
      console.error('[ADMIN RENDER/API ERROR] Admins:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleGroupNotify = async () => {
    try {
      const newValue = !notifyGroupAlways;
      await api.put('/admin/public-content', { notificar_grupo_recargas_siempre: String(newValue) });
      setNotifyGroupAlways(newValue);
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleUserSelect = (e) => {
    const userId = e.target.value;
    if (!userId) return;
    const selectedUser = users.find(u => u.id === userId);
    if (selectedUser) {
      setFormData({
        ...formData,
        nombre: selectedUser.nombre_usuario || selectedUser.nombre_real || '',
        telefono: selectedUser.telefono || '',
        telegram_user_id: selectedUser.telegram_user_id || '',
        telegram_username: selectedUser.telegram_username || ''
      });
    }
  };

  const toggleDia = (val) => {
    const current = parseDiasSemana(formData.dias_semana);
    let next = current.includes(val) ? current.filter(d => d !== val) : [...current, val].sort();
    setFormData({ ...formData, dias_semana: next });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const dias = parseDiasSemana(formData.dias_semana);
    if (dias.length === 0) return alert('Selecciona al menos un día');
    try {
      const dataToSend = { ...formData, dias_semana: dias.join(',') };
      if (editingId) await api.put(`/admin/admins/${editingId}`, dataToSend);
      else await api.post('/admin/admins', dataToSend);
      setShowForm(false);
      setEditingId(null);
      fetchData();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleEdit = (admin) => {
    setEditingId(admin.id);
    setFormData({
      ...admin,
      hora_inicio_turno: admin.hora_inicio_turno?.substring(0, 5) || '00:00',
      hora_fin_turno: admin.hora_fin_turno?.substring(0, 5) || '23:59',
      dias_semana: parseDiasSemana(admin.dias_semana)
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar administrador?')) return;
    try {
      await api.delete(`/admin/admins/${id}`);
      fetchData();
    } catch (err) {
      alert('Error');
    }
  };

  return (
    <div className="space-y-10">
      {/* Header Section */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-8">
        <div className="space-y-2">
          <div className="flex items-center gap-4">
            <div className="p-3.5 rounded-2xl bg-gradient-to-tr from-sav-primary to-indigo-600 text-white shadow-xl shadow-sav-primary/20">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic">Staff & Shift Control</h1>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] flex items-center gap-2">
                <Shield size={14} className="text-sav-primary" /> Gestión de operadores y turnos institucionales
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-4 px-6 py-3 rounded-2xl bg-[#161926] border border-white/5 shadow-xl">
             <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Grupo Notif. Siempre</span>
             <label className="relative inline-flex items-center cursor-pointer group">
                <input type="checkbox" checked={notifyGroupAlways} onChange={toggleGroupNotify} className="sr-only peer" />
                <div className="w-11 h-6 bg-slate-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-emerald-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all shadow-lg shadow-black/40" />
             </label>
          </div>
          <button 
            onClick={() => { setShowForm(!showForm); setEditingId(null); }}
            className="flex items-center gap-2 px-8 py-4 rounded-2xl bg-sav-primary text-white text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-sav-primary/20"
          >
            {showForm ? <><X size={16} /> Cancelar</> : <><Plus size={16} /> New Staff Member</>}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-[#161926] border border-white/5 p-10 rounded-[45px] shadow-2xl relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-10 opacity-[0.03]">
              <User size={120} />
            </div>

            <form onSubmit={handleSubmit} className="space-y-10">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 italic">Quick Onboard from DB</label>
                    <select 
                      onChange={handleUserSelect}
                      className="w-full bg-[#0f111a] border border-white/5 rounded-2xl px-6 py-4 text-xs font-bold text-white outline-none focus:border-sav-primary/30 transition-all shadow-inner appearance-none cursor-pointer"
                    >
                      <option value="">-- Buscar usuario registrado --</option>
                      {Array.isArray(users) && users.map(u => <option key={u.id} value={u.id}>{u.nombre_usuario}</option>)}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 italic">Nombre Operativo</label>
                      <input type="text" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} className="w-full bg-[#0f111a] border border-white/5 rounded-2xl px-6 py-4 text-xs font-black text-white outline-none focus:border-sav-primary/30 shadow-inner" required />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 italic">Teléfono</label>
                      <input type="text" value={formData.telefono} onChange={e => setFormData({...formData, telefono: e.target.value})} className="w-full bg-[#0f111a] border border-white/5 rounded-2xl px-6 py-4 text-xs font-black text-white outline-none focus:border-sav-primary/30 shadow-inner" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 italic">Telegram ID</label>
                      <input type="text" value={formData.telegram_user_id} onChange={e => setFormData({...formData, telegram_user_id: e.target.value})} className="w-full bg-[#0f111a] border border-white/5 rounded-2xl px-6 py-4 text-[10px] font-mono text-slate-400 outline-none focus:border-sav-primary/30 shadow-inner" required />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 italic">Telegram Username</label>
                      <input type="text" value={formData.telegram_username} onChange={e => setFormData({...formData, telegram_username: e.target.value})} className="w-full bg-[#0f111a] border border-white/5 rounded-2xl px-6 py-4 text-[10px] font-mono text-slate-400 outline-none focus:border-sav-primary/30 shadow-inner" />
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 italic flex items-center gap-2"><Calendar size={12} /> Shift Schedule (Active Days)</label>
                    <div className="flex flex-wrap gap-2">
                      {diasOptions.map(d => {
                        const currentDias = parseDiasSemana(formData.dias_semana);
                        const isSelected = currentDias.includes(d.value);
                        return (
                          <button 
                            key={d.value} 
                            type="button" 
                            onClick={() => toggleDia(d.value)}
                            className={`px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${isSelected ? 'bg-sav-primary text-white border-sav-primary shadow-lg shadow-sav-primary/20' : 'bg-[#0f111a] text-slate-600 border-white/5 hover:border-white/10'}`}
                          >
                            {d.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 italic">Apertura de Turno</label>
                      <input type="time" value={formData.hora_inicio_turno} onChange={e => setFormData({...formData, hora_inicio_turno: e.target.value})} className="w-full bg-[#0f111a] border border-white/5 rounded-2xl px-6 py-4 text-xs font-black text-white outline-none focus:border-sav-primary/30 shadow-inner" required />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 italic">Cierre de Turno</label>
                      <input type="time" value={formData.hora_fin_turno} onChange={e => setFormData({...formData, hora_fin_turno: e.target.value})} className="w-full bg-[#0f111a] border border-white/5 rounded-2xl px-6 py-4 text-xs font-black text-white outline-none focus:border-sav-primary/30 shadow-inner" required />
                    </div>
                  </div>

                  <div className="flex gap-6 pt-2">
                     <label className="flex items-center gap-3 cursor-pointer p-4 rounded-2xl bg-[#0f111a] border border-white/5 flex-1 group">
                        <input type="checkbox" checked={formData.activo} onChange={e => setFormData({...formData, activo: e.target.checked})} className="sr-only peer" />
                        <div className="w-10 h-5 bg-slate-800 rounded-full peer peer-checked:bg-emerald-500 after:content-[''] after:absolute after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5 relative" />
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest group-hover:text-white transition-colors">Estado Activo</span>
                     </label>
                     <label className="flex items-center gap-3 cursor-pointer p-4 rounded-2xl bg-[#0f111a] border border-white/5 flex-1 group">
                        <input type="checkbox" checked={formData.recibe_notificaciones} onChange={e => setFormData({...formData, recibe_notificaciones: e.target.checked})} className="sr-only peer" />
                        <div className="w-10 h-5 bg-slate-800 rounded-full peer peer-checked:bg-blue-500 after:content-[''] after:absolute after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5 relative" />
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest group-hover:text-white transition-colors">Alertas Telegram</span>
                     </label>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 border-t border-white/5 pt-8">
                 <button type="submit" className="flex-1 py-5 rounded-[22px] bg-sav-primary text-white font-black text-[11px] uppercase tracking-[0.2em] shadow-xl shadow-sav-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3">
                   <Save size={18} /> {editingId ? 'Update Node Configuration' : 'Deploy New Staff Node'}
                 </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Staff Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {loading ? (
            Array(3).fill(0).map((_, i) => (
              <div key={i} className="bg-[#161926] border border-white/5 h-64 rounded-[40px] animate-pulse" />
            ))
          ) : Array.isArray(admins) && admins.map((admin, index) => (
            <motion.div
              key={admin.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ delay: index * 0.05 }}
              className="bg-[#161926] border border-white/5 p-8 rounded-[40px] shadow-2xl relative overflow-hidden group hover:border-sav-primary/20 transition-all duration-500"
            >
              <div className="absolute top-0 right-0 p-8 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity">
                <Shield size={120} />
              </div>

              <div className="space-y-6 relative z-10">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-[#0f111a] flex items-center justify-center font-black text-sav-primary text-xl border border-white/5 shadow-inner">
                      {admin.nombre?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <div>
                      <h4 className="text-lg font-black text-white uppercase tracking-tighter italic truncate w-32">{admin.nombre}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <div className={`w-2 h-2 rounded-full ${admin.activo ? 'bg-emerald-500 animate-pulse' : 'bg-slate-700'}`} />
                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{admin.activo ? 'Active Operator' : 'Standby'}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleEdit(admin)} className="p-3 rounded-xl bg-white/5 text-blue-500 border border-white/5 hover:bg-blue-500 hover:text-white transition-all shadow-lg">
                      <Edit3 size={16} />
                    </button>
                    <button onClick={() => handleDelete(admin.id)} className="p-3 rounded-xl bg-white/5 text-rose-500 border border-white/5 hover:bg-rose-500 hover:text-white transition-all shadow-lg">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="bg-[#0f111a] rounded-[30px] p-5 border border-white/5 space-y-4 shadow-inner">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Clock size={14} className="text-sav-primary" />
                      <p className="text-[10px] font-black text-white uppercase tracking-widest italic">{admin.hora_inicio_turno?.substring(0, 5) || '00:00'} - {admin.hora_fin_turno?.substring(0, 5) || '00:00'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                       {admin.recibe_notificaciones ? <Bell size={14} className="text-blue-500" /> : <BellOff size={14} className="text-slate-600" />}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {admin.dias_semana?.split(',').filter(Boolean).map(d => (
                      <span key={d} className="px-3 py-1 rounded-lg bg-white/5 border border-white/5 text-[8px] font-black text-slate-500 uppercase tracking-widest italic">
                        {d}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between opacity-50">
                   <div className="flex items-center gap-2">
                      <Send size={12} className="text-blue-500" />
                      <p className="text-[9px] font-mono text-slate-500">ID: {admin.telegram_user_id}</p>
                   </div>
                   <p className="text-[9px] font-black text-slate-600 uppercase italic">Staff V2.0</p>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
