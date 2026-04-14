import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { HelpCircle, X, CheckCircle2, AlertTriangle, Send } from 'lucide-react';
import { api } from '../lib/api';

export default function FloatingQuestionnaire() {
  const location = useLocation();
  const [showModal, setShowModal] = useState(false);
  const [cuestionario, setCuestionario] = useState(null);
  const [loading, setLoading] = useState(true);
  const [respuestas, setRespuestas] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchCuestionario();
  }, []);

  const fetchCuestionario = async () => {
    try {
      const res = await api.get('/users/cuestionario');
      if (res && res.activo && !res.ya_respondio) {
        if (res.expirado) {
          // Opcional: mostrar un aviso de que ya expiró si el usuario estaba navegando
          setCuestionario(null);
        } else {
          setCuestionario(res.datos);
        }
      } else {
        setCuestionario(null);
      }
    } catch (err) {
      console.error('Error fetching questionnaire:', err);
      setCuestionario(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validación robusta: verificar si hay preguntas y si el número de respuestas coincide
    const preguntas = Array.isArray(cuestionario?.preguntas) ? cuestionario.preguntas : [];
    const numPreguntas = preguntas.length;
    
    if (numPreguntas === 0) {
      alert('Error: El cuestionario no tiene preguntas válidas.');
      return;
    }

    // Validar que todas las preguntas tengan una respuesta (no nula/undefined)
    const respondidasIds = Object.keys(respuestas);
    const todasRespondidas = preguntas.every(p => respondidasIds.includes(String(p.id)) && respuestas[p.id] !== undefined);

    if (!todasRespondidas || respondidasIds.length < numPreguntas) {
      alert('Por favor responde todas las preguntas antes de enviar.');
      return;
    }

    setSubmitting(true);
    try {
      // Enviar respuestas como objeto { id_pregunta: indice_opcion }
      await api.post('/users/cuestionario/responder', { respuestas });
      alert('¡Gracias por tu participación! Tu opinión es valiosa para nosotros.');
      setShowModal(false);
      setCuestionario(null);
    } catch (err) {
      console.error('Error enviando cuestionario:', err);
      alert('Error al enviar: ' + (err.response?.data?.error || err.message));
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Se muestra solo en el Inicio (/) mientras esté pendiente
  if (location.pathname !== '/' || loading || !cuestionario) return null;

  return (
    <>
      {/* Botón Flotante - Posición ajustada para no chocar con menú de soporte */}
      <button 
        onClick={() => setShowModal(true)}
        className="fixed bottom-44 left-6 z-[60] w-14 h-14 bg-gradient-to-br from-indigo-500 to-blue-700 text-white rounded-[1.2rem] shadow-[0_15px_30px_-5px_rgba(79,70,229,0.5)] flex items-center justify-center animate-bounce hover:scale-110 active:scale-95 transition-all border-2 border-white/20"
      >
        <HelpCircle size={28} />
        <motion.span 
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="absolute -top-2 -right-2 w-6 h-6 bg-white text-indigo-600 rounded-full border-2 border-indigo-500 flex items-center justify-center text-[10px] font-black shadow-lg"
        >
          1
        </motion.span>
      </button>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] bg-sav-dark/95 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-sav-card w-full max-w-sm rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/10 flex flex-col animate-in">
            <div className="bg-sav-primary p-8 text-white relative">
              <button 
                onClick={() => setShowModal(false)}
                className="absolute top-6 right-6 p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
              >
                <X size={20} />
              </button>
              <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mb-4">
                <HelpCircle size={32} />
              </div>
              <h2 className="text-2xl font-black uppercase tracking-tight">Encuesta Institucional</h2>
              <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest mt-1">Tu participación es opcional</p>
            </div>

            <div className="p-8 flex-1 overflow-y-auto no-scrollbar space-y-8">
              {cuestionario.preguntas?.map((p, pIdx) => (
                <div key={p.id} className="space-y-4">
                  <div className="flex gap-3">
                    <span className="w-6 h-6 bg-sav-primary/10 text-sav-primary rounded-lg flex items-center justify-center text-xs font-black shrink-0">{pIdx + 1}</span>
                    <h3 className="text-sm font-black text-white uppercase tracking-tight leading-tight">{p.texto}</h3>
                  </div>
                  
                  <div className="space-y-2 ml-9">
                    {p.opciones?.map((opt, oIdx) => (
                      <button
                        key={oIdx}
                        type="button"
                        onClick={() => setRespuestas(prev => ({ ...prev, [p.id]: oIdx }))}
                        className={`w-full p-4 rounded-xl border text-[10px] font-black uppercase tracking-widest text-left flex items-center justify-between transition-all active:scale-[0.98] ${respuestas[p.id] === oIdx ? 'bg-sav-primary border-sav-primary text-white shadow-lg shadow-sav-primary/20' : 'bg-sav-surface border-sav-border text-sav-muted hover:border-white/10'}`}
                      >
                        {opt}
                        {respuestas[p.id] === oIdx && <CheckCircle2 size={14} />}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-8 pt-0">
              <button 
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full h-14 bg-sav-primary text-white rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] shadow-lg shadow-sav-primary/20 flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-50"
              >
                {submitting ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>Enviar Respuestas <Send size={16} /></>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
