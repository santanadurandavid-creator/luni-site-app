'use client';

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Star, Calendar, ClipboardCheck, ArrowRight, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

export function PremiumActivationModal() {
    const [isOpen, setIsOpen] = useState(false);
    const [details, setDetails] = useState<{ days: string | null; tokens: string | null }>({ days: null, tokens: null });
    const searchParams = useSearchParams();
    const router = useRouter();

    useEffect(() => {
        const modal = searchParams.get('modal');
        if (modal === 'premium_activation') {
            const days = searchParams.get('days');
            const tokens = searchParams.get('tokens');
            setDetails({ days, tokens });
            setIsOpen(true);
        }
    }, [searchParams]);

    const handleClose = () => {
        setIsOpen(false);
        // Clear search params
        const params = new URLSearchParams(searchParams.toString());
        params.delete('modal');
        params.delete('days');
        params.delete('tokens');
        router.replace(`?${params.toString()}`);
    };

    // Also listen for custom event for foreground notifications
    useEffect(() => {
        const handleOpen = (e: any) => {
            const { days, tokens } = e.detail || {};
            setDetails({ days: days?.toString() || null, tokens: tokens?.toString() || null });
            setIsOpen(true);
        };
        window.addEventListener('openPremiumActivationModal', handleOpen);
        return () => window.removeEventListener('openPremiumActivationModal', handleOpen);
    }, []);

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="w-[95vw] max-w-md rounded-2xl overflow-hidden border-none p-0 bg-gradient-to-b from-amber-50 to-white dark:from-amber-950/20 dark:to-slate-950 shadow-2xl">
                <div className="relative p-6 pt-10">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-300 via-amber-500 to-amber-300" />

                    <DialogHeader className="text-center items-center">
                        <div className="relative mb-6">
                            <div className="h-20 w-20 rounded-2xl bg-amber-500 flex items-center justify-center rotate-3 shadow-lg shadow-amber-500/30">
                                <Star className="h-10 w-10 text-white fill-white" />
                            </div>
                            <div className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-white dark:bg-amber-400 flex items-center justify-center shadow-md animate-bounce">
                                <Zap className="h-4 w-4 text-amber-500 fill-amber-500 dark:text-white dark:fill-white" />
                            </div>
                        </div>

                        <DialogTitle className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                            ¡Cuenta Premium Activada!
                        </DialogTitle>
                        <DialogDescription className="text-slate-600 dark:text-slate-400 text-lg mt-2">
                            Felicidades, se ha activado el acceso premium en tu perfil.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-8 space-y-4">
                        <div className="flex items-center gap-4 p-4 rounded-xl bg-white dark:bg-white/5 border border-amber-200/50 dark:border-amber-500/20 shadow-sm transition-all hover:scale-[1.02]">
                            <div className="h-12 w-12 rounded-lg bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center shrink-0">
                                <Calendar className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Duración</p>
                                <p className="text-lg font-bold text-slate-800 dark:text-slate-200">
                                    {details.days || '0'} días de acceso total
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 p-4 rounded-xl bg-white dark:bg-white/5 border border-amber-200/50 dark:border-amber-500/20 shadow-sm transition-all hover:scale-[1.02]">
                            <div className="h-12 w-12 rounded-lg bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center shrink-0">
                                <ClipboardCheck className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Simuladores</p>
                                <p className="text-lg font-bold text-slate-800 dark:text-slate-200">
                                    {details.tokens || '0'} exámenes simulacro incluidos
                                </p>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="flex-col sm:flex-row gap-3">
                        <Button
                            onClick={handleClose}
                            className="w-full h-12 text-lg font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/20 rounded-xl transition-all active:scale-95 group"
                        >
                            ¡Empezar a estudiar!
                            <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                        </Button>
                    </DialogFooter>
                </div>
            </DialogContent>
        </Dialog>
    );
}
