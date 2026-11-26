import { useEffect, useMemo } from 'react';
import { useNexusSettings } from './NexusProvider';
import type { NexusSettings } from './settings';
import { daylightLevel, effectiveBrightness, sunTimes, type SunTimes } from './sun';
import { paletteFor, THEMES, uiPalette, windshieldPalette, type NexusPalette, type NexusTheme } from './themes';

export interface NexusCtx {
  nx: NexusSettings;
  theme: NexusTheme;
  /** Kokpit paleti */
  pal: NexusPalette;
  /** Cam modu paleti (saf siyah, yüksek kontrast) */
  wpal: NexusPalette;
  /** Menü ekranları için daha açık palet */
  upal: NexusPalette;
  /** Işık seviyesi: 0 gece … 1 gündüz (güneşe göre modda yumuşak geçer) */
  light: number;
  day: boolean;
  /** Bugünün güneş saatleri (konum biliniyorsa) */
  sun: SunTimes | null;
  /** Uygulanacak parlaklık: ayar + gece kısılması */
  brightness: number | null;
  update: (patch: Partial<NexusSettings>) => void;
}

export function useNexus(): NexusCtx {
  const { nx, update, now } = useNexusSettings();
  const theme = THEMES[nx.theme];
  const pos = nx.lastPos;
  const sun = useMemo(() => (pos ? sunTimes(new Date(now), pos.lat, pos.lon) : null), [pos, now]);
  // Seviye 2 ondalıkla yuvarlanır: dakikalık saat tıklaması paleti gereksiz yere yeniden hesaplatmasın
  const light = nx.dayNight === 'gunduz' ? 1 : nx.dayNight === 'gece' ? 0 : Math.round(daylightLevel(new Date(now), pos) * 100) / 100;
  const pal = useMemo(() => paletteFor(theme, light, nx.accent), [theme, light, nx.accent]);
  // Windshield HUD kendi başına bir tema: kokpit temasından bağımsız, yalnızca vurgu rengini alır
  const wpal = useMemo(() => windshieldPalette(THEMES.nexus, light, nx.accent), [light, nx.accent]);
  // Menüler ışık seviyesinden bağımsız, her zaman okunaklı
  const upal = useMemo(() => uiPalette(paletteFor(theme, 1, nx.accent)), [theme, nx.accent]);
  const brightness = effectiveBrightness(nx.brightness, light);
  return { nx, theme, pal, wpal, upal, light, day: light >= 0.5, sun, brightness, update };
}

/**
 * GPS konumunu (yaklaşık, 2 ondalık) hatırlar: güneşe göre ışık, uygulama yeniden açılınca da
 * doğru saatleri kullansın. Yalnızca konum belirgin değişince (~10 km) kaydedilir.
 */
export function useRememberPosition(last: { lat: number; lon: number } | null) {
  const { nx, update } = useNexusSettings();
  const lat = last ? Math.round(last.lat * 100) / 100 : null;
  const lon = last ? Math.round(last.lon * 100) / 100 : null;
  useEffect(() => {
    if (lat == null || lon == null) return;
    const p = nx.lastPos;
    if (p && Math.abs(p.lat - lat) < 0.1 && Math.abs(p.lon - lon) < 0.1) return;
    update({ lastPos: { lat, lon } });
  }, [lat, lon, nx.lastPos, update]);
}
