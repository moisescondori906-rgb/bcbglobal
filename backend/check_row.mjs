import { queryOne } from './src/config/db.mjs';
async function check() {
  try {
    const row = await queryOne("SELECT * FROM telegram_casos_bloqueo WHERE referencia_id = '21de8a29-5139-4be8-81fc-507469a29c96'");
    console.log("BLOQUEO ROW:");
    console.log(JSON.stringify(row, null, 2));
  } catch (e) {
    console.error(e);
  }
  process.exit();
}
check();
