#!/bin/bash 
 
 echo "🚀 Deploy iniciado" 
 
 git pull origin main || exit 1 
 
 npm install || exit 1 
 
 cd frontend || exit 1 
 npm install || exit 1 
 npm run build || exit 1 
 cd .. 
 
 pm2 reload bcb || exit 1 
 
 sleep 3 
 
 curl -f http://localhost:4000/health || exit 1 
 
 echo "✅ Deploy OK"
