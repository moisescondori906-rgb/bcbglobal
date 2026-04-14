import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { Save, X, Edit2, Shield, Info, TrendingUp, Users, Award, Clock } from 'lucide-react';
import { displayLevelCode } from '../../lib/displayLevel.js';

export default function AdminNiveles() {
  const [niveles, setNiveles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    fetchNiveles();
  }, []);

  const fetchNiveles = async () => {
    try {
      const data = await api.admin.niveles();
      const list = Array.isArray(data) ? data : [];
      setNiveles(list.sort((a, b) => (a.orden || 0) - (b.orden || 0)));
    } catch (err) {
      console.error(err);
      setNiveles([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    try {
      // Sincronizamos campos numéricos y booleanos para el backend
      const payload = {
        ...editing,
        deposito: Number(editing.deposito || editing.costo || 0),
        ganancia_tarea: Number(editing.ganancia_tarea || 0),
        num_tareas_diarias: Number(editing.num_tareas_diarias || editing.tareas_diarias || 0),
        activo: editing.activo !== false ? 1 : 0,
        retiro_horario_habilitado: editing.retiro_horario_habilitado ? 1 : 0,
        retiro_dia_inicio: Number(editing.retiro_dia_inicio ?? 1),
        retiro_dia_fin: Number(editing.retiro_dia_fin ?? 5)
      };

      await api.admin.updateNivel(editing.id, payload);
      setNiveles(prev => prev.map(n => n.id === editing.id ? editing : n));
      setEditing(null);
      alert('Nivel actualizado correctamente');
    } catch (err) {
      alert('Error al actualizar: ' + err.message);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500 font-black uppercase tracking-widest text-[10px]">Cargando niveles...</div>;

  return (
    <div className="p-4 md:p-8 space-y-6 pb-24">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">Gestión de Niveles VIP</h1>
        <p className="text-gray-500 font-medium uppercase tracking-widest text-[10px] mt-1">Configura precios, tareas y ganancias diarias</p>
      </div>

      <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex items-start gap-3 mb-6">
        <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
          <Info size={18} />
        </div>
        <p className="text-[10px] text-amber-700 font-bold uppercase leading-relaxed tracking-wide">
          Cuidado: Cambiar los precios o tareas diarias afectará inmediatamente a todos los usuarios de ese nivel.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {niveles.map((nivel) => (
          <div key={nivel.id} className="bg-white rounded-[2rem] p-5 shadow-sm border border-gray-100 transition-all hover:shadow-md">
            {editing?.id === nivel.id ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-gray-400 uppercase ml-2">Nombre del Nivel</label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-100 text-sm font-black text-gray-800"
                      value={editing.nombre}
                      onChange={e => setEditing({...editing, nombre: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-gray-400 uppercase ml-2">Costo / Depósito (BOB)</label>
                    <input
                      type="number"
                      className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-100 text-sm font-black text-sav-primary"
                      value={editing.deposito || editing.costo || 0}
                      onChange={e => setEditing({...editing, deposito: parseFloat(e.target.value), costo: parseFloat(e.target.value)})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-gray-400 uppercase ml-2">Tareas Diarias</label>
                    <input
                      type="number"
                      className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-100 text-sm font-black text-gray-800"
                      value={editing.num_tareas_diarias || editing.tareas_diarias || 0}
                      onChange={e => setEditing({...editing, num_tareas_diarias: parseInt(e.target.value), tareas_diarias: parseInt(e.target.value)})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-gray-400 uppercase ml-2">Ganancia por Tarea (BOB)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-100 text-sm font-black text-green-600"
                      value={editing.ganancia_tarea}
                      onChange={e => setEditing({...editing, ganancia_tarea: parseFloat(e.target.value)})}
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-2 border-t border-gray-100 pt-4 mt-2">
                    <h4 className="text-[10px] font-black text-gray-800 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <Clock size={14} className="text-sav-primary" /> Configuración de Horario de Retiro
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1 sm:col-span-2">
                        <label className="flex items-center gap-2 cursor-pointer p-2 rounded-xl hover:bg-gray-100 transition-colors">
                          <input
                            type="checkbox"
                            className="w-5 h-5 rounded-lg border-gray-300 text-sav-primary focus:ring-sav-primary"
                            checked={editing.retiro_horario_habilitado === true}
                            onChange={e => setEditing({...editing, retiro_horario_habilitado: e.target.checked})}
                          />
                          <span className="text-xs font-black text-gray-700 uppercase tracking-widest">Habilitar horario específico para este nivel</span>
                        </label>
                      </div>
                      
                      {editing.retiro_horario_habilitado && (
                        <>
                          <div className="space-y-1">
                            <label className="text-[9px] font-black text-gray-400 uppercase ml-2">Día de Inicio (0=Dom, 1=Lun...)</label>
                            <select
                              className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-100 text-sm font-black text-gray-800"
                              value={editing.retiro_dia_inicio ?? 1}
                              onChange={e => setEditing({...editing, retiro_dia_inicio: parseInt(e.target.value)})}
                            >
                              <option value={0}>Domingo</option>
                              <option value={1}>Lunes</option>
                              <option value={2}>Martes</option>
                              <option value={3}>Miércoles</option>
                              <option value={4}>Jueves</option>
                              <option value={5}>Viernes</option>
                              <option value={6}>Sábado</option>
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-black text-gray-400 uppercase ml-2">Día de Fin (0=Dom, 1=Lun...)</label>
                            <select
                              className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-100 text-sm font-black text-gray-800"
                              value={editing.retiro_dia_fin ?? 5}
                              onChange={e => setEditing({...editing, retiro_dia_fin: parseInt(e.target.value)})}
                            >
                              <option value={0}>Domingo</option>
                              <option value={1}>Lunes</option>
                              <option value={2}>Martes</option>
                              <option value={3}>Miércoles</option>
                              <option value={4}>Jueves</option>
                              <option value={5}>Viernes</option>
                              <option value={6}>Sábado</option>
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-black text-gray-400 uppercase ml-2">Hora de Inicio</label>
                            <input
                              type="time"
                              className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-100 text-sm font-black text-gray-800"
                              value={editing.retiro_hora_inicio || '09:00'}
                              onChange={e => setEditing({...editing, retiro_hora_inicio: e.target.value})}
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-black text-gray-400 uppercase ml-2">Hora de Fin</label>
                            <input
                              type="time"
                              className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-100 text-sm font-black text-gray-800"
                              value={editing.retiro_hora_fin || '18:00'}
                              onChange={e => setEditing({...editing, retiro_hora_fin: e.target.value})}
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <label className="flex items-center gap-2 cursor-pointer p-2 rounded-xl hover:bg-gray-100 transition-colors">
                      <input
                        type="checkbox"
                        className="w-5 h-5 rounded-lg border-gray-300 text-sav-primary focus:ring-sav-primary"
                        checked={editing.activo !== false}
                        onChange={e => setEditing({...editing, activo: e.target.checked})}
                      />
                      <span className="text-xs font-black text-gray-700 uppercase tracking-widest">Nivel Activo (Visible para usuarios)</span>
                    </label>
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <button onClick={handleUpdate} className="flex-1 bg-[#1a1f36] text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg active:scale-95"><Save size={16}/> Guardar Cambios</button>
                  <button onClick={() => setEditing(null)} className="flex-1 bg-gray-100 text-gray-500 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95"><X size={16}/> Cancelar</button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4 w-full">
                  <div className="w-14 h-14 rounded-2xl bg-sav-primary/5 flex items-center justify-center text-sav-primary shrink-0 border border-sav-primary/10">
                    <Shield size={24} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-black text-gray-800 text-base uppercase tracking-tighter">{displayLevelCode(nivel.nombre)}</h3>
                      <span className="text-[8px] font-black bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full uppercase tracking-widest">Orden: {nivel.orden}</span>
                      <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${nivel.activo !== false ? 'bg-green-100 text-green-600' : 'bg-rose-100 text-rose-600'}`}>
                        {nivel.activo !== false ? 'Activo' : 'Bloqueado'}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                      <p className="text-[10px] font-bold text-sav-primary uppercase tracking-wide">Costo: {(nivel.deposito || nivel.costo || 0).toFixed(2)} BOB</p>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">{nivel.num_tareas_diarias || nivel.tareas_diarias} Tareas / día</p>
                      <p className="text-[10px] font-bold text-green-600 uppercase tracking-wide">Ganancia: {(nivel.ganancia_tarea || 0).toFixed(2)} / tarea</p>
                      {nivel.retiro_horario_habilitado && (
                        <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wide flex items-center gap-1">
                          <Clock size={12} />
                          Retiros: {['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'][nivel.retiro_dia_inicio]}-{['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'][nivel.retiro_dia_fin]} ({nivel.retiro_hora_inicio?.substring(0, 5)} - {nivel.retiro_hora_fin?.substring(0, 5)})
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => setEditing(nivel)} 
                  className="w-full sm:w-auto p-4 bg-gray-50 text-gray-400 hover:text-sav-primary hover:bg-sav-primary/5 rounded-2xl transition-all flex items-center justify-center gap-2"
                >
                  <Edit2 size={18} />
                  <span className="sm:hidden text-[10px] font-black uppercase tracking-widest">Editar Nivel</span>
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}