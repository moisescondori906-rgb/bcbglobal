
import { Client } from 'ssh2';

const conn = new Client();

const config = {
  host: '173.249.55.143',
  port: 22,
  username: 'root',
  password: '14738941lp'
};

console.log('🗄️ Iniciando migración de base de datos...');

conn.on('ready', () =&gt; {
  console.log('✅ Conexión SSH establecida.');
  
  const migrateScript = `
    cd /var/www/bcb_global/backend
    echo "Ejecutando migración 020_tickets_sorteo.sql..."
    # Leer credenciales desde .env
    export MYSQL_HOST=\$(grep MYSQL_HOST .env | cut -d '=' -f2)
    export MYSQL_USER=\$(grep MYSQL_USER .env | cut -d '=' -f2)
    export MYSQL_PASSWORD=\$(grep MYSQL_PASSWORD .env | cut -d '=' -f2)
    export MYSQL_DATABASE=\$(grep MYSQL_DATABASE .env | cut -d '=' -f2)
    # Ejecutar el SQL
    mysql -h \$MYSQL_HOST -u\$MYSQL_USER -p\$MYSQL_PASSWORD \$MYSQL_DATABASE &lt; migrations/020_tickets_sorteo.sql
    echo "✅ Migración completada!"
  `;
  
  conn.exec(migrateScript, (err, stream) =&gt; {
    if (err) {
      console.error('❌ Error al ejecutar la migración:', err);
      conn.end();
      return;
    }

    stream.on('close', (code, signal) =&gt; {
      if (code === 0) {
        console.log('\n✨ Migración de base de datos completada con éxito.');
      } else {
        console.warn(`\n⚠️ El script terminó con código ${code}`);
      }
      conn.end();
    }).on('data', (data) =&gt; {
      process.stdout.write(data.toString());
    }).stderr.on('data', (data) =&gt; {
      process.stderr.write(data.toString());
    });
  });
}).on('error', (err) =&gt; {
  console.error('❌ Error de conexión SSH:', err.message);
}).connect(config);

