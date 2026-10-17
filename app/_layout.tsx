import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { AuthProvider, useAuth } from '@/lib/AuthContext';

// Navigators stay transparent so each layout's aquarium photo shows through.
const NAV_THEME = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: 'transparent', card: '#061826', primary: '#2DD4BF' },
};

function RootNavigation() {
  const { session, loading, recovering } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const authScreen = (segments as string[])[1];

    // Opened from the reset e-mail: stay on "new password" until it is saved.
    if (recovering) {
      if (authScreen !== 'reset-password') router.replace('/(auth)/reset-password');
      return;
    }

    if (!session && !inAuthGroup) {
      router.replace('/(auth)/sign-in');
    } else if (session && inAuthGroup && authScreen !== 'reset-password') {
      router.replace('/(app)');
    }
  }, [session, loading, recovering, segments, router]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(app)" />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}

export default function RootLayout() {
  useFrameworkReady();

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#061826' }}>
      <ThemeProvider value={NAV_THEME}>
        <AuthProvider>
          <RootNavigation />
          <StatusBar style="light" />
        </AuthProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
