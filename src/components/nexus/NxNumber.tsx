import { memo } from 'react';
import Svg, { Path } from 'react-native-svg';
import type { GlyphStyle } from '@/features/nexus/themes';

/**
 * NEXUS rakam fontu: 10×16'lık ızgarada çizilmiş, köşeleri pahlı (chamfer) vektör rakamlar.
 * Hazır font kullanılmaz; her boyutta keskin, ayna görüntüsünde de 0/8 ayrılsın diye 0 çizgili.
 * Tema varyantları aynı iskeletten farklı karakter üretir: prizma, bölünmüş segment, ince, mono, eğik.
 */

type Pt = [number, number];
interface Stroke {
  pts: Pt[];
  closed?: boolean;
}

const G: Record<string, Stroke[]> = {
  '0': [{ pts: [[2, 0], [8, 0], [10, 2], [10, 14], [8, 16], [2, 16], [0, 14], [0, 2]], closed: true }, { pts: [[3.6, 10.4], [6.4, 5.6]] }],
  '1': [{ pts: [[2.4, 3.6], [6, 0], [6, 16]] }],
  '2': [{ pts: [[0, 2], [2, 0], [8, 0], [10, 2], [10, 6], [8, 8], [2, 8], [0, 10], [0, 16], [10, 16]] }],
  '3': [{ pts: [[0, 0], [8, 0], [10, 2], [10, 6], [8, 8]] }, { pts: [[3, 8], [8, 8], [10, 10], [10, 14], [8, 16], [0, 16]] }],
  '4': [{ pts: [[7.5, 16], [7.5, 0], [0, 11.5], [10, 11.5]] }],
  '5': [{ pts: [[10, 0], [0, 0], [0, 7.5], [8, 7.5], [10, 9.5], [10, 14], [8, 16], [0, 16]] }],
  '6': [{ pts: [[9, 0], [2, 0], [0, 2], [0, 14], [2, 16], [8, 16], [10, 14], [10, 9.5], [8, 7.5], [0, 7.5]] }],
  '7': [{ pts: [[0, 0], [10, 0], [10, 3], [4, 16]] }],
  '8': [
    { pts: [[2, 0], [8, 0], [10, 2], [10, 5.5], [8, 7.5], [2, 7.5], [0, 5.5], [0, 2]], closed: true },
    { pts: [[2, 7.5], [8, 7.5], [10, 9.5], [10, 14], [8, 16], [2, 16], [0, 14], [0, 9.5]], closed: true },
  ],
  '9': [{ pts: [[10, 8.5], [2, 8.5], [0, 6.5], [0, 2], [2, 0], [8, 0], [10, 2], [10, 14], [8, 16], [1, 16]] }],
  '-': [{ pts: [[2, 8], [8, 8]] }],
  ':': [{ pts: [[1, 4], [2, 4], [2, 5], [1, 5]], closed: true }, { pts: [[1, 11], [2, 11], [2, 12], [1, 12]], closed: true }],
  '.': [{ pts: [[1, 15], [2, 15], [2, 16], [1, 16]], closed: true }],
  '±': [{ pts: [[5, 2], [5, 10]] }, { pts: [[1, 6], [9, 6]] }, { pts: [[1, 14], [9, 14]] }],
  '°': [{ pts: [[1, 0], [4, 0], [4, 3], [1, 3]], closed: true }],
};
const NARROW = new Set([':', '.']);
const GAP = 3;

const advance = (ch: string) => (NARROW.has(ch) ? 3 : ch === '°' ? 5 : 10);

interface StyleDef {
  /** çizgi kalınlığı / yükseklik */
  weight: number;
  join: 'miter' | 'round' | 'bevel';
  cap: 'butt' | 'round' | 'square';
  /** eğiklik (x kayması / birim yükseklik) */
  skew: number;
  /** segment uçlarında bırakılan boşluk (ızgara birimi) */
  split: number;
}

const STYLES: Record<GlyphStyle, StyleDef> = {
  prism: { weight: 0.095, join: 'miter', cap: 'square', skew: 0, split: 0 },
  segment: { weight: 0.11, join: 'miter', cap: 'butt', skew: 0, split: 0.75 },
  hairline: { weight: 0.042, join: 'round', cap: 'round', skew: 0, split: 0 },
  mono: { weight: 0.07, join: 'bevel', cap: 'square', skew: 0, split: 0 },
  italic: { weight: 0.1, join: 'miter', cap: 'square', skew: 0.21, split: 0 },
};

function buildPath(text: string, st: StyleDef): { d: string; width: number } {
  let x = 0;
  const parts: string[] = [];
  const P = (px: number, py: number) => `${(px + (16 - py) * st.skew).toFixed(2)} ${py.toFixed(2)}`;
  [...text].forEach((ch, i) => {
    if (i > 0) x += GAP;
    const strokes = G[ch];
    if (strokes) {
      for (const s of strokes) {
        const pts = s.closed ? [...s.pts, s.pts[0]] : s.pts;
        const isDot = ch === ':' || ch === '.' || ch === '°';
        if (st.split > 0 && !isDot) {
          // Bölünmüş segment: her çizgi parçası ayrı, uçlarında boşluk
          for (let k = 0; k < pts.length - 1; k++) {
            const [ax, ay] = pts[k];
            const [bx, by] = pts[k + 1];
            const len = Math.hypot(bx - ax, by - ay);
            if (len <= st.split * 2.2) continue;
            const ux = ((bx - ax) / len) * st.split;
            const uy = ((by - ay) / len) * st.split;
            parts.push(`M${P(ax + ux + x, ay + uy)}L${P(bx - ux + x, by - uy)}`);
          }
        } else {
          parts.push(pts.map(([px, py], k) => `${k ? 'L' : 'M'}${P(px + x, py)}`).join('') + (s.closed ? 'Z' : ''));
        }
      }
    }
    x += advance(ch);
  });
  return { d: parts.join(''), width: x };
}

const cache = new Map<string, { d: string; width: number }>();
function pathFor(text: string, style: GlyphStyle) {
  const k = style + '|' + text;
  let v = cache.get(k);
  if (!v) {
    v = buildPath(text, STYLES[style]);
    if (cache.size > 400) cache.clear();
    cache.set(k, v);
  }
  return v;
}

/** Verilen metnin bu yükseklikteki genişliği (yerleşim hesapları için) */
export function measureNx(text: string, height: number, style: GlyphStyle = 'prism'): number {
  const st = STYLES[style];
  const pad = st.weight * 16;
  return ((pathFor(text, style).width + 16 * st.skew + pad * 2) / (16 + pad * 2)) * height;
}

export const NxNumber = memo(function NxNumber({
  text,
  height,
  color,
  style = 'prism',
  glow,
  weightScale = 1,
  opacity = 1,
}: {
  text: string;
  height: number;
  color: string;
  style?: GlyphStyle;
  /** Hafif ışıma rengi (cam modunda kullanılmaz: kontrastı düşürür) */
  glow?: string;
  /** Kalınlık çarpanı (cam modunda kalın çizgi) */
  weightScale?: number;
  opacity?: number;
}) {
  const st = STYLES[style];
  const { d, width } = pathFor(text, style);
  const sw = st.weight * 16 * weightScale;
  const pad = sw;
  const vbW = width + 16 * st.skew + pad * 2;
  const vbH = 16 + pad * 2;
  const w = (vbW / vbH) * height;
  return (
    <Svg width={w} height={height} viewBox={`${-pad} ${-pad} ${vbW} ${vbH}`} opacity={opacity}>
      {glow ? <Path d={d} stroke={glow} strokeOpacity={0.22} strokeWidth={sw * 2.6} fill="none" strokeLinejoin="round" strokeLinecap="round" /> : null}
      <Path d={d} stroke={color} strokeWidth={sw} fill="none" strokeLinejoin={st.join} strokeLinecap={st.cap} strokeMiterlimit={4} />
    </Svg>
  );
});
