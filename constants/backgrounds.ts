import type { ImageSourcePropType } from 'react-native';

// Public-domain aquarium photos, ~1000–1200px WebP. Sources: assets/backgrounds/CREDITS.md
export const BACKGROUNDS = {
  home: require('../assets/backgrounds/home.webp'),
  auth: require('../assets/backgrounds/auth.webp'),
  plan: require('../assets/backgrounds/plan.webp'),
  water: require('../assets/backgrounds/water.webp'),
  stock: require('../assets/backgrounds/stock.webp'),
  encyclopedia: require('../assets/backgrounds/encyclopedia.webp'),
  analyze: require('../assets/backgrounds/analyze.webp'),
  faq: require('../assets/backgrounds/faq.webp'),
  tips: require('../assets/backgrounds/tips.webp'),
  calendar: require('../assets/backgrounds/calendar.webp'),
  settings: require('../assets/backgrounds/settings.webp'),
  tank: require('../assets/backgrounds/tank.webp'),
} satisfies Record<string, ImageSourcePropType>;

export type BackgroundTheme = keyof typeof BACKGROUNDS;
