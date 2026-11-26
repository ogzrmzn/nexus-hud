import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';
import { BootSequence } from '@/components/nexus/BootSequence';
import { NxNumber } from '@/components/nexus/NxNumber';
import { HudButton, NxIcon, NxLabel } from '@/components/nexus/primitives';
import { GAUGE_ASPECT, Gauge } from '@/components/nexus/Gauges';
import { THEME_IDS, type NexusThemeId } from '@/features/nexus/settings';
import { alpha, paletteFor, THEMES, type NexusPalette } from '@/features/nexus/themes';
import { useNexus } from '@/features/nexus/useNexus';

/** Ekranda görünen sürüm etiketi: telefonda hangi sürümün açıldığını doğrulamak için */
const APP_BUILD = 'SÜRÜM 4 · 26.11';

/** Başlatma animasyonu uygulama oturumu başına bir kez */
let booted = false;

/** Ufka uzanan perspektif zemin ızgarası (statik) */
function Floor({ width, height, pal }: { width: number; height: number; pal: NexusPalette }) {
  const h = height * 0.32;
  const lines = [];
  for (let i = -8; i <= 8; i++) lines.push(<Line key={`v${i}`} x1={width / 2 + i * width * 0.02} y1={0} x2={width / 2 + i * width * 0.22} y2={h} stroke={alpha(pal.primary, 0.12)} strokeWidth={0.6} />);
  for (let j = 1; j <= 7; j++) {
    const y = h * (j / 7) ** 1.9;
    lines.push(<Line key={`h${j}`} x1={0} y1={y} x2={width} y2={y} stroke={alpha(pal.primary, 0.05 + j * 0.016)} strokeWidth={0.6} />);
  }
  return (
    <Svg width={width} height={h} style={{ position: 'absolute', bottom: 0 }} pointerEvents="none">
      <Defs>
        <LinearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={pal.bg} stopOpacity={1} />
          <Stop offset="1" stopColor={pal.bg} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      {lines}
      <Path d={`M0 0 H${width} V${h * 0.35} H0 Z`} fill="url(#fade)" />
    </Svg>
  );
}

/** Tek tema kartı: canlı önizleme + ad + kategori. Dokununca o temayla sürüş ekranı açılır. */
function ThemeCard({
  title,
  category,
  desc,
  preview,
  bg,
  accent,
  text,
  dim,
  selected,
  onPress,
  delay,
  reduced,
  width,
}: {
  title: string;
  category: string;
  desc: string;
  preview: ReactNode;
  bg: string;
  accent: string;
  text: string;
  dim: string;
  selected: boolean;
  onPress: () => void;
  delay: number;
  reduced: boolean;
  width: number;
}) {
  return (
    <Animated.View entering={reduced ? undefined : FadeInDown.delay(delay).duration(480)} style={{ width }}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{ selected }}
        style={({ pressed }) => ({
          backgroundColor: bg,
          borderWidth: selected ? 2 : 1,
          borderColor: selected || pressed ? accent : alpha(accent, 0.35),
          borderRadius: 8,
          overflow: 'hidden',
        })}
      >
        <View pointerEvents="none" style={{ height: 190, alignItems: 'center', justifyContent: 'center' }}>
          {preview}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderTopWidth: 1, borderColor: alpha(accent, 0.25) }}>
          <View style={{ flex: 1 }}>
            <NxLabel color={accent} size={9} spacing={2}>
              {category}
            </NxLabel>
            <NxLabel color={text} size={16} spacing={3} weight="800" style={{ textTransform: 'none', marginTop: 3 }}>
              {title.toUpperCase()}
            </NxLabel>
            <NxLabel color={dim} size={9.5} spacing={0.6} numberOfLines={2} style={{ textTransform: 'none', marginTop: 4 }}>
              {desc}
            </NxLabel>
          </View>
          <View style={{ alignItems: 'center', gap: 4 }}>
            <NxIcon name={selected ? 'check-decagram' : 'chevron-double-right'} size={22} color={accent} />
            <NxLabel color={accent} size={8.5} spacing={2}>
              {selected ? 'SON' : 'BAŞLAT'}
            </NxLabel>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

/** Başlangıç: tek sayfada Windshield HUD ve tüm kokpit temaları */
export default function NexusStart() {
  const { upal: pal, pal: hudPal, wpal, nx, day, update } = useNexus();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const sysReduced = useReducedMotion();
  const enterReduced = sysReduced || nx.motion === 'az';
  const [boot, setBoot] = useState(!booted);
  const landscape = width > height;

  const done = useCallback(() => {
    booted = true;
    setBoot(false);
  }, []);

  const innerW = width - insets.left - insets.right - 40;
  const cols = landscape || innerW > 700 ? 2 : 1;
  const cardW = (innerW - (cols - 1) * 14) / cols;
  const openTheme = (id: NexusThemeId) => {
    update({ theme: id, lastView: 'kokpit' });
    router.push('/kokpit');
  };

  return (
    <View style={{ flex: 1, backgroundColor: pal.bg }}>
      <Floor width={width} height={height} pal={pal} />
      {!boot ? (
        <ScrollView
          contentContainerStyle={{
            paddingTop: insets.top + 14,
            paddingBottom: insets.bottom + 24,
            paddingLeft: insets.left + 20,
            paddingRight: insets.right + 20,
          }}
        >
          <Animated.View entering={enterReduced ? undefined : FadeIn.duration(500)} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Svg width={26} height={26} viewBox="0 0 100 100">
                <Path d="M50 6 L88 28 L88 72 L50 94 L12 72 L12 28 Z" stroke={pal.primary} strokeWidth={6} fill="none" />
                <Path d="M34 66 L34 34 L66 66 L66 34" stroke={pal.text} strokeWidth={8} fill="none" />
              </Svg>
              <View>
                <NxLabel color={pal.text} size={13} spacing={5} weight="800">
                  NEXUS HUD
                </NxLabel>
                <NxLabel color={pal.dim} size={8} spacing={2}>
                  {`DİJİTAL KOKPİT SİSTEMİ · ${APP_BUILD}`}
                </NxLabel>
              </View>
            </View>
            <HudButton icon="tune-variant" pal={pal} size={38} onPress={() => router.push('/ayarlar')} />
          </Animated.View>

          <Animated.View entering={enterReduced ? undefined : FadeIn.delay(80).duration(600)} style={{ marginTop: 24, marginBottom: 16 }}>
            <NxLabel color={pal.primary} size={10} spacing={4}>
              {'// TEMA SEÇİMİ'}
            </NxLabel>
            <NxLabel color={pal.text} size={landscape ? 20 : 24} spacing={2} weight="300" style={{ marginTop: 6, textTransform: 'none' }} numberOfLines={2}>
              Sürüş arayüzünü seçin
            </NxLabel>
          </Animated.View>
          {nx.demo ? (
            <NxLabel color={pal.warn} size={9.5} spacing={1.5} style={{ marginBottom: 12 }} numberOfLines={2}>
              ⚠ DEMO VERİSİ AÇIK — göstergeler gerçek hız göstermez
            </NxLabel>
          ) : null}

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
            <ThemeCard
              width={cardW}
              title="Windshield HUD"
              category="CAM YANSIMASI"
              desc="Ön cama yansıtma · ayna görüntü · büyük hız, minimum bilgi"
              bg="#000000"
              accent={wpal.primary}
              text={pal.text}
              dim={pal.dim}
              selected={nx.lastView === 'cam'}
              delay={100}
              reduced={enterReduced}
              onPress={() => {
                update({ lastView: 'cam' });
                router.push('/cam');
              }}
              preview={
                <View style={{ alignItems: 'center' }}>
                  <Svg width={240} height={30} viewBox="0 0 240 32">
                    <Path d="M20 30 L50 2 L190 2 L220 30" stroke={alpha(wpal.primary, 0.5)} strokeWidth={1.2} fill="none" />
                  </Svg>
                  <View style={{ transform: [{ scaleX: -1 }], marginTop: 8 }}>
                    <NxNumber text="88" height={92} color={wpal.text} style="prism" weightScale={1.35} />
                  </View>
                  <View style={{ width: 160, height: 7, marginTop: 12, backgroundColor: alpha(wpal.primary, 0.15), alignItems: 'center' }}>
                    <View style={{ width: 70, height: 7, backgroundColor: wpal.primary }} />
                  </View>
                </View>
              }
            />
            {THEME_IDS.map((id, i) => {
              const t = THEMES[id];
              const tp = id === nx.theme ? hudPal : paletteFor(t, day, null);
              const gw = Math.min(cardW - 24, 170 / GAUGE_ASPECT[t.gauge]);
              return (
                <ThemeCard
                  key={id}
                  width={cardW}
                  title={t.name}
                  category="DİJİTAL KOKPİT"
                  desc={t.tagline}
                  bg={tp.bg}
                  accent={tp.primary}
                  text={tp.text}
                  dim={alpha(tp.text, 0.65)}
                  selected={nx.lastView === 'kokpit' && nx.theme === id}
                  delay={160 + i * 60}
                  reduced={enterReduced}
                  onPress={() => openTheme(id)}
                  preview={<Gauge kind={t.gauge} speed={60} max={220} width={gw} pal={tp} glyph={t.glyph} unit="KM/H" reduced={nx.motion === 'az'} />}
                />
              );
            })}
          </View>
        </ScrollView>
      ) : null}
      {boot ? <BootSequence pal={hudPal} onDone={done} reduced={enterReduced} /> : null}
    </View>
  );
}
