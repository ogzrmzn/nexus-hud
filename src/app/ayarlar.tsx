import { router } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ControlContent } from '@/components/nexus/HudDrawer';
import { HudButton, NxLabel } from '@/components/nexus/primitives';
import { alpha } from '@/features/nexus/themes';
import { useNexus } from '@/features/nexus/useNexus';

/** Ayarlar: sağdan açılan kontrol paneliyle aynı içerik (ana sayfadan erişim için) */
export default function NexusSettingsScreen() {
  const { upal: pal } = useNexus();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: pal.bg }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 12,
          paddingBottom: insets.bottom + 40,
          paddingLeft: insets.left + 20,
          paddingRight: insets.right + 20,
          maxWidth: 720,
          width: '100%',
          alignSelf: 'center',
        }}
      >
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
        </View>
        <ControlContent />
        <View style={{ marginTop: 18, borderTopWidth: 1, borderColor: alpha(pal.dim, 0.5), paddingTop: 12 }}>
          <NxLabel color={pal.dim} size={8.5} spacing={1} style={{ textTransform: 'none' }} numberOfLines={4}>
            {'NEXUS HUD hızı telefonun GPS\'inden ölçer. GPS verisi yoksa ya da doğruluk yetersizse hız yerine "--" gösterilir. Aynı ayarlar sürüş ekranındaki PANEL düğmesinden de açılır.'}
          </NxLabel>
        </View>
      </ScrollView>
    </View>
  );
}
