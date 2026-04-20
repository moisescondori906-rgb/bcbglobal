import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  HelpCircle, 
  Plus, 
  Trash2, 
  Edit3, 
  Save, 
  X, 
  Zap, 
  RefreshCw,
  Target,
  FileQuestion,
  CheckCircle2,
  Users,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  History
} from 'lucide-react';
import { api } from '../../lib/api';

export default function AdminCuestionarioV2() {
  const [list, setList] = useState([]);
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [viewTab, setViewTab] = useState('surveys'); // surveys, responses
  
  const [form, setForm] = useState({
    titulo: '',
    descripcion: '',
    preguntas: [{ t: '', options: '' }],
    activo: true
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [surveys, resps] = await Promise.all([
        api.get('/admin/cuestionarios'),
        api.get('/admin/cuestionario/respuestas')
      ]);
      setList(surveys || []);
      setResponses(resps || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPregunta = () => {
    setForm({...form, preguntas: [...form.preguntas, { t: '', options: '' }]});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        preguntas: form.preguntas.map(p => ({
          t: p.t,
          o: p.options.split(',').map(o => o.trim()).filter(o => o)
        }))
      };
      await api.post('/admin/cuestionarios', payload);
      setShowModal(false);
      setForm({ titulo: '', descripcion: '', preguntas: [{ t: '', options: '' }], activo: true });
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar cuestionario permanentemente?')) return;
    try {
      await api.delete(`/admin/cuestionarios/${id}`);
      fetchData();
    } catch (err) {
      alert('Error');
    }
  };

  return (
    <div className="space-y-10">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-8">
        <div className="space-y-2">
          <div className="flex items-center gap-4">
            <div className="p-3.5 rounded-2xl bg-gradient-to-tr from-sav-primary to-indigo-600 text-white shadow-xl">
              <HelpCircle size={24} />
            </div>
            <div>
              <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic">Institutional Surveys</h1>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] flex items-center gap-2">
                <ShieldCheck size={14} className="text-sav-primary" /> Gestión de feedback y recolección de datos
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
           <div className="flex bg-[#161926] p-1.5 rounded-2xl border border-white/5 shadow-xl">
              <button 
                onClick={() => setViewTab('surveys')}
                className={`px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${viewTab === 'surveys' ? 'bg-sav-primary text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
              >
                Cuestionarios
              </button>
              <button 
                onClick={() => setViewTab('responses')}
                className={`px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${viewTab === 'responses' ? 'bg-sav-primary text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
              >
                Respuestas
              </button>
           </div>
           <button 
             onClick={() => setShowModal(true)}
             className="flex items-center gap-2 px-8 py-4 rounded-2xl bg-sav-primary text-white text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-xl"
           >
             <Plus size={18} /> New Survey
           </button>
        </div>
      </div>

      {viewTab === 'surveys' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {list.map((s, idx) => (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-[#161926] border border-white/5 p-8 rounded-[40px] shadow-2xl relative overflow-hidden group hover:border-sav-primary/20 transition-all duration-500"
              >
                <div className="flex flex-col h-full justify-between gap-6">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                       <div className="w-14 h-14 rounded-2xl bg-[#0f111a] border border-white/5 flex items-center justify-center text-sav-primary shadow-inner">
                          <FileQuestion size={28} />
                       </div>
                       <button onClick={() => handleDelete(s.id)} className="p-3 rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20 hover:bg-rose-500 hover:text-white transition-all shadow-lg">
                          <Trash2 size={16} />
                       </button>
                    </div>
                    <div>
                       <h3 className="text-xl font-black text-white uppercase tracking-tighter italic truncate">{s.titulo}</h3>
                       <p className="text-[10px] font-bold text-slate-500 mt-1 line-clamp-2 leading-relaxed">{s.descripcion}</p>
                    </div>
                    <div className={`px-4 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest border w-fit ${s.activo ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border-rose-500/20'}`}>
                      {s.activo ? 'Publicado' : 'Draft'}
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-6 border-t border-white/5">
                     <div className="flex items-center gap-2">
                        <Users size={14} className="text-slate-500" />
                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                          {responses.filter(r => r.cuestionario_id === s.id).length} Participantes
                        </span>
                     </div>
                     <p className="text-[8px] font-bold text-slate-600 uppercase tracking-widest">{new Date(s.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div className="bg-[#161926] border border-white/5 rounded-[45px] shadow-2xl overflow-hidden">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.01]">
                  <th className="px-10 py-6 text-[9px] font-black text-slate-500 uppercase tracking-widest">Usuario</th>
                  <th className="px-10 py-6 text-[9px] font-black text-slate-500 uppercase tracking-widest">Cuestionario</th>
                  <th className="px-10 py-6 text-[9px] font-black text-slate-500 uppercase tracking-widest">Respuestas</th>
                  <th className="px-10 py-6 text-[9px] font-black text-slate-500 uppercase tracking-widest text-right">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {responses.map((r) => (
                  <tr key={r.id} className="hover:bg-white/[0.01] transition-colors">
                    <td className="px-10 py-6">
                      <p className="text-sm font-black text-white uppercase tracking-tight italic">{r.nombre_usuario}</p>
                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{r.telefono}</p>
                    </td>
                    <td className="px-10 py-6">
                       <p className="text-[10px] font-black text-sav-primary uppercase tracking-widest">{list.find(s => s.id === r.cuestionario_id)?.titulo || 'Survey'}</p>
                    </td>
                    <td className="px-10 py-6">
                       <div className="flex gap-2">
                          <button className="px-4 py-2 rounded-xl bg-white/5 border border-white/5 text-[9px] font-black text-slate-300 uppercase tracking-widest hover:bg-white/10 transition-all flex items-center gap-2">
                             <History size={12} /> View Raw Data
                          </button>
                       </div>
                    </td>
                    <td className="px-10 py-6 text-right">
                       <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">{new Date(r.created_at).toLocaleString()}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
              className="bg-[#161926] border border-white/10 p-12 rounded-[50px] max-w-2xl w-full shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-sav-primary to-indigo-600 shadow-lg" />
              
              <h3 className="text-3xl font-black text-white uppercase tracking-tighter italic mb-8">Initialize Survey</h3>

              <form onSubmit={handleSubmit} className="space-y-6 max-h-[70vh] overflow-y-auto pr-4 custom-scrollbar">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 italic">Survey Title</label>
                  <input type="text" value={form.titulo} onChange={e => setForm({...form, titulo: e.target.value})} className="w-full bg-[#0f111a] border border-white/5 rounded-2xl px-6 py-4 text-xs font-black text-white outline-none focus:border-sav-primary/30 shadow-inner" required />
                </div>
                
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 italic">Short Description</label>
                  <textarea value={form.descripcion} onChange={e => setForm({...form, descripcion: e.target.value})} className="w-full bg-[#0f111a] border border-white/5 rounded-2xl px-6 py-4 text-xs font-bold text-slate-300 outline-none focus:border-sav-primary/30 shadow-inner min-h-[100px] resize-none" />
                </div>

                <div className="space-y-6 pt-4 border-t border-white/5">
                   <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black text-white uppercase tracking-widest italic">Preguntas del Sistema</h4>
                      <button type="button" onClick={handleAddPregunta} className="p-2 rounded-xl bg-sav-primary/10 text-sav-primary border border-sav-primary/20 hover:bg-sav-primary hover:text-white transition-all">
                         <Plus size={16} />
                      </button>
                   </div>

                   {form.preguntas.map((p, i) => (
                      <div key={i} className="p-6 rounded-3xl bg-[#0f111a] border border-white/5 space-y-4">
                         <div className="flex items-center gap-4">
                            <span className="w-8 h-8 rounded-lg bg-sav-primary/20 flex items-center justify-center text-[10px] font-black text-sav-primary border border-sav-primary/20">{i+1}</span>
                            <input 
                              type="text" 
                              value={p.t} 
                              onChange={e => {
                                const next = [...form.preguntas];
                                next[i].t = e.target.value;
                                setForm({...form, preguntas: next});
                              }}
                              placeholder="Escribe la pregunta..."
                              className="flex-1 bg-transparent border-b border-white/10 py-2 text-xs font-bold text-white outline-none focus:border-sav-primary/50"
                            />
                         </div>
                         <div className="space-y-2">
                            <label className="text-[8px] font-black text-slate-600 uppercase tracking-widest ml-1 italic">Opciones (separadas por coma)</label>
                            <input 
                              type="text" 
                              value={p.options} 
                              onChange={e => {
                                const next = [...form.preguntas];
                                next[i].options = e.target.value;
                                setForm({...form, preguntas: next});
                              }}
                              placeholder="Muy bueno, Bueno, Regular, Malo"
                              className="w-full bg-[#161926] border border-white/5 rounded-xl px-5 py-3 text-[10px] font-bold text-slate-400 outline-none focus:border-sav-primary/30 shadow-inner"
                            />
                         </div>
                      </div>
                   ))}
                </div>

                <div className="flex gap-4 pt-6">
                   <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-8 py-5 rounded-[25px] bg-white/5 text-slate-400 font-black text-[11px] uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all border border-white/5">Cancel</button>
                   <button type="submit" className="flex-1 px-8 py-5 rounded-[25px] bg-sav-primary text-white font-black text-[11px] uppercase tracking-widest hover:bg-sav-primary/80 transition-all shadow-2xl shadow-sav-primary/30 active:scale-95">Deploy Survey</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
