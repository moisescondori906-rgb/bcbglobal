import { useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/api.js';
import { User, Shield, ArrowUpCircle, Search, Key, Lock, X, DollarSign, Wallet, Ban, CheckCircle } from 'lucide-react';
import { displayLevelCode } from '../../lib/displayLevel.js';

export default function AdminUsuarios() {
  const [users, setUsers] = useState([]);
  const [niveles, setNiveles] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [passwords, setPasswords] = useState({ login: '', fondo: '' });
  
  // Estados para ajuste de saldo
  const [adjustingUser, setAdjustingUser] = useState(null);
  const [adjustData, setAdjustData] = useState({
    monto: '',
    tipo_billetera: 'principal',
    descripcion: ''
  });
  const [isSubmittingAdjust, setIsSubmittingAdjust] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [u, n] = await Promise.all([
        api.admin.usuarios(), 
        api.levels.list()
      ]);
      setUsers(Array.isArray(u) ? u : []);
      setNiveles(Array.isArray(n) ? n : []);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const handleChangeTipoLider = async (userId, nuevoTipo) => {
    try {
      await api.admin.updateUsuario(userId, { tipo_lider: nuevoTipo });
      setUsers(users.map(u => u.id === userId ? { ...u, tipo_lider: nuevoTipo } : u));
    } catch (err) {
      alert(err.message);
    }
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleChangeNivel = async (userId, nuevoNivelId) => {
    if (!confirm(`¿Estás seguro de cambiar el nivel del usuario a ${nuevoNivelId}?`)) return;
    try {
      await api.admin.updateUsuario(userId, { nivel_id: nuevoNivelId });
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;
    try {
      await api.admin.changePassword(selectedUser.id, {
        password: passwords.login,
        password_fondo: passwords.fondo
      });
      alert('Contraseñas actualizadas con éxito');
      setSelectedUser(null);
      setPasswords({ login: '', fondo: '' });
    } catch (err) {
      alert(err.message);
    }
  };

  const handleToggleBlock = async (user) => {
    const action = user.bloqueado ? 'desbloquear' : 'bloquear';
    if (!confirm(`¿Estás seguro de ${action} a ${user.nombre_usuario}?`)) return;
    try {
      await api.admin.updateUsuario(user.id, { bloqueado: !user.bloqueado });
      setUsers(users.map(u => u.id === user.id ? { ...u, bloqueado: !user.bloqueado } : u));
    } catch (err) {
      alert(err.message);
    }
  };

  const handleAdjustBalance = async (e) => {
    e.preventDefault();
    if (!adjustingUser) return;
    
    setIsSubmittingAdjust(true);
    try {
      await api.admin.ajusteUsuario(adjustingUser.id, {
        monto: parseFloat(adjustData.monto),
        tipo_billetera: adjustData.tipo_billetera,
        descripcion: adjustData.descripcion || 'Ajuste administrativo manual'
      });
      alert('Saldo ajustado correctamente');
      setAdjustingUser(null);
      setAdjustData({ monto: '', tipo_billetera: 'principal', descripcion: '' });
      fetchData();
    } catch (err) {
      alert(err.message || 'Error al ajustar saldo');
    } finally {
      setIsSubmittingAdjust(false);
    }
  };

  const filteredUsers = users.filter(u => 
    u.nombre_usuario?.toLowerCase().includes(search.toLowerCase()) ||
    u.telefono?.includes(search)
  );

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">Gestión de Usuarios</h1>
          <p className="text-gray-500 font-medium uppercase tracking-widest text-[10px] mt-1">Control total de miembros y niveles</p>
        </div>
        <div className="flex items-center gap-4">
          {/* Configuración Global de Días */}
          <div className="bg-white px-6 py-3 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-2">
            <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Días de Tareas Globales</span>
            <div className="flex gap-1.5">
              {days.map(day => {
                const isSelected = (publicConfig.task_allowed_days || '1,2,3,4,5').split(',').includes(day.id.toString());
                return (
                  <button
                    key={day.id}
                    onClick={() => handleToggleTaskDay(day.id)}
                    className={`w-7 h-7 rounded-lg text-[10px] font-black transition-all ${
                      isSelected 
                        ? 'bg-[#1a1f36] text-white shadow-lg shadow-[#1a1f36]/20' 
                        : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                    } ${day.weekend ? 'border-b-2 border-amber-400' : ''}`}
                    title={day.weekend ? 'Fin de semana' : ''}
                  >
                    {day.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="bg-[#1a1f36] text-white px-6 py-3 rounded-2xl shadow-lg flex items-center gap-3">
            <User size={20} className="text-white/60" />
            <span className="font-bold">{users.length} Miembros</span>
          </div>
        </div>
      </div>

      {/* Buscador */}
      <div className="mb-6 relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input 
          type="text"
          placeholder="Buscar por nombre o teléfono..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-gray-100 focus:border-[#1a1f36] outline-none transition-all shadow-sm font-bold text-gray-700"
        />
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] border border-gray-100 overflow-hidden">
        {/* Vista Desktop: Tabla (Oculta en móviles < 1024px) */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50/50 border-b border-gray-100">
              <tr>
                <th className="p-6 font-black text-gray-400 uppercase tracking-widest text-[10px]">Info Usuario</th>
                <th className="p-6 font-black text-gray-400 uppercase tracking-widest text-[10px]">Teléfono</th>
                <th className="p-6 font-black text-gray-400 uppercase tracking-widest text-[10px]">Nivel</th>
                <th className="p-6 font-black text-gray-400 uppercase tracking-widest text-[10px]">Liderazgo</th>
                <th className="p-6 font-black text-gray-400 uppercase tracking-widest text-[10px]">Fines de Semana</th>
                <th className="p-6 font-black text-gray-400 uppercase tracking-widest text-[10px]">Saldos (T/C)</th>
                <th className="p-6 font-black text-gray-400 uppercase tracking-widest text-[10px] text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {Array.isArray(filteredUsers) && filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50/80 transition-colors group">
                  <td className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-[#1a1f36]/5 flex items-center justify-center text-[#1a1f36] font-black group-hover:bg-[#1a1f36] group-hover:text-white transition-all">
                        {u.nombre_usuario?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-black text-gray-800 text-sm uppercase tracking-tighter">{u.nombre_usuario}</p>
                          <button 
                            onClick={() => handleToggleBlock(u)}
                            className={`p-1 rounded-lg transition-all ${
                              u.bloqueado 
                                ? 'text-rose-600 hover:bg-rose-50' 
                                : 'text-gray-300 hover:text-rose-600 hover:bg-rose-50'
                            }`}
                            title={u.bloqueado ? 'Desbloquear Cuenta' : 'Bloquear Cuenta'}
                          >
                            <Ban size={14} />
                          </button>
                        </div>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{u.rol}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-6">
                    <span className="text-sm font-bold text-gray-600">{u.telefono}</span>
                  </td>
                  <td className="p-6">
                    <select 
                      value={u.nivel_id} 
                      onChange={(e) => handleChangeNivel(u.id, e.target.value)}
                      className="bg-gray-50 border-2 border-gray-100 text-gray-700 text-[9px] font-black uppercase tracking-widest rounded-xl px-3 py-2 focus:border-[#1a1f36] outline-none transition-all cursor-pointer"
                    >
                      {Array.isArray(niveles) && niveles.map(n => (
                        <option key={n.id} value={n.id}>{displayLevelCode(n.nombre)}</option>
                      ))}
                    </select>
                  </td>
                  <td className="p-6">
                    <select 
                      value={u.tipo_lider || ''} 
                      onChange={(e) => handleChangeTipoLider(u.id, e.target.value)}
                      className={`border-2 text-[9px] font-black uppercase tracking-widest rounded-xl px-3 py-2 focus:border-[#1a1f36] outline-none transition-all cursor-pointer ${
                        u.tipo_lider === 'lider_premium' 
                          ? 'bg-amber-500/10 border-amber-500/20 text-amber-600' 
                          : u.tipo_lider === 'lider' 
                          ? 'bg-blue-500/10 border-blue-500/20 text-blue-600' 
                          : 'bg-gray-50 border-gray-100 text-gray-400'
                      }`}
                    >
                      <option value="">Ninguno</option>
                      <option value="lider">Líder</option>
                      <option value="lider_premium">Líder Premium</option>
                    </select>
                  </td>
                  <td className="p-6">
                    <button
                      onClick={() => handleToggleWeekendUser(u)}
                      className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                        u.allow_weekend_tasks 
                          ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' 
                          : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                      }`}
                    >
                      {u.allow_weekend_tasks ? 'Habilitado' : 'Deshabilitado'}
                    </button>
                  </td>
                  <td className="p-6">
                    <button 
                      onClick={() => setAdjustingUser(u)}
                      className="flex flex-col items-start hover:bg-emerald-50 p-2 rounded-xl transition-all w-full group/balance"
                      title="Click para ajustar saldo"
                    >
                      <p className="text-[10px] font-black text-emerald-600 flex items-center gap-1">
                        {(u.saldo_principal || 0).toFixed(2)}
                        <DollarSign size={10} className="opacity-0 group-hover/balance:opacity-100 transition-opacity" />
                      </p>
                      <p className="text-[10px] font-black text-blue-600">{(u.saldo_comisiones || 0).toFixed(2)}</p>
                    </button>
                  </td>
                  <td className="p-6">
                    <div className="flex justify-center gap-2">
                      <button 
                        onClick={() => setSelectedUser(u)}
                        className="p-3 rounded-xl bg-[#1a1f36]/5 text-[#1a1f36] hover:bg-[#1a1f36] hover:text-white transition-all"
                        title="Cambiar Contraseñas"
                      >
                        <Key size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Vista Mobile: Cards (Visible en móviles < 1024px) */}
        <div className="lg:hidden p-4 space-y-4">
          {Array.isArray(filteredUsers) && filteredUsers.map((u) => (
            <div key={u.id} className="bg-gray-50 rounded-3xl p-5 border border-gray-100 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#1a1f36] text-white flex items-center justify-center font-black text-xs">
                    {u.nombre_usuario?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-black text-gray-800 text-xs uppercase tracking-tighter">{u.nombre_usuario}</p>
                    <p className="text-[8px] text-gray-400 font-bold uppercase tracking-widest">{u.telefono}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleToggleBlock(u)}
                    className={`p-2 rounded-lg ${u.bloqueado ? 'bg-rose-100 text-rose-600' : 'bg-gray-100 text-gray-400'}`}
                  >
                    <Ban size={14} />
                  </button>
                  <button 
                    onClick={() => setSelectedUser(u)}
                    className="p-2 rounded-lg bg-[#1a1f36]/5 text-[#1a1f36]"
                  >
                    <Key size={14} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Nivel VIP</p>
                  <select 
                    value={u.nivel_id} 
                    onChange={(e) => handleChangeNivel(u.id, e.target.value)}
                    className="w-full bg-white border border-gray-200 text-gray-700 text-[9px] font-black uppercase tracking-widest rounded-xl px-3 py-2 outline-none"
                  >
                    {niveles.map(n => (
                      <option key={n.id} value={n.id}>{n.nombre}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Liderazgo</p>
                  <select 
                    value={u.tipo_lider || ''} 
                    onChange={(e) => handleChangeTipoLider(u.id, e.target.value)}
                    className="w-full bg-white border border-gray-200 text-[9px] font-black uppercase tracking-widest rounded-xl px-3 py-2 outline-none"
                  >
                    <option value="">Ninguno</option>
                    <option value="lider">Líder</option>
                    <option value="lider_premium">Líder Premium</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-gray-200/50">
                <div className="flex gap-4">
                  <div>
                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Principal</p>
                    <p className="text-[11px] font-black text-emerald-600">{(u.saldo_principal || 0).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Comisiones</p>
                    <p className="text-[11px] font-black text-blue-600">{(u.saldo_comisiones || 0).toFixed(2)}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setAdjustingUser(u)}
                  className="bg-emerald-500 text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20"
                >
                  Ajustar
                </button>
              </div>
            </div>
          ))}
        </div>
        {filteredUsers.length === 0 && (
          <div className="p-20 text-center">
            <p className="text-gray-400 font-bold uppercase tracking-[0.3em] text-xs">No se encontraron usuarios</p>
          </div>
        )}
      </div>

      {/* Modal Cambio de Contraseña */}
      {selectedUser && (
        <div className="fixed inset-0 bg-[#1a1f36]/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl animate-slideUp">
            <div className="bg-[#1a1f36] p-8 text-white flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-black uppercase tracking-tighter">Seguridad</h2>
                <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest">Usuario: {selectedUser.nombre_usuario}</p>
              </div>
              <button onClick={() => setSelectedUser(null)} className="p-2 rounded-xl bg-white/10 hover:bg-white/20">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleChangePassword} className="p-8 space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Nueva Contraseña de Login</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                    <input 
                      type="text" 
                      placeholder="Dejar vacío para no cambiar"
                      value={passwords.login}
                      onChange={(e) => setPasswords({...passwords, login: e.target.value})}
                      className="w-full pl-12 pr-4 py-4 rounded-2xl bg-gray-50 border-2 border-gray-50 focus:border-[#1a1f36] outline-none font-bold text-gray-700 transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Nueva Contraseña de Fondos</label>
                  <div className="relative">
                    <Shield className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                    <input 
                      type="text" 
                      placeholder="Dejar vacío para no cambiar"
                      value={passwords.fondo}
                      onChange={(e) => setPasswords({...passwords, fondo: e.target.value})}
                      className="w-full pl-12 pr-4 py-4 rounded-2xl bg-gray-50 border-2 border-gray-50 focus:border-[#1a1f36] outline-none font-bold text-gray-700 transition-all"
                    />
                  </div>
                </div>
              </div>

              <button 
                type="submit"
                className="w-full py-5 rounded-[2rem] bg-[#1a1f36] text-white font-black uppercase tracking-widest shadow-xl shadow-[#1a1f36]/20 active:scale-[0.98] transition-all"
              >
                Actualizar Seguridad
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Ajuste de Saldo */}
      {adjustingUser && (
        <div className="fixed inset-0 bg-[#1a1f36]/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl animate-slideUp">
            <div className="bg-emerald-600 p-8 text-white flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-black uppercase tracking-tighter">Ajustar Saldo</h2>
                <p className="text-white/80 text-[10px] font-bold uppercase tracking-widest">Usuario: {adjustingUser.nombre_usuario}</p>
              </div>
              <button onClick={() => setAdjustingUser(null)} className="p-2 rounded-xl bg-white/10 hover:bg-white/20">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleAdjustBalance} className="p-8 space-y-6">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-gray-50 border-2 border-gray-100">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Saldo Principal</p>
                    <p className="text-sm font-black text-emerald-600">{(adjustingUser.saldo_principal || 0).toFixed(2)} <span className="text-[10px] opacity-50">BOB</span></p>
                  </div>
                  <div className="p-4 rounded-2xl bg-gray-50 border-2 border-gray-100">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Saldo Comisiones</p>
                    <p className="text-sm font-black text-blue-600">{(adjustingUser.saldo_comisiones || 0).toFixed(2)} <span className="text-[10px] opacity-50">BOB</span></p>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Monedero a ajustar</label>
                  <select
                    value={adjustData.tipo_billetera}
                    onChange={(e) => setAdjustData({...adjustData, tipo_billetera: e.target.value})}
                    className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-2 border-gray-100 focus:border-emerald-500 outline-none font-bold text-gray-700 transition-all appearance-none"
                  >
                    <option value="principal">Saldo Principal</option>
                    <option value="comisiones">Saldo Comisiones</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Monto del ajuste (+ o -)</label>
                  <div className="relative">
                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                    <input 
                      type="number" 
                      step="0.01"
                      required
                      placeholder="Ej: 100 o -50"
                      value={adjustData.monto}
                      onChange={(e) => setAdjustData({...adjustData, monto: e.target.value})}
                      className="w-full pl-12 pr-4 py-4 rounded-2xl bg-gray-50 border-2 border-gray-50 focus:border-emerald-500 outline-none font-bold text-gray-700 transition-all"
                    />
                  </div>
                  <p className="text-[9px] text-gray-400 mt-2 italic">* Usa valores positivos para sumar y negativos para restar.</p>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Descripción / Motivo</label>
                  <textarea 
                    rows={2}
                    placeholder="Ej: Bono de bienvenida o Corrección"
                    value={adjustData.descripcion}
                    onChange={(e) => setAdjustData({...adjustData, descripcion: e.target.value})}
                    className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-2 border-gray-50 focus:border-emerald-500 outline-none font-bold text-gray-700 transition-all resize-none"
                  />
                </div>
              </div>

              <button 
                type="submit"
                disabled={isSubmittingAdjust}
                className="w-full py-5 rounded-[2rem] bg-emerald-600 text-white font-black uppercase tracking-widest shadow-xl shadow-emerald-600/20 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {isSubmittingAdjust ? 'Procesando...' : 'Confirmar Ajuste'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
