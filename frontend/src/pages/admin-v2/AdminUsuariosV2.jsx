import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  Search, 
  Filter, 
  MoreVertical, 
  Edit3, 
  Trash2, 
  UserPlus, 
  Shield, 
  CheckCircle2, 
  XCircle, 
  Calendar, 
  TrendingUp, 
  RefreshCw,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  UserX,
  CreditCard,
  Target,
  DollarSign,
  User,
  ShieldAlert,
  Smartphone
} from 'lucide-react';
import { api } from '../../lib/api';
import { formatCurrency, formatDate } from '../../utils/format';

const UserRow = ({ user, onEdit, onDelete, onToggleStatus, onToggleBlock, onResetPassword, onAdjustBalance, onViewFinancial, onResetDevice }) => (
  <motion.tr 
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="border-b border-white/5 hover:bg-white/[0.02] transition-colors duration-300 group"
  >
    <td className="px-6 py-5">
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-white shadow-lg border border-white/10 ${user.rol === 'admin' ? 'bg-gradient-to-tr from-amber-500 to-orange-600' : user.bloqueado ? 'bg-rose-900/50 grayscale' : 'bg-gradient-to-tr from-slate-700 to-slate-800'}`}>
          {user.nombre_usuario.charAt(0).toUpperCase()}
        </div>
        <div className="flex flex-col overflow-hidden">
          <div className="flex items-center gap-2">
            <p className="text-sm font-black text-white truncate uppercase tracking-tight">{user.nombre_usuario}</p>
            {user.bloqueado && <Shield className="text-rose-500" size={12} />}
          </div>
          <div className="flex flex-col">
            <p className="text-[10px] font-bold text-slate-400 truncate">{user.nombre_real || 'Sin nombre real'}</p>
            <p className="text-[10px] font-black text-sav-primary tracking-widest">{user.telefono}</p>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full tracking-widest ${user.rol === 'admin' ? 'bg-amber-500/10 text-amber-500' : 'bg-slate-500/10 text-slate-500'}`}>
              {user.rol}
            </span>
          </div>
        </div>
      </div>
    </td>
    <td className="px-6 py-5 text-center">
      <div className="flex flex-col items-center">
        <p className="text-sm font-black text-white tracking-tighter">{formatCurrency(user.saldo_principal || user.saldo)}</p>
        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Balance Disponible</p>
      </div>
    </td>
    <td className="px-6 py-5 text-center">
      <div className="flex flex-col items-center">
        <p className="text-sm font-black text-sav-primary uppercase tracking-tighter italic">{user.nivel || 'Internar'}</p>
        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">VIP Status</p>
      </div>
    </td>
    <td className="px-6 py-5 text-center">
      <div className="flex flex-col items-center gap-1">
        <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${user.bloqueado ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' : user.activo ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'}`}>
          {user.bloqueado ? 'BLOQUEADO' : user.activo ? 'Cuenta Activa' : 'Inactivo'}
        </span>
        <p className="text-[8px] font-bold text-slate-600 uppercase tracking-widest">{formatDate(user.created_at)}</p>
      </div>
    </td>
    <td className="px-6 py-5 text-right">
      <div className="flex items-center justify-end gap-2">
        <button onClick={() => onViewFinancial(user)} className="p-2.5 rounded-xl bg-sav-primary/10 text-sav-primary hover:bg-sav-primary hover:text-white transition-all border border-sav-primary/20 shadow-lg" title="Ver Datos Financieros">
          <TrendingUp size={16} />
        </button>
        <button onClick={() => onAdjustBalance(user)} className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white transition-all border border-emerald-500/20 shadow-lg" title="Ajustar Saldo">
          <DollarSign size={16} />
        </button>
        <button onClick={() => onResetDevice(user)} className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-white transition-all border border-amber-500/20 shadow-lg" title="Resetear Dispositivo">
          <Smartphone size={16} />
        </button>
        <button onClick={() => onToggleBlock(user)} className={`p-2.5 rounded-xl transition-all border border-white/5 shadow-lg ${user.bloqueado ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white'}`} title={user.bloqueado ? "Desbloquear" : "Bloquear acceso"}>
          <Shield size={16} />
        </button>
        <button onClick={() => onResetPassword(user)} className="p-2.5 rounded-xl bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white transition-all border border-white/5 shadow-lg" title="Cambiar Contraseñas">
          <RefreshCw size={16} />
        </button>
      </div>
    </td>
  </motion.tr>
);

export default function AdminUsuariosV2() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showFinancialModal, setShowFinancialModal] = useState(false);
  
  const [selectedUser, setSelectedUser] = useState(null);
  const [financialData, setFinancialData] = useState(null);
  const [adjustForm, setAdjustForm] = useState({ tipo: 'principal', monto: '', motivo: '' });
  const [passwordForm, setPasswordForm] = useState({ password: '', type: 'inicio' });
  
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [isUpdatingPass, setIsUpdatingPass] = useState(false);
  const [loadingFinancial, setLoadingFinancial] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await api.admin.usuarios();
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdjustBalance = (user) => {
    setSelectedUser(user);
    setAdjustForm({ tipo: 'principal', monto: '', motivo: '' });
    setShowAdjustModal(true);
  };

  const submitAdjustment = async (e) => {
    e.preventDefault();
    if (!adjustForm.monto || isNaN(adjustForm.monto)) return alert('Monto inválido');
    
    setIsAdjusting(true);
    try {
      await api.admin.ajusteUsuario(selectedUser.id, adjustForm);
      setShowAdjustModal(false);
      fetchUsers();
      alert('Ajuste realizado con éxito');
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setIsAdjusting(false);
    }
  };

  const handleToggleBlock = async (user) => {
    if (!confirm(`¿Seguro que quieres ${user.bloqueado ? 'DESBLOQUEAR' : 'BLOQUEAR'} a ${user.nombre_usuario}?`)) return;
    try {
      await api.post(`/admin/usuarios/${user.id}/toggle-block`);
      fetchUsers();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleResetDevice = async (user) => {
    if (!confirm(`¿Seguro que quieres resetear la vinculación de dispositivo para ${user.nombre_usuario}? Esto permitirá que inicie sesión desde un nuevo celular.`)) return;
    try {
      await api.post(`/admin/usuarios/${user.id}/reset-device`);
      alert('Vinculación de dispositivo eliminada');
      fetchUsers();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleResetPassword = (user) => {
    setSelectedUser(user);
    setPasswordForm({ password: '', type: 'inicio' });
    setShowPasswordModal(true);
  };

  const submitPasswordChange = async (e) => {
    e.preventDefault();
    if (!passwordForm.password) return alert('La contraseña no puede estar vacía');
    
    setIsUpdatingPass(true);
    try {
      const type = passwordForm.type === 'fondos' ? 'fondos' : 'inicio';
      await api.post(`/admin/usuarios/${selectedUser.id}/password`, { 
        password: passwordForm.password,
        type: type
      });
      setShowPasswordModal(false);
      alert(`Contraseña de ${passwordForm.type} actualizada con éxito`);
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setIsUpdatingPass(false);
    }
  };

  const handleViewFinancial = async (user) => {
    setSelectedUser(user);
    setShowFinancialModal(true);
    setLoadingFinancial(true);
    try {
      const data = await api.get(`/admin/usuarios/${user.id}/financial`);
      setFinancialData(data);
    } catch (err) {
      alert('Error al cargar datos financieros');
      setShowFinancialModal(false);
    } finally {
      setLoadingFinancial(false);
    }
  };

  const filteredUsers = users.filter(u => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      (u.nombre_usuario || '').toLowerCase().includes(searchLower) || 
      (u.nombre_real || '').toLowerCase().includes(searchLower) ||
      (u.telefono || '').toLowerCase().includes(searchLower) ||
      u.id.toString().includes(searchTerm);
    const matchesRole = filterRole === 'all' || u.rol === filterRole;
    return matchesSearch && matchesRole;
  });

  const paginatedUsers = filteredUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);

  return (
    <div className="space-y-10">
      {/* Header with Title and Search */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-8">
        <div className="space-y-2">
          <div className="flex items-center gap-4">
            <div className="p-3.5 rounded-2xl bg-gradient-to-tr from-sav-primary to-rose-500 text-white shadow-xl shadow-sav-primary/20">
              <Users size={24} />
            </div>
            <div>
              <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic">User Management</h1>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] flex items-center gap-2">
                <Shield size={14} className="text-sav-primary" /> Auditoría de cuentas institucional
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="relative group flex-1 min-w-[300px]">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-sav-primary transition-colors" />
            <input 
              type="text" 
              placeholder="Buscar por usuario o ID..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#161926] border border-white/5 rounded-2xl py-4 pl-12 pr-6 text-xs font-bold text-white outline-none focus:border-sav-primary/30 transition-all shadow-2xl"
            />
          </div>
          <select 
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="bg-[#161926] border border-white/5 rounded-2xl py-4 px-6 text-[10px] font-black uppercase tracking-widest text-slate-300 outline-none focus:border-sav-primary/30 transition-all shadow-2xl appearance-none cursor-pointer"
          >
            <option value="all">Todos los Roles</option>
            <option value="user">Usuarios VIP</option>
            <option value="admin">Administradores</option>
          </select>
          <button 
            onClick={fetchUsers}
            className="p-4 rounded-2xl bg-white/5 border border-white/5 text-slate-400 hover:text-white transition-all shadow-2xl"
          >
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-[#161926] border border-white/5 rounded-[40px] overflow-hidden shadow-2xl shadow-black/40">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#1a1e2e]/50 border-b border-white/5">
                <th className="px-6 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Identidad</th>
                <th className="px-6 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] text-center">Patrimonio</th>
                <th className="px-6 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] text-center">Nivel VIP</th>
                <th className="px-6 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] text-center">Estado de Red</th>
                <th className="px-6 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array(5).fill(0).map((_, i) => (
                  <tr key={i} className="animate-pulse border-b border-white/5">
                    <td colSpan="5" className="px-6 py-10">
                      <div className="h-10 bg-white/5 rounded-2xl w-full" />
                    </td>
                  </tr>
                ))
              ) : paginatedUsers.length > 0 ? (
                paginatedUsers.map((user) => (
                  <UserRow 
                    key={user.id} 
                    user={user} 
                    onToggleBlock={handleToggleBlock}
                    onResetPassword={handleResetPassword}
                    onAdjustBalance={handleAdjustBalance}
                    onViewFinancial={handleViewFinancial}
                    onResetDevice={handleResetDevice}
                  />
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-4 opacity-30">
                      <Target size={60} className="text-slate-500" />
                      <p className="text-xs font-black uppercase tracking-widest text-slate-500">No se encontraron registros</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Control */}
        <div className="p-8 border-t border-white/5 bg-[#1a1e2e]/30 flex items-center justify-between">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
            Mostrando {paginatedUsers.length} de {filteredUsers.length} registros
          </p>
          <div className="flex items-center gap-3">
            <button 
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => prev - 1)}
              className="p-3 rounded-xl bg-white/5 border border-white/5 text-slate-400 hover:text-white disabled:opacity-20 transition-all shadow-lg"
            >
              <ChevronLeft size={20} />
            </button>
            <div className="px-6 py-3 rounded-xl bg-sav-primary text-white text-xs font-black shadow-lg shadow-sav-primary/20">
              Página {currentPage} de {totalPages || 1}
            </div>
            <button 
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => prev + 1)}
              className="p-3 rounded-xl bg-white/5 border border-white/5 text-slate-400 hover:text-white disabled:opacity-20 transition-all shadow-lg"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Adjust Balance Modal */}
      <AnimatePresence>
        {showAdjustModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 backdrop-blur-2xl flex items-center justify-center p-6 z-[200]"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 30 }}
              className="bg-[#161926] border border-white/10 p-12 rounded-[50px] max-w-lg w-full shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/50" />
              
              <div className="flex items-center gap-4 mb-8">
                <div className="p-3.5 rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                  <DollarSign size={24} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-white uppercase tracking-tighter italic">Ajuste de Capital</h3>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{selectedUser?.nombre_usuario}</p>
                </div>
              </div>

              <form onSubmit={submitAdjustment} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 italic">Tipo de Billetera</label>
                  <select 
                    value={adjustForm.tipo}
                    onChange={e => setAdjustForm({...adjustForm, tipo: e.target.value})}
                    className="w-full bg-[#0f111a] border border-white/5 rounded-2xl px-6 py-4 text-xs font-black text-white uppercase outline-none focus:border-emerald-500/30 shadow-inner"
                  >
                    <option value="principal">Saldo Principal</option>
                    <option value="comisiones">Saldo Comisiones</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 italic">Monto a Ajustar (BOB)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={adjustForm.monto} 
                    onChange={e => setAdjustForm({...adjustForm, monto: e.target.value})}
                    placeholder="Ej. 100 o -100"
                    className="w-full bg-[#0f111a] border border-white/5 rounded-2xl px-6 py-4 text-xs font-black text-white outline-none focus:border-emerald-500/30 shadow-inner"
                    required
                  />
                  <p className="text-[8px] font-bold text-slate-600 uppercase tracking-widest ml-1">Usa valores negativos para restar saldo</p>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 italic">Motivo del Ajuste</label>
                  <input 
                    type="text" 
                    value={adjustForm.motivo} 
                    onChange={e => setAdjustForm({...adjustForm, motivo: e.target.value})}
                    placeholder="Bono por evento / Corrección..."
                    className="w-full bg-[#0f111a] border border-white/5 rounded-2xl px-6 py-4 text-xs font-black text-white outline-none focus:border-emerald-500/30 shadow-inner"
                    required
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    type="button"
                    onClick={() => setShowAdjustModal(false)}
                    className="flex-1 py-4 rounded-2xl bg-white/5 text-slate-400 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    disabled={isAdjusting}
                    className="flex-1 py-4 rounded-2xl bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2"
                  >
                    {isAdjusting ? <RefreshCw className="animate-spin" size={14} /> : <CheckCircle2 size={14} />}
                    Aplicar Ajuste
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Password Change Modal */}
      <AnimatePresence>
        {showPasswordModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 backdrop-blur-2xl flex items-center justify-center p-6 z-[200]"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 30 }}
              className="bg-[#161926] border border-white/10 p-12 rounded-[50px] max-w-lg w-full shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-amber-500 to-orange-600 shadow-lg shadow-amber-500/50" />
              
              <div className="flex items-center gap-4 mb-8">
                <div className="p-3.5 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
                  <RefreshCw size={24} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-white uppercase tracking-tighter italic">Protocolo de Seguridad</h3>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{selectedUser?.nombre_usuario}</p>
                </div>
              </div>

              <form onSubmit={submitPasswordChange} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 italic">Tipo de Contraseña</label>
                  <select 
                    value={passwordForm.type}
                    onChange={e => setPasswordForm({...passwordForm, type: e.target.value})}
                    className="w-full bg-[#0f111a] border border-white/5 rounded-2xl px-6 py-4 text-xs font-black text-white uppercase outline-none focus:border-amber-500/30 shadow-inner"
                  >
                    <option value="inicio">Contraseña de Inicio</option>
                    <option value="fondos">Contraseña de Fondos</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 italic">Nueva Contraseña</label>
                  <input 
                    type="text" 
                    value={passwordForm.password} 
                    onChange={e => setPasswordForm({...passwordForm, password: e.target.value})}
                    placeholder="Ingrese la nueva clave..."
                    className="w-full bg-[#0f111a] border border-white/5 rounded-2xl px-6 py-4 text-xs font-black text-white outline-none focus:border-amber-500/30 shadow-inner"
                    required
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    type="button"
                    onClick={() => setShowPasswordModal(false)}
                    className="flex-1 py-4 rounded-2xl bg-white/5 text-slate-400 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    disabled={isUpdatingPass}
                    className="flex-1 py-4 rounded-2xl bg-amber-600 text-white text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-amber-600/20 flex items-center justify-center gap-2"
                  >
                    {isUpdatingPass ? <RefreshCw className="animate-spin" size={14} /> : <CheckCircle2 size={14} />}
                    Actualizar
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Financial Stats Modal */}
      <AnimatePresence>
        {showFinancialModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 backdrop-blur-2xl flex items-center justify-center p-6 z-[200]"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 30 }}
              className="bg-[#161926] border border-white/10 p-12 rounded-[50px] max-w-2xl w-full shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-sav-primary to-rose-600 shadow-lg shadow-sav-primary/50" />
              
              <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-4">
                  <div className="p-3.5 rounded-2xl bg-sav-primary/10 text-sav-primary border border-sav-primary/20">
                    <TrendingUp size={24} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-white uppercase tracking-tighter italic">Auditoría Financiera</h3>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{selectedUser?.nombre_usuario}</p>
                  </div>
                </div>
                <button onClick={() => setShowFinancialModal(false)} className="p-3 rounded-2xl bg-white/5 text-slate-500 hover:text-white transition-all">
                  <XCircle size={24} />
                </button>
              </div>

              {loadingFinancial ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <RefreshCw className="animate-spin text-sav-primary" size={40} />
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Compilando datos...</p>
                </div>
              ) : financialData && (
                <div className="space-y-8">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="p-8 rounded-[35px] bg-[#0f111a] border border-white/5 space-y-2">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Saldo Principal</p>
                      <p className="text-3xl font-black text-white tracking-tighter italic">{formatCurrency(financialData.saldo_principal)}</p>
                    </div>
                    <div className="p-8 rounded-[35px] bg-[#0f111a] border border-white/5 space-y-2">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Saldo Comisiones</p>
                      <p className="text-3xl font-black text-sav-primary tracking-tighter italic">{formatCurrency(financialData.saldo_comisiones)}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/5 text-center space-y-1">
                      <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Total Recargas</p>
                      <p className="text-sm font-black text-emerald-500">{formatCurrency(financialData.financial_stats.total_recargado)}</p>
                    </div>
                    <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/5 text-center space-y-1">
                      <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Total Retiros</p>
                      <p className="text-sm font-black text-rose-500">{formatCurrency(financialData.financial_stats.total_retirado)}</p>
                    </div>
                    <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/5 text-center space-y-1">
                      <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Ganancia Tareas</p>
                      <p className="text-sm font-black text-amber-500">{formatCurrency(financialData.financial_stats.total_tareas)}</p>
                    </div>
                    <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/5 text-center space-y-1">
                      <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Referidos</p>
                      <p className="text-sm font-black text-white">{financialData.financial_stats.referidos_directos}</p>
                    </div>
                  </div>

                  <div className="p-6 rounded-3xl bg-amber-500/5 border border-amber-500/10 flex items-center gap-4">
                    <ShieldAlert className="text-amber-500" size={20} />
                    <p className="text-[10px] font-bold text-amber-500/80 uppercase tracking-tight leading-relaxed">
                      Esta información es de carácter confidencial. Los cambios en el capital deben ser auditados y registrados bajo el protocolo de ajuste administrativo.
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
