import { useState, useEffect, useRef } from 'react';
import { api } from '../../lib/api';
import { Plus, Trash2, Edit2, Save, X, Play, Clock, Award, Upload, CheckCircle } from 'lucide-react';
import { cn } from '../../lib/utils/cn';

export default function AdminTareas() {
  const [tareas, setTareas] = useState([]);
  const [niveles, setNiveles] = useState([]);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [form, setForm] = useState({
    nombre: '',
    video_url: '',
    respuesta_correcta: '',
    opciones: ''
  });
  const [selectedVideoFile, setSelectedVideoFile] = useState(null);

  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    Promise.all([
      api.admin.tareas()
    ]).then(([t]) => {
      const tareasList = Array.isArray(t) ? t : [];
      setTareas(tareasList.map(item => ({ ...item, opciones: Array.isArray(item.opciones) ? item.opciones.join(', ') : item.opciones })));
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleVideoSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      alert('El video excede el límite de 50MB.');
      return;
    }

    const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'];
    if (!allowedTypes.includes(file.type)) {
      alert('Formato no permitido. Solo MP4, WebM, MOV o AVI.');
      return;
    }

    setSelectedVideoFile(file);
    setUploadingVideo(true);
    setUploadProgress(0);

    try {
      const result = await api.admin.subirVideoTarea(file, (progress) => {
        setUploadProgress(progress);
      });
      setForm(prev => ({ ...prev, video_url: result.video_url }));
    } catch (err) {
      alert('Error al subir video: ' + err.message);
    } finally {
      setUploadingVideo(false);
      setUploadProgress(0);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.video_url) {
      alert('Primero debes subir un video.');
      return;
    }
    try {
      const payload = { 
        ...form, 
        opciones: form.opciones.split(',').map(o => o.trim()).filter(o => o) 
      };
      const nueva = await api.admin.crearTarea(payload);
      setTareas([...tareas, { ...nueva, opciones: nueva.opciones.join(', ') }]);
      setForm({ nombre: '', video_url: '', respuesta_correcta: '', opciones: '' });
      setSelectedVideoFile(null);
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
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest">Nuevo Contenido de Video</h2>
          <span className="text-[9px] font-black bg-amber-50 text-amber-600 px-3 py-1 rounded-full uppercase tracking-tighter border border-amber-100">
            EL PAGO DEPENDE DEL NIVEL DEL USUARIO
          </span>
        </div>
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
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Video de la Campaña</label>
            {form.video_url ? (
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-green-50 border border-green-100">
                <CheckCircle size={20} className="text-green-500" />
                <span className="text-xs font-bold text-green-700 truncate flex-1">{form.video_url.split('/').pop()}</span>
                <button
                  type="button"
                  onClick={() => { setForm({...form, video_url: ''}); setSelectedVideoFile(null); }}
                  className="text-xs font-black text-red-500 hover:text-red-700 uppercase"
                >
                  Cambiar
                </button>
              </div>
            ) : (
              <label className={cn(
                "flex flex-col items-center justify-center w-full h-32 rounded-2xl border-2 border-dashed cursor-pointer transition-all",
                uploadingVideo
                  ? "bg-gray-50 border-gray-300 text-gray-400"
                  : "bg-gray-50 border-gray-200 hover:border-sav-primary/30 hover:bg-sav-primary/5 text-gray-400 hover:text-sav-primary"
              )}>
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  {uploadingVideo ? (
                    <>
                      <div className="w-12 h-12 relative flex items-center justify-center mb-3">
                        <div className="absolute inset-0 border-4 border-sav-primary/10 rounded-full" />
                        <div 
                          className="absolute inset-0 border-4 border-sav-primary rounded-full animate-[spin_3s_linear_infinite]" 
                          style={{ clipPath: `polygon(50% 50%, -50% -50%, ${uploadProgress}% -50%)` }} 
                        />
                        <span className="text-[10px] font-black text-sav-primary">{uploadProgress}%</span>
                      </div>
                      <p className="text-xs font-black uppercase tracking-widest text-sav-primary">Subiendo video...</p>
                      <div className="w-48 h-1 bg-gray-100 rounded-full mt-3 overflow-hidden">
                        <div 
                          className="h-full bg-sav-primary transition-all duration-300" 
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <Upload size={28} className="mb-2" />
                      <p className="text-xs font-black uppercase tracking-widest">Seleccionar video</p>
                      <p className="text-[9px] font-medium mt-1">MP4, WebM, MOV, AVI (máx. 50MB)</p>
                    </>
                  )}
                </div>
                <input
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime,video/x-msvideo"
                  className="hidden"
                  onChange={handleVideoSelect}
                  disabled={uploadingVideo}
                />
              </label>
            )}
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
