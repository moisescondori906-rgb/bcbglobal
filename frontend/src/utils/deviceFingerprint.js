
/**
 * Generador de Fingerprint robusto para dispositivos
 * Basado en múltiples fuentes de información para dificultar la evasión
 */

async function generateCanvasFingerprint() {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Configurar canvas
    canvas.width = 200;
    canvas.height = 50;
    
    // Dibujar texto complejo
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillStyle = '#f60';
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = '#069';
    ctx.fillText('BCB Global Fingerprint', 2, 15);
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.fillText('BCB Global Fingerprint', 4, 17);
    
    // Añadir texto con sombra
    ctx.shadowColor = 'blue';
    ctx.shadowOffsetX = 10;
    ctx.shadowOffsetY = 5;
    ctx.fillText('BCB', 30, 30);
    
    return canvas.toDataURL().replace('data:image/png;base64,', '').substring(0, 50);
  } catch (e) {
    return 'canvas-fallback';
  }
}

async function generateWebGLFingerprint() {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    
    if (!gl) return 'webgl-fallback';
    
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : 'unknown-renderer';
    const vendor = debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : 'unknown-vendor';
    
    return `${renderer}-${vendor}`.substring(0, 50);
  } catch (e) {
    return 'webgl-error';
  }
}

async function generateAudioFingerprint() {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const analyser = audioContext.createAnalyser();
    const gain = audioContext.createGain();
    
    oscillator.connect(analyser);
    analyser.connect(gain);
    gain.connect(audioContext.destination);
    
    oscillator.type = 'sine';
    oscillator.frequency.value = 1000;
    
    const buffer = audioContext.createBuffer(1, 44100, 44100);
    const destination = audioContext.createMediaStreamDestination();
    const destinationBuffer = destination.stream.getAudioTracks().length > 0 ? 'has-destination' : 'no-destination';
    
    oscillator.disconnect();
    analyser.disconnect();
    gain.disconnect();
    
    if (audioContext.close) {
      audioContext.close();
    }
    
    return destinationBuffer;
  } catch (e) {
    return 'audio-error';
  }
}

function getScreenInfo() {
  return {
    width: screen.width,
    height: screen.height,
    availWidth: screen.availWidth,
    availHeight: screen.availHeight,
    colorDepth: screen.colorDepth,
    pixelDepth: screen.pixelDepth,
    pixelRatio: window.devicePixelRatio || 1,
    orientation: screen.orientation ? screen.orientation.type : 'unknown'
  };
}

function getTimezoneInfo() {
  return {
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    timezoneOffset: new Date().getTimezoneOffset()
  };
}

function getBrowserInfo() {
  return {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    languages: navigator.languages,
    cookieEnabled: navigator.cookieEnabled,
    doNotTrack: navigator.doNotTrack,
    hardwareConcurrency: navigator.hardwareConcurrency,
    maxTouchPoints: navigator.maxTouchPoints || 0,
    vendor: navigator.vendor
  };
}

function getStorageInfo() {
  try {
    return {
      localStorage: !!window.localStorage,
      sessionStorage: !!window.sessionStorage,
      indexedDB: !!window.indexedDB
    };
  } catch (e) {
    return { localStorage: false, sessionStorage: false, indexedDB: false };
  }
}

async function hashString(str) {
  // Simple hash function for strings
  let hash = 0;
  if (str.length === 0) return hash;
  
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  return Math.abs(hash).toString(36);
}

export async function generateDeviceFingerprint() {
  try {
    // Recopilar toda la información del dispositivo
    const screenInfo = getScreenInfo();
    const timezoneInfo = getTimezoneInfo();
    const browserInfo = getBrowserInfo();
    const storageInfo = getStorageInfo();
    const canvasFP = await generateCanvasFingerprint();
    const webGLFP = await generateWebGLFingerprint();
    const audioFP = await generateAudioFingerprint();
    
    // Crear una cadena con toda la información
    const fingerprintData = JSON.stringify({
      screen: screenInfo,
      timezone: timezoneInfo,
      browser: browserInfo,
      storage: storageInfo,
      canvas: canvasFP,
      webgl: webGLFP,
      audio: audioFP
    });
    
    // Generar un hash
    const fingerprint = await hashString(fingerprintData);
    
    return {
      fingerprint,
      rawData: fingerprintData
    };
  } catch (error) {
    console.error('Error generating fingerprint:', error);
    
    // Fallback a un deviceId simple
    let id = localStorage.getItem('deviceId');
    if (!id) {
      id = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      localStorage.setItem('deviceId', id);
    }
    
    return {
      fingerprint: id,
      rawData: 'fallback'
    };
  }
}

export function getOrCreateDeviceId() {
  let id = localStorage.getItem('deviceId');
  if (!id) {
    id = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('deviceId', id);
  }
  return id;
}

export async function getDeviceInfo() {
  const { fingerprint } = await generateDeviceFingerprint();
  const deviceId = getOrCreateDeviceId();
  
  return {
    deviceId,
    fingerprint,
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language
  };
}
