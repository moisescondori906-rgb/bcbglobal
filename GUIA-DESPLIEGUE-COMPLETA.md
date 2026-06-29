# Guía Completa de Despliegue - BCB Global v11.4.2

---

## 1. Análisis Exhaustivo del Proyecto

### 1.1 Stack Tecnológico

| Componente | Tecnología | Versión Requerida |
|------------|------------|-------------------|
| **Lenguaje Backend** | Node.js | ≥ 18.0.0 (Recomendado: 20.x o 22.x) |
| **Framework Backend** | Express.js | ^4.21.0 |
| **Base de Datos Relacional** | MySQL | 8.0+ |
| **Cache/Mensajería** | Redis | Última versión estable |
| **Gestor de Procesos** | PM2 | Global |
| **Servidor Web/Reverse Proxy** | Nginx | Última versión estable |
| **Frontend** | React + Vite | ^19.2.4 |
| **Bot de Notificaciones** | Telegram Bot API | ^0.67.0 |
| **Colas de Tareas** | BullMQ | ^5.74.1 |
| **SSL/TLS** | Let's Encrypt | Certbot |

### 1.2 Requisitos de Sistema Mínimos y Recomendados

| Recurso | Mínimo | Recomendado |
|---------|--------|-------------|
| **CPU** | 2 núcleos | 4+ núcleos |
| **RAM** | 2 GB | 4 GB+ |
| **Almacenamiento** | 20 GB SSD | 50 GB+ SSD |
| **SO** | Ubuntu 22.04 LTS | Ubuntu 22.04/24.04 LTS |

### 1.3 Variables de Entorno Requeridas

Archivo: `/var/www/bcb_global/backend/.env`

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `JWT_SECRET` | Clave secreta para firmar tokens JWT | `tu_clave_secreta_muy_segura_2026` |
| `MYSQL_HOST` | Host de la base de datos MySQL | `localhost` |
| `MYSQL_USER` | Usuario de MySQL | `bcb_user` |
| `MYSQL_PASSWORD` | Contraseña de MySQL | `tu_contraseña_segura` |
| `MYSQL_DATABASE` | Nombre de la base de datos | `bcb_global` |
| `REDIS_HOST` | Host de Redis | `localhost` |
| `TELEGRAM_BOT_TOKEN_ADMIN` | Token del bot de Telegram | `123456789:ABCdefGhIJKlmNoPQRStuvWxYZ` |
| `TELEGRAM_CHAT_ADMIN` | ID del chat de administración | `-1001234567890` |
| `PORT` | Puerto del backend (opcional) | `4000` |
| `NODE_ENV` | Entorno (opcional) | `production` |

### 1.4 Servicios Background y Procesos Continuos

| Servicio | Descripción | Gestión |
|----------|-------------|--------|
| **Backend API** | Servidor principal en puerto 4000 | PM2 Cluster Mode |
| **MySQL** | Motor de base de datos | systemd |
| **Redis** | Almacén en memoria y colas | systemd |
| **Nginx** | Reverse Proxy y SSL | systemd |
| **Telegram Bot** | Polling/Webhook integrado en backend | PM2 |
| **Tareas Cron** | Mantenimiento y jobs programados | BullMQ + Cron |

---

## 2. Guía Paso a Paso de Despliegue

### Paso 1: Actualización del Sistema Operativo (Ubuntu 22.04/24.04)

```bash
# Conectarse al servidor via SSH
ssh root@tu-servidor-ip

# Actualizar lista de paquetes
apt update && apt upgrade -y

# Instalar paquetes esenciales
apt install -y curl wget git ufw fail2ban
```

### Paso 2: Configuración de Firewall (UFW)

```bash
# Habilitar UFW
ufw enable

# Permitir SSH (para no perder acceso)
ufw allow 22/tcp

# Permitir HTTP y HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# Verificar estado
ufw status
```

### Paso 3: Instalación de Node.js (v20.x)

```bash
# Instalar Node.js v20 usando NVM (recomendado)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Cargar NVM en la sesión actual
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Instalar Node.js v20
nvm install 20
nvm use 20
nvm alias default 20

# Verificar instalación
node -v
npm -v
```

### Paso 4: Instalación de MySQL 8.0

```bash
# Instalar MySQL Server
apt install -y mysql-server

# Habilitar y arrancar MySQL
systemctl enable mysql
systemctl start mysql

# Ejecutar script de seguridad de MySQL
mysql_secure_installation
```

#### Configurar Base de Datos

```bash
# Acceder a MySQL
mysql -u root -p

# Dentro de MySQL, ejecutar:
CREATE DATABASE bcb_global CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'bcb_user'@'localhost' IDENTIFIED BY 'TU_CONTRASEÑA_SEGURA_AQUI';
GRANT ALL PRIVILEGES ON bcb_global.* TO 'bcb_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### Paso 5: Instalación de Redis

```bash
# Instalar Redis
apt install -y redis-server

# Habilitar y arrancar Redis
systemctl enable redis-server
systemctl start redis-server

# Verificar estado
systemctl status redis-server
redis-cli ping  # Debería responder: PONG
```

### Paso 6: Instalación de PM2 Globalmente

```bash
# Instalar PM2
npm install -g pm2

# Configurar PM2 para arrancar al inicio del sistema
pm2 startup
# Copiar y ejecutar el comando que se muestra

# Verificar instalación
pm2 -v
```

### Paso 7: Instalación de Nginx

```bash
# Instalar Nginx
apt install -y nginx

# Habilitar y arrancar Nginx
systemctl enable nginx
systemctl start nginx

# Verificar estado
systemctl status nginx
```

### Paso 8: Clonar/Desplegar el Proyecto

```bash
# Crear directorio del proyecto
mkdir -p /var/www/bcb_global
cd /var/www/bcb_global

# Clonar repositorio (o subir archivos via SFTP)
# git clone https://tu-repositorio.git .
# O copiar archivos locales al servidor

# Establecer permisos correctos
chown -R www-data:www-data /var/www/bcb_global
chmod -R 755 /var/www/bcb_global
```

### Paso 9: Configurar Backend

```bash
# Navegar al directorio del backend
cd /var/www/bcb_global/backend

# Instalar dependencias
npm install

# Crear archivo .env (copiar del ejemplo o crear manualmente)
cat > .env << 'EOF'
JWT_SECRET=TU_CLAVE_SECRETA_MUY_SEGURA_AQUI
MYSQL_HOST=localhost
MYSQL_USER=bcb_user
MYSQL_PASSWORD=TU_CONTRASEÑA_SEGURA_AQUI
MYSQL_DATABASE=bcb_global
REDIS_HOST=localhost
TELEGRAM_BOT_TOKEN_ADMIN=TU_TOKEN_TELEGRAM
TELEGRAM_CHAT_ADMIN=TU_CHAT_ID_TELEGRAM
PORT=4000
NODE_ENV=production
EOF

# Crear directorio de logs
mkdir -p logs

# Sincronizar la base de datos
node src/db-sync.mjs

# Aplicar parches de seguridad y esquema
node scripts/fix_schema_safe.mjs

# Iniciar backend con PM2
pm2 start ecosystem.config.cjs

# Guardar configuración de PM2
pm2 save
```

### Paso 10: Configurar Frontend

```bash
# Navegar al directorio del frontend
cd /var/www/bcb_global/frontend

# Instalar dependencias
npm install

# (Opcional) Crear archivo .env para variables del frontend
cat > .env << 'EOF'
VITE_API_URL=https://bcb-global.com/api
VITE_WEB_URL=https://bcb-global.com
EOF

# Construir el frontend para producción
npm run build
```

### Paso 11: Configurar Nginx

```bash
# Eliminar configuración predeterminada
rm /etc/nginx/sites-enabled/default

# Copiar la configuración del proyecto
cp /var/www/bcb_global/bcb_global_nginx.conf /etc/nginx/sites-available/bcb_global

# Habilitar el sitio
ln -s /etc/nginx/sites-available/bcb_global /etc/nginx/sites-enabled/

# Probar configuración de Nginx
nginx -t

# Reiniciar Nginx
systemctl reload nginx
```

### Paso 12: Configurar Certificados SSL/TLS (Let's Encrypt)

```bash
# Instalar Certbot
apt install -y certbot python3-certbot-nginx

# Obtener certificado (solo si el dominio está apuntando al servidor)
certbot --nginx -d bcb-global.com -d www.bcb-global.com

# Certbot configurará automáticamente Nginx y renovará certificados
```

---

## 3. Lista de Comprobación Post-Instalación

### 3.1 Verificación de Servicios

| Comando | Verificación | Resultado Esperado |
|---------|--------------|--------------------|
| `systemctl status mysql` | MySQL activo | `active (running)` |
| `systemctl status redis-server` | Redis activo | `active (running)` |
| `systemctl status nginx` | Nginx activo | `active (running)` |
| `pm2 status` | Backend corriendo | `online` |
| `pm2 logs bcb-global-backend --lines 50` | Logs sin errores críticos | No hay errores |

### 3.2 Pruebas de Funcionalidad

1. **Acceso Web**: Abrir `https://bcb-global.com` en el navegador
2. **Health Check**: Acceder a `https://bcb-global.com/api/health`
   ```json
   {
     "status": "ok",
     "version": "11.4.2",
     "db": "ok",
     "redis": "ok"
   }
   ```
3. **Conectividad DB**: Verificar desde backend
   ```bash
   cd /var/www/bcb_global/backend
   node scripts/verify_mysql_connection.mjs
   ```
4. **Conectividad Redis**:
   ```bash
   cd /var/www/bcb_global/backend
   node scripts/verify_redis_connection.mjs
   ```

### 3.3 Verificación de Seguridad

- [ ] Certificado SSL válido y renovación automática activada
- [ ] Firewall UFW activo y solo puertos necesarios abiertos
- [ ] Permisos de archivos correctos (`www-data:www-data`, 755 para directorios, 644 para archivos)
- [ ] No hay credenciales hardcodeadas en el código
- [ ] Contraseñas de base de datos seguras (mínimo 16 caracteres, combinación de letras/números/símbolos)

---

## 4. Mantenimiento Básico y Operaciones Diarias

### 4.1 Comandos Útiles de PM2

```bash
# Ver estado de las apps
pm2 status

# Ver logs
pm2 logs bcb-global-backend
pm2 logs --lines 100  # Últimos 100 líneas

# Reiniciar backend
pm2 restart bcb-global-backend

# Detener backend
pm2 stop bcb-global-backend

# Monitoreo en tiempo real
pm2 monit
```

### 4.2 Actualización del Proyecto

```bash
# 1. Ir al directorio del proyecto
cd /var/www/bcb_global

# 2. Pull cambios (si usa git)
git pull origin main

# 3. Actualizar dependencias del backend
cd backend
npm install --production

# 4. Aplicar migraciones/parches (si aplica)
node src/db-sync.mjs
node scripts/fix_schema_safe.mjs

# 5. Construir frontend
cd ../frontend
npm install
npm run build

# 6. Reiniciar backend
pm2 restart bcb-global-backend
```

### 4.3 Mantenimiento de Logs

```bash
# Rotación de logs de PM2 (configurada automáticamente)
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7

# Limpiar logs antiguos de Nginx (si es necesario)
journalctl --vacuum-time=7d
```

### 4.4 Monitoreo del Servidor

```bash
# Uso de recursos
htop

# Espacio en disco
df -h

# Uso de memoria
free -h

# Verificar espacio en MySQL
mysql -u root -p -e "SELECT table_schema AS 'Database', ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS 'Size (MB)' FROM information_schema.tables GROUP BY table_schema;"
```

---

## 5. Solución de Problemas Comunes

| Problema | Causa Probable | Solución |
|----------|-----------------|----------|
| **Error 502 Bad Gateway** | Backend caído | `pm2 restart bcb-global-backend` y `pm2 logs` |
| **Error al conectar con MySQL** | Credenciales incorrectas | Verificar `.env` y usuario MySQL |
| **Error al conectar con Redis** | Redis no está corriendo | `systemctl restart redis-server` |
| **Frontend no carga** | Build incorrecto | Reconstruir frontend: `npm run build` |
| **Certificado SSL expirado** | Certbot no renovó | `certbot renew --dry-run` y luego `certbot renew` |

---

## 6. Recomendaciones de Seguridad Adicionales

1. **Deshabilitar login root por SSH**:
   ```bash
   nano /etc/ssh/sshd_config
   # Cambiar PermitRootLogin a no
   systemctl restart sshd
   ```

2. **Crear usuario sudo**:
   ```bash
   adduser deploy
   usermod -aG sudo deploy
   ```

3. **Usar autenticación SSH con clave (no contraseña)**

4. **Configurar Fail2Ban para prevenir ataques de fuerza bruta**

5. **Realizar backups automáticos de la base de datos**:
   ```bash
   crontab -e
   # Añadir: 0 2 * * * mysqldump -u bcb_user -pTU_CONTRASEÑA bcb_global | gzip > /var/backups/bcb_global_$(date +\%Y\%m\%d).sql.gz
   ```

---

## 7. Integración con GitHub y CI/CD (Despliegue Automático)

### 7.1 Configuración Inicial del Repositorio GitHub

#### Paso 1: Inicializar el repositorio (si aún no lo está)

```bash
# En tu máquina local (dentro del directorio del proyecto)
cd c:\Users\Lenovo\Desktop\nuevo-proyecto\bcb-global

# Inicializar git
git init
git add .
git commit -m "Initial commit - BCB Global v11.4.2"

# Crear repositorio en GitHub (via web o CLI)
# Luego conectar el repositorio local
git remote add origin https://github.com/TU_USUARIO/TU_REPOSITORIO.git
git branch -M main
git push -u origin main
```

#### Paso 2: Configurar el servidor para acceder a GitHub

En tu VPS (servidor):

```bash
# Conectarse al servidor
ssh root@tu-servidor-ip

# Generar clave SSH (si no la tienes)
ssh-keygen -t ed25519 -C "deploy@bcb-global.com"
# Presiona Enter en todas las opciones

# Mostrar la clave pública
cat ~/.ssh/id_ed25519.pub
```

**Añade esta clave pública a tu repositorio GitHub**:
1. Ve a `https://github.com/TU_USUARIO/TU_REPOSITORIO/settings/keys`
2. Haz clic en **"Add deploy key"**
3. Pega la clave pública
4. Marca la opción **"Allow write access"**
5. Guarda

#### Paso 3: Clonar el repositorio en el servidor

```bash
# En el servidor, ir al directorio del proyecto
cd /var/www/

# Eliminar directorio anterior (si lo habías creado manualmente)
rm -rf bcb_global

# Clonar el repositorio de GitHub
git clone git@github.com:TU_USUARIO/TU_REPOSITORIO.git bcb_global

# Establecer permisos correctos
chown -R www-data:www-data /var/www/bcb_global
chmod -R 755 /var/www/bcb_global

# Continuar con el Paso 9 (Configurar Backend) de la guía principal
```

### 7.2 Configurar Secrets en GitHub

Ve a `https://github.com/TU_USUARIO/TU_REPOSITORIO/settings/secrets/actions` y añade los siguientes secrets:

| Secret Nombre | Descripción | Ejemplo |
|---------------|-------------|---------|
| `VPS_HOST` | IP o dominio del servidor | `173.249.55.143` |
| `VPS_USER` | Usuario del servidor | `root` o `deploy` |
| `VPS_SSH_KEY` | Clave SSH privada del servidor | Contenido completo de `~/.ssh/id_ed25519` |

**Cómo obtener `VPS_SSH_KEY`**:
```bash
# En tu servidor
cat ~/.ssh/id_ed25519
# Copia TODO el contenido (incluye -----BEGIN OPENSSH PRIVATE KEY----- y -----END OPENSSH PRIVATE KEY-----)
```

### 7.3 Funcionamiento del Despliegue Automático

El workflow `.github/workflows/deploy.yml` se ejecuta **automáticamente cada vez que hagas push a la rama `main`**.

#### ¿Qué hace el workflow?
1. 📥 **Actualiza código**: Hace `git fetch` y `git reset --hard`
2. 📦 **Instala dependencias**: Backend y Frontend
3. 🎨 **Construye frontend**: Genera el build de producción
4. 🗄️ **Actualiza BD**: Aplica migraciones y parches
5. 🔄 **Reinicia servicios**: PM2 y Nginx
6. 🩺 **Verifica estado**: Comprueba que todo esté funcionando

#### Cómo hacer un despliegue:

```bash
# En tu máquina local
git add .
git commit -m "Descripción del cambio"
git push origin main
```

¡GitHub Actions se encargará del resto! Ve a `https://github.com/TU_USUARIO/TU_REPOSITORIO/actions` para ver el progreso.

### 7.4 Verificar el Workflow

1. **Ve a la pestaña Actions** en tu repositorio GitHub
2. **Verás la ejecución del workflow** después de cada push
3. **Haz clic en la ejecución** para ver los logs detallados
4. **Si falla**, revisa los logs para identificar el problema

### 7.5 Despliegue Manual (Si es Necesario)

Si prefieres no usar CI/CD o necesitas deployar manualmente:

```bash
# En el servidor
cd /var/www/bcb_global
git pull origin main

# Luego seguir los pasos de actualización manual (Sección 4.2)
```

---

¡Despliegue completado! Si tienes alguna pregunta o problema, revisa los logs y sigue la guía de solución de problemas.
