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
  ExternalLink
} from 'lucide-react';
import { api } from '../../lib/api';

export default function AdminContenidoHomeV2() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [content, setContent] = useState({
    soporte_canal_url: '',
    soporte_gerente_url: '',
    marquee_text: '',
    comision_retiro: 12,
    ruleta_activa: true,
    recompensas_visibles: true
  });

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/public-content');
      if (res) setContent(res);
    } catch (err) {
      console.error('Error fetching public content:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/admin/public-content', content);
      alert('Configuración global actualizada con éxito');
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <RefreshCw className="animate-spin text-sav-primary" size={32} />
    </div>
  );

  return (
    <div className="space-y-10 pb-20">
      <div className="flex items-center gap-4">
        <div className="p-3.5 rounded-2xl bg-gradient-to-tr from-sav-primary to-indigo-600 text-white shadow-xl">
          <Bell size={24} />
        </div>
        <div>
          <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic">System Configuration</h1>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] flex items-center gap-2">
            <ShieldCheck size={14} className="text-sav-primary" /> Ajustes globales y enlaces de comunicación
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
            <Smartphone className="text-sav-primary" size={24} /> Canales de Soporte
          </h3>

          <form onSubmit={handleSave} className="space-y-8">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 italic">Canal de Telegram (Oficial)</label>
              <div className="relative group">
                <Send className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-sav-primary transition-colors" size={18} />
                <input 
                  type="url" 
                  value={content.soporte_canal_url} 
                  onChange={e => setContent({...content, soporte_canal_url: e.target.value})}
                  className="w-full pl-14 pr-6 py-5 rounded-2xl bg-[#0f111a] border border-white/5 text-xs font-black text-white outline-none focus:border-sav-primary/30 transition-all shadow-inner"
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
                  className="w-full pl-14 pr-6 py-5 rounded-2xl bg-[#0f111a] border border-white/5 text-xs font-black text-white outline-none focus:border-sav-primary/30 transition-all shadow-inner"
                  placeholder="https://wa.me/591..."
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 italic">Texto de la Marquesina (Scroll)</label>
              <textarea 
                value={content.marquee_text} 
                onChange={e => setContent({...content, marquee_text: e.target.value})}
                className="w-full px-6 py-5 rounded-2xl bg-[#0f111a] border border-white/5 text-xs font-bold text-white outline-none focus:border-sav-primary/30 transition-all shadow-inner min-h-[120px] resize-none"
                placeholder="Bienvenido a BCB Global..."
              />
            </div>
          </form>
        </motion.div>

        {/* Global Rules */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-8"
        >
          <div className="bg-[#161926] border border-white/5 p-10 rounded-[45px] shadow-2xl relative overflow-hidden">
            <h3 className="text-2xl font-black text-white uppercase tracking-tighter italic mb-8 flex items-center gap-3">
              <Zap className="text-sav-primary" size={24} /> Reglas del Sistema
            </h3>

            <div className="space-y-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 italic">Comisión de Retiro (%)</label>
                <div className="relative group">
                  <DollarSign className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-sav-primary transition-colors" size={18} />
                  <input 
                    type="number" 
                    value={content.comision_retiro} 
                    onChange={e => setContent({...content, comision_retiro: e.target.value})}
                    className="w-full pl-14 pr-6 py-5 rounded-2xl bg-[#0f111a] border border-white/5 text-xs font-black text-white outline-none focus:border-sav-primary/30 transition-all shadow-inner"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 rounded-3xl bg-[#0f111a] border border-white/5 flex items-center justify-between group hover:border-sav-primary/20 transition-all">
                  <div>
                    <p className="text-[10px] font-black text-white uppercase tracking-widest mb-1">Módulo Ruleta</p>
                    <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Activar/Desactivar sorteos</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={content.ruleta_activa} onChange={e => setContent({...content, ruleta_activa: e.target.checked})} />
                    <div className="w-11 h-6 bg-slate-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-sav-primary after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all shadow-lg" />
                  </label>
                </div>

                <div className="p-6 rounded-3xl bg-[#0f111a] border border-white/5 flex items-center justify-between group hover:border-sav-primary/20 transition-all">
                  <div>
                    <p className="text-[10px] font-black text-white uppercase tracking-widest mb-1">Recompensas</p>
                    <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Visibilidad de bonos</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={content.recompensas_visibles} onChange={e => setContent({...content, recompensas_visibles: e.target.checked})} />
                    <div className="w-11 h-6 bg-slate-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-sav-primary after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all shadow-lg" />
                  </label>
                </div>
              </div>

              <div className="p-6 rounded-3xl bg-sav-primary/5 border border-sav-primary/10 flex gap-4">
                <div className="p-2 rounded-xl bg-sav-primary/10 text-sav-primary shrink-0"><Info size={20} /></div>
                <p className="text-[9px] font-bold text-slate-400 uppercase leading-relaxed tracking-wide">
                  Estos ajustes afectan a todos los usuarios en tiempo real. Asegúrate de verificar los enlaces antes de guardar los cambios.
                </p>
              </div>

              <button 
                onClick={handleSave}
                disabled={saving}
                className="w-full py-5 rounded-2xl bg-sav-primary text-white font-black text-[11px] uppercase tracking-[0.2em] shadow-xl shadow-sav-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {saving ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />}
                Deploy System Updates
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
