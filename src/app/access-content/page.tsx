'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { LockKeyhole, ArrowRight, UserPlus, LogIn } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

function AccessContentContent() {
    const { isAuthenticated, isLoading } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [redirectUrl, setRedirectUrl] = useState<string>('/');

    // Fixed positions and durations for bouncing bubbles (Same as Splash/Loading)
    const bubbles = [
        { size: 16, color: 'bg-pink-400/60', delay: 0, duration: 4, x: 10, y: 20 },
        { size: 24, color: 'bg-blue-500/50', delay: 0.5, duration: 5, x: 80, y: 70 },
        { size: 20, color: 'bg-pink-500/50', delay: 1, duration: 4.5, x: 30, y: 60 },
        { size: 18, color: 'bg-blue-400/60', delay: 1.5, duration: 5.5, x: 70, y: 30 },
        { size: 22, color: 'bg-pink-400/50', delay: 2, duration: 4.8, x: 50, y: 80 },
        { size: 16, color: 'bg-blue-500/60', delay: 2.5, duration: 5.2, x: 20, y: 40 },
    ];

    useEffect(() => {
        // Get the redirect URL from query params
        const redirect = searchParams.get('redirect');
        if (redirect) {
            setRedirectUrl(redirect);
        }
    }, [searchParams]);

    useEffect(() => {
        // If user is already authenticated, redirect them to the content
        if (!isLoading && isAuthenticated) {
            router.replace(redirectUrl);
        }
    }, [isAuthenticated, isLoading, router, redirectUrl]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#3A5064]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin" />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#3A5064] relative overflow-hidden flex items-center justify-center p-4 font-sans">
            {/* Animated Bouncing Bubbles Background */}
            <div className="absolute inset-0 pointer-events-none">
                {bubbles.map((bubble, i) => (
                    <div
                        key={i}
                        className={`absolute rounded-full ${bubble.color} animate-bubble-bounce`}
                        style={{
                            width: `${bubble.size}px`,
                            height: `${bubble.size}px`,
                            left: `${bubble.x}%`,
                            top: `${bubble.y}%`,
                            animationDelay: `${bubble.delay}s`,
                            animationDuration: `${bubble.duration}s`
                        }}
                    />
                ))}
            </div>

            <div className="w-full max-w-md relative z-10 flex flex-col items-center gap-8">
                {/* Logo centered above card - Minimal Thin Border */}
                <div className="relative p-1 bg-white/95 backdrop-blur rounded-[1.2rem] shadow-xl shadow-black/20 mb-2">
                    <div className="relative w-20 h-20">
                        <Image
                            src="/images/luni-logo.png"
                            alt="Luni Logo"
                            fill
                            className="object-contain"
                            priority
                        />
                    </div>
                </div>

                {/* Central Auth Card */}
                <Card className="w-full border-0 shadow-2xl shadow-black/40 bg-white/95 backdrop-blur-sm rounded-3xl overflow-hidden">
                    <CardContent className="space-y-6 p-8">

                        {/* Header / Icon */}
                        <div className="flex flex-col items-center text-center space-y-4">
                            <div className="w-16 h-16 bg-[#3A5064]/10 rounded-full flex items-center justify-center mb-1">
                                <LockKeyhole className="w-8 h-8 text-[#3A5064]" />
                            </div>

                            <div className="space-y-2">
                                <h1 className="text-2xl font-bold text-[#2d3e50] leading-tight">
                                    Regístrate para ver <br /> este contenido
                                </h1>
                                <p className="text-slate-500 text-base">
                                    Es totalmente gratis y te tomará <br /> menos de 1 minuto.
                                </p>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="space-y-4 pt-2">
                            <Link href={`/register?redirect=${encodeURIComponent(redirectUrl)}`} className="block w-full">
                                <Button size="lg" className="w-full h-14 text-base font-bold bg-[#3A5064] hover:bg-[#2d3e50] text-white shadow-lg shadow-[#3A5064]/20 transition-all duration-300 rounded-xl hover:-translate-y-0.5">
                                    <UserPlus className="w-5 h-5 mr-2.5" />
                                    Crear Cuenta Gratis
                                    <ArrowRight className="w-5 h-5 ml-2.5 opacity-70" />
                                </Button>
                            </Link>

                            <div className="relative py-2">
                                <div className="absolute inset-0 flex items-center">
                                    <span className="w-full border-t border-slate-200" />
                                </div>
                                <div className="relative flex justify-center text-xs uppercase tracking-wider">
                                    <span className="bg-white/95 px-3 text-slate-400 font-semibold">o accede con</span>
                                </div>
                            </div>

                            <Link href={`/login?redirect=${encodeURIComponent(redirectUrl)}`} className="block w-full">
                                <Button variant="outline" size="lg" className="w-full h-14 text-base font-semibold text-[#3A5064] bg-white border-2 border-slate-200 hover:border-[#3A5064] hover:bg-slate-50 transition-all duration-300 rounded-xl">
                                    <LogIn className="w-5 h-5 mr-2.5" />
                                    Iniciar Sesión
                                </Button>
                            </Link>
                        </div>

                        <p className="text-center text-xs text-slate-400 font-medium pt-2">
                            🔒 Acceso seguro y gratuito
                        </p>

                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

export default function AccessContentPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen bg-[#3A5064]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin" />
                </div>
            </div>
        }>
            <AccessContentContent />
        </Suspense>
    );
}
