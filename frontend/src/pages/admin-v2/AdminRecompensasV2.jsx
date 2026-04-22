import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Gift, 
  Plus, 
  Search, 
  Trash2, 
  Edit3, 
  Star, 
  Trophy, 
  Sparkles,
  RefreshCw,
  Percent,
  DollarSign,
  Ticket,
  Users,
  User as UserIcon,
  ChevronRight,
  ShieldCheck,
  Zap,
  Target,
  History,
  AlertTriangle,
  X,
  Save,
  CheckCircle2
} from 'lucide-react';
import { api } from '../../lib/api';
import { formatCurrency } from '../../utils/format';

export default function AdminRecompensasV2() {
  const [premios, setPremios] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [niveles, setNiveles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [editingPremio, setEditingPremio] = useState(null);
  
  const [form, setForm] = useState({
    nombre: '',
    valor: '',
    probabilidad: '',
    color: '#1a1f36',
    activo: true,
    orden: 0
  });

  const [giftForm, setGiftGiftForm] = useState({
    tipo: 'todos', // todos, nivel, usuario
    targetId: '',
    cantidad: 1
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [p, u, n] = await Promise.all([
        api.admin.premiosRuleta(),
        api.admin.usuarios(),
        api.levels.list()
      ]);
      setPremios(Array.isArray(p) ? p : []);
      setUsuarios(Array.isArray(u) ? u : []);
      setNiveles(Array.isArray(n) ? n : []);
    } catch (err) {
      console.error('Error fetching rewards data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingPremio) await api.admin.actualizarPremioRuleta(editingPremio.id, form);
      else await api.admin.crearPremioRuleta(form);
      setShowModal(false);
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

  const totalProb = premios.reduce((acc, p) => acc + Number(p.probabilidad), 0);

  return (
    <div className="space-y-10">
      {/* Header Section */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-8">
        <div className="space-y-2">
          <div className="flex items-center gap-4">
            <div className="p-3.5 rounded-2xl bg-gradient-to-tr from-sav-primary to-violet-600 text-white shadow-xl shadow-sav-primary/20">
              <Gift size={24} />
            </div>
            <div>
              <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic">Institutional Rewards</h1>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] flex items-center gap-2">
                <ShieldCheck size={14} className="text-sav-primary" /> Gestión de ruleta y distribución de incentivos
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <button 
            onClick={() => setShowGiftModal(true)}
            className="flex items-center gap-2 px-8 py-4 rounded-2xl bg-[#161926] border border-white/5 text-slate-300 text-[10px] font-black uppercase tracking-widest hover:bg-white/5 hover:text-white transition-all shadow-xl"
          >
            <Ticket size={18} /> Distribuir Tickets
          </button>
          <button 
            onClick={() => { setEditingPremio(null); setShowModal(true); setForm({ nombre: '', valor: '', probabilidad: '', color: '#1a1f36', activo: true, orden: 0 }); }}
            className="flex items-center gap-2 px-8 py-4 rounded-2xl bg-sav-primary text-white text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-sav-primary/20"
          >
            <Plus size={18} /> New Reward Node
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
              <span className="text-[10px] font-bold text-slate-600 uppercase mb-2 tracking-widest italic">BOB Liquid</span>
           </div>
        </div>
      </div>

      {/* Rewards Grid */}
      <div className="bg-[#161926] border border-white/5 rounded-[45px] shadow-2xl shadow-black/40 overflow-hidden">
        <div className="p-10 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/[0.01]">
           <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-sav-primary/10 text-sav-primary border border-sav-primary/20 shadow-inner"><Zap size={20} /></div>
              <h3 className="text-xl font-black text-white uppercase tracking-tighter italic">Active Reward Pool</h3>
           </div>
           <div className="relative group">
              <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-sav-primary transition-colors" />
              <input 
                type="text" 
                placeholder="Audit reward nodes..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full md:w-96 pl-14 pr-8 py-5 rounded-2xl bg-[#0f111a] border border-white/5 text-xs font-black text-white outline-none focus:border-sav-primary/30 shadow-inner"
              />
           </div>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/5">
                <th className="px-10 py-6 text-[9px] font-black text-slate-500 uppercase tracking-widest">Reward Node</th>
                <th className="px-10 py-6 text-[9px] font-black text-slate-500 uppercase tracking-widest">Payout Value</th>
                <th className="px-10 py-6 text-[9px] font-black text-slate-500 uppercase tracking-widest">Probability</th>
                <th className="px-10 py-6 text-[9px] font-black text-slate-500 uppercase tracking-widest">Operational Status</th>
                <th className="px-10 py-6 text-[9px] font-black text-slate-500 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {premios.filter(p => p.nombre.toLowerCase().includes(searchTerm.toLowerCase())).map((p, index) => (
                <tr key={p.id} className="hover:bg-white/[0.01] transition-colors group">
                  <td className="px-10 py-6">
                    <div className="flex items-center gap-5">
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-black/40 border border-white/10" style={{ backgroundColor: p.color }}>
                        <Gift size={24} />
                      </div>
                      <div>
                        <p className="text-sm font-black text-white uppercase tracking-tight italic">{p.nombre}</p>
                        <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-1">Order Index: {p.orden}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-10 py-6">
                    <p className="text-sm font-black text-white tracking-tighter">{formatCurrency(p.valor)} <span className="text-[9px] text-slate-500 italic uppercase">BOB</span></p>
                  </td>
                  <td className="px-10 py-6">
                    <div className="flex items-center gap-3">
                       <div className="w-24 h-1.5 bg-[#0f111a] rounded-full overflow-hidden border border-white/5 shadow-inner">
                          <div className="h-full bg-sav-primary rounded-full shadow-lg shadow-sav-primary/50" style={{ width: `${p.probabilidad}%` }} />
                       </div>
                       <p className="text-xs font-black text-sav-primary tracking-tighter">{p.probabilidad}%</p>
                    </div>
                  </td>
                  <td className="px-10 py-6">
                    <div className={`px-4 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest border w-fit ${p.activo ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 shadow-lg shadow-emerald-500/5' : 'bg-rose-500/10 text-rose-500 border-rose-500/20'}`}>
                      {p.activo ? 'Online' : 'Standby'}
                    </div>
                  </td>
                  <td className="px-10 py-6 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => { setEditingPremio(p); setForm(p); setShowModal(true); }} className="p-3 rounded-xl bg-white/5 text-sav-primary border border-white/5 hover:bg-sav-primary hover:text-white transition-all shadow-lg"><Edit3 size={16} /></button>
                      <button onClick={async () => { if(confirm('¿Eliminar?')) { await api.admin.eliminarPremioRuleta(p.id); fetchData(); } }} className="p-3 rounded-xl bg-white/5 text-rose-500 border border-white/5 hover:bg-rose-500 hover:text-white transition-all shadow-lg"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Distribution Modal */}
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
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-sav-primary to-indigo-600 shadow-lg shadow-sav-primary/50" />
              
              <div className="flex items-center gap-6 mb-10">
                <div className="p-4 rounded-[1.8rem] bg-sav-primary/10 text-sav-primary border border-sav-primary/20 shadow-inner">
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
                    onChange={e => setGiftGiftForm({...giftForm, tipo: e.target.value})}
                    className="w-full bg-[#0f111a] border border-white/5 rounded-2xl px-6 py-4 text-[10px] font-black text-white uppercase tracking-widest outline-none focus:border-sav-primary/30 shadow-inner appearance-none cursor-pointer"
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
                      onChange={e => setGiftGiftForm({...giftForm, targetId: e.target.value})}
                      className="w-full bg-[#0f111a] border border-white/5 rounded-2xl px-6 py-4 text-[10px] font-black text-white uppercase tracking-widest outline-none focus:border-sav-primary/30 shadow-inner appearance-none cursor-pointer"
                    >
                      <option value="">-- Choose Level --</option>
                      {niveles.map(n => <option key={n.id} value={n.id}>{n.nombre}</option>)}
                    </select>
                  </div>
                )}

                {giftForm.tipo === 'usuario' && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 italic">Target Username</label>
                    <select 
                      value={giftForm.targetId} 
                      onChange={e => setGiftGiftForm({...giftForm, targetId: e.target.value})}
                      className="w-full bg-[#0f111a] border border-white/5 rounded-2xl px-6 py-4 text-[10px] font-black text-white uppercase tracking-widest outline-none focus:border-sav-primary/30 shadow-inner appearance-none cursor-pointer"
                    >
                      <option value="">-- Choose User --</option>
                      {usuarios.map(u => <option key={u.id} value={u.id}>{u.nombre_usuario}</option>)}
                    </select>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 italic">Ticket Quantity</label>
                  <input 
                    type="number" 
                    value={giftForm.cantidad} 
                    onChange={e => setGiftGiftForm({...giftForm, cantidad: e.target.value})} 
                    className="w-full bg-[#0f111a] border border-white/5 rounded-2xl px-6 py-4 text-xs font-black text-sav-primary outline-none focus:border-sav-primary/30 shadow-inner" 
                    min="1" 
                  />
                </div>

                <div className="flex gap-4 pt-4">
                   <button type="button" onClick={() => setShowGiftModal(false)} className="flex-1 px-8 py-5 rounded-[25px] bg-white/5 text-slate-400 font-black text-[11px] uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all border border-white/5">Abort</button>
                   <button type="submit" className="flex-1 px-8 py-5 rounded-[25px] bg-sav-primary text-white font-black text-[11px] uppercase tracking-widest hover:bg-sav-primary/80 transition-all shadow-2xl shadow-sav-primary/30 active:scale-95">Deploy Tickets</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit/Create Reward Modal */}
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
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-sav-primary to-rose-600 shadow-lg shadow-sav-primary/50" />
              
              <div className="flex items-center gap-6 mb-10">
                <div className="p-4 rounded-[1.8rem] bg-sav-primary/10 text-sav-primary border border-sav-primary/20 shadow-inner">
                  <Zap size={32} />
                </div>
                <div>
                  <h3 className="text-3xl font-black text-white uppercase tracking-tighter italic">{editingPremio ? 'Configure Reward Node' : 'Initialize New Reward'}</h3>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Protocolo de Configuración Institucional</p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 italic">Reward Name</label>
                    <input type="text" value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} className="w-full bg-[#0f111a] border border-white/5 rounded-2xl px-6 py-4 text-xs font-black text-white outline-none focus:border-sav-primary/30 shadow-inner" required />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 italic">Value (BOB)</label>
                    <input type="number" value={form.valor} onChange={e => setForm({...form, valor: e.target.value})} className="w-full bg-[#0f111a] border border-white/5 rounded-2xl px-6 py-4 text-xs font-black text-white outline-none focus:border-sav-primary/30 shadow-inner" required />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 italic">Probability %</label>
                    <input type="number" step="0.01" value={form.probabilidad} onChange={e => setForm({...form, probabilidad: e.target.value})} className="w-full bg-[#0f111a] border border-white/5 rounded-2xl px-6 py-4 text-xs font-black text-sav-primary outline-none focus:border-sav-primary/30 shadow-inner" required />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 italic">Visual Color (Hex)</label>
                    <div className="flex gap-3">
                       <input type="color" value={form.color} onChange={e => setForm({...form, color: e.target.value})} className="w-14 h-14 bg-[#0f111a] border border-white/5 rounded-xl p-1 cursor-pointer" />
                       <input type="text" value={form.color} onChange={e => setForm({...form, color: e.target.value})} className="flex-1 bg-[#0f111a] border border-white/5 rounded-2xl px-4 py-4 text-[10px] font-mono text-slate-400 outline-none focus:border-sav-primary/30 shadow-inner" />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 italic">Operational Index (Order)</label>
                  <input type="number" value={form.orden} onChange={e => setForm({...form, orden: e.target.value})} className="w-full bg-[#0f111a] border border-white/5 rounded-2xl px-6 py-4 text-xs font-black text-white outline-none focus:border-sav-primary/30 shadow-inner" required />
                </div>

                <div className="flex gap-4 pt-6">
                   <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-8 py-5 rounded-[25px] bg-white/5 text-slate-400 font-black text-[11px] uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all border border-white/5">Cancel</button>
                   <button type="submit" className="flex-1 px-8 py-5 rounded-[25px] bg-sav-primary text-white font-black text-[11px] uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-2xl shadow-sav-primary/30">Deploy Reward</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
