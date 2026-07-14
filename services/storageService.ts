import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
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

/**
 * Returns true if the URL points to an object in this project's Firebase Storage bucket.
 */
export function isStorageUrl(url: string): boolean {
    return url.includes('firebasestorage.googleapis.com');
}

/**
 * Deletes a file from Firebase Storage by its download URL.
 * Silently succeeds if the object no longer exists.
 */
export async function deleteImage(url: string): Promise<void> {
    if (!url || !isStorageUrl(url)) return;
    try {
        const storageRef = ref(storage, url);
        await deleteObject(storageRef);
    } catch (err: any) {
        // object-not-found is fine — already deleted
        if (err?.code !== 'storage/object-not-found') throw err;
    }
}
