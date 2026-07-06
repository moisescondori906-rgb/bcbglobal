
import { Client } from 'ssh2';

const config = { host: '173.249.55.143', port: 22, username: 'root', password: '14738941lp', readyTimeout: 120000 };

const conn = new Client();
conn.on('ready', () => {
  console.log('SSH ready!');
  const commands = `
    cd /var/www/bcb_global/backend && \
    DB_CREDS=$(grep -E 'DB_HOST|DB_USER|DB_PASSWORD|DB_NAME|DB_PORT' .env | tr -d "'\"" | sed 's/^/export /') && \
    eval $DB_CREDS && \
    mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e '
      DESC compras_nivel;
      DESC retiros;
    '
  `;
  conn.exec(commands, (err, stream) => {
    if (err) throw err;
    stream.on('data', (d) => process.stdout.write(d.toString()));
    stream.stderr.on('data', (d) => process.stderr.write(d.toString()));
    stream.on('close', () => conn.end());
  });
}).connect(config);
