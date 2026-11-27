import { memo, useEffect, useState } from 'react';
import { clockDuration, clockText } from '@/features/nexus/format';
import type { GlyphStyle, NexusPalette } from '@/features/nexus/themes';
import { DataCell } from './primitives';
import { NxNumber } from './NxNumber';

/**
 * Kendi zamanlayıcısı olan küçük göstergeler. Saat ve süre her saniye değişir; bunu yalnızca bu küçük
 * bileşenler yeniden çizer. Sürüş ekranının geri kalanı (hız göstergesi, veriler) yalnızca GPS verisi
 * gelince yenilenir. Böylece her saniye tüm ekranın baştan çizilmesi ve takılmalar önlenir.
 */
export function useNow(intervalMs: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

export const LiveClock = memo(function LiveClock({ height, color, glyph, weightScale }: { height: number; color: string; glyph: GlyphStyle; weightScale?: number }) {
  const now = useNow(5000);
  return <NxNumber text={clockText(new Date(now))} height={height} color={color} style={glyph} weightScale={weightScale} />;
});

export const LiveElapsed = memo(function LiveElapsed({
  startedAt,
  active,
  height,
  color,
  glyph,
  weightScale,
}: {
  startedAt: number;
  active: boolean;
  height: number;
  color: string;
  glyph: GlyphStyle;
  weightScale?: number;
}) {
  const now = useNow(1000);
  return <NxNumber text={active ? clockDuration(now - startedAt) : '--'} height={height} color={color} style={glyph} weightScale={weightScale} />;
});

export const LiveElapsedCell = memo(function LiveElapsedCell({
  startedAt,
  active,
  pal,
  glyph,
  size,
  align,
}: {
  startedAt: number;
  active: boolean;
  pal: NexusPalette;
  glyph: GlyphStyle;
  size: number;
  align: 'flex-start' | 'center' | 'flex-end';
}) {
  const now = useNow(1000);
  return <DataCell label="SÜRE" value={active ? clockDuration(now - startedAt) : '--'} pal={pal} glyph={glyph} size={size} align={align} icon="timer-outline" />;
});
