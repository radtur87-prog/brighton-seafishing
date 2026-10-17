import { useState } from 'react';
import { Text } from 'react-native';
import { Link, useLocalSearchParams } from 'expo-router';
import { AuthShell } from '@/components/AuthShell';
import { Button, ErrorText, Field } from '@/components/ui';
import { colors } from '@/constants/theme';
import { useAuth } from '@/lib/AuthContext';

export default function ForgotPasswordScreen() {
  const { requestPasswordReset } = useAuth();
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(params.email ?? '');
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSend() {
    const address = email.trim();
    setError(null);
    if (!/^\S+@\S+\.\S+$/.test(address)) return setError('Zadaj platnú e-mailovú adresu.');
    setLoading(true);
    const message = await requestPasswordReset(address);
    setLoading(false);
    if (message) setError(message);
    else setSentTo(address);
  }

  return (
    <AuthShell title="Zabudnuté heslo" subtitle="Pošleme ti e-mail s odkazom na nastavenie nového hesla.">
      {sentTo ? (
        <Text style={{ color: colors.ok, fontSize: 15, lineHeight: 22 }} testID="reset-sent">
          Hotovo ✓ Poslali sme e-mail na {sentTo}. Otvor ho na tomto zariadení a klikni na odkaz „Reset Password“. Ak
          ho nevidíš do 2 minút, pozri priečinok Spam.
        </Text>
      ) : (
        <>
          <Field
            placeholder="E-mail"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            testID="reset-email"
          />
          {error && <ErrorText>{error}</ErrorText>}
          <Button label={loading ? 'Posielam...' : 'Poslať odkaz'} onPress={handleSend} disabled={loading} testID="reset-submit" />
        </>
      )}
      <Link href="/(auth)/sign-in" style={{ alignSelf: 'center', marginTop: 8 }} testID="back-to-sign-in">
        <Text style={{ color: colors.primary, fontSize: 14 }}>Späť na prihlásenie</Text>
      </Link>
    </AuthShell>
  );
}
