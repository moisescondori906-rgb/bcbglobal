#!/bin/bash

# ==========================================
# BCB GLOBAL - SCRIPT DE DEPLOY PROFESIONAL
# ==========================================

echo "🚀 Iniciando proceso de despliegue y validación..."

# 1. VALIDACIÓN DE BACKEND
echo "🔍 Verificando integridad del Backend..."
cd backend
npm install
node -c src/index.js
if [ $? -ne 0 ]; then
    echo "❌ ERROR: El código del Backend tiene errores de sintaxis."
    exit 1
fi
echo "✅ Backend sintácticamente correcto."

# 2. VALIDACIÓN DE FRONTEND (BUILD)
echo "🏗️ Iniciando Build del Frontend..."
cd ../frontend
npm install
npm run build
if [ $? -ne 0 ]; then
    echo "❌ ERROR: Falló el build del Frontend. Revisa los logs arriba."
    exit 1
fi
echo "✅ Frontend build exitoso."

# 3. REINICIO DE PROCESOS (PM2)
echo "🔄 Reiniciando servicios con PM2..."
cd ..
pm2 restart bcb-global-backend || pm2 start backend/src/index.js --name bcb-global-backend
pm2 save

# 4. VERIFICACIÓN DE SALUD (HEALTH CHECK)
echo "🩺 Verificando estado del servidor..."
sleep 3 # Esperar a que el server levante
curl -s http://localhost:4000/health | grep "ok"
if [ $? -ne 0 ]; then
    echo "❌ ERROR: El servidor no responde en el puerto 4000 o el health check falló."
    pm2 logs bcb-global-backend --lines 50 --no-daemon & sleep 5 ; kill $!
    exit 1
fi
echo "✅ Servidor Online y Saludable."

# 5. RESUMEN DE LOGS
echo "📋 Últimos 20 logs del sistema:"
pm2 logs bcb-global-backend --lines 20 --no-daemon & sleep 2 ; kill $!

echo "🚀 DESPLIEGUE COMPLETADO CON ÉXITO v7.0.4"
