import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { colors, radius, spacing } from '@/constants/theme';
import { formatTime, type TimeOfDay } from '@/lib/time';

interface Props {
  value: TimeOfDay;
  onChange: (value: TimeOfDay) => void;
  testID?: string;
}

export function TimeField({ value, onChange, testID }: Props) {
  // iOS renders the spinner inline; Android opens a dialog only after a tap.
  const [open, setOpen] = useState(Platform.OS === 'ios');

  return (
    <>
      {Platform.OS === 'android' && (
        <Pressable style={styles.field} onPress={() => setOpen(true)} testID={testID}>
          <Text style={styles.text}>{formatTime(value)}</Text>
        </Pressable>
      )}
      {open && (
        <DateTimePicker
          value={new Date(2000, 0, 1, value.hour, value.minute)}
          mode="time"
          is24Hour
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          themeVariant="dark"
          onChange={(event, selected) => {
            if (Platform.OS === 'android') setOpen(false);
            if (event.type === 'set' && selected) {
              onChange({ hour: selected.getHours(), minute: selected.getMinutes() });
            }
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
  text: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '600',
  },
});
