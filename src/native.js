// =========================================================
// QLIZE NATIVE BRIDGE (Capacitor & Web Fallbacks)
// Hápticos dinámicos, Ciclo de vida, Orientación y Botón Atrás
// =========================================================

import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { StatusBar, Style } from '@capacitor/status-bar';
import { ScreenOrientation } from '@capacitor/screen-orientation';

export const isNative = Capacitor.isNativePlatform();

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
