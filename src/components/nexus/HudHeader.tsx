import { router } from 'expo-router';
import { View } from 'react-native';
import type { GlyphStyle, NexusPalette } from '@/features/nexus/themes';
import type { NexusGps } from '@/features/nexus/useNexusGps';
import type { NexusWeather } from '@/features/nexus/useNexusWeather';
import { SignalIndicator } from './Instruments';
import { HudButton, NxIcon, NxLabel } from './primitives';
import { LiveClock } from './Live';

/**
 * Tüm sürüş ekranlarında (Windshield dahil) aynı üst çubuk: geri, GPS sinyali, ortada saat,
 * hava durumu, yolculuğu sıfırla (dururken) ve kontrol paneli. Cama yansıtma bu çubuğu çevirmez.
 */
export function HudHeader({
  pal,
  gps,
  showGps,
  showClock,
  clockHeight,
  glyph,
  weather,
  moving,
  onPanel,
}: {
  pal: NexusPalette;
  gps: NexusGps;
  showGps: boolean;
  showClock: boolean;
  clockHeight: number;
  glyph: GlyphStyle;
  weather?: NexusWeather | null;
  moving: boolean;
  onPanel: () => void;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 40 }}>
      <HudButton icon="arrow-left" pal={pal} size={36} onPress={() => router.back()} />
      {showGps ? <SignalIndicator status={gps.status} accuracy={gps.accuracy} pal={pal} /> : null}
      <View style={{ flex: 1, alignItems: 'center' }}>
        {showClock ? <LiveClock height={clockHeight} color={pal.text} glyph={glyph} /> : null}
      </View>
      {weather ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <NxIcon name={weather.icon} size={16} color={pal.secondary} />
          <NxLabel color={pal.text} size={11} spacing={1}>
            {`${weather.temp}°`}
          </NxLabel>
        </View>
      ) : null}
      {moving ? null : <HudButton icon="restart" pal={pal} size={36} onPress={gps.resetTrip} />}
      <HudButton icon="menu" pal={pal} size={36} label="PANEL" active onPress={onPanel} />
    </View>
  );
}
