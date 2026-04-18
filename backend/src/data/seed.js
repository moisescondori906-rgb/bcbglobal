import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

export const levels = [
  { id: 'l1', codigo: 'internar', nombre: 'Internar', deposito: 0, num_tareas_diarias: 2, ganancia_tarea: 1.30, orden: 0, activo: true },
  { id: 'l2', codigo: 'global1', nombre: 'GLOBAL 1', deposito: 200.00, num_tareas_diarias: 4, ganancia_tarea: 1.80, orden: 1, activo: true },
  { id: 'l3', codigo: 'global2', nombre: 'GLOBAL 2', deposito: 720.00, num_tareas_diarias: 8, ganancia_tarea: 3.22, orden: 2, activo: true },
  { id: 'l4', codigo: 'global3', nombre: 'GLOBAL 3', deposito: 2830.00, num_tareas_diarias: 15, ganancia_tarea: 6.76, orden: 3, activo: true },
  { id: 'l5', codigo: 'global4', nombre: 'GLOBAL 4', deposito: 9150.00, num_tareas_diarias: 30, ganancia_tarea: 11.33, orden: 4, activo: true },
  { id: 'l6', codigo: 'global5', nombre: 'GLOBAL 5', deposito: 28200.00, num_tareas_diarias: 60, ganancia_tarea: 17.43, orden: 5, activo: true },
  { id: 'l7', codigo: 'global6', nombre: 'GLOBAL 6', deposito: 58000.00, num_tareas_diarias: 100, ganancia_tarea: 22.35, orden: 6, activo: true },
  { id: 'l8', codigo: 'global7', nombre: 'GLOBAL 7', deposito: 124000.00, num_tareas_diarias: 160, ganancia_tarea: 31.01, orden: 7, activo: true },
  { id: 'l9', codigo: 'global8', nombre: 'GLOBAL 8', deposito: 299400.00, num_tareas_diarias: 250, ganancia_tarea: 47.91, orden: 8, activo: true },
  { id: 'l10', codigo: 'global9', nombre: 'GLOBAL 9', deposito: 541600.00, num_tareas_diarias: 400, ganancia_tarea: 58.87, orden: 9, activo: true },
];

export async function initStore() {
  const hash = await bcrypt.hash('123456', 10);
  const hashFondo = await bcrypt.hash('123456', 10);

  const adminId = uuidv4();
  const user1Id = uuidv4();

  const admin = {
    id: adminId,
    telefono: '+59170000000',
    nombre_usuario: 'admin',
    nombre_real: 'Administrador',
    password_hash: await bcrypt.hash('admin123', 10),
    password_fondo_hash: hashFondo,
    codigo_invitacion: 'ADMIN001',
    nivel_id: 'l2', // global1
    rol: 'admin',
    saldo_principal: 0,
    saldo_comisiones: 0,
    bloqueado: false,
  };

  const user1 = {
    id: user1Id,
    telefono: '+59174344916',
    nombre_usuario: 'alexj',
    nombre_real: 'Alexander Jimenez',
    password_hash: hash,
    password_fondo_hash: hashFondo,
    codigo_invitacion: 'VUSBV2GTX',
    invitado_por: null,
    nivel_id: 'l1', // internar
    saldo_principal: 14.40,
    saldo_comisiones: 28.80,
    rol: 'usuario',
    bloqueado: false,
  };

  // Generamos tareas limpias con nombres reales de marcas y URLs de video
  // REGLA: Las tareas son globales, el pago lo define el nivel del usuario.
  const tasks = [
    { id: uuidv4(), nombre: 'Adidas Global', video_url: '/video/adidas1.mp4', descripcion: 'Nueva campaña Adidas 2026', pregunta: '¿Qué marca viste?', respuesta_correcta: 'ADIDAS', opciones: ['ADIDAS', 'NIKE', 'PUMA', 'REEBOK'], orden: 0 },
    { id: uuidv4(), nombre: 'Coca-Cola Summer', video_url: '/video/cocacola1.mp4', descripcion: 'Refrescante sabor Coca-Cola', pregunta: '¿Qué marca viste?', respuesta_correcta: 'COCACOLA', opciones: ['COCACOLA', 'PEPSI', 'SPRITE', 'FANTA'], orden: 1 },
    { id: uuidv4(), nombre: 'Chanel Classic', video_url: '/video/chanel1.mp4', descripcion: 'Elegancia atemporal Chanel', pregunta: '¿Qué marca viste?', respuesta_correcta: 'CHANEL', opciones: ['CHANEL', 'DIOR', 'GUCCI', 'PRADA'], orden: 2 },
    { id: uuidv4(), nombre: 'Dior Fashion', video_url: '/video/dior1.mp4', descripcion: 'Alta costura con Dior', pregunta: '¿Qué marca viste?', respuesta_correcta: 'DIOR', opciones: ['DIOR', 'CHANEL', 'HERMES', 'PRADA'], orden: 3 },
    { id: uuidv4(), nombre: 'Nike Air Max', video_url: '/video/nike1.mp4', descripcion: 'Innovación en cada paso', pregunta: '¿Qué marca viste?', respuesta_correcta: 'NIKE', opciones: ['NIKE', 'ADIDAS', 'PUMA', 'REEBOK'], orden: 4 },
    { id: uuidv4(), nombre: 'Puma Speed', video_url: '/video/puma1.mp4', descripcion: 'Diseño y velocidad Puma', pregunta: '¿Qué marca viste?', respuesta_correcta: 'PUMA', opciones: ['PUMA', 'NIKE', 'ADIDAS', 'REEBOK'], orden: 5 },
    { id: uuidv4(), nombre: 'Rolex Luxury', video_url: '/video/rolex1.mp4', descripcion: 'Precisión y prestigio Rolex', pregunta: '¿Qué marca viste?', respuesta_correcta: 'ROLEX', opciones: ['ROLEX', 'OMEGA', 'CASIO', 'CARTIER'], orden: 6 },
    { id: uuidv4(), nombre: 'Lamborghini F8', video_url: '/video/lamborghini1.mp4', descripcion: 'Potencia pura en pista', pregunta: '¿Qué marca viste?', respuesta_correcta: 'LAMBORGHINI', opciones: ['LAMBORGHINI', 'FERRARI', 'PORSCHE', 'MCLAREN'], orden: 7 },
  ];

  const banners = [
    { id: uuidv4(), imagen_url: '/imag/carrusel1.png', titulo: 'Bienvenido', orden: 0, activo: true },
    { id: uuidv4(), imagen_url: '/imag/carrusel2.png', titulo: 'Gana Diariamente', orden: 1, activo: true },
  ];

  const metodosQr = [
    { id: uuidv4(), nombre_titular: 'Global Oficial', imagen_qr_url: '', imagen_base64: null, activo: true, orden: 0 },
  ];

  const mensajesGlobales = [
    { 
      id: uuidv4(), 
      titulo: 'Bienvenida a BCB Global v7.0.0', 
      contenido: 'Estamos emocionados de lanzar nuestra nueva plataforma institucional con sede en Colorado, USA. Disfruta de una experiencia premium y segura.', 
      imagen_url: null,
      fecha: new Date().toISOString() 
    },
    { 
      id: uuidv4(), 
      titulo: 'Nuevo Sistema de Retiros', 
      contenido: 'Recuerda que los retiros ahora se procesan según tu nivel Global: Martes (G1), Miércoles (G2), Jueves (G3), Viernes (G4), Sábado y Domingo (G5+).', 
      imagen_url: null,
      fecha: new Date(Date.now() - 86400000).toISOString() 
    }
  ];

  return {
    users: [admin, user1],
    levels,
    tasks,
    metodosQr,
    banners,
    mensajesGlobales,
    tarjetas: [],
    retiros: [],
    recargas: [],
    transacciones: [],
    notificaciones: [
      { id: uuidv4(), usuario_id: user1Id, titulo: 'Bienvenido', mensaje: '¡Bienvenido a la nueva plataforma Global!', leida: false },
    ],
    publicContent: {
      home_guide: 'Liderando el futuro publicitario.',
      popup_title: 'Actualización Global',
      popup_message: 'Hemos mejorado el sistema de tareas para tu comodidad.',
      popup_enabled: true,
      conferencia_title: 'Próximos eventos',
      conferencia_noticias: '• Reunión informativa todos los sábados.',
      horario_recarga: { enabled: false, dias_semana: [1, 2, 3, 4, 5, 6, 0], hora_inicio: '09:00', hora_fin: '18:00' },
      horario_retiro: { enabled: false, dias_semana: [1, 2, 3, 4, 5, 6, 0], hora_inicio: '09:00', hora_fin: '18:00' },
    },
  };
}
