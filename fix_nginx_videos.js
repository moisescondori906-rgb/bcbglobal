
import { Client } from 'ssh2';

const conn = new Client();

const config = {
  host: '173.249.55.143',
  port: 22,
  username: 'root',
  password: '14738941lp',
  readyTimeout: 90000
};

console.log('🛠️ Optimizando configuración de Nginx para videos...');

conn.on('ready', () => {
  console.log('✅ Conexión SSH establecida.');
  
  const nginxConfig = `
server {
    listen 80;
    server_name bcb-global.com;
    return 301 http://www.bcb-global.com$request_uri;
}

server {
    listen 80;
    server_name www.bcb-global.com;

    root /var/www/bcb_global/frontend/dist;
    index index.html;

    client_max_body_size 50M;

    # Servir videos directamente desde la carpeta public para evitar 404 en deploys
    location /video/ {
        alias /var/www/bcb_global/frontend/public/video/;
        add_header Access-Control-Allow-Origin *;
        add_header Accept-Ranges bytes;
        expires 30d;
        access_log off;
    }

    # Servir imágenes directamente
    location /imag/ {
        alias /var/www/bcb_global/frontend/public/imag/;
        add_header Access-Control-Allow-Origin *;
        expires 30d;
        access_log off;
    }

    # Optimización de archivos estáticos del build
    location ~* \\.(?:ico|css|js|gif|jpe?g|png|woff2?|eot|ttf|svg)$ {
        expires 7d;
        add_header Cache-Control "public, no-transform";
        access_log off;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /uploads/ {
        alias /var/www/bcb_global/backend/public/uploads/;
        add_header Access-Control-Allow-Origin *;
        expires 7d;
        access_log off;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:4000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/bcb-global.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/bcb-global.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
}

server {
    listen 80;
    server_name bcb-global.com www.bcb-global.com;
    return 301 https://$host$request_uri;
}
`;

  const commands = [
    `echo '${nginxConfig.replace(/'/g, "'\\''")}' > /etc/nginx/sites-available/bcb`,
    'nginx -t',
    'systemctl reload nginx'
  ];

  const executeNext = (index) => {
    if (index >= commands.length) {
      console.log('✨ Configuración de Nginx actualizada con éxito.');
      conn.end();
      return;
    }

    const cmd = commands[index];
    console.log(`\n🏃 Ejecutando: ${cmd}`);
    
    conn.exec(cmd, (err, stream) => {
      if (err) {
        console.error(`❌ Error al ejecutar "${cmd}":`, err);
        conn.end();
        return;
      }

      stream.on('close', (code, signal) => {
        executeNext(index + 1);
      }).on('data', (data) => {
        process.stdout.write(data.toString());
      }).stderr.on('data', (data) => {
        process.stderr.write(data.toString());
      });
    });
  };

  executeNext(0);
}).on('error', (err) => {
  console.error('❌ Error de conexión SSH:', err.message);
}).connect(config);
