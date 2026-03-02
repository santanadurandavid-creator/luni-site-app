'use client';

import { useEffect } from 'react';
import { getFirebaseServices } from '@/lib/firebase';
import { collection, getDocs, query, limit, orderBy } from 'firebase/firestore';
import { downloadFileForOffline } from '@/lib/offline-utils';

export function CacheWarmer() {
    useEffect(() => {
        if (typeof window === 'undefined' || !navigator.onLine) {
            return;
        }

        const warmUpCache = async () => {
            console.log('[CacheWarmer] Iniciando sincronización agresiva...');

            try {
                const { db } = getFirebaseServices();

                // 1. Warm up Firestore Data
                const syncTasks = [
                    { col: 'content', q: query(collection(db, 'content'), limit(50)) },
                    { col: 'announcements', q: query(collection(db, 'announcements'), orderBy('createdAt', 'desc'), limit(20)) },
                    { col: 'settings', q: query(collection(db, 'settings')) }
                ];

                const results = await Promise.allSettled(
                    syncTasks.map(async (task) => {
                        const snap = await getDocs(task.q);
                        console.log(`[CacheWarmer] Datos sincronizados: ${task.col} (${snap.docs.length} docs)`);

                        // 2. Pre-fetch images for some items
                        const imagePromises = snap.docs.slice(0, 10).map(doc => {
                            const data = doc.data();
                            if (data.imageUrl) {
                                return downloadFileForOffline(data.imageUrl, 'static-image-assets');
                            }
                            return null;
                        }).filter(Boolean);

                        await Promise.allSettled(imagePromises);
                    })
                );

                // 3. Warm up PWA Layout/Routes
                const routesToCache = [
                    '/',
                    '/profile/',
                    '/quizzes/',
                    '/content/',
                    '/updates/',
                    '/clases/',
                ];

                if ('serviceWorker' in navigator) {
                    const registration = await navigator.serviceWorker.ready;
                    if (registration.active) {
                        await Promise.allSettled(
                            routesToCache.map(route =>
                                fetch(route, { priority: 'low' }).catch(() => null)
                            )
                        );
                        console.log('[CacheWarmer] Rutas PWA sincronizadas');
                    }
                }

                console.log('[CacheWarmer] ¡Sincronización completa! App lista para offline.');
            } catch (error) {
                console.error('[CacheWarmer] Error en sincronización:', error);
            }
        };

        // Delay start to prioritize main app loading
        const timer = setTimeout(warmUpCache, 2000);
        return () => clearTimeout(timer);
    }, []);

    return null;
}
