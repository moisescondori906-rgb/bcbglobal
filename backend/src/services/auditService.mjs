import { query, queryOne } from '../config/db.mjs';
import logger from '../utils/logger.mjs';
import crypto from 'crypto';

/**
 * SaaS Audit Service - Logs inmutables con Hash Chaining.
 */
export const AuditService = {
  /**
   * Registra una acción administrativa con encadenamiento de hash para inmutabilidad.
   */
  async log(req, action, resource, resourceId, details = {}) {
    const tenantId = req.tenantId;
    const userId = req.user?.id || req.requestUser?.id;
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    try {
      // 1. Obtener el hash del último log para el tenant (Encadenamiento)
      const lastLog = await queryOne(
        `SELECT hash_chain FROM saas_audit_logs WHERE tenant_id = ? ORDER BY id DESC LIMIT 1`,
        [tenantId]
      );
      const lastHash = lastLog?.hash_chain || 'genesis-block';

      // 2. Calcular nuevo hash (Inmutabilidad verificable)
      const payload = JSON.stringify({ tenantId, userId, action, resource, resourceId, details, lastHash });
      const currentHash = crypto.createHash('sha256').update(payload).digest('hex');

      await query(
        `INSERT INTO saas_audit_logs (tenant_id, user_id, action, resource, resource_id, details, ip_address, hash_chain) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [tenantId, userId, action, resource, resourceId, JSON.stringify(details), ip, currentHash]
      );

      // 3. Exportar Hash fuera del sistema (Snapshot para verificación externa)
      // Se puede enviar a un sistema de logs externo, blockchain, o archivo inmutable.
      this.exportHashToExternalSystem(tenantId, currentHash);
    } catch (err) {
      logger.error(`[AUDIT-LOG-ERROR]: ${err.message}`);
    }
  },

  /**
   * Exportación de hashes para auditoría externa.
   */
  async exportHashToExternalSystem(tenantId, hash) {
    // Simulación de exportación a S3/WORM o API de auditoría de terceros
    logger.info(`[AUDIT-EXPORT] Hash ${hash} exportado para verificación externa del tenant ${tenantId}`);
  },

  /**
   * Verifica la integridad de los logs de un tenant.
   */
  async verifyIntegrity(tenantId) {
    const logs = await query(
      `SELECT * FROM saas_audit_logs WHERE tenant_id = ? ORDER BY id ASC`,
      [tenantId]
    );

    let lastHash = 'genesis-block';
    for (const log of logs) {
      const payload = JSON.stringify({ 
        tenantId: log.tenant_id, 
        userId: log.user_id, 
        action: log.action, 
        resource: log.resource, 
        resourceId: log.resource_id, 
        details: log.details, 
        lastHash 
      });
      const calculatedHash = crypto.createHash('sha256').update(payload).digest('hex');
      
      if (calculatedHash !== log.hash_chain) {
        logger.error(`[AUDIT-INTEGRITY-FAIL] Log ID ${log.id} ha sido alterado!`);
        return false;
      }
      lastHash = log.hash_chain;
    }
    return true;
  },

  /**
   * Obtiene logs filtrados por tenant (para el panel de la empresa).
   */
  async getTenantLogs(tenantId, limit = 50, offset = 0) {
    return await query(
      `SELECT * FROM saas_audit_logs WHERE tenant_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [tenantId, limit, offset]
    );
  }
};
