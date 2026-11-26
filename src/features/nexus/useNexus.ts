import { useMemo } from 'react';
import { useNexusSettings } from './NexusProvider';
import { isDay, type NexusSettings } from './settings';
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
  day: boolean;
  update: (patch: Partial<NexusSettings>) => void;
}

export function useNexus(): NexusCtx {
  const { nx, update } = useNexusSettings();
  const theme = THEMES[nx.theme];
  const day = isDay(nx.dayNight);
  const pal = useMemo(() => paletteFor(theme, day, nx.accent), [theme, day, nx.accent]);
  // Windshield HUD kendi başına bir tema: kokpit temasından bağımsız, yalnızca vurgu rengini alır
  const wpal = useMemo(() => windshieldPalette(THEMES.nexus, day, nx.accent), [day, nx.accent]);
  const upal = useMemo(() => uiPalette(pal), [pal]);
  return { nx, theme, pal, wpal, upal, day, update };
}
