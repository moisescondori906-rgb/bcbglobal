# Global — Documento de Diseño Visual

Referencia exclusiva de **aspecto e interfaz** basada en las capturas proporcionadas. Solo diseño, sin implementación técnica.

---

## 1. Identidad visual

### Marca
- **Nombre:** Global (reemplazar cualquier "SAV" en referencias)
- **Logo:** Icono con diamante/cuadrado estilizado de color azul
- **Variantes:** Texto "Global" en blanco o negro según fondo

### Paleta de colores principal

| Uso | Color | Aproximación | Contexto |
|-----|-------|--------------|----------|
| **Acento primario** | Azul profundo | `#1a1f36` | Headers, cards, iconos, logo |
| **Acento secundario** | Amarillo/dorado | `#D4AF37` | Montos, botones, valores, enlaces |
| **Verde éxito** | Verde lima / menta | `#d4edbc` / `#00C853` | Badges, selección, estados activos |
| **Fondo general** | Crema/beige | `#F9F9F5` / `#F5F5F0` | Body |
| **Contenedores** | Blanco | `#FFFFFF` | Cards, inputs |
| **Texto principal** | Negro/gris oscuro | `#333` | Títulos, labels |
| **Texto secundario** | Gris medio | `#666` / `#999` | IDs, fechas, metadatos |
| **Error / salir** | Rojo | — | Botón cerrar sesión, errores |
| **Tema VIP/Ganancias** | Verde esmeralda | `#004D40`, `#E8F5E9` | Sección VIP, tabla de niveles |

---

## 2. Tipografía

- **Familia:** Sans-serif (limpia y moderna)
- **Jerarquía:**
  - Títulos: negrita, negro
  - Labels: negrita, negro
  - Valores: tamaño destacado
  - Metadatos: gris, menor peso
- **Detalle:** "sala de tareas" y otros títulos en minúsculas en algunas pantallas

---

## 3. Componentes por pantalla

### 3.1 Header / Barra superior
- Fondo blanco
- Flecha de retroceso (`<`) a la izquierda
- Título centrado, negrita
- Acciones opcionales a la derecha (ej. "registro" en dorado)
- Altura fija, estilo limpio

### 3.2 Carrusel (Dashboard)
- Imagen principal grande
- Overlay central con logo Global (hexagonal)
- Paginación con puntos en la parte inferior
- Cambio automático cada 5 segundos

### 3.3 Grid de acciones (Dashboard)
- 6 iconos en 2 filas × 3 columnas
- Iconos en azul (línea)
- Etiquetas debajo: Tarea, Fondo de Riqueza, Noticias de Conferencia, Retirada, Recargar, Código de invitación
- Icono flotante de ruleta/sorteo a un lado

### 3.4 Cards de usuario / balance
- Rectángulos con bordes redondeados (12–16px)
- Card principal oscura (azul/índigo):
  - "Activos totales (Bolivianos)" con valor grande en blanco
  - "Nivel actual" (ej. "pasante", "Global 1", "Global 2")
  - Dos botones: Recargar y Retirada (verde lima)
- Cards de estadísticas:
  - Fondo verde lima suave
  - Métricas en grid (2×2 o 3 columnas)
  - Números destacados, etiquetas en gris

### 3.5 Sala de tareas
- **Card de estado:**
  - Nivel grande ("pasante", "Global 2")
  - "restantes X" / "completadas X"
  - Barra de progreso horizontal (teal/menta)
- **Lista de tareas:**
  - Cards blancas con borde gris suave
  - Miniatura cuadrada con icono de play
  - Badge del nivel (teal, texto blanco)
  - "Precio de recompensa" + monto en dorado + "Bolivianos"

### 3.6 Detalle de tarea (modal)
- Overlay oscuro
- Modal blanco con esquinas redondeadas
- Botón cerrar (X) en círculo amarillo
- Instrucción del enunciado
- Opciones tipo botón/pill:
  - Seleccionada: amarillo con texto negro
  - No seleccionada: gris claro
- Botón "Enviar Respuesta" amarillo, ancho completo
- Imagen/video visible de fondo (parcialmente tapado)

### 3.7 Retiro
- Secciones en cards blancas
- **Tipo de billetera:** dos opciones con radio button
  - Saldo en dorado
  - Check verde cuando está seleccionado
- **Tarjeta bancaria:** card con nombre (ej. "yape 7945") y check
- **Monto:** grid de opciones (25, 100, 500, 1500, 5000, 10000) o input
  - Valores predefinidos con radio
- **Contraseña del fondo:** input con icono de ojo
- Toast de error: fondo gris oscuro, texto claro
- Info: "Tarifa de manejo" + "0 Bs" en dorado
- Nota de horario límite en gris
- Botón "Retirar inmediatamente" amarillo, pill-shaped

### 3.8 Registros (Recarga / Retiro / Facturación)
- **Tabs:** Ingresos | Gastos (o Recarga | Retiro)
  - Activo: negro, subrayado
  - Inactivo: gris
- **Lista de items:**
  - ID (izq, gris pequeño)
  - Fecha/hora (der, gris pequeño)
  - Monto (izq, dorado/naranja, destacado)
  - Estado/categoría (der)
- Pie de lista: "No hay más datos" centrado, gris

### 3.9 Seguridad de cuenta
- Lista vertical en card blanca
- Cada fila: icono + label + valor/placeholder + chevron (`>`)
- Campos: Avatares, Número de teléfono, Nombre real, Tarjeta bancaria, Contraseña de inicio de sesión, Contraseña del fondo
- Placeholder: "Haga clic para configurar" en gris
- Botón "Cerrar sesión" rojo, ancho completo, abajo

### 3.10 Informe del equipo
- Cards verdes: Ingresos totales / Ingresos de hoy (valores grandes blancos)
- Card de análisis: donut chart con leyenda (Tarea, Invitación, Inversión)
- Card blanca con header verde: Número total de miembros
- Subsecciones por nivel (A, B, C): columnas de datos + "Lista de membresía >"

### 3.11 VIP / Ganancias
- Hero oscuro con grid sutil y efectos de luz
- Logo SAV centrado
- Título: "DETALLES DE INGRESOS DE GRADO DE EMPLEADO (Bolivianos)" en verde brillante
- Tabla con header verde oscuro y filas alternadas (mint/blanco)
- Cards de texto explicativo debajo con badges de nivel (internar, S1, S2…)

### 3.12 Niveles S1, S2, S3 (cards)
- Cada nivel en card con gradiente suave (gris, rosa, naranja)
- Badge/medalla en esquina superior derecha
- Tres columnas: Tareas restantes | Completadas | Cantidad objetivo
- Número objetivo en color (verde, azul, púrpura según nivel)
- Botón "Unirse ahora" en púrpura cuando aplica

### 3.13 Sorteo / Ruleta
- Banner amarillo: "Oportunidades Restantes de Sorteo X"
- Rueda circular con segmentos, iconos de premios y valores
- Botón central naranja "GO"
- Tabs: Registro de Usuarios Ganadores | Registro de Sorteo
- Lista de ganadores: avatar + "Felicitaciones" + ID enmascarado + monto en rojo/naranja + Bolivianos
- Mensaje promocional al pie

### 3.14 Perfil de usuario
- Header con fondo semi-transparente (logo, ID parcial, código de invitación + icono copiar)
- Banner de bono: "Recibe un bono aleatorio con un código"
- Menú: Seguridad de la Cuenta, Registro de tareas, etc., con chevrons

---

## 4. Barra de navegación inferior

- Fondo blanco
- 5 ítems con icono + label:
  1. Inicio de casa (casa)
  2. Mesa de equipo (personas)
  3. VIP (diamante)
  4. Ganancias (documento/calculadora)
  5. Usuario (persona)
- Activo: icono y texto en negro
- Inactivo: gris
- Siempre visible, fija al fondo

---

## 5. Estados visuales

| Estado        | Color / indicador | Uso                    |
|---------------|-------------------|------------------------|
| Completado    | Verde             | Tareas, transacciones  |
| Pendiente     | Amarillo          | En revisión            |
| Rechazado     | Rojo              | Rechazos               |
| Procesado     | Gris / blanco     | Inactivo, expirado     |

---

## 6. Formas y espaciado

- Bordes redondeados (≈10–16px) en cards, botones, inputs
- Sombras suaves en cards
- Padding uniforme entre bloques
- Botones tipo pill (esquinas muy redondeadas) para acciones principales

---

## 7. Elementos recurrentes

- Iconos lineales en negro/azul
- Checkmarks verdes para selección
- Valores monetarios en dorado/amarillo
- Montos negativos en naranja/dorado en gastos
- Divisores finos grises entre filas de listas
- Chevrons (`>`) para navegación o “ver más”

---

## 8. Responsive

- Diseño pensado para móvil primero
- Cards apiladas verticalmente
- Grids 2 columnas en métricas
- Navegación inferior fija
- Header compacto con título centrado

---

*Documento solo de referencia visual. Para implementación técnica, usar la especificación funcional del proyecto SAV.*
