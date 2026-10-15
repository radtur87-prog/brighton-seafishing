import {
  BookOpen,
  CalendarDays,
  Camera,
  CircleHelp,
  ClipboardList,
  Droplets,
  Fish,
  Lightbulb,
  Settings,
  Waves,
  type LucideIcon,
} from 'lucide-react-native';

export interface Section {
  /** Route file name inside app/(app). */
  name: string;
  href: string;
  label: string;
  icon: LucideIcon;
}

// Order matches the hand-drawn sidebar (1–10).
export const SECTIONS: Section[] = [
  { name: 'index', href: '/', label: 'Akváriá', icon: Waves },
  { name: 'plan', href: '/plan', label: 'Plán starostlivosti', icon: ClipboardList },
  { name: 'water', href: '/water', label: 'Hodnoty vody', icon: Droplets },
  { name: 'stock', href: '/stock', label: 'Osádka', icon: Fish },
  { name: 'encyclopedia', href: '/encyclopedia', label: 'Encyklopédia', icon: BookOpen },
  { name: 'analyze', href: '/analyze', label: 'Analýza', icon: Camera },
  { name: 'faq', href: '/faq', label: 'Časté otázky', icon: CircleHelp },
  { name: 'tips', href: '/tips', label: 'Tipy na starostlivosť', icon: Lightbulb },
  { name: 'calendar', href: '/calendar', label: 'Kalendár', icon: CalendarDays },
  { name: 'settings', href: '/settings', label: 'Nastavenia', icon: Settings },
];
