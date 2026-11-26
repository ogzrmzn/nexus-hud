import { router } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ALERT_MAX, ALERT_STEP, THEME_IDS, type CamLayout, type DayNight, type Orientation } from '@/features/nexus/settings';
import { ACCENTS, alpha, THEMES } from '@/features/nexus/themes';
import { isFullscreen, toggleFullscreen } from '@/features/nexus/useHudSystem';
import { useNexus } from '@/features/nexus/useNexus';
import { STATUS_TEXT, type NexusGps } from '@/features/nexus/useNexusGps';
import { unitLabel } from '@/features/nexus/format';
import { HudButton, NxIcon, NxLabel, OptionCards, Segmented, Stepper } from './primitives';

const BRIGHT_STEPS = [0.1, 0.25, 0.5, 0.75, 1];

function Section({ title, hint, children, color, hintColor }: { title: string; hint?: string; children: ReactNode; color: string; hintColor: string }) {
  return (
    <View style={{ marginTop: 18, gap: 8 }}>
      <NxLabel color={color} size={10} spacing={2.5}>
        {title}
      </NxLabel>
      {children}
      {hint ? (
        <NxLabel color={hintColor} size={9.5} spacing={0.3} numberOfLines={3} style={{ textTransform: 'none' }}>
          {hint}
        </NxLabel>
      ) : null}
    </View>
  );
}

/**
 * Sağdan açılan kontrol paneli: HUD ve kokpitten çıkmadan ekran içeriği, tema, renk, ekran yönü (kilitli),
 * cam görünümü, hız uyarısı ve parlaklık. Cam modunda aynalanmaz (araç dururken düz okunur).
 */
export function HudDrawer({ mode, open, onClose, gps }: { mode: 'cam' | 'kokpit'; open: boolean; onClose: () => void; gps?: NexusGps }) {
  const { nx, upal: pal, day, update } = useNexus();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const landscape = width > height;
  const panelW = Math.min(400, width * (landscape ? 0.5 : 0.9));
  const x = useSharedValue(1);
  const [mounted, setMounted] = useState(open);
  const [fs, setFs] = useState(isFullscreen());

  useEffect(() => {
    if (open) setMounted(true);
    x.value = withTiming(open ? 0 : 1, { duration: 260, easing: Easing.out(Easing.cubic) });
    if (!open) {
      const t = setTimeout(() => setMounted(false), 280);
      return () => clearTimeout(t);
    }
  }, [open, x]);

  const panelStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.value * (panelW + 20) }] }));
  const backStyle = useAnimatedStyle(() => ({ opacity: (1 - x.value) * 0.55 }));

  if (!mounted) return null;

  const orient: Orientation = mode === 'cam' ? nx.camOrientation : nx.cockpitOrientation;
  const setOrient = (o: Orientation) => update(mode === 'cam' ? { camOrientation: o } : { cockpitOrientation: o });
  const alertTxt = nx.speedAlert === 0 ? 'KAPALI' : `${nx.speedAlert} ${unitLabel(nx.unit)}`;
  const bIdx = nx.brightness == null ? -1 : BRIGHT_STEPS.findIndex((v) => Math.abs(v - nx.brightness!) < 0.01);
  const stepBright = (d: number) => {
    // -1 = sistem parlaklığı; ardından %10 … %100
    const i = Math.min(BRIGHT_STEPS.length - 1, Math.max(-1, bIdx + d));
    update({ brightness: i < 0 ? null : BRIGHT_STEPS[i] });
  };
  const sec = { color: pal.primary, hintColor: pal.dim };

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents={open ? 'auto' : 'none'}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#000' }, backStyle]}>
        <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityLabel="Paneli kapat" />
      </Animated.View>
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: 0,
            bottom: 0,
            right: 0,
            width: panelW + insets.right,
            backgroundColor: pal.bg,
            borderLeftWidth: 1,
            borderColor: alpha(pal.primary, 0.45),
            paddingRight: insets.right,
          },
          panelStyle,
        ]}
      >
        <View style={{ position: 'absolute', left: 0, top: 24, bottom: 24, width: 2, backgroundColor: pal.holo, opacity: 0.8 }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: insets.top + 12, paddingHorizontal: 16, paddingBottom: 8 }}>
          <View style={{ flex: 1 }}>
            <NxLabel color={pal.primary} size={9} spacing={2.5}>
              {mode === 'cam' ? '// WINDSHIELD HUD' : '// DIGITAL COCKPIT'}
            </NxLabel>
            <NxLabel color={pal.text} size={15} spacing={3} weight="800">
              KONTROL PANELİ
            </NxLabel>
          </View>
          {Platform.OS === 'web' ? (
            <HudButton
              icon={fs ? 'fullscreen-exit' : 'fullscreen'}
              pal={pal}
              size={40}
              label={undefined}
              onPress={() => toggleFullscreen(orient).then(() => setFs(isFullscreen()))}
            />
          ) : null}
          <HudButton icon="close" pal={pal} size={40} onPress={onClose} />
        </View>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 24 }}>
          {mode === 'cam' ? (
            <Section title="EKRAN" {...sec}>
              <OptionCards<CamLayout>
                pal={pal}
                value={nx.camLayout}
                onChange={(v) => update({ camLayout: v })}
                options={[
                  { value: 'hiz', label: 'HIZ', icon: 'speedometer' },
                  { value: 'saat', label: 'HIZ + SAAT', icon: 'clock-outline' },
                  { value: 'yolculuk', label: 'YOLCULUK', icon: 'map-marker-distance' },
                ]}
              />
            </Section>
          ) : null}

          <Section title="EKRAN YÖNÜ" hint="Seçtiğiniz yönde ekran kilitlenir; virajda ve yokuşta dönmez." {...sec}>
            <OptionCards<Orientation>
              pal={pal}
              value={orient}
              onChange={setOrient}
              options={[
                { value: 'yatay', label: 'YATAY', icon: 'phone-rotate-landscape' },
                { value: 'dikey', label: 'DİKEY', icon: 'phone-rotate-portrait' },
              ]}
            />
          </Section>

          {mode === 'cam' ? (
            <Section title="GÖRÜNÜM" hint="Camdaki yazı düz okunmuyorsa diğer kenar seçeneğini deneyin. Cam modunda arka plan siyahtır." {...sec}>
              <Segmented
                pal={pal}
                value={nx.mirror ? 'ters' : 'normal'}
                onChange={(v) => update({ mirror: v === 'ters' })}
                options={[
                  { value: 'normal', label: 'NORMAL' },
                  { value: 'ters', label: 'CAM (TERS)' },
                ]}
              />
              {nx.mirror ? (
                <Segmented
                  pal={pal}
                  value={nx.mirrorAxis}
                  onChange={(v) => update({ mirrorAxis: v })}
                  options={[
                    { value: 'ust', label: 'ÜST KENAR CAMA' },
                    { value: 'alt', label: 'ALT KENAR CAMA' },
                  ]}
                />
              ) : null}
            </Section>
          ) : null}

          <Section title="HIZ UYARISI" hint="Bu hızı geçince rakamlar kırmızı olur ve telefon bir kez titrer." {...sec}>
            <Stepper
              pal={pal}
              value={alertTxt}
              minusDisabled={nx.speedAlert <= 0}
              plusDisabled={nx.speedAlert >= ALERT_MAX}
              onMinus={() => update({ speedAlert: Math.max(0, nx.speedAlert - ALERT_STEP) })}
              onPlus={() => update({ speedAlert: Math.min(ALERT_MAX, nx.speedAlert + ALERT_STEP) })}
            />
          </Section>

          <Section title="TEMA" hint="Temaya dokunun; ekran hemen o temaya geçer." {...sec}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {(['windshield', ...THEME_IDS] as const).map((id) => {
                const isCam = id === 'windshield';
                const name = isCam ? 'WINDSHIELD HUD' : THEMES[id].name.toUpperCase();
                const on = isCam ? mode === 'cam' : mode === 'kokpit' && id === nx.theme;
                const c = isCam ? '#5CF4FF' : THEMES[id].night.primary;
                return (
                  <Pressable
                    key={id}
                    onPress={() => {
                      if (isCam) {
                        if (mode === 'cam') return;
                        update({ lastView: 'cam' });
                        onClose();
                        router.replace('/cam');
                        return;
                      }
                      update({ theme: id, lastView: 'kokpit' });
                      if (mode === 'cam') {
                        onClose();
                        router.replace('/kokpit');
                      }
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    style={{
                      flexBasis: '47%',
                      flexGrow: 1,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 8,
                      paddingVertical: 11,
                      paddingHorizontal: 10,
                      borderRadius: 4,
                      borderWidth: 1,
                      borderColor: on ? c : alpha(pal.primary, 0.2),
                      backgroundColor: on ? alpha(c, 0.2) : pal.glass,
                    }}
                  >
                    <View style={{ width: 10, height: 10, backgroundColor: c, transform: [{ rotate: '45deg' }] }} />
                    <View style={{ flex: 1 }}>
                      <NxLabel color={on ? c : pal.text} size={9.5} spacing={1} style={{ textTransform: 'none' }}>
                        {name}
                      </NxLabel>
                      <NxLabel color={pal.dim} size={7.5} spacing={1}>
                        {isCam ? 'CAM YANSIMASI' : 'DİJİTAL KOKPİT'}
                      </NxLabel>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </Section>

          <Section title="RENK" {...sec}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {[{ name: 'Tema', color: null as string | null }, ...ACCENTS].map((a) => {
                const on = nx.accent === a.color;
                const sw = a.color ?? THEMES[nx.theme].night.primary;
                return (
                  <Pressable
                    key={a.name}
                    onPress={() => update({ accent: a.color })}
                    accessibilityRole="button"
                    accessibilityLabel={`Renk ${a.name}`}
                    accessibilityState={{ selected: on }}
                    hitSlop={4}
                    style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: sw, borderWidth: on ? 3 : a.color ? 0 : 2, borderColor: pal.text, alignItems: 'center', justifyContent: 'center' }}
                  >
                    {a.color ? null : <NxIcon name="palette-outline" size={16} color="#000" />}
                  </Pressable>
                );
              })}
            </View>
          </Section>

          {mode === 'cam' && Platform.OS !== 'web' ? (
            <Section title="PARLAKLIK" {...sec}>
              <Stepper
                pal={pal}
                value={nx.brightness == null ? 'SİSTEM' : `%${Math.round(nx.brightness * 100)}`}
                minusDisabled={bIdx < 0}
                plusDisabled={bIdx >= BRIGHT_STEPS.length - 1}
                onMinus={() => stepBright(-1)}
                onPlus={() => stepBright(1)}
              />
            </Section>
          ) : null}

          <Section title="GÜNDÜZ / GECE" {...sec}>
            <Segmented<DayNight>
              pal={pal}
              value={nx.dayNight}
              onChange={(v) => update({ dayNight: v })}
              options={[
                { value: 'oto', label: `OTO · ${day ? 'GÜNDÜZ' : 'GECE'}` },
                { value: 'gunduz', label: 'GÜNDÜZ' },
                { value: 'gece', label: 'GECE' },
              ]}
            />
          </Section>

          <Section title="BİRİM" {...sec}>
            <Segmented
              pal={pal}
              value={nx.unit}
              onChange={(v) => update({ unit: v, speedAlert: 0 })}
              options={[
                { value: 'kmh', label: 'KM/H' },
                { value: 'mph', label: 'MPH' },
              ]}
            />
          </Section>

          {gps ? (
            <Section title="GPS TANI" hint="Hız görünmüyorsa bu bölümün ekran görüntüsünü gönderin." {...sec}>
              <View style={{ gap: 5, padding: 10, borderWidth: 1, borderColor: alpha(pal.primary, 0.25), backgroundColor: pal.glass, borderRadius: 4 }}>
                {[
                  ['DURUM', STATUS_TEXT[gps.status].title],
                  ['İZİN / SERVİS', gps.baseStatus.toUpperCase()],
                  ['DOĞRULUK', gps.accuracy == null ? 'YOK' : `±${Math.round(gps.accuracy)} M`],
                  ['CİHAZ HIZI', gps.rawSpeed == null ? 'GÖNDERİLMİYOR' : `${(gps.rawSpeed * 3.6).toFixed(1)} KM/H`],
                  ['SON VERİ', gps.lastFixAt == null ? 'HİÇ GELMEDİ' : `${Math.max(0, Math.round((gps.now - gps.lastFixAt) / 1000))} SN ÖNCE`],
                  ...(Platform.OS === 'web'
                    ? [
                        ['GÜVENLİ BAĞLANTI', typeof window !== 'undefined' && window.isSecureContext ? 'EVET' : 'HAYIR'],
                        ['TARAYICI', typeof navigator !== 'undefined' ? navigator.userAgent.replace(/^Mozilla\/5\.0 /, '').slice(0, 70) : '-'],
                      ]
                    : []),
                ].map(([k, v]) => (
                  <View key={k} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
                    <NxLabel color={pal.dim} size={8.5} spacing={1}>
                      {k}
                    </NxLabel>
                    <NxLabel color={pal.text} size={8.5} spacing={0.5} numberOfLines={2} style={{ flex: 1, textAlign: 'right', textTransform: 'none' }}>
                      {v}
                    </NxLabel>
                  </View>
                ))}
              </View>
              <HudButton icon="crosshairs-gps" label="GPS'İ YENİDEN BAŞLAT" pal={pal} onPress={gps.retry} />
            </Section>
          ) : null}

          <View style={{ marginTop: 22 }}>
            <HudButton
              icon="tune-variant"
              label="TÜM AYARLAR"
              pal={pal}
              onPress={() => {
                onClose();
                router.push('/ayarlar');
              }}
            />
          </View>
        </ScrollView>
      </Animated.View>
    </View>
  );
}
