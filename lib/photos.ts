const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'image/heif': 'heif',
};

/**
 * Picks a file extension + content type for an uploaded photo.
 * On web the picker returns a data:/blob: URI, so the URI itself must never be used for the extension.
 */
export function photoFileType(mimeType: string | null | undefined, uri: string): { ext: string; contentType: string } {
  const mime = mimeType?.toLowerCase();
  if (mime && EXTENSIONS[mime]) return { ext: EXTENSIONS[mime], contentType: mime === 'image/jpg' ? 'image/jpeg' : mime };

  const dataUriMime = /^data:(image\/[a-z0-9.+-]+)[;,]/i.exec(uri)?.[1]?.toLowerCase();
  if (dataUriMime && EXTENSIONS[dataUriMime]) return { ext: EXTENSIONS[dataUriMime], contentType: dataUriMime };

  const pathExt = /\.([a-z0-9]{3,4})(?:\?.*)?$/i.exec(uri)?.[1]?.toLowerCase();
  const match = Object.entries(EXTENSIONS).find(([, ext]) => ext === (pathExt === 'jpeg' ? 'jpg' : pathExt));
  if (match) return { ext: match[1], contentType: match[0] === 'image/jpg' ? 'image/jpeg' : match[0] };

  return { ext: 'jpg', contentType: 'image/jpeg' };
}

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const clean = base64.replace(/^data:[^,]*,/, '');
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}
