-- BCB GLOBAL - SaaS Commercial Schema (v20.0.0)
-- Billing, Planes, Límites de uso y Onboarding.

SET FOREIGN_KEY_CHECKS = 0;

-- 1. TABLA: PLANES (Oferta comercial)
CREATE TABLE IF NOT EXISTS saas_plans (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  price_monthly DECIMAL(20, 2) DEFAULT 0.00,
  max_users INT DEFAULT 10,
  max_withdrawals_daily INT DEFAULT 100,
  features JSON, -- ["fraud_detection", "chaos_testing", "api_v2"]
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. ACTUALIZACIÓN TENANTS: Relación con Plan y Billing
ALTER TABLE tenants ADD COLUMN plan_id VARCHAR(36) AFTER slug;
ALTER TABLE tenants ADD COLUMN subscription_status ENUM('active', 'suspended', 'past_due', 'trial') DEFAULT 'trial' AFTER status;
ALTER TABLE tenants ADD COLUMN trial_ends_at TIMESTAMP NULL AFTER subscription_status;
ALTER TABLE tenants ADD COLUMN billing_cycle_day INT DEFAULT 1 AFTER trial_ends_at;
ALTER TABLE tenants ADD FOREIGN KEY (plan_id) REFERENCES saas_plans(id) ON DELETE SET NULL;

-- 3. TABLA: USO DE RECURSOS (Para límites y facturación)
CREATE TABLE IF NOT EXISTS tenant_usage (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tenant_id VARCHAR(36) NOT NULL,
  metric_name VARCHAR(50) NOT NULL, -- 'users_count', 'withdrawals_today'
  current_value INT DEFAULT 0,
  last_reset DATE,
  UNIQUE KEY idx_tenant_metric (tenant_id, metric_name),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. TABLA: FACTURAS / PAGOS
CREATE TABLE IF NOT EXISTS saas_invoices (
  id VARCHAR(36) PRIMARY KEY,
  tenant_id VARCHAR(36) NOT NULL,
  amount DECIMAL(20, 2) NOT NULL,
  status ENUM('pending', 'paid', 'failed', 'cancelled') DEFAULT 'pending',
  billing_period_start DATE,
  billing_period_end DATE,
  payment_method VARCHAR(50),
  pdf_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. TABLA: AUDITORÍA GLOBAL SAAS (Logs inmutables - Append Only)
CREATE TABLE IF NOT EXISTS saas_audit_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  tenant_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36),
  action VARCHAR(100) NOT NULL,
  resource VARCHAR(50) NOT NULL,
  resource_id VARCHAR(36),
  details JSON,
  ip_address VARCHAR(45),
  hash_chain VARCHAR(64), -- Hash del log anterior para inmutabilidad
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_audit_tenant (tenant_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- TRIGGER PARA EVITAR DELETE/UPDATE (Inmutabilidad DB)
DELIMITER //
CREATE TRIGGER IF NOT EXISTS tr_audit_logs_immutable_update
BEFORE UPDATE ON saas_audit_logs
FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Audit logs are immutable and cannot be updated.';
END //

CREATE TRIGGER IF NOT EXISTS tr_audit_logs_immutable_delete
BEFORE DELETE ON saas_audit_logs
FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Audit logs are immutable and cannot be deleted.';
END //
DELIMITER ;

-- INSERTAR PLANES INICIALES
INSERT IGNORE INTO saas_plans (id, name, price_monthly, max_users, max_withdrawals_daily, features) VALUES 
('plan-startup', 'Startup', 99.00, 10, 100, '["telegram_withdrawals", "basic_fraud"]'),
('plan-enterprise', 'Enterprise', 499.00, 100, 5000, '["telegram_withdrawals", "advanced_fraud", "chaos_testing", "api_v2", "sla_reporting"]'),
('plan-global', 'Global Scaler', 1499.00, 999999, 999999, '["all_features", "dedicated_support", "multi_region"]');

SET FOREIGN_KEY_CHECKS = 1;
