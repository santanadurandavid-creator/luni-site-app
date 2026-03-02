'use client';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, ZoomIn, ZoomOut, Maximize2, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImageViewerModalProps {
    imageUrl: string;
    isOpen: boolean;
    onClose: () => void;
}

export function ImageViewerModal({ imageUrl, isOpen, onClose }: ImageViewerModalProps) {
    const [zoom, setZoom] = useState(1);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        if (!isOpen) setZoom(1);
    }, [isOpen]);

    if (!isOpen || !mounted) return null;

    const handleZoomIn = (e: React.MouseEvent) => {
        e.stopPropagation();
        setZoom(prev => Math.min(prev + 0.5, 4));
    };
    const handleZoomOut = (e: React.MouseEvent) => {
        e.stopPropagation();
        setZoom(prev => Math.max(prev - 0.5, 1));
    };
    const handleReset = (e: React.MouseEvent) => {
        e.stopPropagation();
        setZoom(1);
    };

    const modalContent = (
        <div
            className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/95 backdrop-blur-xl animate-in fade-in duration-300 pointer-events-auto"
            onClick={(e) => {
                e.stopPropagation();
                if (e.target === e.currentTarget) onClose();
            }}
        >
            {/* Close Button - Ultra Minimal Floating */}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onClose();
                }}
                className="absolute top-6 right-6 p-4 rounded-full bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all duration-300 backdrop-blur-md border border-white/10 z-[1000003] active:scale-90 group pointer-events-auto"
            >
                <X className="w-6 h-6 transition-transform group-hover:rotate-90" />
            </button>

            {/* Main Immersive Container */}
            <div className="relative w-full h-full flex items-center justify-center p-4 sm:p-8 overflow-hidden pointer-events-none">
                <div
                    className={cn(
                        "relative transition-transform duration-500 ease-out flex items-center justify-center pointer-events-auto",
                        zoom > 1 ? "cursor-move" : "cursor-default"
                    )}
                    style={{ transform: `scale(${zoom})` }}
                >
                    <img
                        src={imageUrl}
                        alt="Imagen Completa"
                        className="max-w-[95vw] max-h-[92vh] object-contain rounded-xl sm:rounded-2xl shadow-[0_0_80px_rgba(0,0,0,0.5)] border border-white/5 active:scale-[0.98] transition-all"
                        draggable={false}
                        onClick={(e) => {
                            e.stopPropagation();
                            setZoom(prev => prev > 1 ? 1 : 2);
                        }}
                    />
                </div>
            </div>

            {/* Floating Premium Zoom Controls - Bottom Over Image */}
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-[1000003] flex flex-col items-center gap-4 animate-in slide-in-from-bottom-5 duration-700 delay-200 pointer-events-none">
                <div className="flex items-center gap-1 p-2 rounded-[2rem] bg-black/40 backdrop-blur-3xl border border-white/10 shadow-2xl hover:border-primary/30 transition-all group pointer-events-auto">
                    <button
                        onClick={handleZoomOut}
                        disabled={zoom <= 1}
                        className="p-3 rounded-full hover:bg-white/10 text-white/50 hover:text-white disabled:opacity-10 transition-all active:scale-75"
                        title="Zoom Out"
                    >
                        <ZoomOut className="w-5 h-5" />
                    </button>

                    <div className="h-6 w-[1px] bg-white/10 mx-1" />

                    <button
                        onClick={handleReset}
                        className="px-6 py-2.5 text-white/90 font-black text-xs sm:text-sm hover:bg-primary/20 hover:text-white rounded-full transition-all flex items-center gap-2 shrink-0 uppercase tracking-widest whitespace-nowrap"
                    >
                        <RotateCcw className="w-3.5 h-3.5 text-primary" />
                        {Math.round(zoom * 100)}%
                    </button>

                    <div className="h-6 w-[1px] bg-white/10 mx-1" />

                    <button
                        onClick={handleZoomIn}
                        disabled={zoom >= 4}
                        className="p-3 rounded-full hover:bg-white/10 text-white/50 hover:text-white disabled:opacity-10 transition-all active:scale-75"
                        title="Zoom In"
                    >
                        <ZoomIn className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Visual indicator for drag (only shown when zoomed) */}
            {zoom > 1 && (
                <div className="absolute bottom-6 text-white/30 text-[10px] uppercase font-bold tracking-[0.2em] pointer-events-none animate-pulse">
                    Desliza para explorar
                </div>
            )}
        </div>
    );

    return createPortal(modalContent, document.body);
}
