import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ComponentProps, ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { alpha, type GlyphStyle, type NexusPalette } from '@/features/nexus/themes';
import { NxNumber } from './NxNumber';

/** HUD etiket yazısı: dar, geniş aralıklı, büyük harf */
export const LABEL_FONT = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'ui-monospace, Menlo, monospace' });

export function NxLabel({
  children,
  color,
  size = 10,
  spacing = 2.2,
  weight = '700',
  style,
  numberOfLines = 1,
}: {
  children: ReactNode;
  color: string;
  size?: number;
  spacing?: number;
  weight?: TextStyle['fontWeight'];
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
}) {
  return (
    <Text
      numberOfLines={numberOfLines}
      allowFontScaling={false}
      style={[{ color, fontSize: size, letterSpacing: spacing, fontWeight: weight, fontFamily: LABEL_FONT, textTransform: 'uppercase' }, style]}
    >
      {children}
    </Text>
  );
}

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];
export function NxIcon({ name, size = 18, color }: { name: string; size?: number; color: string }) {
  return <MaterialCommunityIcons name={name as IconName} size={size} color={color} />;
}

/**
 * Şeffaf dijital katman: ince çerçeve + parlak köşe işaretleri. Gölge/blur yok (performans).
 * chamfer > 0 ise köşeler pahlı görünür (köşe işaretleri çapraz).
 */
export function Panel({
  pal,
  children,
  style,
  chamfer = 8,
  accent,
  corners = true,
}: {
  pal: NexusPalette;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  chamfer?: number;
  accent?: string;
  corners?: boolean;
}) {
  const a = accent ?? pal.primary;
  const k = 9;
  const cs = { position: 'absolute' as const, width: k, height: k, borderColor: a };
  return (
    <View style={[{ backgroundColor: pal.glass, borderWidth: StyleSheet.hairlineWidth, borderColor: alpha(a, 0.28), borderRadius: chamfer > 14 ? chamfer : 2 }, style]}>
      {corners ? (
        <>
          <View pointerEvents="none" style={[cs, { left: -1, top: -1, borderLeftWidth: 2, borderTopWidth: 2 }]} />
          <View pointerEvents="none" style={[cs, { right: -1, bottom: -1, borderRightWidth: 2, borderBottomWidth: 2 }]} />
        </>
      ) : null}
      {children}
    </View>
  );
}

/** Tek veri: etiket + özel rakamlar + birim */
export function DataCell({
  label,
  value,
  unit,
  pal,
  glyph,
  size = 26,
  align = 'flex-start',
  color,
  icon,
}: {
  label: string;
  value: string;
  unit?: string;
  pal: NexusPalette;
  glyph: GlyphStyle;
  size?: number;
  align?: 'flex-start' | 'center' | 'flex-end';
  color?: string;
  icon?: string;
}) {
  return (
    <View style={{ alignItems: align }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: size * 0.22 }}>
        {icon ? <NxIcon name={icon} size={11} color={pal.primary} /> : <View style={{ width: 5, height: 5, backgroundColor: pal.primary, transform: [{ rotate: '45deg' }] }} />}
        <NxLabel color={pal.dim} size={9.5}>
          {label}
        </NxLabel>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 5 }}>
        <NxNumber text={value} height={size} color={color ?? pal.text} style={glyph} />
        {unit ? (
          <NxLabel color={pal.dim} size={Math.max(9, size * 0.34)} spacing={1} style={{ marginBottom: -1 }}>
            {unit}
          </NxLabel>
        ) : null}
      </View>
    </View>
  );
}

/** Küçük, zarif yuvarlak/pahlı kontrol */
export function HudButton({
  icon,
  onPress,
  pal,
  label,
  size = 40,
  active,
  disabled,
}: {
  icon: string;
  onPress: () => void;
  pal: NexusPalette;
  label?: string;
  size?: number;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      style={({ pressed }) => ({
        height: size,
        minWidth: size,
        paddingHorizontal: label ? 12 : 0,
        borderRadius: size / 2,
        flexDirection: 'row',
        gap: 6,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: active ? pal.primary : alpha(pal.primary, 0.3),
        backgroundColor: active ? alpha(pal.primary, 0.16) : pressed ? alpha(pal.primary, 0.12) : 'rgba(0,0,0,0.55)',
        opacity: disabled ? 0.35 : 1,
      })}
    >
      <NxIcon name={icon} size={size * 0.46} color={active ? pal.primary : pal.text} />
      {label ? (
        <NxLabel color={active ? pal.primary : pal.text} size={10}>
          {label}
        </NxLabel>
      ) : null}
    </Pressable>
  );
}

/** Seçenek grubu (ayarlar) */
export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  pal,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  pal: NexusPalette;
}) {
  return (
    <View style={{ flexDirection: 'row', borderWidth: 1, borderColor: alpha(pal.primary, 0.25), borderRadius: 3, padding: 3, gap: 3 }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={String(o.value)}
            onPress={() => onChange(o.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            style={{
              flex: 1,
              paddingVertical: 9,
              alignItems: 'center',
              borderRadius: 2,
              backgroundColor: on ? alpha(pal.primary, 0.18) : 'transparent',
              borderWidth: 1,
              borderColor: on ? pal.primary : 'transparent',
            }}
          >
            <NxLabel color={on ? pal.primary : pal.dim} size={10} spacing={1.2}>
              {o.label}
            </NxLabel>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Aç/kapa anahtarı (dijital kayar) */
export function NxSwitch({ value, onChange, pal }: { value: boolean; onChange: (v: boolean) => void; pal: NexusPalette }) {
  return (
    <Pressable
      onPress={() => onChange(!value)}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      hitSlop={10}
      style={{ width: 50, height: 24, borderRadius: 2, borderWidth: 1, borderColor: value ? pal.primary : alpha(pal.dim, 0.7), padding: 3, justifyContent: 'center' }}
    >
      <View
        style={{
          width: 20,
          height: 16,
          backgroundColor: value ? pal.primary : pal.dim,
          alignSelf: value ? 'flex-end' : 'flex-start',
          borderRadius: 1,
        }}
      />
    </Pressable>
  );
}

/** − değer + ayarı (hız uyarısı, parlaklık) */
export function Stepper({ value, onMinus, onPlus, pal, minusDisabled, plusDisabled }: { value: string; onMinus: () => void; onPlus: () => void; pal: NexusPalette; minusDisabled?: boolean; plusDisabled?: boolean }) {
  const btn = (icon: string, onPress: () => void, disabled?: boolean, label?: string) => (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      style={({ pressed }) => ({
        width: 52,
        height: 48,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: alpha(pal.primary, 0.45),
        backgroundColor: pressed ? alpha(pal.primary, 0.25) : alpha(pal.primary, 0.1),
        opacity: disabled ? 0.35 : 1,
        borderRadius: 4,
      })}
    >
      <NxIcon name={icon} size={24} color={pal.text} />
    </Pressable>
  );
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      {btn('minus', onMinus, minusDisabled, 'Azalt')}
      <View style={{ flex: 1, height: 48, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: alpha(pal.primary, 0.25), backgroundColor: pal.glass, borderRadius: 4 }}>
        <NxLabel color={pal.text} size={15} spacing={2} weight="800">
          {value}
        </NxLabel>
      </View>
      {btn('plus', onPlus, plusDisabled, 'Artır')}
    </View>
  );
}

/** Simgeli seçenek kartları (ekran içeriği, mod) */
export function OptionCards<T extends string>({ options, value, onChange, pal }: { options: { value: T; label: string; icon: string }[]; value: T; onChange: (v: T) => void; pal: NexusPalette }) {
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            style={{
              flex: 1,
              paddingVertical: 12,
              alignItems: 'center',
              gap: 6,
              borderRadius: 4,
              borderWidth: 1,
              borderColor: on ? pal.primary : alpha(pal.primary, 0.2),
              backgroundColor: on ? alpha(pal.primary, 0.22) : pal.glass,
            }}
          >
            <NxIcon name={o.icon} size={20} color={on ? pal.primary : pal.text} />
            <NxLabel color={on ? pal.primary : pal.text} size={9.5} spacing={1}>
              {o.label}
            </NxLabel>
          </Pressable>
        );
      })}
    </View>
  );
}
