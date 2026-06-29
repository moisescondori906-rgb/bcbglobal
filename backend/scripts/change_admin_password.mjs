
import bcrypt from 'bcryptjs';
import { query, queryOne } from '../src/config/db.mjs';
import { findUserByTelefono, getCanonicalTelefono } from '../src/services/dbService.mjs';

console.log('=== Script para cambiar contraseña de usuario ===');

const TELEFONO = '+59174344916'; // El teléfono del usuario
const NUEVA_CONTRASENA = '14738941lp'; // La nueva contraseña

async function cambiarContrasena() {
  try {
    console.log(`Buscando usuario con teléfono: ${TELEFONO}...`);
    const usuario = await findUserByTelefono(TELEFONO);

    if (!usuario) {
      console.error('ERROR: Usuario no encontrado!');
      process.exit(1);
    }

    console.log(`Usuario encontrado: ${usuario.nombre_usuario} (ID: ${usuario.id})`);

    // Hashear la nueva contraseña
    const hashedPassword = await bcrypt.hash(NUEVA_CONTRASENA, 10);

    // Actualizar la contraseña en la base de datos
    await query('UPDATE usuarios SET password_hash = ? WHERE id = ?', [hashedPassword, usuario.id]);

    console.log('=== Contraseña cambiada exitosamente! ===');
    console.log(`Teléfono: ${TELEFONO}`);
    console.log(`Nueva contraseña: ${NUEVA_CONTRASENA}`);
    process.exit(0);
  } catch (err) {
    console.error('ERROR:', err);
    process.exit(1);
  }
}

cambiarContrasena();
