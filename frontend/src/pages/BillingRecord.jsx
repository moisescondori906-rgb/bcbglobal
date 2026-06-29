import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import Header from '../components/Header';
import { api } from '../lib/api';
import { FileText, ArrowUpCircle, ArrowDownCircle, Clock, History } from 'lucide-react';

export default function BillingRecord() {
  const [tab, setTab] = useState('ingresos');
  const [retiros, setRetiros] = useState([]);
  const [recargas, setRecargas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      try {
        setLoading(true);
        const [resRetiros, resRecargas] = await Promise.all([
          api.withdrawals.list().catch(() => []),
          api.recharges.list().catch(() => [])
        ]);
        if (isMounted) {
          setRetiros(resRetiros || []);
          setRecargas(resRecargas || []);
        }
      } catch (err) {
        console.error('Error cargando facturación:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    
    fetchData();
    
    // Polling de respaldo para facturación cada 30 segundos
    const interval = setInterval(fetchData, 30000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const items = tab === 'ingresos' 
    ? (Array.isArray(recargas) ? recargas.map(r => ({ ...r, tipo_visual: 'recarga', monto_val: r.monto })) : [])
    : (Array.isArray(retiros) ? retiros.map(r => ({ ...r, tipo_visual: 'retiro', monto_val: -r.monto })) : []);

  if (loading) {
    return (
      <Layout>
        <Header title="Registro de facturación" />
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
          <div className="w-10 h-10 border-4 border-[#1a1f36] border-t-emerald-500 rounded-full animate-spin" />
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Cargando registros...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Header title="Registro de facturación" />
      
      <div className="bg-gray-50 min-h-screen pb-24">
        {/* Tabs Modernas */}
        <div className="px-4 pt-4">
          <div className="flex bg-white p-1.5 rounded-2xl border border-gray-100 shadow-sm">
            <button
              onClick={() => setTab('ingresos')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                tab === 'ingresos' ? 'bg-[#1a1f36] text-white shadow-lg' : 'text-gray-400'
              }`}
            >
              <ArrowUpCircle size={14} />
              Ingresos
            </button>
            <button
              onClick={() => setTab('gastos')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                tab === 'gastos' ? 'bg-[#1a1f36] text-white shadow-lg' : 'text-gray-400'
              }`}
            >
              <ArrowDownCircle size={14} />
              Gastos
            </button>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {items.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-100 flex flex-col items-center gap-4">
              <History size={40} className="text-gray-200" />
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">No hay movimientos registrados</p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((i) => (
                <div key={i.id} className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex justify-between items-center group hover:border-[#1a1f36]/20 transition-all">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner border border-gray-50 ${
                      i.tipo_visual === 'recarga' ? 'bg-emerald-50 text-emerald-500' : 'bg-rose-50 text-rose-500'
                    }`}>
                      {i.tipo_visual === 'recarga' ? <ArrowUpCircle size={24} /> : <ArrowDownCircle size={24} />}
                    </div>
                    <div>
                      <p className="text-[8px] text-gray-300 font-mono uppercase tracking-widest mb-1">REF: {i.id?.slice(0, 8).toUpperCase()}</p>
                      <p className={`text-base font-black tracking-tighter ${i.monto_val < 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                        {i.monto_val > 0 ? '+' : ''}{Number(i.monto_val).toFixed(2)} <span className="text-[10px] font-black">Bs</span>
                      </p>
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <span className="inline-block px-2 py-0.5 rounded-full bg-gray-50 text-[8px] font-black text-gray-400 uppercase tracking-widest border border-gray-100">
                      {i.tipo_visual}
                    </span>
                    <div className="flex items-center gap-1.5 text-[8px] font-black text-gray-300 uppercase tracking-widest justify-end">
                      <Clock size={10} />
                      {new Date(i.created_at).toLocaleDateString('es-BO', { day: '2-digit', month: 'short' })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
