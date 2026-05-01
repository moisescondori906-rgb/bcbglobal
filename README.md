# BCB Global Institutional (v11.4.2)

🚀 **Auditoría Técnica Total Completada**: Sistema unificado en MySQL, eliminación de dependencias obsoletas y alineación total con la Tabla de Inversiones Global 1-9. Seguridad y resiliencia v11.4.2 lista para producción.

## Tabla Oficial de Niveles

| Nivel | Inversión (BOB) | Tareas/Día | Pago Tarea | Ingreso Diario | Ingreso Mensual |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Pasante** | 0.00 | 3 | 1.00 | 3.00 | — |
| **GLOBAL 1** | 230.00 | 4 | 1.80 | 7.20 | 216.00 |
| **GLOBAL 2** | 780.00 | 8 | 3.22 | 25.76 | 772.80 |
| **GLOBAL 3** | 2,900.00 | 15 | 6.76 | 101.40 | 3,042.00 |
| **GLOBAL 4** | 9,200.00 | 30 | 11.33 | 339.90 | 10,197.00 |
| **GLOBAL 5** | 28,200.00 | 60 | 17.43 | 1,045.80 | 31,374.00 |
| **GLOBAL 6** | 58,000.00 | 100 | 22.35 | 2,235.00 | 67,050.00 |
| **GLOBAL 7** | 124,000.00 | 160 | 31.01 | 4,961.60 | 148,848.00 |
| **GLOBAL 8** | 299,400.00 | 250 | 47.91 | 11,977.50 | 359,325.00 |
| **GLOBAL 9** | 541,600.00 | 400 | 58.87 | 23,548.00 | 706,440.00 |

## Requisitos del Servidor (Ubuntu 22.04+)

- **Node.js**: v20.x o v22.x
- **MySQL**: 8.0+
- **Redis**: Activo (Puerto 6379)
- **PM2**: Global (`npm install -g pm2`)
- **Nginx**: Configurado como Reverse Proxy

## Instalación y Despliegue

### 1. Preparación de la Base de Datos
```bash
cd backend
npm install
cp .env.example .env # Configurar credenciales reales

# 1. Crear BD y Esquema Base
node src/db-sync.mjs

# 2. Aplicar Parches de Seguridad y Sorteo (Idempotente)
node scripts/fix_schema_safe.mjs
```

### 2. Lanzamiento del Backend
```bash
pm2 start ecosystem.config.cjs
pm2 save
```

### 3. Construcción del Frontend
```bash
cd ../frontend
npm install
# Configurar VITE_API_URL en el entorno o .env
npm run build
```

## Health Check Profesional
El sistema expone un endpoint de salud ultra-resiliente en:
`https://bcb-global.com/api/health`

Respuesta esperada (200 OK):
```json
{
  "status": "ok",
  "version": "11.4.2",
  "db": "ok",
  "redis": "ok"
}
```

## Troubleshooting & Solución de Problemas

- **Login 401**: El sistema normaliza automáticamente el teléfono. Acepta `70000001`, `59170000001` y `+59170000001`. Si persiste, verifica que el `password_hash` en la DB sea compatible con `bcryptjs`.
- **Ruleta sin Premios**: Si la ruleta no muestra premios, ejecuta `node scripts/fix_schema_safe.mjs` para poblar los premios base.
- **Invitaciones con URL Incorrecta**: Asegúrate de que `VITE_WEB_URL` en el frontend esté configurado correctamente (ej: `https://bcb-global.com`).
- **Error 502 / 504**: Verifica que PM2 no esté en loop de reinicio: `pm2 logs bcb-global-backend`.

## Seguridad Integrada
- **CORS**: Configurado en `backend/src/index.mjs` para permitir solo dominios autorizados y subdominios de `bcb-global.com`.
- **Idempotencia**: Todas las transacciones financieras (retiros, tareas, ruleta) usan una tabla de `idempotencia` para evitar duplicados.
- **Auditoría**: Cada movimiento de saldo se registra en `auditoria_financiera` con un `trace_id` único.

---
© 2026 BCB Global Institutional Platform. Todos los derechos reservados.
