// Service Worker Cache Management
// This file provides utilities to manage service worker cache and prevent stale content

export const clearServiceWorkerCache = async (): Promise<boolean> => {
    try {
        if ('serviceWorker' in navigator) {
            // Get all cache names
            const cacheNames = await caches.keys();

            // Delete all caches
            await Promise.all(
                cacheNames.map(cacheName => {
                    console.log('[CACHE] Deleting cache:', cacheName);
                    return caches.delete(cacheName);
                })
            );

            // Unregister all service workers
            const registrations = await navigator.serviceWorker.getRegistrations();
            await Promise.all(
                registrations.map(registration => {
                    console.log('[SW] Unregistering service worker');
                    return registration.unregister();
                })
            );

            console.log('[CACHE] All caches cleared and service workers unregistered');
            return true;
        }
        return false;
    } catch (error) {
        console.error('[CACHE] Error clearing cache:', error);
        return false;
    }
};

export const checkAndRefreshIfStale = async (): Promise<void> => {
    try {
        // Check if we have a stored version
        const storedVersion = localStorage.getItem('app_version');
        const currentVersion = process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0';

        // If version mismatch or first load, clear cache
        if (!storedVersion || storedVersion !== currentVersion) {
            console.log('[CACHE] Version mismatch detected, clearing cache');
            await clearServiceWorkerCache();
            localStorage.setItem('app_version', currentVersion);

            // Reload the page to get fresh content
            setTimeout(() => {
                window.location.reload();
            }, 500);
        }

        // Update last visit time
        localStorage.setItem('last_visit', new Date().toISOString());
    } catch (error) {
        console.error('[CACHE] Error checking staleness:', error);
    }
};

export const initCacheManagement = (): void => {
    // Run on page load
    if (typeof window !== 'undefined') {
        const lastVisit = localStorage.getItem('last_visit');

        if (lastVisit) {
            const daysSinceLastVisit = (new Date().getTime() - new Date(lastVisit).getTime()) / (1000 * 60 * 60 * 24);

            // If more than 1 day since last visit, clear cache to ensure fresh content
            if (daysSinceLastVisit > 1) {
                console.log('[CACHE] Last visit was', daysSinceLastVisit.toFixed(1), 'days ago, clearing cache');
                clearServiceWorkerCache().then(() => {
                    localStorage.setItem('last_visit', new Date().toISOString());
                });
            }
        } else {
            // First visit, set the timestamp
            localStorage.setItem('last_visit', new Date().toISOString());
        }
    }
};
