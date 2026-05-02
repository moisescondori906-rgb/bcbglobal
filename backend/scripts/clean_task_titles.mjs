import 'dotenv/config';
import mysql from 'mysql2/promise';

async function run() {
  const connection = await mysql.createConnection({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    port: parseInt(process.env.MYSQL_PORT || '3306')
  });

  try {
    console.log('🚀 Iniciando limpieza de títulos...');

    const [resTitulo] = await connection.query("UPDATE tareas SET titulo = REPLACE(titulo, ' (Copia)', '') WHERE titulo LIKE '% (Copia)%'");
    const [resNombre] = await connection.query("UPDATE tareas SET nombre = REPLACE(nombre, ' (Copia)', '') WHERE nombre LIKE '% (Copia)%'");

    console.log('✅ Limpieza completada.');
    console.log(`Filas actualizadas en 'titulo': ${resTitulo.affectedRows}`);
    console.log(`Filas actualizadas en 'nombre': ${resNombre.affectedRows}`);

  } catch (error) {
    console.error('❌ Error durante la actualización:', error);
  } finally {
    await connection.end();
  }
}

run();
