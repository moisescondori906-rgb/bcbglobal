#!/bin/bash

# ==========================================
# BCB GLOBAL - SCRIPT DE DESPLIEGUE REAL
# ==========================================

echo "🚀 Iniciando despliegue en producción..."

# Ir a la raíz del proyecto
cd /var/www/bcb_global || exit 1

# 1. Actualizar código
echo "📥 Actualizando código desde GitHub..."
git pull origin main || { echo "❌ Error en git pull"; exit 1; }

# 2. Preparar Backend
echo "📦 Configurando Backend..."
cd backend || exit 1
npm install || { echo "❌ Error en npm install (backend)"; exit 1; }

# Sincronizar Base de Datos (idempotente)
echo "🗄️ Sincronizando Base de Datos..."
node src/db-sync.mjs || { echo "⚠️ Advertencia en db-sync.mjs, continuando..."; }

# Reiniciar Backend con PM2
echo "🔄 Reiniciando proceso PM2..."
pm2 restart bcb-global-backend || pm2 start ecosystem.config.cjs --name bcb-global-backend
pm2 save

# 3. Preparar Frontend
echo "🎨 Configurando Frontend..."
cd ../frontend || exit 1
npm install || { echo "❌ Error en npm install (frontend)"; exit 1; }
npm run build || { echo "❌ Error en build del frontend"; exit 1; }

# 4. Reiniciar Nginx (opcional pero recomendado si hay cambios de conf)
echo "🌐 Verificando Nginx..."
sudo nginx -t && sudo systemctl restart nginx || echo "⚠️ No se pudo reiniciar Nginx (ignorar si no eres root)"

# 5. Verificación Final
echo "🩺 Verificando salud del sistema..."
sleep 5
curl -f http://127.0.0.1:4000/api/health || { echo "❌ El backend no responde en /api/health"; exit 1; }
curl -f http://173.249.55.143/api/health || { echo "❌ El servidor no es accesible externamente"; exit 1; }

echo "✅ DESPLIEGUE COMPLETADO CON ÉXITO"
