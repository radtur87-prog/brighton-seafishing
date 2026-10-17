import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Link } from 'expo-router';
import { useAuth } from '@/lib/AuthContext';
import { authLinkError } from '@/lib/supabase';
import { colors, radius, spacing } from '@/constants/theme';

export default function SignInScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(authLinkError);
  const [loading, setLoading] = useState(false);

  async function handleSignIn() {
    setError(null);
    if (!email || !password) {
      setError('Zadaj e-mail aj heslo.');
      return;
    }
    setLoading(true);
    const message = await signIn(email.trim(), password);
    setLoading(false);
    if (message) setError(message);
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={styles.title}>🐠 AquaCare</Text>
      <Text style={styles.subtitle}>Prihlás sa a sleduj svoje akváriá</Text>

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="E-mail"
          testID="signin-email"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Heslo"
          testID="signin-password"
          placeholderTextColor={colors.textMuted}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        {error && <Text style={styles.error} testID="signin-error">{error}</Text>}

        <Pressable style={styles.button} onPress={handleSignIn} disabled={loading} testID="signin-submit">
          <Text style={styles.buttonText}>{loading ? 'Prihlasujem...' : 'Prihlásiť sa'}</Text>
        </Pressable>

        <Link
          href={{ pathname: '/(auth)/forgot-password', params: email.trim() ? { email: email.trim() } : {} }}
          style={styles.forgot}
          testID="forgot-password-link"
        >
          <Text style={styles.linkText}>Zabudnuté heslo?</Text>
        </Link>

        <Link href="/(auth)/sign-up" style={styles.link}>
          <Text style={styles.linkText}>Nemáš účet? Zaregistruj sa</Text>
        </Link>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
  },
  form: {
    gap: spacing.md,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    color: colors.text,
    fontSize: 16,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  buttonText: {
    color: '#04201C',
    fontWeight: '700',
    fontSize: 16,
  },
  error: {
    color: colors.danger,
    fontSize: 14,
  },
  forgot: {
    alignSelf: 'flex-end',
  },
  link: {
    marginTop: spacing.md,
    alignSelf: 'center',
  },
  linkText: {
    color: colors.primary,
    fontSize: 14,
  },
});
