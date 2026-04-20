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
  Target
} from 'lucide-react';
import { api } from '../../lib/api';
import { formatCurrency, formatDate } from '../../utils/format';

const UserRow = ({ user, onEdit, onDelete, onToggleStatus, onToggleBlock, onResetPassword }) => (
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
          <div className="flex items-center gap-2">
            <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full tracking-widest ${user.rol === 'admin' ? 'bg-amber-500/10 text-amber-500' : 'bg-slate-500/10 text-slate-500'}`}>
              {user.rol}
            </span>
            <span className="text-[8px] font-bold text-slate-600 uppercase tracking-widest">ID: {user.id}</span>
          </div>
        </div>
      </div>
    </td>
    <td className="px-6 py-5 text-center">
      <div className="flex flex-col items-center">
        <p className="text-sm font-black text-white tracking-tighter">{formatCurrency(user.saldo)}</p>
        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Balance Disponible</p>
      </div>
    </td>
    <td className="px-6 py-5 text-center">
      <div className="flex flex-col items-center">
        <p className="text-sm font-black text-sav-primary uppercase tracking-tighter italic">Nivel {user.nivel_id || 0}</p>
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
        <button onClick={() => onToggleBlock(user)} className={`p-2.5 rounded-xl transition-all border border-white/5 shadow-lg ${user.bloqueado ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white'}`} title={user.bloqueado ? "Desbloquear" : "Bloquear acceso"}>
          <Shield size={16} />
        </button>
        <button onClick={() => onResetPassword(user)} className="p-2.5 rounded-xl bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white transition-all border border-white/5 shadow-lg" title="Reset Password">
          <RefreshCw size={16} />
        </button>
        <button onClick={() => onEdit(user)} className="p-2.5 rounded-xl bg-sav-primary/10 text-sav-primary hover:bg-sav-primary hover:text-white transition-all border border-sav-primary/20 shadow-lg">
          <Edit3 size={16} />
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

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/usuarios');
      setUsers(data);
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
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

  const handleResetPassword = async (user) => {
    const newPass = prompt(`Ingresa la nueva contraseña para ${user.nombre_usuario}:`);
    if (!newPass) return;
    try {
      await api.post(`/admin/usuarios/${user.id}/reset-password`, { password: newPass });
      alert('Contraseña actualizada');
    } catch (err) {
      alert(err.message);
    }
  };

  const handleToggleStatus = async (user) => {
    try {
      await api.post(`/admin/usuarios/${user.id}/toggle-status`);
      fetchUsers();
    } catch (err) {
      console.error('Error toggling status:', err);
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = (u.nombre_usuario || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
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
                    onEdit={() => {}} // TODO: Modal edición completa
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
    </div>
  );
}
