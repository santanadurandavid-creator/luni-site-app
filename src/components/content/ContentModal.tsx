
'use client';
import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { ContentItem } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { ArrowLeft, BookOpen, BrainCircuit, Film, Mic, Sparkles, Play, Pause, Loader2, FileText, Check, Clock, CloudDownload, Download, FileCheck } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { ScrollArea } from '../ui/scroll-area';
import { ModalBanner } from '@/components/ads/ModalBanner';
import { RichContentRenderer } from '@/components/content/RichContentRenderer';
import { ShareButton } from '@/components/shared/ShareButton';
import { downloadFileForOffline, isFileCached } from '@/lib/offline-utils';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface ContentModalProps {
  item: ContentItem | null;
  onClose: () => void;
  onContentCompleted?: () => void;
}

type View = 'menu' | 'explanation' | 'pdf';

export function ContentModal({ item, onClose, onContentCompleted }: ContentModalProps) {
  const { user, addStudyTime, playPodcast, incrementReadingsCompleted, incrementMultimediaWatched } = useAuth();

  const router = useRouter();
  const [view, setView] = useState<View>('menu');
  const [isPlayingClass, setIsPlayingClass] = useState(false);
  const [showCheckmark, setShowCheckmark] = useState(false);
  const [readingProgress, setReadingProgress] = useState(0); // Progress in seconds
  const [isDownloading, setIsDownloading] = useState(false);
  const [isOfflineReady, setIsOfflineReady] = useState(false);
  const { toast } = useToast();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const readingTimeRef = useRef<number>(0);
  const readingCountedRef = useRef<boolean>(false);
  const checkmarkShownRef = useRef<boolean>(false);

  useEffect(() => {
    // This effect handles the study time tracking
    const timer = setInterval(() => {
      if (item && user) {
        addStudyTime(1, item.subject || 'General');
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [item, user, addStudyTime]);

  useEffect(() => {
    // Auto-healing for readings
    if ((user?.readingsCompleted || 0) === 0) {
      localStorage.removeItem('countedReadingIds');
    }

    // Track reading time when in explanation view
    let readingTimer: NodeJS.Timeout | null = null;

    if (view === 'explanation' && item && user) {
      readingTimer = setInterval(() => {
        readingTimeRef.current += 1;
        setReadingProgress(readingTimeRef.current);

        // If user has been reading for 3 minutes (180 seconds), count it only once per item
        if (readingTimeRef.current >= 180 && !readingCountedRef.current) {
          readingCountedRef.current = true;

          const countedReadings = JSON.parse(localStorage.getItem('countedReadingIds') || '[]');
          if (!countedReadings.includes(item.id)) {
            countedReadings.push(item.id);
            localStorage.setItem('countedReadingIds', JSON.stringify(countedReadings));
            incrementReadingsCompleted();
            setShowCheckmark(true);
            setTimeout(() => setShowCheckmark(false), 2000);
          }
        }
      }, 1000);
    }

    return () => {
      if (readingTimer) {
        clearInterval(readingTimer);
      }
    };
  }, [view, item, user, incrementReadingsCompleted]);

  useEffect(() => {
    // This effect marks content as viewed when the modal opens
    if (item?.id) {
      const completedContentIds: string[] = JSON.parse(localStorage.getItem('completedContentIds') || '[]');
      if (!completedContentIds.includes(item.id)) {
        completedContentIds.push(item.id);
        localStorage.setItem('completedContentIds', JSON.stringify(completedContentIds));
        window.dispatchEvent(new CustomEvent('contentCompleted', { detail: { id: item.id } }));
      }
    }
  }, [item]);

  useEffect(() => {
    // Check if content is already offline ready
    const checkOfflineStatus = async () => {
      if (!item) return;

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

      const downloadedItems = JSON.parse(localStorage.getItem('offlineDownloadedItems') || '[]');
      if (downloadedItems.includes(item.id)) {
        setIsOfflineReady(true);
      }
    };
    checkOfflineStatus();
  }, [item]);

  const handleDownloadOffline = async () => {
    if (!item) return;
    setIsDownloading(true);

    try {
      const audioUrl = item.interactiveContent?.explanatory?.audioUrl;
      if (audioUrl) {
        await downloadFileForOffline(audioUrl);
      }

      if (item.imageUrl) {
        await downloadFileForOffline(item.imageUrl, 'static-image-assets');
      }


      // Mark as downloaded in localStorage
      const downloadedItems = JSON.parse(localStorage.getItem('offlineDownloadedItems') || '[]');
      if (!downloadedItems.includes(item.id)) {
        downloadedItems.push(item.id);
        localStorage.setItem('offlineDownloadedItems', JSON.stringify(downloadedItems));
      }

      setIsOfflineReady(true);
      toast({
        title: "Listo para usar Offline",
        description: "El contenido se ha guardado en tu dispositivo.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo descargar para offline.",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  useEffect(() => {
    // Reset view to menu when modal item changes or closes
    if (!item) {
      setView('menu');
      stopClassPlayback();
      // Reset reading tracking
      readingTimeRef.current = 0;
      setReadingProgress(0);
      readingCountedRef.current = false;
      checkmarkShownRef.current = false;
      setShowCheckmark(false);
    }
  }, [item]);


  const stopClassPlayback = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsPlayingClass(false);
  };


  const handlePlayClass = () => {
    const audioUrl = item?.interactiveContent?.explanatory.audioUrl;
    if (!audioUrl) return;

    if (!audioRef.current) {
      const audio = new Audio(audioUrl);
      audio.onended = () => setIsPlayingClass(false);
      audio.onerror = () => {
        setIsPlayingClass(false);
        console.error("Error playing audio class");
      };
      audioRef.current = audio;
    }

    if (isPlayingClass) {
      audioRef.current.pause();
      setIsPlayingClass(false);
    } else {
      audioRef.current.play();
      setIsPlayingClass(true);

      // Increment multimedia watched and show checkmark only once per item
      if (!checkmarkShownRef.current) {
        checkmarkShownRef.current = true;

        const countedMultimedia = JSON.parse(localStorage.getItem('countedMultimediaIds') || '[]');
        if (!countedMultimedia.includes(item.id)) {
          countedMultimedia.push(item.id);
          localStorage.setItem('countedMultimediaIds', JSON.stringify(countedMultimedia));
          incrementMultimediaWatched(item.id);
          setShowCheckmark(true);
          setTimeout(() => setShowCheckmark(false), 2000);
        }
      }
    }
  };

  const handleNavigate = (path: string, type?: 'video' | 'podcast' | 'quiz') => {
    // Multimedia increment is handled by the target modal, not here to avoid double counting
    onClose(); // Close the modal
    router.push(path);
  };

  const handlePlayPodcast = () => {
    onClose(); // Close the modal
    if (item?.id) {
      // playPodcast handles the increment internally
      playPodcast(item);
    }
  };

  if (!item?.interactiveContent) return null;

  const {
    splashTitle,
    explanatory,
    linkedQuizId,
    linkedVideoId,
    linkedPodcastId,
  } = item.interactiveContent;

  const renderMenu = () => (
    <div className="p-6 text-center">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="cursor-pointer hover:border-primary" onClick={() => setView('explanation')}>
          <CardContent className="p-4 flex flex-col items-center justify-center gap-2 h-full">
            <BookOpen className="h-8 w-8 text-primary" />
            <span className="font-semibold text-sm">Explicación</span>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-primary" onClick={() => handleNavigate('/quizzes', 'quiz')}>
          <CardContent className="p-4 flex flex-col items-center justify-center gap-2 h-full">
            <BrainCircuit className="h-8 w-8 text-primary" />
            <span className="font-semibold text-sm">Ir al Quiz</span>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-primary" onClick={() => handleNavigate('/clases', 'video')}>
          <CardContent className="p-4 flex flex-col items-center justify-center gap-2 h-full">
            <Film className="h-8 w-8 text-primary" />
            <span className="font-semibold text-sm">Ver Video</span>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-primary" onClick={() => handleNavigate('/clases', 'podcast')}>
          <CardContent className="p-4 flex flex-col items-center justify-center gap-2 h-full">
            <Mic className="h-8 w-8 text-primary" />
            <span className="font-semibold text-sm">Escuchar Podcast</span>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderExplanation = () => (
    <div className="h-full flex flex-col">
      <ScrollArea className="flex-grow px-2 sm:px-6">
        <div className="space-y-4 pb-6 pt-2">
          <RichContentRenderer
            htmlContent={explanatory.htmlContent}
            blocks={explanatory.blocks}
            blocksJson={explanatory.blocksJson}
            readingText={item.generationMetadata?.sourceReadingText}
          />
        </div>
      </ScrollArea>
    </div>
  );

  const renderPdf = () => (
    <div className="h-full w-full flex flex-col bg-muted/20">
      {item.pdfUrl ? (
        <iframe
          src={`https://docs.google.com/viewer?url=${encodeURIComponent(item.pdfUrl)}&embedded=true`}
          className="w-full h-full border-none"
          title={`PDF: ${item.title}`}
        />
      ) : (
        <div className="flex flex-col items-center justify-center h-full p-6 text-center space-y-4">
          <FileText className="h-16 w-16 text-muted-foreground/30" />
          <p className="text-muted-foreground">No hay un archivo PDF disponible para este contenido.</p>
          <Button variant="outline" onClick={() => setView('explanation')}>Ver Explicación</Button>
        </div>
      )}
    </div>
  );

  return (
    <Dialog open={!!item} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[95vw] md:w-[90vw] max-w-2xl md:max-w-4xl h-[90vh] p-0 rounded-lg flex flex-col overflow-hidden">
        <DialogHeader className="p-3 sm:p-6 pb-2 sm:pb-4 border-b flex-shrink-0">
          <div className="flex items-center gap-2">
            {(view === 'explanation' || view === 'pdf') && (
              <Button variant="ghost" size="icon" onClick={() => setView('menu')} className="h-9 w-9 flex-shrink-0">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            )}
            {view === 'pdf' && (
              <Button variant="ghost" size="icon" onClick={() => setView('explanation')} className="h-9 w-9 flex-shrink-0">
                <BookOpen className="h-5 w-5" />
              </Button>
            )}
            {view === 'explanation' && explanatory.audioUrl && (
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePlayClass}
                  className="h-9 px-3 gap-2 bg-green-500/10 border-green-500/20 hover:bg-green-500/20 text-green-600 rounded-full transition-all animate-in zoom-in-50"
                >
                  {isPlayingClass ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  <span className="hidden sm:inline text-xs font-bold">{isPlayingClass ? 'Pausar Clase' : 'Escuchar Clase'}</span>
                </Button>
              </div>
            )}
            <DialogTitle className="text-base sm:text-lg flex-1 text-left sm:text-center truncate">{view === 'menu' ? (splashTitle || item.title) : (explanatory.title || item.title)}</DialogTitle>

            {(view === 'explanation' || view === 'pdf') && (
              <div className="flex items-center gap-1">
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full transition-colors duration-500 min-w-[70px] justify-center ${readingProgress >= 180
                  ? 'bg-green-500/20 text-green-600 dark:text-green-400 border border-green-500/30'
                  : 'bg-primary/10 text-primary'
                  }`}>
                  {readingProgress >= 180 ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <Clock className="h-3.5 w-3.5" />
                  )}
                  <span className="text-xs font-bold tabular-nums">
                    {Math.floor(readingProgress / 60)}:{(readingProgress % 60).toString().padStart(2, '0')}
                  </span>
                </div>

                {item.pdfUrl && (
                  <Button
                    variant={view === 'pdf' ? "default" : "outline"}
                    size="sm"
                    onClick={() => setView(view === 'pdf' ? 'explanation' : 'pdf')}
                    className={cn(
                      "h-7 px-3 gap-1.5 rounded-full transition-all",
                      view === 'pdf'
                        ? "bg-red-500 hover:bg-red-600 text-white border-none"
                        : "bg-red-500/10 border-red-500/20 hover:bg-red-500/20 text-red-600"
                    )}
                  >
                    <FileText className="h-3.5 w-3.5" />
                    <span className="text-[10px] font-bold">PDF</span>
                  </Button>
                )}
              </div>
            )}
          </div>
        </DialogHeader>
        <div className="flex-grow overflow-hidden relative">
          {view === 'menu' ? renderMenu() : view === 'pdf' ? renderPdf() : renderExplanation()}

          {/* Checkmark Animation Overlay */}
          {showCheckmark && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/5 z-[60] animate-in fade-in zoom-in duration-300 pointer-events-none">
              <div className="bg-white dark:bg-zinc-800 p-6 rounded-full shadow-2xl animate-in zoom-in-50 slide-in-from-bottom-20 duration-500">
                <Check className="h-16 w-16 text-green-500" />
              </div>
            </div>
          )}
        </div>

        <div className="absolute bottom-[10px] right-4 sm:right-6 z-50 flex items-center gap-2">


          <ShareButton
            itemId={item.id || ''}
            itemTitle={item.title}
            itemType="content"
          />
        </div>

        {/* Banner at bottom of modal */}
        <div className="mt-auto border-t border-border flex-shrink-0">
          <ModalBanner item={item} />
        </div>

      </DialogContent>
    </Dialog>
  );
}
