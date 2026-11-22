import { memo, useEffect, useRef, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
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
export const GAUGE_ASPECT: Record<GaugeKind, number> = { blade: 0.78, orbit: 0.92, warp: 0.66, streak: 0.8, tunnel: 0.78, road: 0.66 };

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
function useLoop(speed: number | null, reduced: boolean | undefined, slowMs: number, fastMs: number): SharedValue<number> {
  const t = useSharedValue(0);
  const bucket = speed == null ? -1 : Math.min(8, Math.round(speed / 25));
  useEffect(() => {
    cancelAnimation(t);
    if (reduced || bucket < 0) {
      t.value = 0;
      return;
    }
    const dur = slowMs - ((slowMs - fastMs) * bucket) / 8;
    t.value = 0;
    t.value = withRepeat(withTiming(1, { duration: dur, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(t);
  }, [bucket, reduced, slowMs, fastMs, t]);
  return t;
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
        {center ?? <Readout value={shown} height={h * 0.34} pal={pal} glyph={glyph} unit={unit} over={over} />}
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
  const spin = useLoop(speed == null ? 0 : speed, reduced, 24000, 5000);
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
        {center ?? <Readout value={shown} height={h * 0.3} pal={pal} glyph={glyph} unit={unit} over={over} />}
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
  const flow = useLoop(speed == null ? 0 : speed, reduced, 2600, 380);
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
        {center ?? <Readout value={shown} height={h * 0.38} pal={pal} glyph={glyph} unit={unit} over={over} unitGap={0.04} />}
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
  const flow = useLoop(speed == null ? 0 : speed, reduced, 3000, 320);
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
        {center ?? <Readout value={shown} height={h * 0.27} pal={pal} glyph={glyph} unit={unit} over={over} />}
      </CenterBox>
    </View>
  );
});

// ---------------------------------------------------------------------------
// 5) Tachyon — Tünel
// ---------------------------------------------------------------------------
const TUNNEL_N = 6;
const TUNNEL_RING = 'M30 6 L70 6 L84 20 L84 50 L70 64 L30 64 L16 50 L16 20 Z';
const TUNNEL_SEGS = 20;

function TunnelRing({ i, t, w, h, color }: { i: number; t: SharedValue<number>; w: number; h: number; color: string }) {
  const style = useAnimatedStyle(() => {
    const q = (t.value + i / TUNNEL_N) % 1;
    const scale = 0.12 + q * q * 1.15;
    const op = q < 0.15 ? q / 0.15 : q > 0.85 ? (1 - q) / 0.15 : 1;
    return { transform: [{ scale }], opacity: op * 0.85 };
  });
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: 0, width: w, height: h }, style]}>
      <Svg width={w} height={h} viewBox="0 0 100 70">
        <Path d={TUNNEL_RING} stroke={color} strokeWidth={1.1} fill="none" strokeLinejoin="miter" />
      </Svg>
    </Animated.View>
  );
}

const TunnelGauge = memo(function TunnelGauge({ speed, max, width, pal, glyph, unit, over, reduced, center }: GaugeProps) {
  const h = width * GAUGE_ASPECT.tunnel;
  const shown = useTweenedSpeed(speed, reduced);
  const t = useLoop(speed == null ? 0 : speed, reduced, 4200, 700);
  const lit = shown == null ? 0 : Math.round(Math.min(1, shown / max) * TUNNEL_SEGS);
  const ringH = h * 0.86;
  const col = over ? pal.danger : pal.primary;
  return (
    <View style={{ width, height: h, overflow: 'hidden' }}>
      <View style={{ position: 'absolute', left: 0, top: 0, width, height: ringH }}>
        <Svg width={width} height={ringH} viewBox="0 0 100 70" style={{ position: 'absolute' }}>
          <Path d="M16 20 L50 35 M84 20 L50 35 M16 50 L50 35 M84 50 L50 35" stroke={alpha(pal.holo, 0.3)} strokeWidth={0.3} />
          <Path d={TUNNEL_RING} stroke={alpha(pal.primary, 0.5)} strokeWidth={0.6} fill="none" />
        </Svg>
        {Array.from({ length: TUNNEL_N }, (_, i) => (
          <TunnelRing key={i} i={i} t={t} w={width} h={ringH} color={i % 2 ? pal.secondary : pal.primary} />
        ))}
      </View>
      {/* segment hız ölçeği */}
      <View style={{ position: 'absolute', left: width * 0.12, right: width * 0.12, bottom: h * 0.02, height: h * 0.06, flexDirection: 'row', gap: 3 }}>
        {Array.from({ length: TUNNEL_SEGS }, (_, i) => (
          <View
            key={i}
            style={{
              flex: 1,
              backgroundColor: i < lit ? (over ? pal.danger : i / TUNNEL_SEGS > 0.7 ? pal.secondary : col) : alpha(pal.primary, 0.12),
              transform: [{ skewX: '-20deg' }],
            }}
          />
        ))}
      </View>
      <CenterBox top={0} height={ringH}>
        {center ?? (
          <View style={{ backgroundColor: alpha(pal.bg, 0.78), paddingHorizontal: width * 0.04, paddingVertical: h * 0.02 }}>
            <Readout value={shown} height={h * 0.28} pal={pal} glyph={glyph} unit={unit} over={over} />
          </View>
        )}
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
  const flow = useLoop(speed == null ? 0 : speed, reduced, 2600, 330);
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
      <CenterBox top={0} height={h * 0.62}>
        {center ?? <Readout value={shown} height={h * 0.34} pal={pal} glyph={glyph} unit={unit} over={over} unitGap={0.04} />}
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
    case 'tunnel':
      return <TunnelGauge {...p} />;
    case 'road':
      return <RoadGauge {...p} />;
    default:
      return <BladeGauge {...p} />;
  }
}
