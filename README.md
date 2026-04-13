# BCB Global Institutional (v7.0.0)

🚀 **Actualización Premium**: Auditoría Técnica Total completada. Sistema unificado en MySQL, eliminación de dependencias de Supabase, y alineación total con la Tabla de Inversiones Global 1-9.

Plataforma profesional de Activos Virtuales con sistema de tareas por video, niveles VIP Institucionales, gestión financiera robusta y panel administrativo en tiempo real optimizado para alta concurrencia.

## Tabla Oficial de Niveles

| Nivel | Inversión (BOB) | Tareas/Día | Pago Tarea | Ingreso Diario |
| :--- | :--- | :--- | :--- | :--- |
| Pasante | 0 | 3 | 2.00 | 6.00 |
| GLOBAL 1 | 200 | 5 | 4.00 | 20.00 |
| GLOBAL 2 | 720 | 10 | 7.20 | 72.00 |
| GLOBAL 3 | 2,830 | 20 | 14.15 | 283.00 |
| GLOBAL 4 | 5,500 | 40 | 27.50 | 1,100.00 |
| GLOBAL 5 | 12,000 | 60 | 60.00 | 3,600.00 |
| GLOBAL 6 | 25,000 | 80 | 125.00 | 10,000.00 |
| GLOBAL 7 | 50,000 | 100 | 250.00 | 25,000.00 |
| GLOBAL 8 | 100,000 | 150 | 500.00 | 75,000.00 |
| GLOBAL 9 | 200,000 | 200 | 1,000.00 | 200,000.00 |

## Requisitos

- Node.js 18+
- MySQL 8.0+ (Optimizado para Contabo)
- npm

## Instalación

### 1. Backend

```bash
cd backend
npm install
```

Configurar archivo `.env`:

```
PORT=4000
JWT_SECRET=tu_clave_secreta
MYSQL_HOST=localhost
MYSQL_USER=root
MYSQL_PASSWORD=tu_password
MYSQL_DATABASE=bcb_global
```

Sincronizar niveles y base de datos:
```bash
node src/data/migrate.js
```

Iniciar:
```bash
npm run dev
```

### 2. Frontend

```bash
cd frontend
npm install
```

Configurar archivo `.env`:
```
VITE_API_URL=http://localhost:4000/api
VITE_BACKEND_URL=http://localhost:4000
```

Iniciar:
```bash
npm run dev
```

## Estructura del Proyecto

```
bcb_global/
├── backend/          # API Node.js + Express + MySQL
├── frontend/         # React + Vite + Tailwind (App Android Capacitor)
├── public/           # Recursos estáticos (Videos/Imágenes)
└── DISENO-VISUAL-SAV.md
```

## Funcionalidades Clave

- ✅ **Arquitectura MySQL**: Transacciones SQL para integridad financiera total.
- ✅ **Idempotencia**: Protección contra doble acreditación de tareas y pagos.
- ✅ **Sistema de Red**: Comisiones de 3 niveles (10%, 3%, 1%) con validación de jerarquía.
- ✅ **Tickets de Ruleta**: Premios automáticos por ascenso de nivel.
- ✅ **Modo Demo**: Sistema de respaldo para pruebas sin base de datos activa.
- ✅ **Seguridad**: Encriptación robusta y protección de endpoints administrativos.

## Observaciones

Este proyecto es una plataforma institucional de alto rendimiento. Se recomienda una auditoría de seguridad adicional antes de despliegues en entornos financieros críticos.
