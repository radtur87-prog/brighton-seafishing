import { Image, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BACKGROUNDS, type BackgroundTheme } from '@/constants/backgrounds';
import { colors } from '@/constants/theme';

/** Explicit 100% size: on web the asset's intrinsic width/height would otherwise win over absoluteFill. */
export const FILL_IMAGE = { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' } as const;

/** Full-screen aquarium photo with a dark gradient so text on top stays readable. */
export function PhotoBackdrop({ theme, dim = 'strong' }: { theme: BackgroundTheme; dim?: 'strong' | 'soft' }) {
  return (
    <View style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]} pointerEvents="none" testID={`backdrop-${theme}`}>
      <Image source={BACKGROUNDS[theme]} style={FILL_IMAGE} resizeMode="cover" />
      <LinearGradient
        colors={
          dim === 'strong'
            ? ['rgba(3,13,22,0.58)', 'rgba(3,13,22,0.78)', 'rgba(3,13,22,0.93)']
            : ['rgba(3,13,22,0.25)', 'rgba(3,13,22,0.55)', 'rgba(3,13,22,0.9)']
        }
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

/** Which photo each route shows. */
export function themeForPath(pathname: string): BackgroundTheme {
  const first = pathname.split('/').filter(Boolean)[0] ?? '';
  switch (first) {
    case '':
      return 'home';
    case 'tank':
      return 'tank';
    case 'plan':
    case 'water':
    case 'stock':
    case 'encyclopedia':
    case 'analyze':
    case 'faq':
    case 'tips':
    case 'calendar':
    case 'settings':
      return first;
    default:
      return 'home';
  }
}

export const BACKDROP_BASE = colors.background;
