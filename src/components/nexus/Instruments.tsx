import { memo, useEffect, useRef } from 'react';
import { View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';
import { headingLabel, signalBars, unwrapAngle } from '@/features/nexus/format';
import { alpha, type GlyphStyle, type NexusPalette } from '@/features/nexus/themes';
import type { GpsStatus } from '@/features/nexus/useNexusGps';
import { LABEL_FONT, NxLabel } from './primitives';
import { NxNumber } from './NxNumber';

/** Yön değerini en kısa yoldan, UI thread'de akıcı döndürür */
function useHeadingValue(heading: number | null, reduced?: boolean) {
  const v = useSharedValue(heading ?? 0);
  const acc = useRef(heading ?? 0);
  useEffect(() => {
    if (heading == null) return;
    acc.current = unwrapAngle(acc.current, heading);
    v.value = withTiming(acc.current, { duration: reduced ? 0 : 450, easing: Easing.out(Easing.quad) });
  }, [heading, reduced, v]);
  return v;
}

const CARD: Record<number, string> = { 0: 'N', 90: 'E', 180: 'S', 270: 'W' };

/** Savaş uçağı tipi yatay yön şeridi (120° pencere) */
export const HeadingTape = memo(function HeadingTape({ heading, width, pal, reduced }: { heading: number | null; width: number; pal: NexusPalette; reduced?: boolean }) {
  const v = useHeadingValue(heading, reduced);
  const ppd = width / 120;
  const H = 34;
  const style = useAnimatedStyle(() => {
    const n = ((v.value % 360) + 360) % 360;
    return { transform: [{ translateX: width / 2 - (n + 180) * ppd }] };
  });
  const ticks = [];
  for (let d = -180; d <= 540; d += 15) {
    const nd = ((d % 360) + 360) % 360;
    const major = nd % 90 === 0;
    const mid = nd % 45 === 0;
    const x = (d + 180) * ppd;
    ticks.push(<View key={`t${d}`} style={{ position: 'absolute', left: x - 0.5, top: major ? 4 : mid ? 7 : 10, width: 1, height: major ? 10 : mid ? 7 : 4, backgroundColor: major ? pal.primary : alpha(pal.primary, 0.5) }} />);
    if (major || mid) {
      ticks.push(
        <NxLabel
          key={`l${d}`}
          color={major ? pal.text : pal.dim}
          size={major ? 11 : 8.5}
          spacing={0.5}
          style={{ position: 'absolute', left: x - 20, width: 40, top: 17, textAlign: 'center' }}
        >
          {CARD[nd] ?? headingLabel(nd)}
        </NxLabel>,
      );
    }
  }
  return (
    <View style={{ width, height: H + 18, alignItems: 'center', opacity: heading == null ? 0.45 : 1 }}>
      <View style={{ width, height: H, overflow: 'hidden', borderTopWidth: 1, borderColor: alpha(pal.primary, 0.25) }}>
        <Animated.View style={[{ position: 'absolute', top: 0, left: 0, width: 720 * ppd, height: H }, style]}>{ticks}</Animated.View>
        {/* kenarlarda sönümleme */}
        <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: width * 0.12, backgroundColor: alpha(pal.bg, 0.7) }} />
        <View pointerEvents="none" style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: width * 0.12, backgroundColor: alpha(pal.bg, 0.7) }} />
      </View>
      {/* sabit imleç ve okunan değer */}
      <View style={{ position: 'absolute', top: -2, width: 0, height: 0, borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 7, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: pal.holo }} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
        <NxNumber text={heading == null ? '---' : String(Math.round(((heading % 360) + 360) % 360)).padStart(3, '0')} height={13} color={pal.text} style="mono" />
        <NxLabel color={pal.primary} size={10}>
          {headingLabel(heading)}
        </NxLabel>
      </View>
    </View>
  );
});

/** Dairesel pusula: gül döner, imleç sabit */
export const CompassDial = memo(function CompassDial({ heading, size, pal, glyph, reduced }: { heading: number | null; size: number; pal: NexusPalette; glyph: GlyphStyle; reduced?: boolean }) {
  const v = useHeadingValue(heading, reduced);
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${-v.value}deg` }] }));
  const ticks = [];
  for (let d = 0; d < 360; d += 15) {
    const major = d % 90 === 0;
    ticks.push(<Line key={d} x1={50} y1={4} x2={50} y2={major ? 13 : 9} stroke={major ? pal.primary : alpha(pal.primary, 0.45)} strokeWidth={major ? 1.6 : 0.8} transform={`rotate(${d} 50 50)`} />);
  }
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center', opacity: heading == null ? 0.45 : 1 }}>
      <Animated.View style={[{ position: 'absolute', width: size, height: size }, style]}>
        <Svg width={size} height={size} viewBox="0 0 100 100">
          <Circle cx={50} cy={50} r={46} stroke={alpha(pal.primary, 0.3)} strokeWidth={0.8} fill={alpha(pal.primary, 0.03)} />
          {ticks}
          {['N', 'E', 'S', 'W'].map((l, i) => (
            <SvgText key={l} x={50} y={25} fill={l === 'N' ? pal.holo : pal.text} fontSize={10} fontWeight="700" fontFamily={LABEL_FONT} textAnchor="middle" transform={`rotate(${i * 90} 50 50)`}>
              {l}
            </SvgText>
          ))}
        </Svg>
      </Animated.View>
      <Svg width={size} height={size} viewBox="0 0 100 100" style={{ position: 'absolute' }}>
        <Path d="M50 0 L45 8 L55 8 Z" fill={pal.secondary} />
      </Svg>
      <NxNumber text={heading == null ? '---' : String(Math.round(((heading % 360) + 360) % 360)).padStart(3, '0')} height={size * 0.15} color={pal.text} style={glyph} />
      <NxLabel color={pal.primary} size={Math.max(8, size * 0.1)} style={{ marginTop: 3 }}>
        {headingLabel(heading)}
      </NxLabel>
    </View>
  );
});

/** GPS sinyal çubukları + doğruluk */
export function SignalIndicator({ status, accuracy, pal }: { status: GpsStatus; accuracy: number | null; pal: NexusPalette }) {
  const ok = status === 'bagli' || status === 'demo';
  const bars = status === 'demo' ? 4 : ok || status === 'zayif' ? signalBars(accuracy) : 0;
  const col = status === 'demo' ? pal.warn : ok ? pal.secondary : status === 'zayif' ? pal.warn : pal.danger;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2 }}>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={{ width: 3, height: 5 + i * 3, backgroundColor: i < bars ? col : alpha(pal.dim, 0.6) }} />
        ))}
      </View>
      <View>
        <NxLabel color={col} size={9}>
          {status === 'demo' ? 'DEMO' : ok ? 'GPS' : status === 'zayif' ? 'GPS ZAYIF' : status === 'kayip' ? 'GPS YOK' : 'GPS --'}
        </NxLabel>
        <NxLabel color={pal.dim} size={8.5} spacing={1}>
          {accuracy != null && status !== 'demo' && status !== 'kayip' ? `±${Math.round(accuracy)} M` : '±-- M'}
        </NxLabel>
      </View>
    </View>
  );
}

/**
 * GPS bağlantı animasyonu: dönen tarama dilimi, dışa yayılan halkalar, uydu kilit noktaları.
 * Tek bir dönen katman + iki ölçek animasyonu (UI thread); bağlanınca söner.
 */
export const GpsScan = memo(function GpsScan({ size, pal, title, detail, reduced }: { size: number; pal: NexusPalette; title: string; detail?: string; reduced?: boolean }) {
  const rot = useSharedValue(0);
  const pulse = useSharedValue(0);
  useEffect(() => {
    if (reduced) return;
    rot.value = withRepeat(withTiming(1, { duration: 1800, easing: Easing.linear }), -1, false);
    pulse.value = withRepeat(withSequence(withTiming(1, { duration: 1600, easing: Easing.out(Easing.quad) }), withTiming(0, { duration: 0 })), -1, false);
  }, [reduced, rot, pulse]);
  const sweep = useAnimatedStyle(() => ({ transform: [{ rotate: `${rot.value * 360}deg` }] }));
  const ring = useAnimatedStyle(() => ({ transform: [{ scale: 0.3 + pulse.value * 0.7 }], opacity: 1 - pulse.value }));
  const r = size * 0.42;
  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View style={[{ position: 'absolute', width: size, height: size, borderRadius: size / 2, borderWidth: 1.5, borderColor: pal.primary }, ring]} />
        <Svg width={size} height={size} viewBox="0 0 100 100" style={{ position: 'absolute' }}>
          <Circle cx={50} cy={50} r={46} stroke={alpha(pal.primary, 0.3)} strokeWidth={0.6} fill="none" />
          <Circle cx={50} cy={50} r={30} stroke={alpha(pal.primary, 0.2)} strokeWidth={0.5} fill="none" strokeDasharray="2 3" />
          <Line x1={4} y1={50} x2={96} y2={50} stroke={alpha(pal.primary, 0.15)} strokeWidth={0.5} />
          <Line x1={50} y1={4} x2={50} y2={96} stroke={alpha(pal.primary, 0.15)} strokeWidth={0.5} />
          <Circle cx={72} cy={32} r={1.6} fill={pal.holo} />
          <Circle cx={30} cy={66} r={1.3} fill={pal.secondary} />
          <Circle cx={60} cy={78} r={1.1} fill={alpha(pal.primary, 0.8)} />
        </Svg>
        <Animated.View style={[{ position: 'absolute', width: size, height: size }, sweep]}>
          <Svg width={size} height={size} viewBox="0 0 100 100">
            <Path d="M50 50 L50 4 A46 46 0 0 1 82.5 17.5 Z" fill={alpha(pal.primary, 0.22)} />
            <Line x1={50} y1={50} x2={50} y2={4} stroke={pal.primary} strokeWidth={1} />
          </Svg>
        </Animated.View>
        <View style={{ width: r * 0.18, height: r * 0.18, backgroundColor: pal.secondary, transform: [{ rotate: '45deg' }] }} />
      </View>
      <NxLabel color={pal.text} size={Math.max(11, size * 0.075)} spacing={3} style={{ marginTop: 12 }}>
        {title}
      </NxLabel>
      {detail ? (
        <NxLabel color={pal.dim} size={9.5} spacing={1} style={{ marginTop: 4 }} numberOfLines={2}>
          {detail}
        </NxLabel>
      ) : null}
    </View>
  );
});

/** Sinyal kaybı / zayıf sinyal uyarı şeridi (yanıp sönen kenar) */
export function SignalAlert({ pal, title, detail, reduced }: { pal: NexusPalette; title: string; detail: string; reduced?: boolean }) {
  const o = useSharedValue(1);
  useEffect(() => {
    if (reduced) return;
    o.value = withRepeat(withSequence(withTiming(0.35, { duration: 650 }), withTiming(1, { duration: 650 })), -1, false);
  }, [reduced, o]);
  const st = useAnimatedStyle(() => ({ opacity: o.value }));
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, paddingHorizontal: 14, borderWidth: 1, borderColor: pal.warn, backgroundColor: alpha(pal.warn, 0.1) }}>
      <Animated.View style={[{ width: 9, height: 9, backgroundColor: pal.warn, transform: [{ rotate: '45deg' }] }, st]} />
      <View>
        <NxLabel color={pal.warn} size={11} spacing={2.5}>
          {title}
        </NxLabel>
        <NxLabel color={alpha(pal.warn, 0.8)} size={9} spacing={1}>
          {detail}
        </NxLabel>
      </View>
    </View>
  );
}
