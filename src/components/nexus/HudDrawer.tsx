import { router } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { unitLabel } from '@/features/nexus/format';
import { ALERT_MAX, ALERT_STEP, DEFAULT_NEXUS, THEME_IDS, type DayNight, type Orientation, type WidgetKey } from '@/features/nexus/settings';
import { ACCENTS, alpha, THEMES, type NexusPalette } from '@/features/nexus/themes';
import { isFullscreen, toggleFullscreen } from '@/features/nexus/useHudSystem';
import { useNexus } from '@/features/nexus/useNexus';
import { HudButton, NxIcon, NxLabel, NxSwitch, OptionCards, Segmented, Stepper } from './primitives';

const BRIGHT_STEPS = [0.1, 0.25, 0.5, 0.75, 1];

const WIDGETS: [WidgetKey, string][] = [
  ['clock', 'Saat'],
  ['tripTime', 'Yolculuk süresi'],
  ['distance', 'Kat edilen mesafe'],
  ['avg', 'Ortalama hız (kokpit)'],
  ['max', 'Maksimum hız (kokpit)'],
  ['compass', 'Pusula / yön (kokpit)'],
  ['gps', 'GPS sinyali'],
  ['weather', 'Hava durumu (kokpit, internet)'],
];

/**
 * Web'de tarayıcı ekran parlaklığını değiştiremez: seçilen parlaklık, ekranın üstüne binen siyah bir
 * katmanla (yazılımsal karartma) uygulanır. Telefon uygulamasında gerçek parlaklık kullanılır.
 */
export function DimOverlay({ brightness }: { brightness: number | null }) {
  if (Platform.OS !== 'web' || brightness == null || brightness >= 1) return null;
  return <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: '#000', opacity: (1 - brightness) * 0.85 }]} />;
}

function Section({ title, hint, children, pal }: { title: string; hint?: string; children: ReactNode; pal: NexusPalette }) {
  return (
    <View style={{ marginTop: 20, gap: 8 }}>
      <NxLabel color={pal.primary} size={10} spacing={2.5}>
        {title}
      </NxLabel>
      {children}
      {hint ? (
        <NxLabel color={pal.dim} size={9.5} spacing={0.3} numberOfLines={3} style={{ textTransform: 'none' }}>
          {hint}
        </NxLabel>
      ) : null}
    </View>
  );
}

function SwitchRow({ label, hint, value, onChange, pal }: { label: string; hint?: string; value: boolean; onChange: (v: boolean) => void; pal: NexusPalette }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 }}>
      <View style={{ flex: 1 }}>
        <NxLabel color={pal.text} size={11} spacing={0.8} style={{ textTransform: 'none' }} numberOfLines={2}>
          {label}
        </NxLabel>
        {hint ? (
          <NxLabel color={pal.dim} size={9} spacing={0.3} style={{ textTransform: 'none', marginTop: 2 }} numberOfLines={3}>
            {hint}
          </NxLabel>
        ) : null}
      </View>
      <NxSwitch pal={pal} value={value} onChange={onChange} />
    </View>
  );
}

/**
 * Tüm ayarlar tek yerde: sağdan açılan panel ve Ayarlar sayfası aynı içeriği kullanır.
 * mode: hangi HUD ekranından açıldığı (tema seçimi o ekrana geçiş yapar); yoksa Ayarlar sayfası.
 */
export function ControlContent({ mode, onNavigate }: { mode?: 'cam' | 'kokpit'; onNavigate?: () => void }) {
  const { nx, upal: pal, day, update } = useNexus();
  const web = Platform.OS === 'web';
  const alertTxt = nx.speedAlert === 0 ? 'KAPALI' : `${nx.speedAlert} ${unitLabel(nx.unit)}`;
  const bIdx = nx.brightness == null ? -1 : BRIGHT_STEPS.findIndex((v) => Math.abs(v - nx.brightness!) < 0.01);
  const stepBright = (d: number) => {
    // -1 = sistem parlaklığı; ardından %10 … %100
    const cur = bIdx < 0 && nx.brightness != null ? BRIGHT_STEPS.length - 1 : bIdx;
    const i = Math.min(BRIGHT_STEPS.length - 1, Math.max(-1, cur + d));
    update({ brightness: i < 0 ? null : BRIGHT_STEPS[i] });
  };
  const brightTxt = nx.brightness == null ? (web ? 'KARARTMA YOK' : 'SİSTEM') : `%${Math.round(nx.brightness * 100)}`;
  const orientRow = (label: string, value: Orientation, set: (o: Orientation) => void) => (
    <View style={{ gap: 6 }}>
      {label ? (
        <NxLabel color={pal.dim} size={9} spacing={1.5}>
          {label}
        </NxLabel>
      ) : null}
      <OptionCards<Orientation>
        pal={pal}
        value={value}
        onChange={set}
        options={[
          { value: 'yatay', label: 'YATAY', icon: 'phone-rotate-landscape' },
          { value: 'dikey', label: 'DİKEY', icon: 'phone-rotate-portrait' },
        ]}
      />
    </View>
  );

  const mirrorRow = (label: string, value: 'normal' | 'ust' | 'alt', set: (v: 'normal' | 'ust' | 'alt') => void) => (
    <View style={{ gap: 6 }}>
      {label ? (
        <NxLabel color={pal.dim} size={9} spacing={1.5}>
          {label}
        </NxLabel>
      ) : null}
      <Segmented
        pal={pal}
        value={value}
        onChange={set}
        options={[
          { value: 'normal', label: 'NORMAL' },
          { value: 'ust', label: 'ÜST KENAR CAMA' },
          { value: 'alt', label: 'ALT KENAR CAMA' },
        ]}
      />
    </View>
  );

  return (
    <>
      <Section title="TEMA" hint={mode ? 'Temaya dokunun; ekran hemen o temaya geçer.' : undefined} pal={pal}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {(['windshield', ...THEME_IDS] as const).map((id) => {
            const isCam = id === 'windshield';
            const name = isCam ? 'WINDSHIELD HUD' : THEMES[id].name.toUpperCase();
            const view = mode ?? nx.lastView;
            const on = isCam ? view === 'cam' : view === 'kokpit' && id === nx.theme;
            const c = isCam ? '#5CF4FF' : THEMES[id].night.primary;
            return (
              <Pressable
                key={id}
                onPress={() => {
                  if (isCam) {
                    update({ lastView: 'cam' });
                    if (mode === 'kokpit') {
                      onNavigate?.();
                      router.replace('/cam');
                    }
                    return;
                  }
                  update({ theme: id, lastView: 'kokpit' });
                  if (mode === 'cam') {
                    onNavigate?.();
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

      <Section title="ANİMASYON" hint="Kapalıyken akan ve dönen illüzyonlar durur (pil tasarrufu); hız göstergesi çalışmaya devam eder." pal={pal}>
        <Segmented
          pal={pal}
          value={nx.motion}
          onChange={(v) => update({ motion: v })}
          options={[
            { value: 'tam', label: 'AÇIK' },
            { value: 'az', label: 'KAPALI' },
          ]}
        />
      </Section>

      <Section
        title="CAMA YANSIT"
        hint="Telefonu cama yakın yatırın. Camdaki yazı düz okunmuyorsa diğer kenar seçeneğini deneyin."
        pal={pal}
      >
        {mode === 'cam' || !mode
          ? mirrorRow(mode ? '' : 'WINDSHIELD HUD', nx.mirror ? nx.mirrorAxis : 'normal', (v) => update(v === 'normal' ? { mirror: false } : { mirror: true, mirrorAxis: v }))
          : null}
        {mode === 'kokpit' || !mode
          ? mirrorRow(mode ? '' : 'DİJİTAL KOKPİT', nx.cockpitMirror ? nx.mirrorAxis : 'normal', (v) =>
              update(v === 'normal' ? { cockpitMirror: false } : { cockpitMirror: true, mirrorAxis: v }),
            )
          : null}
      </Section>

      <Section
        title="EKRAN YÖNÜ"
        hint={web ? 'Tarayıcıda yön kilidi yalnızca tam ekranda çalışır (paneldeki tam ekran düğmesi).' : 'Seçtiğiniz yönde ekran kilitlenir; virajda ve yokuşta dönmez.'}
        pal={pal}
      >
        {mode === 'cam' || !mode ? orientRow(mode ? '' : 'WINDSHIELD HUD', nx.camOrientation, (o) => update({ camOrientation: o })) : null}
        {mode === 'kokpit' || !mode ? orientRow(mode ? '' : 'DİJİTAL KOKPİT', nx.cockpitOrientation, (o) => update({ cockpitOrientation: o })) : null}
      </Section>

      <Section title="HIZ UYARISI" hint="Bu hızı geçince rakamlar kırmızı olur ve telefon bir kez titrer." pal={pal}>
        <Stepper
          pal={pal}
          value={alertTxt}
          minusDisabled={nx.speedAlert <= 0}
          plusDisabled={nx.speedAlert >= ALERT_MAX}
          onMinus={() => update({ speedAlert: Math.max(0, nx.speedAlert - ALERT_STEP) })}
          onPlus={() => update({ speedAlert: Math.min(ALERT_MAX, nx.speedAlert + ALERT_STEP) })}
        />
      </Section>

      <Section
        title="PARLAKLIK"
        hint={
          web
            ? 'Tarayıcı ekran parlaklığını değiştiremez; HUD ekranı seçtiğiniz oranda karartılır. Gece camdaki parlamayı azaltır.'
            : 'HUD ekranındayken uygulanır; çıkınca sistem parlaklığına döner.'
        }
        pal={pal}
      >
        <Stepper
          pal={pal}
          value={brightTxt}
          minusDisabled={nx.brightness == null}
          plusDisabled={nx.brightness != null && nx.brightness >= 1}
          onMinus={() => stepBright(-1)}
          onPlus={() => stepBright(1)}
        />
      </Section>

      <Section
        title="GÜNDÜZ / GECE"
        hint={`Gündüz: parlak, yüksek kontrast. Gece: kısık, göz yormayan renkler. Oto: 07:00–19:00 gündüz (şu an ${day ? 'gündüz' : 'gece'}).`}
        pal={pal}
      >
        <Segmented<DayNight>
          pal={pal}
          value={nx.dayNight}
          onChange={(v) => update({ dayNight: v })}
          options={[
            { value: 'oto', label: 'OTO' },
            { value: 'gunduz', label: 'GÜNDÜZ' },
            { value: 'gece', label: 'GECE' },
          ]}
        />
      </Section>

      <Section title="RENK" pal={pal}>
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
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 19,
                  backgroundColor: sw,
                  borderWidth: on ? 3 : a.color ? 0 : 2,
                  borderColor: pal.text,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {a.color ? null : <NxIcon name="palette-outline" size={16} color="#000" />}
              </Pressable>
            );
          })}
        </View>
      </Section>

      <Section title="HIZ GÖSTERGESİ BOYUTU" pal={pal}>
        <Segmented<number>
          pal={pal}
          value={nx.gaugeScale}
          onChange={(v) => update({ gaugeScale: v })}
          options={[
            { value: 0.8, label: 'S' },
            { value: 0.9, label: 'M' },
            { value: 1, label: 'L' },
            { value: 1.15, label: 'XL' },
          ]}
        />
      </Section>

      <Section title="BİRİM" pal={pal}>
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

      <Section title="GÖSTERİLECEK BİLGİLER" hint="Windshield HUD'da saat üstte, süre ve mesafe altta görünür; diğerleri kokpit içindir." pal={pal}>
        {WIDGETS.map(([k, label]) => (
          <SwitchRow key={k} label={label} pal={pal} value={nx.widgets[k]} onChange={(v) => update({ widgets: { ...nx.widgets, [k]: v } })} />
        ))}
      </Section>

      <Section title="DİĞER" pal={pal}>
        <SwitchRow label="Ekran açık kalsın" hint="HUD ekranındayken ekran kararmaz" pal={pal} value={nx.keepAwake} onChange={(v) => update({ keepAwake: v })} />
        <SwitchRow
          label="Demo verisi"
          hint="GPS yokken arayüzü denemek için yapay hız üretir. Açıkken ekranda sürekli DEMO uyarısı görünür; gerçek hız değildir."
          pal={pal}
          value={nx.demo}
          onChange={(v) => update({ demo: v })}
        />
      </Section>

      <View style={{ marginTop: 24, alignItems: 'flex-start' }}>
        <HudButton icon="backup-restore" label="VARSAYILANLARA DÖN" pal={pal} onPress={() => update({ ...DEFAULT_NEXUS, lastView: nx.lastView })} />
      </View>
    </>
  );
}

/** Sağdan açılan kontrol paneli: HUD ve kokpitten çıkmadan tüm ayarlar. Cam modunda aynalanmaz. */
export function HudDrawer({ mode, open, onClose }: { mode: 'cam' | 'kokpit'; open: boolean; onClose: () => void }) {
  const { nx, upal: pal } = useNexus();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const landscape = width > height;
  const panelW = Math.min(420, width * (landscape ? 0.55 : 0.92));
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
  // Arka plan yalnızca hafifçe kararır: panel açıkken yapılan değişiklikler arkada görünür
  const backStyle = useAnimatedStyle(() => ({ opacity: (1 - x.value) * 0.12 }));

  if (!mounted) return null;
  const orient: Orientation = mode === 'cam' ? nx.camOrientation : nx.cockpitOrientation;

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
            // Yarı saydam cam panel
            backgroundColor: alpha(pal.bg, 0.8),
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
            <HudButton icon={fs ? 'fullscreen-exit' : 'fullscreen'} pal={pal} size={40} onPress={() => toggleFullscreen(orient).then(() => setFs(isFullscreen()))} />
          ) : null}
          <HudButton icon="close" pal={pal} size={40} onPress={onClose} label={undefined} />
        </View>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 28 }}>
          <ControlContent mode={mode} onNavigate={onClose} />
        </ScrollView>
      </Animated.View>
    </View>
  );
}
