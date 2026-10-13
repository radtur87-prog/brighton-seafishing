import { Tabs } from 'expo-router';
import { LayoutDashboard, Waves, CalendarClock, Camera, Settings } from 'lucide-react-native';
import { colors } from '@/constants/theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Prehľad',
          tabBarIcon: ({ color, size }) => <LayoutDashboard color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="tanks"
        options={{
          title: 'Akváriá',
          tabBarIcon: ({ color, size }) => <Waves color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="schedule"
        options={{
          title: 'Plán',
          tabBarIcon: ({ color, size }) => <CalendarClock color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="analyze"
        options={{
          title: 'Analýza',
          tabBarIcon: ({ color, size }) => <Camera color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Nastavenia',
          tabBarIcon: ({ color, size }) => <Settings color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
