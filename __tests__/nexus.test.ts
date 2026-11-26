import { clockDuration, distanceText, fromUnit, headingLabel, signalBars, toUnit, unwrapAngle } from '@/features/nexus/format';
import { DEFAULT_NEXUS, isDay, resolveNexus, THEME_IDS } from '@/features/nexus/settings';
import { alpha, THEMES, windshieldPalette } from '@/features/nexus/themes';
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
    const r = resolveNexus({ theme: 'cyber', speedAlert: 999, mirrorAxis: 'x', camOrientation: 'x', cockpitOrientation: 'x', camLayout: 'x' });
    expect(r.theme).toBe('nexus');
    expect(r.speedAlert).toBe(250);
    expect(r.mirrorAxis).toBe('ust');
    expect(r.camOrientation).toBe('yatay');
    expect(r.cockpitOrientation).toBe('yatay');
    expect(r.camLayout).toBe('hiz');
  });
  it('gündüz/gece', () => {
    expect(isDay('gece', new Date(2026, 0, 1, 12))).toBe(false);
    expect(isDay('oto', new Date(2026, 0, 1, 12))).toBe(true);
    expect(isDay('oto', new Date(2026, 0, 1, 22))).toBe(false);
  });
});

describe('NEXUS temalar', () => {
  it('yedi kokpit teması; her birinin gösterge geometrisi farklı', () => {
    expect(THEME_IDS).toHaveLength(7);
    expect(new Set(THEME_IDS.map((t) => THEMES[t].gauge)).size).toBe(7);
    expect(THEME_IDS).not.toContain('cyber');
    expect(THEME_IDS).not.toContain('darkmatter');
  });
  it('cam paleti her temada saf siyah', () => {
    for (const t of THEME_IDS) expect(windshieldPalette(THEMES[t], true, null).bg).toBe('#000000');
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
    expect(deriveStatus('bagli', 0, 5, 1000)).toBe('bagli');
    expect(deriveStatus('reddedildi', 0, 5, 1000)).toBe('reddedildi');
  });
  it('demo hızı sıfırdan başlar ve negatif olmaz', () => {
    expect(demoSpeed(0)).toBe(0);
    for (let t = 0; t < 300; t += 7) expect(demoSpeed(t)).toBeGreaterThanOrEqual(0);
  });
});
