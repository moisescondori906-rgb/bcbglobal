import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { Save, Plus, Trash2, HelpCircle, CheckCircle2, AlertTriangle, Users } from 'lucide-react';

export default function AdminCuestionario() {
  const [config, setConfig] = useState({
    cuestionario_activo: false,
    cuestionario_data: {
      titulo: 'Cuestionario Diario Obligatorio',
      hora_inicio: '00:00',
      hora_fin: '23:59',
      preguntas: [
        {
          id: 1,
          texto: '¿Cuál es la regla principal de la plataforma?',
          opciones: ['No compartir cuenta', 'Invertir todo', 'Invitar 100 personas'],
          respuesta_correcta: 0
        }
      ]
    }
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [punishing, setPunishing] = useState(false);
  const [respuestas, setRespuestas] = useState([]);

  useEffect(() => {
    fetchConfig();
    fetchRespuestas();
  }, []);

  const fetchRespuestas = async () => {
    try {
      const res = await api.get('/admin/cuestionario/respuestas');
      setRespuestas(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error(err);
      setRespuestas([]);
    }
  };

  const fetchConfig = async () => {
    try {
      const res = await api.admin.publicContent();
      setConfig({
        cuestionario_activo: res.cuestionario_activo === true || res.cuestionario_activo === 'true',
        cuestionario_data: res.cuestionario_data || config.cuestionario_data
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.admin.updatePublicContent({
        cuestionario_activo: config.cuestionario_activo,
        cuestionario_data: config.cuestionario_data
      });
      alert('Configuración guardada correctamente');
    } catch (err) {
      alert('Error al guardar: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCastigar = async () => {
    if (!confirm('¿Estás seguro de aplicar los castigos? Esto bloqueará a todos los usuarios que no respondieron el cuestionario AYER. Esta acción se basa en la fecha del servidor de ayer.')) return;
    setPunishing(true);
    try {
      const res = await api.post('/admin/cuestionario/castigar');
      alert(`¡Éxito! Se han aplicado castigos a ${res.punished} usuarios correspondientes al día ${res.target_date}.`);
      fetchRespuestas();
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setPunishing(false);
    }
  };

  const addPregunta = () => {
    const newPregunta = {
      id: Date.now(),
      texto: '',
      opciones: ['', ''],
      respuesta_correcta: 0
    };
    setConfig({
      ...config,
      cuestionario_data: {
        ...config.cuestionario_data,
        preguntas: [...config.cuestionario_data.preguntas, newPregunta]
      }
    });
  };

  const removePregunta = (id) => {
    setConfig({
      ...config,
      cuestionario_data: {
        ...config.cuestionario_data,
        preguntas: config.cuestionario_data.preguntas.filter(p => p.id !== id)
      }
    });
  };

  const updatePregunta = (id, fields) => {
    setConfig({
      ...config,
      cuestionario_data: {
        ...config.cuestionario_data,
        preguntas: config.cuestionario_data.preguntas.map(p => p.id === id ? { ...p, ...fields } : p)
      }
    });
  };

  if (loading) return <div className="p-8 text-center text-gray-500 font-black uppercase tracking-widest text-[10px]">Cargando...</div>;

  return (
    <div className="p-4 md:p-8 space-y-6 pb-24">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">Gestión de Cuestionarios</h1>
          <p className="text-gray-500 font-medium uppercase tracking-widest text-[10px] mt-1">Configura evaluaciones diarias y castigos</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleSave}
            disabled={saving}
            className="bg-[#1a1f36] text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-lg active:scale-95 disabled:opacity-50"
          >
            <Save size={16}/> Guardar Cambios
          </button>
        </div>
      </div>

      <div className="bg-indigo-50 border border-indigo-100 p-6 rounded-[2rem] flex items-start gap-4">
        <div className="w-10 h-10 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
          <Info size={24} />
        </div>
        <div className="space-y-1">
          <p className="text-xs text-indigo-800 font-black uppercase tracking-widest">Encuestas de Opinión</p>
          <p className="text-[10px] text-indigo-700 font-bold uppercase leading-relaxed">
            Las encuestas ahora son 100% informativas y opcionales. No generan sanciones ni bloqueos. Los usuarios pueden participar voluntariamente desde el botón flotante en el inicio.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100 space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest">Configuración de la Encuesta</h2>
              <label className="flex items-center gap-3 cursor-pointer group">
                <span className={`text-[10px] font-black uppercase tracking-widest transition-colors ${config.cuestionario_activo ? 'text-emerald-600' : 'text-gray-400'}`}>
                  {config.cuestionario_activo ? 'Activo (Visible)' : 'Inactivo (Oculto)'}
                </span>
                <div className="relative">
                  <input 
                    type="checkbox" 
                    className="sr-only peer"
                    checked={config.cuestionario_activo}
                    onChange={e => setConfig({...config, cuestionario_activo: e.target.checked})}
                  />
                  <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                </div>
              </label>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-gray-400 uppercase ml-2">Título del Cuestionario</label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-100 text-sm font-black text-gray-800"
                    value={config.cuestionario_data.titulo}
                    onChange={e => setConfig({...config, cuestionario_data: {...config.cuestionario_data, titulo: e.target.value}})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-gray-400 uppercase ml-2">Hora Inicio</label>
                    <input
                      type="time"
                      className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-100 text-sm font-black text-gray-800"
                      value={config.cuestionario_data.hora_inicio || '00:00'}
                      onChange={e => setConfig({...config, cuestionario_data: {...config.cuestionario_data, hora_inicio: e.target.value}})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-gray-400 uppercase ml-2">Hora Fin</label>
                    <input
                      type="time"
                      className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-100 text-sm font-black text-gray-800"
                      value={config.cuestionario_data.hora_fin || '23:59'}
                      onChange={e => setConfig({...config, cuestionario_data: {...config.cuestionario_data, hora_fin: e.target.value}})}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-6 pt-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-[10px] font-black text-gray-800 uppercase tracking-widest flex items-center gap-2">
                    <HelpCircle size={14} className="text-sav-primary" /> Preguntas ({Array.isArray(config.cuestionario_data?.preguntas) ? config.cuestionario_data.preguntas.length : 0})
                  </h3>
                  <button 
                    onClick={addPregunta}
                    className="text-[9px] font-black text-sav-primary uppercase tracking-widest hover:underline flex items-center gap-1"
                  >
                    <Plus size={14}/> Añadir Pregunta
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  {Array.isArray(config.cuestionario_data?.preguntas) && config.cuestionario_data.preguntas.map((p, index) => (
                    <div key={p.id} className="p-6 rounded-2xl bg-gray-50 border border-gray-100 space-y-6 relative group">
                      <button 
                        onClick={() => removePregunta(p.id)}
                        className="absolute top-4 right-4 text-gray-300 hover:text-rose-500 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                      
                      <div className="space-y-1 pr-8">
                        <label className="text-[9px] font-black text-gray-400 uppercase ml-2">Pregunta {index + 1}</label>
                        <input
                          type="text"
                          className="w-full px-4 py-3 rounded-xl bg-white border border-gray-100 text-sm font-black text-gray-800"
                          value={p.texto}
                          onChange={e => updatePregunta(p.id, { texto: e.target.value })}
                          placeholder="Escribe la pregunta aquí..."
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {Array.isArray(p.opciones) && p.opciones.map((opt, oIndex) => (
                          <div key={oIndex} className="space-y-1">
                            <div className="flex items-center justify-between px-2">
                              <label className="text-[9px] font-black text-gray-400 uppercase">Opción {oIndex + 1}</label>
                              <label className="flex items-center gap-1 cursor-pointer">
                                <input 
                                  type="radio" 
                                  name={`correcta-${p.id}`}
                                  checked={p.respuesta_correcta === oIndex}
                                  onChange={() => updatePregunta(p.id, { respuesta_correcta: oIndex })}
                                  className="w-3 h-3 text-emerald-500"
                                />
                                <span className="text-[8px] font-black uppercase text-gray-400">Correcta</span>
                              </label>
                            </div>
                            <input
                              type="text"
                              className={`w-full px-4 py-3 rounded-xl border text-xs font-bold transition-all ${p.respuesta_correcta === oIndex ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-gray-100 text-gray-600'}`}
                              value={opt}
                              onChange={e => {
                                const newOpts = [...p.opciones];
                                newOpts[oIndex] = e.target.value;
                                updatePregunta(p.id, { opciones: newOpts });
                              }}
                            />
                          </div>
                        ))}
                      </div>
                      
                      <div className="flex justify-start">
                        <button 
                          onClick={() => {
                            const newOpts = [...(p.opciones || []), ''];
                            updatePregunta(p.id, { opciones: newOpts });
                          }}
                          className="text-[8px] font-black text-gray-400 uppercase tracking-widest hover:text-sav-primary transition-colors"
                        >
                          + Añadir Opción
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-4">
              <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest">Participación Reciente ({respuestas?.length || 0})</h2>
            </div>
            <div className="space-y-3 max-h-[600px] overflow-y-auto no-scrollbar">
              {Array.isArray(respuestas) && respuestas.map(r => (
                <div key={r.id} className="p-4 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-between group">
                  <div>
                    <p className="text-xs font-black text-gray-900 uppercase tracking-tight">{r.nombre_usuario}</p>
                    <p className="text-[9px] text-gray-400 font-bold">{r.telefono}</p>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-full ${r.es_correcta ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                      {r.es_correcta ? 'Correcto' : 'Incorrecto'}
                    </span>
                    <p className="text-[8px] text-gray-400 font-medium mt-1">{new Date(r.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
              {(!respuestas || respuestas.length === 0) && (
                <div className="py-10 text-center">
                  <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Sin participaciones hoy</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-rose-50 border border-rose-100 rounded-[2rem] p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertTriangle size={20} />
              <h2 className="text-xs font-black uppercase tracking-widest">Zona de Castigo</h2>
            </div>
            <p className="text-[9px] text-rose-500 font-bold uppercase leading-relaxed">
              Aplica sanciones a los usuarios que NO participaron ayer. Los castigados no podrán realizar retiros ni usar la ruleta hasta mañana.
            </p>
            <button 
              onClick={handleCastigar}
              disabled={punishing}
              className="w-full py-4 bg-rose-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-rose-200 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {punishing ? 'Aplicando...' : 'Aplicar Castigos (Ayer)'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
