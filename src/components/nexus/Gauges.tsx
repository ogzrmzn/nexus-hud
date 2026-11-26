import { memo, useEffect, useRef, useState, type ReactNode } from 'react';
import { Platform, View } from 'react-native';
import Animated, {
  Easing,
  useFrameCallback,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, Ellipse, Path } from 'react-native-svg';
import { alpha, type GaugeKind, type GlyphStyle, type NexusPalette } from '@/features/nexus/themes';
import { NxLabel } from './primitives';
import { NxNumber } from './NxNumber';

const APath = Animated.createAnimatedComponent(Path);
const ACircle = Animated.createAnimatedComponent(Circle);

export interface GaugeProps {
  /** Seçili birimde hız; güvenilir veri yoksa null ("--") */
  speed: number | null;
  /** Tam ölçek */
  max: number;
  /** Göstergenin genişliği (yükseklik geometriye göre) */
  width: number;
  pal: NexusPalette;
  glyph: GlyphStyle;
  unit: string;
  /** Hız uyarısı aşıldı */
  over?: boolean;
  /** "az": sürekli dönen/akan katmanlar kapalı, geçişler kısa */
  reduced?: boolean;
  /** Sayının yerine gösterilecek içerik (ör. GPS arama animasyonu) */
  center?: ReactNode;
}

/** Göstergenin yükseklik/genişlik oranı */
export const GAUGE_ASPECT: Record<GaugeKind, number> = { blade: 0.78, orbit: 0.92, warp: 0.66, streak: 0.8, nova: 0.8, sphere: 0.9, road: 0.66 };

const D2R = Math.PI / 180;
const pt = (cx: number, cy: number, r: number, deg: number) => [cx + r * Math.cos(deg * D2R), cy + r * Math.sin(deg * D2R)] as const;

/**
 * Gösterilen sayının yumuşak geçişi: hedefe ~600 ms'de akar, yalnızca tam sayı değişince yeniden çizer.
 * (Sayı GPS ölçümleri arasında yeni değer uydurmaz; yalnızca iki gerçek ölçüm arasındaki geçişi yumuşatır.)
 */
export function useTweenedSpeed(target: number | null, reduced?: boolean): number | null {
  const [shown, setShown] = useState<number | null>(target == null ? null : Math.round(target));
  const cur = useRef(target ?? 0);
  useEffect(() => {
    if (target == null) {
      setShown(null);
      return;
    }
    const from = cur.current;
    const to = target;
    if (reduced || Math.abs(to - from) < 0.5) {
      cur.current = to;
      setShown(Math.round(to));
      return;
    }
    const t0 = Date.now();
    const dur = 600;
    let raf = 0;
    const step = () => {
      const k = Math.min(1, (Date.now() - t0) / dur);
      const e = 1 - (1 - k) ** 3;
      cur.current = from + (to - from) * e;
      const r = Math.round(cur.current);
      setShown((s) => (s === r ? s : r));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, reduced]);
  return shown;
}

/** 0..1 hız oranı (UI thread'de yumuşak) */
function useFraction(speed: number | null, max: number, reduced?: boolean): SharedValue<number> {
  const f = useSharedValue(0);
  useEffect(() => {
    const v = speed == null ? 0 : Math.min(1, Math.max(0, speed / max));
    f.value = withTiming(v, { duration: reduced ? 150 : 750, easing: Easing.out(Easing.cubic) });
  }, [speed, max, reduced, f]);
  return f;
}

/** Hızla hızlanan sürekli döngü (0→1); "az" modda durur */
/**
 * Hıza bağlı sürekli akış evresi (0→1, döngüsel). Dururken de yavaşça akar; hız arttıkça akış hızı
 * kesintisiz (atlamadan) artar. UI thread'de kare başına ilerler; yalnızca "az animasyon" ayarında durur.
 */
/** Akışın en hızlı olduğu hız (seçili birimde) */
export const FLOW_FULL_SPEED = 120;

function useLoop(speed: number | null, reduced: boolean | undefined, slowMs: number, fastMs: number): SharedValue<number> {
  const phase = useSharedValue(0);
  const rate = useSharedValue(1 / slowMs);
  // 10 → yavaş, 50 → orta, 100 → hızlı, 120 ve üstü → en hızlı (doğrusal, atlamasız)
  const k = Math.min(1, Math.max(0, (speed ?? 0) / FLOW_FULL_SPEED));
  useEffect(() => {
    const target = 1 / slowMs + (1 / fastMs - 1 / slowMs) * k;
    rate.value = withTiming(target, { duration: 900, easing: Easing.inOut(Easing.quad) });
  }, [k, slowMs, fastMs, rate]);
  // Web'de (telefon tarayıcısı) çizim ana iş parçacığında yapılır: ~30 fps ile sınırlanır ki hız güncellemeleri takılmasın
  const acc = useSharedValue(0);
  const minStep = Platform.OS === 'web' ? 33 : 0;
  const cb = useFrameCallback((f) => {
    const dt = Math.min(64, f.timeSincePreviousFrame ?? 16);
    acc.value += dt;
    if (acc.value < minStep) return;
    phase.value = (phase.value + acc.value * rate.value) % 1;
    acc.value = 0;
  }, false);
  useEffect(() => {
    cb.setActive(!reduced);
    return () => cb.setActive(false);
  }, [reduced, cb]);
  return phase;
}

/** Ortadaki hız + birim */
function Readout({ value, height, pal, glyph, unit, over, glow = true, unitGap = 0.1 }: { value: number | null; height: number; pal: NexusPalette; glyph: GlyphStyle; unit: string; over?: boolean; glow?: boolean; unitGap?: number }) {
  const text = value == null ? '--' : String(value);
  const color = value == null ? pal.dim : over ? pal.danger : pal.text;
  return (
    <View style={{ alignItems: 'center' }}>
      <NxNumber text={text} height={height} color={color} style={glyph} glow={glow && value != null ? (over ? pal.danger : pal.primary) : undefined} />
      <NxLabel color={over ? pal.danger : pal.primary} size={Math.max(9, height * 0.13)} spacing={height * 0.04} style={{ marginTop: height * unitGap }}>
        {unit}
      </NxLabel>
    </View>
  );
}

function CenterBox({ children, top, height }: { children: ReactNode; top: number; height: number }) {
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top, height, alignItems: 'center', justifyContent: 'center' }}>
      {children}
    </View>
  );
}

// ---------------------------------------------------------------------------
// 1) NEXUS Original — Prizma Bıçak
// ---------------------------------------------------------------------------
const BLADE_N = 24;
const BLADE_A0 = 160;
const BLADE_SPAN = 140;
const BLADE_SEGS = Array.from({ length: BLADE_N }, (_, i) => {
  const step = BLADE_SPAN / BLADE_N;
  const a0 = BLADE_A0 - i * step;
  const a1 = a0 - step + 1.4;
  const r1 = 40;
  const r2 = r1 + 3 + i * 0.16;
  const p = [pt(50, 30, r1, a0), pt(50, 30, r2, a0), pt(50, 30, r2, a1), pt(50, 30, r1, a1)];
  return `M${p.map((q) => `${q[0].toFixed(2)} ${q[1].toFixed(2)}`).join('L')}Z`;
});
const SWEEP_R = 37;
const SWEEP_LEN = SWEEP_R * BLADE_SPAN * D2R;
const SWEEP_D = (() => {
  const a = pt(50, 30, SWEEP_R, BLADE_A0);
  const b = pt(50, 30, SWEEP_R, BLADE_A0 - BLADE_SPAN);
  return `M${a[0]} ${a[1]} A${SWEEP_R} ${SWEEP_R} 0 0 0 ${b[0]} ${b[1]}`;
})();
const TOP_ARC = (() => {
  const a = pt(50, 30, 42, 205);
  const b = pt(50, 30, 42, 335);
  return `M${a[0]} ${a[1]} A42 42 0 0 1 ${b[0]} ${b[1]}`;
})();
const TOP_TICKS = [215, 240, 270, 300, 325]
  .map((d) => {
    const a = pt(50, 30, 42, d);
    const b = pt(50, 30, d === 270 ? 37.5 : 39.5, d);
    return `M${a[0].toFixed(2)} ${a[1].toFixed(2)}L${b[0].toFixed(2)} ${b[1].toFixed(2)}`;
  })
  .join('');

const BladeGauge = memo(function BladeGauge({ speed, max, width, pal, glyph, unit, over, reduced, center }: GaugeProps) {
  const h = width * GAUGE_ASPECT.blade;
  const shown = useTweenedSpeed(speed, reduced);
  const f = useFraction(speed, max, reduced);
  const lit = shown == null ? 0 : Math.round(Math.min(1, shown / max) * BLADE_N);
  const sweepProps = useAnimatedProps(() => ({ strokeDashoffset: SWEEP_LEN * (1 - f.value) }));
  return (
    <View style={{ width, height: h }}>
      <Svg width={width} height={h} viewBox="0 0 100 78">
        {/* holografik üst köprü: mor, hafif kaydırılmış ikiz çizgi */}
        <Path d={TOP_ARC} stroke={alpha(pal.holo, 0.35)} strokeWidth={0.5} fill="none" transform="translate(0.6 0.5)" />
        <Path d={TOP_ARC} stroke={alpha(pal.primary, 0.45)} strokeWidth={0.45} fill="none" strokeDasharray="0.8 1.6" />
        <Path d={TOP_TICKS} stroke={alpha(pal.primary, 0.6)} strokeWidth={0.6} />
        {/* bıçak segmentleri */}
        {BLADE_SEGS.map((d, i) => {
          const on = i < lit;
          const hot = i / BLADE_N > 0.68;
          const col = over ? pal.danger : hot ? pal.holo : i / BLADE_N > 0.45 ? pal.secondary : pal.primary;
          return <Path key={i} d={d} fill={on ? col : alpha(pal.primary, 0.08)} stroke={on ? 'none' : alpha(pal.primary, 0.22)} strokeWidth={0.25} />;
        })}
        {/* sürekli süpürme çizgisi (aralardaki geçişi yumuşatır) */}
        <Path d={SWEEP_D} stroke={alpha(pal.primary, 0.14)} strokeWidth={0.5} fill="none" />
        <APath d={SWEEP_D} stroke={over ? pal.danger : pal.secondary} strokeWidth={0.7} fill="none" strokeDasharray={`${SWEEP_LEN} ${SWEEP_LEN}`} animatedProps={sweepProps} />
        {/* prizma uç chevronları */}
        <Path d="M6 47 L10.5 44 L10.5 50 Z M94 47 L89.5 44 L89.5 50 Z" fill={alpha(pal.holo, 0.8)} />
      </Svg>
      <CenterBox top={h * 0.1} height={h * 0.62}>
        {center ?? <Readout value={shown} height={h * 0.4} pal={pal} glyph={glyph} unit={unit} over={over} />}
      </CenterBox>
    </View>
  );
});

// ---------------------------------------------------------------------------
// 2) Quantum — Yörünge
// ---------------------------------------------------------------------------
const ORB_R = 43;
const ORB_A0 = 135;
const ORB_SPAN = 270;
const ORB_LEN = ORB_R * ORB_SPAN * D2R;
const ORB_D = (() => {
  const a = pt(50, 50, ORB_R, ORB_A0);
  const b = pt(50, 50, ORB_R, ORB_A0 + ORB_SPAN);
  return `M${a[0]} ${a[1]} A${ORB_R} ${ORB_R} 0 1 1 ${b[0]} ${b[1]}`;
})();
const ORB_TICKS = Array.from({ length: 10 }, (_, i) => {
  const d = ORB_A0 + (ORB_SPAN * i) / 9;
  const a = pt(50, 50, 47, d);
  const b = pt(50, 50, 48.6, d);
  return `M${a[0].toFixed(2)} ${a[1].toFixed(2)}L${b[0].toFixed(2)} ${b[1].toFixed(2)}`;
}).join('');

const OrbitGauge = memo(function OrbitGauge({ speed, max, width, pal, glyph, unit, over, reduced, center }: GaugeProps) {
  const h = width * GAUGE_ASPECT.orbit;
  const shown = useTweenedSpeed(speed, reduced);
  const f = useFraction(speed, max, reduced);
  const spin = useLoop(speed == null ? 0 : speed, reduced, 30000, 9000);
  const arcProps = useAnimatedProps(() => ({ strokeDashoffset: ORB_LEN * (1 - f.value) }));
  const dotProps = useAnimatedProps(() => {
    const a = (ORB_A0 + ORB_SPAN * f.value) * (Math.PI / 180);
    return { cx: 50 + ORB_R * Math.cos(a), cy: 50 + ORB_R * Math.sin(a) };
  });
  const spinStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.value * 360}deg` }] }));
  const col = over ? pal.danger : pal.primary;
  return (
    <View style={{ width, height: h, alignItems: 'center', justifyContent: 'center' }}>
      {/* dönen holografik yörünge (hız arttıkça hızlanır) */}
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', width: h, height: h }, spinStyle]}>
        <Svg width={h} height={h} viewBox="0 0 100 100">
          <Ellipse cx={50} cy={50} rx={36} ry={14} stroke={alpha(pal.holo, 0.35)} strokeWidth={0.35} fill="none" transform="rotate(-28 50 50)" />
          <Circle cx={50 + 36 * Math.cos(-28 * D2R)} cy={50 + 36 * Math.sin(-28 * D2R)} r={0.9} fill={pal.holo} />
        </Svg>
      </Animated.View>
      <Svg width={h} height={h} viewBox="0 0 100 100" style={{ position: 'absolute' }}>
        <Ellipse cx={50} cy={50} rx={36} ry={14} stroke={alpha(pal.secondary, 0.2)} strokeWidth={0.3} fill="none" transform="rotate(32 50 50)" />
        <Circle cx={50} cy={50} r={47.8} stroke={alpha(pal.primary, 0.12)} strokeWidth={0.3} fill="none" />
        <Path d={ORB_TICKS} stroke={alpha(pal.primary, 0.5)} strokeWidth={0.5} />
        <Path d={ORB_D} stroke={alpha(pal.primary, 0.16)} strokeWidth={0.6} fill="none" strokeLinecap="round" />
        <APath d={ORB_D} stroke={col} strokeWidth={1.1} fill="none" strokeLinecap="round" strokeDasharray={`${ORB_LEN} ${ORB_LEN}`} animatedProps={arcProps} />
        <ACircle r={3.2} fill={alpha(col, 0.25)} animatedProps={dotProps} />
        <ACircle r={1.5} fill={pal.text} animatedProps={dotProps} />
      </Svg>
      <CenterBox top={0} height={h}>
        {center ?? <Readout value={shown} height={h * 0.34} pal={pal} glyph={glyph} unit={unit} over={over} />}
      </CenterBox>
    </View>
  );
});

// ---------------------------------------------------------------------------
// 3) Hyperdrive — Warp
// ---------------------------------------------------------------------------
const WARP_VP = [50, 18] as const;
const WARP_D = [-60, -36, -18, -6, 6, 18, 36, 60]
  .map((x) => {
    const bx = 50 + x * 1.2;
    return `M${bx} 66 L${(WARP_VP[0] + (bx - 50) * 0.08).toFixed(2)} ${WARP_VP[1] + 2}`;
  })
  .join('');
const WARP_PERIOD = 9;

const WarpGauge = memo(function WarpGauge({ speed, max, width, pal, glyph, unit, over, reduced, center }: GaugeProps) {
  const h = width * GAUGE_ASPECT.warp;
  const shown = useTweenedSpeed(speed, reduced);
  const f = useFraction(speed, max, reduced);
  const flow = useLoop(speed == null ? 0 : speed, reduced, 6000, 1100);
  const streakProps = useAnimatedProps(() => ({ strokeDashoffset: flow.value * WARP_PERIOD }));
  const barProps = useAnimatedProps(() => {
    const w = 70 * f.value;
    return { d: `M15 61 L${15 + w} 61 L${12.5 + w} 64.5 L12.5 64.5 Z` };
  });
  const col = over ? pal.danger : pal.primary;
  return (
    <View style={{ width, height: h }}>
      <Svg width={width} height={h} viewBox="0 0 100 66">
        <Path d={WARP_D} stroke={alpha(pal.holo, 0.18)} strokeWidth={0.35} />
        <APath d={WARP_D} stroke={alpha(pal.primary, 0.55)} strokeWidth={0.45} strokeDasharray="1.2 7.8" animatedProps={streakProps} />
        <Path d="M2 18 L98 18" stroke={alpha(pal.holo, 0.4)} strokeWidth={0.3} />
        {/* eğik hız bandı */}
        <Path d="M15 61 L85 61 L82.5 64.5 L12.5 64.5 Z" fill={alpha(pal.primary, 0.08)} stroke={alpha(pal.primary, 0.3)} strokeWidth={0.25} />
        <APath fill={col} animatedProps={barProps} />
        <Path d="M10 57 L5 57 L2 62 M90 57 L95 57 L98 62" stroke={pal.holo} strokeWidth={0.6} fill="none" />
      </Svg>
      <CenterBox top={h * 0.24} height={h * 0.6}>
        {center ?? <Readout value={shown} height={h * 0.44} pal={pal} glyph={glyph} unit={unit} over={over} unitGap={0.04} />}
      </CenterBox>
    </View>
  );
});

// ---------------------------------------------------------------------------
// 4) Lightspeed — Yıldız akışı
// ---------------------------------------------------------------------------
const STREAK_D = Array.from({ length: 30 }, (_, i) => {
  const a = (i * 360) / 30 + (i % 2 ? 4 : 0);
  const r0 = 15 + (i % 3) * 3;
  const p0 = pt(50, 40, r0, a);
  const p1 = pt(50, 40, 64, a);
  return `M${p0[0].toFixed(2)} ${p0[1].toFixed(2)}L${p1[0].toFixed(2)} ${p1[1].toFixed(2)}`;
}).join('');
const STREAK_PERIOD = 11;
const LS_R = 33;
const LS_A0 = 120;
const LS_SPAN = 300;
const LS_LEN = LS_R * LS_SPAN * D2R;
const LS_D = (() => {
  const a = pt(50, 40, LS_R, LS_A0);
  const b = pt(50, 40, LS_R, LS_A0 + LS_SPAN);
  return `M${a[0].toFixed(2)} ${a[1].toFixed(2)} A${LS_R} ${LS_R} 0 1 1 ${b[0].toFixed(2)} ${b[1].toFixed(2)}`;
})();

const StreakGauge = memo(function StreakGauge({ speed, max, width, pal, glyph, unit, over, reduced, center }: GaugeProps) {
  const h = width * GAUGE_ASPECT.streak;
  const shown = useTweenedSpeed(speed, reduced);
  const f = useFraction(speed, max, reduced);
  const flow = useLoop(speed == null ? 0 : speed, reduced, 7000, 1300);
  const streakProps = useAnimatedProps(() => ({ strokeDashoffset: -flow.value * STREAK_PERIOD }));
  const arcProps = useAnimatedProps(() => ({ strokeDashoffset: LS_LEN * (1 - f.value) }));
  const glowProps = useAnimatedProps(() => ({ strokeDashoffset: LS_LEN * (1 - f.value) }));
  const col = over ? pal.danger : pal.primary;
  return (
    <View style={{ width, height: h, overflow: 'hidden' }}>
      <Svg width={width} height={h} viewBox="0 0 100 80">
        <Path d={STREAK_D} stroke={alpha(pal.holo, 0.16)} strokeWidth={0.3} />
        <APath d={STREAK_D} stroke={alpha(pal.secondary, 0.75)} strokeWidth={0.45} strokeLinecap="round" strokeDasharray="1.6 9.4" animatedProps={streakProps} />
        <Circle cx={50} cy={40} r={28} fill={alpha(pal.bg, 0.88)} />
        <Path d={LS_D} stroke={alpha(pal.primary, 0.14)} strokeWidth={1.4} fill="none" strokeLinecap="round" />
        <APath d={LS_D} stroke={alpha(col, 0.25)} strokeWidth={4} fill="none" strokeLinecap="round" strokeDasharray={`${LS_LEN} ${LS_LEN}`} animatedProps={glowProps} />
        <APath d={LS_D} stroke={col} strokeWidth={1.4} fill="none" strokeLinecap="round" strokeDasharray={`${LS_LEN} ${LS_LEN}`} animatedProps={arcProps} />
        <Circle cx={50} cy={40} r={37.5} stroke={alpha(pal.holo, 0.35)} strokeWidth={0.3} fill="none" strokeDasharray="0.6 2.2" />
      </Svg>
      <CenterBox top={h * 0.1} height={h * 0.8}>
        {center ?? <Readout value={shown} height={h * 0.32} pal={pal} glyph={glyph} unit={unit} over={over} />}
      </CenterBox>
    </View>
  );
});

// ---------------------------------------------------------------------------
// 5) Nova Drive — Aurora dalgaları
// ---------------------------------------------------------------------------
const BR_R = 36;
const BR_SPAN = 76;
const BR_LEN = BR_R * BR_SPAN * D2R;
// sol parantez: alttan yukarı; sağ parantez: alttan yukarı (iki yan simetrik dolar)
const BR_L = (() => {
  const a = pt(50, 40, BR_R, 180 - BR_SPAN / 2);
  const b = pt(50, 40, BR_R, 180 + BR_SPAN / 2);
  return `M${a[0].toFixed(2)} ${a[1].toFixed(2)} A${BR_R} ${BR_R} 0 0 1 ${b[0].toFixed(2)} ${b[1].toFixed(2)}`;
})();
const BR_R2 = (() => {
  const a = pt(50, 40, BR_R, BR_SPAN / 2);
  const b = pt(50, 40, BR_R, -BR_SPAN / 2);
  return `M${a[0].toFixed(2)} ${a[1].toFixed(2)} A${BR_R} ${BR_R} 0 0 0 ${b[0].toFixed(2)} ${b[1].toFixed(2)}`;
})();

/** Bir aurora şeridi: yatay, yumuşak dalga; genliği hızla kabarır, akışı hep sakin */
function auroraPath(phase: number, amp: number, freq: number, offset: number, y0: number) {
  'worklet';
  let d = '';
  for (let i = 0; i <= 24; i++) {
    const x = (i / 24) * 100;
    // kenarlara doğru söner (sinüs pencere)
    const env = Math.sin((i / 24) * Math.PI);
    const y = y0 + Math.sin((x / 100) * Math.PI * 2 * freq + phase * Math.PI * 2 + offset) * amp * env;
    d += (i === 0 ? 'M' : 'L') + x.toFixed(2) + ' ' + y.toFixed(2);
  }
  return d;
}

const NovaGauge = memo(function NovaGauge({ speed, max, width, pal, glyph, unit, over, reduced, center }: GaugeProps) {
  const h = width * GAUGE_ASPECT.nova;
  const shown = useTweenedSpeed(speed, reduced);
  const f = useFraction(speed, max, reduced);
  // Nova: akış hıza bağlı değil, sabit ve çok yavaş; yalnızca dalga genliği hızla kabarır
  const flow = useLoop(0, reduced, 12000, 12000);
  const w1 = useAnimatedProps(() => ({ d: auroraPath(flow.value, 9 + f.value * 14, 1.1, 0, 40) }));
  const w2 = useAnimatedProps(() => ({ d: auroraPath(-flow.value, 7 + f.value * 12, 1.6, 1.3, 44) }));
  const w3 = useAnimatedProps(() => ({ d: auroraPath(flow.value * 0.6, 11 + f.value * 16, 0.8, 2.6, 36) }));
  const w4 = useAnimatedProps(() => ({ d: auroraPath(-flow.value * 0.8, 13 + f.value * 14, 0.6, 4.1, 42) }));
  const w5 = useAnimatedProps(() => ({ d: auroraPath(flow.value * 1.3, 6 + f.value * 10, 2.1, 5.2, 38) }));
  const lProps = useAnimatedProps(() => ({ strokeDashoffset: BR_LEN * (1 - f.value) }));
  const rProps = useAnimatedProps(() => ({ strokeDashoffset: BR_LEN * (1 - f.value) }));
  const col = over ? pal.danger : pal.primary;
  return (
    <View style={{ width, height: h, overflow: 'hidden' }}>
      <Svg width={width} height={h} viewBox="0 0 100 80">
        {/* aurora: geniş soluk ışık + ince parlak çekirdek */}
        <APath stroke={alpha(pal.secondary, 0.1)} strokeWidth={14} fill="none" strokeLinecap="round" animatedProps={w4} />
        <APath stroke={alpha(pal.holo, 0.12)} strokeWidth={10} fill="none" strokeLinecap="round" animatedProps={w5} />
        <APath stroke={alpha(pal.holo, 0.18)} strokeWidth={7} fill="none" strokeLinecap="round" animatedProps={w3} />
        <APath stroke={alpha(pal.secondary, 0.22)} strokeWidth={5} fill="none" strokeLinecap="round" animatedProps={w2} />
        <APath stroke={alpha(pal.primary, 0.28)} strokeWidth={6} fill="none" strokeLinecap="round" animatedProps={w1} />
        <APath stroke={alpha(pal.secondary, 0.55)} strokeWidth={0.4} fill="none" animatedProps={w4} />
        <APath stroke={alpha(pal.holo, 0.6)} strokeWidth={0.4} fill="none" animatedProps={w5} />
        <APath stroke={alpha(pal.holo, 0.8)} strokeWidth={0.5} fill="none" animatedProps={w3} />
        <APath stroke={alpha(pal.secondary, 0.85)} strokeWidth={0.5} fill="none" animatedProps={w2} />
        <APath stroke={pal.primary} strokeWidth={0.7} fill="none" animatedProps={w1} />
        <Ellipse cx={50} cy={40} rx={27} ry={21} fill={alpha(pal.bg, 0.82)} />
        <Path d={`${BR_L}${BR_R2}`} stroke={alpha(pal.primary, 0.16)} strokeWidth={2.2} fill="none" strokeLinecap="round" />
        <APath d={BR_L} stroke={col} strokeWidth={2.2} fill="none" strokeLinecap="round" strokeDasharray={`${BR_LEN} ${BR_LEN}`} animatedProps={lProps} />
        <APath d={BR_R2} stroke={col} strokeWidth={2.2} fill="none" strokeLinecap="round" strokeDasharray={`${BR_LEN} ${BR_LEN}`} animatedProps={rProps} />
      </Svg>
      <CenterBox top={0} height={h}>
        {center ?? <Readout value={shown} height={h * 0.34} pal={pal} glyph={glyph} unit={unit} over={over} />}
      </CenterBox>
    </View>
  );
});

// ---------------------------------------------------------------------------
// 7) Holosphere — Dönen holografik küre
// ---------------------------------------------------------------------------
const SP_C = 45;
const SP_R = 34;
const SP_PARALLELS = [-30, 30]
  .map((lat) => {
    const y = SP_C + SP_R * Math.sin(lat * D2R);
    const rx = SP_R * Math.cos(lat * D2R);
    const ry = rx * 0.16;
    return `M${(50 - rx).toFixed(2)} ${y.toFixed(2)} A${rx.toFixed(2)} ${ry.toFixed(2)} 0 1 0 ${(50 + rx).toFixed(2)} ${y.toFixed(2)} A${rx.toFixed(2)} ${ry.toFixed(2)} 0 1 0 ${(50 - rx).toFixed(2)} ${y.toFixed(2)}`;
  })
  .join('');
// ekvator halkası (kürenin dışında, eğik)
const RING_RX = 47;
const RING_RY = 9;
const RING_D = `M${50 - RING_RX} ${SP_C} A${RING_RX} ${RING_RY} 0 1 0 ${50 + RING_RX} ${SP_C} A${RING_RX} ${RING_RY} 0 1 0 ${50 - RING_RX} ${SP_C}`;
const RING_LEN = Math.PI * (3 * (RING_RX + RING_RY) - Math.sqrt((3 * RING_RX + RING_RY) * (RING_RX + 3 * RING_RY)));

const SphereGauge = memo(function SphereGauge({ speed, max, width, pal, glyph, unit, over, reduced, center }: GaugeProps) {
  const h = width * GAUGE_ASPECT.sphere;
  const shown = useTweenedSpeed(speed, reduced);
  const f = useFraction(speed, max, reduced);
  // Sakin dönüş: dururken ~60 sn'de, hızlıyken ~25 sn'de bir tur
  const spin = useLoop(speed == null ? 0 : speed, reduced, 60000, 25000);
  const meridians = useAnimatedProps(() => {
    let d = '';
    for (let i = 0; i < 4; i++) {
      const a = spin.value * Math.PI * 2 + (i * Math.PI) / 4;
      const rx = Math.abs(Math.cos(a)) * SP_R;
      if (rx < 0.3) {
        d += `M50 ${SP_C - SP_R}L50 ${SP_C + SP_R}`;
        continue;
      }
      d += `M50 ${SP_C - SP_R}A${rx.toFixed(2)} ${SP_R} 0 0 1 50 ${SP_C + SP_R}A${rx.toFixed(2)} ${SP_R} 0 0 1 50 ${SP_C - SP_R}`;
    }
    return { d };
  });
  const ringProps = useAnimatedProps(() => ({ strokeDashoffset: RING_LEN * (1 - f.value) }));
  const dotProps = useAnimatedProps(() => {
    // ışık noktası halkanın dolu ucunda
    const a = Math.PI + f.value * Math.PI * 2;
    return { cx: 50 + RING_RX * Math.cos(a), cy: SP_C - RING_RY * Math.sin(a) };
  });
  const col = over ? pal.danger : pal.primary;
  return (
    <View style={{ width, height: h, overflow: 'hidden' }}>
      <Svg width={width} height={h} viewBox="0 0 100 90">
        {/* Sade, yarı saydam küre: tüm parçalar temanın ana renginde */}
        <Circle cx={50} cy={SP_C} r={SP_R} stroke={alpha(pal.primary, 0.4)} strokeWidth={0.6} fill="none" />
        <Path d={SP_PARALLELS} stroke={alpha(pal.primary, 0.18)} strokeWidth={0.4} fill="none" />
        <APath stroke={alpha(pal.primary, 0.24)} strokeWidth={0.45} fill="none" animatedProps={meridians} />
        <Path d={RING_D} stroke={alpha(pal.primary, 0.16)} strokeWidth={1.6} fill="none" />
        <APath d={RING_D} stroke={col} strokeWidth={1.6} fill="none" strokeLinecap="round" strokeDasharray={`${RING_LEN} ${RING_LEN}`} animatedProps={ringProps} />
        <ACircle r={1.6} fill={col} animatedProps={dotProps} />
        <Circle cx={50} cy={SP_C} r={21} fill={alpha(pal.bg, 0.78)} />
      </Svg>
      <CenterBox top={0} height={h}>
        {center ?? <Readout value={shown} height={h * 0.26} pal={pal} glyph={glyph} unit={unit} over={over} />}
      </CenterBox>
    </View>
  );
});

// ---------------------------------------------------------------------------
// 6) Neon Highway — Yol ızgarası
// ---------------------------------------------------------------------------
const ROAD_VP = [50, 24] as const;
const ROAD_FAN = [-160, -100, -60, -30, 30, 60, 100, 160]
  .map((x) => `M${50 + x} 66 L${(50 + x * 0.04).toFixed(2)} ${ROAD_VP[1]}`)
  .join('');
const EDGE_L = 'M16 66 L47.5 24';
const EDGE_R = 'M84 66 L52.5 24';
const EDGE_LEN = Math.hypot(31.5, 42);
const LANE_D = 'M50 66 L50 24';

const RoadGauge = memo(function RoadGauge({ speed, max, width, pal, glyph, unit, over, reduced, center }: GaugeProps) {
  const h = width * GAUGE_ASPECT.road;
  const shown = useTweenedSpeed(speed, reduced);
  const f = useFraction(speed, max, reduced);
  const flow = useLoop(speed == null ? 0 : speed, reduced, 6500, 1200);
  const gridProps = useAnimatedProps(() => {
    let d = '';
    for (let k = 0; k < 7; k++) {
      const q = (k / 7 + flow.value) % 1;
      const y = 24 + 42 * q * q;
      d += `M0 ${y.toFixed(2)}L100 ${y.toFixed(2)}`;
    }
    return { d };
  });
  const laneProps = useAnimatedProps(() => ({ strokeDashoffset: -flow.value * 8 }));
  const edgeProps = useAnimatedProps(() => ({ strokeDashoffset: EDGE_LEN * (1 - f.value) }));
  const edgeProps2 = useAnimatedProps(() => ({ strokeDashoffset: EDGE_LEN * (1 - f.value) }));
  const col = over ? pal.danger : pal.primary;
  return (
    <View style={{ width, height: h, overflow: 'hidden' }}>
      <Svg width={width} height={h} viewBox="0 0 100 66">
        <Path d={ROAD_FAN} stroke={alpha(pal.holo, 0.35)} strokeWidth={0.3} />
        <APath stroke={alpha(pal.secondary, 0.45)} strokeWidth={0.35} animatedProps={gridProps} />
        <Path d="M0 24 L100 24" stroke={alpha(pal.holo, 0.8)} strokeWidth={0.5} />
        <APath d={LANE_D} stroke={alpha(pal.text, 0.5)} strokeWidth={0.6} strokeDasharray="3 5" animatedProps={laneProps} />
        <Path d={`${EDGE_L}${EDGE_R}`} stroke={alpha(col, 0.18)} strokeWidth={1.6} />
        <APath d={EDGE_L} stroke={col} strokeWidth={1.6} strokeDasharray={`${EDGE_LEN} ${EDGE_LEN}`} animatedProps={edgeProps} />
        <APath d={EDGE_R} stroke={col} strokeWidth={1.6} strokeDasharray={`${EDGE_LEN} ${EDGE_LEN}`} animatedProps={edgeProps2} />
      </Svg>
      <CenterBox top={0} height={h * 0.8}>
        {center ?? <Readout value={shown} height={h * 0.5} pal={pal} glyph={glyph} unit={unit} over={over} unitGap={0.04} />}
      </CenterBox>
    </View>
  );
});

export function Gauge({ kind, ...p }: GaugeProps & { kind: GaugeKind }) {
  switch (kind) {
    case 'orbit':
      return <OrbitGauge {...p} />;
    case 'warp':
      return <WarpGauge {...p} />;
    case 'streak':
      return <StreakGauge {...p} />;
    case 'nova':
      return <NovaGauge {...p} />;
    case 'sphere':
      return <SphereGauge {...p} />;
    case 'road':
      return <RoadGauge {...p} />;
    default:
      return <BladeGauge {...p} />;
  }
}
