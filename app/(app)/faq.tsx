import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { colors, spacing } from '@/constants/theme';
import { FAQ } from '@/constants/knowledge';
import { ui } from '@/components/ui';

export default function FaqScreen() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <ScrollView style={ui.screen} contentContainerStyle={ui.content}>
      {FAQ.map((item, index) => {
        const isOpen = open === index;
        const Icon = isOpen ? ChevronUp : ChevronDown;
        return (
          <Pressable
            key={item.q}
            style={ui.card}
            onPress={() => setOpen(isOpen ? null : index)}
            accessibilityRole="button"
            accessibilityState={{ expanded: isOpen }}
          >
            <View style={styles.row}>
              <Text style={styles.question}>{item.q}</Text>
              <Icon color={colors.textMuted} size={18} />
            </View>
            {isOpen && <Text style={[ui.body, styles.answer]}>{item.a}</Text>}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  question: { color: colors.text, fontSize: 16, fontWeight: '700', flex: 1 },
  answer: { marginTop: spacing.sm, color: colors.textMuted },
});
