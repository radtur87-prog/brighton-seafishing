import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '@/constants/theme';
import { TIPS } from '@/constants/knowledge';
import { ui } from '@/components/ui';

export default function TipsScreen() {
  return (
    <ScrollView style={ui.screen} contentContainerStyle={ui.content}>
      {TIPS.map((tip) => (
        <View key={tip.title} style={ui.card}>
          <Text style={styles.title}>
            {tip.emoji} {tip.title}
          </Text>
          {tip.points.map((point) => (
            <View key={point} style={styles.point}>
              <Text style={styles.bullet}>•</Text>
              <Text style={[ui.body, styles.pointText]}>{point}</Text>
            </View>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.text, fontSize: 17, fontWeight: '700', marginBottom: spacing.xs },
  point: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  bullet: { color: colors.primary, fontSize: 15, lineHeight: 22 },
  pointText: { flex: 1 },
});
