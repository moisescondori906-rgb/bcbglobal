#!/bin/bash

# ==========================================
# BCB GLOBAL - SCRIPT DE DESPLIEGUE v7.0.5
# ==========================================

set -e # Salir si ocurre un error

echo "🚀 Iniciando despliegue de BCB Global v7.0.5..."

# 1. ACTUALIZAR CÓDIGO
echo "📥 Descargando cambios de Git..."
git pull origin main

# 2. BACKEND
echo "⚙️ Configurando Backend..."
cd backend
npm install
# Limpiar logs antiguos
mkdir -p logs
rm -f logs/*.log

# Validación de sintaxis antes de reiniciar
node -c src/index.js
echo "✅ Backend validado."

# 3. FRONTEND
echo "🏗️ Construyendo Frontend..."
cd ../frontend
npm install
npm run build
echo "✅ Frontend construido exitosamente."

# 4. REINICIO DE SERVICIOS
echo "🔄 Reiniciando procesos con PM2..."
cd ..
pm2 restart bcb-global-backend || pm2 start backend/src/index.js --name bcb-global-backend
pm2 save

# 5. VERIFICACIÓN FINAL
echo "🩺 Verificando salud del sistema..."
sleep 5
HEALTH=$(curl -s http://localhost:4000/health | grep -o "ok" || echo "failed")

if [ "$HEALTH" == "ok" ]; then
    echo "✅ SISTEMA ONLINE (v7.0.5)"
    echo "📋 Últimos logs:"
    pm2 logs bcb-global-backend --lines 20 --no-daemon & sleep 3 ; kill $!
else
    echo "❌ ERROR: El backend no respondió correctamente tras el reinicio."
    pm2 logs bcb-global-backend --lines 50 --no-daemon & sleep 5 ; kill $!
    exit 1
fi

echo "🚀 DESPLIEGUE COMPLETADO EXITOSAMENTE."
