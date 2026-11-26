import { clockDuration, distanceText, fromUnit, headingLabel, signalBars, toUnit, unwrapAngle } from '@/features/nexus/format';
import { DEFAULT_NEXUS, resolveNexus, THEME_IDS } from '@/features/nexus/settings';
import { alpha, paletteFor, THEMES, windshieldPalette } from '@/features/nexus/themes';
import { confirmMax, deriveStatus, demoSpeed, LOST_AFTER_MS } from '@/features/nexus/useNexusGps';

describe('NEXUS birimler ve biçim', () => {
  it('km/h ↔ mph', () => {
    expect(Math.round(toUnit(100, 'mph'))).toBe(62);
    expect(toUnit(100, 'kmh')).toBe(100);
    expect(Math.round(fromUnit(62.137, 'mph'))).toBe(100);
  });
  it('mesafe metni', () => {
    expect(distanceText(12345, 'kmh')).toBe('12.3');
    expect(distanceText(1609.344, 'mph')).toBe('1.0');
    expect(distanceText(250000, 'kmh')).toBe('250');
  });
  it('süre', () => {
    expect(clockDuration(42_000)).toBe('0:42');
    expect(clockDuration(3_909_000)).toBe('1:05:09');
  });
  it('yön ve en kısa dönüş', () => {
    expect(headingLabel(0)).toBe('N');
    expect(headingLabel(100)).toBe('E');
    expect(headingLabel(null)).toBe('--');
    expect(unwrapAngle(350, 10)).toBe(370);
    expect(unwrapAngle(10, 350)).toBe(-10);
  });
  it('sinyal çubukları', () => {
    expect(signalBars(5)).toBe(4);
    expect(signalBars(40)).toBe(1);
    expect(signalBars(80)).toBe(0);
    expect(signalBars(null)).toBe(0);
  });
});

describe('NEXUS ayarlar', () => {
  it('eksik/bozuk kayıt varsayılanlarla tamamlanır', () => {
    expect(resolveNexus(null)).toEqual(DEFAULT_NEXUS);
    const r = resolveNexus({ theme: 'yok', gaugeScale: 9, widgets: { clock: false }, unit: 'x' });
    expect(r.theme).toBe('nexus');
    expect(r.gaugeScale).toBe(1.15);
    expect(r.unit).toBe('kmh');
    expect(r.widgets.clock).toBe(false);
    expect(r.widgets.distance).toBe(true);
  });
  it('kaldırılan tema ve bozuk yeni alanlar güvenli değere döner', () => {
    const r = resolveNexus({ theme: 'cyber', speedAlert: 999, mirrorAxis: 'x', camOrientation: 'x', cockpitOrientation: 'x' });
    expect(r.theme).toBe('nexus');
    expect(r.speedAlert).toBe(250);
    expect(r.mirrorAxis).toBe('ust');
    expect(r.camOrientation).toBe('yatay');
    expect(r.cockpitOrientation).toBe('yatay');
  });
});

describe('NEXUS temalar', () => {
  it('altı kokpit teması; her birinin gösterge geometrisi farklı', () => {
    expect(THEME_IDS).toHaveLength(6);
    expect(new Set(THEME_IDS.map((t) => THEMES[t].gauge)).size).toBe(6);
    expect(THEME_IDS).not.toContain('cyber');
    expect(THEME_IDS).not.toContain('darkmatter');
  });
  it('cam paleti her temada saf siyah', () => {
    for (const t of THEME_IDS) expect(windshieldPalette(THEMES[t], true, null).bg).toBe('#000000');
  });
  it('gece: zemin koyu, renkler canlı (en fazla hafif kısık)', () => {
    const lum = (h: string) => parseInt(h.slice(1, 3), 16) + parseInt(h.slice(3, 5), 16) + parseInt(h.slice(5, 7), 16);
    for (const t of THEME_IDS) {
      const d = paletteFor(THEMES[t], true, null);
      const n = paletteFor(THEMES[t], false, null);
      expect(lum(n.bg)).toBeLessThan(lum(d.bg));
      expect(lum(n.primary)).toBeGreaterThan(lum(THEMES[t].night.primary) * 0.85);
    }
    // Windshield hız rakamı gündüz de gece de beyaz
    expect(windshieldPalette(THEMES.nexus, false, null).text).toBe('#FFFFFF');
    expect(windshieldPalette(THEMES.nexus, true, null).text).toBe('#FFFFFF');
    expect(windshieldPalette(THEMES.nexus, false, null).primary).not.toBe(windshieldPalette(THEMES.nexus, true, null).primary);
  });
  it('alpha', () => {
    expect(alpha('#FFFFFF', 0.5)).toBe('#FFFFFF80');
  });
});

describe('NEXUS GPS dürüstlüğü', () => {
  it('tek sıçrama maksimum hızı bozmaz', () => {
    let s = { prev: 0, max: 0 };
    for (const v of [50, 52, 180, 53, 55]) s = confirmMax(s, v);
    expect(s.max).toBe(53);
  });
  it('sinyal kaybı ve zayıf doğruluk', () => {
    expect(deriveStatus('bagli', null, null, 0)).toBe('araniyor');
    expect(deriveStatus('bagli', 0, 5, LOST_AFTER_MS + 1)).toBe('kayip');
    expect(deriveStatus('bagli', 0, 80, 1000)).toBe('zayif');
    // cihaz hızı kendisi ölçüyorsa 100 m'ye kadar hız gösterilir
    expect(deriveStatus('bagli', 0, 80, 1000, true)).toBe('bagli');
    expect(deriveStatus('bagli', 0, 120, 1000, true)).toBe('zayif');
    expect(deriveStatus('bagli', 0, 5, 1000)).toBe('bagli');
    expect(deriveStatus('reddedildi', 0, 5, 1000)).toBe('reddedildi');
  });
  it('demo hızı sıfırdan başlar ve negatif olmaz', () => {
    expect(demoSpeed(0)).toBe(0);
    for (let t = 0; t < 300; t += 7) expect(demoSpeed(t)).toBeGreaterThanOrEqual(0);
  });
});

describe('Ekran yönü kilidi', () => {
  it('yatay kilit, telefonun o anki yatay yönüne sabitlenir (virajda 180° dönmez)', () => {
    const { exactWebOrientation } = jest.requireActual('@/features/nexus/useHudSystem');
    expect(exactWebOrientation('yatay', 'landscape-secondary')).toBe('landscape-secondary');
    expect(exactWebOrientation('yatay', 'landscape-primary')).toBe('landscape-primary');
    expect(exactWebOrientation('yatay', 'portrait-primary')).toBe('landscape-primary');
    expect(exactWebOrientation('dikey', 'landscape-primary')).toBe('portrait-primary');
    expect(exactWebOrientation('dikey', undefined)).toBe('portrait-primary');
  });
});

describe('Işık: güneş saatleri', () => {
  const { sunTimes, daylightLevel, effectiveBrightness } = jest.requireActual('@/features/nexus/sun');
  const utc = (ms: number) => new Date(ms).toISOString().slice(11, 16);
  it('İstanbul, 26 Kasım: doğuş ~05:05 UTC (08:05), batış ~14:39 UTC (17:39)', () => {
    const s = sunTimes(new Date(2026, 10, 26, 12), 41.01, 28.98);
    const rise = new Date(s.sunrise).getUTCHours() * 60 + new Date(s.sunrise).getUTCMinutes();
    const set = new Date(s.sunset).getUTCHours() * 60 + new Date(s.sunset).getUTCMinutes();
    expect(Math.abs(rise - (5 * 60 + 5))).toBeLessThanOrEqual(5);
    expect(Math.abs(set - (14 * 60 + 39))).toBeLessThanOrEqual(5);
    expect(utc(s.sunrise) < utc(s.sunset)).toBe(true);
  });
  it('kutup gecesi/günü', () => {
    expect(sunTimes(new Date(2026, 11, 21, 12), 78, 15).polar).toBe('night');
    expect(sunTimes(new Date(2026, 5, 21, 12), 78, 15).polar).toBe('day');
  });
  it('ışık seviyesi: gündüz 1, gece 0, geçişte arada', () => {
    const pos = { lat: 41.01, lon: 28.98 };
    const s = sunTimes(new Date(2026, 10, 26, 12), pos.lat, pos.lon);
    expect(daylightLevel(new Date(s.sunrise + 3600000), pos)).toBe(1);
    expect(daylightLevel(new Date(s.sunset + 3600000), pos)).toBe(0);
    const mid = daylightLevel(new Date(s.sunset), pos);
    expect(mid).toBeGreaterThan(0.3);
    expect(mid).toBeLessThan(0.7);
  });
  it('gece parlaklığı kısılır, gündüz ayar aynen', () => {
    expect(effectiveBrightness(null, 1)).toBeNull();
    expect(effectiveBrightness(0.8, 1)).toBe(0.8);
    expect(effectiveBrightness(null, 0)).toBe(0.8);
  });
});
