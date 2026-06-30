// Utilidad para precargar videos y almacenarlos en caché del navegador
// Con esto, los videos se descargan tan pronto como el usuario entra al sitio

// Almacén de videos precargados en memoria
const preloadedVideos = new Map();

// Función para precargar un solo video
export function preloadVideo(videoUrl) {
  if (!videoUrl) return null;
  
  // Si ya está precargado, devolverlo directamente
  if (preloadedVideos.has(videoUrl)) {
    return preloadedVideos.get(videoUrl);
  }
  
  // Crear un elemento video oculto para precargar
  const video = document.createElement('video');
  video.preload = 'auto'; // Precargar todo el video
  video.src = videoUrl;
  video.muted = true; // Para evitar problemas con autoplay
  video.style.display = 'none';
  
  // Agregar al DOM para que empiece la precarga
  document.body.appendChild(video);
  
  // Almacenar en el mapa
  preloadedVideos.set(videoUrl, video);
  
  console.log(`[VideoPreloader] Precargando video: ${videoUrl}`);
  
  return video;
}

// Función para precargar múltiples videos
export function preloadAllVideos(videoUrls) {
  return videoUrls.map(url => preloadVideo(url));
}

// Función para obtener un video precargado
export function getPreloadedVideo(videoUrl) {
  return preloadedVideos.get(videoUrl);
}

// Función para limpiar videos precargados (por si es necesario)
export function clearPreloadedVideos() {
  preloadedVideos.forEach((video, url) => {
    try {
      if (video.parentNode) {
        video.parentNode.removeChild(video);
      }
    } catch (e) {
      console.error('[VideoPreloader] Error al limpiar video:', e);
    }
  });
  preloadedVideos.clear();
  console.log('[VideoPreloader] Limpiada la caché de videos precargados');
}