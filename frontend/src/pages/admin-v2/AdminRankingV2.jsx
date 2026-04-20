import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, 
  Search, 
  Crown, 
  Star, 
  UserMinus, 
  ChevronDown, 
  ChevronUp, 
  Network, 
  Layers, 
  RefreshCw,
  Users,
  TrendingUp,
  Zap,
  Target,
  ShieldCheck,
  Medal,
  Award,
  ArrowRight
} from 'lucide-react';
import { api } from '../../lib/api';
import { formatCurrency } from '../../utils/format';

const LeaderBadge = ({ type }) => {
  if (!type) return <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest italic">Usuario Base</span>;
  
  const isPremium = type === 'lider_premium';
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${isPremium ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'bg-blue-500/10 text-blue-500 border-blue-500/20 shadow-lg shadow-blue-500/5'}`}>
      {isPremium ? <Crown size={12} className="animate-pulse" /> : <Star size={12} />}
      <span className="text-[9px] font-black uppercase tracking-widest">
        {type.replace('_', ' ')}
      </span>
    </div>
  );
};

export default function AdminRankingV2() {
  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
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

  const filteredRanking = ranking.filter(u => 
    (u.nombre_usuario || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.telefono || '').includes(searchTerm)
  );

  return (
    <div className="space-y-10">
      {/* Header Section */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-8">
        <div className="space-y-2">
          <div className="flex items-center gap-4">
            <div className="p-3.5 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 text-white shadow-xl shadow-amber-500/20">
              <Trophy size={24} />
            </div>
            <div>
              <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic">Network Ranking</h1>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] flex items-center gap-2">
                <Target size={14} className="text-amber-500" /> Líderes de expansión BCB Global (Red A/B/C)
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="relative group flex-1 min-w-[300px]">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-amber-500 transition-colors" />
            <input 
              type="text" 
              placeholder="Buscar por usuario o teléfono..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#161926] border border-white/5 rounded-2xl py-4 pl-12 pr-6 text-xs font-bold text-white outline-none focus:border-amber-500/30 transition-all shadow-2xl"
            />
          </div>
          <button 
            onClick={fetchRanking}
            className="p-4 rounded-2xl bg-white/5 border border-white/5 text-slate-400 hover:text-white transition-all shadow-2xl"
          >
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Main Content: Table */}
      <div className="bg-[#161926] border border-white/5 rounded-[40px] overflow-hidden shadow-2xl shadow-black/40 relative">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#1a1e2e]/50 border-b border-white/5">
                <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Posición</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Identidad</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] text-center">Inversión Red (ABC)</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] text-center">Liderazgo Institucional</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] text-right">Gestión de Rango</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array(5).fill(0).map((_, i) => (
                  <tr key={i} className="animate-pulse border-b border-white/5">
                    <td colSpan="5" className="px-8 py-10">
                      <div className="h-10 bg-white/5 rounded-2xl w-full" />
                    </td>
                  </tr>
                ))
              ) : filteredRanking.map((u, idx) => {
                const isExpanded = expandedUser === u.id;
                return (
                  <AnimatePresence key={u.id} mode="popLayout">
                    <motion.tr 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className={`border-b border-white/5 hover:bg-white/[0.02] transition-colors duration-300 group ${isExpanded ? 'bg-amber-500/[0.03]' : ''}`}
                    >
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-4">
                          <span className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs border ${
                            idx === 0 ? 'bg-amber-500 text-white border-amber-400 shadow-lg shadow-amber-500/20' :
                            idx === 1 ? 'bg-slate-400 text-white border-slate-300 shadow-lg shadow-slate-500/20' :
                            idx === 2 ? 'bg-orange-500 text-white border-orange-400 shadow-lg shadow-orange-500/20' :
                            'bg-slate-800 text-slate-500 border-white/5'
                          }`}>
                            {idx + 1}
                          </span>
                          {idx < 3 && <Medal size={18} className={idx === 0 ? 'text-amber-500' : idx === 1 ? 'text-slate-400' : 'text-orange-500'} />}
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-[#0f111a] flex items-center justify-center font-black text-amber-500 border border-white/5 shadow-inner">
                            {u.nombre_usuario?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-black text-white uppercase tracking-tighter italic">{u.nombre_usuario}</p>
                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{u.telefono}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5 text-center">
                        <button 
                          onClick={() => setExpandedUser(isExpanded ? null : u.id)}
                          className="inline-flex flex-col items-center gap-1 group/btn"
                        >
                          <div className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 font-black text-sm group-hover/btn:bg-amber-500 group-hover/btn:text-white transition-all shadow-lg shadow-amber-500/5">
                            <Users size={16} />
                            {u.invitados_count}
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </div>
                          <p className="text-[8px] font-bold text-slate-600 uppercase tracking-widest">Ver Estructura de Red</p>
                        </button>
                      </td>
                      <td className="px-8 py-5 text-center">
                        <div className="flex justify-center">
                          <LeaderBadge type={u.tipo_lider} />
                        </div>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {updating === u.id ? (
                            <RefreshCw className="w-6 h-6 text-amber-500 animate-spin" />
                          ) : (
                            <>
                              <button 
                                onClick={() => handleChangeTipoLider(u.id, 'lider_premium')}
                                className={`p-3 rounded-2xl transition-all border ${u.tipo_lider === 'lider_premium' ? 'bg-amber-500 text-white border-amber-400 shadow-xl shadow-amber-500/20' : 'bg-white/5 text-slate-500 border-white/5 hover:bg-amber-500/20 hover:text-amber-500 hover:border-amber-500/20'}`}
                                title="Asignar Líder Premium"
                              >
                                <Crown size={18} />
                              </button>
                              <button 
                                onClick={() => handleChangeTipoLider(u.id, 'lider')}
                                className={`p-3 rounded-2xl transition-all border ${u.tipo_lider === 'lider' ? 'bg-blue-600 text-white border-blue-500 shadow-xl shadow-blue-500/20' : 'bg-white/5 text-slate-500 border-white/5 hover:bg-blue-500/20 hover:text-blue-500 hover:border-blue-500/20'}`}
                                title="Asignar Líder Base"
                              >
                                <Star size={18} />
                              </button>
                              <button 
                                onClick={() => handleChangeTipoLider(u.id, '')}
                                disabled={!u.tipo_lider}
                                className={`p-3 rounded-2xl transition-all border ${!u.tipo_lider ? 'opacity-20 grayscale' : 'bg-white/5 text-slate-600 border-white/5 hover:bg-rose-500/20 hover:text-rose-500 hover:border-rose-500/20'}`}
                                title="Degradar a Usuario Base"
                              >
                                <UserMinus size={18} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </motion.tr>

                    {isExpanded && (
                      <motion.tr
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="bg-amber-500/[0.02]"
                      >
                        <td colSpan="5" className="px-12 py-10 border-b border-white/5">
                          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="space-y-4">
                              <div className="flex items-center gap-3 text-white">
                                <Network size={18} className="text-amber-500" />
                                <h4 className="text-xs font-black uppercase tracking-[0.2em] italic">Network Distribution</h4>
                              </div>
                              <div className="grid grid-cols-3 gap-4">
                                {['A', 'B', 'C'].map(level => (
                                  <div key={level} className="bg-[#0f111a] p-5 rounded-[25px] border border-white/5 shadow-inner text-center group hover:border-amber-500/20 transition-all">
                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Level {level}</p>
                                    <p className="text-2xl font-black text-white tracking-tighter">{u.network_stats?.[level] || 0}</p>
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div className="lg:col-span-2 bg-[#0f111a] rounded-[30px] p-6 border border-white/5 flex items-center justify-between relative overflow-hidden group">
                              <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                                <TrendingUp size={100} />
                              </div>
                              <div className="space-y-4 relative z-10">
                                <div className="flex items-center gap-3">
                                  <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500">
                                    <Zap size={18} />
                                  </div>
                                  <h4 className="text-xs font-black text-white uppercase tracking-widest italic">Performance Analytics</h4>
                                </div>
                                <p className="text-[10px] font-bold text-slate-500 uppercase leading-relaxed max-w-md">
                                  Este usuario ha generado una red de <span className="text-amber-500">{u.invitados_count}</span> activos. 
                                  Su volumen de comisiones proyectado lo posiciona en el top <span className="text-emerald-500">#{idx + 1}</span> global.
                                </p>
                                <button className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-white hover:bg-white/10 transition-all">
                                  Audit Network Logs <ArrowRight size={14} />
                                </button>
                              </div>
                              
                              <div className="hidden sm:flex flex-col items-end gap-2 relative z-10">
                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Conversion Rate</p>
                                <div className="text-3xl font-black text-white tracking-tighter">78.4%</div>
                                <div className="w-32 h-2 bg-white/5 rounded-full overflow-hidden border border-white/5 shadow-inner">
                                  <div className="h-full w-[78.4%] bg-gradient-to-r from-amber-500 to-emerald-500 rounded-full" />
                                </div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </motion.tr>
                    )}
                  </AnimatePresence>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Info Banner */}
        <div className="p-8 bg-amber-500/5 border-t border-white/5 flex items-center gap-6">
          <div className="p-4 rounded-3xl bg-amber-500/10 text-amber-500 shadow-inner border border-amber-500/20">
            <Award size={32} />
          </div>
          <div className="space-y-1">
            <h5 className="text-xs font-black text-white uppercase tracking-widest italic">Criterio de Clasificación Institucional</h5>
            <p className="text-[10px] font-bold text-slate-500 uppercase leading-relaxed max-w-3xl">
              El ranking se basa exclusivamente en invitados con <span className="text-amber-500">Inversión Real (GLOBAL 1 o superior)</span> dentro de la red ABC. 
              Los líderes premium obtienen beneficios adicionales en la liquidación de bonos globales.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
