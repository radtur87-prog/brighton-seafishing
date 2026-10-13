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
import { colors, radius, spacing } from '@/constants/theme';

export default function SignUpScreen() {
  const { signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSignUp() {
    setError(null);
    setInfo(null);
    if (!email || !password) {
      setError('Zadaj e-mail aj heslo.');
      return;
    }
    if (password.length < 6) {
      setError('Heslo musí mať aspoň 6 znakov.');
      return;
    }
    setLoading(true);
    const message = await signUp(email.trim(), password);
    setLoading(false);
    if (message) {
      setError(message);
    } else {
      setInfo('Účet vytvorený. Ak je potrebné, potvrď e-mail a prihlás sa.');
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={styles.title}>Vytvor si účet</Text>
      <Text style={styles.subtitle}>Začni sledovať svoje akváriá v AquaCare</Text>

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="E-mail"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Heslo (min. 6 znakov)"
          placeholderTextColor={colors.textMuted}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        {error && <Text style={styles.error}>{error}</Text>}
        {info && <Text style={styles.info}>{info}</Text>}

        <Pressable style={styles.button} onPress={handleSignUp} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? 'Vytváram účet...' : 'Zaregistrovať sa'}</Text>
        </Pressable>

        <Link href="/(auth)/sign-in" style={styles.link}>
          <Text style={styles.linkText}>Už máš účet? Prihlás sa</Text>
        </Link>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  title: {
    fontSize: 28,
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
  info: {
    color: colors.ok,
    fontSize: 14,
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
