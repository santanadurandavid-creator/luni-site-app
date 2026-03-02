'use client';

import { useAuth } from '@/hooks/use-auth';
import { ContentItem } from '@/lib/types';
import { AdScriptRenderer } from './AdScriptRenderer';

interface ModalBannerProps {
    item: ContentItem;
}

/**
 * Modal Banner Component - Shows banners at the bottom of content modals
 * Uses the same logic and design as BannerAd component
 * Desktop: Double size (70% width, 16vh height)
 */
export function ModalBanner({ item }: ModalBannerProps) {
    const { user } = useAuth();

    // Check if user is premium (same logic as BannerAd)
    const isPremium = user?.premiumUntil && new Date(user.premiumUntil.toDate ? user.premiumUntil.toDate() : user.premiumUntil) > new Date();

    // Don't show banner if:
    // - No user logged in
    // - User is premium
    // - showBanner is not enabled
    // - No banner data configured
    if (!user || isPremium || !item.showBanner || (!item.bannerImageUrl && !item.bannerScript)) {
        return null;
    }

    return (
        <div className="flex-shrink-0 mt-auto">
            <div className="w-full flex justify-center items-center p-2 bg-background/50 border-t">
                {item.bannerType === 'script' && item.bannerScript ? (
                    <div className="w-full flex justify-center">
                        <AdScriptRenderer script={item.bannerScript} />
                    </div>
                ) : item.bannerImageUrl ? (
                    item.bannerClickUrl ? (
                        <a
                            href={item.bannerClickUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block mx-auto transition-all duration-300 overflow-hidden rounded-lg shadow-md hover:shadow-lg border border-white/10 w-[75%] md:w-[70%] h-[8vh] md:h-[16vh]"
                        >
                            <img
                                src={item.bannerImageUrl}
                                alt="Banner publicitario"
                                className="w-full h-full object-fill bg-white/95"
                            />
                        </a>
                    ) : (
                        <div className="block mx-auto transition-all duration-300 overflow-hidden rounded-lg shadow-md border border-white/10 w-[75%] md:w-[70%] h-[8vh] md:h-[16vh]">
                            <img
                                src={item.bannerImageUrl}
                                alt="Banner publicitario"
                                className="w-full h-full object-fill bg-white/95"
                            />
                        </div>
                    )
                ) : null}
            </div>
        </div>
    );
}
