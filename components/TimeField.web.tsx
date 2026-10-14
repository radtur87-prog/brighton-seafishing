import { createElement } from 'react';
import { colors, radius } from '@/constants/theme';
import { formatTime, parseTimeInput, type TimeOfDay } from '@/lib/time';

interface Props {
  value: TimeOfDay;
  onChange: (value: TimeOfDay) => void;
  testID?: string;
}

// The native time picker has no web implementation; a plain <input type="time"> works in every browser.
export function TimeField({ value, onChange, testID }: Props) {
  return createElement('input', {
    type: 'time',
    value: formatTime(value),
    'data-testid': testID,
    onChange: (e: { target: { value: string } }) => {
      const parsed = parseTimeInput(e.target.value);
      if (parsed) onChange(parsed);
    },
    style: {
      backgroundColor: colors.surface,
      color: colors.text,
      border: `1px solid ${colors.border}`,
      borderRadius: radius.md,
      padding: '12px 16px',
      fontSize: 18,
      fontWeight: 600,
      colorScheme: 'dark',
      fontFamily: 'inherit',
    },
  });
}
