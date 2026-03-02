'use client';

import { useRouter, usePathname } from 'next/navigation';
import { ReactNode, useRef, useEffect } from 'react';

const pageOrder = ['/profile', '/clases', '/content', '/quizzes', '/updates'];

export function SwipeNavigation({ children }: { children: ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const touchStartX = useRef<number>(0);
    const touchStartY = useRef<number>(0);
    const touchEndX = useRef<number>(0);
    const touchEndY = useRef<number>(0);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const handleTouchStart = (e: TouchEvent) => {
            touchStartX.current = e.touches[0].clientX;
            touchStartY.current = e.touches[0].clientY;
        };

        const handleTouchMove = (e: TouchEvent) => {
            touchEndX.current = e.touches[0].clientX;
            touchEndY.current = e.touches[0].clientY;
        };

        const handleTouchEnd = () => {
            const deltaX = touchStartX.current - touchEndX.current;
            const deltaY = touchStartY.current - touchEndY.current;
            const minSwipeDistance = 50;

            // Only process horizontal swipes (where horizontal movement is greater than vertical)
            if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > minSwipeDistance) {
                const currentIndex = pageOrder.indexOf(pathname);

                if (deltaX > 0) {
                    // Swiped left -> go to next page
                    if (currentIndex !== -1 && currentIndex < pageOrder.length - 1) {
                        router.push(pageOrder[currentIndex + 1]);
                    }
                } else {
                    // Swiped right -> go to previous page
                    if (currentIndex !== -1 && currentIndex > 0) {
                        router.push(pageOrder[currentIndex - 1]);
                    }
                }
            }

            // Reset values
            touchStartX.current = 0;
            touchStartY.current = 0;
            touchEndX.current = 0;
            touchEndY.current = 0;
        };

        container.addEventListener('touchstart', handleTouchStart, { passive: true });
        container.addEventListener('touchmove', handleTouchMove, { passive: true });
        container.addEventListener('touchend', handleTouchEnd, { passive: true });

        return () => {
            container.removeEventListener('touchstart', handleTouchStart);
            container.removeEventListener('touchmove', handleTouchMove);
            container.removeEventListener('touchend', handleTouchEnd);
        };
    }, [pathname, router]);

    return (
        <div ref={containerRef} className="flex-1 flex flex-col min-h-full w-full">
            {children}
        </div>
    );
}
