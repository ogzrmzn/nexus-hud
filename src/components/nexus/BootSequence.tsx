import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { Easing, useAnimatedProps, useAnimatedStyle, useSharedValue, withDelay, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';
import { alpha, type NexusPalette } from '@/features/nexus/themes';
import { NxLabel } from './primitives';

const ACircle = Animated.createAnimatedComponent(Circle);
const APath = Animated.createAnimatedComponent(Path);

const LINES = [
  ['GÖRÜNTÜ ÇEKİRDEĞİ', 'OK'],
  ['KONUM MODÜLÜ', 'HAZIR'],
  ['SENSÖR FÜZYONU', 'OK'],
  ['KOKPİT ARAYÜZÜ', 'ÇEVRİMİÇİ'],
] as const;

const RING_R = 44;
const RING_LEN = 2 * Math.PI * RING_R;
/** Pahlı altıgen amblem */
const EMBLEM = 'M50 14 L80 31 L80 69 L50 86 L20 69 L20 31 Z';
const EMBLEM_LEN = 6 * 35;

/**
 * ~2.3 sn'lik sistem başlatma: tarama çizgisi açılır, halka ve amblem çizilir, tanılama satırları gelir,
 * sonra katman büyüyerek söner. Dokunarak atlanabilir; "az animasyon" tercihinde çok kısadır.
 */
export function BootSequence({ pal, onDone, reduced }: { pal: NexusPalette; onDone: () => void; reduced?: boolean }) {
  const { width, height } = useWindowDimensions();
  const S = Math.min(width, height) * 0.5;
  const line = useSharedValue(0);
  const ring = useSharedValue(0);
  const emblem = useSharedValue(0);
  const out = useSharedValue(0);
  const [shownLines, setShownLines] = useState(0);
  const [title, setTitle] = useState(false);

  useEffect(() => {
    const total = reduced ? 500 : 2300;
    const ease = Easing.out(Easing.cubic);
    line.value = withTiming(1, { duration: reduced ? 100 : 380, easing: ease });
    ring.value = withDelay(reduced ? 0 : 250, withTiming(1, { duration: reduced ? 150 : 800, easing: Easing.inOut(Easing.cubic) }));
    emblem.value = withDelay(reduced ? 0 : 520, withTiming(1, { duration: reduced ? 150 : 650, easing: ease }));
    const timers = [setTimeout(() => setTitle(true), reduced ? 50 : 700)];
    LINES.forEach((_, i) => timers.push(setTimeout(() => setShownLines(i + 1), reduced ? 80 : 900 + i * 260)));
    out.value = withDelay(total - (reduced ? 200 : 380), withSequence(withTiming(1, { duration: reduced ? 200 : 380, easing: Easing.in(Easing.quad) }, (f) => {
      if (f) scheduleOnRN(onDone);
    })));
    return () => timers.forEach(clearTimeout);
  }, [reduced, line, ring, emblem, out, onDone]);

  const lineStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: line.value }], opacity: 1 - ring.value * 0.6 }));
  const ringProps = useAnimatedProps(() => ({ strokeDashoffset: RING_LEN * (1 - ring.value) }));
  const emblemProps = useAnimatedProps(() => ({ strokeDashoffset: EMBLEM_LEN * (1 - emblem.value) }));
  const rootStyle = useAnimatedStyle(() => ({ opacity: 1 - out.value, transform: [{ scale: 1 + out.value * 0.12 }] }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: pal.bg, zIndex: 100 }, rootStyle]}>
      <Pressable style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }} onPress={onDone} accessibilityLabel="Başlatmayı atla">
        <Animated.View style={[{ position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: pal.primary }, lineStyle]} />
        <View style={{ width: S, height: S }}>
          <Svg width={S} height={S} viewBox="0 0 100 100">
            <Circle cx={50} cy={50} r={RING_R + 3} stroke={alpha(pal.holo, 0.25)} strokeWidth={0.4} fill="none" strokeDasharray="1 3" />
            <ACircle
              cx={50}
              cy={50}
              r={RING_R}
              stroke={pal.primary}
              strokeWidth={1.2}
              fill="none"
              strokeDasharray={`${RING_LEN} ${RING_LEN}`}
              animatedProps={ringProps}
              transform="rotate(-90 50 50)"
            />
            <APath d={EMBLEM} stroke={pal.secondary} strokeWidth={1.4} fill={alpha(pal.primary, 0.05)} strokeDasharray={`${EMBLEM_LEN} ${EMBLEM_LEN}`} animatedProps={emblemProps} strokeLinejoin="miter" />
            <APath d="M36 64 L36 36 L64 64 L64 36" stroke={pal.text} strokeWidth={3} fill="none" strokeDasharray="100 100" animatedProps={emblemProps} strokeLinejoin="miter" />
            <Path d="M50 4 L50 9 M50 91 L50 96 M4 50 L9 50 M91 50 L96 50" stroke={pal.holo} strokeWidth={0.8} />
          </Svg>
        </View>
        <View style={{ height: 44, alignItems: 'center', marginTop: 18 }}>
          {title ? (
            <>
              <NxLabel color={pal.text} size={22} spacing={10} weight="800">
                NEXUS
              </NxLabel>
              <NxLabel color={pal.primary} size={10} spacing={6}>
                HUD · SİSTEM BAŞLATILIYOR
              </NxLabel>
            </>
          ) : null}
        </View>
        <View style={{ marginTop: 22, width: Math.min(300, width - 60), gap: 5, minHeight: 80 }}>
          {LINES.slice(0, shownLines).map(([k, v]) => (
            <View key={k} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <NxLabel color={pal.dim} size={9.5} spacing={1.5}>
                {`> ${k}`}
              </NxLabel>
              <NxLabel color={pal.secondary} size={9.5} spacing={1.5}>
                {v}
              </NxLabel>
            </View>
          ))}
        </View>
      </Pressable>
    </Animated.View>
  );
}
