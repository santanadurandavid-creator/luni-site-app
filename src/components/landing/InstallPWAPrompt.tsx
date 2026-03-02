'use client';

import { useState, useEffect } from 'react';
import { X, Download, Smartphone, Monitor, Apple } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPWAPrompt() {
    const [showPrompt, setShowPrompt] = useState(false);
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [deviceType, setDeviceType] = useState<'ios' | 'android' | 'desktop'>('desktop');
    const [isStandalone, setIsStandalone] = useState(false);

    useEffect(() => {
        // Detectar si ya está instalada
        const isInStandaloneMode = () => {
            return (
                window.matchMedia('(display-mode: standalone)').matches ||
                (window.navigator as any).standalone ||
                document.referrer.includes('android-app://')
            );
        };

        setIsStandalone(isInStandaloneMode());

        // Detectar tipo de dispositivo
        const userAgent = navigator.userAgent.toLowerCase();
        const isIOS = /iphone|ipad|ipod/.test(userAgent);
        const isAndroid = /android/.test(userAgent);

        if (isIOS) {
            setDeviceType('ios');
        } else if (isAndroid) {
            setDeviceType('android');
        } else {
            setDeviceType('desktop');
        }

        // Escuchar evento beforeinstallprompt (Chrome/Edge/Android)
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);

            // Verificar si el usuario ya cerró el prompt antes
            const hasClosedPrompt = localStorage.getItem('pwa-prompt-closed');
            if (!hasClosedPrompt) {
                // Mostrar después de 3 segundos
                setTimeout(() => {
                    setShowPrompt(true);
                }, 3000);
            }
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        // Para iOS, mostrar instrucciones si no está instalada
        if (isIOS && !isInStandaloneMode()) {
            const hasClosedPrompt = localStorage.getItem('pwa-prompt-closed');
            if (!hasClosedPrompt) {
                setTimeout(() => {
                    setShowPrompt(true);
                }, 3000);
            }
        }

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    const handleInstallClick = async () => {
        if (deviceType === 'ios') {
            // Para iOS, no podemos instalar programáticamente
            // El popup ya muestra las instrucciones
            return;
        }

        if (!deferredPrompt) {
            return;
        }

        // Mostrar el prompt nativo
        deferredPrompt.prompt();

        // Esperar la respuesta del usuario
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === 'accepted') {
            console.log('Usuario aceptó instalar la PWA');
        }

        // Limpiar el prompt
        setDeferredPrompt(null);
        setShowPrompt(false);
    };

    const handleClose = () => {
        setShowPrompt(false);
        localStorage.setItem('pwa-prompt-closed', 'true');
    };

    // No mostrar si ya está instalada
    if (isStandalone || !showPrompt) {
        return null;
    }

    const getDeviceIcon = () => {
        switch (deviceType) {
            case 'ios':
                return <Apple className="w-5 h-5" />;
            case 'android':
                return <Smartphone className="w-5 h-5" />;
            default:
                return <Monitor className="w-5 h-5" />;
        }
    };

    const getInstallInstructions = () => {
        if (deviceType === 'ios') {
            return (
                <div className="space-y-2 text-sm text-gray-600">
                    <p className="font-medium text-gray-900">Para instalar en iOS:</p>
                    <ol className="list-decimal list-inside space-y-1 text-xs">
                        <li>Toca el botón de compartir <span className="inline-block">⎙</span></li>
                        <li>Desplázate y selecciona "Añadir a pantalla de inicio"</li>
                        <li>Toca "Añadir" en la esquina superior derecha</li>
                    </ol>
                </div>
            );
        }
        return null;
    };

    return (
        <>
            {/* Overlay */}
            <div
                className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 animate-in fade-in duration-200"
                onClick={handleClose}
            />

            {/* Popup */}
            <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:bottom-4 sm:max-w-sm z-50 animate-in slide-in-from-bottom duration-300">
                <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
                    {/* Header */}
                    <div className="relative bg-gradient-to-br from-[#3A5064] to-[#2d3e50] p-4">
                        <button
                            onClick={handleClose}
                            className="absolute top-3 right-3 p-1 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                        >
                            <X className="w-4 h-4 text-white" />
                        </button>

                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white/10 rounded-xl backdrop-blur-sm">
                                {getDeviceIcon()}
                            </div>
                            <div>
                                <h3 className="text-white font-bold text-base">Instalar Luni Site</h3>
                                <p className="text-white/80 text-xs">Acceso rápido desde tu dispositivo</p>
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-4 space-y-4">
                        {deviceType === 'ios' ? (
                            getInstallInstructions()
                        ) : (
                            <>
                                <p className="text-sm text-gray-600">
                                    Instala nuestra app para acceder más rápido y recibir notificaciones de nuevo contenido.
                                </p>

                                <Button
                                    onClick={handleInstallClick}
                                    className="w-full bg-[#3A5064] hover:bg-[#2d3e50] text-white rounded-xl py-5 font-medium shadow-lg hover:shadow-xl transition-all"
                                >
                                    <Download className="w-4 h-4 mr-2" />
                                    Instalar Aplicación
                                </Button>
                            </>
                        )}

                        <button
                            onClick={handleClose}
                            className="w-full text-sm text-gray-500 hover:text-gray-700 transition-colors py-2"
                        >
                            Ahora no
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
