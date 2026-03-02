'use client';

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import type { ContentItem } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, BookOpen, BrainCircuit, Check, CheckCircle2, Film, Loader2, Maximize, Mic, Minimize, Pause, Play, RotateCcw, RotateCw, Share2, Volume2, VolumeX } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useRef, useEffect, useCallback } from 'react';
import { RichContentRenderer } from '../content/RichContentRenderer';
import { Slider } from '../ui/slider';
import { cn } from '@/lib/utils';
import { ScrollArea } from '../ui/scroll-area';
import { Card, CardContent } from '../ui/card';

interface LandingContentModalProps {
    item: ContentItem | null;
    onClose: () => void;
}

export function LandingContentModal({ item, onClose }: LandingContentModalProps) {
    const router = useRouter();
    const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
    const [showResults, setShowResults] = useState(false);

    // Player State (App-like)
    const [player, setPlayer] = useState<any>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(100);
    const [isMuted, setIsMuted] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [controlsVisible, setControlsVisible] = useState(true);
    const [isLoading, setIsLoading] = useState(true);
    const [apiReady, setApiReady] = useState(false);

    const containerRef = useRef<HTMLDivElement>(null);
    const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const playerInstanceRef = useRef<any>(null);

    useEffect(() => {
        if (!item) {
            setShowResults(false);
            setSelectedAnswers({});
            setIsPlaying(false);
            setCurrentTime(0);
            setDuration(0);
        }
    }, [item]);

    // Load YouTube API
    useEffect(() => {
        if (!item || (item.type !== 'video' && item.type !== 'class')) return;

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

    const getYouTubeVideoId = (url: string) => {
        const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
        return match ? match[1] : null;
    };

    const videoId = item?.contentUrl ? getYouTubeVideoId(item.contentUrl) : null;

    // Initialize Player
    useEffect(() => {
        if (!apiReady || !videoId || (item?.type !== 'video' && item?.type !== 'class')) return;

        const initPlayer = () => {
            if (!document.getElementById('landing-youtube-player')) return;

            if (playerInstanceRef.current) {
                try { playerInstanceRef.current.destroy(); } catch (e) { }
            }

            playerInstanceRef.current = new window.YT.Player('landing-youtube-player', {
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
                        setIsPlaying(event.data === 1);
                        if (event.data === 1) setIsLoading(false);
                        if (event.data === 0) {
                            setIsPlaying(false);
                            setControlsVisible(true);
                        }
                    }
                }
            });
        };

        const timer = setTimeout(initPlayer, 100);
        return () => {
            clearTimeout(timer);
            if (playerInstanceRef.current) {
                try { playerInstanceRef.current.destroy(); } catch (e) { }
                playerInstanceRef.current = null;
            }
            setPlayer(null);
        };
    }, [apiReady, videoId, item?.type]);

    // Progress Tracking Loop
    useEffect(() => {
        if (player && isPlaying) {
            progressIntervalRef.current = setInterval(() => {
                setCurrentTime(player.getCurrentTime());
            }, 500);
        } else {
            if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
        }
        return () => {
            if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
        };
    }, [player, isPlaying]);

    // Controls Visibility Handler
    const showControls = useCallback(() => {
        setControlsVisible(true);
        if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        controlsTimeoutRef.current = setTimeout(() => {
            if (isPlaying) setControlsVisible(false);
        }, 3000);
    }, [isPlaying]);

    if (!item) return null;

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

    const handleQuizAnswer = (questionId: string, optionId: string) => {
        setSelectedAnswers(prev => ({
            ...prev,
            [questionId]: optionId
        }));
    };

    const handleSubmitQuiz = () => {
        setShowResults(true);
    };

    const getQuizScore = () => {
        if (!item.quizDetails?.questions) return { correct: 0, total: 0 };

        let correct = 0;
        item.quizDetails.questions.forEach(question => {
            const selectedOptionId = selectedAnswers[question.id];
            const selectedOption = question.options.find(opt => opt.id === selectedOptionId);
            if (selectedOption?.isCorrect) {
                correct++;
            }
        });

        return { correct, total: item.quizDetails.questions.length };
    };

    const renderContent = () => {
        // Videos y Clases
        if (item.type === 'video' || item.type === 'class') {
            return (
                <div
                    ref={containerRef}
                    className="relative w-full aspect-video rounded-xl overflow-hidden bg-black shadow-2xl group"
                    onMouseMove={showControls}
                    onClick={showControls}
                    onMouseLeave={() => isPlaying && setControlsVisible(false)}
                >
                    <div id="landing-youtube-player" className="w-full h-full pointer-events-none" />

                    <div className={cn(
                        "absolute inset-0 bg-transparent flex flex-col justify-between transition-opacity duration-300 z-10",
                        controlsVisible ? "opacity-100" : "opacity-0 cursor-none"
                    )}>
                        {/* Top Shade */}
                        <div className="h-20 bg-gradient-to-b from-black/70 to-transparent p-4 flex justify-between items-start">
                            <h3 className="text-white font-medium truncate drop-shadow-md pr-12">{item.title}</h3>
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
                                    <Button size="icon" variant="ghost" className="text-white hover:bg-white/20 h-8 w-8" onClick={(e) => { e.stopPropagation(); togglePlay(); }}>
                                        {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                                    </Button>

                                    <Button size="icon" variant="ghost" className="text-white hover:bg-white/20 h-8 w-8 hidden sm:inline-flex" onClick={(e) => { e.stopPropagation(); skip(-10); }}>
                                        <RotateCcw className="w-5 h-5" />
                                    </Button>
                                    <Button size="icon" variant="ghost" className="text-white hover:bg-white/20 h-8 w-8 hidden sm:inline-flex" onClick={(e) => { e.stopPropagation(); skip(10); }}>
                                        <RotateCw className="w-5 h-5" />
                                    </Button>

                                    {/* Volume */}
                                    <div className="flex items-center gap-2 group/vol ml-2">
                                        <Button size="icon" variant="ghost" className="text-white hover:bg-white/20 h-8 w-8" onClick={(e) => { e.stopPropagation(); toggleMute(); }}>
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
                                    <Button size="icon" variant="ghost" className="text-white hover:bg-white/20 h-8 w-8" onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }}>
                                        {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        // Quizzes - Completo e Interactivo
        if (item.type === 'quiz' && item.quizDetails?.questions) {
            const { correct, total } = getQuizScore();

            return (
                <div className="space-y-6 max-h-[60vh] overflow-y-auto p-6">
                    {!showResults ? (
                        <>
                            <div className="text-center mb-6">
                                <h3 className="text-2xl font-bold text-gray-900 mb-2">Quiz Interactivo</h3>
                                <p className="text-gray-600">Responde todas las preguntas y verifica tus respuestas</p>
                            </div>

                            {item.quizDetails.questions.map((question, index) => (
                                <div key={question.id} className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                                    <h4 className="font-bold text-gray-900 mb-4">
                                        Pregunta {index + 1}: {question.question}
                                    </h4>
                                    <div className="space-y-2">
                                        {question.options.map((option) => {
                                            const isSelected = selectedAnswers[question.id] === option.id;
                                            return (
                                                <div
                                                    key={option.id}
                                                    onClick={() => handleQuizAnswer(question.id, option.id)}
                                                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${isSelected
                                                        ? 'border-[#3A5064] bg-[#3A5064]/10'
                                                        : 'border-gray-200 bg-white hover:border-gray-300'
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-[#3A5064] bg-[#3A5064]' : 'border-gray-300'
                                                            }`}>
                                                            {isSelected && <div className="w-2 h-2 bg-white rounded-full" />}
                                                        </div>
                                                        <span className="font-medium text-gray-900">{option.text}</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}

                            <div className="text-center pt-4">
                                <Button
                                    onClick={handleSubmitQuiz}
                                    disabled={Object.keys(selectedAnswers).length !== item.quizDetails.questions.length}
                                    className="bg-[#3A5064] hover:bg-[#2d3e50] text-white px-8 py-6 text-lg"
                                    size="lg"
                                >
                                    Ver Resultados
                                </Button>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="text-center mb-8 bg-gradient-to-r from-[#3A5064] to-[#2d3e50] text-white p-8 rounded-2xl">
                                <h3 className="text-3xl font-bold mb-2">¡Quiz Completado!</h3>
                                <p className="text-5xl font-bold my-4">{correct} / {total}</p>
                                <p className="text-xl">
                                    {correct === total ? '¡Perfecto! 🎉' : correct >= total * 0.7 ? '¡Muy bien! 👏' : 'Sigue practicando 💪'}
                                </p>
                            </div>

                            {item.quizDetails.questions.map((question, index) => {
                                const selectedOptionId = selectedAnswers[question.id];
                                const selectedOption = question.options.find(opt => opt.id === selectedOptionId);
                                const correctOption = question.options.find(opt => opt.isCorrect);
                                const isCorrect = selectedOption?.isCorrect;

                                return (
                                    <div key={question.id} className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                                        <h4 className="font-bold text-gray-900 mb-4">
                                            Pregunta {index + 1}: {question.question}
                                        </h4>
                                        <div className="space-y-2">
                                            {question.options.map((option) => {
                                                const isSelectedOption = selectedOptionId === option.id;
                                                const isCorrectOption = option.isCorrect;

                                                return (
                                                    <div
                                                        key={option.id}
                                                        className={`p-4 rounded-lg border-2 ${isCorrectOption
                                                            ? 'border-green-500 bg-green-50'
                                                            : isSelectedOption && !isCorrectOption
                                                                ? 'border-red-500 bg-red-50'
                                                                : 'border-gray-200 bg-white'
                                                            }`}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            {isCorrectOption && (
                                                                <CheckCircle2 className="w-5 h-5 text-green-600" />
                                                            )}
                                                            {isSelectedOption && !isCorrectOption && (
                                                                <div className="w-5 h-5 text-red-600">✗</div>
                                                            )}
                                                            <span className={`font-medium ${isCorrectOption ? 'text-green-900' : isSelectedOption ? 'text-red-900' : 'text-gray-600'
                                                                }`}>
                                                                {option.text}
                                                            </span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}

                            <div className="text-center pt-4">
                                <Button
                                    onClick={() => {
                                        setShowResults(false);
                                        setSelectedAnswers({});
                                    }}
                                    variant="outline"
                                    className="border-2 border-[#3A5064] text-[#3A5064] hover:bg-[#3A5064] hover:text-white px-8 py-6 text-lg"
                                    size="lg"
                                >
                                    Intentar de Nuevo
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            );
        }

        // Podcasts - Completo
        if (item.type === 'podcast' && item.contentUrl) {
            return (
                <div className="p-6 space-y-4">
                    <div className="text-center mb-6">
                        <h3 className="text-2xl font-bold text-gray-900 mb-2">Podcast</h3>
                        <p className="text-gray-600">Escucha el contenido completo</p>
                    </div>
                    <audio controls className="w-full">
                        <source src={item.contentUrl} type="audio/mpeg" />
                        Tu navegador no soporta el elemento de audio.
                    </audio>
                </div>
            );
        }

        // Lecturas - Completo
        const explanatory = item.interactiveContent?.explanatory;
        if (item.type === 'content') {
            return (
                <ScrollArea className="flex-grow px-2 sm:px-6 h-[60vh]">
                    <div className="pb-8 pt-4">
                        {explanatory?.title && (
                            <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6 text-center">
                                {explanatory.title}
                            </h3>
                        )}
                        <RichContentRenderer
                            htmlContent={explanatory?.htmlContent}
                            blocks={explanatory?.blocks}
                            blocksJson={explanatory?.blocksJson}
                        />
                    </div>
                </ScrollArea>
            );
        }

        return (
            <div className="p-12 text-center">
                <p className="text-gray-600 mb-4">Contenido no disponible</p>
            </div>
        );
    };

    return (
        <Dialog open={!!item} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="w-[95vw] md:w-[90vw] max-w-5xl md:max-w-6xl max-h-[95vh] p-0 rounded-2xl flex flex-col overflow-hidden border-none shadow-2xl">
                <DialogHeader className="p-4 sm:p-6 pb-3 sm:pb-4 border-b bg-white/80 backdrop-blur-md sticky top-0 z-10 flex flex-row items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                        <DialogTitle className="text-lg sm:text-xl font-bold truncate">{item.title}</DialogTitle>
                        <p className="text-xs sm:text-sm text-gray-600 font-medium">{item.subject}</p>
                    </div>
                </DialogHeader>

                <div className="flex-grow overflow-hidden bg-gray-50/50">
                    {renderContent()}
                </div>

                {/* CTA Footer - Regístrate */}
                <div className="p-6 sm:p-8 bg-gradient-to-br from-[#3A5064] via-[#2d3e50] to-[#1a2530] text-white sticky bottom-0 border-t border-white/10 shadow-[0_-10px_30px_rgba(0,0,0,0.1)]">
                    <div className="max-w-3xl mx-auto text-center space-y-4 sm:space-y-6">
                        <div className="space-y-2">
                            <h4 className="text-xl sm:text-2xl font-black tracking-tight">¿Te gustó este contenido?</h4>
                            <p className="text-sm sm:text-base text-white/80 font-medium">
                                Regístrate gratis para acceder a miles de contenidos, seguir tu progreso y mucho más
                            </p>
                        </div>
                        <Button
                            onClick={() => router.push('/register')}
                            className="bg-white text-[#3A5064] hover:bg-gray-100 font-black px-10 py-7 text-lg rounded-2xl w-full sm:w-auto shadow-xl hover:shadow-2xl transition-all hover:scale-105 group"
                        >
                            Crear Cuenta Gratis
                            <ArrowRight className="ml-3 w-6 h-6 group-hover:translate-x-1 transition-transform" />
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
