
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Share2, Link as LinkIcon, Send, Facebook, Check } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface ShareButtonProps {
    itemId: string;
    itemTitle: string;
    itemType: 'video' | 'content' | 'quiz' | 'class' | 'podcast';
    className?: string;
    variant?: 'outline' | 'ghost' | 'default' | 'secondary';
    size?: 'sm' | 'default' | 'lg' | 'icon';
}

export function ShareButton({ itemId, itemTitle, itemType, className, variant = 'outline', size = 'sm' }: ShareButtonProps) {
    const { toast } = useToast();
    const [copied, setCopied] = useState(false);

    const getShareLink = () => {
        const baseUrl = window.location.origin;
        let path = '/content';

        if (itemType === 'quiz') path = '/quizzes';
        else if (['video', 'class', 'podcast'].includes(itemType)) path = '/clases';

        // Use clean URL format for better SEO and metadata
        return `${baseUrl}${path}/${itemId}`;
    };

    const handleCopyLink = async () => {
        const link = getShareLink();
        try {
            await navigator.clipboard.writeText(link);
            setCopied(true);
            toast({
                title: "¡Enlace copiado!",
                description: "El enlace se ha copiado al portapapeles.",
            });
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            toast({
                variant: "destructive",
                title: "Error",
                description: "No se pudo copiar el enlace.",
            });
        }
    };

    const shareOnWhatsApp = () => {
        const link = getShareLink();
        const text = `¡Mira este contenido en Luni: ${itemTitle}!\n\n${link}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    };

    const shareOnFacebook = () => {
        const link = getShareLink();
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`, '_blank');
    };

    return (
        <div className={cn("relative z-50", className)}>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="secondary"
                        size={size}
                        className={cn(
                            "rounded-full shadow-lg border-border/50 backdrop-blur-md transition-all duration-300",
                            "bg-secondary/90 hover:bg-secondary text-secondary-foreground hover:scale-105 active:scale-95 border",
                            "w-10 h-10 sm:w-auto sm:h-10 sm:px-4"
                        )}
                    >
                        <Share2 className="h-4 w-4 sm:mr-2 text-primary" />
                        <span className="hidden sm:inline font-bold tracking-tight">Compartir</span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                    align="end"
                    sideOffset={8}
                    className="w-56 p-2 rounded-2xl border-border bg-popover text-popover-foreground shadow-2xl animate-in fade-in slide-in-from-top-2"
                >
                    <DropdownMenuItem onClick={handleCopyLink} className="flex items-center gap-3 py-3 rounded-xl hover:bg-accent hover:text-accent-foreground cursor-pointer">
                        {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <LinkIcon className="h-4 w-4" />}
                        <span className="text-sm font-medium">{copied ? 'Copiado' : 'Copiar Link'}</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={shareOnWhatsApp} className="flex items-center gap-3 py-3 rounded-xl hover:bg-accent hover:text-accent-foreground cursor-pointer">
                        <Send className="h-4 w-4 text-emerald-500" />
                        <span className="text-sm font-medium">WhatsApp</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={shareOnFacebook} className="flex items-center gap-3 py-3 rounded-xl hover:bg-accent hover:text-accent-foreground cursor-pointer">
                        <Facebook className="h-4 w-4 text-blue-500" />
                        <span className="text-sm font-medium">Facebook</span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}
