import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Gift, 
  Plus, 
  Trash2, 
  Trophy, 
  ShieldCheck,
  Zap,
  Target,
  AlertTriangle,
  X,
  Save,
  User as UserIcon,
  Layers,
  CheckCircle2,
  Ticket,
  Edit3,
  ChevronRight,
  Sparkles,
  Search,
  RefreshCw,
  Percent,
  DollarSign,
  Users
} from 'lucide-react';
import { api } from '../../lib/api';
import { formatCurrency } from '../../utils/format';

export default function AdminRecompensasV2() {
  const [premios, setPremios] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [niveles, setNiveles] = useState([]);
  const [configs, setConfigs] = useState([]);
  const [forcedPrizes, setForcedPrizes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [giftUserSearchTerm, setGiftUserSearchTerm] = useState('');
  
  const [showModal, setShowModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [showPrivilegeModal, setShowPrivilegeModal] = useState(false);
  const [editingPremio, setEditingPremio] = useState(null);
  
  const [form, setForm] = useState({
    nombre: '',
    valor: '',
    probabilidad: '',
    color: '#4f46e5',
    activo: true,
    orden: 0,
    stock: -1,
    rareza: 'comun',
    cooldown_individual: 0,
    imagen: null,
    imagen_url: ''
  });

  const [privilegeForm, setPrivilegeForm] = useState({
    usuario_id: '',
    premio_id: ''
  });

  const [configForm, setConfigForm] = useState({
    target_type: 'usuario',
    target_id: '',
    premio_id_forzado: '',
    activa: true
  });

  const [giftForm, setGiftForm] = useState({
    tipo: 'todos',
    targetId: '',
    cantidad: 1
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [p, u, n, c, f] = await Promise.all([
        api.admin.premiosRuleta(),
        api.admin.usuarios(),
        api.levels.list(),
        api.admin.sorteoConfig.list(),
        api.admin.ruletaForzada()
      ]);
      setPremios(Array.isArray(p) ? p : []);
      setUsuarios(Array.isArray(u) ? u : []);
      setNiveles(Array.isArray(n) ? n : []);
      setConfigs(Array.isArray(c) ? c : []);
      setForcedPrizes(Array.isArray(f) ? f : []);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitPrivilege = async (e) => {
    e.preventDefault();
    if (!privilegeForm.usuario_id || !privilegeForm.premio_id) return alert('Seleccione usuario y premio');
    
    try {
      await api.admin.crearRuletaForzada(privilegeForm);
      alert('Privilegio asignado con éxito. El usuario ganará este premio en su próximo giro.');
      setShowPrivilegeModal(false);
      setPrivilegeForm({ usuario_id: '', premio_id: '' });
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeletePrivilege = async (id) => {
    if (!confirm('¿Eliminar este privilegio?')) return;
    try {
      await api.admin.eliminarRuletaForzada(id);
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Usar FormData siempre para asegurar que la imagen se envíe correctamente
      const formData = new FormData();
      formData.append('nombre', form.nombre || '');
      formData.append('valor', form.valor || 0);
      formData.append('probabilidad', form.probabilidad || 0);
      formData.append('color', form.color || '#4f46e5');
      formData.append('activo', String(form.activo));
      formData.append('orden', form.orden || 0);
      formData.append('stock', form.stock || -1);
      formData.append('rareza', form.rareza || 'comun');
      formData.append('cooldown_individual', form.cooldown_individual || 0);
      
      // Manejo de imagen
      if (form.imagen instanceof File) {
        formData.append('image', form.imagen);
      }
      
      if (form.imagen_url) {
        formData.append('imagen_url', form.imagen_url);
      }

      if (editingPremio) {
        await api.admin.actualizarPremioRuleta(editingPremio.id, formData);
      } else {
        await api.admin.crearPremioRuleta(formData);
      }
      
      setShowModal(false);
      fetchData();
      alert('Premio guardado exitosamente');
    } catch (err) {
      console.error('Submit error:', err);
      alert('Error al guardar: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleConfigSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.admin.sorteoConfig.Save(configForm);
      setShowConfigModal(false);
      fetchData();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleGiftSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.admin.regalarTickets({
        target_type: giftForm.tipo,
        target_value: giftForm.targetId,
        tickets: giftForm.cantidad
      });
      alert(res.message || 'Tickets distribuidos');
      setShowGiftModal(false);
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const deleteConfig = async (id) => {
    if (!confirm('¿Eliminar esta regla?')) return;
    try {
      await api.admin.sorteoConfig.delete(id);
      fetchData();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleEdit = (p) => {
    setEditingPremio(p);
    setForm({
      nombre: p.nombre,
      valor: p.valor,
      probabilidad: p.probabilidad,
      color: p.color || '#4f46e5', // Updated to match initial state
      activo: p.activo === 1 || p.activo === true,
      orden: p.orden,
      stock: p.stock !== undefined ? p.stock : -1,
      rareza: p.rareza || 'comun',
      cooldown_individual: p.cooldown_individual || 0,
      imagen: null,
      imagen_url: p.imagen_url
    });
    setShowModal(true);
  };

  const totalProb = premios.reduce((acc, p) => acc + Number(p.probabilidad), 0);

  return (
    <div className="space-y-10">
      {/* Header Section */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-8">
        <div className="space-y-2">
          <div className="flex items-center gap-4">
            <div className="p-3.5 rounded-2xl bg-gradient-to-tr from-bcb-primary to-violet-600 text-white shadow-xl shadow-bcb-primary/20">
              <Gift size={24} />
            </div>
            <div>
              <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic">Control de Premios</h1>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] flex items-center gap-2">
                <ShieldCheck size={14} className="text-bcb-primary" /> Gestión de probabilidades y premios forzados
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <button 
            onClick={() => setShowPrivilegeModal(true)}
            className="flex items-center gap-2 px-8 py-4 rounded-2xl bg-[#161926] border border-amber-500/30 text-amber-500 text-[10px] font-black uppercase tracking-widest hover:bg-amber-500 hover:text-white transition-all shadow-xl"
          >
            <ShieldCheck size={18} /> Privilegios de Ruleta
          </button>
          <button 
            onClick={() => setShowGiftModal(true)}
            className="flex items-center gap-2 px-8 py-4 rounded-2xl bg-[#161926] border border-white/5 text-slate-300 text-[10px] font-black uppercase tracking-widest hover:bg-white/5 hover:text-white transition-all shadow-xl"
          >
            <Ticket size={18} /> Regalar Tickets
          </button>
          <button 
            onClick={() => setShowConfigModal(true)}
            className="flex items-center gap-2 px-8 py-4 rounded-2xl bg-[#161926] border border-bcb-primary/30 text-bcb-primary text-[10px] font-black uppercase tracking-widest hover:bg-bcb-primary hover:text-white transition-all shadow-xl"
          >
            <Target size={18} /> Forzar Premio
          </button>
          <button 
            onClick={() => { setEditingPremio(null); setShowModal(true); setForm({ nombre: '', valor: '', probabilidad: '', color: '#1a1f36', activo: true, orden: 0 }); }}
            className="flex items-center gap-2 px-8 py-4 rounded-2xl bg-bcb-primary text-white text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-bcb-primary/20"
          >
            <Plus size={18} /> Nuevo Premio Base
          </button>
        </div>
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#161926] border border-white/5 p-8 rounded-[40px] relative overflow-hidden group shadow-2xl shadow-black/40">
           <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity"><RefreshCw size={80} /></div>
           <div className="p-3.5 rounded-2xl bg-blue-500/10 text-blue-500 border border-blue-500/20 w-fit mb-6 shadow-inner"><RefreshCw size={24} /></div>
           <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 italic">Total Rewards</p>
           <div className="flex items-end gap-2">
              <span className="text-4xl font-black text-white tracking-tighter">{premios.length}</span>
              <span className="text-[10px] font-bold text-slate-600 uppercase mb-2 tracking-widest italic">Nodes Active</span>
           </div>
        </div>
        <div className="bg-[#161926] border border-white/5 p-8 rounded-[40px] relative overflow-hidden group shadow-2xl shadow-black/40">
           <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity"><Percent size={80} /></div>
           <div className={`p-3.5 rounded-2xl ${totalProb > 100 ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'} w-fit mb-6 shadow-inner`}><Percent size={24} /></div>
           <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 italic">Probability Pool</p>
           <div className="flex items-end gap-2">
              <span className={`text-4xl font-black tracking-tighter ${totalProb > 100 ? 'text-rose-500 animate-pulse' : 'text-white'}`}>{totalProb}%</span>
              <span className="text-[10px] font-bold text-slate-600 uppercase mb-2 tracking-widest italic">/ 100% System Limit</span>
           </div>
        </div>
        <div className="bg-[#161926] border border-white/5 p-8 rounded-[40px] relative overflow-hidden group shadow-2xl shadow-black/40">
           <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity"><Trophy size={80} /></div>
           <div className="p-3.5 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 w-fit mb-6 shadow-inner"><Trophy size={24} /></div>
           <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 italic">Highest Jackpot</p>
           <div className="flex items-end gap-2">
              <span className="text-4xl font-black text-white tracking-tighter">{formatCurrency(premios.length > 0 ? Math.max(...premios.map(p => Number(p.valor))) : 0)}</span>
              <span className="text-[10px] font-bold text-slate-600 uppercase mb-2 tracking-widest italic">Bs Liquid</span>
           </div>
        </div>
      </div>

      {/* Probability Rules Section */}
      <div className="bg-[#161926] border border-white/5 rounded-[45px] shadow-2xl shadow-black/40 overflow-hidden">
        <div className="p-10 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
           <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 shadow-inner"><Target size={20} /></div>
              <h3 className="text-xl font-black text-white uppercase tracking-tighter italic">Reglas de Probabilidad Personalizada</h3>
           </div>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/5">
                <th className="px-10 py-6 text-[9px] font-black text-slate-500 uppercase tracking-widest">Objetivo</th>
                <th className="px-10 py-6 text-[9px] font-black text-slate-500 uppercase tracking-widest">Premio Forzado</th>
                <th className="px-10 py-6 text-[9px] font-black text-slate-500 uppercase tracking-widest">Estado</th>
                <th className="px-10 py-6 text-[9px] font-black text-slate-500 uppercase tracking-widest text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {configs.map((c) => (
                <tr key={c.id} className="hover:bg-white/[0.01] transition-colors group">
                  <td className="px-10 py-6">
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-xl bg-white/5 text-slate-400">
                        {c.target_type === 'usuario' ? <UserIcon size={18} /> : <Layers size={18} />}
                      </div>
                      <div>
                        <p className="text-sm font-black text-white uppercase tracking-tight italic">{c.target_name}</p>
                        <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Tipo: {c.target_type}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-10 py-6">
                    <p className="text-sm font-black text-bcb-primary tracking-tighter">{c.premio_forzado_nombre || 'Aleatorio'}</p>
                  </td>
                  <td className="px-10 py-6">
                    <div className={`px-4 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest border w-fit ${c.activa ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border-rose-500/20'}`}>
                      {c.activa ? 'Activa' : 'Pausada'}
                    </div>
                  </td>
                  <td className="px-10 py-6 text-right">
                    <button onClick={() => deleteConfig(c.id)} className="p-3 rounded-xl bg-white/5 text-rose-500 border border-white/5 hover:bg-rose-500 hover:text-white transition-all shadow-lg"><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
              {configs.length === 0 && (
                <tr>
                  <td colSpan="4" className="px-10 py-20 text-center">
                    <p className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.3em]">No hay reglas personalizadas configuradas</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Rewards Grid (Premios Base) */}
      <div className="bg-[#161926] border border-white/5 rounded-[45px] shadow-2xl shadow-black/40 overflow-hidden">
        <div className="p-10 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/[0.01]">
           <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-bcb-primary/10 text-bcb-primary border border-bcb-primary/20 shadow-inner"><Zap size={20} /></div>
              <h3 className="text-xl font-black text-white uppercase tracking-tighter italic">Nodos de Premio Base</h3>
           </div>
           <div className="relative group">
              <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-bcb-primary transition-colors" />
              <input 
                type="text" 
                placeholder="Audit reward nodes..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full md:w-96 pl-14 pr-8 py-5 rounded-2xl bg-[#0f111a] border border-white/5 text-xs font-black text-white outline-none focus:border-bcb-primary/30 shadow-inner"
              />
           </div>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/5">
                <th className="px-10 py-6 text-[9px] font-black text-slate-500 uppercase tracking-widest">Nombre</th>
                <th className="px-10 py-6 text-[9px] font-black text-slate-500 uppercase tracking-widest">Valor</th>
                <th className="px-10 py-6 text-[9px] font-black text-slate-500 uppercase tracking-widest">Probabilidad</th>
                <th className="px-10 py-6 text-[9px] font-black text-slate-500 uppercase tracking-widest">Stock</th>
                <th className="px-10 py-6 text-[9px] font-black text-slate-500 uppercase tracking-widest">Rareza</th>
                <th className="px-10 py-6 text-[9px] font-black text-slate-500 uppercase tracking-widest text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {premios.filter(p => p.nombre.toLowerCase().includes(searchTerm.toLowerCase())).map((p) => (
                <tr key={p.id} className="hover:bg-white/[0.01] transition-colors group">
                  <td className="px-10 py-6">
                    <div className="flex items-center gap-5">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden bg-slate-800" style={{ backgroundColor: p.imagen_url ? 'transparent' : p.color }}>
                        {p.imagen_url ? (
                          <img src={api.getMediaUrl(p.imagen_url)} alt={p.nombre} className="w-full h-full object-cover" />
                        ) : (
                          <Gift size={20} className="text-white" />
                        )}
                      </div>
                      <p className="text-sm font-black text-white uppercase tracking-tight italic">{p.nombre}</p>
                    </div>
                  </td>
                  <td className="px-10 py-6">
                    <p className="text-sm font-black text-white tracking-tighter">{formatCurrency(p.valor)}</p>
                  </td>
                  <td className="px-10 py-6">
                    <p className="text-xs font-black text-bcb-primary tracking-tighter">{p.probabilidad}%</p>
                  </td>
                  <td className="px-10 py-6">
                    <p className={`text-xs font-black tracking-tighter ${p.stock === 0 ? 'text-rose-500' : 'text-slate-400'}`}>
                      {p.stock === -1 ? '∞' : p.stock}
                    </p>
                  </td>
                  <td className="px-10 py-6">
                    <div className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border w-fit 
                      ${p.rareza === 'legendario' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 
                        p.rareza === 'epico' ? 'bg-purple-500/10 text-purple-500 border-purple-500/20' : 
                        p.rareza === 'raro' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' : 
                        'bg-slate-500/10 text-slate-400 border-slate-500/20'}`}>
                      {p.rareza}
                    </div>
                  </td>
                  <td className="px-10 py-6 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleEdit(p)} className="p-3 rounded-xl bg-white/5 text-bcb-primary border border-white/5 hover:bg-bcb-primary hover:text-white transition-all shadow-lg"><Edit3 size={16} /></button>
                      <button onClick={async () => { if(confirm('¿Eliminar?')) { await api.admin.eliminarPremioRuleta(p.id); fetchData(); } }} className="p-3 rounded-xl bg-white/5 text-rose-500 border border-white/5 hover:bg-rose-500 hover:text-white transition-all shadow-lg"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Configuración Personalizada Modal */}
      <AnimatePresence>
        {showConfigModal && (
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
              <div className="flex items-center gap-6 mb-10">
                <div className="p-4 rounded-[1.8rem] bg-amber-500/10 text-amber-500 border border-amber-500/20 shadow-inner">
                  <Target size={32} />
                </div>
                <div>
                  <h3 className="text-3xl font-black text-white uppercase tracking-tighter italic">Regla de Probabilidad</h3>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Protocolo de Control de Premios</p>
                </div>
              </div>

              <form onSubmit={handleConfigSubmit} className="space-y-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 italic">Tipo de Objetivo</label>
                  <select 
                    value={configForm.target_type} 
                    onChange={e => setConfigForm({...configForm, target_type: e.target.value, target_id: ''})}
                    className="w-full bg-[#0f111a] border border-white/5 rounded-2xl px-6 py-4 text-[10px] font-black text-white uppercase tracking-widest outline-none focus:border-bcb-primary/30 shadow-inner"
                  >
                    <option value="usuario">Usuario Específico</option>
                    <option value="nivel">Nivel VIP Completo</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 italic">Seleccionar {configForm.target_type === 'usuario' ? 'Usuario' : 'Nivel'}</label>
                  <select 
                    value={configForm.target_id} 
                    onChange={e => setConfigForm({...configForm, target_id: e.target.value})}
                    className="w-full bg-[#0f111a] border border-white/5 rounded-2xl px-6 py-4 text-[10px] font-black text-white uppercase tracking-widest outline-none focus:border-bcb-primary/30 shadow-inner"
                    required
                  >
                    <option value="">-- Seleccionar --</option>
                    {configForm.target_type === 'usuario' 
                      ? usuarios.map(u => <option key={u.id} value={u.id}>{u.nombre_usuario} ({u.telefono})</option>)
                      : niveles.map(n => <option key={n.id} value={n.id}>{n.nombre}</option>)
                    }
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 italic">Premio a Forzar (100% Probabilidad)</label>
                  <select 
                    value={configForm.premio_id_forzado} 
                    onChange={e => setConfigForm({...configForm, premio_id_forzado: e.target.value})}
                    className="w-full bg-[#0f111a] border border-white/5 rounded-2xl px-6 py-4 text-[10px] font-black text-bcb-primary uppercase tracking-widest outline-none focus:border-bcb-primary/30 shadow-inner"
                    required
                  >
                    <option value="">-- Ninguno (Usar Probabilidad Base) --</option>
                    {premios.map(p => <option key={p.id} value={p.id}>{p.nombre} ({formatCurrency(p.valor)})</option>)}
                  </select>
                </div>

                <div className="flex gap-4 pt-4">
                   <button type="button" onClick={() => setShowConfigModal(false)} className="flex-1 px-8 py-5 rounded-[25px] bg-white/5 text-slate-400 font-black text-[11px] uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all border border-white/5">Cancelar</button>
                   <button type="submit" className="flex-1 px-8 py-5 rounded-[25px] bg-bcb-primary text-white font-black text-[11px] uppercase tracking-widest hover:bg-bcb-primary/80 transition-all shadow-2xl shadow-bcb-primary/30 active:scale-95">Guardar Regla</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reward Creation Modal */}
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
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-bcb-primary to-rose-600 shadow-lg shadow-bcb-primary/50" />
              <div className="flex items-center gap-6 mb-10">
                <div className="p-4 rounded-[1.8rem] bg-bcb-primary/10 text-bcb-primary border border-bcb-primary/20 shadow-inner">
                  <Zap size={32} />
                </div>
                <div>
                  <h3 className="text-3xl font-black text-white uppercase tracking-tighter italic">{editingPremio ? 'Configure Reward Node' : 'Initialize New Reward'}</h3>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Protocolo de Configuración Institucional</p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 italic">Imagen del Premio (Opcional)</label>
                  <div className="flex items-center gap-4">
                    {form.imagen_url && !form.imagen && (
                      <div className="w-16 h-16 rounded-2xl overflow-hidden border border-white/10">
                        <img src={api.getMediaUrl(form.imagen_url)} className="w-full h-full object-cover" alt="Preview" />
                      </div>
                    )}
                    {form.imagen && (
                      <div className="w-16 h-16 rounded-2xl overflow-hidden border border-bcb-primary">
                        <img src={URL.createObjectURL(form.imagen)} className="w-full h-full object-cover" alt="Preview" />
                      </div>
                    )}
                    <label className="flex-1 flex flex-col items-center justify-center h-16 border-2 border-dashed border-white/10 rounded-2xl hover:border-bcb-primary/50 hover:bg-bcb-primary/5 transition-all cursor-pointer">
                      <Plus size={20} className="text-slate-500" />
                      <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mt-1">Subir Imagen</span>
                      <input type="file" className="hidden" accept="image/*" onChange={e => setForm({...form, imagen: e.target.files[0]})} />
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 italic">Reward Name</label>
                    <input type="text" value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} className="w-full bg-[#0f111a] border border-white/5 rounded-2xl px-6 py-4 text-xs font-black text-white outline-none focus:border-bcb-primary/30 shadow-inner" required />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 italic">Value (Bs)</label>
                    <input type="number" value={form.valor} onChange={e => setForm({...form, valor: e.target.value})} className="w-full bg-[#0f111a] border border-white/5 rounded-2xl px-6 py-4 text-xs font-black text-white outline-none focus:border-bcb-primary/30 shadow-inner" required />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 italic">Probability %</label>
                    <input type="number" step="0.01" value={form.probabilidad} onChange={e => setForm({...form, probabilidad: e.target.value})} className="w-full bg-[#0f111a] border border-white/5 rounded-2xl px-6 py-4 text-xs font-black text-bcb-primary outline-none focus:border-bcb-primary/30 shadow-inner" required />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 italic">Visual Color (Hex)</label>
                    <div className="flex gap-3">
                       <input type="color" value={form.color} onChange={e => setForm({...form, color: e.target.value})} className="w-14 h-14 bg-[#0f111a] border border-white/5 rounded-xl p-1 cursor-pointer" />
                       <input type="text" value={form.color} onChange={e => setForm({...form, color: e.target.value})} className="flex-1 bg-[#0f111a] border border-white/5 rounded-2xl px-4 py-4 text-[10px] font-mono text-slate-400 outline-none focus:border-bcb-primary/30 shadow-inner" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 italic">Stock (-1 = ∞)</label>
                    <input type="number" value={form.stock} onChange={e => setForm({...form, stock: e.target.value})} className="w-full bg-[#0f111a] border border-white/5 rounded-2xl px-6 py-4 text-xs font-black text-white outline-none focus:border-bcb-primary/30 shadow-inner" required />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 italic">Cooldown (Minutos)</label>
                    <input type="number" value={form.cooldown_individual} onChange={e => setForm({...form, cooldown_individual: e.target.value})} className="w-full bg-[#0f111a] border border-white/5 rounded-2xl px-6 py-4 text-xs font-black text-white outline-none focus:border-bcb-primary/30 shadow-inner" required />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 italic">Rareza</label>
                    <select value={form.rareza} onChange={e => setForm({...form, rareza: e.target.value})} className="w-full bg-[#0f111a] border border-white/5 rounded-2xl px-6 py-4 text-[10px] font-black text-white uppercase outline-none focus:border-bcb-primary/30 shadow-inner">
                      <option value="comun">Común</option>
                      <option value="raro">Raro</option>
                      <option value="epico">Épico</option>
                      <option value="legendario">Legendario</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 italic">Operational Index (Order)</label>
                    <input type="number" value={form.orden} onChange={e => setForm({...form, orden: e.target.value})} className="w-full bg-[#0f111a] border border-white/5 rounded-2xl px-6 py-4 text-xs font-black text-white outline-none focus:border-bcb-primary/30 shadow-inner" required />
                  </div>
                </div>

                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 italic">Estado del Premio</label>
                   <button 
                     type="button"
                     onClick={() => setForm({...form, activo: !form.activo})}
                     className={`w-full flex items-center justify-center gap-3 border rounded-2xl px-6 py-4 transition-all ${form.activo ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-rose-500/10 border-rose-500/20 text-rose-500'}`}
                   >
                     <div className={`w-2 h-2 rounded-full animate-pulse ${form.activo ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]'}`} />
                     <span className="text-[10px] font-black uppercase tracking-widest">{form.activo ? 'Activo / Visible en Ruleta' : 'Inactivo / Oculto en Ruleta'}</span>
                   </button>
                </div>

                <div className="flex gap-4 pt-6">
                   <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-8 py-5 rounded-[25px] bg-white/5 text-slate-400 font-black text-[11px] uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all border border-white/5">Cancel</button>
                   <button type="submit" className="flex-1 px-8 py-5 rounded-[25px] bg-bcb-primary text-white font-black text-[11px] uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-2xl shadow-bcb-primary/30">Deploy Reward</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Privileges (Tricar Ruleta) Modal */}
      <AnimatePresence>
        {showPrivilegeModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/95 backdrop-blur-3xl flex items-center justify-center p-6 z-[200]"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 30 }}
              className="bg-[#161926] border border-white/10 p-12 rounded-[50px] max-w-2xl w-full shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-amber-500 to-amber-700 shadow-lg shadow-amber-500/50" />
              
              <div className="flex items-center gap-6 mb-10">
                <div className="p-4 rounded-[1.8rem] bg-amber-500/10 text-amber-500 border border-amber-500/20 shadow-inner">
                  <ShieldCheck size={32} />
                </div>
                <div>
                  <h3 className="text-3xl font-black text-white uppercase tracking-tighter italic">Privilegios de Ruleta</h3>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Control de Ganadores Específicos</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <form onSubmit={handleSubmitPrivilege} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 italic">Buscar Usuario</label>
                    <div className="relative">
                      <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input 
                        type="text" 
                        placeholder="Nombre o teléfono..." 
                        value={userSearchTerm} 
                        onChange={e => setUserSearchTerm(e.target.value)}
                        className="w-full bg-[#0f111a] border border-white/5 rounded-2xl pl-10 pr-4 py-3 text-[10px] font-black text-white uppercase outline-none focus:border-amber-500/30 shadow-inner"
                      />
                    </div>
                    <select 
                      value={privilegeForm.usuario_id} 
                      onChange={e => setPrivilegeForm({...privilegeForm, usuario_id: e.target.value})}
                      className="w-full bg-[#0f111a] border border-white/5 rounded-2xl px-6 py-4 text-[10px] font-black text-white uppercase outline-none focus:border-amber-500/30 shadow-inner appearance-none cursor-pointer"
                    >
                      <option value="">-- Seleccionar Usuario --</option>
                      {usuarios.filter(u => 
                        u.nombre_usuario.toLowerCase().includes(userSearchTerm.toLowerCase()) || 
                        u.telefono.includes(userSearchTerm)
                      ).slice(0, 10).map(u => (
                        <option key={u.id} value={u.id}>{u.nombre_usuario} ({u.telefono})</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 italic">Premio a Entregar</label>
                    <select 
                      value={privilegeForm.premio_id} 
                      onChange={e => setPrivilegeForm({...privilegeForm, premio_id: e.target.value})}
                      className="w-full bg-[#0f111a] border border-white/5 rounded-2xl px-6 py-4 text-[10px] font-black text-white uppercase outline-none focus:border-amber-500/30 shadow-inner appearance-none cursor-pointer"
                    >
                      <option value="">-- Seleccionar Premio --</option>
                      {premios.map(p => (
                        <option key={p.id} value={p.id}>{p.nombre} ({p.valor} Bs)</option>
                      ))}
                    </select>
                  </div>

                  <button type="submit" className="w-full py-5 rounded-[25px] bg-amber-500 text-white font-black text-[11px] uppercase tracking-widest hover:bg-amber-600 transition-all shadow-2xl shadow-amber-500/30 active:scale-95">Asignar Privilegio</button>
                  <button type="button" onClick={() => setShowPrivilegeModal(false)} className="w-full py-4 rounded-[25px] bg-white/5 text-slate-400 font-black text-[10px] uppercase tracking-widest border border-white/5">Cerrar</button>
                </form>

                <div className="space-y-4">
                   <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic border-b border-white/5 pb-2">Privilegios Activos (Pendientes)</h4>
                   <div className="max-h-[300px] overflow-y-auto custom-scrollbar space-y-3 pr-2">
                      {forcedPrizes.filter(f => f.usado === 0).map(f => (
                        <div key={f.id} className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between group">
                          <div>
                            <p className="text-[10px] font-black text-white uppercase tracking-tight">{f.nombre_usuario}</p>
                            <p className="text-[8px] font-bold text-amber-500 uppercase tracking-widest">Ganará: {f.premio_nombre}</p>
                          </div>
                          <button onClick={() => handleDeletePrivilege(f.id)} className="p-2 rounded-lg bg-rose-500/10 text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                      {forcedPrizes.filter(f => f.usado === 0).length === 0 && (
                        <p className="text-[9px] font-bold text-slate-600 uppercase text-center py-10">No hay privilegios configurados</p>
                      )}
                   </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Gift Tickets Modal */}
      <AnimatePresence>
        {showGiftModal && (
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
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-bcb-primary to-indigo-600 shadow-lg shadow-bcb-primary/50" />
              
              <div className="flex items-center gap-6 mb-10">
                <div className="p-4 rounded-[1.8rem] bg-bcb-primary/10 text-bcb-primary border border-bcb-primary/20 shadow-inner">
                  <Ticket size={32} className="animate-bounce" />
                </div>
                <div>
                  <h3 className="text-3xl font-black text-white uppercase tracking-tighter italic">Ticket Distribution</h3>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Protocolo de Incentivos Masivos</p>
                </div>
              </div>

              <form onSubmit={handleGiftSubmit} className="space-y-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 italic">Target Audience</label>
                  <select 
                    value={giftForm.tipo} 
                    onChange={e => setGiftForm({...giftForm, tipo: e.target.value})}
                    className="w-full bg-[#0f111a] border border-white/5 rounded-2xl px-6 py-4 text-[10px] font-black text-white uppercase tracking-widest outline-none focus:border-bcb-primary/30 shadow-inner appearance-none cursor-pointer"
                  >
                    <option value="todos">Todos los Usuarios (Full Rollout)</option>
                    <option value="nivel">Filtrar por Nivel VIP</option>
                    <option value="usuario">Usuario Específico (Direct)</option>
                  </select>
                </div>

                {giftForm.tipo === 'nivel' && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 italic">Select VIP Level</label>
                    <select 
                      value={giftForm.targetId} 
                      onChange={e => setGiftForm({...giftForm, targetId: e.target.value})}
                      className="w-full bg-[#0f111a] border border-white/5 rounded-2xl px-6 py-4 text-[10px] font-black text-white uppercase tracking-widest outline-none focus:border-bcb-primary/30 shadow-inner appearance-none cursor-pointer"
                    >
                      <option value="">-- Choose Level --</option>
                      {niveles.map(n => <option key={n.id} value={n.id}>{n.nombre}</option>)}
                    </select>
                  </div>
                )}

                {giftForm.tipo === 'usuario' && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 italic">Buscar Usuario</label>
                    <div className="relative">
                      <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input 
                        type="text" 
                        placeholder="Nombre o teléfono..." 
                        value={giftUserSearchTerm} 
                        onChange={e => setGiftUserSearchTerm(e.target.value)}
                        className="w-full bg-[#0f111a] border border-white/5 rounded-2xl pl-10 pr-4 py-3 text-[10px] font-black text-white uppercase outline-none focus:border-bcb-primary/30 shadow-inner"
                      />
                    </div>
                    <select 
                      value={giftForm.targetId} 
                      onChange={e => setGiftForm({...giftForm, targetId: e.target.value})}
                      className="w-full bg-[#0f111a] border border-white/5 rounded-2xl px-6 py-4 text-[10px] font-black text-white uppercase tracking-widest outline-none focus:border-bcb-primary/30 shadow-inner appearance-none cursor-pointer"
                    >
                      <option value="">-- Seleccionar Usuario --</option>
                      {usuarios.filter(u => 
                        u.nombre_usuario.toLowerCase().includes(giftUserSearchTerm.toLowerCase()) || 
                        u.telefono.includes(giftUserSearchTerm)
                      ).slice(0, 10).map(u => (
                        <option key={u.id} value={u.id}>{u.nombre_usuario} ({u.telefono})</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 italic">Ticket Quantity</label>
                  <input 
                    type="number" 
                    value={giftForm.cantidad} 
                    onChange={e => setGiftForm({...giftForm, cantidad: e.target.value})} 
                    className="w-full bg-[#0f111a] border border-white/5 rounded-2xl px-6 py-4 text-xs font-black text-bcb-primary outline-none focus:border-bcb-primary/30 shadow-inner" 
                    min="1" 
                  />
                </div>

                <div className="flex gap-4 pt-4">
                   <button type="button" onClick={() => setShowGiftModal(false)} className="flex-1 px-8 py-5 rounded-[25px] bg-white/5 text-slate-400 font-black text-[11px] uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all border border-white/5">Abort</button>
                   <button type="submit" className="flex-1 px-8 py-5 rounded-[25px] bg-bcb-primary text-white font-black text-[11px] uppercase tracking-widest hover:bg-bcb-primary/80 transition-all shadow-2xl shadow-bcb-primary/30 active:scale-95">Deploy Tickets</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}






