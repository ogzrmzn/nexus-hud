import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';
import { BootSequence } from '@/components/nexus/BootSequence';
import { NxNumber } from '@/components/nexus/NxNumber';
import { HudButton, NxIcon, NxLabel } from '@/components/nexus/primitives';
import { GAUGE_ASPECT, Gauge } from '@/components/nexus/Gauges';
import { THEME_IDS } from '@/features/nexus/settings';
import { alpha, paletteFor, THEMES, type NexusPalette } from '@/features/nexus/themes';
import { useNexus } from '@/features/nexus/useNexus';

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

function ModeCard({
  title,
  code,
  desc,
  art,
  onPress,
  pal,
  delay,
  reduced,
}: {
  title: string;
  code: string;
  desc: string;
  art: React.ReactNode;
  onPress: () => void;
  pal: NexusPalette;
  delay: number;
  reduced: boolean;
}) {
  return (
    <Animated.View entering={reduced ? undefined : FadeInDown.delay(delay).duration(520)} style={{ flex: 1 }}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={title}
        style={({ pressed }) => ({
          flex: 1,
          minHeight: 170,
          borderWidth: 1,
          borderColor: pressed ? pal.primary : alpha(pal.primary, 0.3),
          backgroundColor: pressed ? alpha(pal.primary, 0.1) : pal.glass,
          padding: 18,
          overflow: 'hidden',
        })}
      >
        {/* pahlı köşe ve holografik kenar */}
        <View style={{ position: 'absolute', right: -14, top: -14, width: 28, height: 28, backgroundColor: pal.bg, transform: [{ rotate: '45deg' }], borderBottomWidth: 1, borderColor: pal.primary }} />
        <View style={{ position: 'absolute', left: 0, top: 18, bottom: 18, width: 2, backgroundColor: pal.holo, opacity: 0.8 }} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <NxLabel color={pal.dim} size={9} spacing={2}>
            {code}
          </NxLabel>
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 10 }}>{art}</View>
        <NxLabel color={pal.text} size={17} spacing={4} weight="800">
          {title}
        </NxLabel>
        <NxLabel color={pal.dim} size={9.5} spacing={1.2} style={{ marginTop: 6 }} numberOfLines={2}>
          {desc}
        </NxLabel>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 }}>
          <NxLabel color={pal.primary} size={10} spacing={3}>
            BAŞLAT
          </NxLabel>
          <NxIcon name="chevron-double-right" size={14} color={pal.primary} />
        </View>
      </Pressable>
    </Animated.View>
  );
}

/** Başlangıç: yalnızca iki kullanım modu, tema ve ayarlar */
export default function NexusStart() {
  const { upal: pal, pal: hudPal, theme, nx, day, update } = useNexus();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const sysReduced = useReducedMotion();
  const reduced = sysReduced || nx.motion === 'az';
  const [boot, setBoot] = useState(!booted);
  const landscape = width > height;

  const done = useCallback(() => {
    booted = true;
    setBoot(false);
  }, []);

  const artH = landscape ? Math.min(70, height * 0.16) : Math.min(80, height * 0.1);

  return (
    <View style={{ flex: 1, backgroundColor: pal.bg }}>
      <Floor width={width} height={height} pal={pal} />
      {!boot ? (
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingTop: insets.top + 14,
            paddingBottom: insets.bottom + 18,
            paddingLeft: insets.left + 20,
            paddingRight: insets.right + 20,
          }}
        >
          <Animated.View entering={reduced ? undefined : FadeIn.duration(500)} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
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
                  DİJİTAL KOKPİT SİSTEMİ · PROTOTİP
                </NxLabel>
              </View>
            </View>
          </Animated.View>

          <View style={{ flex: 1, justifyContent: 'center', paddingVertical: 22 }}>
            <Animated.View entering={reduced ? undefined : FadeIn.delay(80).duration(600)}>
              <NxLabel color={pal.primary} size={10} spacing={4}>
                {'// MOD SEÇİMİ'}
              </NxLabel>
              <NxLabel color={pal.text} size={landscape ? 20 : 24} spacing={2} weight="300" style={{ marginTop: 6, marginBottom: 18, textTransform: 'none' }} numberOfLines={2}>
                Sürüş arayüzünü seçin
              </NxLabel>
            </Animated.View>
            <View style={{ flexDirection: landscape ? 'row' : 'column', gap: 14, minHeight: landscape ? 200 : 330 }}>
              <ModeCard
                pal={pal}
                code="MOD 01 · CAM YANSIMASI"
                title="WINDSHIELD HUD"
                desc="Ön cama yansıtma · ayna görüntü · yatay · minimum bilgi"
                delay={120}
                reduced={reduced}
                onPress={() => router.push('/cam')}
                art={
                  <View style={{ alignItems: 'center' }}>
                    <Svg width={artH * 2.4} height={artH * 0.32} viewBox="0 0 240 32">
                      <Path d="M20 30 L50 2 L190 2 L220 30" stroke={alpha(pal.primary, 0.5)} strokeWidth={1.2} fill="none" />
                    </Svg>
                    <View style={{ transform: [{ scaleX: -1 }], marginTop: 4 }}>
                      <NxNumber text="88" height={artH * 0.62} color={pal.text} style={theme.glyph} weightScale={1.3} />
                    </View>
                  </View>
                }
              />
              <ModeCard
                pal={pal}
                code="MOD 02 · TELEFON EKRANI"
                title="DIGITAL COCKPIT"
                desc="Holografik hız halkası · pusula · yolculuk verileri"
                delay={220}
                reduced={reduced}
                onPress={() => router.push('/kokpit')}
                art={
                  <View style={{ width: artH * 1.25, height: artH * 1.25, alignItems: 'center', justifyContent: 'center' }}>
                    <Svg width={artH * 1.25} height={artH * 1.25} viewBox="0 0 100 100" style={{ position: 'absolute' }}>
                      <Circle cx={50} cy={50} r={44} stroke={alpha(pal.primary, 0.18)} strokeWidth={3} fill="none" />
                      <Path d="M18.9 81.1 A44 44 0 1 1 94 50" stroke={pal.primary} strokeWidth={3} fill="none" />
                      <Circle cx={50} cy={50} r={36} stroke={alpha(pal.holo, 0.5)} strokeWidth={0.8} fill="none" strokeDasharray="2 4" />
                    </Svg>
                    <NxNumber text="88" height={artH * 0.36} color={pal.text} style={theme.glyph} glow={pal.primary} />
                  </View>
                }
              />
            </View>
          </View>

          {/* Tüm temalar: canlı önizleme, dokununca seçilir */}
          <Animated.View entering={reduced ? undefined : FadeInDown.delay(300).duration(500)} style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <NxLabel color={pal.primary} size={10} spacing={4}>
                {'// TEMALAR'}
              </NxLabel>
              <Pressable onPress={() => router.push('/temalar')} hitSlop={8} accessibilityRole="button">
                <NxLabel color={pal.dim} size={9} spacing={2}>
                  TÜMÜ VE RENKLER ›
                </NxLabel>
              </Pressable>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingRight: 8 }}>
              {THEME_IDS.map((id) => {
                const t = THEMES[id];
                const tp = paletteFor(t, day, id === nx.theme ? nx.accent : null);
                const on = id === nx.theme;
                return (
                  <Pressable
                    key={id}
                    onPress={() => update({ theme: id })}
                    accessibilityRole="button"
                    accessibilityLabel={t.name}
                    accessibilityState={{ selected: on }}
                    style={{ width: 150, padding: 10, backgroundColor: tp.bg, borderWidth: on ? 2 : 1, borderColor: on ? tp.primary : alpha(tp.primary, 0.3), borderRadius: 6 }}
                  >
                    <View pointerEvents="none" style={{ alignItems: 'center', height: 104, justifyContent: 'center' }}>
                      <Gauge kind={t.gauge} speed={88} max={220} width={Math.min(128, 104 / GAUGE_ASPECT[t.gauge])} pal={tp} glyph={t.glyph} unit="KM/H" reduced />
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 }}>
                      {on ? <NxIcon name="check-decagram" size={13} color={tp.primary} /> : null}
                      <NxLabel color={on ? tp.primary : tp.text} size={10} spacing={1.5} weight="800" style={{ textTransform: 'none' }}>
                        {t.name.toUpperCase()}
                      </NxLabel>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          </Animated.View>

          <Animated.View entering={reduced ? undefined : FadeInDown.delay(360).duration(500)} style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
            <HudButton icon="tune-variant" label="AYARLAR" pal={pal} onPress={() => router.push('/ayarlar')} />
          </Animated.View>
          {nx.demo ? (
            <NxLabel color={pal.warn} size={9.5} spacing={1.5} style={{ marginTop: 12 }} numberOfLines={2}>
              ⚠ DEMO VERİSİ AÇIK — göstergeler gerçek hız göstermez
            </NxLabel>
          ) : null}
        </ScrollView>
      ) : null}
      {boot ? <BootSequence pal={hudPal} onDone={done} reduced={reduced} /> : null}
    </View>
  );
}
