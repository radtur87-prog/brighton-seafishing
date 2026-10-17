import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '@/constants/theme';

/** Centered, narrow layout shared by the password screens. */
export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.inner}>
          <Text style={styles.brand}>🐠 AquaCare</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
          <View style={styles.form}>{children}</View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: spacing.lg },
  inner: { width: '100%', maxWidth: 420, alignSelf: 'center' },
  brand: { fontSize: 18, fontWeight: '700', color: colors.textMuted, textAlign: 'center' },
  title: { fontSize: 28, fontWeight: '800', color: colors.text, textAlign: 'center', marginTop: spacing.sm },
  subtitle: { fontSize: 15, color: colors.textMuted, textAlign: 'center', marginTop: spacing.xs, marginBottom: spacing.lg },
  form: { gap: spacing.md },
});
