import { query } from './src/config/db.mjs';
async function check() {
  try {
    const rows = await query("SELECT referencia_id, tipo_operacion, estado_operativo, tomado_por_nombre, created_at FROM telegram_casos_bloqueo ORDER BY created_at DESC LIMIT 10");
    console.log("RECENT TELEGRAM CASES:");
    console.table(rows);
  } catch (e) {
    console.error(e);
  }
  process.exit();
}
check();
