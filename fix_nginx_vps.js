
import { Client } from 'ssh2';

const conn = new Client();

const config = {
  host: '173.249.55.143',
  port: 22,
  username: 'root',
  password: '14738941lp',
  readyTimeout: 120000
};

conn.on('ready', () => {
  console.log('✅ SSH Ready');
  const nginxConfig = `
server {
    listen 80;
    server_name bcb-global.com www.bcb-global.com 173.249.55.143;
    return 301 https://bcb-global.com$request_uri;
}

server {
    listen 443 ssl;
    server_name www.bcb-global.com;

    ssl_certificate /etc/letsencrypt/live/bcb-global.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/bcb-global.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    return 301 https://bcb-global.com$request_uri;
}

server {
    listen 443 ssl;
    server_name bcb-global.com 173.249.55.143;

    ssl_certificate /etc/letsencrypt/live/bcb-global.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/bcb-global.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    root /var/www/bcb_global/frontend/dist;
    index index.html;

    client_max_body_size 25M;

    # Optimización de Gzip para velocidad de carga
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_buffers 16 8k;
    gzip_http_version 1.1;
    gzip_min_length 256;
    gzip_types text/plain text/css text/xml application/json application/javascript application/rss+xml image/svg+xml;

    # Optimización de conexiones Proxy (Keep-Alive)
    proxy_http_version 1.1;
    proxy_set_header Connection "";
    proxy_cache_bypass $http_upgrade;
    proxy_read_timeout 300;
    proxy_connect_timeout 300;
    proxy_send_timeout 300;
    proxy_buffers 32 4k;

    # Servir archivos de carga directamente desde el almacenamiento persistente
    location /uploads/ {
        alias /var/www/bcb_global/storage/uploads/;
        autoindex off;
        expires 30d;
        add_header Cache-Control "public, no-transform";
        
        # Permitir CORS para las im├ígenes
        add_header 'Access-Control-Allow-Origin' '*';
        add_header 'Access-Control-Allow-Methods' 'GET, OPTIONS';
        
        # Si no existe el archivo, intentar pasar a la API (por si acaso)
        try_files $uri @backend;
    }

    location /socket.io/ {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket support
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
        proxy_connect_timeout 75s;
        
        # Disable cache for socket.io
        proxy_cache_bypass $http_upgrade;
        proxy_no_cache $http_upgrade;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:4000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location @backend {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location / {
        try_files $uri $uri/ /index.html;
        # Forzar que el navegador NO cachee el index.html para ver cambios inmediatamente
        add_header Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0";
    }

    # Cachear assets estáticos que tienen hash en el nombre (JS/CSS)
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
`;

  const escapedConfig = nginxConfig.replace(/'/g, "'\\''");
  const commands = [
    `echo '${escapedConfig}' > /etc/nginx/sites-available/bcb_global`,
    'nginx -t && systemctl reload nginx',
    'mkdir -p /var/www/bcb_global/storage/uploads/metodos_qr',
    'chmod -R 777 /var/www/bcb_global/storage/uploads',
    'nproc --all', 
    'free -m',      
    'pm2 restart all --update-env'
  ];

  const execCmd = (i) => {
    if (i >= commands.length) return conn.end();
    console.log(`\n$ ${commands[i]}`);
    conn.exec(commands[i], (err, stream) => {
      if (err) throw err;
      stream.on('close', () => execCmd(i + 1))
            .on('data', data => process.stdout.write(data))
            .stderr.on('data', data => process.stderr.write(data));
    });
  };
  execCmd(0);
}).connect(config);
