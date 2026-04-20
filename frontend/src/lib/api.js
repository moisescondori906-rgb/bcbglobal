// Detectar si estamos en producción para usar variables de entorno
const isProd = import.meta.env.PROD;
const VITE_API_URL = import.meta.env.VITE_API_URL;
const VITE_BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

// Validación de seguridad en producción: No permitir fallbacks accidentales a localhost
if (isProd) {
  if (!VITE_API_URL) {
    const errorMsg = '❌ ERROR CRÍTICO: VITE_API_URL no está configurada en el entorno de producción.';
    console.error(errorMsg);
    throw new Error(errorMsg);
  }
  if (!VITE_BACKEND_URL) {
    const errorMsg = '❌ ERROR CRÍTICO: VITE_BACKEND_URL no está configurada en el entorno de producción.';
    console.error(errorMsg);
    throw new Error(errorMsg);
  }
}

// URL base del API - SOLO permite fallback a localhost en desarrollo
const API = isProd ? VITE_API_URL : (VITE_API_URL || 'http://localhost:4000/api');

// Dominio base del backend para medios (videos/imágenes) - SOLO permite fallback a localhost en desarrollo
const BACKEND_URL = isProd ? VITE_BACKEND_URL : (VITE_BACKEND_URL || 'http://localhost:4000');

function getToken() {
  return localStorage.getItem('token');
}

const inflightRequests = new Map();
const staticCache = new Map();
const CACHE_TTL = 30000; // 30 segundos para datos semi-estáticos

async function request(url, options = {}, retries = 2) {
  const normalizedUrl = url.startsWith('/') ? url : `/${url}`;
  const method = options.method || 'GET';
  
  const isGet = method === 'GET';
  const cacheKey = isGet ? `${normalizedUrl}:${JSON.stringify(options.params || {})}` : null;

  // 1. Verificar Caché Estática (Solo para rutas específicas)
  // /users/stats excluido: debe reflejar columnas persistidas al instante (sin caché de 30s)
  const staticRoutes = [
    '/public-content', '/niveles', '/banners', '/withdrawals/montos',
    '/users/earnings', '/tasks', '/users/cuestionario',
    '/users/status-castigo', '/users/team'
  ];
  if (isGet && staticRoutes.includes(normalizedUrl)) {
    const cached = staticCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }
  }

  // 2. Deduplicación de peticiones en vuelo (GET y POST sensibles como Login/Register)
  const isAuth = normalizedUrl.includes('/auth/');
  if ((isGet || isAuth) && inflightRequests.has(cacheKey || normalizedUrl)) {
    return inflightRequests.get(cacheKey || normalizedUrl);
  }

  const promise = (async () => {
    const headers = { 
      'Content-Type': 'application/json', 
      'x-tenant-slug': 'bcb-global',
      ...options.headers 
    };
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    
    const finalUrl = API + normalizedUrl;

    try {
      const controller = new AbortController();
      // Timeout más corto para auth (30s) vs otros endpoints (120s)
      const timeoutMs = isAuth ? 25000 : 35000;
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const res = await fetch(finalUrl, { 
        ...options, 
        headers,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (res.status === 304) {
        if (normalizedUrl === '/users/me') {
          const cachedUser = localStorage.getItem('user');
          return cachedUser ? JSON.parse(cachedUser) : {};
        }
        return {};
      }

      if (!res.ok) {
        let data = {};
        try { 
          // Intentar parsear JSON, si falla es que devolvió HTML o texto plano
          const text = await res.text();
          try {
            data = JSON.parse(text);
          } catch (e) {
            data = { error: `Error del servidor (${res.status}). Intenta de nuevo.` };
          }
        } catch (e) {
          data = { error: 'Error de conexión con el servidor.' };
        }
        
        if (res.status === 401 && !isAuth) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }

        const error = new Error(data.error || `Error ${res.status}: ${res.statusText}`);
        error.status = res.status;
        throw error;
      }

      const result = await res.json().catch(() => ({}));

      // Guardar en caché estática si corresponde
      if (isGet && staticRoutes.includes(normalizedUrl)) {
        staticCache.set(cacheKey, { data: result, timestamp: Date.now() });
      }

      return result;
    } catch (err) {
      if (err.name === 'AbortError') {
        throw new Error(isAuth 
          ? 'La autenticación está tardando demasiado. Por favor, verifica tu conexión o intenta en unos minutos.' 
          : 'El servidor está tardando demasiado en responder. Por favor, reintenta en unos segundos.'
        );
      }

      if (err.status >= 400 && err.status < 500) throw err;

      // No reintentar auth para evitar bucles pesados
      if (retries > 0 && !isAuth) {
        const delay = 800 * (3 - retries);
        await new Promise(resolve => setTimeout(resolve, delay));
        return request(url, options, retries - 1);
      }
      
      throw err;
    } finally {
      if (isGet || isAuth) inflightRequests.delete(cacheKey || normalizedUrl);
    }
  })();

  if (isGet || isAuth) inflightRequests.set(cacheKey || normalizedUrl, promise);
  return promise;
}

export const api = {
  version: '1.6.3',
  // Helper para obtener la URL completa de medios (videos/imágenes)
  getMediaUrl: (path) => {
    if (!path || typeof path !== 'string') return '';
    // Si ya es una URL completa (http/https/cloudinary), devolverla tal cual
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    
    // Normalizar la ruta eliminando el slash inicial si existe
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    
    // Asegurar que BACKEND_URL no termine en slash para evitar doble slash
    const base = BACKEND_URL.endsWith('/') ? BACKEND_URL.slice(0, -1) : BACKEND_URL;
    
    return `${base}/${cleanPath}`;
  },
  get: (url, options) => request(url, options),
  post: (url, data, options) => request(url, { ...options, method: 'POST', body: JSON.stringify(data) }),
  put: (url, data, options) => request(url, { ...options, method: 'PUT', body: JSON.stringify(data) }),
  delete: (url, options) => request(url, { ...options, method: 'DELETE' }),
  request: (url, options) => request(url, options), // Soporte para api.request que se usa en algunos archivos
  auth: {
    login: (telefono, password, deviceId) => request('/auth/login', { method: 'POST', body: JSON.stringify({ telefono, password, deviceId }) }),
    register: (data) => request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  },
  users: {
    me: () => request('/users/me'),
    update: (data) => request('/users/me', { method: 'PUT', body: JSON.stringify(data) }),
    stats: () => request('/users/stats'),
    earnings: () => request('/users/earnings'),
    team: () => request('/users/team'),
    teamReport: () => request('/users/team-report'),
    tarjetas: () => request('/users/tarjetas'),
    addTarjeta: (data) => request('/users/tarjetas', { method: 'POST', body: JSON.stringify(data) }),
    deleteTarjeta: (id) => request(`/users/tarjetas/${id}`, { method: 'DELETE' }),
    notificaciones: () => request('/users/notificaciones'),
    mensajes: () => request('/users/mensajes'),
    changePassword: (data) => request('/users/change-password', { method: 'POST', body: JSON.stringify(data) }),
    changeFundPassword: (data) => request('/users/change-fund-password', { method: 'POST', body: JSON.stringify(data) }),
  },
  tasks: {
    list: () => request('/tasks'),
    get: (id) => request(`/tasks/${id}`),
    responder: (id, respuesta) => request(`/tasks/${id}/responder`, { method: 'POST', body: JSON.stringify({ respuesta }) }),
  },
  levels: {
    list: () => request('/levels'),
    ganancias: () => request('/levels/ganancias'),
  },
  recharges: {
    metodos: () => request('/recharges/metodos'),
    list: () => request('/recharges'),
    create: (data) => request('/recharges', { method: 'POST', body: JSON.stringify(data) }),
  },
  withdrawals: {
    montos: () => request('/withdrawals/montos'),
    list: () => request('/withdrawals'),
    create: (data) => request('/withdrawals', { method: 'POST', body: JSON.stringify(data) }),
  },
  banners: () => request('/banners'),
  publicContent: () => request('/public-content'),
  sorteo: {
    config: () => request('/sorteo/config'),
    premios: () => request('/sorteo/premios'),
    historial: () => request('/sorteo/historial'),
    girar: () => request('/sorteo/girar', { method: 'POST' }),
  },
  admin: {
    dashboard: () => request('/admin/dashboard'),
    admins: () => request('/admin/admins'),
    crearAdmin: (data) => request('/admin/admins', { method: 'POST', body: JSON.stringify(data) }),
    updateAdmin: (id, data) => request(`/admin/admins/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    eliminarAdmin: (id) => request(`/admin/admins/${id}`, { method: 'DELETE' }),
    usuarios: () => request('/admin/usuarios'),
    usuarioEarnings: (id) => request(`/admin/usuarios/${id}/earnings`),
    ajusteUsuario: (id, data) => request(`/admin/usuarios/${id}/ajuste`, { method: 'POST', body: JSON.stringify(data) }),
    updateUsuario: (id, updates) => request(`/admin/usuarios/${id}`, { method: 'PUT', body: JSON.stringify(updates) }),
    changePassword: (id, data) => request(`/admin/usuarios/${id}/password`, { method: 'POST', body: JSON.stringify(data) }),
    recargas: () => request('/admin/recargas'),
    retiros: () => request('/admin/retiros'),
    banners: () => request('/admin/banners'),
    crearBanner: (data) => request('/admin/banners', { method: 'POST', body: JSON.stringify(data) }),
    eliminarBanner: (id) => request(`/admin/banners/${id}`, { method: 'DELETE' }),
    niveles: () => request('/admin/niveles'),
    updateNivel: (id, data) => request(`/admin/niveles/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    tareas: () => request('/admin/tareas'),
    crearTarea: (data) => request('/admin/tareas', { method: 'POST', body: JSON.stringify(data) }),
    actualizarTarea: (id, data) => request(`/admin/tareas/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    eliminarTarea: (id) => request(`/admin/tareas/${id}`, { method: 'DELETE' }),
    subirVideoTarea: (file, onProgress) => {
      return new Promise((resolve, reject) => {
        const formData = new FormData();
        formData.append('video', file);
        
        const xhr = new XMLHttpRequest();
        xhr.open('POST', API + '/admin/tareas/video');
        
        const token = getToken();
        if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);

        if (onProgress && typeof onProgress === 'function') {
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              const percent = Math.round((e.loaded * 100) / e.total);
              onProgress(percent);
            }
          };
        }

        xhr.onload = () => {
          let data = {};
          try {
            data = JSON.parse(xhr.responseText);
          } catch (e) {
            data = { error: 'Error al procesar respuesta del servidor' };
          }

          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(data);
          } else {
            reject(new Error(data.error || 'Error al subir video'));
          }
        };

        xhr.onerror = () => reject(new Error('Error de conexión al subir video'));
        xhr.send(formData);
      });
    },
    aprobarRecarga: (id) => request(`/admin/recargas/${id}/aprobar`, { method: 'POST' }),
    rechazarRecarga: (id, motivo) => request(`/admin/recargas/${id}/rechazar`, { method: 'POST', body: JSON.stringify({ motivo }) }),
    aprobarRetiro: (id) => request(`/admin/retiros/${id}/aprobar`, { method: 'POST' }),
    rechazarRetiro: (id, motivo) => request(`/admin/retiros/${id}/rechazar`, { method: 'POST', body: JSON.stringify({ motivo }) }),
    metodosQr: () => request('/admin/metodos-qr'),
    metodosQrAll: () => request('/admin/metodos-qr-all'),
    crearMetodoQr: (data) => request('/admin/metodos-qr', { method: 'POST', body: JSON.stringify(data) }),
    actualizarMetodoQr: (id, data) => request(`/admin/metodos-qr/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    eliminarMetodoQr: (id) => request(`/admin/metodos-qr/${id}`, { method: 'DELETE' }),
    premiosRuleta: () => request('/admin/premios-ruleta'),
    crearPremioRuleta: (data) => request('/admin/premios-ruleta', { method: 'POST', body: JSON.stringify(data) }),
    actualizarPremioRuleta: (id, data) => request(`/admin/premios-ruleta/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    eliminarPremioRuleta: (id) => request(`/admin/premios-ruleta/${id}`, { method: 'DELETE' }),
    regalarTickets: (data) => request('/admin/regalar-tickets', { method: 'POST', body: JSON.stringify(data) }),
    publicContent: () => request('/admin/public-content'),
    updatePublicContent: (data) => request('/admin/public-content', { method: 'PUT', body: JSON.stringify(data) }),
    mensajes: () => request('/admin/mensajes'),
    crearMensaje: (data) => request('/admin/mensajes', { method: 'POST', body: JSON.stringify(data) }),
    eliminarMensaje: (id) => request(`/admin/mensajes/${id}`, { method: 'DELETE' }),
    telegram: {
      equipos: () => request('/admin/telegram/equipos'),
      crearEquipo: (data) => request('/admin/telegram/equipos', { method: 'POST', body: JSON.stringify(data) }),
      updateEquipo: (id, data) => request(`/admin/telegram/equipos/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
      eliminarEquipo: (id) => request(`/admin/telegram/equipos/${id}`, { method: 'DELETE' }),
      integrantes: () => request('/admin/telegram/integrantes'),
      crearIntegrante: (data) => request('/admin/telegram/integrantes', { method: 'POST', body: JSON.stringify(data) }),
      updateIntegrante: (id, data) => request(`/admin/telegram/integrantes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
      eliminarIntegrante: (id) => request(`/admin/telegram/integrantes/${id}`, { method: 'DELETE' }),
      horarios: () => request('/admin/telegram/horarios'),
      updateHorarios: (data) => request('/admin/telegram/horarios', { method: 'PUT', body: JSON.stringify(data) }),
      usuarios: () => request('/admin/telegram/usuarios'),
      crearUsuario: (data) => request('/admin/telegram/usuarios', { method: 'POST', body: JSON.stringify(data) }),
      updateUsuario: (id, data) => request(`/admin/telegram/usuarios/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
      eliminarUsuario: (id) => request(`/admin/telegram/usuarios/${id}`, { method: 'DELETE' }),
      historial: () => request('/admin/telegram/historial'),
    },
    calendario: () => request('/admin/calendario'),
    crearCalendario: (data) => request('/admin/calendario', { method: 'POST', body: JSON.stringify(data) }),
    eliminarCalendario: (fecha) => request(`/admin/calendario/${fecha}`, { method: 'DELETE' }),
    cuestionarios: () => request('/admin/cuestionarios'),
    crearCuestionario: (data) => request('/admin/cuestionarios', { method: 'POST', body: JSON.stringify(data) }),
    eliminarCuestionario: (id) => request(`/admin/cuestionarios/${id}`, { method: 'DELETE' }),
    respuestasCuestionario: () => request('/admin/cuestionario/respuestas'),
  },
};
