// =========================================================
// QLIZE NATIVE BRIDGE (Capacitor & Web Fallbacks)
// Hápticos dinámicos, Ciclo de vida, Orientación y Botón Atrás
// =========================================================

let isNative = false;
let App, Haptics, ImpactStyle, NotificationType, StatusBar, Style, ScreenOrientation;

// Solo importar módulos de Capacitor si estamos en un entorno nativo
try {
  const { Capacitor } = await import('@capacitor/core');
  isNative = Capacitor.isNativePlatform();
  
  if (isNative) {
    const appModule = await import('@capacitor/app');
    const hapticsModule = await import('@capacitor/haptics');
    const statusBarModule = await import('@capacitor/status-bar');
    const screenOrientationModule = await import('@capacitor/screen-orientation');
    
    App = appModule.App;
    Haptics = hapticsModule.Haptics;
    ImpactStyle = hapticsModule.ImpactStyle;
    NotificationType = hapticsModule.NotificationType;
    StatusBar = statusBarModule.StatusBar;
    Style = statusBarModule.Style;
    ScreenOrientation = screenOrientationModule.ScreenOrientation;
  }
} catch (err) {
  console.warn('[QLIZE Native] Capacitor no disponible, ejecutando en modo web');
  isNative = false;
}

export { isNative };

/**
 * Emite una vibración háptica según el evento del juego
 * @param {'jump' | 'optimal' | 'damage' | 'shield' | 'victory'} type
 * @param {boolean} enabled
 */
export async function triggerHaptic(type, enabled = true) {
  if (!enabled) return;

  try {
    if (isNative) {
      switch (type) {
        case 'jump':
          await Haptics.impact({ style: ImpactStyle.Light });
          break;
        case 'optimal':
          await Haptics.impact({ style: ImpactStyle.Medium });
          break;
        case 'damage':
          await Haptics.impact({ style: ImpactStyle.Heavy });
          break;
        case 'shield':
          await Haptics.vibrate({ duration: 80 });
          break;
        case 'victory':
          await Haptics.notification({ type: NotificationType.Success });
          break;
      }
    } else if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      // Fallback para navegadores móviles compatibles con Web Vibration API
      switch (type) {
        case 'jump':
          navigator.vibrate(15);
          break;
        case 'optimal':
          navigator.vibrate(25);
          break;
        case 'damage':
          navigator.vibrate([40, 30, 40]);
          break;
        case 'shield':
          navigator.vibrate([50, 40, 50]);
          break;
        case 'victory':
          navigator.vibrate([30, 40, 30, 40, 80]);
          break;
      }
    }
  } catch (err) {
    // Ignorar fallos de hápticos si el dispositivo no los soporta
  }
}

/**
 * Inicializa las APIs nativas de Android / iOS si se ejecuta bajo Capacitor
 * @param {Object} options
 * @param {(isActive: boolean) => void} [options.onAppStateChange]
 * @param {() => void} [options.onBackButton]
 */
export async function initNative(options = {}) {
  if (!isNative) return;

  try {
    // 1. Bloqueo de Orientación a Vertical (Portrait)
    await ScreenOrientation.lock({ orientation: 'portrait' }).catch(() => {});

    // 2. Configuración de Barra de Estado Oscura / Inmersiva
    await StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
    await StatusBar.setBackgroundColor({ color: '#02040a' }).catch(() => {});
    await StatusBar.setOverlaysWebView({ overlay: true }).catch(() => {});

    // 3. Ciclo de Vida: Detección de suspensión / reanudación de la aplicación
    if (options.onAppStateChange) {
      App.addListener('appStateChange', ({ isActive }) => {
        options.onAppStateChange(isActive);
      });
    }

    // 4. Botón Atrás del Sistema Android
    if (options.onBackButton) {
      App.addListener('backButton', () => {
        options.onBackButton();
      });
    }
  } catch (err) {
    console.warn('[QLIZE Native] Error inicializando integraciones nativas:', err);
  }
}

/**
 * Cierra la aplicación de forma nativa
 */
export function exitApp() {
  if (isNative) {
    App.exitApp();
  }
}
