import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState, type ReactNode } from 'react';
import { Platform, useWindowDimensions, View, type LayoutChangeEvent } from 'react-native';
import Animated, { FadeIn, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Line } from 'react-native-svg';
import { GAUGE_ASPECT, Gauge } from '@/components/nexus/Gauges';
import { CompassDial, GpsScan, HeadingTape, SignalAlert, SignalIndicator } from '@/components/nexus/Instruments';
import { NxNumber } from '@/components/nexus/NxNumber';
import { HudDrawer } from '@/components/nexus/HudDrawer';
import { DataCell, HudButton, NxIcon, NxLabel, Panel } from '@/components/nexus/primitives';
import { avgKmh } from '@/features/nexus/trip';
import { clockDuration, clockText, distanceText, distUnitLabel, gaugeMax, headingLabel, toUnit, unitLabel } from '@/features/nexus/format';
import { alpha, type NexusPalette } from '@/features/nexus/themes';
import { useHudSystem } from '@/features/nexus/useHudSystem';
import { useNexus } from '@/features/nexus/useNexus';
import { STATUS_TEXT, useNexusGps } from '@/features/nexus/useNexusGps';
import { useNexusWeather } from '@/features/nexus/useNexusWeather';

const LOCK_KMH = 10;

/** Kabının içine sığan, ölçüsünü kendisi alan alan */
function Fit({ children, style }: { children: (w: number, h: number) => ReactNode; style?: object }) {
  const [s, setS] = useState({ w: 0, h: 0 });
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (Math.abs(width - s.w) > 1 || Math.abs(height - s.h) > 1) setS({ w: width, h: height });
  };
  return (
    <View style={[{ flex: 1, alignItems: 'center', justifyContent: 'center' }, style]} onLayout={onLayout}>
      {s.w > 0 && s.h > 0 ? children(s.w, s.h) : null}
    </View>
  );
}

/** Statik arka plan çizgileri (tek SVG, animasyonsuz) */
function Backdrop({ pal, width, height }: { pal: NexusPalette; width: number; height: number }) {
  const lines = [];
  const step = 46;
  for (let x = step; x < width; x += step) lines.push(<Line key={`x${x}`} x1={x} y1={0} x2={x} y2={height} stroke={alpha(pal.primary, 0.035)} strokeWidth={1} />);
  for (let y = step; y < height; y += step) lines.push(<Line key={`y${y}`} x1={0} y1={y} x2={width} y2={y} stroke={alpha(pal.primary, 0.035)} strokeWidth={1} />);
  return (
    <Svg width={width} height={height} style={{ position: 'absolute' }} pointerEvents="none">
      {lines}
    </Svg>
  );
}

/**
 * MOD 2 — DIGITAL COCKPIT
 * Telefonun kendi ekranında tam veri. Tema; göstergenin geometrisini, veri yerleşimini ve pusula biçimini belirler.
 */
export default function Cockpit() {
  const { nx, theme, pal } = useNexus();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const sysReduced = useReducedMotion();
  const reduced = sysReduced || nx.motion === 'az';
  const w = nx.widgets;
  const gps = useNexusGps({ demo: nx.demo, compass: w.compass });
  const weather = useNexusWeather(w.weather, gps.trip.last?.lat ?? null, gps.trip.last?.lon ?? null);
  useHudSystem({ keepAwake: nx.keepAwake, orientation: nx.cockpitOrientation });
  const [drawer, setDrawer] = useState(false);

  const landscape = width > height;
  const contentW = width - insets.left - insets.right - 32;
  const unitL = unitLabel(nx.unit);
  const speed = gps.speedKmh == null ? null : toUnit(gps.speedKmh, nx.unit);
  const over = nx.speedAlert > 0 && speed != null && Math.round(speed) > nx.speedAlert;
  const moving = (gps.speedKmh ?? 0) > LOCK_KMH;
  const st = STATUS_TEXT[gps.status];
  const fixed = gps.lastFixAt != null;
  const elapsed = gps.now - gps.trip.startedAt;

  // Hız uyarısı: ekran kenarı 3 kez parlar + titreşim
  const edge = useSharedValue(0);
  useEffect(() => {
    if (!over) {
      edge.value = withTiming(0, { duration: 200 });
      return;
    }
    edge.value = withSequence(withRepeat(withSequence(withTiming(1, { duration: 240 }), withTiming(0.2, { duration: 240 })), 3, false), withTiming(0.6, { duration: 200 }));
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
  }, [over, edge]);
  const edgeStyle = useAnimatedStyle(() => ({ opacity: edge.value }));

  const cellSize = Math.max(18, Math.min(34, Math.min(width, height) * 0.058));
  const cells = [
    w.tripTime && { k: 'sure', label: 'SÜRE', value: fixed ? clockDuration(elapsed) : '--', icon: 'timer-outline' },
    w.avg && { k: 'ort', label: 'ORT. HIZ', value: fixed ? String(Math.round(toUnit(avgKmh(gps.trip), nx.unit))) : '--', unit: unitL, icon: 'chart-bell-curve-cumulative' },
    w.max && { k: 'maks', label: 'MAKS', value: fixed ? String(Math.round(toUnit(gps.maxKmh, nx.unit))) : '--', unit: unitL, icon: 'arrow-collapse-up' },
    w.distance && { k: 'mesafe', label: 'MESAFE', value: fixed ? distanceText(gps.trip.distanceM, nx.unit) : '--', unit: distUnitLabel(nx.unit), icon: 'map-marker-distance' },
  ].filter(Boolean) as { k: string; label: string; value: string; unit?: string; icon: string }[];

  const cell = (c: (typeof cells)[number], size = cellSize, align: 'flex-start' | 'center' | 'flex-end' = 'flex-start') => (
    <DataCell key={c.k} label={c.label} value={c.value} unit={c.unit} pal={pal} glyph={theme.glyph === 'hairline' ? 'hairline' : 'mono'} size={size} align={align} icon={c.icon} />
  );

  // Gösterge ortası: bağlantı durumuna göre
  const centerFor = (gw: number): ReactNode => {
    if (gps.status === 'izin' || gps.status === 'araniyor') return <GpsScan size={gw * 0.34} pal={pal} title={st.title} detail={st.detail} reduced={reduced} />;
    if (gps.status === 'reddedildi' || gps.status === 'servis-kapali')
      return (
        <View style={{ alignItems: 'center', gap: 10, maxWidth: gw * 0.6 }}>
          <NxIcon name="crosshairs-off" size={gw * 0.09} color={pal.warn} />
          <NxLabel color={pal.warn} size={13} spacing={3}>
            {st.title}
          </NxLabel>
          <NxLabel color={pal.dim} size={9.5} spacing={1} numberOfLines={3} style={{ textAlign: 'center' }}>
            {st.detail}
          </NxLabel>
          <HudButton icon="crosshairs-gps" pal={pal} label={gps.status === 'reddedildi' ? 'İZİN VER' : 'TEKRAR DENE'} active onPress={gps.retry} />
        </View>
      );
    return undefined;
  };

  const gauge = (aw: number, ah: number) => {
    const gw = Math.min(aw, ah / GAUGE_ASPECT[theme.gauge]) * nx.gaugeScale * 0.97;
    return <Gauge kind={theme.gauge} speed={speed} max={gaugeMax(nx.unit)} width={gw} pal={pal} glyph={theme.glyph} unit={unitL} over={over} reduced={reduced} center={centerFor(gw)} />;
  };

  const tape = (tw: number) => (w.compass ? <HeadingTape heading={gps.heading} width={tw} pal={pal} reduced={reduced} /> : null);
  const dial = (size: number) => (w.compass ? <CompassDial heading={gps.heading} size={size} pal={pal} glyph={theme.glyph} reduced={reduced} /> : null);

  // ----- Tema yerleşimleri -----
  let body: ReactNode;
  switch (theme.layout) {
    case 'grid': {
      // Cyber Core: çekirdek + terminal ızgarası
      const grid = (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {cells.map((c) => (
            <Panel key={c.k} pal={pal} chamfer={0} style={{ flexBasis: '47%', flexGrow: 1, padding: 10 }}>
              {cell(c)}
            </Panel>
          ))}
          {w.compass ? (
            <Panel pal={pal} chamfer={0} style={{ flexBasis: '100%', padding: 8, alignItems: 'center' }}>
              {dial(Math.min(120, cellSize * 4))}
            </Panel>
          ) : null}
        </View>
      );
      body = landscape ? (
        <View style={{ flex: 1, flexDirection: 'row', gap: 16 }}>
          <Fit>{gauge}</Fit>
          <View style={{ width: '38%', justifyContent: 'center' }}>{grid}</View>
        </View>
      ) : (
        <View style={{ flex: 1, gap: 12 }}>
          <Fit>{gauge}</Fit>
          {grid}
        </View>
      );
      break;
    }
    case 'columns': {
      // Quantum: simetrik iki sütun, ortada yörünge
      const half = Math.ceil(cells.length / 2);
      const left = cells.slice(0, half);
      const right = cells.slice(half);
      const col = (list: typeof cells, align: 'flex-start' | 'flex-end') => (
        <View style={{ justifyContent: 'center', gap: 22, alignItems: align, minWidth: 90 }}>{list.map((c) => cell(c, cellSize, align))}</View>
      );
      body = landscape ? (
        <View style={{ flex: 1, flexDirection: 'row', gap: 12 }}>
          {col(left, 'flex-start')}
          <View style={{ flex: 1 }}>
            <Fit>{gauge}</Fit>
          </View>
          <View style={{ justifyContent: 'center', alignItems: 'flex-end', gap: 22 }}>
            {right.map((c) => cell(c, cellSize, 'flex-end'))}
            {dial(Math.min(96, height * 0.24))}
          </View>
        </View>
      ) : (
        <View style={{ flex: 1, gap: 14 }}>
          <Fit>{gauge}</Fit>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            {col(left, 'flex-start')}
            {dial(Math.min(110, width * 0.27))}
            {col(right, 'flex-end')}
          </View>
        </View>
      );
      break;
    }
    case 'strip': {
      // Dark Matter: neredeyse boş ekran, tek satır veri
      const items = [...cells];
      body = (
        <View style={{ flex: 1, gap: 14 }}>
          <Fit>{gauge}</Fit>
          <View style={{ flexDirection: 'row', justifyContent: 'space-around', flexWrap: 'wrap', rowGap: 12, borderTopWidth: 1, borderColor: alpha(pal.dim, 0.6), paddingTop: 12 }}>
            {items.map((c) => cell(c, cellSize * 0.8, 'center'))}
            {w.compass ? (
              <DataCell
                label="YÖN"
                value={gps.heading == null ? '---' : String(Math.round(gps.heading) % 360).padStart(3, '0')}
                unit={headingLabel(gps.heading)}
                pal={pal}
                glyph="mono"
                size={cellSize * 0.8}
                align="center"
                icon="compass-outline"
              />
            ) : null}
          </View>
        </View>
      );
      break;
    }
    case 'band': {
      // Hyperdrive: üstte eğik HUD bandı, altında warp
      body = (
        <View style={{ flex: 1, gap: 6 }}>
          <View style={{ transform: [{ skewX: '-12deg' }], borderWidth: 1, borderColor: alpha(pal.holo, 0.6), backgroundColor: pal.glass, paddingVertical: 10, paddingHorizontal: 18, marginHorizontal: 10 }}>
            <View style={{ transform: [{ skewX: '12deg' }], flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', rowGap: 8 }}>
              {cells.map((c) => cell(c, cellSize * 0.82))}
            </View>
          </View>
          <View style={{ alignItems: 'center' }}>{tape(Math.min(contentW, 520))}</View>
          <Fit>{gauge}</Fit>
        </View>
      );
      break;
    }
    default: {
      // NEXUS Original: üstte yön şeridi, yanda veri rayı
      const rail = (vertical: boolean) => (
        <View style={vertical ? { justifyContent: 'center', gap: 16 } : { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {cells.map((c) => (
            <Panel key={c.k} pal={pal} chamfer={theme.chamfer} accent={pal.primary} style={vertical ? { paddingVertical: 10, paddingHorizontal: 14 } : { flexBasis: '47%', flexGrow: 1, padding: 12 }}>
              {cell(c)}
            </Panel>
          ))}
        </View>
      );
      body = landscape ? (
        <View style={{ flex: 1, flexDirection: 'row', gap: 18 }}>
          <View style={{ flex: 1 }}>
            <View style={{ alignItems: 'center' }}>{tape(Math.min(contentW * 0.6, 460))}</View>
            <Fit>{gauge}</Fit>
          </View>
          <View style={{ width: '27%', justifyContent: 'center' }}>{rail(true)}</View>
        </View>
      ) : (
        <View style={{ flex: 1, gap: 10 }}>
          <View style={{ alignItems: 'center' }}>{tape(contentW)}</View>
          <Fit>{gauge}</Fit>
          {rail(false)}
        </View>
      );
    }
  }

  const alert =
    gps.status === 'kayip' || gps.status === 'zayif' ? (
      <SignalAlert pal={pal} title={st.title} detail={gps.status === 'kayip' && gps.lastFixAt ? `Son veri ${Math.round((gps.now - gps.lastFixAt) / 1000)} sn önce · hız gösterilmiyor` : st.detail} reduced={reduced} />
    ) : gps.status === 'demo' ? (
      <SignalAlert pal={pal} title="DEMO VERİSİ" detail="Göstergeler gerçek hız değil · Ayarlar'dan kapatın" reduced />
    ) : null;

  return (
    <View style={{ flex: 1, backgroundColor: pal.bg }}>
      <StatusBar hidden />
      <Backdrop pal={pal} width={width} height={height} />
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, borderWidth: 3, borderColor: pal.danger }, edgeStyle]} />
      <Animated.View
        entering={reduced ? undefined : FadeIn.duration(450)}
        style={{ flex: 1, paddingTop: insets.top + 10, paddingBottom: insets.bottom + 10, paddingLeft: insets.left + 16, paddingRight: insets.right + 16 }}
      >
        {/* Üst şerit */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 40 }}>
          <HudButton icon="arrow-left" pal={pal} size={36} onPress={() => router.back()} label={undefined} />
          {w.gps ? <SignalIndicator status={gps.status} accuracy={gps.accuracy} pal={pal} /> : null}
          <View style={{ flex: 1, alignItems: 'center' }}>{w.clock ? <NxNumber text={clockText(new Date(gps.now))} height={Math.max(16, cellSize * 0.75)} color={pal.text} style={theme.glyph === 'hairline' ? 'hairline' : 'mono'} /> : null}</View>
          {weather ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <NxIcon name={weather.icon} size={16} color={pal.secondary} />
              <NxLabel color={pal.text} size={11} spacing={1}>
                {`${weather.temp}°`}
              </NxLabel>
            </View>
          ) : null}
          {moving ? null : <HudButton icon="restart" pal={pal} size={36} onPress={gps.resetTrip} />}
          <HudButton icon="menu" pal={pal} size={36} label="PANEL" active onPress={() => setDrawer(true)} />
        </View>
        {alert ? <View style={{ marginTop: 8, alignItems: 'center' }}>{alert}</View> : null}
        <View style={{ flex: 1, marginTop: 8 }}>{body}</View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6, gap: 12 }}>
          <NxLabel color={alpha(pal.dim, 0.9)} size={8} spacing={1.6} style={{ textTransform: 'none' }}>
            {`// ${theme.name.toUpperCase()}`}
          </NxLabel>
          <NxLabel color={alpha(pal.dim, 0.9)} size={8} spacing={1.6}>
            DIGITAL COCKPIT
          </NxLabel>
        </View>
      </Animated.View>
      <HudDrawer mode="kokpit" open={drawer} onClose={() => setDrawer(false)} />
    </View>
  );
}
