import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Image as ImageIcon, 
  Plus, 
  Trash2, 
  Upload, 
  RefreshCw, 
  Zap, 
  ShieldCheck, 
  ExternalLink,
  Target,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  X
} from 'lucide-react';
import imageCompression from 'browser-image-compression';
import { api } from '../../lib/api';

export default function AdminBannersV2() {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  
  const [form, setForm] = useState({
    nombre: '',
    imagen: null,
    link_url: '',
    activo: true,
    prioridad: 0
  });

  const fileRef = useRef(null);

  useEffect(() => {
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    setLoading(true);
    try {
      // Usamos el endpoint existente o fallback
      const res = await api.get('/admin/banners').catch(() => []);
      setBanners(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsProcessing(true);
    try {
      const options = { maxSizeMB: 1, maxWidthOrHeight: 1920, useWebWorker: true };
      const compressed = await imageCompression(file, options);
      const reader = new FileReader();
      reader.onload = () => {
        setForm(prev => ({ ...prev, imagen: reader.result }));
        setIsProcessing(false);
      };
      reader.readAsDataURL(compressed);
    } catch (err) {
      alert('Error comprimiendo imagen');
      setIsProcessing(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.imagen) return alert('Sube una imagen');
    
    setIsSaving(true);
    try {
      await api.post('/admin/banners', form);
      setShowModal(false);
      setForm({ nombre: '', imagen: null, link_url: '', activo: true, prioridad: 0 });
      fetchBanners();
    } catch (err) {
      alert(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar banner?')) return;
    try {
      await api.delete(`/admin/banners/${id}`);
      fetchBanners();
    } catch (err) {
      alert('Error');
    }
  };

  const toggleStatus = async (id, current) => {
    try {
      await api.put(`/admin/banners/${id}`, { activo: !current });
      setBanners(prev => prev.map(b => b.id === id ? { ...b, activo: !current } : b));
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
              <ImageIcon size={24} />
            </div>
            <div>
              <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic">Multimedia Assets</h1>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] flex items-center gap-2">
                <ShieldCheck size={14} className="text-sav-primary" /> Gestión de banners y recursos visuales
              </p>
            </div>
          </div>
        </div>

        <button 
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-8 py-4 rounded-2xl bg-sav-primary text-white text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-xl"
        >
          <Plus size={18} /> New Banner
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <AnimatePresence mode="popLayout">
          {banners.map((b, idx) => (
            <motion.div
              key={b.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-[#161926] border border-white/5 rounded-[40px] shadow-2xl overflow-hidden group"
            >
              <div className="aspect-video relative overflow-hidden bg-[#0f111a]">
                 <img src={api.getMediaUrl(b.imagen_url)} alt={b.nombre} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                 <div className="absolute inset-0 bg-gradient-to-t from-[#0f111a] via-transparent to-transparent opacity-60" />
                 <div className="absolute top-4 right-4 flex gap-2">
                    <button onClick={() => toggleStatus(b.id, b.activo)} className={`p-2.5 rounded-xl border backdrop-blur-md transition-all ${b.activo ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-500' : 'bg-rose-500/20 border-rose-500/30 text-rose-500'}`}>
                       <Zap size={16} className={b.activo ? 'animate-pulse' : ''} />
                    </button>
                    <button onClick={() => handleDelete(b.id)} className="p-2.5 rounded-xl bg-black/40 border border-white/10 text-white hover:bg-rose-600 transition-all backdrop-blur-md">
                       <Trash2 size={16} />
                    </button>
                 </div>
              </div>
              <div className="p-8 space-y-4">
                 <div>
                    <h3 className="text-xl font-black text-white uppercase tracking-tighter italic truncate">{b.nombre || 'Sin título'}</h3>
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">Priority: {b.prioridad} • ID: {b.id.substring(0,8)}</p>
                 </div>
                 {b.link_url && (
                    <a href={b.link_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-[9px] font-black text-sav-primary uppercase tracking-widest hover:underline">
                       Destination Link <ExternalLink size={12} />
                    </a>
                 )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {banners.length === 0 && !loading && (
          <div className="col-span-full py-32 flex flex-col items-center gap-6 opacity-20">
             <Target size={80} />
             <p className="text-xs font-black uppercase tracking-widest">No multimedia assets deployed</p>
          </div>
        )}
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
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-sav-primary to-indigo-600 shadow-lg" />
              
              <h3 className="text-3xl font-black text-white uppercase tracking-tighter italic mb-8">Deploy Media Node</h3>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 italic">Asset Name</label>
                  <input type="text" value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} className="w-full bg-[#0f111a] border border-white/5 rounded-2xl px-6 py-4 text-xs font-black text-white outline-none focus:border-sav-primary/30 shadow-inner" required />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 italic">Visual Content (Banner)</label>
                  <div className="grid grid-cols-2 gap-4">
                     <button type="button" onClick={() => fileRef.current?.click()} className="h-32 rounded-3xl border-2 border-dashed border-white/5 bg-[#0f111a] flex flex-col items-center justify-center gap-2 hover:border-sav-primary/30 transition-all">
                        {isProcessing ? <Loader2 className="animate-spin text-sav-primary" /> : <Upload size={24} className="text-slate-600" />}
                        <span className="text-[8px] font-black uppercase tracking-widest">Select Image</span>
                     </button>
                     <div className="h-32 rounded-3xl bg-[#0f111a] border border-white/5 flex items-center justify-center overflow-hidden shadow-inner">
                        {form.imagen ? <img src={form.imagen} className="w-full h-full object-cover" /> : <ImageIcon size={24} className="opacity-10" />}
                     </div>
                  </div>
                  <input ref={fileRef} type="file" className="hidden" accept="image/*" onChange={handleFile} />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 italic">Redirect URL (Optional)</label>
                  <input type="url" value={form.link_url} onChange={e => setForm({...form, link_url: e.target.value})} className="w-full bg-[#0f111a] border border-white/5 rounded-2xl px-6 py-4 text-xs font-bold text-slate-400 outline-none focus:border-sav-primary/30 shadow-inner" placeholder="https://..." />
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 italic">Priority Index</label>
                      <input type="number" value={form.prioridad} onChange={e => setForm({...form, prioridad: e.target.value})} className="w-full bg-[#0f111a] border border-white/5 rounded-2xl px-6 py-4 text-xs font-black text-white outline-none focus:border-sav-primary/30 shadow-inner" />
                   </div>
                   <div className="flex items-center justify-center p-4 mt-6">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" checked={form.activo} onChange={e => setForm({...form, activo: e.target.checked})} />
                        <div className="w-11 h-6 bg-slate-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-sav-primary after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all shadow-lg" />
                        <span className="ml-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Active</span>
                      </label>
                   </div>
                </div>

                <div className="flex gap-4 pt-6">
                   <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-8 py-5 rounded-[25px] bg-white/5 text-slate-400 font-black text-[11px] uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all border border-white/5">Cancel</button>
                   <button type="submit" disabled={isSaving || isProcessing} className="flex-1 px-8 py-5 rounded-[25px] bg-sav-primary text-white font-black text-[11px] uppercase tracking-widest hover:bg-sav-primary/80 transition-all shadow-2xl shadow-sav-primary/30 active:scale-95 disabled:opacity-50">
                      {isSaving ? 'Deploying...' : 'Deploy Asset'}
                   </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
