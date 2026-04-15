import { useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/api';
import { 
  Calendar as CalendarIcon, 
  AlertCircle, 
  CheckCircle2, 
  XCircle,
  Info,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { ToastContainer } from '../../components/ui/Toast';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { cn } from '../../lib/utils/cn';

export default function AdminCalendario() {
  const [days, setDays] = useState([]);
  const [levels, setLevels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [showModal, setShowModal] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [formData, setFormData] = useState({
    fecha: '',
    tipo_dia: 'laboral',
    es_feriado: false,
    tareas_habilitadas: true,
    retiros_habilitados: true,
    recargas_habilitadas: true,
    motivo: '',
    reglas_niveles: {}
  });

  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [calRes, levelsRes] = await Promise.all([
        api.get('/admin/calendario'),
        api.get('/admin/niveles')
      ]);
      setDays(Array.isArray(calRes) ? calRes : []);
      setLevels(Array.isArray(levelsRes) ? levelsRes : []);
    } catch (err) {
      addToast('Error cargando datos del calendario', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePrevMonth = () => {
    setCurrentMonth(prev => {
      const next = new Date(prev);
      next.setMonth(next.getMonth() - 1);
      return next;
    });
  };

  const handleNextMonth = () => {
    setCurrentMonth(prev => {
      const next = new Date(prev);
      next.setMonth(next.getMonth() + 1);
      return next;
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      await api.post('/admin/calendario', formData);
      setShowModal(false);
      addToast('Día guardado correctamente', 'success');
      fetchData();
    } catch (err) {
      addToast('Error guardando: ' + (err.message || 'Intenta de nuevo'), 'error');
    }
  };

  const handleDeleteRequest = (fecha) => {
    setConfirmDelete({ fecha });
  };

  const handleDeleteConfirm = async () => {
    if (!confirmDelete) return;
    try {
      await api.delete(`/admin/calendario/${confirmDelete.fecha}`);
      addToast('Día restablecido correctamente', 'success');
      setConfirmDelete(null);
      fetchData();
    } catch (err) {
      addToast('Error eliminando: ' + (err.message || 'Intenta de nuevo'), 'error');
    }
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const daysInMonth = [];
    const startPadding = firstDay.getDay();
    for (let i = 0; i < startPadding; i++) {
      daysInMonth.push(null);
    }
    
    for (let i = 1; i <= lastDay.getDate(); i++) {
      daysInMonth.push(new Date(year, month, i));
    }
    
    return daysInMonth;
  };

  const formatDate = (date) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getDayData = (date) => {
    if (!date) return null;
    const dateStr = formatDate(date);
    return days.find(d => d.fecha.startsWith(dateStr));
  };

  const openEdit = (date) => {
    const existing = getDayData(date);
    const dateStr = formatDate(date);
    
    if (existing) {
      setFormData({
        ...existing,
        fecha: dateStr,
        es_feriado: !!existing.es_feriado,
        tareas_habilitadas: !!existing.tareas_habilitadas,
        retiros_habilitados: !!existing.retiros_habilitados,
        recargas_habilitadas: !!existing.recargas_habilitadas,
        reglas_niveles: typeof existing.reglas_niveles === 'string' 
          ? JSON.parse(existing.reglas_niveles) 
          : (existing.reglas_niveles || {})
      });
    } else {
      const isSunday = date.getDay() === 0;
      setFormData({
        fecha: dateStr,
        tipo_dia: isSunday ? 'mantenimiento' : 'laboral',
        es_feriado: false,
        tareas_habilitadas: !isSunday,
        retiros_habilitados: true,
        recargas_habilitadas: true,
        motivo: isSunday ? 'Mantenimiento Dominical' : '',
        reglas_niveles: {}
      });
    }
    setShowModal(true);
  };

  const toggleLevelRule = (levelCodigo, type) => {
    const current = { ...formData.reglas_niveles };
    if (!current[levelCodigo]) current[levelCodigo] = {};
    current[levelCodigo][type] = !current[levelCodigo][type];
    setFormData({ ...formData, reglas_niveles: current });
  };

  const monthYear = currentMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-8 animate-fade">
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      
      <ConfirmModal
        isOpen={!!confirmDelete}
        title="Restablecer Día"
        message="¿Restablecer este día a la configuración por defecto? Esta acción no se puede deshacer."
        onConfirm={handleDeleteConfirm}
        onCancel={() => setConfirmDelete(null)}
        confirmText="Restablecer"
        cancelText="Cancelar"
        variant="danger"
      />

      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">Calendario Operativo</h1>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mt-1">Control centralizado de tareas, retiros y feriados</p>
        </div>
        
        <div className="flex items-center gap-4 bg-white p-2 rounded-2xl shadow-sm border border-gray-100">
          <button onClick={handlePrevMonth} className="p-2 hover:bg-gray-50 rounded-xl transition-colors">
            <ChevronLeft size={20} className="text-gray-400" />
          </button>
          <span className="text-sm font-black uppercase tracking-widest min-w-[150px] text-center">
            {monthYear}
          </span>
          <button onClick={handleNextMonth} className="p-2 hover:bg-gray-50 rounded-xl transition-colors">
            <ChevronRight size={20} className="text-gray-400" />
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3">
          <Card className="p-0 overflow-hidden border-none shadow-xl">
            <div className="grid grid-cols-7 bg-gray-50/50 border-b border-gray-100">
              {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(d => (
                <div key={d} className="p-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  {d}
                </div>
              ))}
            </div>
            
            <div className="grid grid-cols-7 divide-x divide-y divide-gray-50">
              {getDaysInMonth(currentMonth).map((date, i) => {
                if (!date) return <div key={`empty-${i}`} className="bg-gray-50/30 min-h-[120px]" />;
                
                const data = getDayData(date);
                const isSunday = date.getDay() === 0;

                return (
                  <div 
                    key={i} 
                    onClick={() => openEdit(date)}
                    className={cn(
                      "min-h-[120px] p-3 transition-all cursor-pointer hover:bg-indigo-50/30 group relative",
                      data?.tipo_dia === 'feriado' && "bg-red-50/30",
                      data?.tipo_dia === 'mantenimiento' && "bg-amber-50/30",
                      !data && isSunday && "bg-gray-50/50"
                    )}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="w-7 h-7 flex items-center justify-center rounded-lg text-xs font-black text-gray-400">
                        {date.getDate()}
                      </span>
                      {data?.es_feriado && <Badge variant="error" className="scale-75 origin-right">FERIADO</Badge>}
                    </div>

                    <div className="space-y-1">
                      {!data && isSunday && (
                        <div className="flex items-center gap-1 text-[8px] font-black text-amber-600 uppercase">
                          <AlertCircle size={8} /> Domingo
                        </div>
                      )}
                      {data && (
                        <>
                          {!data.tareas_habilitadas && (
                            <div className="flex items-center gap-1 text-[8px] font-black text-red-500 uppercase">
                              <XCircle size={8} /> Tareas Off
                            </div>
                          )}
                          {!data.retiros_habilitados && (
                            <div className="flex items-center gap-1 text-[8px] font-black text-amber-600 uppercase">
                              <XCircle size={8} /> Retiros Off
                            </div>
                          )}
                          {data.motivo && (
                            <p className="text-[7px] font-bold text-gray-400 uppercase truncate mt-2">{data.motivo}</p>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-6 space-y-4 bg-indigo-600 text-white border-none shadow-indigo-200">
            <div className="flex items-center gap-3">
              <Info size={20} />
              <h3 className="text-xs font-black uppercase tracking-widest">Guía Operativa</h3>
            </div>
            <p className="text-[10px] font-medium leading-relaxed opacity-80 uppercase tracking-wide">
              Selecciona cualquier día en el calendario para configurar bloqueos globales, feriados o reglas específicas por nivel.
            </p>
            <div className="pt-2 space-y-2">
              <div className="flex items-center gap-2 text-[9px] font-black uppercase">
                <div className="w-2 h-2 rounded-full bg-white/40" /> Domingos bloqueados por defecto
              </div>
              <div className="flex items-center gap-2 text-[9px] font-black uppercase">
                <div className="w-2 h-2 rounded-full bg-red-400" /> Feriados: Tareas suspendidas
              </div>
            </div>
          </Card>

          <Card className="p-6 space-y-4">
            <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest">Próximos Eventos</h3>
            <div className="space-y-3">
              {days.filter(d => new Date(d.fecha) >= new Date()).slice(0, 3).map(d => (
                <div key={d.fecha} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <CalendarIcon size={16} className="text-indigo-600" />
                  <div>
                    <p className="text-[10px] font-black text-gray-800 uppercase">{d.fecha.split('T')[0]}</p>
                    <p className="text-[8px] font-bold text-gray-400 uppercase">{d.motivo || d.tipo_dia}</p>
                  </div>
                </div>
              ))}
              {days.length === 0 && <p className="text-[9px] text-gray-400 uppercase font-bold text-center py-4">Sin eventos especiales</p>}
            </div>
          </Card>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100] animate-in fade-in duration-300">
          <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto p-8 space-y-8 animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">Configurar Día</h2>
                <Badge variant="info" className="mt-1">{formData.fecha}</Badge>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                <XCircle size={24} className="text-gray-400" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <label className="flex items-center gap-2 p-4 rounded-xl border-2 border-gray-100 cursor-pointer hover:border-indigo-200 transition-colors">
                  <input
                    type="checkbox"
                    checked={formData.es_feriado}
                    onChange={e => setFormData({...formData, es_feriado: e.target.checked})}
                    className="w-5 h-5 rounded bg-gray-50 border-2 border-gray-200 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-xs font-black text-gray-700 uppercase">Feriado</span>
                </label>
                <label className="flex items-center gap-2 p-4 rounded-xl border-2 border-gray-100 cursor-pointer hover:border-indigo-200 transition-colors">
                  <input
                    type="checkbox"
                    checked={formData.tareas_habilitadas}
                    onChange={e => setFormData({...formData, tareas_habilitadas: e.target.checked})}
                    className="w-5 h-5 rounded bg-gray-50 border-2 border-gray-200 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-xs font-black text-gray-700 uppercase">Tareas</span>
                </label>
                <label className="flex items-center gap-2 p-4 rounded-xl border-2 border-gray-100 cursor-pointer hover:border-indigo-200 transition-colors">
                  <input
                    type="checkbox"
                    checked={formData.retiros_habilitados}
                    onChange={e => setFormData({...formData, retiros_habilitados: e.target.checked})}
                    className="w-5 h-5 rounded bg-gray-50 border-2 border-gray-200 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-xs font-black text-gray-700 uppercase">Retiros</span>
                </label>
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Motivo / Descripción</label>
                <input
                  type="text"
                  value={formData.motivo}
                  onChange={e => setFormData({...formData, motivo: e.target.value})}
                  placeholder="Ej: Feriado Nacional, Mantenimiento, etc."
                  className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-2 border-gray-100 text-gray-800 font-bold text-sm focus:border-indigo-200 transition-all outline-none"
                />
              </div>

              {levels.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Reglas por Nivel</h4>
                  <div className="space-y-2">
                    {levels.map(level => (
                      <div key={level.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100">
                        <span className="text-xs font-black text-gray-700">{level.nombre}</span>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => toggleLevelRule(level.codigo, 'tareas')}
                            className={cn(
                              "px-3 py-1 rounded-lg text-[9px] font-black uppercase transition-colors",
                              formData.reglas_niveles[level.codigo]?.tareas 
                                ? "bg-green-100 text-green-700" 
                                : "bg-gray-200 text-gray-500"
                            )}
                          >
                            Tareas
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleLevelRule(level.codigo, 'retiros')}
                            className={cn(
                              "px-3 py-1 rounded-lg text-[9px] font-black uppercase transition-colors",
                              formData.reglas_niveles[level.codigo]?.retiros 
                                ? "bg-green-100 text-green-700" 
                                : "bg-gray-200 text-gray-500"
                            )}
                          >
                            Retiros
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-4 pt-4">
                {formData.fecha && getDayData(new Date(formData.fecha)) && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => { setShowModal(false); handleDeleteRequest(formData.fecha); }}
                    className="flex-1"
                  >
                    Eliminar
                  </Button>
                )}
                <Button type="submit" className="flex-1">
                  Guardar Cambios
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
