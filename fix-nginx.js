import { Client } from 'ssh2';

const config = {
  host: '173.249.55.143',
  port: 22,
  username: 'root',
  password: '14738941lp',
  readyTimeout: 60000,
  keepaliveInterval: 10000,
  keepaliveCountMax: 3
};

console.log('🔧 Escribiendo configuración correcta de Nginx...');

const conn = new Client();
conn.on('ready', () => {
  console.log('✅ Conexión SSH establecida.');
  
  const newConfig = `server {
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
    listen 443 ssl http2;
    server_name bcb-global.com 173.249.55.143;

    ssl_certificate /etc/letsencrypt/live/bcb-global.com/fullchain.pem;        
    ssl_certificate_key /etc/letsencrypt/live/bcb-global.com/privkey.pem;      
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;
    ssl_session_tickets off;

    root /var/www/bcb_global/frontend/dist;
    index index.html;

    client_max_body_size 50M;
    client_body_timeout 60s;
    client_header_timeout 60s;
    keepalive_timeout 65;
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    types_hash_max_size 2048;

    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
      text/plain
      text/css
      text/xml
      text/javascript
      application/javascript
      application/json
      application/xml+rss
      image/svg+xml;

    location /uploads/ {
        proxy_pass http://127.0.0.1:4000/uploads/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection "";
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
        proxy_busy_buffers_size 8k;
        expires 7d;
        add_header Cache-Control "public, immutable";
    }

    location /video/ {
        proxy_pass http://127.0.0.1:4000/video/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection "";
        proxy_buffering on;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    location /imag/ {
        proxy_pass http://127.0.0.1:4000/imag/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection "";
        proxy_buffering on;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    location /api/ {
        proxy_pass http://127.0.0.1:4000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection "";
        proxy_buffering on;
        proxy_buffer_size 8k;
        proxy_buffers 16 8k;
        proxy_busy_buffers_size 24k;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        proxy_cache off;
    }

    location / {
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0";
    }

    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
`;
  
  const tempFile = '/tmp/bcb_global_nginx.conf';
  const writeCommand = `cat > ${tempFile} << 'EOF'
${newConfig}
EOF`;
  
  conn.exec(writeCommand, (err, stream) => {
    if (err) {
      console.error('❌ Error:', err);
      conn.end();
      return;
    }
    stream.on('close', () => {
      const commands = [
        `cp ${tempFile} /etc/nginx/sites-enabled/bcb_global`,
        'nginx -t',
        'systemctl restart nginx'
      ];
      conn.exec(commands.join(' && '), (err, stream) => {
        if (err) {
          console.error('❌ Error:', err);
          conn.end();
          return;
        }
        stream.on('data', (data) => {
          console.log(data.toString());
        }).stderr.on('data', (data) => {
          console.log(data.toString());
        }).on('close', (code) => {
          console.log(code === 0 ? '✅ Nginx está funcionando perfectamente!' : '❌ Error');
          conn.end();
        });
      });
    });
  });
}).connect(config);
