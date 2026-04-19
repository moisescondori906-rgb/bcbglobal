import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { Users, CreditCard, Wallet, TrendingUp, Calendar, Clock } from 'lucide-react';

export default function AdminDashboard() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.admin.dashboard()
      .then(res => setData(res || {}))
      .catch((err) => {
        console.error('Error fetching admin dashboard:', err);
        setData({});
      });
  }, []);

  const d = data || {};

  return (
    <div className="p-8 space-y-8">
      <h1 className="text-3xl font-black text-white mb-8 uppercase tracking-tighter">BCB Global — Administrador</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-sav-card border border-white/5 rounded-[2rem] p-6 shadow-xl relative overflow-hidden group">
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
              <Users size={28} />
            </div>
            <div>
              <p className="text-sav-muted text-[10px] font-black uppercase tracking-widest">Usuarios</p>
              <p className="text-2xl font-black text-white">{d.total_usuarios ?? 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-sav-card border border-white/5 rounded-[2rem] p-6 shadow-xl relative overflow-hidden group">
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-14 h-14 rounded-2xl bg-sav-primary/10 border border-sav-primary/20 flex items-center justify-center text-sav-primary group-hover:scale-110 transition-transform">
              <CreditCard size={28} />
            </div>
            <div>
              <p className="text-sav-muted text-[10px] font-black uppercase tracking-widest">Recargas</p>
              <p className="text-2xl font-black text-white">{d.pendientes_recarga ?? 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-sav-card border border-white/5 rounded-[2rem] p-6 shadow-xl relative overflow-hidden group">
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
              <Wallet size={28} />
            </div>
            <div>
              <p className="text-sav-muted text-[10px] font-black uppercase tracking-widest">Retiros</p>
              <p className="text-2xl font-black text-white">{d.pendientes_retiro ?? 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-sav-card border border-white/5 rounded-[2rem] p-6 shadow-xl relative overflow-hidden group">
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
              <TrendingUp size={28} />
            </div>
            <div>
              <p className="text-sav-muted text-[10px] font-black uppercase tracking-widest">Ingresos</p>
              <p className="text-2xl font-black text-white">{d.ingresos_hoy ?? 0} BOB</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
