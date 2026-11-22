import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HudButton, NxLabel, NxSwitch, Panel, Segmented } from '@/components/nexus/primitives';
import { DEFAULT_NEXUS, type DayNight, type WidgetKey } from '@/features/nexus/settings';
import { alpha, type NexusPalette } from '@/features/nexus/themes';
import { useNexus } from '@/features/nexus/useNexus';

const WIDGETS: [WidgetKey, string][] = [
  ['clock', 'Saat'],
  ['tripTime', 'Yolculuk süresi'],
  ['avg', 'Ortalama hız'],
  ['max', 'Maksimum hız'],
  ['distance', 'Kat edilen mesafe'],
  ['compass', 'Pusula / yön'],
  ['gps', 'GPS sinyali ve doğruluk'],
  ['weather', 'Hava durumu (internet)'],
];

function Section({ title, pal, chamfer, children }: { title: string; pal: NexusPalette; chamfer: number; children: ReactNode }) {
  return (
    <View style={{ marginTop: 22 }}>
      <NxLabel color={pal.primary} size={9.5} spacing={3} style={{ marginBottom: 10 }}>
        {`// ${title}`}
      </NxLabel>
      <Panel pal={pal} chamfer={chamfer} style={{ padding: 14, gap: 14 }}>
        {children}
      </Panel>
    </View>
  );
}

function Row({ label, hint, pal, children }: { label: string; hint?: string; pal: NexusPalette; children: ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View style={{ flex: 1 }}>
        <NxLabel color={pal.text} size={11} spacing={1.2} style={{ textTransform: 'none' }} numberOfLines={2}>
          {label}
        </NxLabel>
        {hint ? (
          <NxLabel color={pal.dim} size={9} spacing={0.5} style={{ textTransform: 'none', marginTop: 3 }} numberOfLines={3}>
            {hint}
          </NxLabel>
        ) : null}
      </View>
      {children}
    </View>
  );
}

function Field({ label, pal, children }: { label: string; pal: NexusPalette; children: ReactNode }) {
  return (
    <View style={{ gap: 8 }}>
      <NxLabel color={pal.dim} size={9.5} spacing={1.5}>
        {label}
      </NxLabel>
      {children}
    </View>
  );
}

export default function NexusSettingsScreen() {
  const { nx, pal, theme, update } = useNexus();
  const insets = useSafeAreaInsets();

  const alertOpts = nx.unit === 'mph' ? [0, 30, 50, 65, 80] : [0, 50, 90, 110, 130];

  return (
    <View style={{ flex: 1, backgroundColor: pal.bg }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 40, paddingLeft: insets.left + 20, paddingRight: insets.right + 20, maxWidth: 720, width: '100%', alignSelf: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <HudButton icon="arrow-left" pal={pal} size={36} onPress={() => router.back()} />
          <View style={{ flex: 1 }}>
            <NxLabel color={pal.primary} size={9.5} spacing={3}>
              {'// SİSTEM'}
            </NxLabel>
            <NxLabel color={pal.text} size={18} spacing={4} weight="800">
              AYARLAR
            </NxLabel>
          </View>
          <HudButton icon="palette-swatch-variant" label={theme.name.toUpperCase()} pal={pal} onPress={() => router.push('/temalar')} />
        </View>

        <Section pal={pal} chamfer={theme.chamfer} title="GÖRÜNÜM">
          <Field pal={pal} label="GÜNDÜZ / GECE">
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
          </Field>
          <Field pal={pal} label="HIZ GÖSTERGESİ BOYUTU">
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
          </Field>
          <Field pal={pal} label="ANİMASYON">
            <Segmented
              pal={pal}
              value={nx.motion}
              onChange={(v) => update({ motion: v })}
              options={[
                { value: 'tam', label: 'TAM' },
                { value: 'az', label: 'AZ · PİL TASARRUFU' },
              ]}
            />
          </Field>
        </Section>

        <Section pal={pal} chamfer={theme.chamfer} title="HIZ">
          <Field pal={pal} label="BİRİM">
            <Segmented
              pal={pal}
              value={nx.unit}
              onChange={(v) => update({ unit: v, speedAlert: 0 })}
              options={[
                { value: 'kmh', label: 'KM/H' },
                { value: 'mph', label: 'MPH' },
              ]}
            />
          </Field>
          <Field pal={pal} label="HIZ UYARISI">
            <Segmented<number>
              pal={pal}
              value={nx.speedAlert}
              onChange={(v) => update({ speedAlert: v })}
              options={alertOpts.map((v) => ({ value: v, label: v === 0 ? 'KAPALI' : String(v) }))}
            />
          </Field>
        </Section>

        <Section pal={pal} chamfer={theme.chamfer} title="WINDSHIELD HUD">
          <Row pal={pal} label="Ayna görüntü" hint="Cama yansıyan görüntü düz okunsun diye sağ-sol çevrilir">
            <NxSwitch pal={pal} value={nx.mirror} onChange={(v) => update({ mirror: v })} />
          </Row>
          <Row pal={pal} label="Ekran açık kalsın" hint="HUD ve kokpit ekranında ekran kararmaz">
            <NxSwitch pal={pal} value={nx.keepAwake} onChange={(v) => update({ keepAwake: v })} />
          </Row>
          <Field pal={pal} label="PARLAKLIK (CAM MODU)">
            <Segmented<number>
              pal={pal}
              value={nx.brightness ?? -1}
              onChange={(v) => update({ brightness: v < 0 ? null : v })}
              options={[
                { value: -1, label: 'SİSTEM' },
                { value: 0.25, label: '25' },
                { value: 0.5, label: '50' },
                { value: 0.75, label: '75' },
                { value: 1, label: '100' },
              ]}
            />
          </Field>
        </Section>

        <Section pal={pal} chamfer={theme.chamfer} title="GÖSTERİLECEK BİLGİLER">
          {WIDGETS.map(([k, label]) => (
            <Row pal={pal} key={k} label={label}>
              <NxSwitch pal={pal} value={nx.widgets[k]} onChange={(v) => update({ widgets: { ...nx.widgets, [k]: v } })} />
            </Row>
          ))}
          <NxLabel color={pal.dim} size={9} spacing={0.5} style={{ textTransform: 'none' }} numberOfLines={3}>
            Windshield HUD yalnızca hız, saat ve GPS durumunu gösterir; diğer bilgiler kokpit içindir.
          </NxLabel>
        </Section>

        <Section pal={pal} chamfer={theme.chamfer} title="DEMO">
          <Row pal={pal} label="Demo verisi" hint="GPS yokken arayüzü denemek için yapay hız üretir. Açıkken ekranlarda sürekli DEMO uyarısı görünür; gerçek hız değildir.">
            <NxSwitch pal={pal} value={nx.demo} onChange={(v) => update({ demo: v })} />
          </Row>
        </Section>

        <View style={{ marginTop: 26, alignItems: 'flex-start' }}>
          <HudButton icon="backup-restore" label="VARSAYILANLARA DÖN" pal={pal} onPress={() => update({ ...DEFAULT_NEXUS })} />
        </View>
        <View style={{ marginTop: 18, borderTopWidth: 1, borderColor: alpha(pal.dim, 0.5), paddingTop: 12 }}>
          <NxLabel color={pal.dim} size={8.5} spacing={1} style={{ textTransform: 'none' }} numberOfLines={4}>
            {'NEXUS HUD hızı telefonun GPS\'inden ölçer. GPS verisi yoksa ya da doğruluk yetersizse hız yerine "--" gösterilir. Sürüş sırasında ayarlar kilitlenir.'}
          </NxLabel>
        </View>
      </ScrollView>
    </View>
  );
}
