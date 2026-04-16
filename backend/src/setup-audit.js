import { query } from './config/db.js';

async function setupAuditSystem() {
  console.log("--- CONFIGURANDO SISTEMA DE AUDITORÍA Y SEGURIDAD ---");
  
  try {
    // 1. Tabla usuarios_telegram (por si acaso no se creó correctamente antes)
    await query(`
      CREATE TABLE IF NOT EXISTS usuarios_telegram (
        id INT AUTO_INCREMENT PRIMARY KEY,
        telegram_id BIGINT UNIQUE NOT NULL,
        nombre VARCHAR(255) NOT NULL,
        rol ENUM('admin', 'retiro', 'secretaria') NOT NULL DEFAULT 'secretaria',
        activo BOOLEAN NOT NULL DEFAULT TRUE,
        fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log("✅ Tabla usuarios_telegram verificada.");

    // 2. Tabla historial_retiros para auditoría
    await query(`
      CREATE TABLE IF NOT EXISTS historial_retiros (
        id INT AUTO_INCREMENT PRIMARY KEY,
        retiro_id INT NOT NULL,
        accion VARCHAR(50) NOT NULL,
        usuario VARCHAR(255) NOT NULL,
        telegram_id BIGINT NOT NULL,
        fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
        detalles TEXT,
        INDEX (retiro_id),
        INDEX (telegram_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log("✅ Tabla historial_retiros creada.");

    console.log("🚀 Sistema de auditoría listo.");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error en configuración:", error.message);
    process.exit(1);
  }
}

setupAuditSystem();
