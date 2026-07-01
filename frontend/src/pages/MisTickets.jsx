import { useState, useEffect } from 'react';
import { Trophy, Sparkles, History, Gift, ArrowLeft, UserPlus } from 'lucide-react';
import Layout from '../components/Layout.jsx';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { formatTime } from '../lib/utils/format';

export default function MisTickets() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('tickets');

  useEffect(() => {
    Promise.all([
      api.sorteo.tickets().catch(() => []),
      api.sorteo.ticketsHistorial().catch(() => [])
    ]).then(([ticketsData, historialData]) => {
      setTickets(ticketsData || []);
      setHistorial(historialData || []);
      setLoading(false);
    });
  }, []);

  const getEstadoBadge = (estado) => {
    switch (estado) {
      case 'Activo':
        return { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200' };
      case 'Utilizado':
        return { bg: 'bg-gray-100', text: 'text-gray-500', border: 'border-gray-200' };
      case 'Anulado':
        return { bg: 'bg-rose-50', text: 'text-rose-500', border: 'border-rose-200' };
      default:
        return { bg: 'bg-gray-100', text: 'text-gray-500', border: 'border-gray-200' };
    }
  };

  const getMotivoIcon = (motivo) => {
    if (motivo.includes('Registro')) return <Gift className="text-amber-500" />;
    if (motivo.includes('Ascenso') || motivo.includes('ascenso')) return <UserPlus className="text-violet-500" />;
    return <Trophy className="text-amber-500" />;
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-slate-200 border-t-amber-500 rounded-full animate-spin" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="bg-gray-50 min-h-screen pb-24">
        {/* Header */}
        <div className="pt-12 pb-8 px-6">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-4 mb-6">
              <button
                onClick={() => window.history.back()}
                className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center shadow-md border border-gray-100"
              >
                <ArrowLeft size={20} className="text-gray-700" />
              </button>
              <div>
                <h1 className="text-3xl font-black text-gray-900">Mis Tickets</h1>
                <p className="text-sm text-gray-500 font-medium">Historial de tickets y recompensas</p>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-3xl p-6 border border-amber-100 shadow-lg">
                <div className="flex items-center gap-3 mb-3">
                  <Trophy className="text-amber-600" size={24} />
                  <span className="text-xs font-black text-amber-700 uppercase tracking-widest">Tickets Totales</span>
                </div>
                <div className="text-3xl font-black text-gray-900">{user?.tickets_ruleta || 0}</div>
              </div>
              <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-3xl p-6 border border-violet-100 shadow-lg">
                <div className="flex items-center gap-3 mb-3">
                  <History className="text-violet-600" size={24} />
                  <span className="text-xs font-black text-violet-700 uppercase tracking-widest">Recompensas</span>
                </div>
                <div className="text-3xl font-black text-gray-900">{historial.length}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6 max-w-4xl mx-auto">
          <div className="flex gap-2 bg-white p-1.5 rounded-2xl border border-gray-100 shadow-sm mb-6">
            <button
              onClick={() => setActiveTab('tickets')}
              className={`flex-1 py-3 px-4 rounded-xl text-sm font-black uppercase tracking-widest transition-all ${activeTab === 'tickets'
                ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-white shadow-lg'
                : 'text-gray-500 hover:bg-gray-50'}`}
            >
              <div className="flex items-center justify-center gap-2">
                <Trophy size={16} />
                Tickets
              </div>
            </button>
            <button
              onClick={() => setActiveTab('historial')}
              className={`flex-1 py-3 px-4 rounded-xl text-sm font-black uppercase tracking-widest transition-all ${activeTab === 'historial'
                ? 'bg-gradient-to-r from-violet-500 to-purple-500 text-white shadow-lg'
                : 'text-gray-500 hover:bg-gray-50'}`}
            >
              <div className="flex items-center justify-center gap-2">
                <History size={16} />
                Historial
              </div>
            </button>
          </div>

          {/* Contenido de Tabs */}
          <div className="space-y-4">
            {activeTab === 'tickets' ? (
            <>
              {tickets.length > 0 ? (
                tickets.map((ticket, index) => {
                  const estadoBadge = getEstadoBadge(ticket.estado);
                  return (
                    <div
                    key={ticket.id}
                    className="bg-white rounded-3xl p-5 border border-gray-100 shadow-lg hover:shadow-xl transition-all duration-300"
                    style={{ animationDelay: `${index * 100 }}
                  }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 bg-gradient-to-br from-amber-100 to-yellow-100 rounded-2xl flex items-center justify-center border border-amber-200">
                          {getMotivoIcon(ticket.motivo)}
                        </div>
                        <div className="flex-1">
                          <div className="font-black text-gray-900">{ticket.codigo}</div>
                          <div className="text-xs font-medium text-gray-500 mt-1">{ticket.motivo}</div>
                          <div className="text-[10px] font-bold text-gray-400 mt-1">
                            {formatTime(ticket.created_at)}
                          </div>
                        </div>
                      </div>
                      <div className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${estadoBadge.bg} ${estadoBadge.text} ${estadoBadge.border}`}>
                        {ticket.estado}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-16">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trophy className="text-gray-300" size={32} />
                </div>
                <p className="text-sm font-bold text-gray-500">Aún no tienes tickets</p>
              </div>
            )}
          </>
        ) : (
          <>
            {historial.length > 0 ? (
            historial.map((item, index) => (
              <div
                key={item.id}
                className="bg-white rounded-3xl p-5 border border-gray-100 shadow-lg"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-violet-100 to-purple-100 rounded-2xl flex items-center justify-center border border-violet-200">
                      <Gift className="text-violet-500" />
                    </div>
                    <div className="flex-1">
                      <div className="font-black text-gray-900">{item.motivo}</div>
                      {item.nivel_alcanzado && (
                        <div className="text-xs font-medium text-violet-600 mt-1">
                          Nivel: {item.nivel_alcanzado}
                        </div>
                      )}
                      {item.nombre_generador && (
                        <div className="text-xs font-medium text-gray-500 mt-1">
                          Por: {item.nombre_generador}
                        </div>
                      )}
                      <div className="text-[10px] font-bold text-gray-400 mt-1">
                        {formatTime(item.created_at)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-black text-amber-600">+{item.cantidad_tickets}</div>
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Tickets</div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <History className="text-gray-300" size={32} />
              </div>
              <p className="text-sm font-bold text-gray-500">Aún no tienes historial de recompensas</p>
            </div>
          )}
        </>
      )}
    </div>
  </div>
</div>
</Layout>
);
}
