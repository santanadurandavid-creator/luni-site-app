
'use client';
import { useEffect, useState, useMemo, useCallback } from 'react';
import type { ContentItem } from '@/lib/types';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { getFirebaseServices } from '@/lib/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import Image from 'next/image';
import { DynamicUrlContentModal, DynamicContentModal, DynamicPremiumContentModal, DynamicVideoModal } from '@/components/shared/dynamic';
import { LiveClassModal } from '@/components/shared/LiveClassModal';
import { useIsMobile } from '@/hooks/use-mobile';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn, sortContentItems, getSpotifyEmbedUrl } from '@/lib/utils';
import { isFuture } from 'date-fns';
import { Video, Film, Mic, Star, Lock, Headphones, BookOpen, ClipboardCheck, CheckCircle } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { BannerAd } from '@/components/ads/AdManager';
import { AdPromptModal } from '@/components/ads/AdPromptModal';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';

function ClassesLoadingSkeleton() {
  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-2 sm:space-y-8">
      <Skeleton className="h-10 w-full mb-6" />
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-6">
        {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-56" />)}
      </div>
    </div>
  );
}



const getContentIcon = (type: string) => {
  switch (type) {
    case 'video':
    case 'class':
      return Video;
    case 'quiz':
      return ClipboardCheck;
    case 'podcast':
      return Headphones;
    case 'content':
      return BookOpen;
    default:
      return BookOpen;
  }
};

const getContentColor = (type: string) => {
  switch (type) {
    case 'video':
    case 'class':
      return 'from-[#3A5064] to-[#2d3e50]';
    case 'quiz':
      return 'from-[#4a6074] to-[#3A5064]';
    case 'podcast':
      return 'from-[#3A5064] to-[#4a6074]';
    case 'content':
      return 'from-[#3A5064] to-[#4a6074]';
    default:
      return 'from-gray-500 to-gray-600';
  }
};

const ContentTypeCard = ({ item, onClick, isMobileView, isActive }: { item: ContentItem; onClick: (item: ContentItem) => void; isMobileView?: boolean; isActive?: boolean }) => {
  const { user } = useAuth();
  const isPremium = item.accessLevel === 'premium';
  const isUserPremium = user?.premiumUntil && isFuture(user.premiumUntil.toDate());

  const isSubjectUnlocked = user?.unlockedSubjects?.includes(item.subject);
  const canAccess = Boolean(user?.isAdmin) || isUserPremium || isSubjectUnlocked;
  const isLockedPremium = isPremium && !canAccess;

  // Check if content is completed
  const completedContentIds: string[] = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('completedContentIds') || '[]') : [];
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    const hasCompleted = completedContentIds.includes(item.id || '');
    setCompleted(hasCompleted);

    const onContentCompleted = (e: CustomEvent) => {
      if (e.detail?.id === item.id) {
        setCompleted(true);
      }
    };
    window.addEventListener('contentCompleted', onContentCompleted as EventListener);
    return () => {
      window.removeEventListener('contentCompleted', onContentCompleted as EventListener);
    };
  }, [item.id]);

  const typeIcons: Record<string, React.ReactNode> = {
    'class': <Video className="h-4 w-4 text-muted-foreground" />,
    'video': <Film className="h-4 w-4 text-muted-foreground" />,
    'podcast': <Mic className="h-4 w-4 text-muted-foreground" />
  }

  const typeLabels: Record<string, string> = {
    'class': 'Clase',
    'video': 'Video',
    'podcast': 'Podcast',
  }

  // Horizontal card for podcasts (desktop and mobile)
  if (item.type === 'podcast') {
    if (item.spotifyUrl) {
      return (
        <Card className={cn("overflow-hidden border-none bg-card/50 backdrop-blur-sm shadow-sm hover:shadow-md transition-all", isActive && "ring-2 ring-primary ring-offset-2 rounded-xl")}>
          <iframe
            style={{ borderRadius: '12px' }}
            src={getSpotifyEmbedUrl(item.spotifyUrl) || ''}
            width="100%"
            height="152"
            frameBorder="0"
            allowFullScreen={true}
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
          />
        </Card>
      );
    }
    return (
      <Card className={cn("overflow-hidden cursor-pointer group flex flex-row items-center border-0 bg-white shadow-sm hover:shadow-md transition-all duration-300", isActive && "border-primary ring-2 ring-primary")} onClick={() => onClick(item)}>
        <div className="relative w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 overflow-hidden rounded-xl ml-3 my-3">

          {item.imageUrl ? (
            <Image fill src={item.imageUrl} alt={item.title} className="object-cover transition-transform duration-300 group-hover:scale-105" />
          ) : (
            <div className={`w-full h-full bg-gradient-to-br ${getContentColor(item.type)} flex items-center justify-center`}>
              {(() => {
                const Icon = getContentIcon(item.type);
                return <Icon className="w-10 h-10 text-white/90" />;
              })()}
            </div>
          )}
          <div className="absolute top-1 left-1 z-10">
            {isPremium && <Badge variant="default" className="w-fit bg-amber-500 text-white px-1.5 py-0 text-[10px]"><Star className="mr-0.5 h-2.5 w-2.5 fill-current" /> Premium</Badge>}
          </div>
          {isLockedPremium && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <Lock className="h-6 w-6 text-white" />
            </div>
          )}
          {completed && (
            <CheckCircle className="absolute top-1 right-1 h-5 w-5 text-green-500 bg-white rounded-full shadow-sm" />
          )}
        </div>
        <div className="p-3 flex-grow">
          <Badge variant="outline" className="mb-1 text-[10px] opacity-70 group-hover:opacity-100 transition-opacity">{item.category}</Badge>
          <CardTitle className="text-base font-bold line-clamp-2 leading-tight group-hover:text-primary transition-colors">{item.title}</CardTitle>
          <CardDescription className="text-xs mt-1 font-medium">{item.subject}</CardDescription>
        </div>
      </Card>
    )
  }

  const cardContent = (
    <Card className={cn(
      "flex flex-col overflow-hidden transition-all duration-500 h-full group hover:border-primary/50 md:hover:shadow-2xl md:hover:shadow-primary/5 md:hover:-translate-y-1 cursor-pointer bg-white dark:bg-card relative z-10",
      isActive && "border-primary ring-2 ring-primary",
      completed && "border-green-500"
    )} onClick={() => onClick(item)}>
      <div className="relative aspect-video overflow-hidden">

        {item.imageUrl ? (
          <>
            <Image fill src={item.imageUrl} alt={item.title} className="object-cover transition-transform duration-700 md:group-hover:scale-110" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 md:group-hover:opacity-100 transition-opacity duration-500" />
          </>
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${getContentColor(item.type)} flex items-center justify-center`}>
            {(() => {
              const Icon = getContentIcon(item.type);
              return <Icon className="w-16 h-16 text-white/90 drop-shadow-lg transition-transform duration-500 md:group-hover:scale-110" />;
            })()}
          </div>
        )}
        <div className="absolute top-2 left-2 z-10">
          {isPremium && (
            <Badge variant="default" className="bg-amber-500 hover:bg-amber-600 text-white shadow-lg border-amber-400/50">
              <Star className="mr-1 h-3 w-3 fill-current" /> Premium
            </Badge>
          )}
        </div>
        {isLockedPremium && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center">
            <Lock className="h-8 w-8 text-white drop-shadow-2xl" />
          </div>
        )}
        {completed && (
          <div className="absolute top-2 right-2 bg-white/90 dark:bg-black/80 rounded-full p-1 shadow-lg">
            <CheckCircle className="h-6 w-6 text-green-500" />
          </div>
        )}
      </div>
      <div className="p-4 md:p-6 lg:p-4 flex-grow flex flex-col">
        <Badge variant="outline" className="mb-2 md:mb-3 lg:mb-2 w-fit text-[10px] md:text-xs lg:text-[10px] font-bold tracking-tight opacity-70 group-hover:opacity-100 transition-opacity">{item.subject}</Badge>
        <h3 className="text-base md:text-lg lg:text-base font-bold leading-tight font-headline text-foreground md:group-hover:text-primary transition-colors line-clamp-2 md:line-clamp-3 lg:line-clamp-2">{item.title}</h3>
        <div className="mt-auto pt-4 md:pt-6 lg:pt-4 flex justify-between items-center text-xs md:text-sm lg:text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5 md:gap-2 font-medium">
            {typeIcons[item.type]}
            <span className="capitalize">{typeLabels[item.type]}</span>
          </div>
          <span className="font-medium opacity-80">{item.category}</span>
        </div>
      </div>
    </Card>
  );

  // Vertical card for classes/videos on mobile
  if (isMobileView) {
    return (
      <Card className={cn(
        "overflow-hidden cursor-pointer group flex flex-row items-center transition-all duration-300 bg-white dark:bg-card relative z-10 shadow-sm",
        isActive && "border-primary ring-2 ring-primary",
        completed && "border-green-500"
      )} onClick={() => onClick(item)}>
        <div className="relative w-24 h-24 flex-shrink-0 overflow-hidden rounded-md ml-3 my-3">

          {item.imageUrl ? (
            <Image fill src={item.imageUrl} alt={item.title} className="object-cover transition-transform duration-300 group-hover:scale-105" />
          ) : (
            <div className={`w-full h-full bg-gradient-to-br ${getContentColor(item.type)} flex items-center justify-center`}>
              {(() => {
                const Icon = getContentIcon(item.type);
                return <Icon className="w-12 h-12 text-white/90" />;
              })()}
            </div>
          )}
          <div className="absolute top-1 left-1 z-10">
            {isPremium && <Badge variant="default" className="w-fit bg-amber-500 text-white px-1.5 py-0 text-[10px]"><Star className="mr-0.5 h-2.5 w-2.5 fill-current" /> Premium</Badge>}
          </div>
          {isLockedPremium && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <Lock className="h-6 w-6 text-white" />
            </div>
          )}
          {completed && (
            <CheckCircle className="absolute top-1 right-1 h-6 w-6 text-green-500" />
          )}
        </div>
        <div className="p-3 md:p-4 flex-grow">
          <Badge variant="outline" className="mb-1 text-[10px] md:text-xs opacity-70">{item.subject}</Badge>
          <h3 className="text-sm md:text-base font-bold line-clamp-2 leading-tight font-headline text-foreground">{item.title}</h3>
          <div className="flex items-center gap-1.5 text-[10px] md:text-xs text-muted-foreground mt-2">
            {typeIcons[item.type]}
            <span className="capitalize">{typeLabels[item.type]}</span>
          </div>
        </div>
      </Card>
    )
  }

  return cardContent;
}

export default function ClasesPage() {
  const isMobileView = useIsMobile();
  const [content, setContent] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);
  const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [liveClassItem, setLiveClassItem] = useState<ContentItem | null>(null);
  const [showAdPrompt, setShowAdPrompt] = useState(false);
  const [showAdModal, setShowAdModal] = useState(false);
  const [adUrl, setAdUrl] = useState('');
  const [adCountdown, setAdCountdown] = useState(10);
  const [canCloseAd, setCanCloseAd] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const { user, markFreeContentAsViewed, playPodcast, activePodcast, stopPodcast } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const contentRef = collection(getFirebaseServices().db, 'content');
    const q = query(contentRef, where('type', 'in', ['class', 'video', 'podcast']));

    const unsubscribeAll = onSnapshot(q, (querySnapshot) => {
      const contentData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ContentItem));
      // Sort items using shared utility (order field + reactive number fallback)
      setContent(sortContentItems(contentData));
      setLoading(false);
    }, (error) => {
      console.error("Error fetching content:", error);
      setLoading(false);
    });

    return () => {
      if (unsubscribeAll) unsubscribeAll();
    }
  }, [user]);

  const { videos, podcasts, liveClasses } = useMemo(() => {
    const activeArea = user?.examType;

    const videoItems: ContentItem[] = content.filter(c =>
      c.type === 'video' && (!activeArea || c.category === activeArea)
    );
    const podcastItems: ContentItem[] = content.filter(c =>
      c.type === 'podcast' && (!activeArea || c.category === activeArea)
    );
    const liveClassItems: ContentItem[] = content.filter(c =>
      c.type === 'class' && (!activeArea || c.category === activeArea)
    );

    return { videos: videoItems, podcasts: podcastItems, liveClasses: liveClassItems };
  }, [content, user?.examType]);

  // Handle podcast click - if already playing, stop it; otherwise, select it
  const handlePodcastClick = useCallback((item: ContentItem) => {
    if (activePodcast && activePodcast.id === item.id) {
      // If clicking on the currently playing podcast, stop it
      stopPodcast();
    } else {
      // Otherwise, select it to play
      setSelectedItem(item);
    }
  }, [activePodcast, stopPodcast]);

  const openContent = useCallback((item: ContentItem) => {
    if (item.type === 'class') {
      setLiveClassItem(item);
    } else if (item.type === 'video') {
      setIsVideoModalOpen(true);
    } else if (item.type === 'podcast') {
      // Stop any currently playing podcast before starting a new one
      if (activePodcast && activePodcast.id !== item.id) {
        stopPodcast();
      }
      playPodcast(item);
    }
  }, [playPodcast, activePodcast, stopPodcast]);

  // New unified `useEffect` to handle item opening logic
  useEffect(() => {
    if (!selectedItem || !user) return;

    // Check if it's a class - open special modal (Handles enrollment, live/recorded/scheduled states)
    if (selectedItem.type === 'class') {
      setLiveClassItem(selectedItem);
      setSelectedItem(null);
      return;
    }

    const isPremium = selectedItem.accessLevel === 'premium';
    const isUserPremium = user?.premiumUntil && isFuture(user.premiumUntil.toDate());
    const isSubjectUnlocked = user?.unlockedSubjects?.includes(selectedItem.subject);

    // Check if user has already viewed this free content (to skip ad on subsequent views)
    const hasViewedFreeContent = user?.viewedFreeContentIds?.includes(selectedItem.id || '');

    // FIRST: Check if user is admin or premium or has subject unlocked (they bypass ads and can access premium content)
    if (user?.isAdmin || isUserPremium || isSubjectUnlocked) {
      openContent(selectedItem);
      if (!hasViewedFreeContent && selectedItem.id) {
        markFreeContentAsViewed(selectedItem.id);
      }
      // Only clear selectedItem for podcasts to prevent re-execution
      if (selectedItem.type === 'podcast') {
        setSelectedItem(null);
      }
      return;
    }

    // SECOND: Check if content is premium and user is not premium
    if (isPremium) {
      setIsPremiumModalOpen(true);
      return;
    }

    // THIRD: Check if ad should be shown (only for non-premium users)
    if (selectedItem.showAd && !hasViewedFreeContent) {
      setShowAdPrompt(true);
      return;
    }

    // FOURTH: It's free content and no ad needed - open directly
    if (selectedItem.type === 'video') {
      setIsVideoModalOpen(true);
    } else if (selectedItem.type === 'podcast') {
      // Stop any currently playing podcast before starting a new one
      if (activePodcast && activePodcast.id !== selectedItem.id) {
        stopPodcast();
      }
      playPodcast(selectedItem);
      // Clear selectedItem for podcasts to prevent re-execution
      setSelectedItem(null);
    }
    if (!hasViewedFreeContent && selectedItem.id) {
      markFreeContentAsViewed(selectedItem.id);
    }
  }, [selectedItem, user, activePodcast, stopPodcast, playPodcast, markFreeContentAsViewed, openContent]);





  // This useEffect handles opening content from a URL parameter
  useEffect(() => {
    if (!content.length) return;

    // Check searchParams directly
    const openItemId = searchParams.get('open');

    if (openItemId) {
      const itemToOpen = content.find(item => item.id === openItemId);
      if (itemToOpen) {
        setSelectedItem(itemToOpen);

        // Use window.history to silently remove the param without triggering a Next.js navigation that might be problematic
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete('open');
        window.history.replaceState({}, '', newUrl.toString());
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, content]);

  const handleOpenPurchaseModal = () => {
    setIsPremiumModalOpen(false);
  };

  const handleWatchAd = () => {
    const adUrl = selectedItem?.adUrl;
    if (adUrl) {
      window.open(adUrl, '_blank');
    } else {
      toast({ variant: 'destructive', title: 'Error', description: 'No se ha configurado una URL de anuncio para este contenido.' });
      return;
    }
    setShowAdPrompt(false);
    setShowAdModal(true);
    setCanCloseAd(false);
    setAdCountdown(10);

    const interval = setInterval(() => {
      setAdCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setCanCloseAd(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleCloseAd = () => {
    setShowAdModal(false);
    setCanCloseAd(false);
    setAdCountdown(10);
    // Now open the content directly by setting the modal state
    if (selectedItem) {
      if (selectedItem.type === 'video' || selectedItem.type === 'class') {
        setIsVideoModalOpen(true);
      } else if (selectedItem.type === 'podcast') {
        // Stop any currently playing podcast before starting a new one
        if (activePodcast && activePodcast.id !== selectedItem.id) {
          stopPodcast();
        }
        playPodcast(selectedItem);
        setSelectedItem(null); // Clear to prevent re-execution
      }
      const hasViewedFreeContent = user?.viewedFreeContentIds?.includes(selectedItem.id || '');
      if (!hasViewedFreeContent && selectedItem.id) {
        markFreeContentAsViewed(selectedItem.id);
      }
    }
  };

  if (loading) return <ClassesLoadingSkeleton />;

  const renderContentGrid = (items: ContentItem[], isPodcastList = false) => {
    if (items.length === 0) {
      return <p className="text-center py-10 text-muted-foreground">No hay contenido disponible en esta sección.</p>;
    }

    if (isPodcastList) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2" key="podcast-grid">
          {items.map(c => <ContentTypeCard key={c.id} item={c} onClick={handlePodcastClick} isMobileView={isMobileView} isActive={isPodcastList && activePodcast?.id === c.id} />)}
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-6">
        {items.map(c => <ContentTypeCard key={c.id} item={c} onClick={setSelectedItem} isMobileView={isMobileView} />)}
      </div>
    );
  }

  return (
    <>
      <div className="container mx-auto p-4 sm:p-6 space-y-2 sm:space-y-8">
        <Tabs defaultValue="videos" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="videos">Videos</TabsTrigger>
            <TabsTrigger value="podcasts">Podcasts</TabsTrigger>
            <TabsTrigger value="live-classes">Clases en Vivo</TabsTrigger>
          </TabsList>

          <TabsContent value="videos">
            {renderContentGrid(videos)}
          </TabsContent>

          <TabsContent value="podcasts" className="relative pb-32">
            {renderContentGrid(podcasts, true)}
          </TabsContent>

          <TabsContent value="live-classes">
            {renderContentGrid(liveClasses)}
          </TabsContent>
        </Tabs>
      </div>

      <DynamicUrlContentModal
        isOpen={isViewerOpen}
        setIsOpen={() => setIsViewerOpen(false)}
        classItem={selectedItem as ContentItem | null} // selectedItem could be null, but modal handles this
      />

      <DynamicVideoModal
        item={isVideoModalOpen ? selectedItem : null}
        onClose={() => {
          setIsVideoModalOpen(false)
          setSelectedItem(null);
        }}
      />

      <LiveClassModal
        item={liveClassItem}
        onClose={() => setLiveClassItem(null)}
      />

      <DynamicPremiumContentModal
        isOpen={isPremiumModalOpen}
        setIsOpen={(open) => {
          setIsPremiumModalOpen(open);
          if (!open) setSelectedItem(null);
        }}
        onConfirm={handleOpenPurchaseModal}
      />
      <AdPromptModal
        isOpen={showAdPrompt}
        onClose={() => {
          setShowAdPrompt(false);
          setSelectedItem(null);
        }}
        onWatchAd={handleWatchAd}
      />
      <Dialog open={showAdModal} onOpenChange={(open) => { if (canCloseAd) handleCloseAd(); }}>
        <DialogContent className="max-w-md flex flex-col items-center justify-center p-6 rounded-lg">
          <DialogHeader>
            <DialogTitle className="text-center">Anuncio Abierto</DialogTitle>
          </DialogHeader>
          <div className="text-center py-8">
            <p className="text-lg mb-4">El anuncio se ha abierto en una nueva pestaña</p>
            <p className="text-sm text-gray-500 mb-4">
              Puedes cerrar este mensaje en {adCountdown} segundos.
            </p>
            {canCloseAd && (
              <Button onClick={handleCloseAd} className="mt-4">
                Cerrar y Ver Contenido
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
      <BannerAd section="classes" />
    </>
  );
}



