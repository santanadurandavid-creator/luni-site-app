
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useToast } from './use-toast';
import { Button } from '@/components/ui/button';
import React from 'react';

const isIos = () => {
    if (typeof window === 'undefined') return false;
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
};

const isInStandaloneMode = () => {
    if (typeof window === 'undefined') return false;
    return ('standalone' in window.navigator) && ((window.navigator as any).standalone) || window.matchMedia('(display-mode: standalone)').matches;
}

export function usePWAInstall() {
    const { toast } = useToast();
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isAppInstalled, setIsAppInstalled] = useState(false);
    const [showIosInstallPrompt, setShowIosInstallPrompt] = useState(false);

    const canInstall = (!!deferredPrompt || isIos()) && !isAppInstalled;

    const promptInstall = useCallback(() => {
        if (isIos() && !isInStandaloneMode()) {
            setShowIosInstallPrompt(true);
        } else if (deferredPrompt) {
            deferredPrompt.prompt();
            deferredPrompt.userChoice.then((choiceResult: { outcome: string }) => {
                if (choiceResult.outcome === 'accepted') {
                    setIsAppInstalled(true);
                }
                setDeferredPrompt(null);
            });
        } else {
            toast({
                title: "Instalación",
                description: "Para instalar la app, usa el menú 'Añadir a pantalla de inicio' en tu navegador (Chrome o Safari).",
            });
        }
    }, [deferredPrompt]);

    useEffect(() => {
        setIsAppInstalled(isInStandaloneMode());

        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };

        const handleAppInstalled = () => {
            setDeferredPrompt(null);
            setIsAppInstalled(true);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.addEventListener('appinstalled', handleAppInstalled);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.removeEventListener('appinstalled', handleAppInstalled);
        };
    }, []);

    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (canInstall) {
            timer = setTimeout(() => {
                toast({
                    title: "Instala la Aplicación",
                    description: "Añade Luni Site a tu pantalla de inicio para una mejor experiencia.",
                    duration: 10000,
                    action: (
                        <Button onClick={promptInstall}>
                            Instalar
                        </Button>
                    ),
                });
            }, 3000);
        }
        return () => clearTimeout(timer);
    }, [canInstall, toast, promptInstall]);

    return { canInstall, promptInstall, showIosInstallPrompt, setShowIosInstallPrompt, isAppInstalled };
}
