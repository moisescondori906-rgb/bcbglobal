import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  QrCode, 
  Plus, 
  Trash2, 
  Upload, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  User, 
  RefreshCw, 
  Zap, 
  ShieldCheck, 
  Image as ImageIcon, 
  MoreVertical,
  Check,
  Search,
  ChevronRight,
  Target,
  AlertTriangle,
  Loader2,
  Clock,
  ExternalLink,
  Edit2,
  X
} from 'lucide-react';
import imageCompression from 'browser-image-compression';
import { api } from '../../lib/api';

export default function AdminMetodosQrV2() {
  const [metodos, setMetodos] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [selectedAdminId, setSelectedAdminId] = useState('');
  const [formData, setFormData] = useState({
    nombre: '',
    imagen: null,
    hora_inicio: '00:00',
    hora_fin: '23:59',
  });
  const [editingMetodo, setEditingMetodo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [loadingId, setLoadingId] = useState(null);
  const fileRef = useRef(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [adminsRes, metodosRes] = await Promise.all([
        api.admin.admins(),
        api.admin.metodosQrAll().catch(() => api.admin.metodosQr())
      ]);
      setAdmins(adminsRes || []);
      setMetodos(Array.isArray(metodosRes) ? metodosRes : []);
    } catch (err) {
      console.error('Error fetching QR data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFile = async (e, isEdit = false) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return alert('Formato inválido');
    
    setIsProcessing(true);
    try {
      const options = {
        maxSizeMB: 0.8,
        maxWidthOrHeight: 1200,
        useWebWorker: true,
        fileType: 'image/jpeg',
        initialQuality: 0.85
      };

      const compressedFile = await imageCompression(file, options);
      const reader = new FileReader();
      reader.onload = () => {
        if (isEdit) {
          setEditingMetodo(prev => ({ ...prev, imagen_base64: reader.result }));
        } else {
          setFormData(prev => ({ ...prev, imagen: reader.result }));
        }
        setIsProcessing(false);
      };
      reader.readAsDataURL(compressedFile);
    } catch (err) {
      console.error('Compression error:', err);
      setIsProcessing(false);
    }
  };

  const handleCreate = async () => {
    // selectedAdminId ahora es opcional
    if (!formData.nombre.trim()) return alert('Ingresa el titular');
    if (!formData.imagen) return alert('Sube un QR');
    
    setIsSaving(true);
    try {
      await api.admin.crearMetodoQr({ 
        nombre_titular: formData.nombre, 
        imagen_base64: formData.imagen,
        admin_id: selectedAdminId,
        hora_inicio: formData.hora_inicio,
        hora_fin: formData.hora_fin,
        dias_semana: '0,1,2,3,4,5,6'
      });
      setFormData({ nombre: '', imagen: null, hora_inicio: '00:00', hora_fin: '23:59' });
      if (fileRef.current) fileRef.current.value = '';
      await fetchData();
    } catch (err) {
      alert(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdate = async () => {
     if (!editingMetodo) return;
     setIsSaving(true);
     try {
       await api.admin.actualizarMetodoQr(editingMetodo.id, {
         nombre_titular: editingMetodo.nombre_titular,
         admin_id: editingMetodo.admin_id,
         hora_inicio: editingMetodo.hora_inicio,
         hora_fin: editingMetodo.hora_fin,
         dias_semana: editingMetodo.dias_semana || '0,1,2,3,4,5,6',
         activo: editingMetodo.activo,
         seleccionada: editingMetodo.seleccionada,
         imagen_base64: editingMetodo.imagen_base64 || null
       });
       setEditingMetodo(null);
       await fetchData();
     } catch (err) {
       alert(err.message);
     } finally {
       setIsSaving(false);
     }
   };

  const toggleActivo = async (id, actualActivo) => {
    setLoadingId(id);
    try {
      await api.admin.actualizarMetodoQr(id, { activo: !actualActivo });
      setMetodos(prev => prev.map(m => m.id === id ? { ...m, activo: !actualActivo } : m));
    } catch (e) {
      alert('Error');
    } finally {
      setLoadingId(null);
    }
  };

  const toggleSeleccionada = async (id, adminId) => {
    setLoadingId(id);
    try {
      await api.admin.actualizarMetodoQr(id, { seleccionada: true });
      setMetodos(prev => prev.map(m => m.admin_id === adminId ? { ...m, seleccionada: m.id === id } : m));
    } catch (e) {
      alert('Error');
    } finally {
      setLoadingId(null);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar definitivamente?')) return;
    try {
      await api.admin.eliminarMetodoQr(id);
      setMetodos(prev => prev.filter(m => m.id !== id));
    } catch (e) {
      alert('Error');
    }
  };

  return (
    <div className="space-y-10">
      {/* Header Section */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-8">
        <div className="space-y-2">
          <div className="flex items-center gap-4">
            <div className="p-3.5 rounded-2xl bg-gradient-to-tr from-sav-primary to-rose-600 text-white shadow-xl shadow-sav-primary/20">
              <QrCode size={24} />
            </div>
            <div>
              <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic">Institutional QR Nodes</h1>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] flex items-center gap-2">
                <ShieldCheck size={14} className="text-sav-primary" /> Gestión de puntos de recaudo BCB Global
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Registration Card */}
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
            <h3 className="text-xl font-black text-white uppercase tracking-tighter italic">Nuevo Punto de Pago</h3>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 italic">Operador Responsable (Opcional)</label>
              <div className="relative group">
                <User className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-sav-primary transition-colors" size={18} />
                <select 
                  value={selectedAdminId}
                  onChange={(e) => setSelectedAdminId(e.target.value)}
                  className="w-full pl-14 pr-6 py-5 rounded-2xl bg-[#0f111a] border border-white/5 text-xs font-black text-white uppercase outline-none focus:border-sav-primary/30 transition-all shadow-inner appearance-none cursor-pointer"
                >
                  <option value="">Sin asignar / Sistema</option>
                  {admins.map(a => (
                    <option key={a.id} value={a.id}>{a.nombre_usuario || a.nombre}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 italic">Titular / Entidad Bancaria</label>
              <input
                type="text"
                value={formData.nombre}
                onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
                placeholder="Ej. MARIA LOPEZ - BANCO UNION"
                className="w-full px-6 py-5 rounded-2xl bg-[#0f111a] border border-white/5 text-xs font-black text-white uppercase outline-none focus:border-sav-primary/30 transition-all shadow-inner placeholder:text-slate-700"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 italic">Hora Inicio</label>
                <div className="relative">
                  <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={14} />
                  <input
                    type="time"
                    value={formData.hora_inicio}
                    onChange={(e) => setFormData(prev => ({ ...prev, hora_inicio: e.target.value }))}
                    className="w-full pl-10 pr-4 py-4 rounded-xl bg-[#0f111a] border border-white/5 text-[10px] font-black text-white outline-none focus:border-sav-primary/30 transition-all shadow-inner"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 italic">Hora Fin</label>
                <div className="relative">
                  <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={14} />
                  <input
                    type="time"
                    value={formData.hora_fin}
                    onChange={(e) => setFormData(prev => ({ ...prev, hora_fin: e.target.value }))}
                    className="w-full pl-10 pr-4 py-4 rounded-xl bg-[#0f111a] border border-white/5 text-[10px] font-black text-white outline-none focus:border-sav-primary/30 transition-all shadow-inner"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 italic">Código QR Institucional</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={isProcessing || isSaving}
                  className={`h-40 rounded-3xl border-2 border-dashed flex flex-col items-center justify-center gap-3 transition-all active:scale-95 shadow-inner ${
                    formData.imagen 
                      ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-500' 
                      : 'border-white/5 bg-[#0f111a] text-slate-600 hover:border-sav-primary/30 hover:bg-sav-primary/5'
                  }`}
                >
                  {isProcessing ? <Loader2 size={32} className="animate-spin" /> : <Upload size={32} />}
                  <span className="text-[9px] font-black uppercase tracking-widest text-center px-4">Subir Captura</span>
                </button>
                <div className="h-40 rounded-3xl bg-[#0f111a] border border-white/5 flex items-center justify-center overflow-hidden relative group shadow-inner">
                  {formData.imagen ? (
                    <img src={formData.imagen} alt="Preview" className="w-full h-full object-contain p-2" />
                  ) : (
                    <ImageIcon size={32} className="opacity-10" />
                  )}
                </div>
              </div>
              <input ref={fileRef} type="file" className="hidden" accept="image/*" onChange={(e) => handleFile(e)} />
            </div>

            <button 
              onClick={handleCreate}
              disabled={isSaving || isProcessing}
              className="w-full py-5 rounded-2xl bg-sav-primary text-white font-black text-[11px] uppercase tracking-[0.2em] shadow-xl shadow-sav-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
            >
              {isSaving ? 'Registrando Nodo...' : 'Registrar Punto de Cobro'}
            </button>
          </div>
        </motion.div>

        {/* QR Nodes Grid */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
          <AnimatePresence mode="popLayout">
            {loading ? (
              Array(4).fill(0).map((_, i) => (
                <div key={i} className="bg-[#161926] border border-white/5 h-80 rounded-[40px] animate-pulse" />
              ))
            ) : metodos.map((m, index) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: index * 0.05 }}
                className={`bg-[#161926] border p-8 rounded-[40px] shadow-2xl relative overflow-hidden group transition-all duration-500 ${m.seleccionada ? 'border-sav-primary/40 bg-[#1a1e2e]' : 'border-white/5 hover:border-sav-primary/20'}`}
              >
                <div className="flex flex-col h-full justify-between gap-6 relative z-10">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border shadow-inner ${m.seleccionada ? 'bg-sav-primary/10 border-sav-primary/20 text-sav-primary' : 'bg-[#0f111a] border-white/5 text-slate-500'}`}>
                        <QrCode size={24} />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => setEditingMetodo(m)} className="p-3 rounded-xl bg-sav-primary/10 text-sav-primary border border-sav-primary/20 hover:bg-sav-primary hover:text-white transition-all">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => handleDelete(m.id)} className="p-3 rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20 hover:bg-rose-500 hover:text-white transition-all shadow-lg shadow-rose-500/5">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-lg font-black text-white uppercase tracking-tighter italic truncate">{m.nombre_titular}</h4>
                        {m.seleccionada && (
                          <div className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[8px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/5">
                            Principal
                          </div>
                        )}
                      </div>
                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Responsable: <span className="text-sav-primary">{admins.find(a => a.id === m.admin_id)?.nombre_usuario || admins.find(a => a.id === m.admin_id)?.nombre || 'Sistema / General'}</span></p>
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/5 text-[9px] font-black text-slate-400 uppercase">
                          <Clock size={12} className="text-sav-primary" />
                          {m.hora_inicio?.slice(0, 5) || '00:00'} - {m.hora_fin?.slice(0, 5) || '23:59'}
                        </div>
                      </div>
                    </div>

                    <div className="aspect-square w-full max-w-[160px] mx-auto bg-white rounded-3xl p-3 shadow-2xl shadow-black/40 relative group/qr">
                      <img src={api.getMediaUrl(m.imagen_qr_url)} alt="QR" className="w-full h-full object-contain" />
                      <a href={api.getMediaUrl(m.imagen_qr_url)} target="_blank" rel="noreferrer" className="absolute inset-0 bg-black/60 opacity-0 group-hover/qr:opacity-100 transition-opacity flex items-center justify-center rounded-3xl">
                        <ExternalLink size={24} className="text-white" />
                      </a>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <button 
                      onClick={() => toggleActivo(m.id, m.activo)}
                      className={`flex items-center justify-center gap-2 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${m.activo ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'}`}
                    >
                      {loadingId === m.id ? <RefreshCw size={14} className="animate-spin" /> : m.activo ? <><Eye size={14} /> Visible</> : <><EyeOff size={14} /> Oculto</>}
                    </button>
                    <button 
                      disabled={m.seleccionada}
                      onClick={() => toggleSeleccionada(m.id, m.admin_id)}
                      className={`flex items-center justify-center gap-2 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${m.seleccionada ? 'bg-sav-primary text-white border border-sav-primary shadow-lg shadow-sav-primary/20' : 'bg-white/5 text-slate-500 border border-white/5 hover:bg-sav-primary/10 hover:text-sav-primary'}`}
                    >
                      {m.seleccionada ? <><Check size={14} /> Default</> : 'Set Default'}
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
        {editingMetodo && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-xl bg-[#161926] border border-white/10 rounded-[40px] p-10 shadow-2xl relative overflow-hidden"
            >
              <button 
                onClick={() => setEditingMetodo(null)}
                className="absolute top-8 right-8 p-3 rounded-2xl bg-white/5 text-slate-400 hover:text-white transition-all"
              >
                <X size={20} />
              </button>

              <div className="flex items-center gap-4 mb-10">
                <div className="p-3.5 rounded-2xl bg-sav-primary/10 text-sav-primary border border-sav-primary/20">
                  <Edit2 size={24} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-white uppercase tracking-tighter italic">Editar Punto de Pago</h3>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Ajustar configuración del nodo</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 italic">Titular / Entidad</label>
                  <input
                    type="text"
                    value={editingMetodo.nombre_titular}
                    onChange={(e) => setEditingMetodo(prev => ({ ...prev, nombre_titular: e.target.value }))}
                    className="w-full px-6 py-5 rounded-2xl bg-[#0f111a] border border-white/5 text-xs font-black text-white uppercase outline-none focus:border-sav-primary/30 transition-all shadow-inner"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 italic">Operador Responsable (Opcional)</label>
                  <div className="relative group">
                    <User className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-sav-primary transition-colors" size={18} />
                    <select 
                      value={editingMetodo.admin_id || ''}
                      onChange={(e) => setEditingMetodo(prev => ({ ...prev, admin_id: e.target.value }))}
                      className="w-full pl-14 pr-6 py-5 rounded-2xl bg-[#0f111a] border border-white/5 text-xs font-black text-white uppercase outline-none focus:border-sav-primary/30 transition-all shadow-inner appearance-none cursor-pointer"
                    >
                      <option value="">Sin asignar / Sistema</option>
                      {admins.map(a => (
                        <option key={a.id} value={a.id}>{a.nombre_usuario || a.nombre}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 italic">Hora Inicio</label>
                    <div className="relative">
                      <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={14} />
                      <input
                        type="time"
                        value={editingMetodo.hora_inicio?.slice(0, 5)}
                        onChange={(e) => setEditingMetodo(prev => ({ ...prev, hora_inicio: e.target.value }))}
                        className="w-full pl-10 pr-4 py-4 rounded-xl bg-[#0f111a] border border-white/5 text-[10px] font-black text-white outline-none focus:border-sav-primary/30 transition-all shadow-inner"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 italic">Hora Fin</label>
                    <div className="relative">
                      <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={14} />
                      <input
                        type="time"
                        value={editingMetodo.hora_fin?.slice(0, 5)}
                        onChange={(e) => setEditingMetodo(prev => ({ ...prev, hora_fin: e.target.value }))}
                        className="w-full pl-10 pr-4 py-4 rounded-xl bg-[#0f111a] border border-white/5 text-[10px] font-black text-white outline-none focus:border-sav-primary/30 transition-all shadow-inner"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 italic">Días de la semana (0-6)</label>
                  <input
                    type="text"
                    value={editingMetodo.dias_semana || '0,1,2,3,4,5,6'}
                    onChange={(e) => setEditingMetodo(prev => ({ ...prev, dias_semana: e.target.value }))}
                    placeholder="0,1,2,3,4,5,6"
                    className="w-full px-6 py-4 rounded-xl bg-[#0f111a] border border-white/5 text-[10px] font-black text-white outline-none focus:border-sav-primary/30 transition-all shadow-inner"
                  />
                  <p className="text-[8px] text-slate-600 uppercase font-bold italic mt-1 px-1">0: Dom, 1: Lun, 2: Mar, 3: Mie, 4: Jue, 5: Vie, 6: Sab</p>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 italic">Actualizar Código QR (Opcional)</label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => fileRef.current?.click()}
                      className="h-32 rounded-3xl border-2 border-dashed border-white/5 bg-[#0f111a] text-slate-600 hover:border-sav-primary/30 hover:bg-sav-primary/5 transition-all flex flex-col items-center justify-center gap-2"
                    >
                      <Upload size={24} />
                      <span className="text-[8px] font-black uppercase tracking-widest">Cambiar QR</span>
                    </button>
                    <div className="h-32 rounded-3xl bg-[#0f111a] border border-white/5 flex items-center justify-center overflow-hidden">
                      <img src={editingMetodo.imagen_base64 || api.getMediaUrl(editingMetodo.imagen_qr_url)} alt="QR" className="w-full h-full object-contain p-2" />
                    </div>
                  </div>
                  <input ref={fileRef} type="file" className="hidden" accept="image/*" onChange={(e) => handleFile(e, true)} />
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    onClick={() => setEditingMetodo(null)}
                    className="flex-1 py-5 rounded-2xl bg-white/5 text-slate-400 font-black text-[11px] uppercase tracking-widest hover:bg-white/10 transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleUpdate}
                    disabled={isSaving}
                    className="flex-2 px-12 py-5 rounded-2xl bg-sav-primary text-white font-black text-[11px] uppercase tracking-[0.2em] shadow-xl shadow-sav-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                  >
                    {isSaving ? 'Guardando...' : 'Guardar Cambios'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
