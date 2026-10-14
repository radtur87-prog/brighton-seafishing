import { base64ToArrayBuffer, photoFileType } from '@/lib/photos';
import { errorMessage } from '@/lib/errors';

describe('photoFileType', () => {
  it('prefers the picker mime type', () => {
    expect(photoFileType('image/png', 'file:///x.jpg')).toEqual({ ext: 'png', contentType: 'image/png' });
    expect(photoFileType('image/jpg', 'blob:abc')).toEqual({ ext: 'jpg', contentType: 'image/jpeg' });
  });

  it('reads the type from a web data URI without using the data as an extension', () => {
    const uri = 'data:image/webp;base64,UklGRhAAAABXRUJQ';
    expect(photoFileType(undefined, uri)).toEqual({ ext: 'webp', contentType: 'image/webp' });
  });

  it('falls back to the path extension, then to jpeg', () => {
    expect(photoFileType(null, 'file:///photos/IMG_1.JPEG')).toEqual({ ext: 'jpg', contentType: 'image/jpeg' });
    expect(photoFileType(null, 'file:///photos/IMG_1.heic')).toEqual({ ext: 'heic', contentType: 'image/heic' });
    expect(photoFileType(null, 'blob:http://localhost/123')).toEqual({ ext: 'jpg', contentType: 'image/jpeg' });
  });
});

describe('base64ToArrayBuffer', () => {
  it('decodes plain base64 and data URIs', () => {
    expect(Array.from(new Uint8Array(base64ToArrayBuffer('AQID')))).toEqual([1, 2, 3]);
    expect(Array.from(new Uint8Array(base64ToArrayBuffer('data:image/png;base64,AQID')))).toEqual([1, 2, 3]);
  });
});

describe('errorMessage', () => {
  it('translates known Supabase errors to Slovak', () => {
    expect(errorMessage({ message: 'Invalid login credentials' }, 'x')).toBe('Nesprávny e-mail alebo heslo.');
    expect(errorMessage(new Error('Email not confirmed'), 'x')).toMatch(/nie je potvrdený/);
    expect(errorMessage(new TypeError('Failed to fetch'), 'x')).toMatch(/internet/);
  });

  it('keeps unknown messages and falls back for empty values', () => {
    expect(errorMessage({ message: 'duplicate key value' }, 'x')).toBe('duplicate key value');
    expect(errorMessage(null, 'Fallback')).toBe('Fallback');
    expect(errorMessage({ code: 42 }, 'Fallback')).toBe('Fallback');
  });
});
