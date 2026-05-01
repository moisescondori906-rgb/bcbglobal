#!/bin/bash

# ==========================================
# BCB GLOBAL - SCRIPT DE VALIDACIÓN PRE-DEPLOY
# ==========================================

echo "🔍 Iniciando validación técnica..."

# 1. VALIDACIÓN DE BACKEND
echo "⚙️ Verificando Backend..."
cd backend || exit 1

# Comprobar sintaxis de archivos críticos
FILES_TO_CHECK=("src/index.mjs" "src/handlers/api/auth.mjs" "src/services/dbService.mjs" "src/config/db.mjs")

for FILE in "${FILES_TO_CHECK[@]}"; do
    node --check "$FILE"
    if [ $? -ne 0 ]; then
        echo "❌ ERROR: Error de sintaxis en $FILE"
        exit 1
    fi
    echo "✅ $FILE: OK"
done

# Verificar ecosystem.config.cjs
if [ ! -f "ecosystem.config.cjs" ]; then
    echo "❌ ERROR: No se encuentra backend/ecosystem.config.cjs"
    exit 1
fi

# 2. VALIDACIÓN DE FRONTEND
echo "🖥️ Verificando Frontend..."
cd ../frontend || exit 1

npm install
npm run build
if [ $? -ne 0 ]; then
    echo "❌ ERROR: Falló el build del Frontend"
    exit 1
fi

if [ ! -d "dist" ]; then
    echo "❌ ERROR: La carpeta frontend/dist no existe tras el build"
    exit 1
fi
echo "✅ Build del Frontend: OK"

# 3. VERIFICACIÓN DE ESTRUCTURA RAÍZ
cd ..
if [ ! -f "README.md" ]; then
    echo "⚠️ Advertencia: Falta README.md en la raíz"
fi

echo "✨ TODAS LAS PRUEBAS PASARON. El repositorio está listo para producción."
