import { createElement } from 'react';
import { colors, radius } from '@/constants/theme';
import { toLocalDateString } from '@/lib/time';

interface Props {
  /** 'YYYY-MM-DD' */
  value: string;
  onChange: (value: string) => void;
  testID?: string;
}

export function DateField({ value, onChange, testID }: Props) {
  return createElement('input', {
    type: 'date',
    value,
    max: toLocalDateString(new Date()),
    'data-testid': testID,
    onChange: (e: { target: { value: string } }) => {
      if (/^\d{4}-\d{2}-\d{2}$/.test(e.target.value)) onChange(e.target.value);
    },
    style: {
      backgroundColor: colors.surface,
      color: colors.text,
      border: `1px solid ${colors.border}`,
      borderRadius: radius.md,
      padding: '12px 16px',
      fontSize: 15,
      colorScheme: 'dark',
      fontFamily: 'inherit',
    },
  });
}
