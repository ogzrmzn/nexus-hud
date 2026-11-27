import * as Haptics from 'expo-haptics';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Platform, useWindowDimensions, View, type LayoutChangeEvent } from 'react-native';
import Animated, { FadeIn, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Line } from 'react-native-svg';
import { GAUGE_ASPECT, Gauge } from '@/components/nexus/Gauges';
import { CompassDial, GpsScan, SignalAlert } from '@/components/nexus/Instruments';
import { DimOverlay, HudDrawer } from '@/components/nexus/HudDrawer';
import { HudHeader } from '@/components/nexus/HudHeader';
import { LiveElapsedCell } from '@/components/nexus/Live';
import { DataCell, HudButton, NxIcon, NxLabel } from '@/components/nexus/primitives';
import { avgKmh } from '@/features/nexus/trip';
import { distanceText, distUnitLabel, gaugeMax, toUnit, unitLabel } from '@/features/nexus/format';
import { alpha, type NexusPalette } from '@/features/nexus/themes';
import { useHudSystem } from '@/features/nexus/useHudSystem';
import { useNexus, useRememberPosition } from '@/features/nexus/useNexus';
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
  const { nx, theme, pal, brightness } = useNexus();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const sysReduced = useReducedMotion();
  // İllüzyonlar yalnızca uygulamadaki "az animasyon" ayarıyla durur; giriş geçişleri sistem tercihine de uyar
  const reduced = nx.motion === 'az';
  const enterReduced = sysReduced || reduced;
  const w = nx.widgets;
  const gps = useNexusGps({ demo: nx.demo, compass: w.compass });
  const weather = useNexusWeather(w.weather, gps.trip.last?.lat ?? null, gps.trip.last?.lon ?? null);
  useHudSystem({ keepAwake: nx.keepAwake, brightness, orientation: nx.cockpitOrientation });
  useRememberPosition(nx.demo ? null : gps.trip.last);
  const [drawer, setDrawer] = useState(false);

  const landscape = width > height;
  const unitL = unitLabel(nx.unit);
  const speed = gps.speedKmh == null ? null : toUnit(gps.speedKmh, nx.unit);
  const over = nx.speedAlert > 0 && speed != null && Math.round(speed) > nx.speedAlert;
  const moving = (gps.speedKmh ?? 0) > LOCK_KMH;
  const st = STATUS_TEXT[gps.status];
  const fixed = gps.lastFixAt != null;

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
    w.tripTime && { k: 'sure', label: 'SÜRE', value: '', icon: 'timer-outline' },
    w.avg && { k: 'ort', label: 'ORT. HIZ', value: fixed ? String(Math.round(toUnit(avgKmh(gps.trip), nx.unit))) : '--', unit: unitL, icon: 'chart-bell-curve-cumulative' },
    w.max && { k: 'maks', label: 'MAKS', value: fixed ? String(Math.round(toUnit(gps.maxKmh, nx.unit))) : '--', unit: unitL, icon: 'arrow-collapse-up' },
    w.distance && { k: 'mesafe', label: 'MESAFE', value: fixed ? distanceText(gps.trip.distanceM, nx.unit) : '--', unit: distUnitLabel(nx.unit), icon: 'map-marker-distance' },
  ].filter(Boolean) as { k: string; label: string; value: string; unit?: string; icon: string }[];

  const cell = (c: (typeof cells)[number], size = cellSize, align: 'flex-start' | 'center' | 'flex-end' = 'flex-start') =>
    // Süre kendi zamanlayıcısıyla güncellenir; ekranın geri kalanı her saniye yeniden çizilmez
    c.k === 'sure' ? (
      <LiveElapsedCell key="sure" startedAt={gps.trip.startedAt} active={fixed} pal={pal} glyph={theme.glyph === 'hairline' ? 'hairline' : 'mono'} size={size} align={align} />
    ) : (
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

  // Hız rakamı rengi temadan ayrı seçilir (varsayılan beyaz)
  // useMemo: gösterge her GPS güncellemesinde boşuna yeniden çizilmesin
  const speedPal = useMemo(() => ({ ...pal, text: nx.speedColor ?? pal.primary }), [pal, nx.speedColor]);
  const gauge = (aw: number, ah: number) => {
    const gw = Math.min(aw, ah / GAUGE_ASPECT[theme.gauge]) * nx.gaugeScale * 0.97;
    return <Gauge kind={theme.gauge} speed={speed} max={gaugeMax(nx.unit)} width={gw} pal={speedPal} glyph={theme.glyph} unit={unitL} over={over} reduced={reduced} center={centerFor(gw)} />;
  };

  const dial = (size: number) => (w.compass ? <CompassDial heading={gps.heading} size={size} pal={pal} glyph={theme.glyph} reduced={reduced} /> : null);

  // ----- Tema yerleşimleri -----
  // Tüm temalarda aynı düzen (Quantum yerleşimi): hız ortada ve olabildiğince büyük,
  // süre + mesafe solda, ortalama + maksimum hız ve pusula sağda
  const pick = (keys: string[]) => cells.filter((c) => keys.includes(c.k));
  const left = pick(['sure', 'mesafe']);
  const right = pick(['ort', 'maks']);
  // Sol ve sağ sütun her zaman aynı genişlikte: gösterge ekranın tam ortasında kalır.
  // Hiç bilgi gösterilmiyorsa sütunlar kalkar ve gösterge tüm genişliği kullanır.
  const hasSide = left.length > 0 || right.length > 0 || w.compass;
  const sideW = hasSide ? Math.max(104, cellSize * 4.4) : 0;
  const col = (list: typeof cells, align: 'flex-start' | 'flex-end', extra?: ReactNode) => (
    <View style={{ width: sideW, justifyContent: 'center', gap: 22, alignItems: align }}>
      {list.map((c) => cell(c, cellSize, align))}
      {extra}
    </View>
  );
  const body: ReactNode = landscape ? (
    <View style={{ flex: 1, flexDirection: 'row', gap: hasSide ? 12 : 0 }}>
      {hasSide ? col(left, 'flex-start') : null}
      <View style={{ flex: 1 }}>
        <Fit>{gauge}</Fit>
      </View>
      {hasSide ? col(right, 'flex-end', dial(Math.min(96, height * 0.24))) : null}
    </View>
  ) : (
    <View style={{ flex: 1, gap: 14 }}>
      <Fit>{gauge}</Fit>
      {hasSide ? (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          {col(left, 'flex-start')}
          <View style={{ flex: 1, alignItems: 'center' }}>{dial(Math.min(110, width * 0.27))}</View>
          {col(right, 'flex-end')}
        </View>
      ) : null}
    </View>
  );

  const alert =
    gps.status === 'kayip' || gps.status === 'zayif' ? (
      <SignalAlert pal={pal} title={st.title} detail={st.detail} reduced={reduced} />
    ) : gps.status === 'demo' ? (
      <SignalAlert pal={pal} title="DEMO VERİSİ" detail="Göstergeler gerçek hız değil · Ayarlar'dan kapatın" reduced />
    ) : null;

  return (
    <View style={{ flex: 1, backgroundColor: pal.bg }}>
      <StatusBar hidden />
      <Backdrop pal={pal} width={width} height={height} />
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, borderWidth: 3, borderColor: pal.danger }, edgeStyle]} />
      <Animated.View
        entering={enterReduced ? undefined : FadeIn.duration(450)}
        style={{ flex: 1, paddingTop: insets.top + 10, paddingBottom: insets.bottom + 10, paddingLeft: insets.left + 16, paddingRight: insets.right + 16 }}
      >
        {/* Üst şerit */}
        <HudHeader
          pal={pal}
          gps={gps}
          showGps={w.gps}
          showClock={w.clock}
          clockHeight={Math.max(16, cellSize * 0.75)}
          glyph={theme.glyph === 'hairline' ? 'hairline' : 'mono'}
          weather={weather}
          moving={moving}
          onPanel={() => setDrawer(true)}
        />
        {alert ? <View style={{ marginTop: 8, alignItems: 'center' }}>{alert}</View> : null}
        {/* Cama yansıtma: gösterge ve veriler çevrilir; üst şerit (düğmeler) düz kalır */}
        <View style={{ flex: 1, marginTop: 8, transform: !nx.cockpitMirror ? [] : nx.mirrorAxis === 'ust' ? [{ scaleY: -1 }] : [{ scaleX: -1 }] }}>{body}</View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6, gap: 12 }}>
          <NxLabel color={alpha(pal.dim, 0.9)} size={8} spacing={1.6} style={{ textTransform: 'none' }}>
            {`// ${theme.name.toUpperCase()}`}
          </NxLabel>
          <NxLabel color={alpha(pal.dim, 0.9)} size={8} spacing={1.6}>
            DIGITAL COCKPIT
          </NxLabel>
        </View>
      </Animated.View>
      <DimOverlay brightness={brightness} />
      <HudDrawer mode="kokpit" open={drawer} onClose={() => setDrawer(false)} />
    </View>
  );
}
