import * as Location from 'expo-location';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Linking, Platform } from 'react-native';
import { addPoint, newTrip, type GpsPoint, type Trip } from './trip';

/**
 * GPS bağlantı durumu. Hız yalnızca "bagli" ya da açıkça işaretli "demo" durumunda gösterilir;
 * diğer her durumda gösterge "--" yazar (sahte ya da donmuş hız yok).
 */
export type GpsStatus =
  | 'izin' // izin isteniyor
  | 'reddedildi'
  | 'servis-kapali' // cihazın konum servisi kapalı
  | 'araniyor' // izin var, ilk konum bekleniyor
  | 'bagli'
  | 'zayif' // konum var ama doğruluk hız için yetersiz
  | 'kayip' // daha önce bağlıydı, sinyal kesildi
  | 'demo';

/** Bu süre konum gelmezse sinyal kayıp sayılır */
export const LOST_AFTER_MS = 10000;
/** Bundan kötü doğrulukta hız gösterilmez */
export const MAX_SPEED_ACCURACY_M = 65;
/** Cihaz hızı kendisi ölçüyorsa (Doppler) konum doğruluğu bundan kötü olmadıkça hız gösterilir */
export const MAX_DEVICE_SPEED_ACCURACY_M = 150;

export interface ConfirmedMax {
  prev: number;
  max: number;
}

/**
 * Tek bir hatalı sıçrama maksimum hızı bozmasın: iki ardışık ölçümün küçüğü maksimum adayıdır.
 */
export function confirmMax(s: ConfirmedMax, shown: number): ConfirmedMax {
  return { prev: shown, max: Math.max(s.max, Math.min(s.prev, shown)) };
}

/** Durum + son konum zamanı + doğruluk → gösterilecek durum (saf; test edilebilir) */
export function deriveStatus(base: GpsStatus, lastFixAt: number | null, accuracy: number | null, now: number, deviceSpeed = false): GpsStatus {
  if (base !== 'bagli') return base;
  if (lastFixAt == null) return 'araniyor';
  if (now - lastFixAt > LOST_AFTER_MS) return 'kayip';
  if (accuracy != null && accuracy > (deviceSpeed ? MAX_DEVICE_SPEED_ACCURACY_M : MAX_SPEED_ACCURACY_M)) return 'zayif';
  return 'bagli';
}

/** Demo hız profili (km/sa): 0'dan kalkış, şehir içi/dışı dalgalanma */
export function demoSpeed(t: number): number {
  const ramp = Math.min(1, t / 8);
  const v = 62 + 38 * Math.sin(t / 11) + 14 * Math.sin(t / 3.3) + 6 * Math.sin(t / 1.7);
  return Math.max(0, v * ramp);
}

export interface NexusGps {
  status: GpsStatus;
  trip: Trip;
  /** Gösterilecek hız (km/sa); güvenilir veri yoksa null */
  speedKmh: number | null;
  /** Doğrulanmış maksimum hız (km/sa) */
  maxKmh: number;
  accuracy: number | null;
  lastFixAt: number | null;
  /** Cihazın bildirdiği ham hız (m/s); tanı için */
  rawSpeed: number | null;
  /** Ham durum (izin/servis); tanı için */
  baseStatus: GpsStatus;
  /** Yön (derece); hareket halinde GPS rotası, dururken pusula */
  heading: number | null;
  retry: () => void;
  resetTrip: () => void;
}

export function useNexusGps({ demo, compass, tickMs = 1000 }: { demo: boolean; compass: boolean; tickMs?: number }): NexusGps {
  const [base, setBase] = useState<GpsStatus>(demo ? 'demo' : 'izin');
  const [state, setState] = useState<{ trip: Trip; cmax: ConfirmedMax }>(() => ({ trip: newTrip(Date.now()), cmax: { prev: 0, max: 0 } }));
  const { trip, cmax } = state;
  const [fix, setFix] = useState<{ at: number | null; accuracy: number | null; rawSpeed: number | null }>({ at: null, accuracy: null, rawSpeed: null });
  const [compassDeg, setCompassDeg] = useState<number | null>(null);
  // Sinyal kaybı denetimi: yalnızca durum değişince yeniden çizim (her saniye değil)
  const [stale, setStale] = useState(false);
  const fixAtRef = useRef<number | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [active, setActive] = useState(AppState.currentState !== 'background');
  const canAskAgain = useRef(true);

  const onPoint = useCallback((p: GpsPoint) => {
    setState((s) => {
      const next = addPoint(s.trip, p);
      return { trip: next, cmax: confirmMax(s.cmax, next.speedKmh) };
    });
    const at = Date.now();
    fixAtRef.current = at;
    setStale(false);
    setFix({ at, accuracy: p.accuracy, rawSpeed: p.speed != null && p.speed >= 0 ? p.speed : null });
  }, []);

  // Uygulama arka plandayken GPS'i bırak (pil)
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => setActive(s === 'active'));
    return () => sub.remove();
  }, []);

  // Kayıp denetimi: değer aynıysa React yeniden çizmez
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => {
      const at = fixAtRef.current;
      setStale(at != null && Date.now() - at > LOST_AFTER_MS);
    }, tickMs);
    return () => clearInterval(t);
  }, [active, tickMs]);

  // Gerçek GPS
  useEffect(() => {
    if (demo || !active) return;
    let sub: Location.LocationSubscription | null = null;
    let alive = true;
    // Web (telefon tarayıcısı): yüksek doğruluklu GPS'i doğrudan iste. expo-location web'de
    // enableHighAccuracy göndermediği için telefon kaba ağ konumu verir ve hız ölçülemez.
    if (Platform.OS === 'web') {
      const geo = typeof navigator !== 'undefined' ? navigator.geolocation : undefined;
      if (!geo) {
        setBase('servis-kapali');
        return;
      }
      setBase('izin');
      const id = geo.watchPosition(
        (pos) => {
          if (!alive) return;
          setBase('bagli');
          onPoint({
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
            time: pos.timestamp || Date.now(),
            speed: pos.coords.speed,
            heading: pos.coords.heading,
            accuracy: pos.coords.accuracy,
          });
        },
        (err) => {
          if (!alive) return;
          if (err.code === err.PERMISSION_DENIED) setBase('reddedildi');
          // Konum geçici olarak alınamadıysa (kapalı alan, zaman aşımı) aramaya devam edilir
          else setBase((b) => (b === 'izin' ? 'bagli' : b));
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 },
      );
      return () => {
        alive = false;
        geo.clearWatch(id);
      };
    }
    (async () => {
      setBase('izin');
      const perm = await Location.requestForegroundPermissionsAsync();
      if (!alive) return;
      canAskAgain.current = perm.canAskAgain;
      if (perm.status !== 'granted') return setBase('reddedildi');
      const enabled = await Location.hasServicesEnabledAsync().catch(() => true);
      if (!alive) return;
      if (!enabled) return setBase('servis-kapali');
      setBase('bagli');
      sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 1000, distanceInterval: 0 },
        (loc) =>
          onPoint({
            lat: loc.coords.latitude,
            lon: loc.coords.longitude,
            time: loc.timestamp,
            speed: loc.coords.speed,
            heading: loc.coords.heading,
            accuracy: loc.coords.accuracy,
          }),
        () => alive && setBase('servis-kapali'),
      );
      if (!alive) sub.remove();
    })().catch(() => alive && setBase('servis-kapali'));
    return () => {
      alive = false;
      sub?.remove();
    };
  }, [demo, active, attempt, onPoint]);

  // Demo verisi: gerçek hesap zincirinden (addPoint) geçen yapay rota
  useEffect(() => {
    if (!demo || !active) return;
    setBase('demo');
    const t0 = Date.now();
    let lat = 41.0;
    let lon = 29.0;
    const id = setInterval(() => {
      const t = (Date.now() - t0) / 1000;
      const kmh = demoSpeed(t);
      const hdg = (40 + t * 2.2) % 360;
      const m = kmh / 3.6; // 1 sn'de alınan yol
      lat += (m * Math.cos((hdg * Math.PI) / 180)) / 111320;
      lon += (m * Math.sin((hdg * Math.PI) / 180)) / (111320 * Math.cos((lat * Math.PI) / 180));
      onPoint({ lat, lon, time: Date.now(), speed: kmh / 3.6, heading: hdg, accuracy: 4 });
    }, 1000);
    return () => clearInterval(id);
  }, [demo, active, onPoint]);

  // Pusula (yalnızca gösteriliyorsa ve dururken anlamlı); 4 Hz ile sınırlı
  useEffect(() => {
    if (!compass || demo || !active || Platform.OS === 'web' || base !== 'bagli') return;
    let sub: Location.LocationSubscription | null = null;
    let last = 0;
    let lastDeg = -999;
    let alive = true;
    Location.watchHeadingAsync((h) => {
      const deg = h.trueHeading >= 0 ? h.trueHeading : h.magHeading;
      const t = Date.now();
      if (t - last < 250 || Math.abs(deg - lastDeg) < 2) return;
      last = t;
      lastDeg = deg;
      setCompassDeg(deg);
    })
      .then((s) => {
        if (alive) sub = s;
        else s.remove();
      })
      .catch(() => {});
    return () => {
      alive = false;
      sub?.remove();
    };
  }, [compass, demo, active, base]);

  const statusNow = fix.at == null ? 0 : stale ? fix.at + LOST_AFTER_MS + 1 : fix.at;
  const status = deriveStatus(base, fix.at, fix.accuracy, statusNow, fix.rawSpeed != null);
  const reliable = status === 'bagli' || status === 'demo';
  const moving = trip.speedKmh >= 5;
  const heading = moving && trip.heading != null ? trip.heading : (compassDeg ?? trip.heading);

  const retry = useCallback(() => {
    if (base === 'reddedildi' && !canAskAgain.current) {
      Linking.openSettings().catch(() => {});
      return;
    }
    setAttempt((a) => a + 1);
  }, [base]);

  const resetTrip = useCallback(() => {
    setState((s) => ({ trip: { ...newTrip(Date.now()), last: s.trip.last, speedKmh: s.trip.speedKmh }, cmax: { prev: 0, max: 0 } }));
  }, []);

  return {
    status,
    trip,
    speedKmh: reliable && fix.at != null ? trip.speedKmh : null,
    maxKmh: cmax.max,
    accuracy: fix.accuracy,
    lastFixAt: fix.at,
    rawSpeed: fix.rawSpeed,
    baseStatus: base,
    heading,
    retry,
    resetTrip,
  };
}

export const STATUS_TEXT: Record<GpsStatus, { title: string; detail: string }> = {
  izin: { title: 'KONUM İZNİ', detail: 'Hız ölçümü için konum izni bekleniyor' },
  reddedildi: { title: 'İZİN YOK', detail: Platform.OS === 'web' ? 'Tarayıcıda adres çubuğundaki simgeden bu siteye konum izni verin' : 'Hız ölçmek için konum izni verin' },
  'servis-kapali': { title: 'KONUM KAPALI', detail: 'Cihazın konum servisini açın' },
  araniyor: { title: 'UYDU ARANIYOR', detail: 'GPS bağlantısı kuruluyor' },
  bagli: { title: 'GPS BAĞLI', detail: '' },
  zayif: { title: 'ZAYIF SİNYAL', detail: 'Doğruluk hız için yetersiz' },
  kayip: { title: 'SİNYAL KAYBOLDU', detail: 'GPS verisi gelmiyor — hız gösterilmiyor' },
  demo: { title: 'DEMO VERİSİ', detail: 'Gerçek hız değil' },
};
