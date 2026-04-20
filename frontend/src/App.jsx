import { Suspense, lazy, useState, useEffect } from 'react';
// BCB Global v7.0.0 - Despliegue Premium
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { useAndroidBackHandler } from './hooks/useAndroidBackHandler.js';

/**
 * NavigationGuard: Maneja el comportamiento del botón atrás del celular.
 * Asegura que el usuario regrese paso a paso y no salga de la app
 * hasta estar en la pantalla de inicio.
 */
import GlobalLoader from './components/ui/GlobalLoader';
import ErrorBoundary from './components/ui/ErrorBoundary';

function NavigationGuard({ children }) {
  useAndroidBackHandler();
  return children;
}

/**
 * Helper para manejar errores de carga de módulos dinámicos (Chunks).
 * Esto ocurre cuando se despliega una nueva versión y el navegador intenta
 * cargar un archivo .js que ya no existe en el servidor.
 */
const lazyWithRetry = (componentImport) =>
  lazy(async () => {
    try {
      return await componentImport();
    } catch (error) {
      console.error('Error cargando componente:', error);
      // Solo recargar si es un error de carga de módulo
      if (error.message?.includes('Failed to fetch dynamically imported module') || 
          error.message?.includes('Importing a module script failed')) {
        window.location.reload();
      }
      throw error;
    }
  });

// Lazy Loading para optimizar carga inicial con reintento automático
const Login = lazyWithRetry(() => import('./pages/Login.jsx'));
const Register = lazyWithRetry(() => import('./pages/Register.jsx'));
const Dashboard = lazyWithRetry(() => import('./pages/Dashboard.jsx'));
const TaskRoom = lazyWithRetry(() => import('./pages/TaskRoom.jsx'));
const Profile = lazyWithRetry(() => import('./pages/Profile.jsx'));
const Withdrawal = lazyWithRetry(() => import('./pages/Withdrawal.jsx'));
const Recharge = lazyWithRetry(() => import('./pages/Recharge.jsx'));
const VIP = lazyWithRetry(() => import('./pages/VIP.jsx'));
const Ganancias = lazyWithRetry(() => import('./pages/Ganancias.jsx'));
const Movimientos = lazyWithRetry(() => import('./pages/Movimientos.jsx'));
const NoticiasConferencia = lazyWithRetry(() => import('./pages/NoticiasConferencia.jsx'));
const Team = lazyWithRetry(() => import('./pages/Team.jsx'));
const Invite = lazyWithRetry(() => import('./pages/Invite.jsx'));
const Security = lazyWithRetry(() => import('./pages/Security.jsx'));
const VincularTarjeta = lazyWithRetry(() => import('./pages/VincularTarjeta.jsx'));
const CambiarContrasena = lazyWithRetry(() => import('./pages/CambiarContrasena.jsx'));
const CambiarContrasenaFondo = lazyWithRetry(() => import('./pages/CambiarContrasenaFondo.jsx'));
const BillingRecord = lazyWithRetry(() => import('./pages/BillingRecord.jsx'));
const Recompensas = lazyWithRetry(() => import('./pages/Recompensas.jsx'));
const HelpCenter = lazyWithRetry(() => import('./pages/HelpCenter.jsx'));
const AboutUs = lazyWithRetry(() => import('./pages/AboutUs.jsx'));
const Messages = lazyWithRetry(() => import('./pages/Messages.jsx'));

// Admin V2 (Modern Console)
const AdminLayout = lazyWithRetry(() => import('./pages/admin-v2/AdminLayoutV2.jsx'));
const AdminDashboard = lazyWithRetry(() => import('./pages/admin-v2/AdminDashboardV2.jsx'));
const AdminUsuarios = lazyWithRetry(() => import('./pages/admin-v2/AdminUsuariosV2.jsx'));
const AdminRecargas = lazyWithRetry(() => import('./pages/admin-v2/AdminRecargasV2.jsx'));
const AdminRetiros = lazyWithRetry(() => import('./pages/admin-v2/AdminRetirosV2.jsx'));
const AdminMetodosQr = lazyWithRetry(() => import('./pages/admin-v2/AdminMetodosQrV2.jsx'));
const AdminContenidoHome = lazyWithRetry(() => import('./pages/admin-v2/AdminContenidoHomeV2.jsx'));
const AdminTareas = lazyWithRetry(() => import('./pages/admin-v2/AdminTareasV2.jsx'));
const AdminBanners = lazyWithRetry(() => import('./pages/admin-v2/AdminBannersV2.jsx'));
const AdminNiveles = lazyWithRetry(() => import('./pages/admin-v2/AdminNivelesV2.jsx'));
const AdminAdmins = lazyWithRetry(() => import('./pages/admin-v2/AdminAdminsV2.jsx'));
const AdminCuestionario = lazyWithRetry(() => import('./pages/admin-v2/AdminCuestionarioV2.jsx'));
const AdminRanking = lazyWithRetry(() => import('./pages/admin-v2/AdminRankingV2.jsx'));
const AdminRecompensas = lazyWithRetry(() => import('./pages/admin-v2/AdminRecompensasV2.jsx'));
const AdminCalendario = lazyWithRetry(() => import('./pages/admin-v2/AdminCalendarioV2.jsx'));
const AdminTelegram = lazyWithRetry(() => import('./pages/admin-v2/AdminTelegramV2.jsx'));

function PrivateRoute({ children, adminOnly }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <GlobalLoader />;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  
  // Si la ruta es solo para admin y el usuario no es admin, redirigir al home de usuario
  if (adminOnly && user.rol !== 'admin') {
    return <Navigate to="/" replace />;
  }

  // Si el usuario es admin y entra a la ruta raíz de usuario (/), redirigir a su panel /admin
  if (location.pathname === '/' && user.rol === 'admin') {
    return <Navigate to="/admin" replace />;
  }

  return children;
}

function CatchAll() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.rol === 'admin' ? "/admin" : "/"} replace />;
}

function AppRoutes() {
  return (
    <Suspense fallback={<GlobalLoader />}>
      <Routes>
        {/* Rutas Públicas */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/admin" element={<PrivateRoute adminOnly><AdminLayout /></PrivateRoute>}>
          <Route index element={<AdminDashboard />} />
          <Route path="usuarios" element={<AdminUsuarios />} />
          <Route path="niveles" element={<AdminNiveles />} />
          <Route path="recargas" element={<AdminRecargas />} />
          <Route path="retiros" element={<AdminRetiros />} />
          <Route path="tareas" element={<AdminTareas />} />
          <Route path="banners" element={<AdminBanners />} />
          <Route path="metodos-qr" element={<AdminMetodosQr />} />
          <Route path="recompensas" element={<AdminRecompensas />} />
          <Route path="telegram" element={<AdminTelegram />} />
          <Route path="admins" element={<AdminAdmins />} />
          <Route path="calendario" element={<AdminCalendario />} />
          <Route path="cuestionarios" element={<AdminCuestionario />} />
          <Route path="ranking" element={<AdminRanking />} />
          <Route path="contenido-home" element={<AdminContenidoHome />} />
        </Route>
        <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/recompensas" element={<PrivateRoute><Recompensas /></PrivateRoute>} />
        <Route path="/mensajes" element={<PrivateRoute><Messages /></PrivateRoute>} />
        {/* Rutas Privadas */}
        <Route path="/tareas" element={<PrivateRoute><TaskRoom /></PrivateRoute>} />
        <Route path="/usuario" element={<PrivateRoute><Profile /></PrivateRoute>} />
        <Route path="/equipo" element={<PrivateRoute><Team /></PrivateRoute>} />
        <Route path="/invitar" element={<PrivateRoute><Invite /></PrivateRoute>} />
        <Route path="/vip" element={<PrivateRoute><VIP /></PrivateRoute>} />
        <Route path="/ganancias" element={<PrivateRoute><Ganancias /></PrivateRoute>} />
        <Route path="/movimientos" element={<PrivateRoute><Movimientos /></PrivateRoute>} />
        <Route path="/noticias-conferencia" element={<PrivateRoute><NoticiasConferencia /></PrivateRoute>} />
        <Route path="/retiro" element={<PrivateRoute><Withdrawal /></PrivateRoute>} />
        <Route path="/recargar" element={<PrivateRoute><Recharge /></PrivateRoute>} />
        <Route path="/seguridad" element={<PrivateRoute><Security /></PrivateRoute>} />
        <Route path="/vincular-tarjeta" element={<PrivateRoute><VincularTarjeta /></PrivateRoute>} />
        <Route path="/ayuda" element={<PrivateRoute><HelpCenter /></PrivateRoute>} />
        <Route path="/acerca-de" element={<PrivateRoute><AboutUs /></PrivateRoute>} />
        <Route path="/cambiar-contrasena" element={<PrivateRoute><CambiarContrasena /></PrivateRoute>} />
        <Route path="/cambiar-contrasena-fondo" element={<PrivateRoute><CambiarContrasenaFondo /></PrivateRoute>} />
        <Route path="/registro-tareas" element={<PrivateRoute><TaskRoom /></PrivateRoute>} />
        <Route path="/registro-facturacion" element={<PrivateRoute><BillingRecord /></PrivateRoute>} />
        
        {/* Ruta 404 por defecto */}
        <Route path="*" element={<CatchAll />} />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <NavigationGuard>
            <AppRoutes />
          </NavigationGuard>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
