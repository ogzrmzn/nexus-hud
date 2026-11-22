import type { SpeedUnit } from './settings';

export const KMH_PER_MPH = 1.609344;

/** km/sa → seçili birim */
export function toUnit(kmh: number, unit: SpeedUnit): number {
  return unit === 'mph' ? kmh / KMH_PER_MPH : kmh;
}

/** Seçili birim → km/sa */
export function fromUnit(v: number, unit: SpeedUnit): number {
  return unit === 'mph' ? v * KMH_PER_MPH : v;
}

export const unitLabel = (unit: SpeedUnit) => (unit === 'mph' ? 'MPH' : 'KM/H');
export const distUnitLabel = (unit: SpeedUnit) => (unit === 'mph' ? 'MI' : 'KM');

/** Gösterge halkasının tam ölçeği (seçili birimde) */
export const gaugeMax = (unit: SpeedUnit) => (unit === 'mph' ? 140 : 220);

/** Metre → "12.4" (km ya da mil). 100'ün üstünde ondalık yok. */
export function distanceText(m: number, unit: SpeedUnit): string {
  const v = unit === 'mph' ? m / 1609.344 : m / 1000;
  return v >= 100 ? String(Math.round(v)) : v.toFixed(1);
}

/** Süre → "0:42" (dk:sn, 1 saatten az) ya da "1:05:09" */
export function clockDuration(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const p = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${p(m)}:${p(sec)}` : `${m}:${p(sec)}`;
}

export function clockText(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Pusula yönleri (İngilizce kısaltma HUD dilinin parçası) */
const DIRS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
export function headingLabel(deg: number | null): string {
  if (deg == null || !Number.isFinite(deg)) return '--';
  return DIRS[Math.round((((deg % 360) + 360) % 360) / 45) % 8];
}

/**
 * Sürekli dönüş için açı: hedefe en kısa yoldan ulaşan, birikimli değer (359° → 1° geçişinde ters tur atmaz).
 */
export function unwrapAngle(prev: number, next: number): number {
  const d = ((((next - prev) % 360) + 540) % 360) - 180;
  return prev + d;
}

/** GPS doğruluğu → 0..4 çubuk */
export function signalBars(accuracy: number | null): number {
  if (accuracy == null) return 0;
  if (accuracy <= 8) return 4;
  if (accuracy <= 16) return 3;
  if (accuracy <= 30) return 2;
  if (accuracy <= 50) return 1;
  return 0;
}
