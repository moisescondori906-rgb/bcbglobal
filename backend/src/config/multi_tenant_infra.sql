-- BCB GLOBAL - Multi-Tenant Infrastructure Schema (v19.0.0)
-- Aislamiento de datos y soporte para múltiples empresas.

SET FOREIGN_KEY_CHECKS = 0;

-- 1. TABLA: TENANTS (Empresas/Clientes)
CREATE TABLE IF NOT EXISTS tenants (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(50) UNIQUE NOT NULL, -- Identificador en URL o subdominio
  domain VARCHAR(255),
  api_key VARCHAR(100) UNIQUE,
  status ENUM('active', 'suspended', 'trial') DEFAULT 'active',
  config JSON, -- Configuración específica (colores, logos, límites)
  region VARCHAR(20) DEFAULT 'global',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. MIGRACIÓN DE TABLAS EXISTENTES A MULTI-TENANT
-- Se añade tenant_id a todas las tablas críticas.

ALTER TABLE usuarios ADD COLUMN tenant_id VARCHAR(36) AFTER id;
ALTER TABLE niveles ADD COLUMN tenant_id VARCHAR(36) AFTER id;
ALTER TABLE tareas ADD COLUMN tenant_id VARCHAR(36) AFTER id;
ALTER TABLE compras_nivel ADD COLUMN tenant_id VARCHAR(36) AFTER id;
ALTER TABLE retiros ADD COLUMN tenant_id VARCHAR(36) AFTER id;
ALTER TABLE movimientos_saldo ADD COLUMN tenant_id VARCHAR(36) AFTER id;
ALTER TABLE configuraciones ADD COLUMN tenant_id VARCHAR(36) AFTER clave;
ALTER TABLE feature_flags ADD COLUMN tenant_id VARCHAR(36) AFTER feature_name;
ALTER TABLE sla_metrics ADD COLUMN tenant_id VARCHAR(36) AFTER id;
ALTER TABLE fraud_alerts ADD COLUMN tenant_id VARCHAR(36) AFTER id;
ALTER TABLE tarjetas_bancarias ADD COLUMN tenant_id VARCHAR(36) AFTER id;
ALTER TABLE notificaciones ADD COLUMN tenant_id VARCHAR(36) AFTER id;

-- 3. ACTUALIZACIÓN DE INDEXES (Aislamiento por Tenant)
ALTER TABLE usuarios ADD INDEX idx_tenant_telefono (tenant_id, telefono);
ALTER TABLE retiros ADD INDEX idx_tenant_estado (tenant_id, estado);
ALTER TABLE compras_nivel ADD INDEX idx_tenant_estado (tenant_id, estado);
ALTER TABLE feature_flags ADD INDEX idx_tenant_flag (tenant_id, feature_name);

-- 4. INSERTAR TENANT DEFAULT (Para migración sin downtime)
INSERT IGNORE INTO tenants (id, name, slug, status, config) VALUES 
('default-tenant-uuid', 'BCB Global HQ', 'bcb-global', 'active', '{"theme": "dark", "max_users": 10000}');

-- 5. SEGURIDAD: RLS NATIVO (MySQL 8.0+ Session Variables)
-- Implementación de aislamiento a nivel de base de datos para evitar fugas de datos.

DELIMITER //
CREATE FUNCTION IF NOT EXISTS current_tenant() RETURNS VARCHAR(36) DETERMINISTIC NO SQL
BEGIN
  RETURN @current_tenant_id;
END //
DELIMITER ;

-- Ejemplo de Vista Protegida (Se debe aplicar a todas las tablas críticas)
-- El backend debe ejecutar: SET @current_tenant_id = 'uuid'; antes de cada query.
CREATE OR REPLACE VIEW v_usuarios AS 
SELECT * FROM usuarios WHERE tenant_id = current_tenant();

CREATE OR REPLACE VIEW v_retiros AS 
SELECT * FROM retiros WHERE tenant_id = current_tenant();

CREATE OR REPLACE VIEW v_movimientos_saldo AS 
SELECT * FROM movimientos_saldo WHERE tenant_id = current_tenant();

-- Actualizar registros existentes al tenant default
UPDATE usuarios SET tenant_id = 'default-tenant-uuid' WHERE tenant_id IS NULL;
UPDATE niveles SET tenant_id = 'default-tenant-uuid' WHERE tenant_id IS NULL;
UPDATE tareas SET tenant_id = 'default-tenant-uuid' WHERE tenant_id IS NULL;
UPDATE compras_nivel SET tenant_id = 'default-tenant-uuid' WHERE tenant_id IS NULL;
UPDATE retiros SET tenant_id = 'default-tenant-uuid' WHERE tenant_id IS NULL;
UPDATE movimientos_saldo SET tenant_id = 'default-tenant-uuid' WHERE tenant_id IS NULL;
UPDATE configuraciones SET tenant_id = 'default-tenant-uuid' WHERE tenant_id IS NULL;
UPDATE feature_flags SET tenant_id = 'default-tenant-uuid' WHERE tenant_id IS NULL;
UPDATE sla_metrics SET tenant_id = 'default-tenant-uuid' WHERE tenant_id IS NULL;
UPDATE fraud_alerts SET tenant_id = 'default-tenant-uuid' WHERE tenant_id IS NULL;
UPDATE tarjetas_bancarias SET tenant_id = 'default-tenant-uuid' WHERE tenant_id IS NULL;
UPDATE notificaciones SET tenant_id = 'default-tenant-uuid' WHERE tenant_id IS NULL;

SET FOREIGN_KEY_CHECKS = 1;
