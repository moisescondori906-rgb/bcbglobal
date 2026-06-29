
import { useState, useEffect } from 'react';
import { Plus, Trash2, Copy, CheckCircle2, Trophy, Users, Calendar } from 'lucide-react';
import { api } from '../../lib/api';
import { getLevels } from '../../lib/displayLevel';

export default function AdminCodigosCanje() {
  const [codes, setCodes] = useState([]);
  const [levels, setLevels] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingCode, setEditingCode] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    codigo: '',
    valor: '',
    max_usos: 1,
    min_level_id: '',
    expires_at: '',
    activo: true,
    un_solo_uso_por_usuario: false
  });
  const [copied, setCopied] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [codesData, levelsData] = await Promise.all([
        api.admin.codigosCanje(),
        api.levels.list()
      ]);
      setCodes(codesData || []);
      setLevels(levelsData || []);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCode) {
        await api.admin.actualizarCodigoCanje(editingCode.id, form);
        alert('Código actualizado exitosamente');
      } else {
        const result = await api.admin.crearCodigoCanje(form);
        alert(`Código creado exitosamente! Código: ${result.codigo}`);
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      alert('Error: ' + (err.message || 'Ocurrió un error'));
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Seguro que quieres eliminar este código?')) return;
    try {
      await api.admin.eliminarCodigoCanje(id);
      fetchData();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleCopy = (codigo) => {
    navigator.clipboard.writeText(codigo);
    setCopied(codigo);
    setTimeout(() => setCopied(null), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-12 h-12 border-4 border-bcb-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-black text-white uppercase tracking-tighter">
            Códigos de Canje
          </h1>
          <p className="text-sm text-gray-400">
            Gestiona los códigos de recompensa para usuarios
          </p>
        </div>
        <button 
          onClick={() => {
            setEditingCode(null);
            setForm({
              codigo: '',
              valor: '',
              max_usos: 1,
              min_level_id: '',
              expires_at: '',
              activo: true,
              un_solo_uso_por_usuario: false
            });
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-black uppercase tracking-widest rounded-2xl hover:shadow-2xl active:scale-95 transition-all"
        >
          <Plus size={20} />
          Nuevo Código
        </button>
      </div>

      <div className="bg-[#161926] rounded-[2.5rem] border border-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="px-8 py-6 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  Código
                </th>
                <th className="px-8 py-6 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  Valor
                </th>
                <th className="px-8 py-6 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  Usos
                </th>
                <th className="px-8 py-6 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  Nivel Mínimo
                </th>
                <th className="px-8 py-6 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  Estado
                </th>
                <th className="px-8 py-6 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {codes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center">
                    <p className="text-gray-400 text-sm font-bold uppercase tracking-widest">
                      No hay códigos creados aún
                    </p>
                  </td>
                </tr>
              ) : (
                codes.map(code => (
                  <tr key={code.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        <span className="font-black text-white tracking-tight text-lg">
                          {code.codigo}
                        </span>
                        <button 
                          onClick={() => handleCopy(code.codigo)}
                          className="p-2 rounded-xl hover:bg-white/10 transition-all"
                        >
                          {copied === code.codigo ? (
                            <CheckCircle2 size={16} className="text-emerald-400" />
                          ) : (
                            <Copy size={16} className="text-gray-400" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className="font-black text-amber-400">
                        {code.valor} Bs
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2">
                        <Users size={14} className="text-gray-400" />
                        <span className="font-bold text-white">
                          {code.usos_count || 0} / {code.max_usos === -1 ? '∞' : code.max_usos}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className="text-sm font-bold text-gray-300">
                        {code.min_level_nombre || 'Sin restricción'}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                        code.activo 
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                          : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          code.activo ? 'bg-emerald-400' : 'bg-rose-400'
                        }`} />
                        {code.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => {
                            setEditingCode(code);
                            setForm({
                              codigo: code.codigo,
                              valor: code.valor,
                              max_usos: code.max_usos,
                              min_level_id: code.min_level_id || '',
                              expires_at: code.expires_at ? code.expires_at.split('T')[0] : '',
                              activo: code.activo,
                              un_solo_uso_por_usuario: code.un_solo_uso_por_usuario
                            });
                            setShowModal(true);
                          }}
                          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 transition-all"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-edit-3">
                            <path d="M12 20h9" />
                            <path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(code.id)}
                          className="p-2 rounded-xl bg-white/5 hover:bg-rose-500/10 text-rose-400 transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de creación/edición */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-2xl flex items-center justify-center z-50 p-6">
          <div className="bg-[#161926] border border-white/10 rounded-[2.5rem] w-full max-w-2xl p-10 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-amber-500 to-orange-600" />
            
            <div className="flex items-center gap-4 mb-8">
              <div className="p-4 rounded-[1.8rem] bg-amber-500/10 text-amber-500 border border-amber-500/20">
                <Trophy size={32} />
              </div>
              <div>
                <h2 className="text-3xl font-black text-white uppercase tracking-tighter">
                  {editingCode ? 'Editar Código' : 'Nuevo Código'}
                </h2>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  Configura los detalles del código de canje
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                    Código (deja vacío para generar automáticamente)
                  </label>
                  <input
                    type="text"
                    value={form.codigo}
                    onChange={(e) => setForm({ ...form, codigo: e.target.value.toUpperCase() })}
                    placeholder="Ej: BCB-2024"
                    className="w-full bg-[#0f111a] border border-white/5 rounded-2xl px-6 py-4 text-sm font-black text-white placeholder-gray-600 focus:border-amber-500/50 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                    Valor en Bs
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.valor}
                    onChange={(e) => setForm({ ...form, valor: e.target.value })}
                    placeholder="Ej: 10.00"
                    className="w-full bg-[#0f111a] border border-white/5 rounded-2xl px-6 py-4 text-sm font-black text-white placeholder-gray-600 focus:border-amber-500/50 transition-all"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                    Máximo de Usos (-1 para ilimitado)
                  </label>
                  <input
                    type="number"
                    value={form.max_usos}
                    onChange={(e) => setForm({ ...form, max_usos: parseInt(e.target.value) || 1 })}
                    placeholder="Ej: 50"
                    className="w-full bg-[#0f111a] border border-white/5 rounded-2xl px-6 py-4 text-sm font-black text-white placeholder-gray-600 focus:border-amber-500/50 transition-all"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                    Nivel Mínimo Requerido
                  </label>
                  <select
                    value={form.min_level_id}
                    onChange={(e) => setForm({ ...form, min_level_id: e.target.value })}
                    className="w-full bg-[#0f111a] border border-white/5 rounded-2xl px-6 py-4 text-sm font-black text-white focus:border-amber-500/50 transition-all"
                  >
                    <option value="">Sin restricción</option>
                    {levels.map(level => (
                      <option key={level.id} value={level.id}>
                        {level.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                  <Calendar size={14} />
                  Fecha de Expiración (opcional)
                </label>
                <input
                  type="date"
                  value={form.expires_at}
                  onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
                  className="w-full bg-[#0f111a] border border-white/5 rounded-2xl px-6 py-4 text-sm font-black text-white focus:border-amber-500/50 transition-all"
                />
              </div>

              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, activo: !form.activo })}
                  className={`flex items-center gap-2 px-6 py-3 rounded-2xl border ${
                    form.activo 
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                      : 'bg-gray-500/10 border-gray-500/20 text-gray-400'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${
                    form.activo ? 'bg-emerald-400' : 'bg-gray-400'
                  }`} />
                  <span className="text-[10px] font-black uppercase tracking-widest">
                    {form.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </button>
                
                <button
                  type="button"
                  onClick={() => setForm({ ...form, un_solo_uso_por_usuario: !form.un_solo_uso_por_usuario })}
                  className={`flex items-center gap-2 px-6 py-3 rounded-2xl border ${
                    form.un_solo_uso_por_usuario 
                      ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' 
                      : 'bg-gray-500/10 border-gray-500/20 text-gray-400'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${
                    form.un_solo_uso_por_usuario ? 'bg-blue-400' : 'bg-gray-400'
                  }`} />
                  <span className="text-[10px] font-black uppercase tracking-widest">
                    {form.un_solo_uso_por_usuario ? 'Un solo uso por usuario' : 'Permitir múltiples usos por usuario'}
                  </span>
                </button>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-8 py-4 rounded-[2rem] bg-white/5 text-gray-400 font-black uppercase tracking-widest hover:bg-white/10 transition-all border border-white/5"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-8 py-4 rounded-[2rem] bg-gradient-to-r from-amber-500 to-orange-600 text-white font-black uppercase tracking-widest hover:shadow-2xl active:scale-95 transition-all"
                >
                  {editingCode ? 'Actualizar Código' : 'Crear Código'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
