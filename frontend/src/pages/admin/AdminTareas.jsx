import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { Plus, Trash2, Edit2, Save, X, Play, Clock, Award } from 'lucide-react';

export default function AdminTareas() {
  const [tareas, setTareas] = useState([]);
  const [niveles, setNiveles] = useState([]);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    nombre: '',
    video_url: '',
    respuesta_correcta: '',
    opciones: ''
  });

  useEffect(() => {
    Promise.all([
      api.admin.tareas()
    ]).then(([t]) => {
      const tareasList = Array.isArray(t) ? t : [];
      setTareas(tareasList.map(item => ({ ...item, opciones: Array.isArray(item.opciones) ? item.opciones.join(', ') : item.opciones })));
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const payload = { 
        ...form, 
        opciones: form.opciones.split(',').map(o => o.trim()).filter(o => o) 
      };
      const nueva = await api.admin.crearTarea(payload);
      setTareas([...tareas, { ...nueva, opciones: nueva.opciones.join(', ') }]);
      setForm({ nombre: '', video_url: '', respuesta_correcta: '', opciones: '' });
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta tarea?')) return;
    try {
      await api.admin.eliminarTarea(id);
      setTareas(tareas.filter(t => t.id !== id));
    } catch (err) {
      alert(err.message);
    }
  };

  const handleUpdate = async () => {
    try {
      const payload = { 
        ...editing, 
        opciones: typeof editing.opciones === 'string' ? editing.opciones.split(',').map(o => o.trim()).filter(o => o) : editing.opciones 
      };
      const updated = await api.admin.actualizarTarea(editing.id, payload);
      setTareas(tareas.map(t => t.id === updated.id ? { ...updated, opciones: updated.opciones.join(', ') } : t));
      setEditing(null);
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <div className="p-8">Cargando...</div>;

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">Gestión de Contenido (Tareas)</h1>
        <p className="text-gray-500 font-medium uppercase tracking-widest text-[10px] mt-1">Administra los videos publicitarios globales. <span className="text-sav-primary">Este contenido pagará según el nivel VIP del usuario que lo visualice.</span></p>
      </div>

      {/* Formulario Crear */}
      <div className="bg-white rounded-[2rem] p-6 md:p-8 shadow-sm border border-gray-100 mb-8">
        <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6">Nuevo Contenido de Video</h2>
        <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Título de la Campaña</label>
            <input
              type="text"
              placeholder="Ej. Comercial Adidas 2026"
              className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-2 border-gray-50 text-gray-800 font-bold text-sm focus:border-sav-primary/20 transition-all outline-none"
              value={form.nombre}
              onChange={e => setForm({...form, nombre: e.target.value})}
              required
            />
          </div>

          <div className="space-y-2">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">URL del Video (MP4)</label>
            <input
              type="url"
              placeholder="https://servidor.com/video.mp4"
              className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-2 border-gray-50 text-gray-800 font-bold text-sm focus:border-sav-primary/20 transition-all outline-none"
              value={form.video_url}
              onChange={e => setForm({...form, video_url: e.target.value})}
              required
            />
          </div>

          <div className="space-y-2">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Pregunta de Validación</label>
            <input
              type="text"
              placeholder="¿Qué marca aparece al final?"
              className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-2 border-gray-50 text-gray-800 font-bold text-sm focus:border-sav-primary/20 transition-all outline-none"
              value={form.pregunta || ''}
              onChange={e => setForm({...form, pregunta: e.target.value})}
              required
            />
          </div>

          <div className="space-y-2">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Opciones de Respuesta (comas)</label>
            <input
              type="text"
              placeholder="Adidas, Nike, Puma"
              className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-2 border-gray-50 text-gray-800 font-bold text-sm focus:border-sav-primary/20 transition-all outline-none"
              value={form.opciones}
              onChange={e => setForm({...form, opciones: e.target.value})}
              required
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Respuesta Correcta</label>
            <input
              type="text"
              placeholder="Debe ser idéntica a una de las opciones"
              className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-2 border-gray-50 text-gray-800 font-bold text-sm focus:border-sav-primary/20 transition-all outline-none"
              value={form.respuesta_correcta}
              onChange={e => setForm({...form, respuesta_correcta: e.target.value})}
              required
            />
          </div>

          <div className="md:col-span-2">
            <button type="submit" className="w-full flex items-center justify-center gap-3 py-5 rounded-2xl bg-[#1a1f36] text-white font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-[#1a1f36]/20 active:scale-[0.98] transition-all">
              <Plus size={18} /> Publicar Contenido Global
            </button>
          </div>
        </form>
      </div>

      {/* Lista de Tareas */}
      <div className="space-y-4">
        <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest ml-2">Biblioteca de Contenidos</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Array.isArray(tareas) && tareas.map((t) => (
            <div key={t.id} className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100 group hover:shadow-md transition-all relative overflow-hidden">
              {editing?.id === t.id ? (
                <div className="space-y-4">
                  <input
                    type="text"
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-100 text-sm font-bold"
                    value={editing.nombre}
                    onChange={e => setEditing({...editing, nombre: e.target.value})}
                  />
                  <input
                    type="text"
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-100 text-sm font-bold"
                    value={editing.video_url}
                    onChange={e => setEditing({...editing, video_url: e.target.value})}
                  />
                  <input
                    type="text"
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-100 text-sm font-bold"
                    value={editing.opciones}
                    onChange={e => setEditing({...editing, opciones: e.target.value})}
                  />
                  <input
                    type="text"
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-100 text-sm font-bold"
                    value={editing.respuesta_correcta}
                    onChange={e => setEditing({...editing, respuesta_correcta: e.target.value})}
                  />
                  <div className="flex gap-2">
                    <button onClick={handleUpdate} className="flex-1 bg-green-600 text-white py-4 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-green-100"><Save size={18}/> Guardar</button>
                    <button onClick={() => setEditing(null)} className="flex-1 bg-gray-400 text-white py-4 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-gray-100"><X size={18}/> Cancelar</button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                  <div className="flex items-center gap-5 w-full">
                    <div className="w-20 h-20 bg-gray-50 rounded-2xl overflow-hidden shrink-0 border border-gray-100 flex items-center justify-center">
                      <Play size={24} className="text-gray-300" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-black text-gray-800 text-sm uppercase tracking-tighter truncate">{t.nombre}</h3>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <span className="text-[9px] font-black uppercase tracking-widest bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full">
                          CONTENIDO GLOBAL
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto pt-4 sm:pt-0 border-t sm:border-0 border-gray-50">
                    <div className="text-left sm:text-right">
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Validación</p>
                      <p className="text-[11px] font-bold text-gray-600 truncate max-w-[120px]">{t.respuesta_correcta}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setEditing(t)} className="p-3 text-blue-500 hover:bg-blue-50 rounded-xl transition-colors">
                        <Edit2 size={20} />
                      </button>
                      <button onClick={() => handleDelete(t.id)} className="p-3 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors">
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {tareas.length === 0 && (
        <div className="bg-gray-50/50 rounded-[2rem] border-2 border-dashed border-gray-100 p-12 text-center">
          <p className="text-gray-400 font-black uppercase tracking-[0.2em] text-[10px]">No hay contenidos configurados</p>
        </div>
      )}
    </div>
  );
}
