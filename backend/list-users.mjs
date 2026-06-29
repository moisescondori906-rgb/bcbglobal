
import { query } from './src/config/db.mjs';

async function listUsers() {
  try {
    console.log('📋 Listando usuarios en la base de datos...\n');
    const users = await query('SELECT id, telefono, nombre_usuario, nombre_real, rol FROM usuarios LIMIT 20');
    
    if (!users || users.length === 0) {
      console.log('❌ No hay usuarios en la base de datos.');
      return;
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    users.forEach((user, index) => {
      console.log(`${index + 1}. 🆔 ${user.id.substring(0, 8)}...`);
      console.log(`   📱 Teléfono: ${user.telefono}`);
      console.log(`   👤 Username: ${user.nombre_usuario}`);
      console.log(`   📛 Nombre: ${user.nombre_real || 'N/A'}`);
      console.log(`   🎖️ Rol: ${user.rol}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    });
  } catch (err) {
    console.error('❌ Error al listar usuarios:', err.message);
  } finally {
    process.exit();
  }
}

listUsers();
