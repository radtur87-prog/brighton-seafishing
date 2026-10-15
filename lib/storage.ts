import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';
import { base64ToArrayBuffer, photoFileType } from '@/lib/photos';

const BUCKET = 'tank-photos';

/** Opens the camera or gallery. Returns null when the user cancels; throws a Slovak message when access is denied. */
export async function pickPhoto(source: 'camera' | 'library'): Promise<ImagePicker.ImagePickerAsset | null> {
  // The browser file picker needs no permission prompt.
  if (Platform.OS !== 'web') {
    const permission =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      throw new Error('Povoľ prístup k fotoaparátu/fotkám v nastaveniach telefónu.');
    }
  }
  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.7, base64: true };
  const result =
    source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled || !result.assets?.[0]) return null;
  return result.assets[0];
}

/** Uploads into the user's own folder (required by the storage RLS policy) and returns the storage path. */
export async function uploadPhoto(asset: ImagePicker.ImagePickerAsset, kind: string): Promise<string> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('Nie si prihlásený/á.');

  const { ext, contentType } = photoFileType(asset.mimeType, asset.uri);
  const path = `${userData.user.id}/${kind}-${Date.now()}.${ext}`;
  const body = asset.base64 ? base64ToArrayBuffer(asset.base64) : await (await fetch(asset.uri)).arrayBuffer();

  const { error } = await supabase.storage.from(BUCKET).upload(path, body, { contentType, upsert: false });
  if (error) throw error;
  return path;
}

export function useSignedUrl(path: string | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!path) {
      setUrl(null);
      return;
    }
    let cancelled = false;
    supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, 3600)
      .then(({ data }) => {
        if (!cancelled) setUrl(data?.signedUrl ?? null);
      });
    return () => {
      cancelled = true;
    };
  }, [path]);

  return url;
}
