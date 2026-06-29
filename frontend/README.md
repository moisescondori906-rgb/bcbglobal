# Global (Frontend)

Aplicación cliente de Global construida con React, Vite y Tailwind CSS. Incluye soporte para App Android nativa mediante Capacitor.

## Scripts

- `npm run dev`: Inicia el servidor de desarrollo.
- `npm run build`: Genera la versión de producción en la carpeta `dist`.
- `npx cap sync android`: Sincroniza los cambios web con el proyecto de Android.
- `npx cap open android`: Abre el proyecto en Android Studio.

## Configuración de App Android

La aplicación está configurada como un contenedor remoto (WebView) que carga la URL de producción. Esto permite que la App se actualice automáticamente sin necesidad de que el usuario descargue un nuevo APK para cambios visuales o de lógica.

El archivo de configuración principal es `capacitor.config.json`.
