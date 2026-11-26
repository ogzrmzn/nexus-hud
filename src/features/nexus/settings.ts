/**
 * NEXUS HUD ayarları. Uygulama ayarlarında tek bir `nexus` anahtarı altında saklanır;
 * eksik/eski alanlar her okumada varsayılanlarla tamamlanır.
 */

export type NexusThemeId = 'nexus' | 'quantum' | 'hyperdrive' | 'lightspeed' | 'nova' | 'neon';
export type Orientation = 'yatay' | 'dikey';
/** Cam modunda aynalama: telefonun hangi kenarı cama bakıyor */
export type MirrorAxis = 'ust' | 'alt';
export type SpeedUnit = 'kmh' | 'mph';
export type DayNight = 'oto' | 'gunduz' | 'gece';
export type Motion = 'tam' | 'az';

export type WidgetKey = 'clock' | 'tripTime' | 'avg' | 'max' | 'distance' | 'compass' | 'gps' | 'weather';

export interface NexusSettings {
  theme: NexusThemeId;
  /** Vurgu rengi; null = temanın kendi rengi */
  accent: string | null;
  unit: SpeedUnit;
  /** Hız göstergesi boyutu (0.75 – 1.15) */
  gaugeScale: number;
  widgets: Record<WidgetKey, boolean>;
  dayNight: DayNight;
  /** Cam modunda ters (ayna) görünüm */
  mirror: boolean;
  /** Kokpit temalarında cama yansıtma (telefon ekranında kullanım için varsayılan kapalı) */
  cockpitMirror: boolean;
  /** Ayna yönü: 'ust' = üst kenar cama (sağ-sol çevrilir), 'alt' = alt kenar cama (alt-üst çevrilir) */
  mirrorAxis: MirrorAxis;
  /** Seçilen yön ekranı o yönde kilitler */
  camOrientation: Orientation;
  cockpitOrientation: Orientation;
  /** Ekranın kapanmasını engelle */
  keepAwake: boolean;
  /** HUD ekran parlaklığı 0.1–1; null = sistem parlaklığı (web'de ekran karartılarak uygulanır) */
  brightness: number | null;
  /** Hız uyarısı (seçili birimde); 0 = kapalı */
  speedAlert: number;
  /** Animasyon yoğunluğu (pil tasarrufu için "az") */
  motion: Motion;
  /** Açıkça işaretlenen demo verisi (gerçek GPS yerine) */
  demo: boolean;
  /** Son açılan ekran (ana sayfada işaretlenir) */
  lastView: 'cam' | 'kokpit';
}

export const DEFAULT_NEXUS: NexusSettings = {
  theme: 'nexus',
  accent: null,
  unit: 'kmh',
  gaugeScale: 1,
  widgets: { clock: true, tripTime: true, avg: true, max: true, distance: true, compass: true, gps: true, weather: false },
  dayNight: 'oto',
  mirror: true,
  mirrorAxis: 'ust',
  cockpitMirror: false,
  camOrientation: 'yatay',
  cockpitOrientation: 'yatay',
  keepAwake: true,
  brightness: 1,
  speedAlert: 0,
  motion: 'tam',
  demo: false,
  lastView: 'cam',
};

export const THEME_IDS: NexusThemeId[] = ['nexus', 'hyperdrive', 'lightspeed', 'nova', 'neon', 'quantum'];

/** Hız uyarısı adımı ve sınırları (seçili birimde) */
export const ALERT_STEP = 10;
export const ALERT_MAX = 250;

/** Kayıtlı (belki eski/eksik) değeri güvenli ayara çevirir */
export function resolveNexus(raw: unknown): NexusSettings {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<NexusSettings>;
  const out: NexusSettings = { ...DEFAULT_NEXUS, ...r, widgets: { ...DEFAULT_NEXUS.widgets, ...(r.widgets ?? {}) } };
  if (!THEME_IDS.includes(out.theme)) out.theme = DEFAULT_NEXUS.theme;
  if (out.unit !== 'kmh' && out.unit !== 'mph') out.unit = 'kmh';
  if (typeof out.gaugeScale !== 'number' || !Number.isFinite(out.gaugeScale)) out.gaugeScale = 1;
  out.gaugeScale = Math.min(1.15, Math.max(0.75, out.gaugeScale));
  if (out.brightness != null) out.brightness = Math.min(1, Math.max(0.1, Number(out.brightness) || 1));
  if (!['oto', 'gunduz', 'gece'].includes(out.dayNight)) out.dayNight = 'oto';
  if (out.motion !== 'az') out.motion = 'tam';
  out.speedAlert = Math.min(ALERT_MAX, Math.max(0, Math.round(Number(out.speedAlert) || 0)));
  if (out.lastView !== 'kokpit') out.lastView = 'cam';
  if (out.mirrorAxis !== 'alt') out.mirrorAxis = 'ust';
  if (out.camOrientation !== 'dikey') out.camOrientation = 'yatay';
  if (out.cockpitOrientation !== 'dikey') out.cockpitOrientation = 'yatay';
  return out;
}

/** "oto": 07:00–19:00 gündüz */
export function isDay(mode: DayNight, now = new Date()): boolean {
  if (mode === 'gunduz') return true;
  if (mode === 'gece') return false;
  const h = now.getHours();
  return h >= 7 && h < 19;
}
