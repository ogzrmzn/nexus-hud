import * as Brightness from 'expo-brightness';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import type { Orientation } from './settings';

const TAG = 'nexus-hud';

/**
 * HUD ekranlarının cihaz ayarları: ekranı açık tutma, parlaklık ve yön kilidi.
 * Ekrandan çıkınca hepsi eski haline döner (uygulamanın geri kalanı dikey).
 */
type WebOrientation = { lock?: (o: string) => Promise<void>; unlock?: () => void };
const webOrientation = (): WebOrientation | undefined =>
  typeof screen !== 'undefined' ? ((screen as unknown as { orientation?: WebOrientation }).orientation ?? undefined) : undefined;

/** Web: ekran yönü kilidi yalnızca tam ekranda çalışır (Android Chrome); desteklenmezse sessizce geçer */
function lockWeb(o: Orientation) {
  webOrientation()
    ?.lock?.(o === 'yatay' ? 'landscape' : 'portrait')
    .catch(() => {});
}

export function isFullscreen(): boolean {
  return Platform.OS === 'web' && typeof document !== 'undefined' && !!document.fullscreenElement;
}

/** Web'de tam ekranı açar/kapatır ve seçili yönü kilitler. Telefonda uygulama zaten tam ekrandır. */
export async function toggleFullscreen(o: Orientation): Promise<void> {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else {
      await document.documentElement.requestFullscreen();
      lockWeb(o);
    }
  } catch {
    // tarayıcı izin vermediyse
  }
}

/**
 * HUD ekranlarının cihaz ayarları: ekranı açık tutma, parlaklık ve yön kilidi.
 * Seçilen yön (yatay/dikey) kilitlenir; virajda telefon yana yatsa da ekran dönmez.
 * Ekrandan çıkınca kilit kalkar.
 */
export function useHudSystem({ keepAwake, brightness, orientation }: { keepAwake: boolean; brightness?: number | null; orientation: Orientation }) {
  useEffect(() => {
    if (!keepAwake) return;
    activateKeepAwakeAsync(TAG).catch(() => {});
    return () => {
      deactivateKeepAwake(TAG).catch(() => {});
    };
  }, [keepAwake]);

  useEffect(() => {
    if (Platform.OS === 'web') {
      if (isFullscreen()) lockWeb(orientation);
      return;
    }
    ScreenOrientation.lockAsync(orientation === 'yatay' ? ScreenOrientation.OrientationLock.LANDSCAPE : ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
  }, [orientation]);

  useEffect(() => {
    return () => {
      if (Platform.OS === 'web') webOrientation()?.unlock?.();
      else ScreenOrientation.unlockAsync().catch(() => {});
    };
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web' || brightness === undefined) return;
    if (brightness === null) {
      Brightness.restoreSystemBrightnessAsync().catch(() => {});
      return;
    }
    Brightness.setBrightnessAsync(brightness).catch(() => {});
  }, [brightness]);

  useEffect(() => {
    if (Platform.OS === 'web' || brightness === undefined) return;
    return () => {
      Brightness.restoreSystemBrightnessAsync().catch(() => {});
    };
    // yalnızca ekrandan çıkarken
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
