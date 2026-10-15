import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button, ErrorText, Field, Label, Sheet } from '@/components/ui';
import { DateField } from '@/components/DateField';
import { colors, spacing } from '@/constants/theme';
import { addWaterTest, type WaterTestInput } from '@/lib/queries';
import { errorMessage } from '@/lib/errors';
import { parseMeasurement, WATER_PARAMS } from '@/lib/water';
import { parseLocalDate, toLocalDateString } from '@/lib/time';
import type { WaterParam, WaterTest } from '@/types/database';

const PLACEHOLDERS: Record<WaterParam, string> = {
  ph: 'napr. 7,6',
  temp_c: 'napr. 25',
  nh3: 'napr. 0',
  no2: 'napr. 0',
  no3: 'napr. 10',
  gh: 'napr. 12',
  kh: 'napr. 8',
  cl2: 'napr. 0',
};

const EMPTY = Object.fromEntries(WATER_PARAMS.map((p) => [p.key, ''])) as Record<WaterParam, string>;

/** Timestamp for a chosen day: now when it is today, otherwise noon of that day. */
function measuredAt(day: string, now = new Date()) {
  if (day === toLocalDateString(now)) return now.toISOString();
  const d = parseLocalDate(day);
  d.setHours(12, 0, 0, 0);
  return d.toISOString();
}

export function WaterTestSheet({
  tankId,
  onClose,
  onSaved,
}: {
  tankId: string | null;
  onClose: () => void;
  onSaved: (test: WaterTest) => void;
}) {
  const [values, setValues] = useState(EMPTY);
  const [day, setDay] = useState(toLocalDateString(new Date()));
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tankId) return;
    setValues(EMPTY);
    setDay(toLocalDateString(new Date()));
    setNote('');
    setError(null);
  }, [tankId]);

  async function handleSave() {
    if (!tankId) return;
    const input: WaterTestInput = {
      tank_id: tankId,
      measured_at: measuredAt(day),
      note: note.trim() || null,
      ph: null,
      gh: null,
      kh: null,
      nh3: null,
      no2: null,
      no3: null,
      cl2: null,
      temp_c: null,
    };
    for (const spec of WATER_PARAMS) {
      const parsed = parseMeasurement(values[spec.key]);
      if (Number.isNaN(parsed) || (parsed !== null && parsed < 0)) return setError(`${spec.label}: zadaj číslo (napr. 7,5).`);
      if (spec.key === 'ph' && parsed !== null && parsed > 14) return setError('pH musí byť medzi 0 a 14.');
      input[spec.key] = parsed;
    }
    if (WATER_PARAMS.every((p) => input[p.key] === null)) return setError('Vyplň aspoň jednu hodnotu.');

    setBusy(true);
    setError(null);
    try {
      onSaved(await addWaterTest(input));
    } catch (e) {
      setError(errorMessage(e, 'Meranie sa nepodarilo uložiť.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet
      visible={tankId !== null}
      title="Nové meranie vody"
      onClose={onClose}
      footer={
        <View style={{ paddingHorizontal: 24, gap: spacing.sm }}>
          {error && <ErrorText>{error}</ErrorText>}
          <Button label={busy ? 'Ukladám...' : 'Uložiť meranie'} onPress={handleSave} disabled={busy} testID="save-water-test" />
        </View>
      }
    >
      <Text style={styles.intro}>Vyplň len to, čo si meral. Prázdne polia sa neuložia.</Text>
      <Label>Dátum merania</Label>
      <DateField value={day} onChange={setDay} testID="water-date" />
      <View style={styles.grid}>
        {WATER_PARAMS.map((spec) => (
          <View key={spec.key} style={styles.cell}>
            <Field
              label={spec.unit ? `${spec.label} (${spec.unit})` : spec.label}
              placeholder={PLACEHOLDERS[spec.key]}
              keyboardType="decimal-pad"
              value={values[spec.key]}
              onChangeText={(text) => setValues((v) => ({ ...v, [spec.key]: text }))}
              testID={`water-${spec.key}`}
            />
          </View>
        ))}
      </View>
      <Field label="Poznámka (voliteľné)" placeholder="napr. po výmene vody, testovací prúžok" value={note} onChangeText={setNote} testID="water-note" />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  intro: { color: colors.textMuted, fontSize: 13 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -spacing.xs },
  cell: { width: '50%', paddingHorizontal: spacing.xs },
});
