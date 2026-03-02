import { ContentItem } from '@/lib/types';

// DEBUG HELPER: Paste this in console to check if your content items have banner data

export function debugBannerData(item: ContentItem | null) {
    if (!item) {
        console.log('❌ No item selected');
        return;
    }

    console.log('=== BANNER DEBUG ===');
    console.log('Item ID:', item.id);
    console.log('Item Title:', item.title);
    console.log('---');

    // Check Ad system (different from banners!)
    console.log('🔴 AD SYSTEM (AdPromptModal):');
    console.log('  showAd:', item.showAd);
    console.log('  adUrl:', item.adUrl);
    console.log('---');

    // Check Banner system
    console.log('🟢 BANNER SYSTEM (Inside Modal):');
    console.log('  bannerType:', item.bannerType);
    console.log('  bannerImageUrl:', item.bannerImageUrl);
    console.log('  bannerClickUrl:', item.bannerClickUrl);
    console.log('  bannerScript:', item.bannerScript?.substring(0, 100));
    console.log('---');

    // Check if banner will display
    const hasBannerData = !!(item.bannerImageUrl || item.bannerScript);
    console.log('✓ Has Banner Data:', hasBannerData);

    if (!hasBannerData) {
        console.warn('⚠️ No banner data configured! Go to admin and add:');
        console.warn('  - bannerImageUrl + bannerClickUrl (for image banner)');
        console.warn('  - OR bannerScript (for script banner)');
    }

    return {
        hasAdSystem: item.showAd,
        hasBannerSystem: hasBannerData,
        needsConfiguration: !hasBannerData
    };
}
