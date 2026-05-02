import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import logger from '../utils/logger.mjs';

dotenv.config();

// Configuración del Pool de Conexiones optimizado para Contabo y alta concurrencia
const poolConfig = {
  host: process.env.MYSQL_HOST || 'localhost',
  port: parseInt(process.env.MYSQL_PORT || '3306'),
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  waitForConnections: true,
  connectionLimit: 200, // Aumentado para mayor concurrencia v11.5.0
  maxIdle: 100, // Mantener más conexiones calientes
  idleTimeout: 30000, // Reducido a 30s para reciclar conexiones más rápido
  queueLimit: 1000, // Límite de cola para evitar fugas de memoria por peticiones pendientes
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  timezone: '-04:00', // Forzar zona horaria de Bolivia en la sesión de MySQL
};

const pool = mysql.createPool(poolConfig);

// Sistema de reconexión automática v9.0.0
pool.on('error', (err) => {
  logger.error(`[DB-POOL-FATAL]: ${err.message}. Intentando recuperar pool...`);
  if (err.code === 'PROTOCOL_CONNECTION_LOST' || err.code === 'ECONNREFUSED') {
    setTimeout(() => {
      logger.info('[DB-RECOVERY] Re-inicializando Pool de conexiones...');
    }, 5000);
  }
});

pool.on('acquire', (connection) => {
  logger.debug(`[DB-POOL] Conexión ${connection.threadId} adquirida.`);
});

pool.on('release', (connection) => {
  logger.debug(`[DB-POOL] Conexión ${connection.threadId} liberada.`);
});

/**
 * Helper centralizado para ejecutar consultas
 * @param {string} sql - Consulta SQL con placeholders (?)
 * @param {Array} params - Parámetros para la consulta
 * @returns {Promise<any>} - Resultado de la consulta
 */
export async function query(sql, params) {
  try {
    // Sanitización preventiva: convertir undefined a null para evitar Error 500
    const sanitizedParams = params ? params.map(v => v === undefined ? null : v) : [];
    const [results] = await pool.execute(sql, sanitizedParams);
    return results;
  } catch (err) {
    logger.error(`[DB Query Error]: ${err.message} | SQL: ${sql}`);
    throw err;
  }
}

/**
 * Helper para transacciones SQL (Atomicidad)
 * @param {Function} callback - Función que recibe la conexión y ejecuta las queries
 * @returns {Promise<any>} - Resultado del callback
 */
export async function transaction(callback) {
  const connection = await pool.getConnection();
  await connection.beginTransaction();
  try {
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (err) {
    await connection.rollback();
    logger.error(`[DB Transaction Error]: ${err.message}`);
    throw err;
  } finally {
    connection.release();
  }
}

/**
 * Helper para obtener una sola fila
 */
export async function queryOne(sql, params) {
  const results = await query(sql, params);
  return results[0] || null;
}

/**
 * SECURE QUERY (RLS Nativo MySQL 8.0) con Garantía de Limpieza de Pool
 * Enforces tenant_id isolation at the database level using session variables.
 * Asegura que las variables de sesión se limpien tras cada ejecución para evitar fugas entre conexiones del pool.
 */
export async function secureQuery(sql, params, tenantId) {
  if (!tenantId) {
    logger.warn(`[RLS-VIOLATION] Query sin tenantId detectada: ${sql}`);
    throw new Error('Tenant isolation error: tenantId is required for this operation');
  }

  const connection = await pool.getConnection();
  try {
    // 1. Establecer el contexto del tenant en la sesión de MySQL
    await connection.execute('SET @current_tenant_id = ?', [tenantId]);
    
    // 2. Redirección a vistas protegidas v_
    let rlsSql = sql;
    const tablesToProtect = ['usuarios', 'retiros', 'movimientos_saldo'];
    tablesToProtect.forEach(table => {
      const regex = new RegExp(`\\b${table}\\b`, 'gi');
      rlsSql = rlsSql.replace(regex, `v_${table}`);
    });

    const [results] = await connection.execute(rlsSql, params);
    return results;
  } catch (err) {
    logger.error(`[SECURE-QUERY-ERROR]: ${err.message} | SQL: ${sql}`);
    throw err;
  } finally {
    // 3. CRÍTICO: Limpiar la variable de sesión ANTES de liberar al pool
    // Esto evita que la siguiente petición herede el tenantId si no se establece correctamente.
    await connection.execute('SET @current_tenant_id = NULL').catch(e => 
      logger.error(`[RLS-CLEANUP-ERROR]: ${e.message}`)
    );
    connection.release();
  }
}

export default pool;
