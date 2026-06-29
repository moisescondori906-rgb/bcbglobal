export const APK_DOWNLOAD_URL = '/app-bcb-global.apk';

export const CONFIG = {
  // Versión de la App
  APP_VERSION: 'v7.0.0',
  
  // URL del APK público real
  APK_DOWNLOAD_URL: APK_DOWNLOAD_URL,
  
  // URL de la App en iOS (Google App como puente o acceso directo)
  IOS_APP_URL: 'https://apps.apple.com/app/google/id284815942',
  
  // URL de la plataforma web
  WEB_URL: import.meta.env.VITE_WEB_URL || window.location.origin,
  
  // Nombre de la App
  APP_NAME: 'BCB Global'
};
