/**
 * Utilities for handling offline content in the PWA
 */

export async function downloadFileForOffline(url: string, cacheName: string = 'multimedia-cache') {
    if (!url || typeof window === 'undefined') return false;

    try {
        const cache = await caches.open(cacheName);
        const response = await fetch(url);
        if (response.ok) {
            await cache.put(url, response);
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error downloading file for offline:', error);
        return false;
    }
}

export async function isFileCached(url: string, cacheName: string = 'multimedia-cache') {
    if (!url || typeof window === 'undefined') return false;

    try {
        const cache = await caches.open(cacheName);
        const response = await cache.match(url);
        return !!response;
    } catch (error) {
        return false;
    }
}

export async function removeFileFromCache(url: string, cacheName: string = 'multimedia-cache') {
    if (!url || typeof window === 'undefined') return false;

    try {
        const cache = await caches.open(cacheName);
        return await cache.delete(url);
    } catch (error) {
        return false;
    }
}
