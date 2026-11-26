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
type WebOrientation = { type?: string; lock?: (o: string) => Promise<void>; unlock?: () => void };
const webOrientation = (): WebOrientation | undefined =>
  typeof screen !== 'undefined' ? ((screen as unknown as { orientation?: WebOrientation }).orientation ?? undefined) : undefined;

/**
 * Kilitlenecek tek yön. "landscape" iki yatay yöne (sağa/sola yatık) izin verir ve telefon virajda
 * eğilince ekran 180° döner; bu yüzden o an hangi yatay/dikey yöndeyse yalnız o yöne kilitlenir.
 */
export function exactWebOrientation(o: Orientation, current: string | undefined): string {
  if (o === 'yatay') return current?.startsWith('landscape') ? current : 'landscape-primary';
  return current?.startsWith('portrait') ? current : 'portrait-primary';
}

/** Web: ekran yönü kilidi yalnızca tam ekranda çalışır (Android Chrome); desteklenmezse sessizce geçer */
function lockWeb(o: Orientation) {
  const so = webOrientation();
  so?.lock?.(exactWebOrientation(o, so.type)).catch(() => {});
}

/**
 * Web'de yön seçilince çağrılır (kullanıcı dokunuşu içinde): tam ekran değilse açar, sonra kilitler.
 * Tarayıcılar yön kilidine yalnızca tam ekranda izin verir.
 */
export async function lockOrientationWeb(o: Orientation): Promise<void> {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  try {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
  } catch {
    return;
  }
  lockWeb(o);
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
      // Tam ekrana her girişte kilidi yeniden uygula (tarayıcı çıkışta kilidi bırakır)
      const onFs = () => {
        if (isFullscreen()) lockWeb(orientation);
      };
      document.addEventListener('fullscreenchange', onFs);
      return () => document.removeEventListener('fullscreenchange', onFs);
    }
    let alive = true;
    (async () => {
      if (orientation === 'dikey') {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
        return;
      }
      // Yatay: telefon şu an hangi yana yatıksa yalnız o yöne kilitle (virajda 180° dönmesin)
      const cur = await ScreenOrientation.getOrientationAsync().catch(() => ScreenOrientation.Orientation.UNKNOWN);
      if (!alive) return;
      const lock =
        cur === ScreenOrientation.Orientation.LANDSCAPE_RIGHT ? ScreenOrientation.OrientationLock.LANDSCAPE_RIGHT : ScreenOrientation.OrientationLock.LANDSCAPE_LEFT;
      await ScreenOrientation.lockAsync(lock);
    })().catch(() => {});
    return () => {
      alive = false;
    };
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
