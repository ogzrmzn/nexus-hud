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
import Svg, { Circle, Ellipse, Line, Path } from 'react-native-svg';
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
export const GAUGE_ASPECT: Record<GaugeKind, number> = { blade: 0.78, core: 0.92, orbit: 0.92, horizon: 0.46, warp: 0.66 };

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
// 2) Cyber Core — Sekizgen çekirdek
// ---------------------------------------------------------------------------
function octagon(R: number, cx = 50, cy = 50) {
  // Üst kenarın ortasından başlayıp saat yönünde: sağ üst köşe → … → sol üst köşe → başlangıç
  const v = Array.from({ length: 8 }, (_, k) => pt(cx, cy, R, -67.5 + k * 45));
  const top = [cx, cy - R * Math.cos(22.5 * D2R)] as const;
  const d = `M${top[0]} ${top[1].toFixed(2)}` + v.map((q) => `L${q[0].toFixed(2)} ${q[1].toFixed(2)}`).join('') + `L${top[0]} ${top[1].toFixed(2)}`;
  return { d, len: 8 * 2 * R * Math.sin(22.5 * D2R), v };
}
const OCT_OUT = octagon(45);
const OCT_IN = octagon(38.5);
const OCT_CORNERS = OCT_OUT.v
  .map((q, k) => {
    const r = pt(50, 50, 48.5, -67.5 + k * 45);
    return `M${q[0].toFixed(2)} ${q[1].toFixed(2)}L${r[0].toFixed(2)} ${r[1].toFixed(2)}`;
  })
  .join('');

const CoreGauge = memo(function CoreGauge({ speed, max, width, pal, glyph, unit, over, reduced, center }: GaugeProps) {
  const h = width * GAUGE_ASPECT.core;
  const shown = useTweenedSpeed(speed, reduced);
  const f = useFraction(speed, max, reduced);
  const scan = useLoop(speed == null ? 0 : speed, reduced, 4200, 1600);
  const ringProps = useAnimatedProps(() => ({ strokeDashoffset: OCT_OUT.len * (1 - f.value) }));
  const scanStyle = useAnimatedStyle(() => ({ transform: [{ translateY: h * 0.18 + scan.value * h * 0.64 }], opacity: reduced ? 0 : 0.5 - Math.abs(scan.value - 0.5) * 0.8 }));
  const col = over ? pal.danger : pal.primary;
  return (
    <View style={{ width, height: h, overflow: 'hidden' }}>
      <Svg width={width} height={h} viewBox="0 4 100 92">
        <Path d={OCT_IN.d} stroke={alpha(pal.secondary, 0.3)} strokeWidth={0.4} fill={alpha(pal.primary, 0.04)} />
        <Path d={OCT_OUT.d} stroke={alpha(col, 0.16)} strokeWidth={3.2} fill="none" strokeLinejoin="miter" />
        <APath d={OCT_OUT.d} stroke={col} strokeWidth={3.2} fill="none" strokeLinejoin="miter" strokeDasharray={`${OCT_OUT.len} ${OCT_OUT.len}`} animatedProps={ringProps} />
        <Path d={OCT_CORNERS} stroke={alpha(pal.holo, 0.85)} strokeWidth={0.8} />
        <Path d={OCT_IN.d} stroke={alpha(pal.holo, 0.25)} strokeWidth={0.35} fill="none" transform="translate(0.7 0.6)" />
      </Svg>
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: width * 0.2, right: width * 0.2, top: 0, height: 1.5, backgroundColor: pal.secondary }, scanStyle]} />
      <CenterBox top={0} height={h}>
        {center ?? (
          <>
            <NxLabel color={alpha(pal.secondary, 0.8)} size={Math.max(8, h * 0.04)} spacing={3} style={{ marginBottom: h * 0.03 }}>
              {'// CORE.VEL'}
            </NxLabel>
            <Readout value={shown} height={h * 0.3} pal={pal} glyph={glyph} unit={unit} over={over} />
          </>
        )}
      </CenterBox>
    </View>
  );
});

// ---------------------------------------------------------------------------
// 3) Quantum — Yörünge
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
// 4) Dark Matter — Ufuk
// ---------------------------------------------------------------------------
const HorizonGauge = memo(function HorizonGauge({ speed, max, width, pal, glyph, unit, over, reduced, center }: GaugeProps) {
  const h = width * GAUGE_ASPECT.horizon;
  const shown = useTweenedSpeed(speed, reduced);
  const f = useFraction(speed, max, reduced);
  const lineY = h * 0.86;
  const barStyle = useAnimatedStyle(() => ({ width: width * f.value, height: 1.5 + f.value * 5, marginTop: -(1.5 + f.value * 5) / 2 }));
  const col = over ? pal.danger : pal.primary;
  return (
    <View style={{ width, height: h }}>
      <Svg width={width} height={h} viewBox={`0 0 ${width} ${h}`} style={{ position: 'absolute' }}>
        {/* gezegen halkası: hıza tepki vermeyen sabit, çok soluk */}
        <Ellipse cx={width / 2} cy={lineY} rx={width * 0.46} ry={h * 0.08} stroke={alpha(pal.holo, 0.22)} strokeWidth={0.8} fill="none" />
        <Line x1={0} y1={lineY} x2={width} y2={lineY} stroke={alpha(pal.dim, 0.9)} strokeWidth={0.8} />
        {Array.from({ length: 11 }, (_, i) => (
          <Line key={i} x1={(width * (i + 0.5)) / 11} x2={(width * (i + 0.5)) / 11} y1={lineY + 5} y2={lineY + 8} stroke={alpha(pal.dim, 0.9)} strokeWidth={0.8} />
        ))}
      </Svg>
      <View pointerEvents="none" style={{ position: 'absolute', top: lineY, left: 0, right: 0, alignItems: 'center' }}>
        <Animated.View style={[{ backgroundColor: col, borderRadius: 1 }, barStyle]} />
      </View>
      <CenterBox top={0} height={lineY - h * 0.04}>
        {center ?? <Readout value={shown} height={h * 0.52} pal={pal} glyph={glyph} unit={unit} over={over} glow={false} unitGap={0.06} />}
      </CenterBox>
    </View>
  );
});

// ---------------------------------------------------------------------------
// 5) Hyperdrive — Warp
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

export function Gauge({ kind, ...p }: GaugeProps & { kind: GaugeKind }) {
  switch (kind) {
    case 'core':
      return <CoreGauge {...p} />;
    case 'orbit':
      return <OrbitGauge {...p} />;
    case 'horizon':
      return <HorizonGauge {...p} />;
    case 'warp':
      return <WarpGauge {...p} />;
    default:
      return <BladeGauge {...p} />;
  }
}
