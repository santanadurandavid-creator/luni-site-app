'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { ContentItem } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { useEffect, useRef, useState, useCallback } from 'react';
import { ModalBanner } from '@/components/ads/ModalBanner';
import { ShareButton } from '@/components/shared/ShareButton';
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  RotateCcw,
  RotateCw,
  Loader2,
  SkipBack,
  SkipForward,
  Check
} from "lucide-react";
import { cn } from "@/lib/utils";

interface VideoModalProps {
  item: ContentItem | null;
  onClose: () => void;
}

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export function VideoModal({ item, onClose }: VideoModalProps) {
  const { user, addStudyTime, incrementMultimediaWatched } = useAuth();

  // Player State
  const [player, setPlayer] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showCheckmark, setShowCheckmark] = useState(false);
  const checkmarkShownRef = useRef(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(100);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [apiReady, setApiReady] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Study Time Tracker
  useEffect(() => {
    if (!item || !user || !isPlaying) return;

    const timer = setInterval(() => {
      addStudyTime(1, item.subject || 'General');
    }, 1000);

    return () => clearInterval(timer);
  }, [item, user, addStudyTime, isPlaying]);

  // Mark as viewed and increment counter logic moved to progress tracking
  useEffect(() => {
    if (!item?.id) return;
    // Reset checkmark for new item
    checkmarkShownRef.current = false;
    setShowCheckmark(false);
  }, [item?.id]);

  // Progress Tracking & Completion Logic
  useEffect(() => {
    if (player && isPlaying) {
      progressIntervalRef.current = setInterval(() => {
        const time = player.getCurrentTime();
        setCurrentTime(time);

        // Check if user has watched at least 5 seconds
        if (time > 5 && !checkmarkShownRef.current && item?.id) {
          checkmarkShownRef.current = true;

          // Mark as completed in localStorage
          const completedContentIds: string[] = JSON.parse(localStorage.getItem('completedContentIds') || '[]');
          if (!completedContentIds.includes(item.id)) {
            completedContentIds.push(item.id);
            localStorage.setItem('completedContentIds', JSON.stringify(completedContentIds));
            window.dispatchEvent(new CustomEvent('contentCompleted', { detail: { id: item.id } }));
          }

          // Increment multimedia watched counter
          incrementMultimediaWatched(item.id);
          setShowCheckmark(true);
          setTimeout(() => setShowCheckmark(false), 2000);
        }
      }, 500);
    } else {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    }
    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, [player, isPlaying, item?.id, incrementMultimediaWatched]);

  // Load YouTube API
  useEffect(() => {
    if (!item) return;

    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

      window.onYouTubeIframeAPIReady = () => setApiReady(true);
    } else {
      setApiReady(true);
    }
  }, [item]);

  // Extract Video ID
  const getYouTubeVideoId = (url: string) => {
    const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    return match ? match[1] : null;
  };

  const videoId = item?.contentUrl ? getYouTubeVideoId(item.contentUrl) : null;

  const playerInstanceRef = useRef<any>(null); // Reference for cleanup

  // Initialize Player
  useEffect(() => {
    if (!apiReady || !videoId) return;

    // Reset states for new video
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setIsLoading(true);
    setControlsVisible(true);

    const initPlayer = () => {
      // Ensure container exists
      if (!document.getElementById('youtube-player')) return;

      // Destroy previous instance if explicit boolean check fails
      if (playerInstanceRef.current) {
        try {
          playerInstanceRef.current.destroy();
        } catch (e) { }
      }

      playerInstanceRef.current = new window.YT.Player('youtube-player', {
        height: '100%',
        width: '100%',
        videoId: videoId,
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
          rel: 0,
          showinfo: 0,
          iv_load_policy: 3
        },
        events: {
          onReady: (event: any) => {
            setPlayer(event.target);
            setDuration(event.target.getDuration());
            setIsLoading(false);
          },
          onStateChange: (event: any) => {
            // YT.PlayerState.PLAYING = 1
            setIsPlaying(event.data === 1);
            if (event.data === 1) {
              setIsLoading(false);
            }
            if (event.data === 0) { // ENDED
              setIsPlaying(false);
              setControlsVisible(true);
            }
          }
        }
      });
    };

    // Small timeout to ensure DOM is ready and previous cleanup is done
    const timer = setTimeout(initPlayer, 100);

    return () => {
      clearTimeout(timer);
      if (playerInstanceRef.current) {
        try {
          const instance = playerInstanceRef.current;
          // Remove event listeners if possible or simply destroy
          instance.destroy();
        } catch (e) {
          console.error("Error destroying player", e);
        }
        playerInstanceRef.current = null;
      }
      setPlayer(null);
    };
  }, [apiReady, videoId]);



  // Controls Visibility Handler
  const showControls = useCallback(() => {
    setControlsVisible(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setControlsVisible(false);
    }, 3000);
  }, [isPlaying]);

  useEffect(() => {
    if (!isPlaying) {
      setControlsVisible(true);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    } else {
      showControls();
    }
  }, [isPlaying, showControls]);


  // Handlers
  const togglePlay = () => {
    if (isPlaying) player?.pauseVideo();
    else player?.playVideo();
  };

  const handleSeek = (value: number[]) => {
    const newTime = value[0];
    setCurrentTime(newTime);
    player?.seekTo(newTime, true);
  };

  const skip = (seconds: number) => {
    const newTime = Math.min(Math.max(currentTime + seconds, 0), duration);
    setCurrentTime(newTime);
    player?.seekTo(newTime, true);
  };

  const handleVolume = (value: number[]) => {
    const newVol = value[0];
    setVolume(newVol);
    player?.setVolume(newVol);
    if (newVol > 0 && isMuted) {
      setIsMuted(false);
      player?.unMute();
    }
  };

  const toggleMute = () => {
    if (isMuted) {
      player?.unMute();
      player?.setVolume(volume);
      setIsMuted(false);
    } else {
      player?.mute();
      setIsMuted(true);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  if (!item) return null;

  return (
    <Dialog open={!!item} onOpenChange={(open) => {
      if (!open) {
        // Clean up player before closing
        if (player) {
          player.destroy();
          setPlayer(null);
        }
        onClose();
      }
    }}>
      <DialogContent className="w-[95vw] md:w-[90vw] max-w-5xl p-0 bg-transparent border-none shadow-none focus:outline-none">
        <DialogHeader className="sr-only">
          <DialogTitle>{item.title}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col w-full">
          {/* Video Container */}
          <div
            ref={containerRef}
            className="relative w-full aspect-video rounded-xl overflow-hidden bg-black shadow-2xl group"
            onMouseMove={showControls}
            onClick={showControls}
            onMouseLeave={() => isPlaying && setControlsVisible(false)}
          >
            {/* YouTube Iframe Placeholder */}
            <div id="youtube-player" className="w-full h-full pointer-events-none" />

            {/* Checkmark Animation Overlay */}
            {showCheckmark && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 z-[60] animate-in fade-in zoom-in duration-300 pointer-events-none">
                <div className="bg-white dark:bg-zinc-800 p-6 rounded-full shadow-2xl animate-in zoom-in-50 slide-in-from-bottom-20 duration-500">
                  <Check className="h-16 w-16 text-green-500" />
                </div>
              </div>
            )}

            {/* Custom Controls Overlay */}
            <div className={cn(
              "absolute inset-0 bg-transparent flex flex-col justify-between transition-opacity duration-300 z-10",
              controlsVisible ? "opacity-100" : "opacity-0 cursor-none"
            )}>
              {/* Top Shade */}
              <div className="h-20 bg-gradient-to-b from-black/70 to-transparent p-4 flex justify-between items-start">
                <h3 className="text-white font-medium truncate drop-shadow-md pr-12">{item.title}</h3>
                <ShareButton
                  itemId={item.id || ''}
                  itemTitle={item.title}
                  itemType="video"
                  size="icon"
                  className="translate-y-[-4px]"
                />
              </div>

              {/* Center Play Button */}
              <div className="flex-1 flex items-center justify-center">
                {isLoading ? (
                  <Loader2 className="w-12 h-12 text-white animate-spin" />
                ) : (
                  <button
                    onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                    className="p-4 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-sm text-white transition-all transform hover:scale-110"
                  >
                    {isPlaying ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current ml-1" />}
                  </button>
                )}
              </div>

              {/* Bottom Controls Bar */}
              <div className="bg-gradient-to-t from-black/90 via-black/60 to-transparent p-4 pt-8 space-y-2">
                {/* Progress Bar */}
                <div className="flex items-center gap-2 text-xs text-white font-mono">
                  <span>{formatTime(currentTime)}</span>
                  <Slider
                    value={[currentTime]}
                    max={duration}
                    step={1}
                    onValueChange={handleSeek}
                    className="cursor-pointer"
                  />
                  <span>{formatTime(duration)}</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Button size="icon" variant="ghost" className="text-white hover:bg-white/20 h-8 w-8" onClick={togglePlay}>
                      {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                    </Button>

                    <Button size="icon" variant="ghost" className="text-white hover:bg-white/20 h-8 w-8 hidden sm:inline-flex" onClick={() => skip(-10)}>
                      <RotateCcw className="w-5 h-5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="text-white hover:bg-white/20 h-8 w-8 hidden sm:inline-flex" onClick={() => skip(10)}>
                      <RotateCw className="w-5 h-5" />
                    </Button>

                    {/* Volume */}
                    <div className="flex items-center gap-2 group/vol ml-2">
                      <Button size="icon" variant="ghost" className="text-white hover:bg-white/20 h-8 w-8" onClick={toggleMute}>
                        {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                      </Button>
                      <div className="w-0 overflow-hidden group-hover/vol:w-24 transition-all duration-300">
                        <Slider
                          value={[isMuted ? 0 : volume]}
                          max={100}
                          onValueChange={handleVolume}
                          className="w-20"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <Button size="icon" variant="ghost" className="text-white hover:bg-white/20 h-8 w-8" onClick={toggleFullscreen}>
                      {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Ad Banner - Hidden in Fullscreen */}
          <div className="mt-2 w-full flex justify-center">
            <ModalBanner item={item} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
