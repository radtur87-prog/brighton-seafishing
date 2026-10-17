import { useCallback, useState } from 'react';
import { Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { colors, radius, spacing } from '@/constants/theme';
import { AddTankCard, TankCard } from '@/components/TankCard';
import { TankFormSheet } from '@/components/TankForms';
import { ErrorText, GLASS, SectionTitle, ui } from '@/components/ui';
import { Bubbles } from '@/components/Bubbles';
import { FILL_IMAGE } from '@/components/PhotoBackdrop';
import { BACKGROUNDS } from '@/constants/backgrounds';
import { greeting, tipOfDay } from '@/lib/greeting';
import { BADGES } from '@/lib/agenda';
import { loadOverview, type Overview } from '@/lib/overview';
import { errorMessage } from '@/lib/errors';
import { plural } from '@/lib/time';
import { CLEANING_TASK_LABELS } from '@/types/database';

export default function TanksHome() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const now = new Date();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setError(null);
      setData(await loadOverview());
    } catch (e) {
      setError(errorMessage(e, 'Akváriá sa nepodarilo načítať.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const summaries = data?.summaries ?? [];
  const totalLiters = summaries.reduce((sum, s) => sum + (s.tank.volume_liters ?? 0), 0);
  const totalFish = summaries.reduce((sum, s) => sum + s.fishTotal, 0);
  const tasks = (data?.agenda ?? []).filter((i) => i.kind !== 'lighting');
  // On phones the cards scroll sideways like the sketch; wide screens wrap them into a grid.
  const scrollCards = width < 700;
  const heroHeight = width < 700 ? 260 : 340;
  const tip = tipOfDay(now);

  const cards = (
    <>
      {summaries.map((s) => (
        <TankCard key={s.tank.id} summary={s} now={now} onPress={() => router.push(`/tank/${s.tank.id}`)} />
      ))}
      <AddTankCard onPress={() => setShowForm(true)} />
    </>
  );

  return (
    <ScrollView
      style={ui.screen}
      contentContainerStyle={ui.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primary} />}
    >
      <View style={[styles.hero, { height: heroHeight }]} testID="home-hero">
        <Image source={BACKGROUNDS.home} style={FILL_IMAGE} resizeMode="cover" accessibilityLabel="Zarastené akvárium s rybkami" />
        <LinearGradient colors={['rgba(3,13,22,0.05)', 'rgba(3,13,22,0.35)', 'rgba(3,13,22,0.92)']} style={StyleSheet.absoluteFill} />
        <Bubbles height={heroHeight} />
        <View style={styles.heroText}>
          <Text style={styles.heroGreeting} testID="home-greeting">
            {greeting(now)} 👋
          </Text>
          <Text style={styles.heroTitle}>AquaCare</Text>
          <Text style={styles.heroSub}>Tvoje akváriá pod kontrolou</Text>
        </View>
      </View>

      <View style={[ui.card, styles.tip]} testID="tip-of-day">
        <Text style={styles.tipEmoji}>💡</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.tipLabel}>Tip dňa · {tip.topic}</Text>
          <Text style={ui.body}>{tip.text}</Text>
        </View>
      </View>

      {data && (
        <View style={styles.stats} testID="home-stats">
          <Stat value={summaries.length} label={plural(summaries.length, 'akvárium', 'akváriá', 'akvárií')} />
          <Stat value={totalLiters} label={plural(totalLiters, 'liter', 'litre', 'litrov')} />
          <Stat value={totalFish} label={plural(totalFish, 'ryba', 'ryby', 'rýb')} />
          <Stat value={tasks.length} label={plural(tasks.length, 'úloha dnes', 'úlohy dnes', 'úloh dnes')} warn={tasks.length > 0} />
        </View>
      )}
      {error && <ErrorText>{error}</ErrorText>}

      {scrollCards ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cardRow}>
          {cards}
        </ScrollView>
      ) : (
        <View style={styles.cardGrid}>{cards}</View>
      )}

      {data && summaries.length > 0 && (
        <View style={ui.card}>
          <SectionTitle
            right={
              <Pressable onPress={() => router.push('/calendar')} style={styles.link} testID="open-calendar">
                <Text style={styles.linkText}>Kalendár</Text>
                <ChevronRight color={colors.primary} size={16} />
              </Pressable>
            }
          >
            Dnes treba urobiť
          </SectionTitle>
          {tasks.length === 0 ? (
            <Text style={[ui.muted, { marginTop: spacing.sm }]}>Všetko hotové 🎉</Text>
          ) : (
            tasks.slice(0, 5).map((item) => (
              <View key={item.id} style={styles.taskRow}>
                <Text style={styles.taskBadge}>{BADGES[item.kind]}</Text>
                <Text style={styles.taskText} numberOfLines={1}>
                  {item.kind === 'feeding'
                    ? `${item.schedule.time_of_day.slice(0, 5)} ${item.schedule.food_type ?? 'kŕmenie'}`
                    : item.kind === 'cleaning'
                      ? CLEANING_TASK_LABELS[item.schedule.task_type]
                      : ''}
                  {' · '}
                  {item.tankName}
                </Text>
              </View>
            ))
          )}
        </View>
      )}

      <TankFormSheet
        visible={showForm}
        onClose={() => setShowForm(false)}
        onSaved={(tank) => {
          setShowForm(false);
          router.push(`/tank/${tank.id}`);
        }}
      />
    </ScrollView>
  );
}

function Stat({ value, label, warn }: { value: number; label: string; warn?: boolean }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, warn && { color: colors.warning }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: radius.lg, overflow: 'hidden', justifyContent: 'flex-end', backgroundColor: colors.surfaceAlt },
  heroText: { padding: spacing.lg },
  heroGreeting: { color: '#CFEFF2', fontSize: 16, fontWeight: '600' },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 44,
    fontWeight: '900',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 12,
  },
  heroSub: { color: '#D7ECF0', fontSize: 15, marginTop: 2 },
  tip: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  tipEmoji: { fontSize: 26 },
  tipLabel: { color: colors.primary, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', marginBottom: 2 },
  stats: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    ...GLASS,
  },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { color: colors.text, fontSize: 22, fontWeight: '800', fontVariant: ['tabular-nums'] },
  statLabel: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  cardRow: { gap: spacing.md, paddingRight: spacing.md },
  cardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  link: { flexDirection: 'row', alignItems: 'center' },
  linkText: { color: colors.primary, fontWeight: '600' },
  taskRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
  taskBadge: { color: colors.primary, fontSize: 12, fontWeight: '700', width: 92 },
  taskText: { color: colors.text, fontSize: 14, flex: 1 },
});
