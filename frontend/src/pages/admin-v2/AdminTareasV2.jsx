import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, 
  Plus, 
  Trash2, 
  Edit3, 
  Save, 
  X, 
  Upload, 
  CheckCircle2, 
  Clock, 
  ShieldCheck, 
  Zap, 
  Film, 
  AlertTriangle,
  FileQuestion,
  Layers,
  Search,
  RefreshCw,
  MoreVertical,
  ExternalLink,
  Target
} from 'lucide-react';
import { api } from '../../lib/api';
import { cn } from '../../lib/utils/cn';

export default function AdminTareasV2() {
  const [tareas, setTareas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [editing, setEditing] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [form, setForm] = useState({
    nombre: '',
    video_url: '',
    pregunta: '',
    respuesta_correcta: '',
    opciones: ''
  });

  useEffect(() => {
    fetchTareas();
  }, []);

  const fetchTareas = async () => {
    setLoading(true);
    try {
      const data = await api.admin.tareas();
      const list = Array.isArray(data) ? data : [];
      setTareas(list.map(item => ({ 
        ...item, 
        opciones: Array.isArray(item.opciones) ? item.opciones.join(', ') : item.opciones 
      })));
    } catch (err) {
      console.error('Error fetching tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleVideoSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) return alert('Límite excedido (50MB)');
    
    setUploadingVideo(true);
    setUploadProgress(0);

    try {
      const result = await api.admin.subirVideoTarea(file, (p) => setUploadProgress(p));
      setForm(prev => ({ ...prev, video_url: result.video_url }));
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setUploadingVideo(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.video_url) return alert('Sube un video primero');
    try {
      const payload = { 
        ...form, 
        opciones: form.opciones.split(',').map(o => o.trim()).filter(o => o) 
      };
      const nueva = await api.admin.crearTarea(payload);
      setTareas([...tareas, { ...nueva, opciones: nueva.opciones.join(', ') }]);
      setForm({ nombre: '', video_url: '', pregunta: '', respuesta_correcta: '', opciones: '' });
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar contenido permanentemente?')) return;
    try {
      await api.admin.eliminarTarea(id);
      setTareas(tareas.filter(t => t.id !== id));
    } catch (err) {
      alert(err.message);
    }
  };

  const filteredTareas = tareas.filter(t => 
    t.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-10">
      {/* Header Section */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-8">
        <div className="space-y-2">
          <div className="flex items-center gap-4">
            <div className="p-3.5 rounded-2xl bg-gradient-to-tr from-sav-primary to-rose-600 text-white shadow-xl shadow-sav-primary/20">
              <Film size={24} />
            </div>
            <div>
              <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic">Institutional Content</h1>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] flex items-center gap-2">
                <ShieldCheck size={14} className="text-sav-primary" /> Gestión de campañas publicitarias globales
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="relative group flex-1 min-w-[300px]">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-sav-primary transition-colors" />
            <input 
              type="text" 
              placeholder="Buscar contenido por nombre..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#161926] border border-white/5 rounded-2xl py-4 pl-12 pr-6 text-xs font-bold text-white outline-none focus:border-sav-primary/30 transition-all shadow-2xl"
            />
          </div>
          <button 
            onClick={fetchTareas}
            className="p-4 rounded-2xl bg-white/5 border border-white/5 text-slate-400 hover:text-white transition-all shadow-2xl"
          >
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Creation Form Card */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-[#161926] border border-white/5 p-8 rounded-[40px] shadow-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-8 opacity-[0.03]">
            <Plus size={100} />
          </div>

          <div className="flex items-center gap-4 mb-8">
            <div className="p-3 rounded-2xl bg-sav-primary/10 text-sav-primary border border-sav-primary/20">
              <Zap size={20} />
            </div>
            <h3 className="text-xl font-black text-white uppercase tracking-tighter italic">Nueva Campaña</h3>
          </div>

          <form onSubmit={handleCreate} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Título de Contenido</label>
              <input
                type="text"
                value={form.nombre}
                onChange={e => setForm({...form, nombre: e.target.value})}
                placeholder="Ej. Adidas Summer 2026"
                className="w-full px-6 py-4 rounded-2xl bg-[#0f111a] border border-white/5 text-xs font-bold text-white outline-none focus:border-sav-primary/30 transition-all shadow-inner"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Video Publicitario (MP4/WebM)</label>
              {form.video_url ? (
                <div className="flex items-center gap-4 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 shadow-inner">
                  <CheckCircle2 size={20} className="text-emerald-500" />
                  <span className="text-[10px] font-black text-emerald-500 truncate flex-1 uppercase tracking-tighter">Video Listo</span>
                  <button type="button" onClick={() => setForm({...form, video_url: ''})} className="text-[9px] font-black text-rose-500 uppercase hover:underline">Eliminar</button>
                </div>
              ) : (
                <label className={`
                  flex flex-col items-center justify-center w-full h-40 rounded-3xl border-2 border-dashed transition-all cursor-pointer shadow-inner
                  ${uploadingVideo ? 'bg-[#0f111a] border-sav-primary/20' : 'bg-[#0f111a] border-white/5 hover:border-sav-primary/30 hover:bg-sav-primary/5'}
                `}>
                  {uploadingVideo ? (
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 rounded-full border-4 border-white/5 border-t-sav-primary animate-spin" />
                      <p className="text-[10px] font-black text-sav-primary uppercase tracking-widest">{uploadProgress}%</p>
                    </div>
                  ) : (
                    <>
                      <Upload size={32} className="text-slate-600 mb-2" />
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Subir Multimedia</p>
                      <p className="text-[8px] font-bold text-slate-700 uppercase mt-1">Máximo 50MB</p>
                    </>
                  )}
                  <input type="file" className="hidden" accept="video/*" onChange={handleVideoSelect} disabled={uploadingVideo} />
                </label>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Pregunta de Validación</label>
              <div className="relative">
                <FileQuestion size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" />
                <input
                  type="text"
                  value={form.pregunta}
                  onChange={e => setForm({...form, pregunta: e.target.value})}
                  placeholder="¿Cuál es la marca?"
                  className="w-full px-6 py-4 pl-12 rounded-2xl bg-[#0f111a] border border-white/5 text-xs font-bold text-white outline-none focus:border-sav-primary/30 transition-all shadow-inner"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Opciones (Separadas por coma)</label>
              <input
                type="text"
                value={form.opciones}
                onChange={e => setForm({...form, opciones: e.target.value})}
                placeholder="Adidas, Nike, Puma"
                className="w-full px-6 py-4 rounded-2xl bg-[#0f111a] border border-white/5 text-xs font-bold text-white outline-none focus:border-sav-primary/30 transition-all shadow-inner"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Respuesta Correcta</label>
              <input
                type="text"
                value={form.respuesta_correcta}
                onChange={e => setForm({...form, respuesta_correcta: e.target.value})}
                placeholder="Ej. Adidas"
                className="w-full px-6 py-4 rounded-2xl bg-[#0f111a] border border-white/5 text-xs font-black text-sav-primary outline-none focus:border-sav-primary/30 transition-all shadow-inner"
                required
              />
            </div>

            <button type="submit" className="w-full py-5 rounded-2xl bg-sav-primary text-white font-black text-[11px] uppercase tracking-[0.2em] shadow-xl shadow-sav-primary/20 hover:scale-[1.02] active:scale-95 transition-all">
              Publicar Contenido Institucional
            </button>
          </form>
        </motion.div>

        {/* Tasks Grid */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
          <AnimatePresence mode="popLayout">
            {loading ? (
              Array(4).fill(0).map((_, i) => (
                <div key={i} className="bg-[#161926] border border-white/5 h-80 rounded-[40px] animate-pulse" />
              ))
            ) : filteredTareas.map((t, index) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: index * 0.05 }}
                className="bg-[#161926] border border-white/5 p-8 rounded-[40px] shadow-2xl relative overflow-hidden group hover:border-sav-primary/20 transition-all duration-500"
              >
                <div className="absolute top-0 right-0 p-8 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity">
                  <Play size={120} />
                </div>

                <div className="flex flex-col h-full justify-between gap-6 relative z-10">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="w-14 h-14 rounded-2xl bg-[#0f111a] flex items-center justify-center border border-white/5 shadow-inner">
                        <Film size={24} className="text-sav-primary" />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleDelete(t.id)} className="p-3 rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20 hover:bg-rose-500 hover:text-white transition-all shadow-lg shadow-rose-500/5">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-xl font-black text-white uppercase tracking-tighter italic truncate">{t.nombre}</h4>
                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">ID: {t.id} • Created: {new Date(t.created_at).toLocaleDateString()}</p>
                    </div>

                    <div className="bg-[#0f111a] rounded-2xl p-4 border border-white/5 space-y-3 shadow-inner">
                      <div className="flex items-center gap-3">
                        <FileQuestion size={14} className="text-sav-primary" />
                        <p className="text-[10px] font-black text-white uppercase tracking-tight truncate">{t.pregunta}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {t.opciones.split(',').map((o, i) => (
                          <span key={i} className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border ${o.trim() === t.respuesta_correcta ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-white/5 text-slate-500 border-white/5'}`}>
                            {o.trim()}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/5">
                      <Layers size={12} className="text-slate-500" />
                      <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest italic">Global Audience</span>
                    </div>
                    <a href={t.video_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-[9px] font-black text-sav-primary uppercase hover:underline tracking-widest">
                      Preview Video <ExternalLink size={14} />
                    </a>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          
          {filteredTareas.length === 0 && !loading && (
            <div className="col-span-full py-20 flex flex-col items-center gap-6 opacity-30">
              <Target size={80} className="text-slate-500" />
              <p className="text-xs font-black uppercase tracking-widest text-slate-500">No se encontraron contenidos</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
