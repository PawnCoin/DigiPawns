import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';

/**
 * Uploads a file to Firebase Storage and returns the public download URL.
 * @param file     The file to upload.
 * @param path     Storage path, e.g. "collections/abc123/cover.jpg"
 * @param onProgress Optional callback receiving 0-100 progress value.
 */
export async function uploadImage(
    file: File,
    path: string,
    onProgress?: (pct: number) => void,
): Promise<string> {
    const storageRef = ref(storage, path);
    const task = uploadBytesResumable(storageRef, file, {
        contentType: file.type,
    });

    return new Promise((resolve, reject) => {
        task.on(
            'state_changed',
            snapshot => {
                if (onProgress) {
                    onProgress(Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100));
                }
            },
            reject,
            async () => {
                try {
                    const url = await getDownloadURL(task.snapshot.ref);
                    resolve(url);
                } catch (err) {
                    reject(err);
                }
            },
        );
    });
}

/** Derives a sanitised filename from an original filename, keeping the extension. */
export function sanitiseFilename(original: string): string {
    const ext = original.includes('.') ? '.' + original.split('.').pop() : '';
    return `cover${ext}`;
}
