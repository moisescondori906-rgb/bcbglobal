
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { createUser, findUserByTelefono, updateUser, getLevels } from './src/lib/queries.js';

async function createRequestedUsers() {
  try {
    console.log('--- Depuración de Configuración ---');
    console.log('DB Host:', process.env.MYSQL_HOST);
    console.log('DB User:', process.env.MYSQL_USER);
    console.log('DB Database:', process.env.MYSQL_DATABASE);
    
    const levels = await getLevels();
    const defaultLevel = levels.find(l => l.codigo === 'pasante' || l.nombre === 'pasante' || l.codigo === 'internar') || levels[0];

    const usersToCreate = [
      {
        num: '77474230',
        nombre: 'santalla',
        pass: 'contraseña123456',
        rol: 'usuario'
      },
      {
        num: '67091817',
        nombre: 'admin_67091817',
        pass: 'admin123',
        rol: 'admin'
      },
      {
        num: '70638375',
        nombre: 'usuario_70638375',
        pass: 'admin123',
        rol: 'usuario'
      }
    ];

    console.log('--- Iniciando Creación de Usuarios Solicitados ---');

    for (const u of usersToCreate) {
      const telefono = `+591${u.num}`;
      const password_hash = await bcrypt.hash(u.pass, 10);
      const existingUser = await findUserByTelefono(telefono);

      if (existingUser) {
        console.log(`🔄 Actualizando usuario existente: ${telefono}...`);
        await updateUser(existingUser.id, {
          password_hash,
          nombre_usuario: u.nombre,
          rol: u.rol,
          bloqueado: false
        });
        console.log(`✅ ${telefono} actualizado correctamente.`);
      } else {
        console.log(`🆕 Creando nuevo usuario: ${telefono}...`);
        const codigo_invitacion = Math.random().toString(36).slice(2, 10).toUpperCase();
        const newUser = {
          id: uuidv4(),
          telefono,
          nombre_usuario: u.nombre,
          nombre_real: u.nombre === 'santalla' ? 'Santalla' : u.nombre,
          password_hash,
          codigo_invitacion,
          invitado_por: null,
          nivel_id: defaultLevel.id,
          saldo_principal: 0,
          saldo_comisiones: 0,
          rol: u.rol,
          bloqueado: false,
          created_at: new Date().toISOString()
        };
        await createUser(newUser);
        console.log(`✅ ${telefono} creado correctamente con rol: ${u.rol}.`);
      }
    }

    console.log('-----------------------------------');
    console.log('Proceso finalizado con éxito.');
  } catch (error) {
    console.error('❌ Error en el proceso:', error.message);
  } finally {
    process.exit();
  }
}

createRequestedUsers();
