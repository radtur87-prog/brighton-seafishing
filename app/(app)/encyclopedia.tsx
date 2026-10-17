import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { colors, radius, spacing } from '@/constants/theme';
import { Button, ChipGroup, ErrorText, Field, Label, Sheet, ui } from '@/components/ui';
import { STATUS_COLORS } from '@/components/WaterChart';
import {
  CARE_LABELS,
  searchSpecies,
  SPECIES_BY_ID,
  TEMPERAMENT_LABELS,
  ZONE_LABELS,
  type Species,
} from '@/constants/species';
import { checkCompatibility, resolveStock, type StockEntry } from '@/lib/compatibility';
import { loadOverview, type Overview } from '@/lib/overview';
import { addFish } from '@/lib/queries';
import { errorMessage } from '@/lib/errors';
import { canAssess, latestValues } from '@/lib/water';

type Filter = 'all' | 'easy' | 'peaceful' | 'small';

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'Všetky' },
  { value: 'easy', label: 'Pre začiatočníkov' },
  { value: 'peaceful', label: 'Mierumilovné' },
  { value: 'small', label: 'Do 60 l' },
];

const fmt = (n: number) => String(n).replace('.', ',');
const span = ([a, b]: [number, number]) => `${fmt(a)}–${fmt(b)}`;

export default function EncyclopediaScreen() {
  const params = useLocalSearchParams<{ species?: string }>();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [openId, setOpenId] = useState<string | null>(params.species ?? null);
  const [data, setData] = useState<Overview | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await loadOverview());
    } catch {
      // The catalogue works without tank data; compatibility just is not shown.
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const list = useMemo(
    () =>
      searchSpecies(query).filter((s) =>
        filter === 'easy'
          ? s.care === 'easy'
          : filter === 'peaceful'
            ? s.temperament === 'peaceful'
            : filter === 'small'
              ? s.minLiters <= 60
              : true
      ),
    [query, filter]
  );

  const open = openId ? SPECIES_BY_ID[openId] : null;

  return (
    <ScrollView style={ui.screen} contentContainerStyle={ui.content} keyboardShouldPersistTaps="handled">
      <Field placeholder="Hľadaj druh (napr. neónka, guppy, krevetka)" value={query} onChangeText={setQuery} testID="species-search" />
      <ChipGroup options={FILTERS} value={filter} onChange={setFilter} />
      <Text style={ui.muted}>{list.length} druhov · ťukni na druh pre detail a kontrolu s tvojím akváriom</Text>

      <View style={styles.grid}>
        {list.map((s) => (
          <Pressable key={s.id} style={styles.card} onPress={() => setOpenId(s.id)} testID="species-card" accessibilityRole="button">
            <Text style={styles.emoji}>{s.emoji}</Text>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.name}>{s.name}</Text>
              <Text style={styles.latin}>{s.latin}</Text>
              <Text style={ui.muted}>
                {fmt(s.sizeCm)} cm · {span(s.temp)} °C · pH {span(s.ph)} · od {s.minLiters} l
              </Text>
              <View style={styles.tags}>
                <Tag text={TEMPERAMENT_LABELS[s.temperament]} color={s.temperament === 'peaceful' ? colors.ok : s.temperament === 'semi' ? colors.warning : colors.danger} />
                {s.minGroup > 1 && <Tag text={`skupina ${s.minGroup}+`} />}
                {s.care === 'easy' && <Tag text="ľahký chov" />}
              </View>
            </View>
          </Pressable>
        ))}
      </View>
      {list.length === 0 && <Text style={ui.body}>Nič som nenašiel. Skús iný názov.</Text>}

      <SpeciesSheet species={open} data={data} onClose={() => setOpenId(null)} onAdded={load} />
    </ScrollView>
  );
}

function Tag({ text, color = colors.textMuted }: { text: string; color?: string }) {
  return (
    <View style={[styles.tag, { borderColor: color }]}>
      <Text style={[styles.tagText, { color }]}>{text}</Text>
    </View>
  );
}

function SpeciesSheet({
  species,
  data,
  onClose,
  onAdded,
}: {
  species: Species | null;
  data: Overview | null;
  onClose: () => void;
  onAdded: () => void;
}) {
  const tanks = data?.summaries.map((s) => s.tank) ?? [];
  const [tankId, setTankId] = useState<string | null>(null);
  const [count, setCount] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [lastSpecies, setLastSpecies] = useState<string | null>(null);

  // Reset the form whenever a different species is opened.
  if (species && species.id !== lastSpecies) {
    setLastSpecies(species.id);
    setCount(String(species.minGroup));
    setMessage(null);
  }
  const selectedTankId = tankId && tanks.some((t) => t.id === tankId) ? tankId : (tanks[0]?.id ?? null);
  const tank = tanks.find((t) => t.id === selectedTankId) ?? null;
  const n = Math.max(1, Math.round(Number(count)) || 1);

  // What the tank would look like with this species added.
  const preview = useMemo(() => {
    if (!species || !tank || !data) return null;
    const { entries } = resolveStock(data.fish.filter((f) => f.tank_id === tank.id));
    const existing = entries.find((e) => e.species.id === species.id);
    const next: StockEntry[] = existing
      ? entries.map((e) => (e === existing ? { ...e, count: e.count + n } : e))
      : [...entries, { species, count: n }];
    const water = canAssess(tank.water_type) ? latestValues(data.waterTests.filter((t) => t.tank_id === tank.id)) : [];
    // Only issues that involve this species matter here.
    const short = species.name.replace(/\s*\(.*\)$/, '');
    return checkCompatibility(next, tank, water).filter((i) => i.text.includes(short));
  }, [species, tank, data, n]);

  async function handleAdd() {
    if (!species || !tank) return;
    setBusy(true);
    setMessage(null);
    try {
      await addFish({ tank_id: tank.id, species: species.name, nickname: null, count: n });
      setMessage({ ok: true, text: `Pridané: ${n}× do ${tank.name}.` });
      onAdded();
    } catch (e) {
      setMessage({ ok: false, text: errorMessage(e, 'Nepodarilo sa pridať.') });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet visible={species !== null} title={species?.name ?? ''} onClose={onClose}>
      {species && (
        <View style={{ gap: spacing.sm }} testID="species-detail">
          <Text style={styles.latin}>{species.latin}</Text>
          <Text style={ui.body}>{species.note}</Text>
          <View style={styles.facts}>
            <Fact label="Veľkosť" value={`${fmt(species.sizeCm)} cm`} />
            <Fact label="Teplota" value={`${span(species.temp)} °C`} />
            <Fact label="pH" value={span(species.ph)} />
            <Fact label="Tvrdosť GH" value={`${span(species.gh)} °dH`} />
            <Fact label="Akvárium" value={`od ${species.minLiters} l`} />
            <Fact label="Skupina" value={species.minGroup > 1 ? `aspoň ${species.minGroup} ks` : 'aj samostatne'} />
            <Fact label="Povaha" value={TEMPERAMENT_LABELS[species.temperament]} />
            <Fact label="Zóna" value={ZONE_LABELS[species.zone]} />
            <Fact label="Náročnosť" value={CARE_LABELS[species.care]} />
          </View>
          <Label>Krmivo</Label>
          <Text style={ui.body}>{species.diet}</Text>

          {tanks.length > 0 && (
            <View style={[ui.card, { gap: spacing.sm, marginTop: spacing.sm }]}>
              <Text style={styles.sectionTitle}>Hodí sa do môjho akvária?</Text>
              {tanks.length > 1 && (
                <ChipGroup options={tanks.map((t) => ({ value: t.id, label: t.name }))} value={selectedTankId ?? ''} onChange={setTankId} />
              )}
              <Field label="Počet kusov" keyboardType="number-pad" value={count} onChangeText={setCount} testID="species-count" />
              {preview && preview.length === 0 && (
                <Text style={{ color: colors.ok, fontSize: 14 }} testID="species-fits">
                  ✓ Do {tank?.name} sa hodí.
                </Text>
              )}
              {preview?.map((issue) => (
                <Text key={issue.text} style={styles.issue} testID="species-issue">
                  <Text style={{ color: STATUS_COLORS[issue.level], fontWeight: '700' }}>
                    {issue.level === 'danger' ? 'Nebezpečné: ' : 'Pozor: '}
                  </Text>
                  {issue.text}
                </Text>
              ))}
              {message && <Text style={{ color: message.ok ? colors.ok : colors.danger }}>{message.text}</Text>}
              <Button
                label={busy ? 'Pridávam...' : `Pridať do ${tank?.name ?? 'akvária'}`}
                onPress={handleAdd}
                disabled={busy}
                testID="add-species-to-tank"
              />
            </View>
          )}
          {data && tanks.length === 0 && <ErrorText>Najprv si pridaj akvárium na hlavnej strane.</ErrorText>}
        </View>
      )}
    </Sheet>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.fact}>
      <Text style={styles.factLabel}>{label}</Text>
      <Text style={styles.factValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  card: {
    flexGrow: 1,
    flexBasis: 320,
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  emoji: { fontSize: 30 },
  name: { color: colors.text, fontSize: 16, fontWeight: '700' },
  latin: { color: colors.textMuted, fontSize: 13, fontStyle: 'italic' },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  tag: { borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  tagText: { fontSize: 11, fontWeight: '600' },
  facts: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  fact: {
    flexBasis: '30%',
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  factLabel: { color: colors.textMuted, fontSize: 11 },
  factValue: { color: colors.text, fontSize: 14, fontWeight: '700' },
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  issue: { color: colors.text, fontSize: 13, lineHeight: 19 },
});
