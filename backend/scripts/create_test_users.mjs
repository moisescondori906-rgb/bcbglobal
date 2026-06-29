import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../src/services/dbService.mjs';
import logger from '../src/utils/logger.mjs';

const generateSecurePassword = async () => {
  const password = Math.random().toString(36).slice(-10) + Math.random().toString(36).toUpperCase().slice(-5) + '!@#$'.charAt(Math.floor(Math.random() * 4));
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);
  return { password, hashedPassword };
};

const createTestUser = async (userData) => {
  const { password, hashedPassword } = await generateSecurePassword();
  const userId = uuidv4();
  const invitationCode = uuidv4().slice(0, 8).toUpperCase();

  const user = {
    id: userId,
    tenant_id: 'default-tenant-uuid',
    telefono: userData.telefono,
    nombre_usuario: userData.nombre_usuario,
    nombre_real: userData.nombre_real || userData.nombre_usuario,
    password_hash: hashedPassword,
    password_fondo_hash: null, // Assuming no second password for test users
    codigo_invitacion: invitationCode,
    invitado_por: userData.invitado_por || null,
    nivel_id: userData.nivel_id || null, // Assuming no specific level for test users initially
    avatar_url: null,
    saldo_principal: 0.00,
    saldo_comisiones: 0.00,
    rol: userData.rol,
    status: 'active',
    bloqueado: 0,
    security_alert: null,
    telegram_user_id: null,
    telegram_username: null,
    tickets_ruleta: 0,
    primer_ascenso_completado: 0,
    last_device_id: null,
    hor_inicio_turno: '00:00:00',
    hora_fin_turno: '23:59:59',
    dias_semana: '0,1,2,3,4,5,6',
    activo: 1,
    recibe_notificaciones: 1,
  };

  const sql = `
    INSERT INTO usuarios (
      id, tenant_id, telefono, nombre_usuario, nombre_real, password_hash,
      password_fondo_hash, codigo_invitacion, invitado_por, nivel_id,
      avatar_url, saldo_principal, saldo_comisiones, rol, status, bloqueado,
      security_alert, telegram_user_id, telegram_username, tickets_ruleta,
      primer_ascenso_completado, last_device_id, hor-inicio_turno, hora_fin_turno,
      dias_semana, activo, recibe_notificaciones
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    )
  `;
  const params = Object.values(user);

  try {
    await query(sql, params);
    logger.info(`Usuario creado: ${user.nombre_usuario} (${user.rol})`);
    return { ...user, plainPassword: password };
  } catch (error) {
    logger.error(`Error al crear usuario ${user.nombre_usuario}: ${error.message}`);
    throw error;
  }
};

export const run = async () => {
  logger.info('Iniciando creación de usuarios de prueba...');

  const adminUserData = {
    telefono: '+59170000001',
    nombre_usuario: 'admin_test',
    nombre_real: 'Administrador de Prueba',
    rol: 'admin',
    email: 'admin@example.com' // Adding email for clarity in output, not stored in DB currently
  };

  const normalUser1Data = {
    telefono: '+59170000002',
    nombre_usuario: 'user_normal_1',
    nombre_real: 'Usuario Normal Uno',
    rol: 'usuario',
    email: 'user1@example.com'
  };

  const normalUser2Data = {
    telefono: '+59170000003',
    nombre_usuario: 'user_normal_2',
    nombre_real: 'Usuario Normal Dos',
    rol: 'usuario',
    email: 'user2@example.com'
  };

  const createdUsers = [];

  try {
    const adminUser = await createTestUser(adminUserData);
    createdUsers.push(adminUser);

    const user1 = await createTestUser(normalUser1Data);
    createdUsers.push(user1);

    const user2 = await createTestUser(normalUser2Data);
    createdUsers.push(user2);

    logger.info('\n--- Usuarios de Prueba Creados ---');
    createdUsers.forEach(user => {
      logger.info(`
- Rol: ${user.rol}
- Nombre de Usuario: ${user.nombre_usuario}
- Teléfono: ${user.telefono}
- Email: ${user.email || 'N/A'}
- Contraseña: ${user.plainPassword}
- ID: ${user.id}
      `);
    });
    logger.info('----------------------------------');

  } catch (error) {
    logger.error('Fallo la creación de usuarios de prueba.');
    process.exit(1);
  } finally {
    // Note: In a real scenario, you might want to close DB connection if this script is standalone
    // For now, assuming dbService manages its pool.
  }
};

// If run directly, execute the run function
if (import.meta.url === `file://${process.argv[1]}`) {
  run();
}
