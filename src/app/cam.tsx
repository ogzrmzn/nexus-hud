import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Platform, Pressable, useWindowDimensions, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { measureNx, NxNumber } from '@/components/nexus/NxNumber';
import { HudButton, NxLabel } from '@/components/nexus/primitives';
import { clockText, gaugeMax, toUnit, unitLabel } from '@/features/nexus/format';
import { alpha } from '@/features/nexus/themes';
import { useHudSystem } from '@/features/nexus/useHudSystem';
import { useNexus } from '@/features/nexus/useNexus';
import { STATUS_TEXT, useNexusGps } from '@/features/nexus/useNexusGps';

const BRIGHT_STEPS = [0.1, 0.25, 0.5, 0.75, 1];
/** Bu hızın üstünde ayarlar kilitlenir (sürüşte dikkat dağıtmasın) */
const LOCK_KMH = 10;

/**
 * MOD 1 — WINDSHIELD HUD
 * Telefon gösterge paneline yatırılır, ekran ön cama yansır. Ayna görüntü, saf siyah zemin, kalın çizgiler,
 * tek büyük hız. Glow, sürekli animasyon ve küçük yazı yok: camda çift görüntü yapar ve göz yorar.
 */
export default function Windshield() {
  const { nx, theme, wpal: pal, update, day } = useNexus();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const gps = useNexusGps({ demo: nx.demo, compass: false });
  const [controls, setControls] = useState(true);
  useHudSystem({ keepAwake: nx.keepAwake, brightness: nx.brightness, orientation: 'landscape' });

  const speed = gps.speedKmh == null ? null : Math.round(toUnit(gps.speedKmh, nx.unit));
  const over = nx.speedAlert > 0 && speed != null && speed > nx.speedAlert;
  const moving = (gps.speedKmh ?? 0) > LOCK_KMH;
  const statusInfo = STATUS_TEXT[gps.status];

  // Kontroller 5 sn sonra kaybolur
  useEffect(() => {
    if (!controls) return;
    const t = setTimeout(() => setControls(false), 5000);
    return () => clearTimeout(t);
  }, [controls, nx]);

  // Hız uyarısı: 3 kez yanıp söner + tek titreşim, sınırın üstünde kırmızı kalır
  const flash = useSharedValue(1);
  useEffect(() => {
    if (!over) return;
    flash.value = withRepeat(withSequence(withTiming(0.25, { duration: 220 }), withTiming(1, { duration: 220 })), 3, false);
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
  }, [over, flash]);
  const flashStyle = useAnimatedStyle(() => ({ opacity: flash.value }));

  // Merkez hız çubuğu: ortadan iki yana dolar (ayna görüntüde de simetrik)
  const frac = useSharedValue(0);
  useEffect(() => {
    const v = gps.speedKmh == null ? 0 : Math.min(1, toUnit(gps.speedKmh, nx.unit) / gaugeMax(nx.unit));
    frac.value = withTiming(v, { duration: 300 });
  }, [gps.speedKmh, nx.unit, frac]);
  const barW = width * 0.56;
  const barStyle = useAnimatedStyle(() => ({ width: barW * frac.value }));

  const glyph = theme.glyph === 'hairline' ? 'mono' : theme.glyph;
  const W = width - insets.left - insets.right - 40;
  const H = height - insets.top - insets.bottom - 30;
  const ratio = measureNx('188', 1, glyph);
  const numH = Math.min(H * 0.56, (W * 0.84) / ratio) * nx.gaugeScale;
  const auxH = Math.max(22, Math.min(36, H * 0.1));
  const color = speed == null ? pal.dim : over ? pal.danger : pal.text;

  const brightIdx = nx.brightness == null ? -1 : BRIGHT_STEPS.reduce((b, v, i) => (Math.abs(v - nx.brightness!) < Math.abs(BRIGHT_STEPS[b] - nx.brightness!) ? i : b), 0);
  const stepBright = (d: number) => {
    const i = Math.min(BRIGHT_STEPS.length - 1, Math.max(0, (brightIdx < 0 ? BRIGHT_STEPS.length - 1 : brightIdx) + d));
    update({ brightness: BRIGHT_STEPS[i] });
  };

  const needsAction = gps.status === 'reddedildi' || gps.status === 'servis-kapali';
  const clock = clockText(new Date(gps.now));

  return (
    <Pressable style={{ flex: 1, backgroundColor: '#000' }} onPress={() => setControls((v) => !v)} accessibilityLabel="Kontrolleri göster/gizle">
      <StatusBar hidden />
      {/* --- Yansıyan katman --- */}
      <View
        pointerEvents="none"
        style={{
          flex: 1,
          paddingTop: insets.top + 12,
          paddingBottom: insets.bottom + 12,
          paddingLeft: insets.left + 20,
          paddingRight: insets.right + 20,
          transform: nx.mirror ? [{ scaleX: -1 }] : [],
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', height: auxH * 1.2 }}>
          {nx.widgets.clock ? <NxNumber text={clock} height={auxH} color={pal.dim} style={glyph} weightScale={1.2} /> : <View />}
          {nx.demo ? (
            <NxLabel color={pal.warn} size={auxH * 0.7} spacing={4} weight="800">
              DEMO
            </NxLabel>
          ) : null}
          {nx.widgets.gps ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ width: auxH * 0.42, height: auxH * 0.42, borderRadius: auxH, backgroundColor: gps.status === 'bagli' || gps.status === 'demo' ? pal.primary : pal.warn }} />
              <NxLabel color={gps.status === 'bagli' || gps.status === 'demo' ? pal.dim : pal.warn} size={auxH * 0.62} spacing={2} weight="800">
                GPS
              </NxLabel>
            </View>
          ) : (
            <View />
          )}
        </View>

        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Animated.View style={over ? flashStyle : undefined}>
            <NxNumber text={speed == null ? '--' : String(speed)} height={numH} color={color} style={glyph} weightScale={1.35} />
          </Animated.View>
          <View style={{ width: barW, height: Math.max(8, numH * 0.045), marginTop: numH * 0.1, backgroundColor: alpha(pal.primary, 0.14), alignItems: 'center' }}>
            <Animated.View style={[{ height: '100%', backgroundColor: over ? pal.danger : pal.primary }, barStyle]} />
          </View>
          <NxLabel color={speed == null ? pal.warn : pal.primary} size={auxH * 0.75} spacing={6} weight="800" style={{ marginTop: numH * 0.07 }}>
            {speed == null ? statusInfo.title : unitLabel(nx.unit)}
          </NxLabel>
        </View>
      </View>

      {/* --- Kontroller (aynalanmaz; araç dururken okunur) --- */}
      {controls || needsAction ? (
        <View
          style={{
            position: 'absolute',
            left: insets.left + 14,
            right: insets.right + 14,
            top: insets.top + 6,
            padding: 6,
            backgroundColor: 'rgba(0,0,0,0.92)',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            flexWrap: 'wrap',
          }}
        >
          <HudButton icon="arrow-left" pal={pal} label="ÇIKIŞ" onPress={() => router.back()} />
          <View style={{ flex: 1 }} />
          {needsAction ? <HudButton icon="crosshairs-gps" pal={pal} label={gps.status === 'reddedildi' ? 'İZİN VER' : 'TEKRAR DENE'} active onPress={gps.retry} /> : null}
          {controls ? (
            <>
              <HudButton icon="flip-horizontal" pal={pal} label="AYNA" active={nx.mirror} onPress={() => update({ mirror: !nx.mirror })} />
              <HudButton icon="brightness-5" pal={pal} onPress={() => stepBright(-1)} label={undefined} />
              <NxLabel color={pal.text} size={11}>
                {nx.brightness == null ? 'SİSTEM' : `${Math.round(nx.brightness * 100)}%`}
              </NxLabel>
              <HudButton icon="brightness-7" pal={pal} onPress={() => stepBright(1)} />
              <HudButton icon={day ? 'white-balance-sunny' : 'weather-night'} pal={pal} onPress={() => update({ dayNight: day ? 'gece' : 'gunduz' })} />
              <HudButton icon={moving ? 'lock' : 'tune-variant'} pal={pal} disabled={moving} onPress={() => router.push('/ayarlar')} />
            </>
          ) : null}
        </View>
      ) : null}
      {controls ? (
        <View pointerEvents="none" style={{ position: 'absolute', bottom: insets.bottom + 10, left: 0, right: 0, alignItems: 'center' }}>
          <NxLabel color={pal.dim} size={9.5} spacing={1.5}>
            {moving ? 'SÜRÜŞTE AYARLAR KİLİTLİ' : needsAction ? statusInfo.detail : 'TELEFONU CAMIN ALTINA YATIRIN · DOKUN: KONTROLLER'}
          </NxLabel>
        </View>
      ) : null}
    </Pressable>
  );
}
