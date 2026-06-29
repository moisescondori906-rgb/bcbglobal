import { queryOne } from './src/config/db.mjs';
async function check() {
  try {
    const row = await queryOne("SELECT id, estado, estado_operativo, tomado_por_nombre FROM retiros WHERE id = '21de8a29-5139-4be8-81fc-507469a29c96'");
    console.log("WITHDRAWAL STATUS:");
    console.log(JSON.stringify(row, null, 2));
  } catch (e) {
    console.error(e);
  }
  process.exit();
}
check();
