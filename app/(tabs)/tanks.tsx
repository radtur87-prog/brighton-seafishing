import { useCallback, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Plus, Trash2, X } from 'lucide-react-native';
import { colors, radius, spacing } from '@/constants/theme';
import type { Fish, Tank, WaterType } from '@/types/database';
import { addFish, createTank, deleteFish, deleteTank, fetchFish, fetchTanks } from '@/lib/queries';

const WATER_TYPES: { value: WaterType; label: string }[] = [
  { value: 'freshwater', label: 'Sladkovodné' },
  { value: 'brackish', label: 'Brakické' },
  { value: 'saltwater', label: 'Morské' },
  { value: 'pond', label: 'Jazierko' },
];

export default function TanksScreen() {
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [fishByTank, setFishByTank] = useState<Record<string, Fish[]>>({});
  const [expandedTankId, setExpandedTankId] = useState<string | null>(null);
  const [showAddTank, setShowAddTank] = useState(false);
  const [showAddFish, setShowAddFish] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await fetchTanks();
      setTanks(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chyba pri načítaní akvárií.');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function toggleExpand(tank: Tank) {
    if (expandedTankId === tank.id) {
      setExpandedTankId(null);
      return;
    }
    setExpandedTankId(tank.id);
    if (!fishByTank[tank.id]) {
      const fish = await fetchFish(tank.id);
      setFishByTank((prev) => ({ ...prev, [tank.id]: fish }));
    }
  }

  async function handleDeleteTank(tankId: string) {
    await deleteTank(tankId);
    setTanks((prev) => prev.filter((t) => t.id !== tankId));
  }

  async function handleDeleteFish(tankId: string, fishId: string) {
    await deleteFish(fishId);
    setFishByTank((prev) => ({
      ...prev,
      [tankId]: (prev[tankId] ?? []).filter((f) => f.id !== fishId),
    }));
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Moje akváriá</Text>
        <Pressable style={styles.addButton} onPress={() => setShowAddTank(true)}>
          <Plus color={colors.background} size={20} />
        </Pressable>
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      <FlatList
        data={tanks}
        keyExtractor={(t) => t.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const isOpen = expandedTankId === item.id;
          const fish = fishByTank[item.id] ?? [];
          return (
            <View style={styles.card}>
              <Pressable onPress={() => toggleExpand(item)}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>{item.name}</Text>
                  <Pressable onPress={() => handleDeleteTank(item.id)} hitSlop={10}>
                    <Trash2 color={colors.danger} size={18} />
                  </Pressable>
                </View>
                <Text style={styles.cardMeta}>
                  {WATER_TYPES.find((w) => w.value === item.water_type)?.label}
                  {item.volume_liters ? ` · ${item.volume_liters} l` : ''}
                </Text>
                {item.notes ? <Text style={styles.cardNotes}>{item.notes}</Text> : null}
              </Pressable>

              {isOpen && (
                <View style={styles.fishSection}>
                  {fish.map((f) => (
                    <View key={f.id} style={styles.fishRow}>
                      <Text style={styles.fishText}>
                        {f.count}× {f.species}
                        {f.nickname ? ` – ${f.nickname}` : ''}
                      </Text>
                      <Pressable onPress={() => handleDeleteFish(item.id, f.id)} hitSlop={10}>
                        <X color={colors.textMuted} size={16} />
                      </Pressable>
                    </View>
                  ))}
                  <Pressable style={styles.addFishButton} onPress={() => setShowAddFish(item.id)}>
                    <Text style={styles.addFishText}>+ Pridať rybu</Text>
                  </Pressable>
                </View>
              )}
            </View>
          );
        }}
        ListEmptyComponent={
          <Text style={styles.empty}>Zatiaľ nemáš žiadne akvárium. Pridaj prvé tlačidlom +.</Text>
        }
      />

      <AddTankModal
        visible={showAddTank}
        onClose={() => setShowAddTank(false)}
        onCreated={(tank) => {
          setTanks((prev) => [tank, ...prev]);
          setShowAddTank(false);
        }}
      />

      <AddFishModal
        tankId={showAddFish}
        onClose={() => setShowAddFish(null)}
        onCreated={(tankId, fish) => {
          setFishByTank((prev) => ({ ...prev, [tankId]: [fish, ...(prev[tankId] ?? [])] }));
          setShowAddFish(null);
        }}
      />
    </View>
  );
}

function AddTankModal({
  visible,
  onClose,
  onCreated,
}: {
  visible: boolean;
  onClose: () => void;
  onCreated: (tank: Tank) => void;
}) {
  const [name, setName] = useState('');
  const [volume, setVolume] = useState('');
  const [waterType, setWaterType] = useState<WaterType>('freshwater');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!name.trim()) {
      setError('Zadaj názov akvária.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const tank = await createTank({
        name: name.trim(),
        volume_liters: volume ? Number(volume) : null,
        water_type: waterType,
      });
      onCreated(tank);
      setName('');
      setVolume('');
      setWaterType('freshwater');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Nepodarilo sa uložiť akvárium.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Nové akvárium</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <X color={colors.textMuted} size={22} />
            </Pressable>
          </View>

          <TextInput
            style={styles.input}
            placeholder="Názov (napr. Obývačka 54l)"
            placeholderTextColor={colors.textMuted}
            value={name}
            onChangeText={setName}
          />
          <TextInput
            style={styles.input}
            placeholder="Objem v litroch (voliteľné)"
            placeholderTextColor={colors.textMuted}
            keyboardType="numeric"
            value={volume}
            onChangeText={setVolume}
          />

          <View style={styles.chipRow}>
            {WATER_TYPES.map((w) => (
              <Pressable
                key={w.value}
                style={[styles.chip, waterType === w.value && styles.chipActive]}
                onPress={() => setWaterType(w.value)}
              >
                <Text style={[styles.chipText, waterType === w.value && styles.chipTextActive]}>
                  {w.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {error && <Text style={styles.error}>{error}</Text>}

          <Pressable style={styles.saveButton} onPress={handleSave} disabled={saving}>
            <Text style={styles.saveButtonText}>{saving ? 'Ukladám...' : 'Uložiť akvárium'}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function AddFishModal({
  tankId,
  onClose,
  onCreated,
}: {
  tankId: string | null;
  onClose: () => void;
  onCreated: (tankId: string, fish: Fish) => void;
}) {
  const [species, setSpecies] = useState('');
  const [nickname, setNickname] = useState('');
  const [count, setCount] = useState('1');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!tankId) return;
    if (!species.trim()) {
      setError('Zadaj druh ryby.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const fish = await addFish({
        tank_id: tankId,
        species: species.trim(),
        nickname: nickname.trim() || null,
        count: Number(count) || 1,
      });
      onCreated(tankId, fish);
      setSpecies('');
      setNickname('');
      setCount('1');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Nepodarilo sa pridať rybu.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={!!tankId} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Pridať rybu</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <X color={colors.textMuted} size={22} />
            </Pressable>
          </View>

          <TextInput
            style={styles.input}
            placeholder="Druh (napr. Guppy)"
            placeholderTextColor={colors.textMuted}
            value={species}
            onChangeText={setSpecies}
          />
          <TextInput
            style={styles.input}
            placeholder="Prezývka (voliteľné)"
            placeholderTextColor={colors.textMuted}
            value={nickname}
            onChangeText={setNickname}
          />
          <TextInput
            style={styles.input}
            placeholder="Počet kusov"
            placeholderTextColor={colors.textMuted}
            keyboardType="numeric"
            value={count}
            onChangeText={setCount}
          />

          {error && <Text style={styles.error}>{error}</Text>}

          <Pressable style={styles.saveButton} onPress={handleSave} disabled={saving}>
            <Text style={styles.saveButtonText}>{saving ? 'Ukladám...' : 'Pridať'}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: 64,
    paddingHorizontal: spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.text,
  },
  addButton: {
    backgroundColor: colors.primary,
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: {
    color: colors.danger,
    marginBottom: spacing.sm,
  },
  list: {
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  cardMeta: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 2,
  },
  cardNotes: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: spacing.xs,
    fontStyle: 'italic',
  },
  fishSection: {
    marginTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    gap: spacing.xs,
  },
  fishRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  fishText: {
    color: colors.text,
    fontSize: 14,
  },
  addFishButton: {
    marginTop: spacing.xs,
  },
  addFishText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 13,
  },
  empty: {
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xl,
    lineHeight: 20,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.surfaceAlt,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 15,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    color: colors.textMuted,
    fontSize: 13,
  },
  chipTextActive: {
    color: colors.background,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#04201C',
    fontWeight: '700',
    fontSize: 15,
  },
});
