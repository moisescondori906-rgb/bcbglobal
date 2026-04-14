import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { 
  Calendar as CalendarIcon, 
  Plus, 
  Trash2, 
  AlertCircle, 
  CheckCircle2, 
  Clock,
  ShieldCheck,
  XCircle,
  Info,
  ChevronLeft,
  ChevronRight,
  Settings2
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { cn } from '../../lib/utils/cn';

export default function AdminCalendario() {
  const [days, setDays] = useState([]);
  const [levels, setLevels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);
  const [showModal, setShowModal] = useState(false);
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
      console.error('Error fetching calendar:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      await api.post('/admin/calendario', formData);
      setShowModal(false);
      fetchData();
    } catch (err) {
      alert('Error guardando día: ' + err.message);
    }
  };

  const handleDelete = async (fecha) => {
    if (!confirm('¿Restablecer este día a la configuración por defecto?')) return;
    try {
      await api.delete(`/admin/calendario/${fecha}`);
      fetchData();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const daysInMonth = [];
    // Padding inicial
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

  return (
    <div className="space-y-8 animate-fade">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">Calendario Operativo</h1>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mt-1">Control centralizado de tareas, retiros y feriados</p>
        </div>
        
        <div className="flex items-center gap-4 bg-white p-2 rounded-2xl shadow-sm border border-gray-100">
          <button onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() - 1)))} className="p-2 hover:bg-gray-50 rounded-xl transition-colors">
            <ChevronLeft size={20} className="text-gray-400" />
          </button>
          <span className="text-sm font-black uppercase tracking-widest min-w-[150px] text-center">
            {currentMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
          </span>
          <button onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() + 1)))} className="p-2 hover:bg-gray-50 rounded-xl transition-colors">
            <ChevronRight size={20} className="text-gray-400" />
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Calendario Grid */}
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
                const isToday = formatDate(date) === formatDate(new Date());
                const isSunday = date.getDay() === 0;

                return (
                  <div 
                    key={i} 
                    onClick={() => openEdit(date)}
                    className={cn(
                      "min-h-[120px] p-3 transition-all cursor-pointer hover:bg-indigo-50/30 group relative",
                      isToday && "bg-indigo-50/50",
                      data?.tipo_dia === 'feriado' && "bg-red-50/30",
                      data?.tipo_dia === 'mantenimiento' && "bg-amber-50/30",
                      !data && isSunday && "bg-gray-50/50"
                    )}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className={cn(
                        "w-7 h-7 flex items-center justify-center rounded-lg text-xs font-black",
                        isToday ? "bg-indigo-600 text-white" : "text-gray-400"
                      )}>
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

        {/* Sidebar Info */}
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

      {/* Modal Edición */}
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

            <form onSubmit={handleSave} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Tipo de Día</label>
                  <select 
                    value={formData.tipo_dia}
                    onChange={e => setFormData({...formData, tipo_dia: e.target.value})}
                    className="w-full h-14 px-4 rounded-2xl bg-gray-50 border border-gray-100 font-black text-xs uppercase"
                  >
                    <option value="laboral">Laboral</option>
                    <option value="feriado">Feriado Nacional</option>
                    <option value="mantenimiento">Mantenimiento</option>
                    <option value="especial">Evento Especial</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Motivo / Descripción</label>
                  <input 
                    type="text"
                    value={formData.motivo}
                    onChange={e => setFormData({...formData, motivo: e.target.value})}
                    placeholder="Ej: Año Nuevo, Mantenimiento..."
                    className="w-full h-14 px-4 rounded-2xl bg-gray-50 border border-gray-100 font-bold text-xs"
                  />
                </div>
              </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { key: 'es_feriado', label: 'Es Feriado', icon: AlertCircle },
                      { key: 'tareas_habilitadas', label: 'Tareas ON', icon: Play },
                      { key: 'retiros_habilitados', label: 'Retiros ON', icon: Wallet },
                      { key: 'recargas_habilitadas', label: 'Recargas ON', icon: ShieldCheck }
                    ].map(item => (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => setFormData({...formData, [item.key]: !formData[item.key]})}
                        className={cn(
                          "flex flex-col items-center gap-3 p-4 rounded-2xl border transition-all",
                          formData[item.key] 
                            ? "bg-indigo-50 border-indigo-200 text-indigo-600 shadow-sm" 
                            : "bg-gray-50 border-gray-100 text-gray-400 grayscale"
                        )}
                      >
                        <item.icon size={20} />
                        <span className="text-[9px] font-black uppercase tracking-widest">{item.label}</span>
                      </button>
                    ))}
                  </div>

              {/* Reglas por Nivel */}
              <div className="space-y-4">
                <div className="flex items-center gap-3 border-b border-gray-100 pb-2">
                  <Settings2 size={16} className="text-gray-400" />
                  <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest">Restricciones por Nivel</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {levels.map(lvl => (
                    <div key={lvl.id} className="p-4 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-between">
                      <span className="text-[10px] font-black text-gray-700 uppercase">{lvl.nombre}</span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => toggleLevelRule(lvl.codigo, 'retiro')}
                          className={cn(
                            "px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all",
                            formData.reglas_niveles[lvl.codigo]?.retiro === false
                              ? "bg-red-500 text-white shadow-lg shadow-red-100"
                              : "bg-green-100 text-green-600"
                          )}
                        >
                          {formData.reglas_niveles[lvl.codigo]?.retiro === false ? 'No Retira' : 'Retiro OK'}
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleLevelRule(lvl.codigo, 'tareas')}
                          className={cn(
                            "px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all",
                            formData.reglas_niveles[lvl.codigo]?.tareas === false
                              ? "bg-red-500 text-white shadow-lg shadow-red-100"
                              : "bg-green-100 text-green-600"
                          )}
                        >
                          {formData.reglas_niveles[lvl.codigo]?.tareas === false ? 'No Tareas' : 'Tareas OK'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => handleDelete(formData.fecha)}
                  className="flex-1 h-14 rounded-2xl border-red-100 text-red-500 hover:bg-red-50"
                >
                  <Trash2 size={18} className="mr-2" /> RESTABLECER
                </Button>
                <Button 
                  type="submit" 
                  className="flex-[2] h-14 rounded-2xl shadow-indigo-100"
                >
                  <ShieldCheck size={18} className="mr-2" /> GUARDAR CONFIGURACIÓN
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
