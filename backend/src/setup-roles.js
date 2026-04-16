import { query } from './config/db.js';

async function setupRolesTable() {
  console.log("--- CONFIGURANDO TABLA DE ROLES TELEGRAM ---");
  
  const sql = `
    CREATE TABLE IF NOT EXISTS usuarios_telegram (
      id INT AUTO_INCREMENT PRIMARY KEY,
      telegram_id BIGINT UNIQUE NOT NULL,
      nombre VARCHAR(255) NOT NULL,
      rol ENUM('admin', 'retiro', 'secretaria') NOT NULL DEFAULT 'secretaria',
      activo BOOLEAN NOT NULL DEFAULT TRUE,
      fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  try {
    await query(sql);
    console.log("✅ Tabla usuarios_telegram lista.");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error al crear la tabla:", error.message);
    // Si falla por conexión, intentaremos mostrar el error completo
    console.error(error);
    process.exit(1);
  }
}

setupRolesTable();
