import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { colors, spacing } from '@/constants/theme';
import { ErrorText, ui } from '@/components/ui';
import { loadOverview, type Overview } from '@/lib/overview';
import { errorMessage } from '@/lib/errors';
import { plural } from '@/lib/time';

export default function StockScreen() {
  const router = useRouter();
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setError(null);
      setData(await loadOverview());
    } catch (e) {
      setError(errorMessage(e, 'Osádku sa nepodarilo načítať.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const total = data?.summaries.reduce((sum, s) => sum + s.fishTotal, 0) ?? 0;

  return (
    <ScrollView
      style={ui.screen}
      contentContainerStyle={ui.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primary} />}
    >
      {error && <ErrorText>{error}</ErrorText>}
      {data && (
        <Text style={ui.muted} testID="stock-total">
          Spolu {total} {plural(total, 'ryba', 'ryby', 'rýb')} v {data.summaries.length}{' '}
          {plural(data.summaries.length, 'akváriu', 'akváriách', 'akváriách')}
        </Text>
      )}
      {data?.summaries.length === 0 && <Text style={ui.body}>Najprv pridaj akvárium na hlavnej strane.</Text>}
      {data?.summaries.map((s) => {
        const fish = data.fish.filter((f) => f.tank_id === s.tank.id);
        return (
          <Pressable key={s.tank.id} style={ui.card} onPress={() => router.push(`/tank/${s.tank.id}`)}>
            <View style={styles.header}>
              <Text style={styles.tankName}>{s.tank.name}</Text>
              <Text style={ui.muted}>{s.fishTotal} ks</Text>
              <ChevronRight color={colors.textMuted} size={18} />
            </View>
            {fish.length === 0 && <Text style={ui.muted}>Žiadne ryby – pridáš ich v detaile akvária.</Text>}
            {fish.map((f) => (
              <Text key={f.id} style={[ui.body, styles.fish]}>
                {f.count}× {f.species}
                {f.nickname ? <Text style={ui.muted}>{` · ${f.nickname}`}</Text> : null}
              </Text>
            ))}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  tankName: { color: colors.text, fontSize: 17, fontWeight: '700', flex: 1 },
  fish: { marginTop: 4 },
});
