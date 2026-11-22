/**
 * HUD (cama yansıyan gösterge) hesapları: GPS noktalarından hız, mesafe, yön ve yolculuk istatistikleri.
 * Saf fonksiyonlar; ekran bileşeni yalnızca bunları çağırır.
 */

export interface GpsPoint {
  lat: number;
  lon: number;
  /** ms (epoch) */
  time: number;
  /** m/s; cihaz vermezse null */
  speed: number | null;
  /** derece (0 = kuzey); hareket yokken cihaz vermeyebilir */
  heading: number | null;
  /** metre */
  accuracy: number | null;
}

export interface Trip {
  distanceM: number;
  movingMs: number;
  maxKmh: number;
  startedAt: number;
  last: GpsPoint | null;
  /** Ekranda gösterilen anlık hız (km/sa) ve yön */
  speedKmh: number;
  heading: number | null;
  /** Hızın düşük (durma) ölçülmeye başladığı an; kısa düşüşler göstergeyi sıfırlamasın diye */
  lowSince: number | null;
}

export const newTrip = (now: number): Trip => ({ distanceM: 0, movingMs: 0, maxKmh: 0, startedAt: now, last: null, speedKmh: 0, heading: null, lowSince: null });

/** Hız ancak bu süre boyunca düşük kalırsa 0 gösterilir (tek hatalı ölçüm göstergeyi düşürmez) */
const ZERO_HOLD_MS = 2500;

/** İki koordinat arası mesafe (metre, haversine) */
export function distanceM(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const R = 6371000;
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLon = (b.lon - a.lon) * rad;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

/** İki nokta arası yön (derece, 0 = kuzey) */
export function bearing(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const rad = Math.PI / 180;
  const y = Math.sin((b.lon - a.lon) * rad) * Math.cos(b.lat * rad);
  const x = Math.cos(a.lat * rad) * Math.sin(b.lat * rad) - Math.sin(a.lat * rad) * Math.cos(b.lat * rad) * Math.cos((b.lon - a.lon) * rad);
  return ((Math.atan2(y, x) / rad) + 360) % 360;
}

/** Yön harfleri: K, KD, D, GD, G, GB, B, KB */
export function compassLabel(deg: number | null): string {
  if (deg == null || Number.isNaN(deg)) return '—';
  const names = ['K', 'KD', 'D', 'GD', 'G', 'GB', 'B', 'KB'];
  return names[Math.round((((deg % 360) + 360) % 360) / 45) % 8];
}

/** Bu hızın altı "duruyor" sayılır (GPS titremesi) */
const STOP_KMH = 3;
/** Konum doğruluğu bundan kötüyse mesafeye eklenmez */
const MAX_ACCURACY_M = 35;

/**
 * Yeni GPS noktasıyla yolculuğu günceller.
 * - Cihazın verdiği hız varsa o kullanılır; yoksa iki nokta arasından hesaplanır.
 * - Telefonun aynı konumu yeni saatle tekrar göndermesi (mesafe ~0) hız ölçümü sayılmaz.
 * - Hız ancak ZERO_HOLD_MS boyunca düşük kalırsa 0 gösterilir; arada bir gelen hatalı 0 göstergeyi düşürmez.
 */
export function addPoint(trip: Trip, p: GpsPoint): Trip {
  const prev = trip.last;
  const goodFix = p.accuracy == null || p.accuracy <= MAX_ACCURACY_M;
  const dt = prev ? (p.time - prev.time) / 1000 : 0;
  const d = prev ? distanceM(prev, p) : 0;
  const duplicate = !!prev && d < 0.5 && dt < 4;

  // Bu noktadaki ölçülen hız (km/sa); ölçüm yoksa null
  let measured: number | null = null;
  if (p.speed != null && p.speed >= 0) measured = p.speed * 3.6;
  else if (prev && goodFix && !duplicate && dt >= 0.8) measured = (d / dt) * 3.6;

  // Gösterilen hız: düşük ölçüm hemen değil, belli süre sürerse 0 olur
  let shown = trip.speedKmh;
  let lowSince = trip.lowSince;
  if (measured != null) {
    if (measured < STOP_KMH) {
      lowSince = lowSince ?? p.time;
      if (trip.speedKmh < STOP_KMH || p.time - lowSince >= ZERO_HOLD_MS) shown = 0;
    } else {
      lowSince = null;
      shown = measured;
    }
  }

  // Mesafe, süre ve yön: hareket halindeyken, iyi konumla
  let distance = trip.distanceM;
  let moving = trip.movingMs;
  let heading = trip.heading;
  if (prev && goodFix && !duplicate && dt > 0 && dt < 30 && shown >= STOP_KMH) {
    distance += d;
    moving += dt * 1000;
    heading = p.heading != null && p.heading >= 0 && p.speed != null && p.speed > 0.5 ? p.heading : bearing(prev, p);
  }

  return {
    ...trip,
    distanceM: distance,
    movingMs: moving,
    maxKmh: Math.max(trip.maxKmh, shown),
    // Tekrarlanan ya da kötü konum son nokta yapılmaz (sonraki hesap doğru aralıkla yapılsın)
    last: goodFix && !duplicate ? p : (prev ?? p),
    speedKmh: shown,
    heading,
    lowSince,
  };
}

/** Hareket halindeki ortalama hız (km/sa) */
export function avgKmh(trip: Trip): number {
  return trip.movingMs > 0 ? (trip.distanceM / 1000) / (trip.movingMs / 3600000) : 0;
}

/** "1:05" / "12:34" biçiminde süre */
export function durationLabel(ms: number): string {
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}` : `${m} dk`;
}
