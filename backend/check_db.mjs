import { query } from './src/config/db.mjs';
async function check() {
  try {
    const cols = await query("SHOW COLUMNS FROM compras_nivel");
    console.log("COMPRAS_NIVEL COLUMNS:");
    console.table(cols.map(c => ({ Field: c.Field, Type: c.Type })));
    
    const colsRetiros = await query("SHOW COLUMNS FROM retiros");
    console.log("RETIROS COLUMNS:");
    console.table(colsRetiros.map(c => ({ Field: c.Field, Type: c.Type })));

    const colsBloqueo = await query("SHOW COLUMNS FROM telegram_casos_bloqueo");
    console.log("BLOQUEO COLUMNS:");
    console.table(colsBloqueo.map(c => ({ Field: c.Field, Type: c.Type })));
  } catch (e) {
    console.error(e);
  }
  process.exit();
}
check();
