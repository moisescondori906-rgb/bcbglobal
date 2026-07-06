# IMPLEMENTATION_PLAN.md

## 1. Resumen Ejecutivo

Este documento detalla el plan de implementación para las mejoras y nuevas funcionalidades del sistema BCB Global, abarcando módulos críticos como la gestión de estados de transacciones, visualización de información bancaria, integración con Telegram, flujos de pasantías, reportes financieros, seguridad y optimización. El objetivo es realizar una actualización integral que mantenga la robustez, escalabilidad y seguridad de la plataforma actual, preparándola para una base de usuarios concurrente masiva.

## 2. Estado Actual del Proyecto

El proyecto BCB Global cuenta con una arquitectura modular en Node.js (backend) y React (frontend). Utiliza MySQL/MariaDB como base de datos, con Redis para caché y un sistema de migraciones (`.mjs` files) para la evolución del esquema. La aplicación ya implementa mecanismos de idempotencia y transacciones para operaciones críticas, lo cual es un excelente punto de partida para las nuevas implementaciones. La integración con Telegram ya existe para operaciones básicas y hay tablas de auditoría financiera y operacional.

### Hallazgos Clave:
*   **Base de Datos**: El esquema ya ha sido actualizado con los nuevos estados de `Verificando`, `Aceptado`, `Rechazado` para `compras_nivel` y `retiros`, incluyendo `estado_operativo` para Telegram. La migración de datos de estados antiguos a nuevos ya se gestionó en `023_bcb_global_complete_system.mjs`. Los números de cuenta completos se almacenan, pero la lógica de enmascaramiento se maneja a nivel de aplicación/frontend.
*   **Backend**: La lógica principal de negocio reside en `dbService.mjs` y los `handlers/api/*.mjs`. Se observan algunas referencias a estados antiguos (`pendiente`, `completada`, `aprobado`, `pagado`, `rechazado`) que necesitan ser actualizadas a los nuevos estados unificados. El sistema de pasantías y la lógica de aprobación de retiros por patrocinadores son áreas clave que requieren desarrollo significativo.
*   **Frontend**: Necesitará actualizaciones para reflejar los nuevos estados, mostrar números de cuenta completos y adaptar la interfaz del panel `Mi Equipo`.

## 3. Base de Datos

- **schema.sql**
    - **Estado**: Completado. Las tablas `compras_nivel` y `retiros` ya definen los estados `ENUM('Verificando', 'Aceptado', 'Rechazado')` para la columna `estado`.
- **telegram_schema.sql**
    - **Estado**: Completado. Las tablas `retiros` y `compras_nivel` ya definen los estados `ENUM('Verificando', 'Tomado', 'Aceptado', 'Rechazado')` para la columna `estado_operativo`.
- **023_bcb_global_complete_system.mjs (Migración)**
    - **Estado**: Completado. Esta migración ya realiza la actualización de los `ENUM` y migra los datos existentes a los nuevos estados. También añade columnas para el flujo de pasantías y la tabla `limites_retiros_pasantia`.

## 4. Backend

### 4.1 admin.mjs

- **Hallazgo**: Este archivo maneja la mayoría de las funcionalidades administrativas, incluyendo la gestión de usuarios, niveles, recargas, retiros, configuración global y Telegram. Contiene varios endpoints REST que interactúan directamente con `dbService.mjs` y la base de datos. Se encontraron referencias a estados antiguos en consultas SQL y lógica de negocio que necesitan ser actualizadas a los nuevos estados unificados (`Verificando`, `Aceptado`, `Rechazado`). También existen endpoints para la gestión de equipos de Telegram, horarios y miembros.

- **Impacto**: La actualización de estados es crítica para la consistencia del sistema y la correcta visualización en todas las plataformas. La implementación de la búsqueda administrativa, la sección "Mi Equipo" y los reportes financieros afectará directamente a este controlador.

- **Archivos afectados**: 
    - `backend/src/handlers/api/admin.mjs`

    - **Cambios requeridos**:
        - **Actualización de Estados**: Modificar todas las consultas SQL y la lógica que hagan referencia a los estados antiguos (`pendiente`, `completada`, `aprobado`, `pagado`, `rechazado`) para usar los nuevos estados (`Verificando`, `Aceptado`, `Rechazado`). Por ejemplo:
            - `router.get('/stats')`: Las subconsultas para `recargas_hoy` y `retiros_hoy` aún usan `estado = 'Aceptado'` (que es correcto) pero las anteriores eran `completada` y `pagado`. Se debe revisar si hay más ocurrencias que no se hayan actualizado aún.
            - `router.post('/compras-nivel/:id/rechazar')` y su alias `/recargas/:id/rechazar`: Ya usan `estado = 'Verificando'` y actualizan a `estado = 'Rechazado'`, lo cual es correcto.
            - `router.post('/compras-nivel/:id/aprobar')` y su alias `/recargas/:id/aprobar`: Invoca `approveLevelPurchase` de `dbService.mjs`, que debe asegurarse de manejar los nuevos estados.
            - `router.post('/retiros/:id/aprobar')`: Invoca `approveRetiro` de `dbService.mjs`.
            - `router.post('/retiros/:id/rechazar')`: Invoca `rejectRetiro` de `dbService.mjs`.
        - **Buscador Administrativo (MÓDULO 5)**: Implementar lógica de búsqueda por Nombre, ID, Teléfono, Código de invitación y Número de cuenta bancaria en el endpoint `/usuarios` o crear uno nuevo (`/usuarios/search`). Esto implicará modificar la consulta SQL para incluir cláusulas `WHERE` dinámicas y posiblemente usar índices de texto completo o `LIKE` con cuidado para optimizar el rendimiento.
        - **Mi Equipo Panel (MÓDULO 10, MÓDULO 11)**: El endpoint `/usuarios` o un nuevo endpoint (`/team`) necesitará lógica para:
            - Filtrar y mostrar solo subordinados directos (`invitado_por`).
            - Incluir `Foto`, `Estado` (del subordinado), `Ganancias` y `Solicitudes pendientes` (de retiro) en la respuesta.
            - Añadir endpoints para `Aceptar Retiro` y `No Aceptar Retiro` para los patrocinadores, con validaciones para `Nivel A`.
        - **Reporte Financiero Automático (MÓDULO 6)**: No es un endpoint directo aquí, pero el administrador podría tener un endpoint para ver o disparar manualmente el reporte. La lógica principal estará en un job programado, pero la API podría consumir los datos generados.

### 4.2 withdrawals.mjs

### 4.3 recharges.mjs

### 4.4 dbService.mjs

## 5. Telegram

## 6. Frontend

## 7. Riesgos

## 8. Dependencias

## 9. Orden Recomendado de Implementación

## 10. Estimación de Cambios
