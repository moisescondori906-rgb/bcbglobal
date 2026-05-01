# BCB Global Institutional (v11.4.2)

🚀 **Actualización Premium**: Auditoría Técnica Total completada. Sistema unificado en MySQL, eliminación de dependencias de Supabase, y alineación total con la Tabla de Inversiones Global 1-9. Sincronización de seguridad y resiliencia v11.4.2.

## Tabla Oficial de Niveles

| Nivel | Inversión (BOB) | Tareas/Día | Pago Tarea | Ingreso Diario |
| :--- | :--- | :--- | :--- | :--- |
| Internar | 0 | 3 | 1.00 | 3.00 |
| global1 | 230.00 | 4 | 1.80 | 7.20 |
| global2 | 780.00 | 8 | 3.22 | 25.76 |
| global3 | 2,900.00 | 15 | 6.76 | 101.40 |
| global4 | 9,200.00 | 30 | 11.33 | 339.90 |
| global5 | 28,200.00 | 60 | 17.43 | 1,045.80 |
| global6 | 58,000.00 | 100 | 22.35 | 2,235.00 |
| global7 | 124,000.00 | 160 | 31.01 | 4,961.60 |
| global8 | 299,400.00 | 250 | 47.91 | 11,977.50 |
| global9 | 541,600.00 | 400 | 58.87 | 23,548.00 |

## Requisitos del Servidor (Ubuntu 22.04+)

```bash
# Instalación de dependencias básicas
sudo apt update
sudo apt install -y mysql-server redis-server git nginx unzip build-essential

# Instalación de Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

## Instalación y Despliegue

### 1. Clonar Repositorio
```bash
git clone https://github.com/moisescondori906-rgb/bcbglobal.git /var/www/bcb_global
cd /var/www/bcb_global
```

### 2. Backend
```bash
cd backend
npm install
cp .env.example .env
# Editar .env con tus credenciales de MySQL y Redis
node src/db-sync.mjs
# Iniciar con PM2
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

### 3. Frontend
```bash
cd ../frontend
npm install
# Asegúrate de configurar .env con la URL de tu API
npm run build
```

### 4. Configuración de Nginx
El frontend se sirve desde la carpeta `dist`.
```nginx
server {
    listen 80;
    server_name bcb-global.com;
    root /var/www/bcb_global/frontend/dist;
    index index.html;

    location /api {
        proxy_pass http://127.0.0.1:4000/api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

## Health Check
Puedes verificar el estado del sistema en:
`http://TU_IP/api/health`

## Troubleshooting
- **Error 401 en Login**: Verifica la normalización del teléfono. El sistema acepta formatos: `70000001`, `59170000001`, `+59170000001`.
- **502 Bad Gateway**: Asegúrate de que el backend esté corriendo con PM2 (`pm2 list`).
- **CORS Error**: Verifica que tu dominio o IP esté en `allowedOrigins` dentro de `backend/src/index.mjs`.

## Estructura del Proyecto
```
bcb_global/
├── backend/          # API Node.js + Express + MySQL
├── frontend/         # React + Vite + Tailwind (App Android Capacitor)
├── deploy.sh         # Script de despliegue automático
└── deploy-check.sh   # Script de validación técnica
```
