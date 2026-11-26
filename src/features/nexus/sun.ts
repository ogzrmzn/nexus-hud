/**
 * Güneş saatleri ve ışık seviyesi: internet gerekmeden, konum ve tarihten gün doğumu / gün batımı
 * (NOAA gün doğumu denklemi, ±1–2 dk). Işık seviyesi 0 = gece, 1 = gündüz; geçişler yumuşak.
 */

const D2R = Math.PI / 180;
const DAY_MS = 86400000;
/** Gün doğumu/batımı çevresinde yumuşak geçiş süresi (yarısı önce, yarısı sonra) */
export const TWILIGHT_MS = 30 * 60 * 1000;

export interface SunTimes {
  sunrise: number | null;
  sunset: number | null;
  /** Kutup günü/gecesi: güneş hiç batmıyor / hiç doğmuyor */
  polar: 'day' | 'night' | null;
}

/** Verilen günün (yerel tarih) gün doğumu ve batımı, epoch ms */
export function sunTimes(date: Date, lat: number, lon: number): SunTimes {
  const noon = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12).getTime();
  const jd = noon / DAY_MS + 2440587.5;
  const n = Math.round(jd - 2451545.0 + 0.0008);
  const jStar = n - lon / 360;
  const M = (357.5291 + 0.98560028 * jStar) % 360;
  const C = 1.9148 * Math.sin(M * D2R) + 0.02 * Math.sin(2 * M * D2R) + 0.0003 * Math.sin(3 * M * D2R);
  const lambda = (M + C + 180 + 102.9372) % 360;
  const jTransit = 2451545.0 + jStar + 0.0053 * Math.sin(M * D2R) - 0.0069 * Math.sin(2 * lambda * D2R);
  const sinDec = Math.sin(lambda * D2R) * Math.sin(23.4397 * D2R);
  const cosDec = Math.cos(Math.asin(sinDec));
  const cosW = (Math.sin(-0.833 * D2R) - Math.sin(lat * D2R) * sinDec) / (Math.cos(lat * D2R) * cosDec);
  if (cosW < -1) return { sunrise: null, sunset: null, polar: 'day' };
  if (cosW > 1) return { sunrise: null, sunset: null, polar: 'night' };
  const w = Math.acos(cosW) / D2R;
  const toMs = (j: number) => (j - 2440587.5) * DAY_MS;
  return { sunrise: toMs(jTransit - w / 360), sunset: toMs(jTransit + w / 360), polar: null };
}

const ramp = (t: number, center: number) => Math.min(1, Math.max(0, (t - (center - TWILIGHT_MS / 2)) / TWILIGHT_MS));

/**
 * Işık seviyesi (0 gece … 1 gündüz). Konum yoksa 07:00 doğum / 19:00 batım varsayılır.
 */
export function daylightLevel(now: Date, pos: { lat: number; lon: number } | null): number {
  let rise: number;
  let set: number;
  if (pos) {
    const s = sunTimes(now, pos.lat, pos.lon);
    if (s.polar) return s.polar === 'day' ? 1 : 0;
    rise = s.sunrise!;
    set = s.sunset!;
  } else {
    rise = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 7).getTime();
    set = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 19).getTime();
  }
  const t = now.getTime();
  return Math.min(ramp(t, rise), 1 - ramp(t, set));
}

/** Gece parlaklığı: gündüz ayarı aynen, gece hafifçe (%80'e) kısılır; renkler soluklaşmasın diye daha fazla değil */
export function effectiveBrightness(setting: number | null, level: number): number | null {
  if (level >= 0.999) return setting;
  const v = (setting ?? 1) * (0.8 + 0.2 * level);
  return Math.round(v * 100) / 100;
}

export function hhmm(ms: number | null): string {
  if (ms == null) return '--:--';
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
