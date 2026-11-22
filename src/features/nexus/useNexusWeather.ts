import { useEffect, useRef, useState } from 'react';

export interface NexusWeather {
  temp: number;
  text: string;
  icon: string;
}

/** Open-Meteo hava kodu → kısa açıklama ve simge (MaterialCommunityIcons) */
export function weatherInfo(code: number | null): { text: string; icon: string } {
  if (code == null) return { text: 'Bilinmiyor', icon: 'weather-cloudy-alert' };
  if (code === 0) return { text: 'Açık', icon: 'weather-sunny' };
  if (code <= 2) return { text: 'Parçalı bulutlu', icon: 'weather-partly-cloudy' };
  if (code === 3) return { text: 'Bulutlu', icon: 'weather-cloudy' };
  if (code === 45 || code === 48) return { text: 'Sisli', icon: 'weather-fog' };
  if (code <= 57) return { text: 'Çisenti', icon: 'weather-rainy' };
  if (code <= 67) return { text: 'Yağmurlu', icon: 'weather-pouring' };
  if (code <= 77) return { text: 'Karlı', icon: 'weather-snowy' };
  if (code <= 82) return { text: 'Sağanak', icon: 'weather-pouring' };
  if (code <= 86) return { text: 'Kar sağanağı', icon: 'weather-snowy-heavy' };
  return { text: 'Gök gürültülü', icon: 'weather-lightning-rainy' };
}

const REFRESH_MS = 30 * 60 * 1000;

/**
 * İsteğe bağlı hava durumu (Open-Meteo, anahtarsız). Yalnızca açıkken ve GPS konumu varken,
 * 30 dakikada bir istenir; hata olursa gösterge sessizce gizlenir.
 */
export function useNexusWeather(enabled: boolean, lat: number | null, lon: number | null): NexusWeather | null {
  const [w, setW] = useState<NexusWeather | null>(null);
  const lastAt = useRef(0);
  const hasPos = lat != null && lon != null;

  useEffect(() => {
    if (!enabled || !hasPos) return;
    if (Date.now() - lastAt.current < REFRESH_MS) return;
    lastAt.current = Date.now();
    const ctrl = new AbortController();
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat!.toFixed(2)}&longitude=${lon!.toFixed(2)}&current=temperature_2m,weather_code`, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((d) => {
        const temp = d?.current?.temperature_2m;
        if (typeof temp !== 'number') return;
        const info = weatherInfo(d.current.weather_code ?? null);
        setW({ temp: Math.round(temp), text: info.text, icon: info.icon });
      })
      .catch(() => {
        lastAt.current = 0;
      });
    return () => ctrl.abort();
    // Konum her saniye değişir; yalnızca yenileme aralığı dolunca istek atılır
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, hasPos, Math.round((lat ?? 0) * 10), Math.round((lon ?? 0) * 10)]);

  return enabled ? w : null;
}
