const { Client } = require('ssh2');
const conn = new Client();
const config = { host: '173.249.55.143', port: 22, username: 'root', password: '14738941lp', readyTimeout: 120000 };
const remoteLines = [
  'set -e',
  'export NVM_DIR="$HOME/.nvm"',
  '[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"',
  'nvm use 20 >/dev/null 2>&1 || true',
  'cd /var/www/bcb_global/backend',
  "cat > .tmp_verify_can_withdraw_70707070.mjs <<'EOF'",
  "import 'dotenv/config';",
  "import { findUserByTelefono, canWithdraw, getCompletedInternshipDays } from './src/services/dbService.mjs';",
  "const user = await findUserByTelefono('+59170707070');",
  "if (!user) throw new Error('Usuario no encontrado');",
  "const completedDays = await getCompletedInternshipDays(user.id, 3);",
  "const status = await canWithdraw(user.id);",
  "console.log('VERIFY ' + JSON.stringify({ userId: user.id, saldo_principal: user.saldo_principal, completedDays, status }));",
  'EOF',
  'node .tmp_verify_can_withdraw_70707070.mjs',
  'rm -f .tmp_verify_can_withdraw_70707070.mjs'
];
const remoteScript = remoteLines.join('\n');
conn.on('ready', () => {
  conn.exec(remoteScript, (err, stream) => {
    if (err) { console.error(err); conn.end(); process.exit(1); }
    stream.on('close', (code) => { conn.end(); process.exit(code || 0); });
    stream.on('data', (data) => process.stdout.write(data.toString()));
    stream.stderr.on('data', (data) => process.stderr.write(data.toString()));
  });
}).on('error', (err) => { console.error('SSH error:', err.message); process.exit(1); }).connect(config);
