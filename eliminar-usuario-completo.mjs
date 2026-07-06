
import { Client } from 'ssh2';

const conn = new Client();

const config = {
  host: '173.249.55.143',
  port: 22,
  username: 'root',
  password: '14738941lp'
};

console.log('🔍 FASE 1 y 2: MAPA DE RELACIONES Y BUSQUEDA DEL USUARIO');
console.log('\n🚀 Conectando al servidor...');

conn.on('ready', () => {
  console.log('✅ Conexión SSH establecida');
  
  const searchScript = `
    cd /var/www/bcb_global/backend
    cat > buscar-usuario-final.mjs << 'EOF'
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

(async () => {
  const conn = await mysql.createConnection({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE
  });
  
  console.log('\\n🔍 FASE 2: LOCALIZAR REGISTROS');
  const [userRows] = await conn.execute(\`SELECT * FROM usuarios WHERE telefono = '+59162338686'\`);
  
  if (userRows.length === 0) {
    console.log('❌ No se encontró el usuario con teléfono +59162338686');
    await conn.end();
    return;
  }
  
  const user = userRows[0];
  console.log('✅ Usuario encontrado:');
  console.log('ID:', user.id);
  console.log('Teléfono:', user.telefono);
  console.log('Nombre de usuario:', user.nombre_usuario);
  console.log('Rol:', user.rol);
  
  // Búsqueda en todas las tablas (verificar que existan primero)
  const tables = [
    { name: 'actividad_tareas', column: 'usuario_id' },
    { name: 'movimientos_saldo', column: 'usuario_id' },
    { name: 'compras_nivel', column: 'usuario_id' },
    { name: 'retiros', column: 'usuario_id' },
    { name: 'tarjetas_bancarias', column: 'usuario_id' },
    { name: 'tickets_sorteo', column: 'usuario_id' },
    { name: 'historial_recompensas', column: 'usuario_receptor' },
    { name: 'historial_recompensas', column: 'usuario_generador' },
    { name: 'solicitudes_dispositivo', column: 'usuario_id' },
    { name: 'sorteos_ganadores', column: 'usuario_id' },
    { name: 'idempotencia', column: 'usuario_id' },
    { name: 'auditoria_financiera', column: 'usuario_id' },
    { name: 'notificaciones', column: 'usuario_id' },
    { name: 'respuestas_cuestionario', column: 'usuario_id' },
    { name: 'metodos_qr', column: 'admin_id' },
    { name: 'ruleta_forzada', column: 'usuario_id' },
    { name: 'logs_ruleta', column: 'usuario_id' },
    { name: 'compras_nivel', column: 'procesado_por' },
    { name: 'retiros', column: 'procesado_por' },
    { name: 'solicitudes_dispositivo', column: 'admin_id' },
    { name: 'usuarios', column: 'invitado_por' },
    { name: 'comunicados_home', column: 'created_by' },
    { name: 'sorteo_config_personalizada', column: 'target_id', extraWhere: 'target_type = \"usuario\"' }
  ];
  
  // Primero, obtener la lista de tablas existentes
  const [existingTables] = await conn.execute(\`SHOW TABLES\`);
  const existingTableNames = existingTables.map(t =&gt; Object.values(t)[0]);
  
  console.log('\\n📋 Listado de registros encontrados:');
  let totalRegistros = 0;
  const registrosPorTabla = [];
  
  for (const table of tables) {
    if (!existingTableNames.includes(table.name)) {
      continue;
    }
    
    try {
      let sql = \`SELECT COUNT(*) as total FROM \${table.name} WHERE \${table.column} = ?\`;
      if (table.extraWhere) {
        sql += \` AND \${table.extraWhere}\`;
      }
      const [rows] = await conn.execute(sql, [user.id]);
      if (rows[0].total &gt; 0) {
        console.log(\`- \${table.name} (\${table.column}): \${rows[0].total} registros\`);
        registrosPorTabla.push({
          nombre: table.name,
          columna: table.column,
          cantidad: rows[0].total
        });
        totalRegistros += rows[0].total;
      }
    } catch (err) {
      // Skip tables with errors (e.g., no column)
    }
  }
  
  console.log('\\n📊 TOTAL DE REGISTROS:', totalRegistros);
  
  // Guardar datos para respaldo
  console.log('\\n💾 FASE 4: GENERANDO RESPALDO...');
  
  // Primero, creamos un directorio para backups
  const fs = await import('fs/promises');
  const path = await import('path');
  const backupDir = path.join(process.cwd(), 'backups');
  
  try {
    await fs.access(backupDir);
  } catch {
    await fs.mkdir(backupDir, { recursive: true });
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(backupDir, \`backup_\${user.telefono.replace(/[^0-9]/g, '')}_\${timestamp}.json\`);
  
  const backupData = {
    usuario: user,
    registrosPorTabla: registrosPorTabla,
    timestamp: timestamp
  };
  
  // Obtener los datos reales de cada tabla
  for (const tabla of registrosPorTabla) {
    let sql = \`SELECT * FROM \${tabla.nombre} WHERE \${tabla.columna} = ?\`;
    if (tabla.nombre === 'sorteo_config_personalizada') {
      sql += ' AND target_type = \"usuario\"';
    }
    const [rows] = await conn.execute(sql, [user.id]);
    backupData[\`datos_\${tabla.nombre}\`] = rows;
  }
  
  await fs.writeFile(backupFile, JSON.stringify(backupData, null, 2));
  console.log('\\n✅ Respaldo generado en:', backupFile);
  
  // Ahora, vamos a crear el plan de eliminación
  console.log('\\n\\n📋 FASE 3: PLAN DE ELIMINACIÓN');
  console.log('Orden de eliminación (respetando claves foráneas):');
  
  // Orden correcto: primero tablas sin dependencias, luego la principal
  const ordenEliminacion = [
    'logs_ruleta',
    'ruleta_forzada',
    'comunicados_home',
    'sorteo_config_personalizada',
    'auditoria_financiera',
    'idempotencia',
    'sorteos_ganadores',
    'solicitudes_dispositivo',
    'historial_recompensas',
    'tickets_sorteo',
    'tarjetas_bancarias',
    'retiros',
    'compras_nivel',
    'movimientos_saldo',
    'actividad_tareas',
    'notificaciones',
    'respuestas_cuestionario',
    'metodos_qr',
    'usuarios'
  ];
  
  ordenEliminacion.forEach((tabla, index) =&gt; {
    const info = registrosPorTabla.find(r =&gt; r.nombre === tabla);
    if (info || tabla === 'usuarios') {
      console.log(\`\${index + 1}. \${tabla} (\${info ? info.cantidad : '1 usuario'} registros)\`);
    }
  });
  
  // Ahora, ejecutar la eliminación
  console.log('\\n\\n⚡ FASE 5: EJECUTANDO ELIMINACIÓN...');
  
  // Primero, actualizar invitado_por en otros usuarios
  console.log('1. Actualizando referencias de invitado_por en otros usuarios...');
  await conn.execute(\`UPDATE usuarios SET invitado_por = NULL WHERE invitado_por = ?\`, [user.id]);
  console.log('✅ Listo');
  
  // Ahora eliminar tablas en orden
  for (const tabla of ordenEliminacion) {
    if (!existingTableNames.includes(tabla)) {
      console.log(\`  - Saltando \${tabla}: no existe\`);
      continue;
    }
    
    const info = registrosPorTabla.find(r =&gt; r.nombre === tabla);
    if (!info &amp;&amp; tabla !== 'usuarios') {
      continue;
    }
    
    try {
      if (tabla === 'usuarios') {
        console.log(\`  - Eliminando usuario de \${tabla}...\`);
        await conn.execute(\`DELETE FROM \${tabla} WHERE id = ?\`, [user.id]);
        console.log('✅ Usuario eliminado');
      } else {
        console.log(\`  - Eliminando \${info.cantidad} registros de \${tabla}...\`);
        let sql = \`DELETE FROM \${tabla} WHERE \${info.columna} = ?\`;
        if (tabla === 'sorteo_config_personalizada') {
          sql += ' AND target_type = \"usuario\"';
        }
        const [result] = await conn.execute(sql, [user.id]);
        console.log(\`✅ Eliminados \${result.affectedRows} registros\`);
      }
    } catch (err) {
      console.log(\`⚠️ Error en \${tabla}:\`, err.message);
    }
  }
  
  console.log('\\n\\n🔍 FASE 6: VALIDACIÓN');
  
  // Verificar que el usuario no existe
  const [checkUser] = await conn.execute(\`SELECT * FROM usuarios WHERE id = ?\`, [user.id]);
  if (checkUser.length === 0) {
    console.log('✅ Usuario no encontrado en la tabla usuarios');
  } else {
    console.log('⚠️ ERROR: Usuario sigue existiendo');
  }
  
  // Verificar que no queden referencias
  console.log('\\nVerificando referencias huérfanas...');
  let hayReferencias = false;
  
  for (const table of tables) {
    if (!existingTableNames.includes(table.name)) continue;
    if (table.name === 'usuarios' &amp;&amp; table.column === 'invitado_por') continue;
    
    try {
      let sql = \`SELECT COUNT(*) as total FROM \${table.name} WHERE \${table.column} = ?\`;
      if (table.extraWhere) {
        sql += \` AND \${table.extraWhere}\`;
      }
      const [rows] = await conn.execute(sql, [user.id]);
      if (rows[0].total &gt; 0) {
        console.log(\`⚠️ ERROR: \${rows[0].total} registros restantes en \${table.name}\`);
        hayReferencias = true;
      }
    } catch (err) {
      // Skip
    }
  }
  
  if (!hayReferencias) {
    console.log('✅ No se encontraron referencias huérfanas');
  }
  
  console.log('\\n🎉 PROCESO COMPLETO!');
  
  await conn.end();
})();
EOF

    node buscar-usuario-final.mjs
  `;
  
  conn.exec(searchScript, (err, stream) => {
    if (err) {
      console.error('❌ Error:', err);
      conn.end();
      return;
    }
    
    stream.on('data', (data) => {
      process.stdout.write(data.toString());
    }).stderr.on('data', (data) => {
      process.stderr.write(data.toString());
    }).on('close', () => {
      console.log('\n✅ Proceso finalizado');
      conn.end();
    });
  });
}).on('error', (err) => {
  console.error('❌ Error de conexión:', err);
}).connect(config);
