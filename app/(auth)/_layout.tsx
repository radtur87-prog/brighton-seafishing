import { View } from 'react-native';
import { Stack } from 'expo-router';
import { PhotoBackdrop } from '@/components/PhotoBackdrop';
import { colors } from '@/constants/theme';

export default function AuthLayout() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <PhotoBackdrop theme="auth" dim="soft" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: 'transparent' } }}>
        <Stack.Screen name="sign-in" />
        <Stack.Screen name="sign-up" />
        <Stack.Screen name="forgot-password" />
        <Stack.Screen name="reset-password" />
      </Stack>
    </View>
  );
}
