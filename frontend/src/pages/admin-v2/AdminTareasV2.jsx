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
import { formatDate } from '../../lib/utils/format';

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
    <div className="space-y-10 sm:space-y-14 pb-20">
      {/* Header Section */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-8">
        <div className="space-y-2">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 rounded-[2rem] bg-gradient-to-tr from-admin-accent to-violet-600 text-white shadow-2xl shadow-admin-accent/20 border border-white/10 flex items-center justify-center shrink-0">
              <Film size={28} />
            </div>
            <div>
              <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tighter uppercase italic leading-none">Campaign Nodes</h1>
              <p className="text-[10px] font-black text-admin-muted uppercase tracking-[0.3em] mt-1 flex items-center gap-2">
                <ShieldCheck size={14} className="text-admin-accent" /> Gestión de contenido publicitario global
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="relative group flex-1 min-w-[320px]">
            <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-admin-accent transition-colors" />
            <input 
              type="text" 
              placeholder="Buscar contenido por nombre..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="admin-input !h-14 pl-14 !text-base !rounded-2xl shadow-inner"
            />
          </div>
          <button 
            onClick={fetchTareas}
            className="admin-button-secondary !h-14 !w-14 !p-0 !rounded-2xl shadow-xl active:scale-95"
          >
            <RefreshCw size={22} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Creation Form Card */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-4 admin-card p-8 sm:p-10 shadow-2xl relative overflow-hidden group/form"
        >
          <div className="absolute top-0 right-0 w-40 h-40 bg-admin-accent opacity-[0.02] rounded-bl-full pointer-events-none group-hover/form:opacity-[0.05] transition-all duration-1000 blur-3xl" />

          <div className="flex items-center gap-4 mb-10 relative z-10">
            <div className="p-3.5 rounded-2xl bg-admin-accent/10 text-admin-accent border border-admin-accent/20 shadow-lg shadow-admin-accent/5">
              <Plus size={24} />
            </div>
            <h3 className="text-xl font-black text-white uppercase tracking-tighter italic">Nuevo Nodo Publicitario</h3>
          </div>

          <form onSubmit={handleCreate} className="space-y-8 relative z-10">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1 italic">Título de la Campaña</label>
              <input
                type="text"
                value={form.nombre}
                onChange={e => setForm({...form, nombre: e.target.value})}
                placeholder="Ej. Adidas Performance 2026"
                className="admin-input !h-14 !bg-black/20 !rounded-2xl !px-6 shadow-inner"
                required
              />
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1 italic">Video Publicitario (MP4/WebM)</label>
              {form.video_url ? (
                <div className="flex items-center gap-4 p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 shadow-xl shadow-emerald-500/5 group/video">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-500">
                    <CheckCircle2 size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-black text-emerald-500 uppercase tracking-tighter truncate">Media Protocol Ready</p>
                    <p className="text-[8px] font-bold text-emerald-500/60 uppercase tracking-widest truncate">{form.video_url.split('/').pop()}</p>
                  </div>
                  <button type="button" onClick={() => setForm({...form, video_url: ''})} className="p-2 rounded-lg bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-all">
                    <Trash2 size={14} />
                  </button>
                </div>
              ) : (
                <label className={`
                  flex flex-col items-center justify-center w-full h-48 rounded-[2rem] border-2 border-dashed transition-all cursor-pointer shadow-inner relative overflow-hidden
                  ${uploadingVideo ? 'bg-black/40 border-admin-accent/40' : 'bg-black/20 border-white/5 hover:border-admin-accent/30 hover:bg-admin-accent/5'}
                `}>
                  {uploadingVideo ? (
                    <div className="flex flex-col items-center gap-4 relative z-10">
                      <div className="w-14 h-14 rounded-full border-4 border-white/5 border-t-admin-accent animate-spin shadow-lg" />
                      <div className="text-center">
                        <p className="text-[11px] font-black text-admin-accent uppercase tracking-[0.2em]">{uploadProgress}%</p>
                        <p className="text-[8px] font-bold text-zinc-600 uppercase tracking-widest mt-1">Sincronizando con el servidor...</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-zinc-600 mb-4 group-hover:scale-110 group-hover:text-admin-accent transition-all duration-500">
                        <Upload size={32} />
                      </div>
                      <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Cargar Multimedia</p>
                      <p className="text-[8px] font-bold text-zinc-700 uppercase mt-1">Límite: 50MB</p>
                    </>
                  )}
                  <input type="file" className="hidden" accept="video/*" onChange={handleVideoSelect} disabled={uploadingVideo} />
                </label>
              )}
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1 italic">Validación: Pregunta</label>
              <div className="relative group">
                <FileQuestion size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-admin-accent transition-colors" />
                <input
                  type="text"
                  value={form.pregunta}
                  onChange={e => setForm({...form, pregunta: e.target.value})}
                  placeholder="¿Cuál es la marca principal?"
                  className="admin-input !h-14 pl-14 !bg-black/20 !rounded-2xl shadow-inner"
                  required
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1 italic">Validación: Opciones (Separadas por comas)</label>
              <div className="relative group">
                <Layers size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-admin-accent transition-colors" />
                <input
                  type="text"
                  value={form.opciones}
                  onChange={e => setForm({...form, opciones: e.target.value})}
                  placeholder="Adidas, Nike, Puma"
                  className="admin-input !h-14 pl-14 !bg-black/20 !rounded-2xl shadow-inner"
                  required
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1 italic">Validación: Respuesta Correcta</label>
              <div className="relative group">
                <Target size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-emerald-500 transition-colors" />
                <input
                  type="text"
                  value={form.respuesta_correcta}
                  onChange={e => setForm({...form, respuesta_correcta: e.target.value})}
                  placeholder="Ej. Adidas"
                  className="admin-input !h-14 pl-14 !bg-black/20 !rounded-2xl !text-emerald-500 !font-black shadow-inner"
                  required
                />
              </div>
            </div>

            <button type="submit" className="admin-button-primary w-full !h-16 !text-[11px] !tracking-[0.3em] !rounded-2xl shadow-2xl shadow-admin-accent/20">
              Desplegar Nodo Publicitario
            </button>
          </form>
        </motion.div>

        {/* Tasks Grid */}
        <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-8">
          <AnimatePresence mode="popLayout">
            {loading ? (
              Array(4).fill(0).map((_, i) => (
                <div key={i} className="admin-card h-[400px] animate-pulse bg-white/[0.02]" />
              ))
            ) : filteredTareas.length > 0 ? (
              filteredTareas.map((t, index) => (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 20 }}
                  transition={{ delay: index * 0.05, duration: 0.4 }}
                  className="admin-card p-8 sm:p-10 shadow-2xl relative overflow-hidden group hover:border-admin-accent/40 hover:shadow-admin-glow transition-all duration-500"
                >
                  <div className="absolute top-0 right-0 w-40 h-40 bg-admin-accent opacity-[0.03] rounded-bl-full blur-3xl group-hover:opacity-[0.08] transition-all duration-700 pointer-events-none" />

                  <div className="flex flex-col h-full justify-between gap-8 relative z-10">
                    <div className="space-y-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="w-16 h-16 rounded-[1.5rem] bg-black/40 flex items-center justify-center border border-white/5 shadow-inner transition-transform group-hover:scale-110 duration-500">
                          <Film size={28} className="text-admin-accent" />
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => handleDelete(t.id)} className="p-3 rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20 hover:bg-rose-500 hover:text-white transition-all shadow-lg shadow-rose-500/5 group/del">
                            <Trash2 size={18} className="group-hover/del:rotate-12 transition-transform" />
                          </button>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-2xl font-black text-white uppercase tracking-tighter italic truncate group-hover:text-admin-accent transition-colors duration-500">{t.nombre}</h4>
                        <div className="flex items-center gap-3 mt-2">
                          <p className="text-[10px] font-black text-admin-accent uppercase tracking-widest bg-admin-accent/10 px-2 py-0.5 rounded border border-admin-accent/20">ID: {t.id}</p>
                          <div className="w-1 h-1 rounded-full bg-zinc-700" />
                          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{formatDate(t.created_at)}</p>
                        </div>
                      </div>

                      <div className="bg-black/20 rounded-[2rem] p-8 border border-white/5 space-y-6 shadow-inner group-hover:bg-black/40 group-hover:border-white/10 transition-all duration-500">
                        <div className="flex items-start gap-4">
                          <div className="p-2 rounded-lg bg-admin-accent/10 text-admin-accent shrink-0">
                            <FileQuestion size={16} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1 italic">Validation Request</p>
                            <p className="text-sm font-black text-white uppercase tracking-tight leading-relaxed">{t.pregunta}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-start gap-4">
                          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500 shrink-0">
                            <CheckCircle2 size={16} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1 italic">Master Protocol</p>
                            <p className="text-sm font-black text-emerald-500 uppercase tracking-tight">{t.respuesta_correcta}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-4 pt-4 border-t border-white/5">
                      <div className="flex items-center gap-2">
                        <Layers size={14} className="text-zinc-500" />
                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest truncate max-w-[180px]">{t.opciones}</p>
                      </div>
                      <a 
                        href={api.getMediaUrl(t.video_url)} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/5 text-[10px] font-black text-zinc-400 uppercase tracking-widest hover:bg-admin-accent hover:text-white transition-all shadow-xl group/link"
                      >
                        <Play size={14} className="group-hover/link:scale-110 transition-transform" /> Media
                      </a>
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="col-span-full py-32 flex flex-col items-center justify-center opacity-20 gap-8">
                <div className="w-28 h-28 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700 shadow-2xl">
                  <Film size={48} className="text-zinc-500" />
                </div>
                <p className="text-sm font-black uppercase tracking-[0.4em] text-zinc-500">No active campaign nodes found</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}




