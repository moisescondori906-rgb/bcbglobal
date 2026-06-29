import { v4 as uuidv4 } from 'uuid';
import { query, queryOne, transaction } from '../config/db.mjs';
import logger from '../utils/logger.mjs';

/**
 * Servicio para gestionar códigos QR de cobro
 */

/**
 * Registrar un nuevo QR recibido
 * @param {Object} data - Datos del QR
 * @returns {Promise<Object>} QR registrado
 */
export async function registrarQR(data) {
  const {
    qr_original_id = null,
    usuario_id = null,
    imagen_url,
    monto = null,
    numero_cuenta = null,
    observaciones = null,
    telegram_chat_id = null,
    telegram_message_id = null
  } = data;

  const id = uuidv4();

  await query(`
    INSERT INTO qr_registros (
      id, qr_original_id, usuario_id, imagen_url, monto, numero_cuenta,
      observaciones, telegram_chat_id, telegram_message_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    id, qr_original_id, usuario_id, imagen_url, monto, numero_cuenta,
    observaciones, telegram_chat_id, telegram_message_id
  ]);

  logger.info(`[QR SERVICE] QR registrado exitosamente: ${id}`);
  return await obtenerQRPorId(id);
}

/**
 * Obtener un QR por ID (UUID o numérico)
 * @param {string} id - ID del QR (UUID o numérico)
 * @returns {Promise<Object|null>} QR encontrado o null
 */
export async function obtenerQRPorId(id) {
  const result = await queryOne(`
    SELECT 
      qr.*,
      u.nombre_real AS usuario_nombre,
      u.telefono AS usuario_telefono
    FROM qr_registros qr
    LEFT JOIN usuarios u ON qr.usuario_id = u.id
    WHERE qr.id = ? OR qr.qr_original_id = ?
  `, [id, id]);

  return result || null;
}

/**
 * Obtener todos los QR pagados
 * @returns {Promise<Array>} Lista de QR pagados
 */
export async function obtenerQRPagados() {
  const results = await query(`
    SELECT 
      qr.*,
      u.nombre_real AS usuario_nombre,
      u.telefono AS usuario_telefono,
      admin.nombre_usuario AS procesado_por_nombre
    FROM qr_registros qr
    LEFT JOIN usuarios u ON qr.usuario_id = u.id
    LEFT JOIN usuarios admin ON qr.procesado_por = admin.id
    WHERE qr.estado = 'pagado'
    ORDER BY qr.created_at DESC
  `);
  return results.map(r => ({ ...r, pagado: true }));
}

/**
 * Obtener todos los QR no pagados
 * @returns {Promise<Array>} Lista de QR no pagados
 */
export async function obtenerQRNoPagados() {
  const results = await query(`
    SELECT 
      qr.*,
      u.nombre_real AS usuario_nombre,
      u.telefono AS usuario_telefono,
      admin.nombre_usuario AS procesado_por_nombre
    FROM qr_registros qr
    LEFT JOIN usuarios u ON qr.usuario_id = u.id
    LEFT JOIN usuarios admin ON qr.procesado_por = admin.id
    WHERE qr.estado = 'no_pagado'
    ORDER BY qr.created_at DESC
  `);
  return results.map(r => ({ ...r, pagado: false }));
}

/**
 * Marcar un QR como pagado
 * @param {string} id - ID del QR (UUID o numérico)
 * @param {string} adminId - ID del administrador que marca como pagado
 * @returns {Promise<Object>} QR actualizado
 */
export async function marcarQRComoPagado(id, adminId) {
  await transaction(async (conn) => {
    await conn.query(`
      UPDATE qr_registros 
      SET estado = 'pagado', fecha_pagado = NOW(), procesado_por = ?, updated_at = NOW()
      WHERE id = ? OR qr_original_id = ?
    `, [adminId, id, id]);
  });

  logger.info(`[QR SERVICE] QR marcado como pagado: ${id}`);
  return await obtenerQRPorId(id);
}

/**
 * Marcar un QR como no pagado (para corregir)
 * @param {string} id - ID del QR
 * @param {string} adminId - ID del administrador
 * @returns {Promise<Object>} QR actualizado
 */
export async function marcarQRComoNoPagado(id, adminId) {
  await transaction(async (conn) => {
    await conn.query(`
      UPDATE qr_registros 
      SET estado = 'no_pagado', fecha_pagado = NULL, procesado_por = ?, updated_at = NOW()
      WHERE id = ?
    `, [adminId, id]);
  });

  logger.info(`[QR SERVICE] QR marcado como no pagado: ${id}`);
  return await obtenerQRPorId(id);
}

/**
 * Eliminar un QR (por si es necesario)
 * @param {string} id - ID del QR
 * @returns {Promise<boolean>} True si se eliminó
 */
export async function eliminarQR(id) {
  await query(`DELETE FROM qr_registros WHERE id = ?`, [id]);
  logger.info(`[QR SERVICE] QR eliminado: ${id}`);
  return true;
}

/**
 * Buscar QR por usuario o fecha
 * @param {Object} filtros - Filtros de búsqueda
 * @returns {Promise<Array>} Lista de QR encontrados
 */
export async function buscarQR(filtros) {
  let whereClause = '1=1';
  const params = [];

  if (filtros.usuario_id) {
    whereClause += ' AND qr.usuario_id = ?';
    params.push(filtros.usuario_id);
  }

  if (filtros.estado) {
    whereClause += ' AND qr.estado = ?';
    params.push(filtros.estado);
  }

  if (filtros.fecha_inicio) {
    whereClause += ' AND qr.created_at >= ?';
    params.push(filtros.fecha_inicio);
  }

  if (filtros.fecha_fin) {
    whereClause += ' AND qr.created_at <= ?';
    params.push(filtros.fecha_fin);
  }

  const results = await query(`
    SELECT 
      qr.*,
      u.nombre_real AS usuario_nombre,
      u.telefono AS usuario_telefono
    FROM qr_registros qr
    LEFT JOIN usuarios u ON qr.usuario_id = u.id
    WHERE ${whereClause}
    ORDER BY qr.created_at DESC
  `, params);

  return results;
}

export default {
  registrarQR,
  obtenerQRPorId,
  obtenerQRPagados,
  obtenerQRNoPagados,
  marcarQRComoPagado,
  marcarQRComoNoPagado,
  eliminarQR,
  buscarQR
};
