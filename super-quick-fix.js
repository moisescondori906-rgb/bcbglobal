import { Client } from 'ssh2';

const config = {
  host: '173.249.55.143',
  port: 22,
  username: 'root',
  password: '14738941lp'
};

console.log('Connecting...');

const conn = new Client();
conn.on('ready', () => {
  console.log('Connected! Now fixing...');
  
  conn.exec('echo "test"', (err, stream) => {
    if (err) throw err;
    stream.on('data', (data) => console.log(data.toString()));
    stream.on('close', () => {
      // Now write Nginx config
      const writeConfig = `
cat > /etc/nginx/sites-enabled/bcb_global << 'END_CONFIG'
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
    listen 443 ssl http2;
    server_name bcb-global.com 173.249.55.143;
    ssl_certificate /etc/letsencrypt/live/bcb-global.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/bcb-global.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
    root /var/www/bcb_global/frontend/dist;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:4000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /uploads/ {
        proxy_pass http://127.0.0.1:4000/uploads/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /video/ {
        proxy_pass http://127.0.0.1:4000/video/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /imag/ {
        proxy_pass http://127.0.0.1:4000/imag/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
END_CONFIG

nginx -t && systemctl restart nginx
`;
      
      conn.exec(writeConfig, (err, stream2) => {
        if (err) throw err;
        stream2.on('data', d => console.log(d.toString()));
        stream2.stderr.on('data', d => console.error(d.toString()));
        stream2.on('close', () => {
          console.log('Done!');
          conn.end();
        });
      });
    });
  });
}).on('error', err => console.error('Error:', err)).connect(config);
