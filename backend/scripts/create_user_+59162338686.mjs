import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import 'dotenv/config';
import mysql from 'mysql2/promise';

const createUser = async () => {
  console.log('🔄 Creando usuario +59162338686...');
  
  // Conectar a la base de datos
  const connection = await mysql.createConnection({
    host: process.env.MYSQL_HOST || 'localhost',
    port: parseInt(process.env.MYSQL_PORT || '3306'),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
  });

  try {
    // Verificar si el usuario ya existe
    const [existingUsers] = await connection.query(
      'SELECT id FROM usuarios WHERE telefono = ?',
      ['+59162338686']
    );

    if (existingUsers.length > 0) {
      console.log('⚠️ El usuario ya existe. Actualizando datos...');
      
      // Hash de la contraseña
      const hashedPassword = await bcrypt.hash('123456', 10);
      
      // Actualizar usuario
      await connection.query(`
        UPDATE usuarios 
        SET nombre_usuario = ?, 
            nombre_real = ?, 
            password_hash = ?,
            last_device_id = NULL
        WHERE telefono = ?
      `, ['suyo', 'suyo', hashedPassword, '+59162338686']);

      console.log('✅ Usuario actualizado exitosamente!');
    } else {
      console.log('🆕 Creando nuevo usuario...');
      
      // Obtener nivel inicial (internar)
      const [levels] = await connection.query('SELECT id FROM niveles WHERE codigo = ? LIMIT 1', ['internar']);
      const internarLevelId = levels.length > 0 ? levels[0].id : null;

      // Generar datos del usuario
      const userId = uuidv4();
      const invitationCode = uuidv4().slice(0, 8).toUpperCase();
      const hashedPassword = await bcrypt.hash('123456', 10);

      // Insertar usuario
      const user = {
        id: userId,
        tenant_id: 'default-tenant-uuid',
        telefono: '+59162338686',
        nombre_usuario: 'suyo',
        nombre_real: 'suyo',
        password_hash: hashedPassword,
        password_fondo_hash: null,
        codigo_invitacion: invitationCode,
        invitado_por: null,
        nivel_id: internarLevelId,
        avatar_url: null,
        saldo_principal: 0.00,
        saldo_comisiones: 0.00,
        rol: 'usuario',
        status: 'active',
        bloqueado: 0,
        security_alert: null,
        telegram_user_id: null,
        telegram_username: null,
        tickets_ruleta: 1,
        primer_ascenso_completado: 0,
        last_device_id: null,
        hora_inicio_turno: '00:00:00',
        hora_fin_turno: '23:59:59',
        dias_semana: '0,1,2,3,4,5,6',
        activo: 1,
        recibe_notificaciones: 1,
      };

      const sql = `
        INSERT INTO usuarios (
          id, tenant_id, telefono, nombre_usuario, nombre_real, password_hash,
          password_fondo_hash, codigo_invitacion, invitado_por, nivel_id,
          avatar_url, saldo_principal, saldo_comisiones, rol, status, bloqueado,
          security_alert, telegram_user_id, telegram_username, tickets_ruleta,
          primer_ascenso_completado, last_device_id, hora_inicio_turno, hora_fin_turno,
          dias_semana, activo, recibe_notificaciones
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      await connection.query(sql, Object.values(user));

      // Dar ticket por registro (como si fuera un registro normal)
      try {
        await connection.query(`
          INSERT INTO tickets_sorteo (id, codigo, usuario_id, motivo, estado, created_at)
          VALUES (?, ?, ?, ?, 'Activo', NOW())
        `, [uuidv4(), uuidv4().slice(0, 8).toUpperCase(), userId, 'Registro']);
        
        await connection.query(`
          INSERT INTO historial_recompensas (id, usuario_receptor, cantidad_tickets, motivo, estado)
          VALUES (?, ?, 1, 'Registro', 'Completado')
        `, [uuidv4(), userId]);
        
        console.log('✅ Ticket de sorteo otorgado por registro.');
      } catch (err) {
        console.log('⚠️ No se pudo crear el ticket (probablemente ya existe), pero el usuario se creó correctamente.');
      }

      console.log('\n✅ Usuario creado exitosamente!');
      console.log('\n📋 Datos del usuario:');
      console.log(`   - Teléfono: +59162338686`);
      console.log(`   - Nombre de usuario: suyo`);
      console.log(`   - Nombre real: suyo`);
      console.log(`   - Contraseña: 123456`);
      console.log(`   - Código de invitación: ${invitationCode}`);
      console.log(`   - ID: ${userId}`);
    }

    console.log('\n🔐 Sistema de dispositivos único:');
    console.log('   - El usuario podrá iniciar sesión desde cualquier teléfono.');
    console.log('   - Si inicia sesión en un nuevo dispositivo, se cerrará la sesión anterior automáticamente.');
    console.log('   - Solo podrá estar logueado en un dispositivo a la vez.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await connection.end();
    console.log('\n✨ Proceso completado.');
  }
};

createUser();
