import { Client } from 'ssh2';

const config = {
  host: '173.249.55.143',
  port: 22,
  username: 'root',
  password: '14738941lp'
};

const conn = new Client();
conn.on('ready', () => {
  conn.exec('systemctl restart nginx && systemctl status nginx', (err, stream) => {
    if (err) throw err;
    stream.on('data', (data) => console.log(data.toString()));
    stream.stderr.on('data', (data) => console.error(data.toString()));
    stream.on('close', () => conn.end());
  });
}).on('error', err => console.error('Error:', err)).connect(config);
