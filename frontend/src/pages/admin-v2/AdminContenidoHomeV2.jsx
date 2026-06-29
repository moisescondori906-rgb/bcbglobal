import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, 
  Save, 
  Zap, 
  ShieldCheck, 
  MessageCircle, 
  Send, 
  Info, 
  DollarSign, 
  RefreshCw,
  Target,
  Smartphone,
  ExternalLink,
  Trash2,
  Plus,
  Image as ImageIcon,
  CheckCircle2,
  Eye,
  EyeOff
} from 'lucide-react';
import { api } from '../../lib/api';

function parseDias(value, fallback) {
  if (Array.isArray(value)) return value.map(Number).filter(Number.isFinite);
  if (value == null || value === '') return fallback;

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map(Number).filter(Number.isFinite);
    } catch {}

    return value
      .split(',')
      .map(v => Number(String(v).trim()))
      .filter(Number.isFinite);
  }

  return fallback;
}

export default function AdminContenidoHomeV2() {
  const [loading, setLoading] = useState(true);
  const [saving, setsaving] = useState(false);
  const [announcements, setAnnouncements] = useState([]);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  const [announcementForm, setAnnouncementForm] = useState({ titulo: '', mensaje: '', activo: true, orden: 0, image: null });
  const [announcementsaving, setAnnouncementsaving] = useState(false);
  
  const [content, setContent] = useState({
    soporte_canal_url: '',
    soporte_gerente_url: '',
    soporte_bot_url: '',
    marquee_text: '',
    banners: [],
    comision_retiro: 12,
    ruleta_activa: true,
    recompensas_visibles: true,
    restricciones_horario_activas: false,
    horario_recarga: { enabled: true, hora_inicio: '08:00', hora_fin: '22:00', dias_semana: [0,1,2,3,4,5,6] },
    horario_retiro: { enabled: true, hora_inicio: '09:00', hora_fin: '18:00', dias_semana: [1,2,3,4,5] },
    bloquear_niveles_superiores_enabled: true,
    mensaje_niveles_superiores: 'Niveles disponibles solamente para líderes',
    nivel_minimo_lider: 4
  });

  useEffect(() => {
    fetchContent();
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const res = await api.get('/admin/home-announcements');
      setAnnouncements(res || []);
    } catch (err) {
      console.error('Error fetching announcements:', err);
    }
  };

  const handleCreateAnnouncement = () => {
    setEditingAnnouncement(null);
    setAnnouncementForm({ titulo: '', mensaje: '', activo: true, orden: 0, image: null });
    setShowAnnouncementModal(true);
  };

  const handleEditAnnouncement = (item) => {
    setEditingAnnouncement(item);
    setAnnouncementForm({ titulo: item.titulo || '', mensaje: item.mensaje, activo: !!item.activo, orden: item.orden || 0, image: null });
    setShowAnnouncementModal(true);
  };

  const handleDeleteAnnouncement = async (id) => {
    if (!confirm('¿Seguro que deseas eliminar este comunicado?')) return;
    try {
      await api.delete(`/admin/home-announcements/${id}`);
      fetchAnnouncements();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleAnnouncementSubmit = async (e) => {
    e.preventDefault();
    setAnnouncementsaving(true);
    try {
      const formData = new FormData();
      formData.append('titulo', announcementForm.titulo);
      formData.append('mensaje', announcementForm.mensaje);
      formData.append('activo', announcementForm.activo);
      formData.append('orden', announcementForm.orden);
      if (announcementForm.image) formData.append('image', announcementForm.image);

      if (editingAnnouncement) {
        await api.patch(`/admin/home-announcements/${editingAnnouncement.id}`, formData);
      } else {
        await api.post('/admin/home-announcements', formData);
      }
      setShowAnnouncementModal(false);
      fetchAnnouncements();
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setAnnouncementsaving(false);
    }
  };

  const fetchContent = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/config');
      if (res) {
        const newContent = {
          ...res,
          horario_recarga: {
            ...res.horario_recarga,
            dias_semana: parseDias(res.horario_recarga?.dias_semana, [0,1,2,3,4,5,6])
          },
          horario_retiro: {
            ...res.horario_retiro,
            dias_semana: parseDias(res.horario_retiro?.dias_semana, [1,2,3,4,5])
          }
        };
        setContent(prev => ({ ...prev, ...newContent }));
      }
    } catch (err) {
      console.error('Error fetching public content:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setsaving(true);
    try {
            await api.put('/admin/config', content);
      alert('Configuración global actualizada con éxito');
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setsaving(false);
    }
  };

  const toggleDay = (key, day) => {
    const currentDays = content[key].dias_semana || [];
    const newDays = ((days, day) => {
      const set = new Set(days.map(Number));
      if (set.has(day)) set.delete(day);
      else set.add(day);
      return Array.from(set).sort((a,b) => a-b);
    })(currentDays, day);

    setContent({
      ...content,
      [key]: { ...content[key], dias_semana: newDays }
    });
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <RefreshCw className="animate-spin text-bcb-primary" size={32} />
    </div>
  );

  return (
    <div className="space-y-10 pb-20">
      <div className="flex items-center gap-4">
        <div className="p-3.5 rounded-2xl bg-gradient-to-tr from-bcb-primary to-indigo-600 text-white shadow-xl">
          <Bell size={24} />
        </div>
        <div>
          <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic">System Configuration</h1>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] flex items-center gap-2">
            <ShieldCheck size={14} className="text-bcb-primary" /> Ajustes globales y enlaces de comunicación
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Contact Links */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-[#161926] border border-white/5 p-10 rounded-[45px] shadow-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-10 opacity-[0.03]">
            <MessageCircle size={120} />
          </div>
          
          <h3 className="text-2xl font-black text-white uppercase tracking-tighter italic mb-8 flex items-center gap-3">
            <Smartphone className="text-bcb-primary" size={24} /> Canales de Soporte
          </h3>

          <form onSubmit={handleSave} className="space-y-8">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 italic">Canal de Telegram (Oficial)</label>
              <div className="relative group">
                <Send className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-bcb-primary transition-colors" size={18} />
                <input 
                  type="url" 
                  value={content.soporte_canal_url} 
                  onChange={e => setContent({...content, soporte_canal_url: e.target.value})}
                  className="w-full pl-14 pr-6 py-5 rounded-2xl bg-[#0f111a] border border-white/5 text-xs font-black text-white outline-none focus:border-bcb-primary/30 transition-all shadow-inner"
                  placeholder="https://t.me/tu_canal"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 italic">WhatsApp de Gerencia</label>
              <div className="relative group">
                <MessageCircle className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-emerald-500 transition-colors" size={18} />
                <input 
                  type="url" 
                  value={content.soporte_gerente_url} 
                  onChange={e => setContent({...content, soporte_gerente_url: e.target.value})}
                  className="w-full pl-14 pr-6 py-5 rounded-2xl bg-[#0f111a] border border-white/5 text-xs font-black text-white outline-none focus:border-bcb-primary/30 transition-all shadow-inner"
                  placeholder="https://wa.me/591..."
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 italic">Bot de Soporte (Directo)</label>
              <div className="relative group">
                <Zap className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-blue-400 transition-colors" size={18} />
                <input 
                  type="url" 
                  value={content.soporte_bot_url} 
                  onChange={e => setContent({...content, soporte_bot_url: e.target.value})}
                  className="w-full pl-14 pr-6 py-5 rounded-2xl bg-[#0f111a] border border-white/5 text-xs font-black text-white outline-none focus:border-bcb-primary/30 transition-all shadow-inner"
                  placeholder="https://t.me/tu_bot"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 italic">Texto de la Marquesina (Scroll)</label>
              <textarea 
                value={content.marquee_text} 
                onChange={e => setContent({...content, marquee_text: e.target.value})}
                className="w-full px-6 py-5 rounded-2xl bg-[#0f111a] border border-white/5 text-xs font-bold text-white outline-none focus:border-bcb-primary/30 transition-all shadow-inner min-h-[120px] resize-none"
                placeholder="Bienvenido a BCB Global..."
              />
            </div>
          </form>

          {/* New Section: Home Announcements Admin */}
          <div className="mt-12 pt-12 border-t border-white/5">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-black text-white uppercase tracking-tighter italic flex items-center gap-3">
                <Bell className="text-bcb-primary" size={24} /> Comunicados
              </h3>
              <button 
                onClick={handleCreateAnnouncement}
                className="p-3 rounded-xl bg-bcb-primary/10 text-bcb-primary hover:bg-bcb-primary hover:text-white transition-all border border-bcb-primary/20"
              >
                <Plus size={20} />
              </button>
            </div>

            <div className="space-y-4">
              {announcements.length === 0 ? (
                <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest text-center py-10 bg-black/10 rounded-3xl border border-dashed border-white/5">
                  No hay comunicados registrados
                </p>
              ) : announcements.map(item => (
                <div key={item.id} className="p-5 rounded-3xl bg-[#0f111a] border border-white/5 flex items-center justify-between group">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center overflow-hidden shrink-0">
                      {item.imagen_url ? <img src={item.imagen_url} className="w-full h-full object-cover" /> : <ImageIcon size={20} className="text-slate-600" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-black text-white uppercase truncate">{item.titulo || 'Sin título'}</p>
                      <p className="text-[9px] font-bold text-slate-500 uppercase truncate max-w-[200px]">{item.mensaje}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleEditAnnouncement(item)} className="p-2.5 rounded-xl bg-white/5 text-slate-400 hover:text-white transition-all"><ExternalLink size={16} /></button>
                    <button onClick={() => handleDeleteAnnouncement(item.id)} className="p-2.5 rounded-xl bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-all"><Trash2 size={16} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Global Rules */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-8"
        >
          <div className="bg-[#161926] border border-white/5 p-10 rounded-[45px] shadow-2xl relative overflow-hidden">
            <h3 className="text-2xl font-black text-white uppercase tracking-tighter italic mb-8 flex items-center gap-3">
              <Zap className="text-bcb-primary" size={24} /> Reglas del Sistema
            </h3>

            <div className="space-y-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 italic">Comisión de Retiro (%)</label>
                <div className="relative group">
                  <DollarSign className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-bcb-primary transition-colors" size={18} />
                  <input 
                    type="number" 
                    value={content.comision_retiro} 
                    onChange={e => setContent({...content, comision_retiro: e.target.value})}
                    className="w-full pl-14 pr-6 py-5 rounded-2xl bg-[#0f111a] border border-white/5 text-xs font-black text-white outline-none focus:border-bcb-primary/30 transition-all shadow-inner"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 rounded-3xl bg-[#0f111a] border border-white/5 flex items-center justify-between group hover:border-bcb-primary/20 transition-all">
                  <div>
                    <p className="text-[10px] font-black text-white uppercase tracking-widest mb-1">Módulo Ruleta</p>
                    <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Activar/Desactivar sorteos</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={content.ruleta_activa} onChange={e => setContent({...content, ruleta_activa: e.target.checked})} />
                    <div className="w-11 h-6 bg-slate-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-bcb-primary after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all shadow-lg" />
                  </label>
                </div>

                <div className="p-6 rounded-3xl bg-[#0f111a] border border-white/5 flex items-center justify-between group hover:border-bcb-primary/20 transition-all">
                  <div>
                    <p className="text-[10px] font-black text-white uppercase tracking-widest mb-1">Restricciones de Horario</p>
                    <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Activar/Desactivar límites</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={content.restricciones_horario_activas} onChange={e => setContent({...content, restricciones_horario_activas: e.target.checked})} />
                    <div className="w-11 h-6 bg-slate-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-bcb-primary after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all shadow-lg" />
                  </label>
                </div>

                <div className="p-6 rounded-3xl bg-[#0f111a] border border-white/5 flex items-center justify-between group hover:border-bcb-primary/20 transition-all">
                  <div>
                    <p className="text-[10px] font-black text-white uppercase tracking-widest mb-1">Recompensas</p>
                    <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Visibilidad de bonos</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={content.recompensas_visibles} onChange={e => setContent({...content, recompensas_visibles: e.target.checked})} />
                    <div className="w-11 h-6 bg-slate-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-bcb-primary after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all shadow-lg" />
                  </label>
                </div>
                
                <div className="p-6 rounded-3xl bg-[#0f111a] border border-white/5 flex items-center justify-between group hover:border-bcb-primary/20 transition-all">
                  <div>
                    <p className="text-[10px] font-black text-white uppercase tracking-widest mb-1">Bloquear Niveles Altos</p>
                    <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Solo líderes pueden acceder</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={content.bloquear_niveles_superiores_enabled} onChange={e => setContent({...content, bloquear_niveles_superiores_enabled: e.target.checked})} />
                    <div className="w-11 h-6 bg-slate-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-bcb-primary after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all shadow-lg" />
                  </label>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 italic">Mensaje para Niveles Altos</label>
                <textarea 
                  value={content.mensaje_niveles_superiores} 
                  onChange={e => setContent({...content, mensaje_niveles_superiores: e.target.value})}
                  className="w-full px-6 py-5 rounded-2xl bg-[#0f111a] border border-white/5 text-xs font-bold text-white outline-none focus:border-bcb-primary/30 transition-all shadow-inner min-h-[80px] resize-none"
                  placeholder="Mensaje..."
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 italic">Nivel Mínimo para Líder (Orden)</label>
                <div className="relative group">
                  <Target className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-bcb-primary transition-colors" size={18} />
                  <input 
                    type="number" 
                    value={content.nivel_minimo_lider} 
                    onChange={e => setContent({...content, nivel_minimo_lider: e.target.value})}
                    className="w-full pl-14 pr-6 py-5 rounded-2xl bg-[#0f111a] border border-white/5 text-xs font-black text-white outline-none focus:border-bcb-primary/30 transition-all shadow-inner"
                  />
                </div>
              </div>

              {/* Schedules Section */}
              <div className="space-y-6 pt-4">
                {/* Horario de Recargas */}
                <div className="bg-[#0f111a] border border-white/5 rounded-3xl p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-black text-white uppercase tracking-widest italic flex items-center gap-2">
                      <RefreshCw size={14} className="text-emerald-500" /> Horario de Recargas
                    </h4>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" checked={content.horario_recarga?.enabled} onChange={e => setContent({...content, horario_recarga: {...content.horario_recarga, enabled: e.target.checked}})} />
                      <div className="w-10 h-5 bg-slate-800 rounded-full peer peer-checked:bg-emerald-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all" />
                    </label>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest ml-1">Inicio</label>
                      <input 
                        type="time" 
                        value={content.horario_recarga?.hora_inicio || '08:00'} 
                        onChange={e => setContent({...content, horario_recarga: {...content.horario_recarga, hora_inicio: e.target.value}})}
                        className="w-full px-4 py-3 rounded-xl bg-[#161926] border border-white/5 text-[10px] font-bold text-white outline-none focus:border-emerald-500/30"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest ml-1">Fin</label>
                      <input 
                        type="time" 
                        value={content.horario_recarga?.hora_fin || '22:00'} 
                        onChange={e => setContent({...content, horario_recarga: {...content.horario_recarga, hora_fin: e.target.value}})}
                        className="w-full px-4 py-3 rounded-xl bg-[#161926] border border-white/5 text-[10px] font-bold text-white outline-none focus:border-emerald-500/30"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest ml-1">Días Permitidos</label>
                    <div className="flex flex-wrap gap-2">
                      {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((d, i) => (
                        <button
                          key={i}
                          onClick={() => toggleDay('horario_recarga', i)}
                          className={`w-8 h-8 rounded-lg text-[10px] font-black transition-all ${
                            content.horario_recarga?.dias_semana?.includes(i)
                              ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                              : 'bg-white/5 text-slate-500 border border-white/5'
                          }`}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Horario de Retiros */}
                <div className="bg-[#0f111a] border border-white/5 rounded-3xl p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-black text-white uppercase tracking-widest italic flex items-center gap-2">
                      <DollarSign size={14} className="text-rose-500" /> Horario de Retiros
                    </h4>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" checked={content.horario_retiro?.enabled} onChange={e => setContent({...content, horario_retiro: {...content.horario_retiro, enabled: e.target.checked}})} />
                      <div className="w-10 h-5 bg-slate-800 rounded-full peer peer-checked:bg-rose-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all" />
                    </label>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest ml-1">Inicio</label>
                      <input 
                        type="time" 
                        value={content.horario_retiro?.hora_inicio || '09:00'} 
                        onChange={e => setContent({...content, horario_retiro: {...content.horario_retiro, hora_inicio: e.target.value}})}
                        className="w-full px-4 py-3 rounded-xl bg-[#161926] border border-white/5 text-[10px] font-bold text-white outline-none focus:border-rose-500/30"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest ml-1">Fin</label>
                      <input 
                        type="time" 
                        value={content.horario_retiro?.hora_fin || '18:00'} 
                        onChange={e => setContent({...content, horario_retiro: {...content.horario_retiro, hora_fin: e.target.value}})}
                        className="w-full px-4 py-3 rounded-xl bg-[#161926] border border-white/5 text-[10px] font-bold text-white outline-none focus:border-rose-500/30"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest ml-1">Días Permitidos</label>
                    <div className="flex flex-wrap gap-2">
                      {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((d, i) => (
                        <button
                          key={i}
                          onClick={() => toggleDay('horario_retiro', i)}
                          className={`w-8 h-8 rounded-lg text-[10px] font-black transition-all ${
                            content.horario_retiro?.dias_semana?.includes(i)
                              ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20'
                              : 'bg-white/5 text-slate-500 border border-white/5'
                          }`}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-3xl bg-bcb-primary/5 border border-bcb-primary/10 flex gap-4">
                <div className="p-2 rounded-xl bg-bcb-primary/10 text-bcb-primary shrink-0"><Info size={20} /></div>
                <p className="text-[9px] font-bold text-slate-400 uppercase leading-relaxed tracking-wide">
                  Estos ajustes afectan a todos los usuarios en tiempo real. Asegúrate de verificar los enlaces antes de guardar los cambios.
                </p>
              </div>

              <button 
                onClick={handleSave}
                disabled={saving}
                className="w-full py-5 rounded-2xl bg-bcb-primary text-white font-black text-[11px] uppercase tracking-[0.2em] shadow-xl shadow-bcb-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {saving ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />}
                Deploy System Updates
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Announcement Modal */}
      <AnimatePresence>
        {showAnnouncementModal && (
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
              
              <div className="flex items-center gap-4 mb-8">
                <div className="p-3.5 rounded-2xl bg-bcb-primary/10 text-bcb-primary border border-bcb-primary/20">
                  <Bell size={24} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-white uppercase tracking-tighter italic">{editingAnnouncement ? 'Editar Comunicado' : 'Nuevo Comunicado'}</h3>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Aparecerá en el inicio de los usuarios</p>
                </div>
              </div>

              <form onSubmit={handleAnnouncementSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 italic">Título (Opcional)</label>
                  <input 
                    type="text" 
                    value={announcementForm.titulo} 
                    onChange={e => setAnnouncementForm({...announcementForm, titulo: e.target.value})}
                    placeholder="Título del anuncio..."
                    className="w-full bg-[#0f111a] border border-white/5 rounded-2xl px-6 py-4 text-xs font-black text-white outline-none focus:border-bcb-primary/30 shadow-inner"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 italic">Mensaje (Obligatorio)</label>
                  <textarea 
                    value={announcementForm.mensaje} 
                    onChange={e => setAnnouncementForm({...announcementForm, mensaje: e.target.value})}
                    placeholder="Contenido del mensaje..."
                    className="w-full bg-[#0f111a] border border-white/5 rounded-2xl px-6 py-4 text-xs font-bold text-white outline-none focus:border-bcb-primary/30 shadow-inner min-h-[120px] resize-none"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 italic">Orden</label>
                    <input 
                      type="number" 
                      value={announcementForm.orden} 
                      onChange={e => setAnnouncementForm({...announcementForm, orden: e.target.value})}
                      className="w-full bg-[#0f111a] border border-white/5 rounded-2xl px-6 py-4 text-xs font-black text-white outline-none focus:border-bcb-primary/30 shadow-inner"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 italic">Estado</label>
                    <div className="p-4 rounded-2xl bg-[#0f111a] border border-white/5 flex items-center justify-between">
                      <span className="text-[10px] font-black text-white uppercase tracking-widest">{announcementForm.activo ? 'Activo' : 'Inactivo'}</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" checked={announcementForm.activo} onChange={e => setAnnouncementForm({...announcementForm, activo: e.target.checked})} />
                        <div className="w-10 h-5 bg-slate-800 rounded-full peer peer-checked:bg-bcb-primary after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all shadow-lg" />
                      </label>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 italic">Imagen (Opcional)</label>
                  <div 
                    onClick={() => document.getElementById('announcement-img').click()}
                    className="w-full py-8 border-2 border-dashed border-white/5 rounded-3xl bg-[#0f111a] flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-white/5 transition-all"
                  >
                    <input 
                      id="announcement-img"
                      type="file" 
                      className="hidden" 
                      accept="image/*"
                      onChange={e => setAnnouncementForm({...announcementForm, image: e.target.files[0]})}
                    />
                    {announcementForm.image ? (
                      <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">{announcementForm.image.name}</p>
                    ) : (
                      <>
                        <ImageIcon className="text-slate-600" size={32} />
                        <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Click para subir imagen</p>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    type="button"
                    onClick={() => setShowAnnouncementModal(false)}
                    className="flex-1 py-4 rounded-2xl bg-white/5 text-slate-400 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    disabled={announcementsaving}
                    className="flex-1 py-4 rounded-2xl bg-bcb-primary text-white text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-bcb-primary/20 flex items-center justify-center gap-2"
                  >
                    {announcementsaving ? <RefreshCw className="animate-spin" size={14} /> : <CheckCircle2 size={14} />}
                    {editingAnnouncement ? 'Actualizar' : 'Publicar'}
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





