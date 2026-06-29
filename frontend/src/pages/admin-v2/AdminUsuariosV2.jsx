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
  Smartphone,
  Medal
} from 'lucide-react';
import { api } from '../../lib/api';
import { formatCurrency, formatDate } from '../../lib/utils/format';

const UserRow = ({ user, onEdit, onDelete, onToggleStatus, onToggleBlock, onResetPassword, onAdjustBalance, onViewFinancial, onResetDevice, onEditLevel, onEditGrade }) => (
  <motion.tr 
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="border-b border-admin-border hover:bg-white/[0.02] transition-colors duration-300 group"
  >
    <td className="px-6 py-5">
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-white shadow-lg border border-white/10 shrink-0 ${user.rol === 'admin' ? 'bg-gradient-to-tr from-amber-500 to-orange-600' : user.bloqueado ? 'bg-rose-900/50 grayscale' : 'bg-zinc-800'}`}>
          {user.nombre_usuario.charAt(0).toUpperCase()}
        </div>
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-black text-white truncate uppercase tracking-tight italic group-hover:text-admin-accent transition-colors">{user.nombre_usuario}</p>
            {user.bloqueado && <ShieldAlert className="text-rose-500" size={12} />}
          </div>
          <p className="text-[10px] font-bold text-zinc-500 truncate">{user.nombre_real || 'Sin nombre real'}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[8px] font-black text-admin-accent uppercase tracking-widest bg-admin-accent/10 px-1.5 py-0.5 rounded border border-admin-accent/20">ID: {user.id}</span>
            <span className="text-[8px] font-bold text-zinc-600 uppercase tracking-widest">{formatDate(user.created_at)}</span>
          </div>
        </div>
      </div>
    </td>
    <td className="px-6 py-5">
      <div className="flex flex-col gap-1.5 min-w-[120px]">
        <div className="flex items-center justify-between bg-white/[0.03] border border-white/5 rounded-lg px-3 py-1.5">
          <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Main</span>
          <span className="text-[11px] font-black text-white tracking-tighter italic">{formatCurrency(user.saldo_principal)}</span>
        </div>
        <div className="flex items-center justify-between bg-emerald-500/5 border border-emerald-500/10 rounded-lg px-3 py-1.5">
          <span className="text-[8px] font-black text-emerald-700 uppercase tracking-widest">Earned</span>
          <span className="text-[11px] font-black text-emerald-500 tracking-tighter italic">{formatCurrency(user.saldo_comisiones)}</span>
        </div>
      </div>
    </td>
    <td className="px-6 py-5">
      <div className="flex flex-col items-center">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-admin-accent/5 border border-admin-accent/10 rounded-xl group-hover:bg-admin-accent/10 transition-colors">
          <Medal size={14} className="text-admin-accent" />
          <p className="text-xs font-black text-white uppercase tracking-tighter italic">{user.nivel || 'Intern'}</p>
        </div>
        <button 
          onClick={() => onEditLevel(user)}
          className="mt-2 text-[8px] font-black text-zinc-500 uppercase tracking-widest hover:text-admin-accent transition-colors flex items-center gap-1"
        >
          <Edit3 size={10} /> Upgrade VIP
        </button>
      </div>
    </td>
    <td className="px-6 py-5">
      <div className="flex flex-col items-center gap-2">
        <span className={`admin-badge ${user.bloqueado ? 'admin-badge-error' : user.activo ? 'admin-badge-success' : 'admin-badge-warning'}`}>
          {user.bloqueado ? 'Terminated' : user.activo ? 'Active' : 'Idle'}
        </span>
        <div className="flex items-center gap-3 mt-1">
          <div className="flex items-center gap-1">
            <div className={`w-1 h-1 rounded-full ${user.tiene_password_fondo ? 'bg-emerald-500 shadow-[0_0_5px_#10b981]' : 'bg-zinc-700'}`} />
            <span className="text-[7px] font-black text-zinc-600 uppercase tracking-widest">Vault</span>
          </div>
          <div className="flex items-center gap-1">
            <div className={`w-1 h-1 rounded-full ${user.rol === 'admin' ? 'bg-amber-500 shadow-[0_0_5px_#f59e0b]' : 'bg-zinc-700'}`} />
            <span className="text-[7px] font-black text-zinc-600 uppercase tracking-widest">Priv</span>
          </div>
        </div>
      </div>
    </td>
    <td className="px-6 py-5 text-right">
      <div className="flex items-center justify-end gap-1.5">
        <button onClick={() => onViewFinancial(user)} className="p-2 rounded-lg bg-white/5 border border-white/5 text-zinc-400 hover:bg-admin-accent hover:text-white transition-all shadow-sm" title="Analytics">
          <TrendingUp size={14} />
        </button>
        <button onClick={() => onAdjustBalance(user)} className="p-2 rounded-lg bg-white/5 border border-white/5 text-emerald-500 hover:bg-emerald-500 hover:text-white transition-all shadow-sm" title="Balance">
          <DollarSign size={14} />
        </button>
        <button onClick={() => onResetDevice(user)} className="p-2 rounded-lg bg-white/5 border border-white/5 text-amber-500 hover:bg-amber-500 hover:text-white transition-all shadow-sm" title="Device">
          <Smartphone size={14} />
        </button>
        <button onClick={() => onEditGrade(user)} className="p-2 rounded-lg bg-white/5 border border-white/5 text-violet-500 hover:bg-violet-500 hover:text-white transition-all shadow-sm" title="Grade">
          <Medal size={14} />
        </button>
        <button onClick={() => onToggleBlock(user)} className={`p-2 rounded-lg border transition-all shadow-sm ${user.bloqueado ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500 hover:bg-emerald-500 hover:text-white' : 'bg-rose-500/10 border-rose-500/20 text-rose-500 hover:bg-rose-500 hover:text-white'}`} title={user.bloqueado ? 'Restore' : 'Block'}>
          {user.bloqueado ? <UserCheck size={14} /> : <UserX size={14} />}
        </button>
        <button onClick={() => onResetPassword(user)} className="p-2 rounded-lg bg-white/5 border border-white/5 text-zinc-600 hover:bg-white/10 hover:text-zinc-200 transition-all shadow-sm" title="Password">
          <RefreshCw size={14} />
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
  const [showLevelModal, setShowLevelModal] = useState(false);
  const [showGradeModal, setShowGradeModal] = useState(false);
  
  const [selectedUser, setSelectedUser] = useState(null);
  const [financialData, setFinancialData] = useState(null);
  const [levels, setLevels] = useState([]);
  const [adjustForm, setAdjustForm] = useState({ tipo: 'principal', monto: '', motivo: '' });
  const [passwordForm, setPasswordForm] = useState({ password: '', type: 'inicio' });
  const [selectedLevelId, setSelectedLevelId] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('ninguno');
  
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [isUpdatingPass, setIsUpdatingPass] = useState(false);
  const [isUpdatingLevel, setIsUpdatingLevel] = useState(false);
  const [isUpdatingGrade, setIsUpdatingGrade] = useState(false);
  const [loadingFinancial, setLoadingFinancial] = useState(false);

  useEffect(() => {
    fetchUsers();
    fetchLevels();
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

  const fetchLevels = async () => {
    try {
      const data = await api.levels.list();
      setLevels(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching levels:', err);
    }
  };

  const handleEditLevel = (user) => {
    setSelectedUser(user);
    setSelectedLevelId(user.nivel_id || '');
    setShowLevelModal(true);
  };

  const handleEditGrade = (user) => {
    setSelectedUser(user);
    setSelectedGrade(user.grado_colaborador || 'ninguno');
    setShowGradeModal(true);
  };

  const submitGradeChange = async (e) => {
    e.preventDefault();
    setIsUpdatingGrade(true);
    try {
      await api.patch(`/admin/users/${selectedUser.id}/collaborator-grade`, { grado_colaborador: selectedGrade });
      setShowGradeModal(false);
      fetchUsers();
      alert('Grado actualizado con éxito');
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setIsUpdatingGrade(false);
    }
  };

  const submitLevelChange = async (e) => {
    e.preventDefault();
    if (!selectedLevelId) return alert('Seleccione un nivel');
    
    setIsUpdatingLevel(true);
    try {
      await api.post(`/admin/usuarios/${selectedUser.id}/nivel`, { nivel_id: selectedLevelId });
      setShowLevelModal(false);
      fetchUsers();
      alert('Nivel actualizado con éxito');
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setIsUpdatingLevel(false);
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
    <div className="space-y-8 pb-20">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
        <div className="space-y-2">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-admin-accent/10 flex items-center justify-center border border-admin-accent/20 shrink-0">
              <Users size={24} className="text-admin-accent" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tighter uppercase italic leading-none">Database Nodes</h1>
              <p className="text-[10px] font-black text-admin-muted uppercase tracking-[0.3em] mt-1 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-admin-accent animate-pulse" /> Gestión de perfiles y accesos
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-3 px-5 py-2.5 bg-white/[0.03] border border-white/5 rounded-2xl text-[10px] font-black text-zinc-400 uppercase tracking-widest shadow-inner">
            <Users size={14} className="text-admin-accent" /> Total: {users.length}
          </div>
          <button 
            onClick={fetchUsers}
            className="admin-button-secondary !px-4"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Filters & Search Section */}
      <div className="admin-card p-6 sm:p-8 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        <div className="md:col-span-8 relative group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-admin-accent transition-colors" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por usuario, ID o teléfono..." 
            className="admin-input !h-14 pl-14 !text-base !rounded-2xl shadow-inner"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="md:col-span-4 relative group">
          <Filter className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-admin-accent transition-colors" size={18} />
          <select 
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="admin-input !h-14 pl-14 appearance-none cursor-pointer !text-base !rounded-2xl shadow-inner"
          >
            <option value="all">Todos los Roles</option>
            <option value="admin">Administradores</option>
            <option value="usuario">Usuarios</option>
          </select>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="admin-table-container">
        <div className="admin-table-wrapper">
          <table className="admin-table min-w-[1100px]">
            <thead>
              <tr>
                <th className="!pl-10">Identidad</th>
                <th className="text-center">Finanzas</th>
                <th className="text-center">VIP Ranking</th>
                <th className="text-center">Estado Nodo</th>
                <th className="text-right !pr-10">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array(5).fill(0).map((_, i) => (
                  <tr key={i} className="animate-pulse border-b border-admin-border">
                    <td colSpan="5" className="px-10 py-12">
                      <div className="h-14 bg-white/[0.03] rounded-2xl w-full border border-white/5" />
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
                    onEditLevel={handleEditLevel}
                    onEditGrade={handleEditGrade}
                  />
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-6 py-32 text-center">
                    <div className="flex flex-col items-center gap-6 opacity-20">
                      <div className="w-24 h-24 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700">
                        <Search size={40} className="text-zinc-500" />
                      </div>
                      <p className="text-sm font-black uppercase tracking-[0.3em] text-zinc-500">No se encontraron registros</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Premium */}
        <div className="px-10 py-8 border-t border-admin-border flex flex-col sm:flex-row items-center justify-between gap-6 bg-black/20">
          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">
            Mostrando <span className="text-white">{(currentPage - 1) * itemsPerPage + 1}</span> - <span className="text-white">{Math.min(currentPage * itemsPerPage, filteredUsers.length)}</span> de <span className="text-white">{filteredUsers.length}</span> nodos
          </p>
          <div className="flex items-center gap-2">
            <button 
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => prev - 1)}
              className="admin-button-secondary !h-10 !w-10 !p-0 !rounded-xl disabled:opacity-20"
            >
              <ChevronLeft size={16} />
            </button>
            <div className="flex items-center gap-1.5 px-3 py-1 bg-white/[0.03] rounded-xl border border-white/5">
              {[...Array(Math.min(5, totalPages))].map((_, i) => {
                let pageNum = i + 1;
                if (totalPages > 5 && currentPage > 3) {
                  pageNum = currentPage - 2 + i;
                  if (pageNum > totalPages) pageNum = totalPages - (4 - i);
                }
                if (pageNum <= 0) return null;
                if (pageNum > totalPages) return null;

                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-9 h-9 rounded-lg text-[10px] font-black transition-all ${currentPage === pageNum ? 'bg-admin-accent text-white shadow-lg shadow-admin-accent/20 scale-110' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            <button 
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => prev + 1)}
              className="admin-button-secondary !h-10 !w-10 !p-0 !rounded-xl disabled:opacity-20"
            >
              <ChevronRight size={16} />
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
            className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center p-4 z-[200]"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-admin-card border border-admin-border p-8 sm:p-12 rounded-[2.5rem] max-w-lg w-full shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]" />
              
              <div className="flex items-center gap-5 mb-10">
                <div className="p-4 rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shadow-lg shadow-emerald-500/5">
                  <DollarSign size={28} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-white uppercase tracking-tighter italic leading-none">Ajuste de Capital</h3>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] mt-1">{selectedUser?.nombre_usuario}</p>
                </div>
              </div>

              <form onSubmit={submitAdjustment} className="space-y-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1 italic">Tipo de Billetera</label>
                  <select 
                    value={adjustForm.tipo}
                    onChange={e => setAdjustForm({...adjustForm, tipo: e.target.value})}
                    className="admin-input !h-14 !bg-black/20 !rounded-2xl !px-6"
                  >
                    <option value="principal">Saldo Principal</option>
                    <option value="comisiones">Saldo Comisiones</option>
                  </select>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1 italic">Monto a Ajustar (Bs)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={adjustForm.monto} 
                    onChange={e => setAdjustForm({...adjustForm, monto: e.target.value})}
                    placeholder="Ej. 100 o -100"
                    className="admin-input !h-14 !bg-black/20 !rounded-2xl !px-6"
                    required
                  />
                  <p className="text-[8px] font-bold text-zinc-600 uppercase tracking-widest ml-2">Usa valores negativos para restar saldo</p>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1 italic">Motivo del Ajuste</label>
                  <input 
                    type="text" 
                    value={adjustForm.motivo} 
                    onChange={e => setAdjustForm({...adjustForm, motivo: e.target.value})}
                    placeholder="Bono por evento / Corrección..."
                    className="admin-input !h-14 !bg-black/20 !rounded-2xl !px-6"
                    required
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    type="button"
                    onClick={() => setShowAdjustModal(false)}
                    className="admin-button-secondary flex-1"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    disabled={isAdjusting}
                    className="admin-button-primary flex-1 !bg-emerald-500 !shadow-emerald-500/20"
                  >
                    {isAdjusting ? <RefreshCw className="animate-spin" size="16" /> : <CheckCircle2 size="16" />}
                    Confirmar
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grade Change Modal */}
      <AnimatePresence>
        {showGradeModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center p-4 z-[200]"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-admin-card border border-admin-border p-8 sm:p-12 rounded-[2.5rem] max-w-lg w-full shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-violet-500 to-indigo-500 shadow-[0_0_15px_rgba(139,92,246,0.3)]" />
              
              <div className="flex items-center gap-5 mb-10">
                <div className="p-4 rounded-2xl bg-violet-500/10 text-violet-500 border border-violet-500/20 shadow-lg shadow-violet-500/5">
                  <Medal size={28} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-white uppercase tracking-tighter italic leading-none">Grado Especial</h3>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] mt-1">{selectedUser?.nombre_usuario}</p>
                </div>
              </div>

              <form onSubmit={submitGradeChange} className="space-y-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1 italic">Seleccionar Grado</label>
                  <select 
                    value={selectedGrade}
                    onChange={e => setSelectedGrade(e.target.value)}
                    className="admin-input !h-14 !bg-black/20 !rounded-2xl !px-6"
                  >
                    <option value="ninguno">Sin grado</option>
                    <option value="colaborador">Colaborador — 200 Bs/mes</option>
                    <option value="colaborador_senior">Colaborador Senior — 500 Bs/mes</option>
                  </select>
                </div>

                <div className="p-6 rounded-[1.5rem] bg-amber-500/5 border border-amber-500/10 flex items-start gap-4">
                  <ShieldAlert className="text-amber-500 shrink-0 mt-0.5" size={20} />
                  <p className="text-[10px] font-bold text-amber-500/80 uppercase tracking-tight leading-relaxed">
                    El salario de colaborador es informativo y debe ser entregado directamente por administración. No se acredita automáticamente a ninguna billetera.
                  </p>
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    type="button"
                    onClick={() => setShowGradeModal(false)}
                    className="admin-button-secondary flex-1"
                  >
                    Cerrar
                  </button>
                  <button 
                    type="submit"
                    disabled={isUpdatingGrade}
                    className="admin-button-primary flex-1 !bg-violet-600 !shadow-violet-600/20"
                  >
                    {isUpdatingGrade ? <RefreshCw className="animate-spin" size="16" /> : <CheckCircle2 size="16" />}
                    Actualizar
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
              className="bg-admin-card border border-white/20 p-12 rounded-[50px] max-w-lg w-full shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-amber-500 to-orange-600 shadow-lg shadow-amber-500/50" />
              
              <div className="flex items-center gap-4 mb-8">
                <div className="p-3.5 rounded-2xl bg-zinc-900 text-amber-500 border border-white/20">
                  <RefreshCw size={24} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-white uppercase tracking-tighter italic">Protocolo de Seguridad</h3>
                  <p className="text-[10px] font-bold text-white uppercase tracking-widest">{selectedUser?.nombre_usuario}</p>
                </div>
              </div>

              <form onSubmit={submitPasswordChange} className="space-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-white uppercase tracking-widest ml-1 italic">Tipo de Contraseña</label>
                  <select 
                    value={passwordForm.type}
                    onChange={e => setPasswordForm({...passwordForm, type: e.target.value})}
                    className="w-full bg-zinc-900 border border-white/20 rounded-2xl px-6 py-4 text-xs font-black text-white uppercase outline-none focus:border-amber-500/50 shadow-inner"
                  >
                    <option value="inicio">Contraseña de Inicio</option>
                    <option value="fondos">Contraseña de Fondos</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-white uppercase tracking-widest ml-1 italic">Nueva Contraseña</label>
                  <input 
                    type="text" 
                    value={passwordForm.password} 
                    onChange={e => setPasswordForm({...passwordForm, password: e.target.value})}
                    placeholder="Ingrese la nueva clave..."
                    className="w-full bg-zinc-900 border border-white/20 rounded-2xl px-6 py-4 text-xs font-black text-white outline-none focus:border-amber-500/50 shadow-inner"
                    required
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    type="button"
                    onClick={() => setShowPasswordModal(false)}
                    className="flex-1 py-4 rounded-2xl bg-white/10 border border-white/20 text-white text-[10px] font-black uppercase tracking-widest hover:bg-white/20 transition-all"
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
              className="bg-admin-card border border-white/20 p-12 rounded-[50px] max-w-2xl w-full shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-bcb-primary to-rose-600 shadow-lg shadow-bcb-primary/50" />
              
              <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-4">
                  <div className="p-3.5 rounded-2xl bg-zinc-900 text-admin-accent border border-white/20 shadow-lg">
                    <TrendingUp size={24} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-white uppercase tracking-tighter italic leading-none">Global Financial Status</h3>
                    <p className="text-[10px] font-bold text-white uppercase tracking-widest">{selectedUser?.nombre_usuario}</p>
                  </div>
                </div>
                <button onClick={() => setShowFinancialModal(false)} className="p-3 rounded-2xl bg-white/10 text-white hover:bg-rose-500 transition-all border border-white/10">
                  <XCircle size={24} />
                </button>
              </div>

              {loadingFinancial ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <RefreshCw className="animate-spin text-admin-accent" size={40} />
                  <p className="text-[10px] font-black text-white uppercase tracking-widest">Compilando datos...</p>
                </div>
              ) : financialData && (
                <div className="space-y-8">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="p-6 rounded-[2rem] bg-zinc-900 border border-white/20 shadow-inner">
                      <p className="text-[10px] font-black text-white uppercase tracking-widest italic opacity-60">Saldo Principal</p>
                      <p className="text-3xl font-black text-white tracking-tighter italic">{formatCurrency(financialData.saldo_principal)}</p>
                    </div>
                    <div className="p-6 rounded-[2rem] bg-zinc-900 border border-admin-accent/40 shadow-inner">
                      <p className="text-[10px] font-black text-admin-accent uppercase tracking-widest italic opacity-60">Saldo Comisiones</p>
                      <p className="text-3xl font-black text-admin-accent tracking-tighter italic">{formatCurrency(financialData.saldo_comisiones)}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-6 rounded-3xl bg-zinc-900 border border-white/20 text-center space-y-1">
                      <p className="text-[8px] font-black text-white uppercase tracking-widest opacity-60">Total Recargas</p>
                      <p className="text-sm font-black text-emerald-400">{formatCurrency(financialData.financial_stats.total_recargado)}</p>
                    </div>
                    <div className="p-6 rounded-3xl bg-zinc-900 border border-white/20 text-center space-y-1">
                      <p className="text-[8px] font-black text-white uppercase tracking-widest opacity-60">Total Retiros</p>
                      <p className="text-sm font-black text-rose-400">{formatCurrency(financialData.financial_stats.total_retirado)}</p>
                    </div>
                    <div className="p-6 rounded-3xl bg-zinc-900 border border-white/20 text-center space-y-1">
                      <p className="text-[8px] font-black text-white uppercase tracking-widest opacity-60">Ganancia Tareas</p>
                      <p className="text-sm font-black text-amber-400">{formatCurrency(financialData.financial_stats.total_tareas)}</p>
                    </div>
                    <div className="p-6 rounded-3xl bg-zinc-900 border border-white/20 text-center space-y-1">
                      <p className="text-[8px] font-black text-white uppercase tracking-widest opacity-60">Referidos</p>
                      <p className="text-sm font-black text-white">{financialData.financial_stats.referidos_directos}</p>
                    </div>
                  </div>

                  <div className="p-6 rounded-3xl bg-amber-500/20 border border-amber-500/40 flex items-center gap-4">
                    <ShieldAlert className="text-amber-500" size={20} />
                    <p className="text-[10px] font-bold text-white uppercase tracking-tight leading-relaxed">
                      Esta información es de carácter confidencial. Los cambios en el capital deben ser auditados y registrados bajo el protocolo de ajuste administrativo.
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Level Change Modal */}
      <AnimatePresence>
        {showLevelModal && (
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
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-bcb-primary to-indigo-600 shadow-lg shadow-bcb-primary/50" />
              
              <div className="flex items-center gap-5 mb-10">
                <div className="p-3.5 rounded-2xl bg-admin-accent/10 text-admin-accent border border-admin-accent/20">
                  <Shield size={28} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-white uppercase tracking-tighter italic leading-none">Security Upgrade</h3>
                  <p className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest">{selectedUser?.nombre_usuario}</p>
                </div>
              </div>

              <form onSubmit={submitLevelChange} className="space-y-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-zinc-300 uppercase tracking-widest ml-1 italic">Seleccionar Nuevo Nivel VIP</label>
                  <select 
                    value={selectedLevelId}
                    onChange={e => setSelectedLevelId(e.target.value)}
                    className="admin-input !h-14 !bg-black/20 !rounded-2xl !px-6"
                  >
                    <option value="">-- Seleccionar Nivel --</option>
                    {levels.map(lvl => (
                      <option key={lvl.id} value={lvl.id}>{lvl.nombre} (Orden: {lvl.orden})</option>
                    ))}
                  </select>
                </div>

                <div className="p-6 rounded-[1.5rem] bg-admin-accent/5 border border-admin-accent/10">
                  <p className="text-[9px] font-bold text-admin-accent uppercase tracking-tight leading-relaxed text-center">
                    Esta acción modificará los privilegios de acceso y las cuotas de tareas diarias del nodo de forma inmediata.
                  </p>
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    type="button"
                    onClick={() => setShowLevelModal(false)}
                    className="flex-1 py-4 rounded-2xl bg-white/5 text-slate-400 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    disabled={isUpdatingLevel}
                    className="flex-1 py-4 rounded-2xl bg-bcb-primary text-white text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-bcb-primary/20 flex items-center justify-center gap-2"
                  >
                    {isUpdatingLevel ? <RefreshCw className="animate-spin" size={14} /> : <CheckCircle2 size={14} />}
                    Actualizar Nivel
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

