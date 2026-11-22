import type { NexusThemeId } from './settings';

/**
 * Temalar yalnızca renk değil; gösterge geometrisini, veri yerleşimini, rakam karakterini ve
 * çizgi dilini de belirler. Bileşenler bu tanımı okuyup kendi biçimlerini seçer.
 */

/** Hız göstergesinin geometrisi */
export type GaugeKind =
  | 'blade' // Prism Blade: kavisli 24 segmentlik bıçak + üstte yön şeridi
  | 'core' // Octa-Core: sayıyı saran sekizgen çerdeğin kenarları dolar
  | 'orbit' // Yörünge: 270° çanak yay, üzerinde kayan parçacık
  | 'horizon' // Ufuk: ekran boyu ince çizgi hızla kalınlaşır, çerçeve yok
  | 'warp'; // Warp: ufka daralan perspektif şeritler

/** Kokpit veri yerleşimi */
export type DataLayout = 'rail' | 'grid' | 'columns' | 'strip' | 'band';

/** Rakam karakteri (özel çizim fontun varyantları) */
export type GlyphStyle = 'prism' | 'segment' | 'hairline' | 'mono' | 'italic';

export interface NexusPalette {
  bg: string;
  /** Ana rakam rengi */
  text: string;
  /** Ana vurgu (elektrik mavisi/turkuaz) */
  primary: string;
  /** İkincil vurgu */
  secondary: string;
  /** Kontrollü holografik mor */
  holo: string;
  /** Soluk çizgiler / etiketler */
  dim: string;
  /** Cam katmanı dolgusu */
  glass: string;
  /** Uyarı */
  warn: string;
  danger: string;
}

export interface NexusTheme {
  id: NexusThemeId;
  name: string;
  tagline: string;
  gauge: GaugeKind;
  layout: DataLayout;
  glyph: GlyphStyle;
  /** Panel köşe kesimi (px, tasarım biriminde) */
  chamfer: number;
  night: NexusPalette;
  day: NexusPalette;
}

const base = { warn: '#FFB547', danger: '#FF3B5C' };

export const THEMES: Record<NexusThemeId, NexusTheme> = {
  nexus: {
    id: 'nexus',
    name: 'NEXUS Original',
    tagline: 'Prizma bıçak · üst yön şeridi · yan veri rayı',
    gauge: 'blade',
    layout: 'rail',
    glyph: 'prism',
    chamfer: 10,
    night: { ...base, bg: '#020409', text: '#E8FBFF', primary: '#22D3FF', secondary: '#19F5D0', holo: '#9B6BFF', dim: '#4A6478', glass: 'rgba(34,211,255,0.06)' },
    day: { ...base, bg: '#050A12', text: '#FFFFFF', primary: '#4FE3FF', secondary: '#3DFFE0', holo: '#B795FF', dim: '#7E98AC', glass: 'rgba(79,227,255,0.10)' },
  },
  cyber: {
    id: 'cyber',
    name: 'Cyber Core',
    tagline: 'Sekizgen çekirdek · terminal veri ızgarası',
    gauge: 'core',
    layout: 'grid',
    glyph: 'segment',
    chamfer: 0,
    night: { ...base, bg: '#010605', text: '#D9FFF6', primary: '#00F0C8', secondary: '#00B3FF', holo: '#C04BFF', dim: '#2F5E57', glass: 'rgba(0,240,200,0.06)' },
    day: { ...base, bg: '#03100E', text: '#FFFFFF', primary: '#3CFFDA', secondary: '#38C6FF', holo: '#D47CFF', dim: '#6FA79D', glass: 'rgba(60,255,218,0.10)' },
  },
  quantum: {
    id: 'quantum',
    name: 'Quantum',
    tagline: 'Yörünge yayı · parçacık · simetrik sütunlar',
    gauge: 'orbit',
    layout: 'columns',
    glyph: 'hairline',
    chamfer: 22,
    night: { ...base, bg: '#04030B', text: '#F1EDFF', primary: '#8FA8FF', secondary: '#7DF9FF', holo: '#B07CFF', dim: '#544C7A', glass: 'rgba(176,124,255,0.07)' },
    day: { ...base, bg: '#0A0818', text: '#FFFFFF', primary: '#AFC1FF', secondary: '#9BFBFF', holo: '#C9A3FF', dim: '#8A82B4', glass: 'rgba(176,124,255,0.12)' },
  },
  darkmatter: {
    id: 'darkmatter',
    name: 'Dark Matter',
    tagline: 'Negatif alan · ufuk çizgisi · tek satır veri',
    gauge: 'horizon',
    layout: 'strip',
    glyph: 'mono',
    chamfer: 4,
    night: { ...base, bg: '#000000', text: '#C9D6E8', primary: '#5B8CFF', secondary: '#3FD4E6', holo: '#6E4BD8', dim: '#2A3346', glass: 'rgba(91,140,255,0.04)' },
    day: { ...base, bg: '#020306', text: '#FFFFFF', primary: '#7FA6FF', secondary: '#5FE6F5', holo: '#8E6BFF', dim: '#5D6A86', glass: 'rgba(127,166,255,0.08)' },
  },
  hyperdrive: {
    id: 'hyperdrive',
    name: 'Hyperdrive',
    tagline: 'Warp şeritleri · eğik rakam · üst HUD bandı',
    gauge: 'warp',
    layout: 'band',
    glyph: 'italic',
    chamfer: 16,
    night: { ...base, bg: '#03020A', text: '#FFFFFF', primary: '#2BE7FF', secondary: '#FFFFFF', holo: '#C054FF', dim: '#4B3F6E', glass: 'rgba(192,84,255,0.08)' },
    day: { ...base, bg: '#08061A', text: '#FFFFFF', primary: '#5CF0FF', secondary: '#FFFFFF', holo: '#D485FF', dim: '#8379A8', glass: 'rgba(192,84,255,0.13)' },
  },
};

/** Kullanıcının seçebileceği vurgu renkleri */
export const ACCENTS: { name: string; color: string }[] = [
  { name: 'Elektrik', color: '#22D3FF' },
  { name: 'Turkuaz', color: '#19F5D0' },
  { name: 'Buz', color: '#A8E8FF' },
  { name: 'Holo Mor', color: '#A57BFF' },
  { name: 'Plazma', color: '#FF4FD8' },
  { name: 'Amber', color: '#FFB547' },
  { name: 'Yeşil', color: '#7CFF9B' },
];

/** Tema + gündüz/gece + isteğe bağlı vurgu → kullanılacak palet */
export function paletteFor(theme: NexusTheme, day: boolean, accent: string | null): NexusPalette {
  const p = day ? theme.day : theme.night;
  return accent ? { ...p, primary: accent } : p;
}

/**
 * Cam modu paleti: camda mor/koyu mavi kaybolur, gri zemin sis gibi görünür.
 * Bu yüzden zemin saf siyah, rakamlar beyaz ya da açık turkuaz; gece daha yumuşak.
 */
export function windshieldPalette(theme: NexusTheme, day: boolean, accent: string | null): NexusPalette {
  const p = paletteFor(theme, day, accent);
  return {
    ...p,
    bg: '#000000',
    text: day ? '#FFFFFF' : '#CFF6FF',
    primary: accent ?? (day ? '#5CF4FF' : '#3AC8E0'),
    dim: day ? '#9FB4C4' : '#5E7A8C',
  };
}

/** #RRGGBB + opaklık */
export function alpha(hex: string, a: number): string {
  if (!hex.startsWith('#') || hex.length !== 7) return hex;
  const v = Math.round(Math.min(1, Math.max(0, a)) * 255)
    .toString(16)
    .padStart(2, '0');
  return hex + v;
}
