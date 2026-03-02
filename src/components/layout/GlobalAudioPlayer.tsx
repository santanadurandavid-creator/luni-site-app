
'use client';

import { useAuth } from '@/hooks/use-auth';
import { Card } from '../ui/card';
import { Pause, Play, X, Minimize2, Podcast as PodcastIcon, ExternalLink, Headphones } from 'lucide-react';
import { getSpotifyEmbedUrl, cn } from '@/lib/utils';
import { Button } from '../ui/button';
import { useEffect, useRef, useMemo } from 'react';

export function GlobalAudioPlayer() {
  const { activePodcast, isPodcastPlaying, togglePodcast, stopPodcast, isPlayerMinimized, togglePlayerMinimized, setIsContentModalOpen, setIsQuizModalOpen } = useAuth();
  const audioRef = useRef<HTMLAudioElement>(null);

  const spotifyEmbedUrl = useMemo(() =>
    activePodcast?.spotifyUrl ? getSpotifyEmbedUrl(activePodcast.spotifyUrl) : null
    , [activePodcast?.spotifyUrl]);

  useEffect(() => {
    const audioElement = audioRef.current;
    if (!audioElement || (!activePodcast?.contentUrl && !activePodcast?.spotifyUrl)) return;

    if (activePodcast.spotifyUrl) {
      if (!isPodcastPlaying) togglePodcast(); // Auto-start play state for Spotify (though it's an iframe)
      return;
    }

    const handlePlay = () => !isPodcastPlaying && togglePodcast();
    const handlePause = () => isPodcastPlaying && togglePodcast();

    audioElement.addEventListener('play', handlePlay);
    audioElement.addEventListener('pause', handlePause);

    if (activePodcast.contentUrl && activePodcast.contentUrl !== audioElement.src) {
      audioElement.src = activePodcast.contentUrl;
      audioElement.load();
    }

    if (isPodcastPlaying && audioElement.paused) {
      audioElement.play().catch(e => console.error("Audio play failed:", e));
    } else if (!isPodcastPlaying && !audioElement.paused) {
      audioElement.pause();
    }

    return () => {
      audioElement.removeEventListener('play', handlePlay);
      audioElement.removeEventListener('pause', handlePause);
    }
  }, [activePodcast, isPodcastPlaying, togglePodcast]);

  // Media Session API integration
  useEffect(() => {
    if (!activePodcast || !('mediaSession' in navigator)) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: activePodcast.title,
      artist: activePodcast.subject || 'Podcast',
      artwork: activePodcast.imageUrl ? [
        { src: activePodcast.imageUrl, sizes: '96x96', type: 'image/png' },
        { src: activePodcast.imageUrl, sizes: '128x128', type: 'image/png' },
        { src: activePodcast.imageUrl, sizes: '192x192', type: 'image/png' },
        { src: activePodcast.imageUrl, sizes: '256x256', type: 'image/png' },
        { src: activePodcast.imageUrl, sizes: '384x384', type: 'image/png' },
        { src: activePodcast.imageUrl, sizes: '512x512', type: 'image/png' },
      ] : []
    });

    navigator.mediaSession.setActionHandler('play', () => {
      togglePodcast();
    });

    navigator.mediaSession.setActionHandler('pause', () => {
      togglePodcast();
    });

    navigator.mediaSession.setActionHandler('stop', () => {
      stopPodcast();
    });

    navigator.mediaSession.playbackState = isPodcastPlaying ? 'playing' : 'paused';

    return () => {
      // Optional: clear metadata on unmount or change
      // navigator.mediaSession.metadata = null;
    };
  }, [activePodcast, togglePodcast, stopPodcast]);

  useEffect(() => {
    if (!activePodcast) {
      setIsContentModalOpen(false);
      setIsQuizModalOpen(false);
    }
  }, [activePodcast, setIsContentModalOpen, setIsQuizModalOpen]);

  if (!activePodcast) {
    return null; // Return nothing if no podcast is active
  }

  return (
    <>
      {!isPlayerMinimized && (
        <Card className={cn(
          "fixed bottom-16 md:bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-lg z-50 shadow-2xl bg-background/80 backdrop-blur-md overflow-hidden",
          activePodcast.spotifyUrl ? "p-0 rounded-xl border-none" : "p-3"
        )}>
          {activePodcast.spotifyUrl ? (
            <div className="relative group">
              <div className="absolute top-2 right-2 z-10 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="secondary" size="icon" className="h-8 w-8 rounded-full bg-black/50 hover:bg-black/70 text-white border-none" onClick={togglePlayerMinimized}>
                  <Minimize2 className="h-4 w-4" />
                </Button>
                <Button variant="secondary" size="icon" className="h-8 w-8 rounded-full bg-black/50 hover:bg-black/70 text-white border-none" onClick={stopPodcast}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <iframe
                style={{ borderRadius: '12px' }}
                src={spotifyEmbedUrl || ''}
                width="100%"
                height="152"
                frameBorder="0"
                allowFullScreen={true}
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                loading="lazy"
              />
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <PodcastIcon className="h-6 w-6 text-primary flex-shrink-0" />
              <div className="flex-grow overflow-hidden">
                <p className="font-semibold text-sm truncate">{activePodcast.title}</p>
                <p className="text-xs text-muted-foreground truncate">{activePodcast.subject}</p>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" onClick={togglePodcast}>
                  {isPodcastPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                </Button>
                <Button variant="ghost" size="icon" onClick={togglePlayerMinimized}>
                  <Minimize2 className="h-5 w-5" />
                </Button>
                <Button variant="ghost" size="icon" onClick={stopPodcast}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}
      {isPlayerMinimized && (
        <Button
          onClick={togglePlayerMinimized}
          className="fixed bottom-20 md:bottom-6 right-4 z-50 h-10 w-10 rounded-full shadow-lg p-0 bg-primary hover:bg-primary/90"
        >
          <Headphones className="h-5 w-5 text-primary-foreground" />
        </Button>
      )}
      <audio ref={audioRef} onEnded={stopPodcast} className="sr-only" />
    </>
  );
}
