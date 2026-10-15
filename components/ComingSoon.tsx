import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '@/constants/theme';
import { ui } from '@/components/ui';

export function ComingSoon({ emoji, title, stage, features }: { emoji: string; title: string; stage: string; features: string[] }) {
  return (
    <ScrollView style={ui.screen} contentContainerStyle={ui.content}>
      <View style={[ui.card, styles.card]}>
        <Text style={styles.emoji}>{emoji}</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.stage}>{stage}</Text>
        {features.map((f) => (
          <Text key={f} style={[ui.body, styles.feature]}>
            • {f}
          </Text>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: 'center', paddingVertical: spacing.xl },
  emoji: { fontSize: 44 },
  title: { color: colors.text, fontSize: 20, fontWeight: '800', marginTop: spacing.sm },
  stage: { color: colors.primary, fontSize: 13, fontWeight: '700', marginTop: 4, marginBottom: spacing.md },
  feature: { alignSelf: 'stretch', color: colors.textMuted },
});
