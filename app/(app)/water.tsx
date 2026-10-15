import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Plus, X } from 'lucide-react-native';
import { colors, radius, spacing } from '@/constants/theme';
import { Button, ChipGroup, ErrorText, SectionTitle, ui } from '@/components/ui';
import { STATUS_COLORS, WaterChart } from '@/components/WaterChart';
import { WaterTestSheet } from '@/components/WaterTestForm';
import { deleteWaterTest, fetchTanks, fetchWaterTests } from '@/lib/queries';
import { errorMessage } from '@/lib/errors';
import { timeAgo } from '@/lib/time';
import {
  canAssess,
  formatValue,
  latestValues,
  PARAM_BY_KEY,
  seriesFor,
  STATUS_LABELS,
  WATER_PARAMS,
  waterVerdict,
  type WaterStatus,
} from '@/lib/water';
import type { Tank, WaterParam, WaterTest } from '@/types/database';

const VERDICT_TEXT: Record<WaterStatus, string> = {
  ok: 'Voda je v poriadku',
  watch: 'Pozor na niektoré hodnoty',
  danger: 'Nebezpečné hodnoty – konaj hneď',
};

export default function WaterScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ tank?: string }>();
  const [tanks, setTanks] = useState<Tank[] | null>(null);
  const [tests, setTests] = useState<WaterTest[]>([]);
  const [tankId, setTankId] = useState<string | null>(null);
  const [chartParam, setChartParam] = useState<WaterParam>('ph');
  const [adding, setAdding] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const now = new Date();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await fetchTanks();
      setTanks(list);
      setTankId((current) =>
        list.some((t) => t.id === params.tank) ? params.tank! : list.some((t) => t.id === current) ? current : (list[0]?.id ?? null)
      );
      setTests(await fetchWaterTests());
    } catch (e) {
      setError(errorMessage(e, 'Hodnoty vody sa nepodarilo načítať.'));
    } finally {
      setLoading(false);
    }
  }, [params.tank]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function remove(id: string) {
    try {
      await deleteWaterTest(id);
      setTests((list) => list.filter((t) => t.id !== id));
    } catch (e) {
      setError(errorMessage(e, 'Meranie sa nepodarilo zmazať.'));
    }
  }

  if (tanks && tanks.length === 0) {
    return (
      <View style={[ui.screen, ui.content]}>
        <Text style={ui.body}>Najprv si pridaj akvárium, potom môžeš zapisovať hodnoty vody.</Text>
        <Button label="Pridať akvárium" onPress={() => router.replace('/')} />
      </View>
    );
  }

  const tank = tanks?.find((t) => t.id === tankId) ?? null;
  const own = tests.filter((t) => t.tank_id === tankId);
  const assess = tank ? canAssess(tank.water_type) : true;
  const latest = latestValues(own);
  const verdict = assess ? waterVerdict(own) : null;
  const history = [...own].sort((a, b) => b.measured_at.localeCompare(a.measured_at));

  return (
    <ScrollView
      style={ui.screen}
      contentContainerStyle={ui.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primary} />}
    >
      {tanks && tanks.length > 1 && (
        <ChipGroup options={tanks.map((t) => ({ value: t.id, label: t.name }))} value={tankId ?? ''} onChange={setTankId} />
      )}
      {error && <ErrorText>{error}</ErrorText>}

      {tank && (
        <View style={[ui.card, styles.verdictCard]} testID="water-verdict">
          <View style={{ flex: 1, minWidth: 200, gap: 4 }}>
            <Text style={styles.tankName}>{tank.name}</Text>
            {verdict ? (
              <>
                <View style={styles.verdictRow}>
                  <View style={[styles.bigDot, { backgroundColor: STATUS_COLORS[verdict.status] }]} />
                  <Text style={styles.verdictText}>{VERDICT_TEXT[verdict.status]}</Text>
                </View>
                <Text style={ui.muted}>Posledné meranie {timeAgo(verdict.measured_at, now)}</Text>
              </>
            ) : (
              <Text style={ui.muted}>
                {own.length === 0
                  ? 'Zatiaľ žiadne meranie. Zapíš výsledky z testovacieho prúžku alebo kvapkového testu.'
                  : 'Hodnotenie je nastavené pre sladkovodné akváriá.'}
              </Text>
            )}
          </View>
          <Button
            label="Zapísať meranie"
            icon={<Plus color={colors.background} size={18} />}
            onPress={() => setAdding(true)}
            testID="add-water-test"
          />
          {verdict?.problems.map((p) => (
            <Text key={p.param} style={styles.problem}>
              <Text style={{ color: STATUS_COLORS[p.status], fontWeight: '700' }}>
                {PARAM_BY_KEY[p.param].label} {formatValue(p.param, p.value)} – {STATUS_LABELS[p.status]}.{' '}
              </Text>
              {PARAM_BY_KEY[p.param].hint}
            </Text>
          ))}
        </View>
      )}

      {latest.length > 0 && (
        <View style={styles.tiles}>
          {latest.map((l) => {
            const spec = PARAM_BY_KEY[l.param];
            const selected = l.param === chartParam;
            return (
              <Pressable
                key={l.param}
                style={[styles.tile, selected && styles.tileSelected]}
                onPress={() => setChartParam(l.param)}
                testID={`tile-${l.param}`}
                accessibilityRole="button"
              >
                <Text style={styles.tileLabel}>{spec.label}</Text>
                <Text style={styles.tileValue}>{formatValue(l.param, l.value)}</Text>
                {assess && (
                  <View style={styles.statusRow}>
                    <View style={[styles.dot, { backgroundColor: STATUS_COLORS[l.status] }]} />
                    <Text style={styles.statusText}>{STATUS_LABELS[l.status]}</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      )}

      {own.length > 0 && (
        <View style={ui.card}>
          <SectionTitle>Vývoj v čase</SectionTitle>
          <View style={{ marginVertical: spacing.sm }}>
            <ChipGroup
              options={WATER_PARAMS.map((p) => ({ value: p.key, label: p.label }))}
              value={chartParam}
              onChange={setChartParam}
            />
          </View>
          <WaterChart spec={PARAM_BY_KEY[chartParam]} points={seriesFor(own, chartParam)} />
        </View>
      )}

      {history.length > 0 && (
        <View style={ui.card}>
          <SectionTitle>Denník meraní</SectionTitle>
          {history.map((t) => (
            <View key={t.id} style={styles.historyRow} testID="water-history-row">
              <View style={{ flex: 1 }}>
                <Text style={styles.historyDate}>{new Date(t.measured_at).toLocaleDateString('sk-SK')}</Text>
                <Text style={ui.muted}>
                  {WATER_PARAMS.filter((p) => t[p.key] !== null)
                    .map((p) => `${p.label.split(' ')[0]} ${formatValue(p.key, Number(t[p.key]))}`)
                    .join(' · ')}
                </Text>
                {t.note ? <Text style={styles.note}>{t.note}</Text> : null}
              </View>
              <Pressable onPress={() => remove(t.id)} hitSlop={10} accessibilityLabel="Zmazať meranie">
                <X color={colors.textMuted} size={16} />
              </Pressable>
            </View>
          ))}
        </View>
      )}

      <WaterTestSheet
        tankId={adding ? tankId : null}
        onClose={() => setAdding(false)}
        onSaved={(test) => {
          setAdding(false);
          setTests((list) => [...list, test]);
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  verdictCard: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.md },
  tankName: { color: colors.textMuted, fontSize: 13, fontWeight: '700', textTransform: 'uppercase' },
  verdictRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  verdictText: { color: colors.text, fontSize: 20, fontWeight: '800' },
  bigDot: { width: 14, height: 14, borderRadius: 7 },
  problem: { color: colors.textMuted, fontSize: 13, lineHeight: 19, width: '100%' },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tile: {
    flexGrow: 1,
    flexBasis: 140,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: 2,
  },
  tileSelected: { borderColor: colors.primary },
  tileLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  tileValue: { color: colors.text, fontSize: 20, fontWeight: '800', fontVariant: ['tabular-nums'] },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { color: colors.textMuted, fontSize: 12 },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  historyDate: { color: colors.text, fontSize: 15, fontWeight: '600' },
  note: { color: colors.text, fontSize: 13, marginTop: 2, fontStyle: 'italic' },
});
