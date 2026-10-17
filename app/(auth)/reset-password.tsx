import { useState } from 'react';
import { Text } from 'react-native';
import { useRouter } from 'expo-router';
import { AuthShell } from '@/components/AuthShell';
import { Button, ErrorText, Field } from '@/components/ui';
import { colors } from '@/constants/theme';
import { useAuth } from '@/lib/AuthContext';

export default function ResetPasswordScreen() {
  const { session, updatePassword } = useAuth();
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    setError(null);
    if (password.length < 6) return setError('Heslo musí mať aspoň 6 znakov.');
    if (password !== confirm) return setError('Heslá sa nezhodujú.');
    setLoading(true);
    const message = await updatePassword(password);
    setLoading(false);
    if (message) setError(message);
    else router.replace('/(app)');
  }

  if (!session) {
    return (
      <AuthShell title="Nové heslo" subtitle="Odkaz je neplatný alebo už vypršal.">
        <Button label="Poslať nový odkaz" onPress={() => router.replace('/(auth)/forgot-password')} />
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Nové heslo" subtitle={`Nastav si nové heslo pre ${session.user.email ?? 'svoj účet'}.`}>
      <Field placeholder="Nové heslo (aspoň 6 znakov)" secureTextEntry value={password} onChangeText={setPassword} testID="new-password" />
      <Field placeholder="Zopakuj heslo" secureTextEntry value={confirm} onChangeText={setConfirm} testID="new-password-confirm" />
      {error && <ErrorText>{error}</ErrorText>}
      <Button label={loading ? 'Ukladám...' : 'Uložiť heslo a prihlásiť'} onPress={handleSave} disabled={loading} testID="save-new-password" />
      <Text style={{ color: colors.textMuted, fontSize: 13, textAlign: 'center' }}>Po uložení ťa appka rovno prihlási.</Text>
    </AuthShell>
  );
}
