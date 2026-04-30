import mysql from 'mysql2/promise';

const run = async () => {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '14738941lp',
    database: 'bcb_global'
  });

  const [rows] = await connection.execute('SELECT telefono, password_hash FROM usuarios WHERE telefono LIKE ? OR telefono LIKE ?', ['%70000001%', '%70000002%']);
  console.log('Usuarios encontrados:', rows);

  await connection.end();
};

run().catch(console.error);
