import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { Users, Crown, Star, UserMinus, Search, Loader2, Trophy, ChevronDown, ChevronUp, Network, Layers } from 'lucide-react';

export default function AdminRanking() {
  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [updating, setUpdating] = useState(null);
  const [expandedUser, setExpandedUser] = useState(null);

  useEffect(() => {
    fetchRanking();
  }, []);

  const fetchRanking = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/ranking-invitados');
      setRanking(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error('Error fetching ranking:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChangeTipoLider = async (userId, val) => {
    if (!confirm(`¿Confirmas asignar el rol de ${val || 'Usuario Base'}?`)) return;
    setUpdating(userId);
    try {
      await api.put(`/admin/usuarios/${userId}`, { tipo_lider: val });
      setRanking(prev => prev.map(u => u.id === userId ? { ...u, tipo_lider: val } : u));
    } catch (err) {
      alert('Error actualizando rol: ' + err.message);
    } finally {
      setUpdating(null);
    }
  };

  const toggleExpand = (userId) => {
    setExpandedUser(expandedUser === userId ? null : userId);
  };

  const filteredRanking = ranking.filter(u => 
    (u.nombre_usuario || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.telefono || '').includes(search)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-10 h-10 text-sav-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-[#1a1f36] flex items-center gap-3">
            <Trophy className="text-amber-500" />
            Ranking de Invitados Reales (Red A/B/C)
          </h2>
          <p className="text-xs text-gray-500 font-medium uppercase tracking-widest mt-1">
            Solo cuenta invitados con inversión real (GLOBAL 1+) • Excluye internares
          </p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input 
          type="text"
          placeholder="Buscar por nombre o teléfono..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-gray-100 focus:border-[#1a1f36] outline-none transition-all shadow-sm font-bold text-gray-700"
        />
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
        {/* Desktop Table */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50/50 border-b border-gray-100">
              <tr>
                <th className="p-6 font-black text-gray-400 uppercase tracking-widest text-[10px]">Pos.</th>
                <th className="p-6 font-black text-gray-400 uppercase tracking-widest text-[10px]">Usuario</th>
                <th className="p-6 font-black text-gray-400 uppercase tracking-widest text-[10px]">Teléfono</th>
                <th className="p-6 font-black text-gray-400 uppercase tracking-widest text-[10px]">Cód. Inv</th>
                <th className="p-6 font-black text-gray-400 uppercase tracking-widest text-[10px] text-center">Red Total (ABC)</th>
                <th className="p-6 font-black text-gray-400 uppercase tracking-widest text-[10px]">Liderazgo</th>
                <th className="p-6 font-black text-gray-400 uppercase tracking-widest text-[10px] text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredRanking.map((u, idx) => {
                const isExpanded = expandedUser === u.id;
                return (
                  <>
                    <tr key={u.id} className={`hover:bg-gray-50/80 transition-colors group ${isExpanded ? 'bg-indigo-50/30' : ''}`}>
                      <td className="p-6">
                        <span className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs ${
                          idx === 0 ? 'bg-amber-400 text-white shadow-lg shadow-amber-200' :
                          idx === 1 ? 'bg-slate-300 text-white shadow-lg shadow-slate-200' :
                          idx === 2 ? 'bg-orange-400 text-white shadow-lg shadow-orange-200' :
                          'bg-gray-100 text-gray-400'
                        }`}>
                          {idx + 1}
                        </span>
                      </td>
                      <td className="p-6">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs bg-indigo-50 text-indigo-600`}>
                            {u.nombre_usuario?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-black text-gray-800 text-sm uppercase tracking-tighter">{u.nombre_usuario}</p>
                            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">{u.nivel || 'Sin Nivel'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-6 text-sm font-bold text-gray-600">{u.telefono}</td>
                      <td className="p-6 text-sm font-black text-indigo-600 tracking-widest">{u.codigo_invitacion}</td>
                      <td className="p-6 text-center">
                        <button 
                          onClick={() => toggleExpand(u.id)}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-50 text-indigo-600 font-black text-xs hover:bg-indigo-100 transition-all"
                        >
                          <Users size={14} />
                          {u.invitados_count}
                          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                      </td>
                      <td className="p-6">
                        {u.tipo_lider ? (
                          <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                            u.tipo_lider === 'lider_premium' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'
                          }`}>
                            {u.tipo_lider.replace('_', ' ')}
                          </span>
                        ) : (
                          <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest italic">Usuario Base</span>
                        )}
                      </td>
                      <td className="p-6">
                        <div className="flex justify-center gap-2">
                          {updating === u.id ? (
                            <Loader2 className="w-5 h-5 text-sav-primary animate-spin" />
                          ) : (
                            <>
                              <button 
                                onClick={() => handleChangeTipoLider(u.id, 'lider_premium')}
                                disabled={u.tipo_lider === 'lider_premium'}
                                className={`p-2 rounded-lg transition-all ${u.tipo_lider === 'lider_premium' ? 'bg-amber-500 text-white shadow-lg' : 'bg-amber-50 text-amber-600 hover:bg-amber-500 hover:text-white'}`}
                                title="Asignar Líder Premium"
                              >
                                <Crown size={16} />
                              </button>
                              <button 
                                onClick={() => handleChangeTipoLider(u.id, 'lider')}
                                disabled={u.tipo_lider === 'lider'}
                                className={`p-2 rounded-lg transition-all ${u.tipo_lider === 'lider' ? 'bg-blue-500 text-white shadow-lg' : 'bg-blue-50 text-blue-600 hover:bg-blue-500 hover:text-white'}`}
                                title="Asignar Líder"
                              >
                                <Star size={16} />
                              </button>
                              <button 
                                onClick={() => handleChangeTipoLider(u.id, '')}
                                disabled={!u.tipo_lider}
                                className={`p-2 rounded-lg transition-all ${!u.tipo_lider ? 'bg-gray-100 text-gray-300' : 'bg-rose-50 text-rose-600 hover:bg-rose-500 hover:text-white'}`}
                                title="Quitar Rol"
                              >
                                <UserMinus size={16} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="bg-indigo-50/20">
                        <td colSpan={7} className="p-8">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-fadeIn">
                            {/* Desglose por Red A/B/C */}
                            <div className="space-y-4">
                              <div className="flex items-center gap-2 text-[#1a1f36]">
                                <Network size={18} strokeWidth={3} />
                                <h4 className="text-xs font-black uppercase tracking-widest">Distribución por Profundidad</h4>
                              </div>
                              <div className="grid grid-cols-3 gap-3">
                                {['A', 'B', 'C'].map(level => (
                                  <div key={level} className="bg-white p-4 rounded-2xl border border-indigo-100 shadow-sm text-center">
                                    <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Nivel {level}</p>
                                    <p className="text-xl font-black text-[#1a1f36]">{u.network_stats?.[level] || 0}</p>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Desglose por Nivel VIP */}
                            <div className="space-y-4">
                              <div className="flex items-center gap-2 text-[#1a1f36]">
                                <Layers size={18} strokeWidth={3} />
                                <h4 className="text-xs font-black uppercase tracking-widest">Invitados por Nivel VIP (ABC)</h4>
                              </div>
                              <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm overflow-hidden">
                                <table className="w-full text-[10px] font-bold">
                                  <thead className="bg-gray-50 text-gray-400 uppercase">
                                    <tr>
                                      <th className="p-3">Nivel</th>
                                      <th className="p-3 text-center">En A</th>
                                      <th className="p-3 text-center">En B</th>
                                      <th className="p-3 text-center">En C</th>
                                      <th className="p-3 text-center bg-indigo-50 text-indigo-600">Total</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-50 text-gray-600">
                                    {Object.keys(u.level_stats || {}).sort().map(lvl => (
                                      <tr key={lvl}>
                                        <td className="p-3 font-black text-[#1a1f36]">{lvl}</td>
                                        <td className="p-3 text-center">{u.level_stats[lvl].A}</td>
                                        <td className="p-3 text-center">{u.level_stats[lvl].B}</td>
                                        <td className="p-3 text-center">{u.level_stats[lvl].C}</td>
                                        <td className="p-3 text-center font-black bg-indigo-50/50 text-indigo-600">{u.level_stats[lvl].total}</td>
                                      </tr>
                                    ))}
                                    {Object.keys(u.level_stats || {}).length === 0 && (
                                      <tr><td colSpan={5} className="p-4 text-center italic text-gray-400 uppercase text-[8px]">Sin datos de niveles</td></tr>
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="lg:hidden p-4 space-y-4">
          {filteredRanking.map((u, idx) => {
            const isExpanded = expandedUser === u.id;
            return (
              <div key={u.id} className={`p-5 rounded-3xl border border-gray-100 space-y-4 ${isExpanded ? 'bg-indigo-50/30' : 'bg-gray-50/50'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-[10px] ${
                      idx === 0 ? 'bg-amber-400 text-white' : 'bg-gray-200 text-gray-500'
                    }`}>
                      {idx + 1}
                    </span>
                    <div>
                      <p className="font-black text-gray-800 text-xs uppercase">{u.nombre_usuario}</p>
                      <p className="text-[8px] text-gray-400 font-bold uppercase">{u.telefono}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => toggleExpand(u.id)}
                    className="text-right px-3 py-1 bg-white rounded-lg shadow-sm border border-gray-100"
                  >
                    <p className="text-[8px] font-black text-gray-400 uppercase">Red ABC</p>
                    <p className="text-xs font-black text-indigo-600 flex items-center gap-1">
                      {u.invitados_count}
                      {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </p>
                  </button>
                </div>

                {isExpanded && (
                  <div className="pt-4 border-t border-indigo-100 space-y-4 animate-fadeIn">
                    <div className="grid grid-cols-3 gap-2">
                      {['A', 'B', 'C'].map(level => (
                        <div key={level} className="bg-white p-3 rounded-xl border border-indigo-50 text-center">
                          <p className="text-[7px] font-black text-gray-400 uppercase">Nivel {level}</p>
                          <p className="text-sm font-black text-[#1a1f36]">{u.network_stats?.[level] || 0}</p>
                        </div>
                      ))}
                    </div>
                    <div className="bg-white rounded-xl border border-indigo-50 overflow-hidden">
                      <div className="p-2 bg-gray-50 text-[7px] font-black text-gray-400 uppercase flex justify-between px-4">
                        <span>Nivel VIP</span>
                        <span>A / B / C</span>
                        <span>Total</span>
                      </div>
                      <div className="divide-y divide-gray-50">
                        {Object.keys(u.level_stats || {}).sort().map(lvl => (
                          <div key={lvl} className="p-2 flex justify-between items-center px-4 text-[9px]">
                            <span className="font-black text-[#1a1f36]">{lvl}</span>
                            <span className="text-gray-500 font-bold">
                              {u.level_stats[lvl].A} / {u.level_stats[lvl].B} / {u.level_stats[lvl].C}
                            </span>
                            <span className="font-black text-indigo-600">{u.level_stats[lvl].total}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-gray-200/50">
                  <div>
                    {u.tipo_lider ? (
                      <span className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase ${
                        u.tipo_lider === 'lider_premium' ? 'bg-amber-500 text-white' : 'bg-blue-500 text-white'
                      }`}>
                        {u.tipo_lider.replace('_', ' ')}
                      </span>
                    ) : (
                      <span className="text-[8px] font-black text-gray-400 uppercase italic">Sin Rol</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleChangeTipoLider(u.id, 'lider_premium')}
                      className={`p-2 rounded-xl ${u.tipo_lider === 'lider_premium' ? 'bg-amber-500 text-white' : 'bg-white border border-gray-200 text-amber-600 shadow-sm'}`}
                    >
                      <Crown size={14} />
                    </button>
                    <button 
                      onClick={() => handleChangeTipoLider(u.id, 'lider')}
                      className={`p-2 rounded-xl ${u.tipo_lider === 'lider' ? 'bg-blue-500 text-white' : 'bg-white border border-gray-200 text-blue-600 shadow-sm'}`}
                    >
                      <Star size={14} />
                    </button>
                    <button 
                      onClick={() => handleChangeTipoLider(u.id, '')}
                      className="p-2 rounded-xl bg-white border border-gray-200 text-rose-600 shadow-sm"
                    >
                      <UserMinus size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
