import type { ReactNode } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Droplets, Fish, ListChecks, Plus, Sparkles } from 'lucide-react-native';
import { colors, radius, spacing } from '@/constants/theme';
import { useSignedUrl } from '@/lib/storage';
import { tankAge, timeAgo } from '@/lib/time';
import type { TankSummary } from '@/lib/tankSummary';

export const CARD_WIDTH = 300;

function Row({ icon, label, value, highlight }: { icon: ReactNode; label: string; value: string; highlight?: boolean }) {
  return (
    <View style={styles.row}>
      {icon}
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, highlight && { color: colors.warning }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

export function TankCover({ path, height, children }: { path: string | null; height: number; children?: ReactNode }) {
  const url = useSignedUrl(path);
  return (
    <View style={[styles.cover, { height }]}>
      {url ? (
        <Image source={{ uri: url }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      ) : (
        <LinearGradient colors={['#0E4A5C', '#0A2233']} style={[StyleSheet.absoluteFill, styles.placeholder]}>
          <Text style={styles.placeholderEmoji}>🐠</Text>
        </LinearGradient>
      )}
      <LinearGradient colors={['transparent', 'rgba(3,12,20,0.92)']} style={styles.coverShade} />
      {children}
    </View>
  );
}

export function TankCard({ summary, now, onPress }: { summary: TankSummary; now: Date; onPress: () => void }) {
  const { tank } = summary;
  const meta = [tank.started_at ? tankAge(tank.started_at, now) : null, tank.volume_liters ? `${tank.volume_liters} l` : null]
    .filter(Boolean)
    .join(' · ');

  return (
    <Pressable style={styles.card} onPress={onPress} testID="tank-card" accessibilityRole="button" accessibilityLabel={tank.name}>
      <TankCover path={tank.photo_path} height={170}>
        <View style={styles.coverText}>
          <Text style={styles.name} numberOfLines={1}>
            {tank.name}
          </Text>
          {meta ? <Text style={styles.meta}>{meta}</Text> : null}
        </View>
      </TankCover>
      <View style={styles.body}>
        <Row
          icon={<Fish color={colors.primary} size={16} />}
          label="Osádka"
          value={summary.fishTotal === 0 ? 'zatiaľ prázdne' : summary.stock.slice(0, 2).join(', ')}
        />
        <Row
          icon={<Droplets color={colors.primary} size={16} />}
          label="Výmena vody"
          value={summary.lastWaterChange ? timeAgo(summary.lastWaterChange, now) : 'nezapísaná'}
        />
        <Row
          icon={<Sparkles color={colors.primary} size={16} />}
          label="Čistenie filtra"
          value={summary.lastFilterClean ? timeAgo(summary.lastFilterClean, now) : 'nezapísané'}
        />
        <Row
          icon={<ListChecks color={summary.todoToday ? colors.warning : colors.primary} size={16} />}
          label="Úlohy dnes"
          value={summary.todoToday ? String(summary.todoToday) : 'hotovo ✓'}
          highlight={summary.todoToday > 0}
        />
      </View>
    </Pressable>
  );
}

export function AddTankCard({ onPress }: { onPress: () => void }) {
  return (
    <Pressable style={[styles.card, styles.addCard]} onPress={onPress} testID="add-tank" accessibilityRole="button">
      <View style={styles.addIcon}>
        <Plus color={colors.background} size={26} />
      </View>
      <Text style={styles.addText}>Pridať akvárium</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    maxWidth: '100%',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  cover: { width: '100%', justifyContent: 'flex-end', backgroundColor: colors.surfaceAlt },
  placeholder: { alignItems: 'center', justifyContent: 'center' },
  placeholderEmoji: { fontSize: 56, opacity: 0.85 },
  coverShade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 90 },
  coverText: { padding: spacing.md },
  name: { color: '#FFFFFF', fontSize: 22, fontWeight: '800' },
  meta: { color: '#CFE7EC', fontSize: 13, marginTop: 2 },
  body: { padding: spacing.md, gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  rowLabel: { color: colors.textMuted, fontSize: 13, width: 104 },
  rowValue: { color: colors.text, fontSize: 13, fontWeight: '600', flex: 1, textAlign: 'right' },
  addCard: {
    minHeight: 330,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderStyle: 'dashed',
    backgroundColor: 'transparent',
  },
  addIcon: {
    width: 52,
    height: 52,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addText: { color: colors.text, fontSize: 16, fontWeight: '700' },
});
