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
 * Resizes an image File to fit within maxPx × maxPx (maintaining aspect ratio).
 * Returns the resized file as a new File (JPEG, quality 0.85).
 * Falls back to the original file if the browser lacks canvas support.
 */
export async function resizeImageFile(file: File, maxPx = 1200): Promise<File> {
    return new Promise(resolve => {
        const img = new Image();
        const objectUrl = URL.createObjectURL(file);
        img.onload = () => {
            URL.revokeObjectURL(objectUrl);
            const { width, height } = img;
            if (width <= maxPx && height <= maxPx) {
                // Already small enough — no resize needed
                resolve(file);
                return;
            }
            const scale = Math.min(maxPx / width, maxPx / height);
            const canvas = document.createElement('canvas');
            canvas.width = Math.round(width * scale);
            canvas.height = Math.round(height * scale);
            const ctx = canvas.getContext('2d');
            if (!ctx) { resolve(file); return; }
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            canvas.toBlob(
                blob => {
                    if (!blob) { resolve(file); return; }
                    // Keep a .jpg extension to signal the output format
                    const baseName = file.name.replace(/\.[^.]+$/, '');
                    resolve(new File([blob], `${baseName}.jpg`, { type: 'image/jpeg' }));
                },
                'image/jpeg',
                0.85,
            );
        };
        img.onerror = () => { URL.revokeObjectURL(objectUrl); resolve(file); };
        img.src = objectUrl;
    });
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
