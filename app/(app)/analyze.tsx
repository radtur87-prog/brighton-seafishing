import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from 'expo-router';
import { Camera, ImagePlus } from 'lucide-react-native';
import { colors, radius, spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import {
  createPendingPhotoAnalysis,
  fetchPhotoAnalyses,
  fetchTanks,
  markPhotoAnalysisError,
} from '@/lib/queries';
import { pickPhoto, uploadPhoto, useSignedUrl } from '@/lib/storage';
import { errorMessage } from '@/lib/errors';
import type { PhotoAnalysis, Tank } from '@/types/database';

const RISK_COLORS: Record<string, string> = {
  ok: colors.ok,
  watch: colors.warning,
  urgent: colors.danger,
};

const RISK_LABELS: Record<string, string> = {
  ok: 'V poriadku',
  watch: 'Sleduj',
  urgent: 'Zasiahni',
};

const AI_NOT_READY =
  'Fotka je uložená, ale AI analýza ešte nie je zapnutá (treba nasadiť funkciu analyze-photo a nastaviť ANTHROPIC_API_KEY).';

export default function AnalyzeScreen() {
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [selectedTankId, setSelectedTankId] = useState<string | null>(null);
  const [analyses, setAnalyses] = useState<PhotoAnalysis[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [t, a] = await Promise.all([fetchTanks(), fetchPhotoAnalyses()]);
      setTanks(t);
      setSelectedTankId((prev) => (prev && t.some((x) => x.id === prev) ? prev : (t[0]?.id ?? null)));
      setAnalyses(a);
    } catch (e) {
      setError(errorMessage(e, 'Analýzy sa nepodarilo načítať.'));
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function pickAndAnalyze(source: 'camera' | 'library') {
    setError(null);
    try {
      const asset = await pickPhoto(source);
      if (asset) await uploadAndAnalyze(asset);
    } catch (e) {
      setError(errorMessage(e, 'Fotku sa nepodarilo načítať.'));
    }
  }

  async function uploadAndAnalyze(asset: ImagePicker.ImagePickerAsset) {
    setUploading(true);
    setError(null);
    let pendingId: string | null = null;
    try {
      const storagePath = await uploadPhoto(asset, 'analysis');

      const pending = await createPendingPhotoAnalysis({ tank_id: selectedTankId, photo_path: storagePath });
      pendingId = pending.id;
      setAnalyses((prev) => [pending, ...prev]);

      const { data: fnData, error: fnError } = await supabase.functions.invoke('analyze-photo', {
        body: { photo_analysis_id: pending.id },
      });

      if (fnError || !fnData || (fnData as { error?: string }).error) {
        await markPhotoAnalysisError(pending.id, AI_NOT_READY).catch(() => undefined);
        setAnalyses((prev) =>
          prev.map((a) => (a.id === pending.id ? { ...a, status: 'error', error_message: AI_NOT_READY } : a))
        );
        return;
      }

      setAnalyses((prev) =>
        prev.map((a) => (a.id === pending.id ? { ...a, ...(fnData as Partial<PhotoAnalysis>) } : a))
      );
    } catch (e) {
      const message = errorMessage(e, 'Analýza fotky zlyhala.');
      setError(message);
      if (pendingId) {
        const id = pendingId;
        await markPhotoAnalysisError(id, message).catch(() => undefined);
        setAnalyses((prev) => prev.map((a) => (a.id === id ? { ...a, status: 'error', error_message: message } : a)));
      }
    } finally {
      setUploading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.subtitle}>
        Odfoť akvárium alebo rybu – AI skontroluje čistotu vody, zdravie rýb a ďalšie faktory.
      </Text>

      {tanks.length > 0 && (
        <View style={styles.chipRow}>
          {tanks.map((t) => (
            <Pressable
              key={t.id}
              style={[styles.chip, selectedTankId === t.id && styles.chipActive]}
              onPress={() => setSelectedTankId(t.id)}
            >
              <Text style={[styles.chipText, selectedTankId === t.id && styles.chipTextActive]}>
                {t.name}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      <View style={styles.actionRow}>
        <Pressable style={styles.actionButton} onPress={() => pickAndAnalyze('camera')} disabled={uploading}>
          <Camera color={colors.background} size={18} />
          <Text style={styles.actionButtonText}>Odfotiť</Text>
        </Pressable>
        <Pressable
          style={[styles.actionButton, styles.actionButtonAlt]}
          onPress={() => pickAndAnalyze('library')}
          disabled={uploading}
        >
          <ImagePlus color={colors.text} size={18} />
          <Text style={[styles.actionButtonText, styles.actionButtonTextAlt]}>Z galérie</Text>
        </Pressable>
      </View>

      {uploading && (
        <View style={styles.uploadingRow}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.uploadingText}>Analyzujem fotku...</Text>
        </View>
      )}

      {error && <Text style={styles.error}>{error}</Text>}

      <FlatList
        data={analyses}
        keyExtractor={(a) => a.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => <AnalysisCard analysis={item} />}
        ListEmptyComponent={
          <Text style={styles.empty}>Zatiaľ žiadne analýzy. Odfoť svoje akvárium vyššie.</Text>
        }
      />
    </View>
  );
}

function AnalysisCard({ analysis }: { analysis: PhotoAnalysis }) {
  const signedUrl = useSignedUrl(analysis.photo_path);

  return (
    <View style={styles.card}>
      {signedUrl && <Image source={{ uri: signedUrl }} style={styles.thumbnail} />}
      <View style={styles.cardBody}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardDate}>
            {new Date(analysis.created_at).toLocaleString('sk-SK')}
          </Text>
          {analysis.risk_level && (
            <View
              style={[styles.riskBadge, { backgroundColor: RISK_COLORS[analysis.risk_level] }]}
            >
              <Text style={styles.riskBadgeText}>{RISK_LABELS[analysis.risk_level]}</Text>
            </View>
          )}
        </View>

        {analysis.status === 'pending' && <Text style={styles.cardMeta}>Spracúvam...</Text>}
        {analysis.status === 'error' && (
          <Text style={styles.cardError}>{analysis.error_message ?? 'Analýza zlyhala.'}</Text>
        )}
        {analysis.status === 'done' && (
          <>
            {analysis.summary && <Text style={styles.cardSummary}>{analysis.summary}</Text>}
            {analysis.findings?.map((f, idx) => (
              <Text key={idx} style={styles.finding}>
                • {f.label}: {f.detail}
              </Text>
            ))}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
    paddingTop: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
    lineHeight: 18,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.md,
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
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 14,
  },
  actionButtonAlt: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionButtonText: {
    color: '#04201C',
    fontWeight: '700',
  },
  actionButtonTextAlt: {
    color: colors.text,
  },
  uploadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  uploadingText: {
    color: colors.textMuted,
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
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  thumbnail: {
    width: '100%',
    height: 180,
  },
  cardBody: {
    padding: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  cardDate: {
    color: colors.textMuted,
    fontSize: 12,
  },
  riskBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  riskBadgeText: {
    color: '#04201C',
    fontWeight: '700',
    fontSize: 11,
  },
  cardMeta: {
    color: colors.textMuted,
    fontSize: 13,
  },
  cardError: {
    color: colors.danger,
    fontSize: 13,
  },
  cardSummary: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: spacing.xs,
  },
  finding: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  empty: {
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xl,
    lineHeight: 20,
  },
});
