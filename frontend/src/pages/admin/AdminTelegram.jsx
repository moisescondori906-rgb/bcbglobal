import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { 
  Send, 
  Users, 
  Plus, 
  Trash2, 
  Edit2, 
  Save, 
  X, 
  Shield, 
  Lock, 
  Eye, 
  CheckCircle2, 
  Clock,
  Settings
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { cn } from '../../lib/utils/cn';

export default function AdminTelegram() {
  const [equipos, setEquipos] = useState([]);
  const [integrantes, setIntegrantes] = useState([]);
  const [horarios, setHorarios] = useState({ 
    hora_inicio: '08:00', 
    hora_fin: '22:00', 
    dias_operativos: [1,2,3,4,5,6,7],
    activo: true,
    visibilidad_numero: 'parcial'
  });
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modales y Edición
  const [showEquipoModal, setShowEquipoModal] = useState(false);
  const [showIntegranteModal, setShowIntegranteModal] = useState(false);
  const [editingEquipo, setEditingEquipo] = useState(null);
  const [editingIntegrante, setEditingIntegrante] = useState(null);
  
  const [equipoForm, setEquipoForm] = useState({ nombre: '', tipo: 'secretaria', chat_id: '', activo: true });
  const [integranteForm, setIntegranteForm] = useState({ telegram_user_id: '', nombre_visible: '', equipo_id: '', activo: true });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [e, i, h, log] = await Promise.all([
        api.admin.telegram.equipos(),
        api.admin.telegram.integrantes(),
        api.admin.telegram.horarios(),
        api.admin.telegram.historial()
      ]);
      setEquipos(e);
      setIntegrantes(i);
      setHistorial(log || []);
      if (h) setHorarios({ 
        ...h, 
        dias_operativos: typeof h.dias_operativos === 'string' ? JSON.parse(h.dias_operativos) : h.dias_operativos,
        activo: !!h.activo,
        visibilidad_numero: h.visibilidad_numero || 'parcial'
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEquipo = async (e) => {
    e.preventDefault();
    try {
      if (editingEquipo) {
        await api.admin.telegram.updateEquipo(editingEquipo.id, equipoForm);
      } else {
        await api.admin.telegram.crearEquipo(equipoForm);
      }
      setShowEquipoModal(false);
      setEditingEquipo(null);
      setEquipoForm({ nombre: '', tipo: 'secretaria', chat_id: '', activo: true });
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSaveIntegrante = async (e) => {
    e.preventDefault();
    try {
      if (editingIntegrante) {
        await api.admin.telegram.updateIntegrante(editingIntegrante.id, integranteForm);
      } else {
        await api.admin.telegram.crearIntegrante(integranteForm);
      }
      setShowIntegranteModal(false);
      setEditingIntegrante(null);
      setIntegranteForm({ telegram_user_id: '', nombre_visible: '', equipo_id: '', activo: true });
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSaveHorarios = async () => {
    try {
      await api.admin.telegram.updateHorarios(horarios);
      alert('Horarios actualizados');
    } catch (err) {
      alert(err.message);
    }
  };

  const toggleDia = (dia) => {
    const current = [...horarios.dias_operativos];
    const index = current.indexOf(dia);
    if (index > -1) current.splice(index, 1);
    else current.push(dia);
    setHorarios({ ...horarios, dias_operativos: current });
  };

  if (loading) return <div className="p-8 text-white uppercase font-black">Cargando Sistema de Control...</div>;

  return (
    <div className="p-4 md:p-8 space-y-8 animate-fade">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tighter flex items-center gap-3">
            <Send className="text-indigo-600" /> Control Operativo Telegram
          </h1>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mt-1">
            Gestión de equipos, integrantes y bloqueos estrictos
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* EQUIPOS */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6 border-none shadow-xl bg-white overflow-hidden">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <Shield className="text-indigo-600" size={20} />
                <h2 className="text-sm font-black uppercase tracking-widest text-gray-800">Equipos de Trabajo</h2>
              </div>
              <Button 
                onClick={() => { setEditingEquipo(null); setEquipoForm({ nombre: '', tipo: 'secretaria', chat_id: '', activo: true }); setShowEquipoModal(true); }}
                className="h-9 px-4 text-[10px]"
              >
                <Plus size={14} className="mr-2" /> Nuevo Equipo
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-50">
                    <th className="text-left py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Equipo</th>
                    <th className="text-left py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Tipo</th>
                    <th className="text-left py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Chat ID</th>
                    <th className="text-left py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Estado</th>
                    <th className="text-right py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {equipos.map(e => (
                    <tr key={e.id} className="group hover:bg-gray-50/50 transition-colors">
                      <td className="py-4">
                        <p className="text-xs font-black text-gray-800 uppercase">{e.nombre}</p>
                      </td>
                      <td className="py-4">
                        <Badge variant={e.tipo === 'administradores' ? 'error' : (e.tipo === 'retiros' ? 'info' : 'secondary')} className="text-[9px]">
                          {e.tipo.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="py-4">
                        <code className="text-[10px] font-mono text-gray-400">{e.chat_id}</code>
                      </td>
                      <td className="py-4">
                        <div className={cn("w-2 h-2 rounded-full", e.activo ? "bg-green-500" : "bg-gray-300")} />
                      </td>
                      <td className="py-4 text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => { setEditingEquipo(e); setEquipoForm(e); setShowEquipoModal(true); }} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg"><Edit2 size={14} /></button>
                          <button onClick={async () => { if(confirm('¿Eliminar?')) { await api.admin.telegram.eliminarEquipo(e.id); fetchData(); } }} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* INTEGRANTES */}
          <Card className="p-6 border-none shadow-xl bg-white overflow-hidden">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <Users className="text-indigo-600" size={20} />
                <h2 className="text-sm font-black uppercase tracking-widest text-gray-800">Integrantes (Operadores)</h2>
              </div>
              <Button 
                onClick={() => { setEditingIntegrante(null); setIntegranteForm({ telegram_user_id: '', nombre_visible: '', equipo_id: equipos[0]?.id || '', activo: true }); setShowIntegranteModal(true); }}
                className="h-9 px-4 text-[10px]"
              >
                <Plus size={14} className="mr-2" /> Nuevo Integrante
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-50">
                    <th className="text-left py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Nombre</th>
                    <th className="text-left py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Telegram ID</th>
                    <th className="text-left py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Equipo</th>
                    <th className="text-left py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Estado</th>
                    <th className="text-right py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {integrantes.map(i => (
                    <tr key={i.id} className="group hover:bg-gray-50/50 transition-colors">
                      <td className="py-4">
                        <p className="text-xs font-black text-gray-800 uppercase">{i.nombre_visible}</p>
                      </td>
                      <td className="py-4">
                        <code className="text-[10px] font-mono text-gray-400">{i.telegram_user_id}</code>
                      </td>
                      <td className="py-4">
                        <p className="text-[10px] font-bold text-indigo-600 uppercase">{i.equipo_nombre}</p>
                      </td>
                      <td className="py-4">
                        <div className={cn("w-2 h-2 rounded-full", i.activo ? "bg-green-500" : "bg-gray-300")} />
                      </td>
                      <td className="py-4 text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => { setEditingIntegrante(i); setIntegranteForm(i); setShowIntegranteModal(true); }} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg"><Edit2 size={14} /></button>
                          <button onClick={async () => { if(confirm('¿Eliminar?')) { await api.admin.telegram.eliminarIntegrante(i.id); fetchData(); } }} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* CONFIGURACIÓN Y HORARIOS */}
        <div className="space-y-6">
          <Card className="p-6 border-none shadow-xl bg-indigo-600 text-white">
            <div className="flex items-center gap-3 mb-4">
              <Lock size={20} />
              <h3 className="text-xs font-black uppercase tracking-widest">Control Estricto</h3>
            </div>
            <p className="text-[10px] font-medium leading-relaxed opacity-80 uppercase tracking-wide mb-6">
              El sistema garantiza que un caso solo pueda ser resuelto por el operador que lo tomó. No se permiten intervenciones externas.
            </p>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-white/10 border border-white/10">
                <CheckCircle2 size={16} className="text-green-400" />
                <span className="text-[9px] font-black uppercase">Bloqueo de Concurrencia Activo</span>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-white/10 border border-white/10">
                <Eye size={16} className="text-blue-300" />
                <span className="text-[9px] font-black uppercase">Trazabilidad en tiempo real</span>
              </div>
            </div>
          </Card>

          <Card className="p-6 border-none shadow-xl bg-white space-y-6">
            <div className="flex items-center gap-3">
              <Clock className="text-indigo-600" size={20} />
              <h3 className="text-xs font-black uppercase tracking-widest text-gray-800">Configuración Operativa</h3>
            </div>
            
            <div className="space-y-4">
              <label className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={horarios.activo} 
                  onChange={e => setHorarios({...horarios, activo: e.target.checked})}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500" 
                />
                <span className="text-[10px] font-black text-gray-700 uppercase">Sistema QR Habilitado</span>
              </label>

              <div className="space-y-2">
                <label className="text-[9px] font-black text-gray-400 uppercase ml-2">Visibilidad Número (Secretaría)</label>
                <select 
                  value={horarios.visibilidad_numero}
                  onChange={e => setHorarios({...horarios, visibilidad_numero: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border-2 border-gray-50 text-xs font-bold outline-none focus:border-indigo-100 transition-all"
                >
                  <option value="completo">NÚMERO COMPLETO</option>
                  <option value="parcial">PARCIALMENTE OCULTO (****)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-gray-400 uppercase ml-2">Inicio</label>
                  <input 
                    type="time" 
                    value={horarios.hora_inicio} 
                    onChange={e => setHorarios({...horarios, hora_inicio: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border-2 border-gray-50 text-xs font-bold outline-none focus:border-indigo-100 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-gray-400 uppercase ml-2">Cierre</label>
                  <input 
                    type="time" 
                    value={horarios.hora_fin} 
                    onChange={e => setHorarios({...horarios, hora_fin: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border-2 border-gray-50 text-xs font-bold outline-none focus:border-indigo-100 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black text-gray-400 uppercase ml-2">Días de Operación</label>
                <div className="flex flex-wrap gap-2">
                  {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => {
                    const val = i + 1;
                    const isActive = horarios.dias_operativos.includes(val);
                    return (
                      <button
                        key={i}
                        onClick={() => toggleDia(val)}
                        className={cn(
                          "w-8 h-8 rounded-lg text-[10px] font-black transition-all border",
                          isActive ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100" : "bg-gray-50 text-gray-400 border-gray-100"
                        )}
                      >
                        {d}
                      </button>
                    );
                  })}
                </div>
              </div>

              <Button onClick={handleSaveHorarios} className="w-full h-11 text-[10px] uppercase font-black tracking-widest">
                <Settings size={14} className="mr-2" /> Guardar Configuración
              </Button>
            </div>
          </Card>

          <Card className="p-6 border-none shadow-xl bg-white overflow-hidden">
            <div className="flex items-center gap-3 mb-6">
              <Clock className="text-indigo-600" size={20} />
              <h3 className="text-xs font-black uppercase tracking-widest text-gray-800">Historial Operativo</h3>
            </div>
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {historial.map(log => (
                <div key={log.id} className="p-3 rounded-xl bg-gray-50 border border-gray-100 space-y-1">
                  <div className="flex justify-between items-center">
                    <Badge variant={log.accion === 'aceptar' ? 'success' : (log.accion === 'rechazar' ? 'error' : 'info')} className="text-[8px]">
                      {log.accion.toUpperCase()}
                    </Badge>
                    <span className="text-[8px] font-bold text-gray-400">{new Date(log.fecha).toLocaleString()}</span>
                  </div>
                  <p className="text-[10px] font-black text-gray-700 uppercase">
                    {log.operador_nombre}
                  </p>
                  <p className="text-[9px] text-gray-400 font-mono truncate">Ref: {log.referencia_id}</p>
                </div>
              ))}
              {historial.length === 0 && <p className="text-[10px] text-center text-gray-400 py-4 font-bold uppercase">Sin actividad reciente</p>}
            </div>
          </Card>
        </div>
      </div>

      {/* MODAL EQUIPO */}
      {showEquipoModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100] animate-in fade-in">
          <Card className="max-w-md w-full p-8 space-y-6 animate-in zoom-in-95">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">{editingEquipo ? 'Editar Equipo' : 'Nuevo Equipo'}</h2>
              <button onClick={() => setShowEquipoModal(false)}><X className="text-gray-400" /></button>
            </div>
            <form onSubmit={handleSaveEquipo} className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Nombre del Equipo</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ej: Operativo Retiros A"
                  value={equipoForm.nombre}
                  onChange={e => setEquipoForm({...equipoForm, nombre: e.target.value})}
                  className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-2 border-gray-50 font-bold text-sm outline-none focus:border-indigo-100 transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Tipo de Equipo</label>
                <select 
                  value={equipoForm.tipo}
                  onChange={e => setEquipoForm({...equipoForm, tipo: e.target.value})}
                  className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-2 border-gray-50 font-bold text-sm outline-none focus:border-indigo-100 transition-all"
                >
                  <option value="secretaria">SECRETARÍA (Solo Lectura)</option>
                  <option value="retiros">RETIROS (Operativo Retiros)</option>
                  <option value="administradores">ADMINISTRADORES (Operativo Total)</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Telegram Chat ID</label>
                <input 
                  type="text" 
                  required
                  placeholder="-100XXXXXXXX"
                  value={equipoForm.chat_id}
                  onChange={e => setEquipoForm({...equipoForm, chat_id: e.target.value})}
                  className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-2 border-gray-50 font-bold text-sm outline-none focus:border-indigo-100 transition-all"
                />
              </div>
              <label className="flex items-center gap-3 p-4 rounded-2xl border-2 border-gray-50 cursor-pointer">
                <input type="checkbox" checked={equipoForm.activo} onChange={e => setEquipoForm({...equipoForm, activo: e.target.checked})} className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                <span className="text-[10px] font-black text-gray-700 uppercase">Equipo Activo</span>
              </label>
              <Button type="submit" className="w-full py-5 text-xs font-black uppercase tracking-[0.2em]">{editingEquipo ? 'Actualizar' : 'Crear Equipo'}</Button>
            </form>
          </Card>
        </div>
      )}

      {/* MODAL INTEGRANTE */}
      {showIntegranteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100] animate-in fade-in">
          <Card className="max-w-md w-full p-8 space-y-6 animate-in zoom-in-95">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">{editingIntegrante ? 'Editar Integrante' : 'Nuevo Integrante'}</h2>
              <button onClick={() => setShowIntegranteModal(false)}><X className="text-gray-400" /></button>
            </div>
            <form onSubmit={handleSaveIntegrante} className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Nombre Visible (Para reportes)</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ej: Operador 01"
                  value={integranteForm.nombre_visible}
                  onChange={e => setIntegranteForm({...integranteForm, nombre_visible: e.target.value})}
                  className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-2 border-gray-50 font-bold text-sm outline-none focus:border-indigo-100 transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Telegram User ID (Numérico)</label>
                <input 
                  type="text" 
                  required
                  placeholder="12345678"
                  value={integranteForm.telegram_user_id}
                  onChange={e => setIntegranteForm({...integranteForm, telegram_user_id: e.target.value})}
                  className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-2 border-gray-50 font-bold text-sm outline-none focus:border-indigo-100 transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Asignar a Equipo</label>
                <select 
                  required
                  value={integranteForm.equipo_id}
                  onChange={e => setIntegranteForm({...integranteForm, equipo_id: e.target.value})}
                  className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-2 border-gray-50 font-bold text-sm outline-none focus:border-indigo-100 transition-all"
                >
                  <option value="">Seleccionar Equipo...</option>
                  {equipos.map(e => (
                    <option key={e.id} value={e.id}>{e.nombre} ({e.tipo.toUpperCase()})</option>
                  ))}
                </select>
              </div>
              <label className="flex items-center gap-3 p-4 rounded-2xl border-2 border-gray-50 cursor-pointer">
                <input type="checkbox" checked={integranteForm.activo} onChange={e => setIntegranteForm({...integranteForm, activo: e.target.checked})} className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                <span className="text-[10px] font-black text-gray-700 uppercase">Integrante Activo</span>
              </label>
              <Button type="submit" className="w-full py-5 text-xs font-black uppercase tracking-[0.2em]">{editingIntegrante ? 'Actualizar' : 'Crear Integrante'}</Button>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
