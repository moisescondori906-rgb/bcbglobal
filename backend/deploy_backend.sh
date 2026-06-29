#!/bin/bash

# Navegar al directorio del backend
cd /var/www/bcb_global/backend || { echo "Error: No se pudo cambiar al directorio del backend."; exit 1; }

echo "Instalando dependencias de Node.js..."
npm install || { echo "Error: Fallo la instalación de dependencias."; exit 1; }

echo "Reiniciando procesos de PM2..."
pm2 restart all || { echo "Error: Fallo el reinicio de PM2."; exit 1; }

echo "Verificando estado de PM2..."
pm2 list

echo "Despliegue del backend completado."
