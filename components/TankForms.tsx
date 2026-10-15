import { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { ImagePlus } from 'lucide-react-native';
import { Button, ChipGroup, ErrorText, Field, Label, Sheet } from '@/components/ui';
import { DateField } from '@/components/DateField';
import { colors, radius } from '@/constants/theme';
import { WATER_TYPE_LABELS, type Fish, type Tank, type WaterType } from '@/types/database';
import { addFish, createTank, updateTank } from '@/lib/queries';
import { pickPhoto, uploadPhoto, useSignedUrl } from '@/lib/storage';
import { errorMessage } from '@/lib/errors';
import { toLocalDateString } from '@/lib/time';

const WATER_OPTIONS = (Object.keys(WATER_TYPE_LABELS) as WaterType[]).map((value) => ({
  value,
  label: WATER_TYPE_LABELS[value],
}));

/** Create a tank (no `tank`) or edit an existing one. */
export function TankFormSheet({
  visible,
  tank,
  onClose,
  onSaved,
}: {
  visible: boolean;
  tank?: Tank | null;
  onClose: () => void;
  onSaved: (tank: Tank) => void;
}) {
  const [name, setName] = useState('');
  const [volume, setVolume] = useState('');
  const [waterType, setWaterType] = useState<WaterType>('freshwater');
  const [startedAt, setStartedAt] = useState(toLocalDateString(new Date()));
  const [photoPath, setPhotoPath] = useState<string | null>(null);
  const [busy, setBusy] = useState<'photo' | 'save' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const photoUrl = useSignedUrl(photoPath);

  useEffect(() => {
    if (!visible) return;
    setName(tank?.name ?? '');
    setVolume(tank?.volume_liters ? String(tank.volume_liters) : '');
    setWaterType(tank?.water_type ?? 'freshwater');
    setStartedAt(tank?.started_at ?? toLocalDateString(new Date()));
    setPhotoPath(tank?.photo_path ?? null);
    setError(null);
  }, [visible, tank]);

  async function handlePhoto() {
    setError(null);
    try {
      const asset = await pickPhoto('library');
      if (!asset) return;
      setBusy('photo');
      setPhotoPath(await uploadPhoto(asset, 'tank'));
    } catch (e) {
      setError(errorMessage(e, 'Fotku sa nepodarilo nahrať.'));
    } finally {
      setBusy(null);
    }
  }

  async function handleSave() {
    if (!name.trim()) return setError('Zadaj názov akvária.');
    const liters = volume.trim() ? Number(volume.replace(',', '.')) : null;
    if (liters !== null && (!Number.isFinite(liters) || liters <= 0)) return setError('Objem zadaj ako kladné číslo v litroch.');
    setBusy('save');
    setError(null);
    try {
      const input = {
        name: name.trim(),
        volume_liters: liters,
        water_type: waterType,
        started_at: startedAt,
        photo_path: photoPath,
      };
      onSaved(tank ? await updateTank(tank.id, input) : await createTank(input));
    } catch (e) {
      setError(errorMessage(e, 'Akvárium sa nepodarilo uložiť.'));
    } finally {
      setBusy(null);
    }
  }

  return (
    <Sheet
      visible={visible}
      title={tank ? 'Upraviť akvárium' : 'Nové akvárium'}
      onClose={onClose}
      footer={
        <View style={{ paddingHorizontal: 24 }}>
          <Button
            label={busy === 'save' ? 'Ukladám...' : tank ? 'Uložiť zmeny' : 'Pridať akvárium'}
            onPress={handleSave}
            disabled={busy !== null}
            testID="save-tank"
          />
        </View>
      }
    >
      <View style={styles.photoBox}>
        {photoUrl ? (
          <Image source={{ uri: photoUrl }} style={styles.photo} accessibilityLabel="Fotka akvária" />
        ) : (
          <Text style={styles.photoPlaceholder}>🐠</Text>
        )}
      </View>
      <Button
        label={busy === 'photo' ? 'Nahrávam fotku...' : photoPath ? 'Zmeniť fotku' : 'Pridať fotku akvária'}
        variant="secondary"
        onPress={handlePhoto}
        disabled={busy !== null}
        icon={<ImagePlus color={colors.text} size={18} />}
        testID="tank-photo"
      />
      <Field label="Názov" placeholder="napr. Radtur World" value={name} onChangeText={setName} testID="tank-name" />
      <Field
        label="Objem (litre)"
        placeholder="napr. 40"
        keyboardType="decimal-pad"
        value={volume}
        onChangeText={setVolume}
        testID="tank-volume"
      />
      <Label>Kedy bolo akvárium založené</Label>
      <DateField value={startedAt} onChange={setStartedAt} testID="tank-started" />
      <Label>Typ vody</Label>
      <ChipGroup options={WATER_OPTIONS} value={waterType} onChange={setWaterType} />
      {error && <ErrorText>{error}</ErrorText>}
    </Sheet>
  );
}

export function FishFormSheet({
  tankId,
  onClose,
  onSaved,
}: {
  tankId: string | null;
  onClose: () => void;
  onSaved: (fish: Fish) => void;
}) {
  const [species, setSpecies] = useState('');
  const [nickname, setNickname] = useState('');
  const [count, setCount] = useState('1');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tankId) return;
    setSpecies('');
    setNickname('');
    setCount('1');
    setError(null);
  }, [tankId]);

  async function handleSave() {
    if (!tankId) return;
    if (!species.trim()) return setError('Zadaj druh ryby.');
    setSaving(true);
    setError(null);
    try {
      onSaved(
        await addFish({
          tank_id: tankId,
          species: species.trim(),
          nickname: nickname.trim() || null,
          count: Math.max(1, Math.round(Number(count)) || 1),
        })
      );
    } catch (e) {
      setError(errorMessage(e, 'Rybu sa nepodarilo pridať.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet
      visible={!!tankId}
      title="Pridať do osádky"
      onClose={onClose}
      footer={
        <View style={{ paddingHorizontal: 24 }}>
          <Button label={saving ? 'Ukladám...' : 'Pridať'} onPress={handleSave} disabled={saving} testID="save-fish" />
        </View>
      }
    >
      <Field label="Druh" placeholder="napr. Guppy" value={species} onChangeText={setSpecies} testID="fish-species" />
      <Field label="Počet kusov" keyboardType="number-pad" value={count} onChangeText={setCount} testID="fish-count" />
      <Field label="Poznámka (voliteľné)" placeholder="napr. samec, modrý" value={nickname} onChangeText={setNickname} />
      {error && <ErrorText>{error}</ErrorText>}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  photoBox: {
    height: 160,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photo: { width: '100%', height: '100%' },
  photoPlaceholder: { fontSize: 48 },
});
