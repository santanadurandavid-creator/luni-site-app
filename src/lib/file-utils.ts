/**
 * Utility functions for file processing
 */

export const MAX_IMAGES = 20;
export const MAX_IMAGE_SIZE_MB = 10;

/**
 * Convert a File object to a data URI string
 */
export async function fileToDataUri(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            if (typeof reader.result === 'string') {
                resolve(reader.result);
            } else {
                reject(new Error('Failed to convert file to data URI'));
            }
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
    });
}

/**
 * Alias for fileToDataUri for semantic clarity when dealing specifically with images
 */
export const imageToDataUri = fileToDataUri;

/**
 * Validate if a file is an image
 */
export function isImage(file: File): boolean {
    return file.type.startsWith('image/');
}

/**
 * Format file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Validate image file size
 */
export function validateImageSize(file: File, maxSizeMB: number = MAX_IMAGE_SIZE_MB): { valid: boolean; error?: string } {
    const maxBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxBytes) {
        return {
            valid: false,
            error: `El archivo es demasiado grande. Tamaño máximo: ${maxSizeMB}MB`
        };
    }
    return { valid: true };
}

/**
 * Validate image count
 */
export function validateImageCount(files: File[], maxImages: number = MAX_IMAGES): { valid: boolean; error?: string } {
    if (files.length > maxImages) {
        return {
            valid: false,
            error: `Máximo ${maxImages} imágenes permitidas.`
        };
    }
    return { valid: true };
}
