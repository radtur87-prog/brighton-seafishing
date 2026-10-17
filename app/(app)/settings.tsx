import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { colors, radius, spacing } from '@/constants/theme';
import { useAuth } from '@/lib/AuthContext';
import { ensureNotificationPermission, getNotificationStatus, type NotificationStatus } from '@/lib/notifications';

const STATUS_LABELS: Record<NotificationStatus, string> = {
  granted: '✅ Povolené',
  denied: '❌ Nepovolené',
  unsupported: 'Dostupné len v mobilnej appke',
};

export default function SettingsScreen() {
  const { user, signOut } = useAuth();
  const [status, setStatus] = useState<NotificationStatus | null>(null);

  useFocusEffect(
    useCallback(() => {
      getNotificationStatus()
        .then(setStatus)
        .catch(() => setStatus('unsupported'));
    }, [])
  );

  async function handleRequestPermission() {
    const granted = await ensureNotificationPermission();
    setStatus(granted ? 'granted' : 'denied');
  }

  return (
    <View style={styles.container}>

      <View style={styles.card}>
        <Text style={styles.label}>Prihlásený ako</Text>
        <Text style={styles.value} testID="settings-email">
          {user?.email}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Pripomienky (notifikácie)</Text>
        <Text style={styles.value}>{status ? STATUS_LABELS[status] : 'Zisťujem stav...'}</Text>
        {status === 'denied' && (
          <Pressable style={styles.secondaryButton} onPress={handleRequestPermission}>
            <Text style={styles.secondaryButtonText}>Povoliť notifikácie</Text>
          </Pressable>
        )}
      </View>

      <Pressable style={styles.signOutButton} onPress={signOut} testID="sign-out">
        <Text style={styles.signOutText}>Odhlásiť sa</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent', paddingTop: spacing.md, paddingHorizontal: spacing.lg },
  title: { fontSize: 26, fontWeight: '700', color: colors.text, marginBottom: spacing.lg },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  label: { color: colors.textMuted, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  value: { color: colors.text, fontSize: 16, fontWeight: '600', marginTop: 4 },
  secondaryButton: {
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
    backgroundColor: colors.primaryDark,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },
  secondaryButtonText: { color: colors.text, fontWeight: '600', fontSize: 13 },
  signOutButton: {
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  signOutText: { color: colors.danger, fontWeight: '700', fontSize: 15 },
});
