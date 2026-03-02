'use client';

import type { ContentItem } from '@/lib/types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Video, FileText, ClipboardCheck, MoreVertical, Edit, Trash2, Star, Lock, CheckCircle, Headphones, BookOpen, CloudDownload, FileCheck, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '../ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { isFuture } from 'date-fns';
import { cn } from '@/lib/utils';
import { downloadFileForOffline, isFileCached } from '@/lib/offline-utils';
import { useToast } from '@/hooks/use-toast';

interface ContentCardProps {
  item: ContentItem;
  onOpen: (item: ContentItem) => void;
  onEdit: (item: ContentItem) => void;
  onDelete: (item: ContentItem) => void;
  isMobileView?: boolean;
}

const typeIcons = {
  video: <Video className="h-4 w-4 text-muted-foreground" />,
  content: <FileText className="h-4 w-4 text-muted-foreground" />,
  quiz: <ClipboardCheck className="h-4 w-4 text-muted-foreground" />,
  class: <Video className="h-4 w-4 text-muted-foreground" />,
  podcast: <Headphones className="h-4 w-4 text-muted-foreground" />
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

export function ContentCard({ item, onOpen, onEdit, onDelete, isMobileView }: ContentCardProps) {
  const { user } = useAuth();
  const isPremium = item.accessLevel === 'premium';
  const premiumUntilDate = user?.premiumUntil?.toDate ? user.premiumUntil.toDate() : user?.premiumUntil;
  const isUserPremium = premiumUntilDate && isFuture(premiumUntilDate);
  const hasViewedFreeContent = user?.viewedFreeContentIds?.includes(item.id || '');

  const isSubjectUnlocked = user?.unlockedSubjects?.includes(item.subject);
  const canAccess = user?.isAdmin || isUserPremium || isSubjectUnlocked;
  // Removed restriction for non-premium content - allow unlimited access
  const isLockedForNonPremium = false; // !isPremium && hasViewedFreeContent && !canAccess;
  const isLockedPremium = isPremium && !canAccess;

  const completedContentIds: string[] = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('completedContentIds') || '[]') : [];

  const [completed, setCompleted] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isOfflineReady, setIsOfflineReady] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const checkOfflineStatus = async () => {
      const audioUrl = item.interactiveContent?.explanatory?.audioUrl;
      const imageUrl = item.imageUrl;

      if (audioUrl) {
        const cached = await isFileCached(audioUrl);
        if (cached) {
          setIsOfflineReady(true);
          return;
        }
      }

      if (imageUrl) {
        const cached = await isFileCached(imageUrl, 'static-image-assets');
        if (cached) {
          setIsOfflineReady(true);
          return;
        }
      }

      // Check if explicitly marked in localStorage
      const downloadedItems = JSON.parse(localStorage.getItem('offlineDownloadedItems') || '[]');
      if (downloadedItems.includes(item.id)) {
        setIsOfflineReady(true);
      }
    };
    checkOfflineStatus();
  }, [item]);



  useEffect(() => {
    // Only mark completed if user has actually opened the modal (localStorage)
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

  if (isMobileView) {
    return (
      <Card className="overflow-hidden cursor-pointer group flex flex-row items-center relative" onClick={() => onOpen(item)}>
        <div className="absolute top-1 right-1 z-20 flex flex-col gap-1">
          {user?.isAdmin && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary" size="icon" className="h-7 w-7 bg-white/80 dark:bg-black/60 backdrop-blur-sm border border-white/20">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(item); }}>
                  <Edit className="mr-2 h-4 w-4" /> Editar Info
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(item); }} className="text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        <div className="relative w-24 h-24 flex-shrink-0 overflow-hidden rounded-md ml-3">
          {item.imageUrl ? (
            <Image src={item.imageUrl} alt={item.title} fill className="object-cover transition-transform duration-300 group-hover:scale-105" />
          ) : (
            <div className={`w-full h-full bg-gradient-to-br ${getContentColor(item.type)} flex items-center justify-center`}>
              {(() => {
                const Icon = getContentIcon(item.type);
                return <Icon className="w-12 h-12 text-white/90" />;
              })()}
            </div>
          )}
          {isPremium && (
            <Badge variant="default" className="absolute top-1 left-1 z-10 bg-amber-500 hover:bg-amber-600 text-white text-xs">
              <Star className="mr-1 h-3 w-3" /> Premium
            </Badge>
          )}
          {(isLockedForNonPremium || isLockedPremium) && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <Lock className="h-6 w-6 text-white" />
            </div>
          )}
          {completed && (
            <CheckCircle className="absolute top-1 right-1 h-6 w-6 text-green-500" />
          )}
        </div>
        <div className="p-3 md:p-4 lg:p-3 flex-grow">
          <Badge variant="outline" className="mb-1 text-[10px] md:text-xs lg:text-[10px]">{item.subject}</Badge>
          <h3 className="text-sm md:text-base lg:text-sm font-bold line-clamp-2 font-headline text-foreground leading-tight">{item.title}</h3>
          <div className="flex items-center gap-1.5 text-[10px] md:text-xs lg:text-[10px] text-muted-foreground mt-2 md:mt-3 lg:mt-2">
            {typeIcons[item.type]}
            <span className="capitalize">{item.type === 'content' ? 'Lectura' : item.type}</span>
          </div>
        </div>
      </Card>
    )
  }

  const isCompleted = completedContentIds.includes(item.id || '');

  return (
    <Card className={`flex flex-col overflow-hidden transition-all duration-500 h-full group hover:border-primary/50 md:hover:shadow-2xl md:hover:shadow-primary/5 md:hover:-translate-y-1 ${isCompleted ? 'border-green-500' : ''}`}>
      <CardHeader className="p-0 relative">
        <div className="aspect-video relative cursor-pointer overflow-hidden" onClick={() => onOpen(item)}>
          {item.imageUrl ? (
            <>
              <Image src={item.imageUrl} alt={item.title} fill data-ai-hint="lesson thumbnail" className="object-cover transition-transform duration-700 md:group-hover:scale-110" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 md:group-hover:opacity-100 transition-opacity" />
            </>
          ) : (
            <div className={`w-full h-full bg-gradient-to-br ${getContentColor(item.type)} flex items-center justify-center`}>
              {(() => {
                const Icon = getContentIcon(item.type);
                return <Icon className="w-16 md:w-20 lg:w-16 h-16 md:h-20 lg:h-16 text-white/90 drop-shadow-lg transition-transform duration-500 md:group-hover:scale-110" />;
              })()}
            </div>
          )}
          <div className="absolute top-2 md:top-3 lg:top-2 left-2 md:left-3 lg:left-2 z-10">
            {isPremium && (
              <Badge variant="default" className="bg-amber-500 hover:bg-amber-600 text-white shadow-lg border-amber-400/50">
                <Star className="mr-1 h-3 w-3 fill-current" />
                Premium
              </Badge>
            )}
          </div>
          {(isLockedForNonPremium || isLockedPremium) && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center">
              <Lock className="h-8 md:h-10 lg:h-8 w-8 md:w-10 lg:w-8 text-white drop-shadow-2xl" />
            </div>
          )}
          {isCompleted && (
            <div className="absolute top-2 right-2 md:top-3 md:right-3 lg:top-2 lg:right-2 bg-white/90 dark:bg-black/80 rounded-full p-1 shadow-lg">
              <CheckCircle className="h-6 md:h-8 lg:h-6 w-6 md:w-8 lg:w-6 text-green-500" />
            </div>
          )}
        </div>
        {user?.isAdmin && (
          <div className="absolute top-2 right-2 md:top-3 md:right-3 lg:top-2 lg:right-2 z-10">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary" size="icon" className="h-8 w-8 md:h-9 md:w-9 lg:h-8 lg:w-8 bg-white/80 dark:bg-black/60 backdrop-blur-md shadow-lg border border-white/20">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(item)}>
                  <Edit className="mr-2 h-4 w-4" /> Editar Info
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDelete(item)} className="text-destructive font-semibold">
                  <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </CardHeader>
      <CardContent className="p-4 md:p-6 lg:p-4 flex-grow cursor-pointer" onClick={() => onOpen(item)}>
        <Badge variant="outline" className="mb-2 md:mb-3 lg:mb-2 text-[10px] md:text-xs lg:text-[10px] font-bold tracking-tight opacity-70 md:group-hover:opacity-100 transition-opacity">{item.subject}</Badge>
        <h3 className="text-base md:text-lg lg:text-base font-bold leading-tight font-headline text-foreground md:group-hover:text-primary transition-colors line-clamp-2 md:line-clamp-3 lg:line-clamp-2">{item.title}</h3>
      </CardContent>
      <CardFooter className="p-4 md:p-6 lg:p-4 pt-0 flex justify-between items-center text-xs md:text-sm lg:text-xs text-muted-foreground cursor-pointer" onClick={() => onOpen(item)}>
        <div className="flex items-center gap-1.5 md:gap-2">
          {typeIcons[item.type]}
          <span className="capitalize font-medium">{item.type === 'content' ? 'Lectura' : item.type}</span>
        </div>
      </CardFooter>
    </Card>
  );
}
