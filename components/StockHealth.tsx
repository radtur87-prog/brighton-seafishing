import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '@/constants/theme';
import { STATUS_COLORS } from '@/components/WaterChart';
import { bioload, checkCompatibility, resolveStock } from '@/lib/compatibility';
import { canAssess, latestValues } from '@/lib/water';
import type { Fish, Tank, WaterTest } from '@/types/database';

/** Bioload bar plus compatibility warnings for one tank's stock. */
export function StockHealth({ tank, fish, waterTests }: { tank: Tank; fish: Fish[]; waterTests: WaterTest[] }) {
  if (fish.length === 0) return null;
  const { entries, unknown } = resolveStock(fish);
  const load = bioload(entries, unknown, tank.volume_liters);
  const water = canAssess(tank.water_type) ? latestValues(waterTests) : [];
  const issues = checkCompatibility(entries, tank, water);
  const barColor = load.status ? STATUS_COLORS[load.status] : colors.primary;

  return (
    <View style={styles.wrap}>
      <View testID="bioload">
        <View style={styles.loadHead}>
          <Text style={styles.loadLabel}>Zaťaženie akvária</Text>
          <Text style={[styles.loadValue, { color: barColor }]}>
            {load.percent === null ? `${load.cm} cm rýb` : `${load.percent} %`}
          </Text>
        </View>
        {load.percent !== null && (
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${Math.min(load.percent, 100)}%`, backgroundColor: barColor }]} />
          </View>
        )}
        <Text style={styles.hint}>
          {load.percent === null
            ? 'Zadaj objem akvária, aby sa dalo vypočítať zaťaženie.'
            : `${load.cm} cm dospelých rýb na ${tank.volume_liters} l (pravidlo 1 cm ryby na 1 liter).`}
          {load.unknownCount > 0 ? ` ${load.unknownCount} ks neznámeho druhu počítam ako 5 cm.` : ''}
        </Text>
        {load.status === 'danger' && (
          <Text style={[styles.hint, { color: colors.danger }]}>
            Akvárium je preplnené – hrozí skok amoniaku. Menej rýb, väčšie akvárium alebo častejšia výmena vody.
          </Text>
        )}
        {load.status === 'watch' && (
          <Text style={[styles.hint, { color: colors.warning }]}>Blížiš sa k hranici – ďalšie ryby už radšej nepridávaj.</Text>
        )}
      </View>

      {issues.length === 0 && entries.length > 0 ? (
        <Text style={[styles.issue, { color: colors.ok }]} testID="compat-ok">
          ✓ Druhy sa k sebe hodia.
        </Text>
      ) : (
        issues.map((issue) => (
          <View key={issue.text} style={styles.issueRow} testID="compat-issue">
            <View style={[styles.dot, { backgroundColor: STATUS_COLORS[issue.level] }]} />
            <Text style={styles.issue}>
              <Text style={{ color: STATUS_COLORS[issue.level], fontWeight: '700' }}>
                {issue.level === 'danger' ? 'Nebezpečné: ' : 'Pozor: '}
              </Text>
              {issue.text}
            </Text>
          </View>
        ))
      )}
      {unknown.length > 0 && (
        <Text style={styles.hint}>
          Nepoznám: {unknown.map((f) => f.species).join(', ')}. Pridaj ich z Encyklopédie, aby som vedel skontrolovať aj ich.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm, marginTop: spacing.sm },
  loadHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  loadLabel: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  loadValue: { fontSize: 16, fontWeight: '800', fontVariant: ['tabular-nums'] },
  track: { height: 8, borderRadius: radius.pill, backgroundColor: colors.surfaceAlt, overflow: 'hidden', marginTop: 6 },
  fill: { height: '100%', borderRadius: radius.pill },
  hint: { color: colors.textMuted, fontSize: 12, marginTop: 4, lineHeight: 17 },
  issueRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
  issue: { color: colors.text, fontSize: 13, lineHeight: 19, flex: 1 },
});
