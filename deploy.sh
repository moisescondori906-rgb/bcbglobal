#!/bin/bash

# BCB Global - Professional Deployment Script v7.0.6
# Senior Architect Standard - High Stability

set -e

# Configuración
PROJECT_DIR="/root/SAV-main" # Ajustar según el servidor
APP_NAME="bcb-global"
BACKUP_DIR="/root/backups/bcb_$(date +%Y%m%d_%H%M%S)"

echo "🚀 Iniciando despliegue profesional de BCB Global..."

# 1. Validación de Entorno
if [ ! -f "backend/.env" ]; then
    echo "❌ ERROR: Archivo backend/.env no encontrado. El despliegue se detendrá."
    exit 1
fi

# 2. Backup Preventivo (Opcional pero recomendado)
# echo "💾 Creando backup preventivo..."
# mkdir -p $BACKUP_DIR
# cp -r backend/src $BACKUP_DIR/
# cp backend/.env $BACKUP_DIR/

# 3. Sincronización de código
echo "📥 Trayendo cambios de GitHub..."
git pull origin main

# 4. Backend - Dependencias
echo "📦 Instalando dependencias del Backend..."
cd backend
npm install --production --no-audit --no-fund
cd ..

# 5. Frontend - Build Optimizado
echo "🏗️ Construyendo el Frontend..."
cd frontend
npm install --no-audit --no-fund
npm run build

echo "🧹 Limpiando directorio public del backend..."
rm -rf ../backend/public/*
echo "🚚 Moviendo build al servidor estático del backend..."
cp -r dist/* ../backend/public/
cd ..

# 6. Reinicio Seguro con PM2 (Cluster Mode)
echo "🔄 Reiniciando procesos PM2 en modo seguro..."
# Usamos --update-env para recargar variables del .env
pm2 restart ecosystem.config.cjs --update-env || pm2 start ecosystem.config.cjs --env production

# 7. Verificación de Salud Post-Deploy
echo "🔍 Verificando estabilidad del sistema..."
sleep 5
HEALTH_CHECK=$(curl -s http://localhost:4000/health)

if [[ $HEALTH_CHECK == *"\"status\":\"ok\""* ]]; then
  echo "✅ DESPLIEGUE EXITOSO."
  echo "📊 Status: $HEALTH_CHECK"
  
  # Ejecutar test de humo básico
  echo "🧪 Ejecutando Smoke Test..."
  cd backend && node src/prod-test.js || echo "⚠️ Advertencia: Smoke Test falló pero el servidor está arriba."
  cd ..
else
  echo "❌ ERROR CRÍTICO: El servidor no respondió correctamente tras el despliegue."
  echo "📋 Últimos logs de error:"
  pm2 logs $APP_NAME --lines 20 --no-colors
  exit 1
fi

echo "🚀 Sistema BCB Global Online y Estable."
