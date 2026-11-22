import { router } from 'expo-router';
import { Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gauge } from '@/components/nexus/Gauges';
import { HudButton, NxIcon, NxLabel } from '@/components/nexus/primitives';
import { unitLabel } from '@/features/nexus/format';
import { THEME_IDS } from '@/features/nexus/settings';
import { ACCENTS, alpha, paletteFor, THEMES } from '@/features/nexus/themes';
import { useNexus } from '@/features/nexus/useNexus';

/** Tema seçimi: her tema kendi göstergesiyle canlı önizlenir */
export default function ThemePicker() {
  const { nx, pal, day, update } = useNexus();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const reduced = useReducedMotion() || nx.motion === 'az';
  const landscape = width > height;
  const cols = landscape ? 2 : 1;
  const cardW = (width - insets.left - insets.right - 40 - (cols - 1) * 12) / cols;
  const previewW = Math.min(170, cardW * 0.42);

  return (
    <View style={{ flex: 1, backgroundColor: pal.bg }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 30, paddingLeft: insets.left + 20, paddingRight: insets.right + 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18 }}>
          <HudButton icon="arrow-left" pal={pal} size={36} onPress={() => router.back()} />
          <View style={{ flex: 1 }}>
            <NxLabel color={pal.primary} size={9.5} spacing={3}>
              {'// GÖRSEL KİMLİK'}
            </NxLabel>
            <NxLabel color={pal.text} size={18} spacing={4} weight="800">
              TEMALAR
            </NxLabel>
          </View>
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {THEME_IDS.map((id, i) => {
            const t = THEMES[id];
            const p = paletteFor(t, day, id === nx.theme ? nx.accent : null);
            const on = id === nx.theme;
            return (
              <Animated.View key={id} entering={reduced ? undefined : FadeInDown.delay(i * 60).duration(400)} style={{ width: cardW }}>
                <Pressable
                  onPress={() => update({ theme: id })}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={t.name}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 14,
                    padding: 12,
                    backgroundColor: p.bg,
                    borderWidth: on ? 1.5 : 1,
                    borderColor: on ? p.primary : pressed ? alpha(p.primary, 0.6) : alpha(p.primary, 0.22),
                    borderRadius: t.chamfer > 14 ? 14 : 2,
                  })}
                >
                  <View pointerEvents="none" style={{ width: previewW, alignItems: 'center' }}>
                    <Gauge kind={t.gauge} speed={88} max={220} width={previewW} pal={p} glyph={t.glyph} unit={unitLabel('kmh')} reduced />
                  </View>
                  <View style={{ flex: 1 }}>
                    <NxLabel color={p.text} size={14} spacing={2.5} weight="800" style={{ textTransform: 'none' }}>
                      {t.name.toUpperCase()}
                    </NxLabel>
                    <NxLabel color={p.dim} size={9} spacing={0.8} numberOfLines={3} style={{ marginTop: 6, textTransform: 'none' }}>
                      {t.tagline}
                    </NxLabel>
                    <View style={{ flexDirection: 'row', gap: 4, marginTop: 10 }}>
                      {[p.primary, p.secondary, p.holo].map((c) => (
                        <View key={c} style={{ width: 16, height: 4, backgroundColor: c }} />
                      ))}
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 10 }}>
                      {on ? <NxIcon name="check-decagram" size={13} color={p.primary} /> : null}
                      <NxLabel color={on ? p.primary : p.dim} size={9} spacing={2}>
                        {on ? 'AKTİF' : 'ÖNİZLEME · 88'}
                      </NxLabel>
                    </View>
                  </View>
                </Pressable>
              </Animated.View>
            );
          })}
        </View>

        <NxLabel color={pal.primary} size={9.5} spacing={3} style={{ marginTop: 26, marginBottom: 10 }}>
          {'// VURGU RENGİ'}
        </NxLabel>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {[{ name: 'Tema', color: null as string | null }, ...ACCENTS].map((a) => {
            const on = nx.accent === a.color;
            const sw = a.color ?? THEMES[nx.theme].night.primary;
            return (
              <Pressable
                key={a.name}
                onPress={() => update({ accent: a.color })}
                accessibilityRole="button"
                accessibilityLabel={`Vurgu ${a.name}`}
                accessibilityState={{ selected: on }}
                style={{ alignItems: 'center', gap: 6, padding: 8, borderWidth: 1, borderColor: on ? sw : alpha(pal.dim, 0.5), minWidth: 64 }}
              >
                <View style={{ width: 26, height: 26, backgroundColor: sw, transform: [{ rotate: '45deg' }], borderWidth: a.color ? 0 : 2, borderColor: pal.text }} />
                <NxLabel color={on ? sw : pal.dim} size={8.5} spacing={1}>
                  {a.name}
                </NxLabel>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
