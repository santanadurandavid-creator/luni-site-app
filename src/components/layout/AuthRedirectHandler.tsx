'use client';

import { useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';

export function AuthRedirectHandler() {
    const { isLoading, isAuthenticated } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            // Check if user is trying to access shared content
            const openParam = searchParams?.get('open');

            if (openParam) {
                // User is trying to access shared content - redirect to access-content page with full URL
                const currentPath = pathname || '/';
                const fullUrl = `${currentPath}?open=${openParam}`;
                router.replace(`/access-content?redirect=${encodeURIComponent(fullUrl)}`);
            } else {
                // Regular unauthenticated access - also redirect to access-content page
                // This shows the benefits page instead of going directly to login
                const currentPath = pathname || '/profile';
                router.replace(`/access-content?redirect=${encodeURIComponent(currentPath)}`);
            }
        }
    }, [isLoading, isAuthenticated, router, pathname, searchParams]);

    return null;
}
