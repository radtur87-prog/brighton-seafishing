import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { colors, radius, spacing } from '@/constants/theme';
import { parseLocalDate, toLocalDateString } from '@/lib/time';

interface Props {
  /** 'YYYY-MM-DD' */
  value: string;
  onChange: (value: string) => void;
  testID?: string;
}

export function DateField({ value, onChange, testID }: Props) {
  const [open, setOpen] = useState(false);
  const date = parseLocalDate(value);

  return (
    <>
      <Pressable style={styles.field} onPress={() => setOpen(true)} testID={testID}>
        <Text style={styles.text}>{date.toLocaleDateString('sk-SK')}</Text>
      </Pressable>
      {open && (
        <DateTimePicker
          value={date}
          mode="date"
          maximumDate={new Date()}
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          themeVariant="dark"
          onChange={(event, selected) => {
            setOpen(Platform.OS === 'ios' && event.type !== 'dismissed');
            if (event.type === 'set' && selected) onChange(toLocalDateString(selected));
          }}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  field: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  text: { color: colors.text, fontSize: 15 },
});
