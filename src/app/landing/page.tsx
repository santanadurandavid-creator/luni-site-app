'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
    BookOpen,
    Video,
    ClipboardCheck,
    BarChart,
    Trophy,
    ChevronRight,
    Play,
    Star,
    Users,
    ArrowRight,
    Sparkles,
    Headphones,
    Lock,
    Download
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { getFirebaseServices } from '@/lib/firebase';
import { collection, query, where, getDocs, limit, orderBy, doc, getDoc } from 'firebase/firestore';
import type { ContentItem } from '@/lib/types';
import { LandingContentModal } from '@/components/landing/LandingContentModal';
import { HeroCarousel } from '@/components/landing/HeroCarousel';
import { InstallPWAPrompt } from '@/components/landing/InstallPWAPrompt';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';


export default function LandingPage() {
    const router = useRouter();
    const { user, isLoading } = useAuth();
    const [scrolled, setScrolled] = useState(false);
    const [demoContent, setDemoContent] = useState<ContentItem[]>([]);
    const [loadingContent, setLoadingContent] = useState(true);
    const [selectedContent, setSelectedContent] = useState<ContentItem | null>(null);
    const [heroImages, setHeroImages] = useState<string[]>([]);
    const [autoPlayInterval, setAutoPlayInterval] = useState(5000);
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [showInstallButton, setShowInstallButton] = useState(false);
    const { toast } = useToast();


    useEffect(() => {
        if (!isLoading && user) {
            router.replace('/profile');
        }
    }, [user, isLoading, router]);

    useEffect(() => {
        const loadLandingConfig = async () => {
            try {
                const { db } = getFirebaseServices();
                const docRef = doc(db, 'settings', 'landingPage');
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setHeroImages(data.heroImages || []);
                    setAutoPlayInterval(data.autoPlayInterval || 5000);
                }
            } catch (error) {
                console.error('Error loading landing config:', error);
            }
        };

        loadLandingConfig();
    }, []);

    useEffect(() => {
        const fetchDemoContent = async () => {
            try {
                const { db } = getFirebaseServices();

                let q = query(
                    collection(db, 'content'),
                    where('showInLanding', '==', true),
                    orderBy('createdAt', 'desc'),
                    limit(12)
                );

                try {
                    const snapshot = await getDocs(q);
                    const items = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    } as ContentItem));
                    setDemoContent(items);
                } catch (idxError: any) {
                    console.error('Initial demo content query failed (likely missing index), trying fallback:', idxError);
                    // Fallback query without orderBy - doesn't require composite index
                    const fallbackQ = query(
                        collection(db, 'content'),
                        where('showInLanding', '==', true),
                        limit(12)
                    );
                    const snapshot = await getDocs(fallbackQ);
                    const items = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    } as ContentItem));
                    // Manually sort by createdAt if available since we couldn't do it in the query
                    items.sort((a, b) => {
                        const dateA = a.createdAt?.seconds || 0;
                        const dateB = b.createdAt?.seconds || 0;
                        return dateB - dateA;
                    });
                    setDemoContent(items);
                }
            } catch (error) {
                console.error('Error fetching demo content:', error);
            } finally {
                setLoadingContent(false);
            }
        };

        fetchDemoContent();
    }, []);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        const handleBeforeInstallPrompt = (e: any) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setShowInstallButton(true);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    const handleGetStarted = () => {
        router.push('/register');
    };

    const handleContentClick = (item: ContentItem) => {
        setSelectedContent(item);
    };

    const handleInstall = async () => {
        if (!deferredPrompt) {
            toast({
                title: "Instalación",
                description: "Para instalar la app, usa el menú 'Añadir a pantalla de inicio' en tu navegador o espera a que aparezca la opción nativa.",
            });
            return;
        }

        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === 'accepted') {
            console.log('PWA installed');
        }

        setDeferredPrompt(null);
        setShowInstallButton(false);
    };

    const getContentIcon = (type: string) => {
        switch (type) {
            case 'video':
            case 'class':
                return Video;
            case 'quiz':
                return ClipboardCheck;
            case 'podcast':
                return Headphones;
            case 'content':
                return BookOpen;
            default:
                return BookOpen;
        }
    };

    const getContentColor = (type: string) => {
        switch (type) {
            case 'video':
            case 'class':
                return 'from-[#3A5064] to-[#2d3e50]';
            case 'quiz':
                return 'from-[#4a6074] to-[#3A5064]';
            case 'podcast':
                return 'from-[#3A5064] to-[#4a6074]';
            case 'content':
                return 'from-[#3A5064] to-[#4a6074]';
            default:
                return 'from-gray-500 to-gray-600';
        }
    };

    const getContentTypeLabel = (type: string) => {
        switch (type) {
            case 'video':
                return 'Video';
            case 'class':
                return 'Clase';
            case 'quiz':
                return 'Quiz';
            case 'podcast':
                return 'Podcast';
            case 'content':
                return 'Lectura';
            default:
                return 'Contenido';
        }
    };

    const videos = demoContent.filter(item => item.type === 'video' || item.type === 'class').slice(0, 3);
    const quizzes = demoContent.filter(item => item.type === 'quiz').slice(0, 3);
    const podcasts = demoContent.filter(item => item.type === 'podcast').slice(0, 3);
    const readings = demoContent.filter(item => item.type === 'content').slice(0, 3);

    if (isLoading || user) {
        return null;
    }

    return (
        <div className="min-h-screen bg-white">
            {/* Subtle gradient background */}
            <div className="fixed inset-0 bg-gradient-to-br from-slate-50 via-white to-slate-100 -z-10" />

            {/* Navigation */}
            <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/90 backdrop-blur-xl shadow-sm border-b border-gray-100' : 'bg-transparent'}`}>
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 sm:gap-3">
                            <div className="p-0.5 bg-[#3A5064] rounded-xl sm:rounded-2xl shadow-md">
                                <img src="/images/luni-logo.png" alt="Luni" className="w-8 h-8 sm:w-10 sm:h-10 object-contain rounded-lg sm:rounded-xl bg-white" />
                            </div>
                            <span className="text-xl sm:text-2xl font-bold text-[#3A5064]">Luni Site</span>
                        </div>
                        <div className="flex items-center gap-2 sm:gap-3">
                            <Button
                                variant="ghost"
                                onClick={() => router.push('/login')}
                                className="text-gray-700 hover:text-gray-900 hover:bg-gray-100 text-sm sm:text-base px-3 sm:px-4"
                            >
                                Iniciar Sesión
                            </Button>
                            <Button
                                onClick={() => router.push('/register')}
                                className="bg-[#3A5064] hover:bg-[#2d3e50] text-white shadow-lg text-sm sm:text-base px-3 sm:px-6"
                            >
                                <span className="hidden sm:inline">Comenzar Gratis</span>
                                <span className="sm:hidden">Gratis</span>
                            </Button>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative pt-24 sm:pt-32 lg:pt-40 pb-16 sm:pb-20 lg:pb-24 px-4 sm:px-6 lg:px-8">
                <div className="container mx-auto max-w-7xl">
                    <div className="grid lg:grid-cols-2 gap-8 sm:gap-12 lg:gap-16 items-center">
                        <div className="space-y-6 sm:space-y-8 text-center lg:text-left max-w-2xl mx-auto lg:mx-0">
                            <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-slate-100 rounded-full border border-slate-200">
                                <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-[#3A5064]" />
                                <span className="text-xs sm:text-sm font-medium text-[#3A5064]">Plataforma líder para el examen UNAM</span>
                            </div>

                            <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold leading-tight text-gray-900 mx-auto lg:mx-0 max-w-2xl lg:max-w-none">
                                Tu camino hacia la
                                <span className="block text-[#3A5064] mt-2">
                                    UNAM comienza aquí
                                </span>
                            </h1>

                            <p className="text-base sm:text-lg lg:text-xl text-gray-600 leading-relaxed max-w-2xl mx-auto lg:mx-0 px-4 sm:px-0">
                                Prepárate con contenido de calidad, simuladores realistas y un sistema de estudio personalizado. Miles de estudiantes ya confían en nosotros.
                            </p>

                            <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 justify-center lg:justify-start items-center">
                                <Button
                                    onClick={handleGetStarted}
                                    size="lg"
                                    className="bg-[#3A5064] hover:bg-[#2d3e50] text-white text-base sm:text-lg px-6 sm:px-8 py-5 sm:py-6 rounded-xl shadow-lg hover:shadow-xl transition-all w-full sm:w-auto"
                                >
                                    Comenzar Gratis
                                    <ArrowRight className="ml-2 w-4 h-4 sm:w-5 sm:h-5" />
                                </Button>
                                <Button
                                    onClick={() => document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' })}
                                    size="lg"
                                    variant="outline"
                                    className="border-2 border-[#3A5064] bg-white text-[#3A5064] hover:bg-[#3A5064] hover:text-white text-base sm:text-lg px-6 sm:px-8 py-5 sm:py-6 rounded-xl w-full sm:w-auto transition-all"
                                >
                                    <Play className="mr-2 w-4 h-4 sm:w-5 sm:h-5" />
                                    Ver Demo
                                </Button>
                                {true && (
                                    <div className="flex items-center justify-center gap-1.5 sm:gap-3 bg-white/80 backdrop-blur-sm border-2 border-gray-200 rounded-lg sm:rounded-xl p-1.5 sm:p-2 shadow-md hover:shadow-lg transition-all mx-auto">
                                        {/* Botón de Instalar - Más compacto */}
                                        <Button
                                            onClick={handleInstall}
                                            size="sm"
                                            className="bg-[#3A5064] hover:bg-[#2d3e50] text-white px-2.5 sm:px-4 py-1.5 sm:py-2.5 rounded-md sm:rounded-lg shadow-sm hover:shadow transition-all text-[10px] sm:text-sm font-semibold flex-shrink-0"
                                        >
                                            <Download className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                                            Instalar
                                        </Button>

                                        {/* Divisor vertical */}
                                        <div className="h-6 sm:h-8 w-px bg-gray-300"></div>

                                        {/* Iconos de dispositivos y plataformas - Minimalistas monocromáticos */}
                                        <div className="flex items-center gap-1 sm:gap-2 pr-0.5 sm:pr-1">
                                            {/* iOS/Apple */}
                                            <div className="group relative flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 rounded-md sm:rounded-lg bg-[#3A5064]/10 hover:bg-[#3A5064]/20 transition-colors">
                                                <svg className="w-3 h-3 sm:w-4.5 sm:h-4.5 text-[#3A5064]" viewBox="0 0 24 24" fill="currentColor">
                                                    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                                                </svg>
                                                <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[9px] sm:text-[10px] text-gray-500 font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">iOS</span>
                                            </div>

                                            {/* Android */}
                                            <div className="group relative flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 rounded-md sm:rounded-lg bg-[#3A5064]/10 hover:bg-[#3A5064]/20 transition-colors">
                                                <svg className="w-3 h-3 sm:w-4.5 sm:h-4.5 text-[#3A5064]" viewBox="0 0 24 24" fill="currentColor">
                                                    <path d="M17.6 9.48l1.84-3.18c.16-.31.04-.69-.26-.85-.29-.15-.65-.06-.83.22l-1.88 3.24a11.5 11.5 0 0 0-8.94 0L5.65 5.67c-.19-.28-.54-.37-.83-.22-.3.16-.42.54-.26.85l1.84 3.18C4.8 10.92 3.5 12.62 3.5 14.5h17c0-1.88-1.3-3.58-2.9-5.02zM10 12.5c-.28 0-.5-.22-.5-.5s.22-.5.5-.5.5.22.5.5-.22.5-.5.5zm4 0c-.28 0-.5-.22-.5-.5s.22-.5.5-.5.5.22.5.5-.22.5-.5.5z" />
                                                </svg>
                                                <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[9px] sm:text-[10px] text-gray-500 font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Android</span>
                                            </div>

                                            {/* Windows/PC */}
                                            <div className="group relative flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 rounded-md sm:rounded-lg bg-[#3A5064]/10 hover:bg-[#3A5064]/20 transition-colors">
                                                <svg className="w-3 h-3 sm:w-4.5 sm:h-4.5 text-[#3A5064]" viewBox="0 0 24 24" fill="currentColor">
                                                    <path d="M3 5.45v6.1l7.5-.05V5.4L3 5.45zm7.5 7.05L3 12.45v6.1l7.5.1v-6.15zm1.5-.05V5.3L21 3.95v8.5l-9 .05zm9 1.05V21.5l-9-1.35v-7.15l9 .5z" />
                                                </svg>
                                                <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[9px] sm:text-[10px] text-gray-500 font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Windows</span>
                                            </div>

                                            {/* Divisor */}
                                            <div className="h-5 sm:h-6 w-px bg-gray-300 mx-0.5"></div>

                                            {/* Celular/Móvil */}
                                            <div className="group relative flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 rounded-md sm:rounded-lg bg-[#3A5064]/10 hover:bg-[#3A5064]/20 transition-colors">
                                                <svg className="w-3 h-3 sm:w-4.5 sm:h-4.5 text-[#3A5064]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                                                    <line x1="12" y1="18" x2="12.01" y2="18" />
                                                </svg>
                                                <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[9px] sm:text-[10px] text-gray-500 font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Celular</span>
                                            </div>

                                            {/* Tablet */}
                                            <div className="group relative flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 rounded-md sm:rounded-lg bg-[#3A5064]/10 hover:bg-[#3A5064]/20 transition-colors">
                                                <svg className="w-3 h-3 sm:w-4.5 sm:h-4.5 text-[#3A5064]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
                                                    <line x1="12" y1="18" x2="12.01" y2="18" />
                                                </svg>
                                                <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[9px] sm:text-[10px] text-gray-500 font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Tablet</span>
                                            </div>

                                            {/* PC/Computadora */}
                                            <div className="group relative flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 rounded-md sm:rounded-lg bg-[#3A5064]/10 hover:bg-[#3A5064]/20 transition-colors">
                                                <svg className="w-3 h-3 sm:w-4.5 sm:h-4.5 text-[#3A5064]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                                                    <line x1="8" y1="21" x2="16" y2="21" />
                                                    <line x1="12" y1="17" x2="12" y2="21" />
                                                </svg>
                                                <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[9px] sm:text-[10px] text-gray-500 font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">PC</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Hero Carousel */}
                        <div className="relative">
                            <HeroCarousel
                                images={heroImages}
                                autoPlayInterval={autoPlayInterval}
                            />
                        </div>
                    </div>
                </div>
            </section>

            {/* Areas Section */}
            <section className="py-16 sm:py-20 lg:py-24 px-4 sm:px-6 lg:px-8">
                <div className="container mx-auto max-w-7xl">
                    <div className="text-center mb-12 sm:mb-16">
                        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-3 sm:mb-4">
                            Preparación para todas las áreas
                        </h2>
                        <p className="text-base sm:text-lg lg:text-xl text-gray-600">
                            Contenido especializado para cada área de conocimiento UNAM
                        </p>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
                        {[
                            {
                                number: '1',
                                title: 'Ciencias Físico-Matemáticas y de las Ingenierías',
                                subjects: ['Matemáticas', 'Física', 'Química', 'Dibujo'],
                            },
                            {
                                number: '2',
                                title: 'Ciencias Biológicas, Químicas y de la Salud',
                                subjects: ['Biología', 'Química', 'Física', 'Matemáticas'],
                            },
                            {
                                number: '3',
                                title: 'Ciencias Sociales',
                                subjects: ['Historia', 'Geografía', 'Matemáticas', 'Filosofía'],
                            },
                            {
                                number: '4',
                                title: 'Humanidades y de las Artes',
                                subjects: ['Literatura', 'Historia', 'Filosofía', 'Arte'],
                            }
                        ].map((area, index) => (
                            <div
                                key={index}
                                className="bg-white rounded-xl sm:rounded-2xl p-6 sm:p-8 shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100"
                            >
                                <div className="flex items-start gap-3 sm:gap-4 mb-4">
                                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-[#3A5064] flex items-center justify-center flex-shrink-0 shadow-lg">
                                        <span className="text-xl sm:text-2xl font-bold text-white">{area.number}</span>
                                    </div>
                                    <div>
                                        <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-1 sm:mb-2">Área {area.number}</h3>
                                        <p className="text-xs sm:text-sm text-gray-600">{area.title}</p>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-2 mt-4">
                                    {area.subjects.map((subject, idx) => (
                                        <span
                                            key={idx}
                                            className="px-2.5 sm:px-3 py-1 sm:py-1.5 bg-gray-50 rounded-full text-xs sm:text-sm text-gray-700 border border-gray-200 font-medium"
                                        >
                                            {subject}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section >

            {/* Features Section */}
            <section className="py-16 sm:py-20 lg:py-24 px-4 sm:px-6 lg:px-8 bg-white">
                <div className="container mx-auto max-w-7xl">
                    <div className="text-center mb-12 sm:mb-16">
                        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-3 sm:mb-4">
                            Todo lo que necesitas para aprobar
                        </h2>
                        <p className="text-base sm:text-lg lg:text-xl text-gray-600">
                            Herramientas diseñadas para maximizar tu preparación
                        </p>
                    </div>

                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                        {/* Clases en Video */}
                        <div className="bg-white rounded-xl sm:rounded-2xl p-6 sm:p-8 shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100">
                            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-[#3A5064] flex items-center justify-center mb-4 sm:mb-6 shadow-lg">
                                <Video className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                            </div>
                            <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 sm:mb-3">
                                Clases en Video
                            </h3>
                            <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                                Aprende con clases grabadas por expertos, disponibles 24/7.
                            </p>
                        </div>

                        {/* Contenido Interactivo */}
                        <div className="bg-white rounded-xl sm:rounded-2xl p-6 sm:p-8 shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100">
                            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-[#3A5064] flex items-center justify-center mb-4 sm:mb-6 shadow-lg">
                                <BookOpen className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                            </div>
                            <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 sm:mb-3">
                                Contenido Interactivo
                            </h3>
                            <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                                Lecturas y material multimedia para todos los estilos de aprendizaje.
                            </p>
                        </div>

                        {/* Quizzes y Simuladores */}
                        <div className="bg-white rounded-xl sm:rounded-2xl p-6 sm:p-8 shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100">
                            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-[#3A5064] flex items-center justify-center mb-4 sm:mb-6 shadow-lg">
                                <ClipboardCheck className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                            </div>
                            <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 sm:mb-3">
                                Quizzes y Simuladores
                            </h3>
                            <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                                Practica con exámenes que replican el formato real.
                            </p>
                        </div>

                        {/* Seguimiento de Progreso */}
                        <div className="bg-white rounded-xl sm:rounded-2xl p-6 sm:p-8 shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100">
                            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-[#3A5064] flex items-center justify-center mb-4 sm:mb-6 shadow-lg">
                                <BarChart className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                            </div>
                            <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 sm:mb-3">
                                Seguimiento de Progreso
                            </h3>
                            <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                                Visualiza tu avance y optimiza tu tiempo de estudio.
                            </p>
                        </div>

                        {/* Ranking y Premios */}
                        <div className="bg-white rounded-xl sm:rounded-2xl p-6 sm:p-8 shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100">
                            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-[#3A5064] flex items-center justify-center mb-4 sm:mb-6 shadow-lg">
                                <Trophy className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                            </div>
                            <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 sm:mb-3">
                                Ranking y Premios
                            </h3>
                            <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                                Compite y gana premios como tablets y laptops.
                            </p>
                        </div>

                        {/* IA Personalizada */}
                        <div className="bg-white rounded-xl sm:rounded-2xl p-6 sm:p-8 shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100">
                            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-[#3A5064] flex items-center justify-center mb-4 sm:mb-6 shadow-lg">
                                <Sparkles className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                            </div>
                            <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 sm:mb-3">
                                IA Personalizada
                            </h3>
                            <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                                Planes de estudio generados con inteligencia artificial.
                            </p>
                        </div>
                    </div>
                </div>
            </section>


            {/* Demo Content Section */}
            <section id="demo" className="py-16 sm:py-20 lg:py-24 px-4 sm:px-6 lg:px-8 bg-gray-50">
                <div className="container mx-auto max-w-7xl">
                    <div className="text-center mb-12 sm:mb-16">
                        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-3 sm:mb-4">
                            Prueba nuestro contenido
                        </h2>
                        <p className="text-base sm:text-lg lg:text-xl text-gray-600">
                            Explora ejemplos de nuestro material de estudio
                        </p>
                    </div>

                    {loadingContent ? (
                        <div className="text-center py-12">
                            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-[#3A5064] border-t-transparent"></div>
                            <p className="mt-4 text-gray-600">Cargando contenido...</p>
                        </div>
                    ) : (
                        <div className="space-y-12 sm:space-y-16">
                            {videos.length > 0 && (
                                <div>
                                    <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6 flex items-center gap-2">
                                        <Video className="w-5 h-5 sm:w-6 sm:h-6 text-[#3A5064]" />
                                        Videos y Clases
                                    </h3>
                                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                                        {videos.map((item) => {
                                            const Icon = getContentIcon(item.type);
                                            return (
                                                <div
                                                    key={item.id}
                                                    onClick={() => handleContentClick(item)}
                                                    className="group bg-white rounded-xl sm:rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer border border-gray-100"
                                                >
                                                    <div className="h-40 sm:h-48 relative">
                                                        {item.imageUrl ? (
                                                            <Image
                                                                src={item.imageUrl}
                                                                alt={item.title}
                                                                fill
                                                                className="object-cover transition-transform duration-300 group-hover:scale-105"
                                                            />
                                                        ) : (
                                                            <div className={`w-full h-full bg-gradient-to-br ${getContentColor(item.type)} flex items-center justify-center`}>
                                                                <Icon className="w-12 h-12 sm:w-16 sm:h-16 text-white/90" />
                                                            </div>
                                                        )}
                                                        <div className="absolute top-3 sm:top-4 left-3 sm:left-4 px-2.5 sm:px-3 py-1 sm:py-1.5 bg-black/20 backdrop-blur-sm rounded-full text-xs text-white flex items-center gap-1 sm:gap-1.5 font-medium z-10">
                                                            <Play className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                                            Haz clic para ver
                                                        </div>
                                                    </div>
                                                    <div className="p-4 sm:p-6">
                                                        <div className="text-xs sm:text-sm text-[#3A5064] font-semibold mb-2">{getContentTypeLabel(item.type)}</div>
                                                        <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-2 line-clamp-2">{item.title}</h3>
                                                        <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">{item.subject || 'General'}</p>
                                                        <div className="flex items-center text-[#3A5064] group-hover:text-[#2d3e50] transition-colors font-medium">
                                                            <span className="text-xs sm:text-sm">Ver contenido</span>
                                                            <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {quizzes.length > 0 && (
                                <div>
                                    <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6 flex items-center gap-2">
                                        <ClipboardCheck className="w-5 h-5 sm:w-6 sm:h-6 text-[#3A5064]" />
                                        Quizzes y Simuladores
                                    </h3>
                                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                                        {quizzes.map((item) => {
                                            const Icon = getContentIcon(item.type);
                                            return (
                                                <div
                                                    key={item.id}
                                                    onClick={() => handleContentClick(item)}
                                                    className="group bg-white rounded-xl sm:rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer border border-gray-100"
                                                >
                                                    <div className="h-40 sm:h-48 relative">
                                                        {item.imageUrl ? (
                                                            <Image
                                                                src={item.imageUrl}
                                                                alt={item.title}
                                                                fill
                                                                className="object-cover transition-transform duration-300 group-hover:scale-105"
                                                            />
                                                        ) : (
                                                            <div className={`w-full h-full bg-gradient-to-br ${getContentColor(item.type)} flex items-center justify-center`}>
                                                                <Icon className="w-12 h-12 sm:w-16 sm:h-16 text-white/90" />
                                                            </div>
                                                        )}
                                                        <div className="absolute top-3 sm:top-4 left-3 sm:left-4 px-2.5 sm:px-3 py-1 sm:py-1.5 bg-black/20 backdrop-blur-sm rounded-full text-xs text-white flex items-center gap-1 sm:gap-1.5 font-medium z-10">
                                                            <Play className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                                            Haz clic para ver
                                                        </div>
                                                    </div>
                                                    <div className="p-4 sm:p-6">
                                                        <div className="text-xs sm:text-sm text-[#3A5064] font-semibold mb-2">{getContentTypeLabel(item.type)}</div>
                                                        <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-2 line-clamp-2">{item.title}</h3>
                                                        <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">{item.subject || 'General'}</p>
                                                        <div className="flex items-center text-[#3A5064] group-hover:text-[#2d3e50] transition-colors font-medium">
                                                            <span className="text-xs sm:text-sm">Ver contenido</span>
                                                            <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {podcasts.length > 0 && (
                                <div>
                                    <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6 flex items-center gap-2">
                                        <Headphones className="w-5 h-5 sm:w-6 sm:h-6 text-[#3A5064]" />
                                        Podcasts
                                    </h3>
                                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                                        {podcasts.map((item) => {
                                            const Icon = getContentIcon(item.type);
                                            return (
                                                <div
                                                    key={item.id}
                                                    onClick={() => handleContentClick(item)}
                                                    className="group bg-white rounded-xl sm:rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer border border-gray-100"
                                                >
                                                    <div className="h-40 sm:h-48 relative">
                                                        {item.imageUrl ? (
                                                            <Image
                                                                src={item.imageUrl}
                                                                alt={item.title}
                                                                fill
                                                                className="object-cover transition-transform duration-300 group-hover:scale-105"
                                                            />
                                                        ) : (
                                                            <div className={`w-full h-full bg-gradient-to-br ${getContentColor(item.type)} flex items-center justify-center`}>
                                                                <Icon className="w-12 h-12 sm:w-16 sm:h-16 text-white/90" />
                                                            </div>
                                                        )}
                                                        <div className="absolute top-3 sm:top-4 left-3 sm:left-4 px-2.5 sm:px-3 py-1 sm:py-1.5 bg-black/20 backdrop-blur-sm rounded-full text-xs text-white flex items-center gap-1 sm:gap-1.5 font-medium z-10">
                                                            <Play className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                                            Haz clic para ver
                                                        </div>
                                                    </div>
                                                    <div className="p-4 sm:p-6">
                                                        <div className="text-xs sm:text-sm text-[#3A5064] font-semibold mb-2">{getContentTypeLabel(item.type)}</div>
                                                        <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-2 line-clamp-2">{item.title}</h3>
                                                        <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">{item.subject || 'General'}</p>
                                                        <div className="flex items-center text-[#3A5064] group-hover:text-[#2d3e50] transition-colors font-medium">
                                                            <span className="text-xs sm:text-sm">Ver contenido</span>
                                                            <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {readings.length > 0 && (
                                <div>
                                    <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6 flex items-center gap-2">
                                        <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-[#3A5064]" />
                                        Lecturas
                                    </h3>
                                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                                        {readings.map((item) => {
                                            const Icon = getContentIcon(item.type);
                                            return (
                                                <div
                                                    key={item.id}
                                                    onClick={() => handleContentClick(item)}
                                                    className="group bg-white rounded-xl sm:rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer border border-gray-100"
                                                >
                                                    <div className="h-40 sm:h-48 relative">
                                                        {item.imageUrl ? (
                                                            <Image
                                                                src={item.imageUrl}
                                                                alt={item.title}
                                                                fill
                                                                className="object-cover transition-transform duration-300 group-hover:scale-105"
                                                            />
                                                        ) : (
                                                            <div className={`w-full h-full bg-gradient-to-br ${getContentColor(item.type)} flex items-center justify-center`}>
                                                                <Icon className="w-12 h-12 sm:w-16 sm:h-16 text-white/90" />
                                                            </div>
                                                        )}
                                                        <div className="absolute top-3 sm:top-4 left-3 sm:left-4 px-2.5 sm:px-3 py-1 sm:py-1.5 bg-black/20 backdrop-blur-sm rounded-full text-xs text-white flex items-center gap-1 sm:gap-1.5 font-medium z-10">
                                                            <Play className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                                            Haz clic para ver
                                                        </div>
                                                    </div>
                                                    <div className="p-4 sm:p-6">
                                                        <div className="text-xs sm:text-sm text-[#3A5064] font-semibold mb-2">{getContentTypeLabel(item.type)}</div>
                                                        <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-2 line-clamp-2">{item.title}</h3>
                                                        <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">{item.subject || 'General'}</p>
                                                        <div className="flex items-center text-[#3A5064] group-hover:text-[#2d3e50] transition-colors font-medium">
                                                            <span className="text-xs sm:text-sm">Ver contenido</span>
                                                            <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {demoContent.length === 0 && !loadingContent && (
                                <div className="text-center py-12">
                                    <p className="text-lg sm:text-xl text-gray-600">No hay contenido demo disponible en este momento.</p>
                                    <p className="text-sm sm:text-base text-gray-500 mt-2">¡Regístrate para acceder a todo nuestro contenido!</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </section >

            {/* CTA Section */}
            < section className="py-16 sm:py-20 lg:py-24 px-4 sm:px-6 lg:px-8" >
                <div className="container mx-auto max-w-4xl">
                    <div className="bg-[#3A5064] rounded-2xl sm:rounded-3xl p-8 sm:p-12 lg:p-16 text-center relative overflow-hidden shadow-2xl">
                        <div className="relative z-10">
                            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 sm:mb-6">
                                ¿Listo para comenzar tu preparación?
                            </h2>
                            <p className="text-base sm:text-lg lg:text-xl text-white/90 mb-6 sm:mb-8 max-w-2xl mx-auto">
                                Únete a miles de estudiantes que ya están preparándose para lograr su sueño de entrar a la UNAM
                            </p>
                            <Button
                                onClick={handleGetStarted}
                                size="lg"
                                className="bg-white text-[#3A5064] hover:bg-gray-50 text-base sm:text-lg px-8 sm:px-12 py-5 sm:py-6 rounded-xl shadow-lg hover:shadow-xl transition-all font-bold w-full sm:w-auto"
                            >
                                Crear Cuenta Gratis
                                <ArrowRight className="ml-2 w-4 h-4 sm:w-5 sm:h-5" />
                            </Button>
                            <p className="text-white/80 text-xs sm:text-sm mt-4 sm:mt-6">
                                No se requiere tarjeta de crédito • Acceso inmediato
                            </p>
                        </div>
                    </div>
                </div>
            </section >



            {/* Footer */}
            < footer className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 bg-gray-50 border-t border-gray-200" >
                <div className="container mx-auto max-w-7xl">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 sm:gap-12 mb-8 sm:mb-12">
                        <div className="col-span-2 md:col-span-1">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="p-0.5 bg-[#3A5064] rounded-lg sm:rounded-xl">
                                    <img src="/images/luni-logo.png" alt="Luni" className="w-7 h-7 sm:w-8 sm:h-8 object-contain rounded-md sm:rounded-lg bg-white" />
                                </div>
                                <span className="text-lg sm:text-xl font-bold text-[#3A5064]">Luni Site</span>
                            </div>
                            <p className="text-gray-600 text-xs sm:text-sm leading-relaxed">
                                Tu plataforma de confianza para prepararte para el examen de admisión UNAM
                            </p>
                        </div>
                        <div>
                            <h4 className="text-gray-900 font-bold mb-3 sm:mb-4 text-sm sm:text-base">Plataforma</h4>
                            <ul className="space-y-2 sm:space-y-3 text-gray-600 text-xs sm:text-sm">
                                <li><Link href="/register" className="hover:text-[#3A5064] transition-colors">Clases</Link></li>
                                <li><Link href="/register" className="hover:text-[#3A5064] transition-colors">Contenido</Link></li>
                                <li><Link href="/register" className="hover:text-[#3A5064] transition-colors">Quizzes</Link></li>
                                <li><Link href="/register" className="hover:text-[#3A5064] transition-colors">Novedades</Link></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="text-gray-900 font-bold mb-3 sm:mb-4 text-sm sm:text-base">Legal</h4>
                            <ul className="space-y-2 sm:space-y-3 text-gray-600 text-xs sm:text-sm">
                                <li><Link href="/terms" className="hover:text-[#3A5064] transition-colors">Términos y Condiciones</Link></li>
                                <li><Link href="/privacy" className="hover:text-[#3A5064] transition-colors">Privacidad</Link></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="text-gray-900 font-bold mb-3 sm:mb-4 text-sm sm:text-base">Contacto</h4>
                            <ul className="space-y-2 sm:space-y-3 text-gray-600 text-xs sm:text-sm">
                                <li>Email: contacto@luni-site.com</li>
                                <li>Soporte: soporte@luni-site.com</li>
                            </ul>
                        </div>
                    </div>
                    <div className="border-t border-gray-200 pt-6 sm:pt-8 text-center">
                        <p className="text-gray-600 text-xs sm:text-sm">© 2024 Luni Site. Todos los derechos reservados.</p>
                    </div>
                </div>
            </footer >

            {/* Content Modal */}
            <LandingContentModal
                item={selectedContent}
                onClose={() => setSelectedContent(null)}
            />

            {/* PWA Install Prompt */}
            <InstallPWAPrompt />
        </div >
    );
}
