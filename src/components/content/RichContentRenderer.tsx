'use client';
import { useState, useEffect } from 'react';

import { ContentBlock } from '@/lib/types';
import {
    Lightbulb,
    Star,
    CheckCircle2,
    Quote,
    Image as ImageIcon,
    Rocket,
    Target,
    Sparkles,
    Zap,
    Brain,
    Info,
    Check,
    HelpCircle,
    XCircle,
    ArrowRight,
    Maximize2,
    BookOpen
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ImageViewerModal } from './ImageViewerModal';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface RichContentRendererProps {
    htmlContent?: string;
    blocks?: ContentBlock[];
    blocksJson?: string;
    isLoading?: boolean;
    readingText?: string;
}

/**
 * Ultra-Premium Content Renderer - MOBILE OPTIMIZED
 */
export function RichContentRenderer({ htmlContent, blocks, blocksJson, isLoading, readingText }: RichContentRendererProps) {
    const [imageModalOpen, setImageModalOpen] = useState(false);
    const [selectedImage, setSelectedImage] = useState<string>('');
    const [readingModalOpen, setReadingModalOpen] = useState(false);

    // Resolver bloques finales
    let uniqueBlocks: ContentBlock[] = [];
    const [parseError, setParseError] = useState(false);

    const handleOpenImage = (url: string) => {
        setSelectedImage(url);
        setImageModalOpen(true);
    };

    useEffect(() => {
        if (!blocks || blocks.length === 0) {
            if (blocksJson) {
                try {
                    const parsed = JSON.parse(blocksJson);
                    if (Array.isArray(parsed)) {
                        setParseError(false);
                    } else {
                        setParseError(true);
                    }
                } catch (e) {
                    console.error("Error parsing blocksJson:", e);
                    setParseError(true);
                }
            }
        } else {
            setParseError(false);
        }
    }, [blocks, blocksJson]);

    if (blocks && blocks.length > 0) {
        uniqueBlocks = blocks;
    } else if (blocksJson && !parseError) {
        try {
            const parsed = JSON.parse(blocksJson);
            if (Array.isArray(parsed)) {
                uniqueBlocks = parsed;
            }
        } catch (e) {
            // Already handled by useEffect
        }
    }

    if (uniqueBlocks.length > 0) {
        return (
            <>
                <div className="space-y-3 sm:space-y-4 md:space-y-6 lg:space-y-8 w-full animate-in fade-in slide-in-from-bottom-5 duration-1000 pb-6 sm:pb-8 md:pb-12 lg:pb-24">
                    {/* Botón Flotante de Lectura si existe */}
                    {readingText && (
                        <div className="sticky top-4 z-40 flex justify-center w-full pointer-events-none">
                            <Button
                                onClick={() => setReadingModalOpen(true)}
                                className="pointer-events-auto bg-primary/95 hover:bg-primary text-white shadow-xl shadow-primary/20 backdrop-blur-md rounded-full px-6 py-4 flex items-center gap-2 border border-white/20 animate-bounce transition-all hover:scale-105 active:scale-95"
                            >
                                <BookOpen className="h-5 w-5" />
                                <span className="font-bold tracking-tight">Ver Lectura</span>
                            </Button>
                        </div>
                    )}

                    {uniqueBlocks.map((block, index) => (
                        <RenderBlock
                            key={index}
                            block={block}
                            index={index}
                            allBlocks={uniqueBlocks}
                            onOpenImage={handleOpenImage}
                        />
                    ))}
                </div>

                <ImageViewerModal
                    imageUrl={selectedImage}
                    isOpen={imageModalOpen}
                    onClose={() => setImageModalOpen(false)}
                />

                {/* Modal de Lectura Base */}
                <Dialog open={readingModalOpen} onOpenChange={setReadingModalOpen}>
                    <DialogContent className="max-w-3xl w-[95vw] sm:w-[85vw] max-h-[85vh] p-0 overflow-hidden rounded-2xl md:rounded-[2.5rem] bg-white/95 dark:bg-black/95 backdrop-blur-xl border border-primary/20 flex flex-col">
                        <DialogHeader className="p-6 pb-4 border-b border-primary/10">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                                    <BookOpen className="h-6 w-6" />
                                </div>
                                <div>
                                    <DialogTitle className="text-xl md:text-2xl font-black tracking-tight text-foreground">Lectura Base</DialogTitle>
                                    <DialogDescription className="text-xs md:text-sm font-medium text-muted-foreground/60">
                                        Texto necesario para responder el reactivo
                                    </DialogDescription>
                                </div>
                            </div>
                        </DialogHeader>
                        <div className="flex-1 overflow-y-auto p-6 pt-4">
                            <div className="text-sm md:text-base lg:text-lg leading-relaxed text-foreground/80 font-medium whitespace-pre-line bg-muted/30 p-4 md:p-8 rounded-xl md:rounded-3xl border border-primary/5">
                                {readingText}
                            </div>
                            <div className="h-6" />
                        </div>
                        <div className="p-4 bg-muted/30 border-t border-primary/10 flex justify-center">
                            <Button onClick={() => setReadingModalOpen(false)} className="rounded-full px-8 font-bold">
                                Entendido
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </>
        );
    }

    if (isLoading) {
        return (
            <div className="text-center py-10 sm:py-16 bg-primary/[0.02] rounded-[2rem] border-2 border-dashed border-primary/10 backdrop-blur-sm">
                <div className="relative mb-6">
                    <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full scale-150 animate-pulse"></div>
                    <Brain className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-primary animate-pulse relative z-10" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">Cargando Lección Mágica...</h3>
                <p className="text-sm text-muted-foreground mt-2">Estamos preparando tu contenido con IA</p>
            </div>
        );
    }

    if (parseError) {
        return (
            <div className="text-center py-10 sm:py-16 bg-red-500/[0.02] rounded-[2rem] border-2 border-dashed border-red-500/20">
                <div className="relative mb-6">
                    <div className="absolute inset-0 bg-red-500/10 blur-2xl rounded-full scale-110"></div>
                    <HelpCircle className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-red-500/40 relative z-10" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-red-900/40 dark:text-red-100/40">Error en el formato de contenido</h3>
                <p className="text-sm text-muted-foreground mt-2 px-6">La estructura de esta lección no es válida. Contacta a soporte.</p>
            </div>
        );
    }

    if (!htmlContent) {
        return (
            <div className="text-center py-10 sm:py-16 bg-muted/20 rounded-[2rem] border-2 border-dashed border-muted-foreground/10">
                <HelpCircle className="w-12 h-12 sm:w-16 sm:h-16 opacity-10 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg sm:text-xl font-bold text-muted-foreground/40">Contenido aún no disponible</h3>
                <p className="text-sm text-muted-foreground mt-2 px-6">Vuelve a intentarlo en unos momentos o refresca la página.</p>
            </div>
        );
    }

    return (
        <div
            className="rich-content-wrapper w-full prose prose-sm sm:prose-base md:prose-lg dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: htmlContent }}
        />
    );
}

function RenderBlock({
    block,
    index,
    allBlocks,
    onOpenImage
}: {
    block: ContentBlock;
    index: number;
    allBlocks: ContentBlock[];
    onOpenImage: (url: string) => void;
}) {
    const text = typeof block.content === 'string' ? block.content : '';
    const list = Array.isArray(block.content) ? block.content : [];

    switch (block.type) {
        case 'title':
            return (
                <div className="relative pt-3 sm:pt-4 md:pt-6 pb-2 sm:pb-3 md:pb-4 w-full">
                    <div className="absolute -top-4 sm:-top-6 md:-top-10 -left-4 sm:-left-6 md:-left-10 w-16 h-16 sm:w-20 sm:h-20 md:w-32 md:h-32 bg-primary/10 rounded-full blur-[30px] sm:blur-[40px] md:blur-[50px] opacity-60" />
                    <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-[950] tracking-tighter text-foreground leading-[1.15] sm:leading-[1.1] relative z-10 break-words px-1">
                        {text}
                    </h2>
                    <div className="mt-2 sm:mt-3 md:mt-4 h-[2px] sm:h-[3px] md:h-[4px] w-12 sm:w-16 md:w-20 bg-gradient-to-r from-primary via-primary/60 to-transparent rounded-full ml-1" />
                </div>
            );

        case 'question':
            const options = list;
            return (
                <div className="relative mt-3 sm:mt-4 md:mt-6 mb-4 sm:mb-6 md:mb-8 w-full">
                    <div className="relative p-3 sm:p-4 md:p-6 lg:p-8 bg-white/70 dark:bg-black/40 backdrop-blur-xl rounded-xl sm:rounded-2xl md:rounded-[2rem] border border-primary/20 shadow-xl">
                        <div className="flex items-center gap-2 mb-2 sm:mb-3 md:mb-4">
                            <div className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-lg bg-primary flex items-center justify-center text-white shrink-0">
                                <HelpCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5" />
                            </div>
                            <span className="text-[9px] sm:text-[10px] md:text-xs font-black text-primary uppercase tracking-wider">Pregunta</span>
                        </div>

                        <h4 className="text-sm sm:text-base md:text-lg lg:text-xl font-black text-foreground mb-3 sm:mb-4 md:mb-6 leading-tight break-words">
                            {text}
                        </h4>

                        <div className="grid gap-2 sm:gap-2.5 md:gap-3">
                            {options.map((opt, i) => (
                                <div key={i} className="flex items-start gap-2 sm:gap-2.5 md:gap-3 p-2 sm:p-2.5 md:p-3 rounded-lg sm:rounded-xl bg-background/50 border border-border/50 hover:border-primary/50 transition-colors">
                                    <div className="shrink-0 w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-md sm:rounded-lg bg-muted flex items-center justify-center font-bold text-xs sm:text-sm text-foreground">
                                        {String.fromCharCode(65 + i)}
                                    </div>
                                    <span className="text-xs sm:text-sm md:text-base font-medium text-foreground/90 leading-snug break-words flex-1">{opt}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            );

        case 'subTitle':
            return (
                <div className="relative mt-4 sm:mt-5 md:mt-6 lg:mt-8 mb-2 sm:mb-3 md:mb-4 pl-2.5 sm:pl-3 md:pl-4 border-l-[2.5px] sm:border-l-[3px] md:border-l-4 border-primary/80">
                    <h3 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-[900] text-foreground tracking-tight break-words leading-tight">
                        {text}
                    </h3>
                </div>
            );

        case 'paragraph':
            return (
                <p className="text-xs sm:text-sm md:text-base lg:text-lg leading-relaxed text-muted-foreground/90 font-medium whitespace-pre-line break-words mb-2 sm:mb-3 md:mb-4 px-0.5">
                    {text}
                </p>
            );

        case 'info':
            return (
                <div className="relative overflow-hidden p-3 sm:p-4 md:p-6 lg:p-8 bg-blue-500/[0.05] rounded-xl sm:rounded-2xl md:rounded-[2rem] border border-blue-500/10 my-3 sm:my-4 md:my-6 w-full">
                    <div className="flex gap-2 sm:gap-3 md:gap-4 lg:gap-6 relative z-10">
                        <div className="shrink-0 w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 lg:w-12 lg:h-12 rounded-lg sm:rounded-xl bg-blue-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                            <Info className="w-4 h-4 sm:w-4.5 sm:h-4.5 md:w-5 md:h-5 lg:w-6 lg:h-6" />
                        </div>
                        <div className="space-y-1 sm:space-y-1.5 md:space-y-2 min-w-0 flex-1">
                            <span className="text-[8px] sm:text-[9px] md:text-[10px] font-black text-blue-600 dark:text-blue-400 tracking-wider uppercase block">Contexto</span>
                            <div className="text-blue-950 dark:text-blue-50 text-xs sm:text-sm md:text-base lg:text-lg font-bold leading-tight break-words">
                                {text}
                            </div>
                        </div>
                    </div>
                </div>
            );

        case 'summary':
            return (
                <div className="relative overflow-hidden p-3 sm:p-4 md:p-6 lg:p-8 bg-emerald-500/[0.05] rounded-xl sm:rounded-2xl md:rounded-[2rem] border border-emerald-500/10 my-3 sm:my-4 md:my-6 w-full">
                    <div className="flex gap-2 sm:gap-3 md:gap-4 lg:gap-6 relative z-10">
                        <div className="shrink-0 w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 lg:w-12 lg:h-12 rounded-lg sm:rounded-xl bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                            <Check className="w-4 h-4 sm:w-4.5 sm:h-4.5 md:w-5 md:h-5 lg:w-6 lg:h-6 stroke-[3]" />
                        </div>
                        <div className="space-y-1 sm:space-y-1.5 md:space-y-2 min-w-0 flex-1">
                            <span className="text-[8px] sm:text-[9px] md:text-[10px] font-black text-emerald-600 dark:text-emerald-400 tracking-wider uppercase block">Resumen</span>
                            <div className="text-emerald-950 dark:text-emerald-50 text-xs sm:text-sm md:text-base lg:text-lg font-bold leading-tight break-words">
                                {text}
                            </div>
                        </div>
                    </div>
                </div>
            );

        case 'tip':
            return (
                <div className="relative overflow-hidden p-3 sm:p-4 md:p-6 lg:p-8 bg-amber-500/[0.05] rounded-xl sm:rounded-2xl md:rounded-[2rem] border border-amber-500/10 my-3 sm:my-4 md:my-6 w-full">
                    <div className="flex gap-2 sm:gap-3 md:gap-4 lg:gap-6 relative z-10">
                        <div className="shrink-0 w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 lg:w-12 lg:h-12 rounded-lg sm:rounded-xl bg-amber-500 flex items-center justify-center text-white shadow-lg shadow-amber-500/20">
                            <Zap className="w-4 h-4 sm:w-4.5 sm:h-4.5 md:w-5 md:h-5 lg:w-6 lg:h-6" />
                        </div>
                        <div className="space-y-1 sm:space-y-1.5 md:space-y-2 min-w-0 flex-1">
                            <span className="text-[8px] sm:text-[9px] md:text-[10px] font-black text-amber-600 dark:text-amber-400 tracking-wider uppercase block">Tip Pro</span>
                            <p className="text-amber-950 dark:text-amber-50 text-xs sm:text-sm md:text-base lg:text-lg font-bold leading-tight italic break-words">
                                {text}
                            </p>
                        </div>
                    </div>
                </div>
            );

        case 'highlight':
            const isDiscard = text.toLowerCase().includes('descarte') || text.toLowerCase().includes('incorrecta');
            return (
                <div className={cn(
                    "p-3 sm:p-4 md:p-6 lg:p-8 rounded-xl sm:rounded-2xl md:rounded-[2rem] border my-3 sm:my-4 md:my-6 w-full",
                    isDiscard
                        ? "bg-rose-500/5 border-rose-500/10"
                        : "bg-primary/5 border-primary/10"
                )}>
                    <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2 md:mb-3">
                        {isDiscard ? <XCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 text-rose-500" /> : <Brain className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 text-primary" />}
                        <span className={cn(
                            "font-black uppercase text-[8px] sm:text-[9px] md:text-[10px] tracking-wider",
                            isDiscard ? "text-rose-500" : "text-primary"
                        )}>
                            {isDiscard ? "Error Común" : "Importante"}
                        </span>
                    </div>
                    <p className="text-xs sm:text-sm md:text-base lg:text-lg font-bold text-foreground leading-tight break-words">
                        {text}
                    </p>
                </div>
            );

        case 'example':
            return (
                <div className="relative overflow-hidden p-3 sm:p-4 md:p-6 lg:p-8 bg-purple-500/[0.05] rounded-xl sm:rounded-2xl md:rounded-[2rem] border border-purple-500/10 my-3 sm:my-4 md:my-6 w-full">
                    <div className="flex gap-2 sm:gap-3 md:gap-4 lg:gap-6 relative z-10">
                        <div className="shrink-0 w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 lg:w-12 lg:h-12 rounded-lg sm:rounded-xl bg-purple-500 flex items-center justify-center text-white shadow-lg shadow-purple-500/20">
                            <Lightbulb className="w-4 h-4 sm:w-4.5 sm:h-4.5 md:w-5 md:h-5 lg:w-6 lg:h-6" />
                        </div>
                        <div className="space-y-1 sm:space-y-1.5 md:space-y-2 min-w-0 flex-1">
                            <span className="text-[8px] sm:text-[9px] md:text-[10px] font-black text-purple-600 dark:text-purple-400 tracking-wider uppercase block">Ejemplo</span>
                            <p className="text-purple-950 dark:text-purple-50 text-xs sm:text-sm md:text-base lg:text-lg font-bold leading-tight break-words">
                                {text}
                            </p>
                        </div>
                    </div>
                </div>
            );

        case 'step':
            return (
                <div className="relative pl-8 sm:pl-10 md:pl-14 lg:pl-20 py-2 sm:py-3 md:py-4 group w-full">
                    <div className="absolute left-4 sm:left-5 md:left-7 lg:left-10 top-0 bottom-0 w-[2px] bg-primary/20" />
                    <div className="absolute left-0 top-1 sm:top-2 md:top-3 w-8 h-8 sm:w-10 sm:h-10 md:w-14 md:h-14 lg:w-20 lg:h-20 rounded-lg sm:rounded-xl md:rounded-2xl bg-background border-2 border-primary/30 flex items-center justify-center shadow-lg">
                        <span className="text-base sm:text-lg md:text-xl lg:text-2xl xl:text-3xl font-black text-primary">
                            {allBlocks.slice(0, index).filter(b => b.type === 'step').length + 1}
                        </span>
                    </div>
                    <div className="space-y-0.5 sm:space-y-1 ml-0.5 sm:ml-1 md:ml-2">
                        <span className="text-[8px] sm:text-[9px] md:text-[10px] font-black text-primary/40 uppercase tracking-wider">Paso</span>
                        <p className="text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl font-black text-foreground leading-tight break-words">
                            {text}
                        </p>
                    </div>
                </div>
            );

        case 'table':
            const table = typeof block.content === 'object' && 'headers' in block.content ? block.content : null;
            if (!table) return null;
            return (
                <div className="my-3 sm:my-4 md:my-6 overflow-hidden rounded-xl sm:rounded-2xl md:rounded-[2rem] border border-primary/10 shadow-lg bg-card w-full">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[280px]">
                            <thead>
                                <tr className="bg-primary/5 border-b border-primary/10">
                                    {table.headers.map((h, i) => (
                                        <th key={i} className="px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 md:py-3 lg:py-4 text-[8px] sm:text-[9px] md:text-[10px] font-black uppercase tracking-wider text-primary">
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-primary/5">
                                {table.rows.map((row, ri) => (
                                    <tr key={ri} className="hover:bg-primary/5">
                                        {row.map((cell, ci) => (
                                            <td key={ci} className="px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 md:py-3 lg:py-4 text-[10px] sm:text-xs md:text-sm lg:text-base font-medium text-foreground/80 leading-snug">
                                                {cell}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            );

        case 'list':
            return (
                <div className="space-y-2 sm:space-y-2.5 md:space-y-3 lg:space-y-4 my-3 sm:my-4 md:my-6 w-full">
                    {list.map((item, i) => (
                        <div key={i} className="flex items-start gap-2 sm:gap-2.5 md:gap-3 lg:gap-4">
                            <div className="shrink-0 w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 rounded-full bg-primary/10 flex items-center justify-center mt-0.5 text-primary">
                                <ArrowRight className="w-2 h-2 sm:w-2.5 sm:h-2.5 md:w-3 md:h-3" />
                            </div>
                            <span className="text-xs sm:text-sm md:text-base lg:text-lg text-muted-foreground font-bold leading-snug break-words flex-1">
                                {item}
                            </span>
                        </div>
                    ))}
                    {!Array.isArray(block.content) && block.content && (
                        <p className="text-xs sm:text-sm md:text-base lg:text-lg text-muted-foreground font-bold leading-snug break-words">{text}</p>
                    )}
                </div>
            );

        case 'image': {
            if (!text) return null;

            return (
                <div className="my-8 sm:my-12 md:my-16 relative group w-full max-w-5xl mx-auto px-1 sm:px-0">
                    <div
                        onClick={(e) => {
                            e.stopPropagation();
                            onOpenImage(text);
                        }}
                        className="relative overflow-hidden rounded-2xl sm:rounded-[2rem] md:rounded-[3rem] border border-primary/10 shadow-[0_20px_50px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.3)] bg-muted/30 transition-all duration-700 cursor-zoom-in group-hover:shadow-primary/20 group-hover:border-primary/30"
                    >
                        <img
                            src={text}
                            alt="Contenido Visual de la Lección"
                            className="w-full h-auto object-contain max-h-[85vh] block relative z-0"
                            onError={(e: any) => {
                                e.target.style.display = 'none';
                                if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                            }}
                        />

                        {/* Hover Overlay with info */}
                        <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-black/80 via-black/20 to-transparent translate-y-full group-hover:translate-y-0 transition-transform duration-500 flex justify-between items-center backdrop-blur-[2px]">
                            <p className="text-white/90 text-xs font-bold flex items-center gap-2">
                                <Maximize2 className="w-4 h-4 text-primary" />
                                Haz clic para pantalla completa
                            </p>
                            <div className="p-2 rounded-lg bg-primary text-white shadow-lg">
                                <Maximize2 className="w-4 h-4" />
                            </div>
                        </div>
                    </div>

                    {/* Status Badge floating */}
                    <div className="absolute top-4 left-4 z-10 hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                        <span className="text-[10px] font-black text-white uppercase tracking-tighter">Vista Ampliada Disponible</span>
                    </div>

                    {/* Decorative glow background */}
                    <div className="absolute -inset-10 bg-primary/5 blur-[80px] rounded-full -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                </div>
            );
        }

        case 'divider':
            return (
                <div className="flex items-center justify-center py-4 sm:py-5 md:py-6 lg:py-8 gap-1.5 sm:gap-2 md:gap-3 opacity-20 w-full">
                    <div className="h-1 w-1 sm:h-1.5 sm:w-1.5 md:h-2 md:w-2 rounded-full bg-primary" />
                    <div className="h-1 w-12 sm:h-1.5 sm:w-14 md:h-2 md:w-16 lg:w-20 rounded-full bg-primary" />
                    <div className="h-1 w-1 sm:h-1.5 sm:w-1.5 md:h-2 md:w-2 rounded-full bg-primary" />
                </div>
            );

        default:
            return null;
    }
}
