import * as Brightness from 'expo-brightness';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useEffect } from 'react';
import { Platform } from 'react-native';

const TAG = 'nexus-hud';

/**
 * HUD ekranlarının cihaz ayarları: ekranı açık tutma, parlaklık ve yön kilidi.
 * Ekrandan çıkınca hepsi eski haline döner (uygulamanın geri kalanı dikey).
 */
export function useHudSystem({ keepAwake, brightness, orientation }: { keepAwake: boolean; brightness?: number | null; orientation: 'landscape' | 'free' }) {
  useEffect(() => {
    if (!keepAwake) return;
    activateKeepAwakeAsync(TAG).catch(() => {});
    return () => {
      deactivateKeepAwake(TAG).catch(() => {});
    };
  }, [keepAwake]);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    ScreenOrientation.lockAsync(orientation === 'landscape' ? ScreenOrientation.OrientationLock.LANDSCAPE : ScreenOrientation.OrientationLock.DEFAULT).catch(() => {});
    return () => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
    };
  }, [orientation]);

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
