import type { NexusThemeId } from './settings';

/**
 * Temalar yalnızca renk değil; gösterge geometrisini, veri yerleşimini, rakam karakterini ve
 * çizgi dilini de belirler. Bileşenler bu tanımı okuyup kendi biçimlerini seçer.
 */

/** Hız göstergesinin geometrisi */
export type GaugeKind =
  | 'blade' // Prism Blade: kavisli 24 segmentlik bıçak + üstte yön şeridi
  | 'orbit' // Yörünge: 270° çanak yay, üzerinde kayan parçacık
  | 'warp' // Warp: ufka daralan perspektif şeritler
  | 'streak' // Lightspeed: merkezden dışa akan yıldız çizgileri + açılan ışık yayı
  | 'nova' // Nova Drive: dönen spiral yıldız akışı + iki yanda açılan ışık parantezleri
  | 'road'; // Neon Highway: perspektifli yol ızgarası, akan şerit çizgileri

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
    tagline: 'Prizma bıçak · holografik köprü · dengeli ve sade',
    gauge: 'blade',
    layout: 'rail',
    glyph: 'prism',
    chamfer: 10,
    night: { ...base, bg: '#020409', text: '#E8FBFF', primary: '#22D3FF', secondary: '#19F5D0', holo: '#9B6BFF', dim: '#4A6478', glass: 'rgba(34,211,255,0.06)' },
    day: { ...base, bg: '#050A12', text: '#FFFFFF', primary: '#4FE3FF', secondary: '#3DFFE0', holo: '#B795FF', dim: '#7E98AC', glass: 'rgba(79,227,255,0.10)' },
  },
  quantum: {
    id: 'quantum',
    name: 'Quantum',
    tagline: 'Yörünge yayı · üzerinde kayan parçacık · ince rakam',
    gauge: 'orbit',
    layout: 'columns',
    glyph: 'hairline',
    chamfer: 22,
    night: { ...base, bg: '#04030B', text: '#F1EDFF', primary: '#8FA8FF', secondary: '#7DF9FF', holo: '#B07CFF', dim: '#544C7A', glass: 'rgba(176,124,255,0.07)' },
    day: { ...base, bg: '#0A0818', text: '#FFFFFF', primary: '#AFC1FF', secondary: '#9BFBFF', holo: '#C9A3FF', dim: '#8A82B4', glass: 'rgba(176,124,255,0.12)' },
  },
  hyperdrive: {
    id: 'hyperdrive',
    name: 'Hyperdrive',
    tagline: 'Warp şeritleri · eğik rakam · eğik hız bandı',
    gauge: 'warp',
    layout: 'band',
    glyph: 'italic',
    chamfer: 16,
    night: { ...base, bg: '#03020A', text: '#FFFFFF', primary: '#2BE7FF', secondary: '#FFFFFF', holo: '#C054FF', dim: '#4B3F6E', glass: 'rgba(192,84,255,0.08)' },
    day: { ...base, bg: '#08061A', text: '#FFFFFF', primary: '#5CF0FF', secondary: '#FFFFFF', holo: '#D485FF', dim: '#8379A8', glass: 'rgba(192,84,255,0.13)' },
  },
  lightspeed: {
    id: 'lightspeed',
    name: 'Lightspeed',
    tagline: 'Yıldız akışı · hızla açılan ışık yayı',
    gauge: 'streak',
    layout: 'grid',
    glyph: 'mono',
    chamfer: 6,
    night: { ...base, bg: '#02040C', text: '#F2FAFF', primary: '#7FD6FF', secondary: '#FFFFFF', holo: '#8A7BFF', dim: '#4A5A78', glass: 'rgba(127,214,255,0.06)' },
    day: { ...base, bg: '#060A18', text: '#FFFFFF', primary: '#A6E4FF', secondary: '#FFFFFF', holo: '#A99DFF', dim: '#8494B4', glass: 'rgba(166,228,255,0.11)' },
  },
  nova: {
    id: 'nova',
    name: 'Nova Drive',
    tagline: 'Sakin spiral yıldız akışı · iki yanda ışık parantezi',
    gauge: 'nova',
    layout: 'rail',
    glyph: 'prism',
    chamfer: 8,
    night: { ...base, bg: '#03020D', text: '#FFFFFF', primary: '#B48CFF', secondary: '#7FE8FF', holo: '#FF7AD9', dim: '#4E4472', glass: 'rgba(180,140,255,0.07)' },
    day: { ...base, bg: '#0A071C', text: '#FFFFFF', primary: '#CDB2FF', secondary: '#A6F0FF', holo: '#FF9DE4', dim: '#8C82B4', glass: 'rgba(205,178,255,0.12)' },
  },
  neon: {
    id: 'neon',
    name: 'Neon Highway',
    tagline: 'Neon yol ızgarası · akan şeritler · büyük eğik rakam',
    gauge: 'road',
    layout: 'band',
    glyph: 'italic',
    chamfer: 12,
    night: { ...base, bg: '#040312', text: '#FFFFFF', primary: '#19F5D0', secondary: '#4F8BFF', holo: '#C054FF', dim: '#45407A', glass: 'rgba(25,245,208,0.06)' },
    day: { ...base, bg: '#0A0820', text: '#FFFFFF', primary: '#5CFFE2', secondary: '#7FAAFF', holo: '#D485FF', dim: '#837DB8', glass: 'rgba(92,255,226,0.11)' },
  },
};

/**
 * Menü ekranları (başlangıç, temalar, ayarlar, kontrol paneli) için daha açık palet:
 * HUD göstergesi karanlık kalır, menüler okunaklı ve ferah görünür.
 */
export function uiPalette(p: NexusPalette): NexusPalette {
  return {
    ...p,
    bg: '#0E1626',
    text: '#FFFFFF',
    dim: '#A9BCCF',
    glass: 'rgba(120,190,255,0.10)',
  };
}

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
const hex2 = (n: number) => Math.round(Math.min(255, Math.max(0, n))).toString(16).padStart(2, '0');
const rgb = (h: string) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

/** İki renk arasında karışım (t=0 → a, t=1 → b) */
export function mix(a: string, b: string, t: number): string {
  if (a.length !== 7 || b.length !== 7) return a;
  const x = rgb(a);
  const y = rgb(b);
  return '#' + x.map((v, i) => hex2(v + (y[i] - v) * t)).join('');
}

/** Rengi koyulaştır (k < 1) */
export function shade(h: string, k: number): string {
  if (h.length !== 7) return h;
  return '#' + rgb(h).map((v) => hex2(v * k)).join('');
}

/**
 * Tema + gündüz/gece + isteğe bağlı vurgu → kullanılacak palet.
 * Gündüz: daha açık lacivert zemin, parlak ve yüksek kontrastlı renkler.
 * Gece: neredeyse siyah zemin, kısık ve göz yormayan renkler.
 */
function dayPalette(theme: NexusTheme, accent: string | null): NexusPalette {
  const p = theme.day;
  return {
    ...p,
    bg: mix(p.bg, '#1B2A44', 0.65),
    text: '#FFFFFF',
    primary: accent ?? p.primary,
    dim: mix(p.dim, '#FFFFFF', 0.35),
    glass: alpha(accent ?? p.primary, 0.14),
  };
}

function nightPalette(theme: NexusTheme, accent: string | null): NexusPalette {
  const p = theme.night;
  return {
    ...p,
    bg: shade(p.bg, 0.6),
    text: shade(p.text, 0.72),
    primary: shade(accent ?? p.primary, 0.75),
    secondary: shade(p.secondary, 0.72),
    holo: shade(p.holo, 0.75),
    dim: shade(p.dim, 0.85),
    glass: alpha(accent ?? p.primary, 0.05),
  };
}

/** İki palet arasında yumuşak geçiş (0 = gece, 1 = gündüz) */
function blend(n: NexusPalette, d: NexusPalette, level: number): NexusPalette {
  if (level >= 1) return d;
  if (level <= 0) return n;
  const out = { ...n };
  (Object.keys(n) as (keyof NexusPalette)[]).forEach((k) => {
    const a = n[k];
    const b = d[k];
    out[k] = a.startsWith('#') && a.length === 7 && b.startsWith('#') && b.length === 7 ? mix(a, b, level) : level >= 0.5 ? b : a;
  });
  return out;
}

/**
 * Tema + ışık seviyesi + isteğe bağlı vurgu → kullanılacak palet.
 * Gündüz (1): açık lacivert zemin, parlak ve yüksek kontrastlı renkler.
 * Gece (0): neredeyse siyah zemin, kısık ve göz yormayan renkler. Aradaki değerler yumuşak geçiştir.
 */
export function paletteFor(theme: NexusTheme, light: boolean | number, accent: string | null): NexusPalette {
  const level = typeof light === 'number' ? light : light ? 1 : 0;
  return blend(nightPalette(theme, accent), dayPalette(theme, accent), level);
}

/**
 * Cam modu paleti: camda mor/koyu mavi kaybolur, gri zemin sis gibi görünür.
 * Zemin her zaman saf siyah. Gündüz: beyaz rakam, parlak turkuaz. Gece: kısık, yansıması göz almayan tonlar.
 */
export function windshieldPalette(theme: NexusTheme, light: boolean | number, accent: string | null): NexusPalette {
  const level = typeof light === 'number' ? light : light ? 1 : 0;
  const p = theme.day;
  const day: NexusPalette = { ...p, bg: '#000000', text: '#FFFFFF', primary: accent ?? '#5CF4FF', dim: '#9FB4C4' };
  const night: NexusPalette = {
    ...p,
    bg: '#000000',
    // Hız rakamı gece de beyaz kalır; gece camda parlamayı parlaklık kısma sağlar (renk griye dönmez)
    text: '#FFFFFF',
    primary: accent ? shade(accent, 0.6) : '#21808F',
    dim: '#3E5560',
    warn: shade(p.warn, 0.7),
    danger: shade(p.danger, 0.8),
  };
  return blend(night, day, level);
}

/** #RRGGBB + opaklık */
export function alpha(hex: string, a: number): string {
  if (!hex.startsWith('#') || hex.length !== 7) return hex;
  const v = Math.round(Math.min(1, Math.max(0, a)) * 255)
    .toString(16)
    .padStart(2, '0');
  return hex + v;
}
