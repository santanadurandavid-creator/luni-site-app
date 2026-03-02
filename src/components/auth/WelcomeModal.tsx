'use client';

import React, { useState, useEffect, useCallback } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { TermsAndPrivacyModal } from './TermsAndPrivacyModal';
import { Sparkles, FileQuestion, Video, ClipboardCheck, BarChart, Ticket, ArrowRight, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { Logo } from '../layout/Logo';
import { getFirebaseServices } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import type { Setting } from '@/lib/types';

interface WelcomeModalProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

const features = [
    {
        icon: FileQuestion,
        title: 'Simuladores de Examen',
        description: 'Practica con exámenes que imitan la estructura y el tiempo del examen real.',
    },
    {
        icon: Video,
        title: 'Contenido en Video',
        description: 'Aprende y repasa temas clave con nuestra extensa videoteca.',
    },
    {
        icon: ClipboardCheck,
        title: 'Quizzes Interactivos',
        description: 'Pon a prueba tus conocimientos con quizzes rápidos y desafiantes.',
    },
    {
        icon: BarChart,
        title: 'Seguimiento de Progreso',
        description: 'Visualiza tus resultados y el tiempo de estudio para enfocar tus esfuerzos.',
    },
    {
        icon: Trophy,
        title: 'Ranking y Premios',
        description: '¡Los mejores resultados en el menor tiempo ganan premios como tablets, celulares, laptops y tarjetas de regalo!',
    },
];

export function WelcomeModal({ isOpen, setIsOpen }: WelcomeModalProps) {
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showWelcomeText, setShowWelcomeText] = useState(false);
  const [settings, setSettings] = useState<Setting>({} as Setting);

  useEffect(() => {
    const { db } = getFirebaseServices();
    const settingsRef = doc(db, 'settings', 'theme');
    const unsubscribe = onSnapshot(settingsRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data() as Setting;
        setSettings(data);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (isOpen) {
        const timer = setTimeout(() => {
            setShowWelcomeText(true);
        }, 500); // 0.5 second delay
        return () => clearTimeout(timer);
    } else {
        setShowWelcomeText(false);
    }
  }, [isOpen]);


  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);
  
  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi, setSelectedIndex]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);
  }, [emblaApi, onSelect]);

  const handleStart = () => {
    if (termsAccepted) {
      setIsOpen(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => {
          if (!open && termsAccepted) {
            setIsOpen(false);
          }
      }}>
        <DialogContent 
            className="w-screen h-screen max-w-full rounded-none p-0 flex flex-col max-h-screen border-0"
            onInteractOutside={(e) => e.preventDefault()}
            showCloseButton={false}
        >
            {settings.welcomeModalImageUrl && (
                <Image
                    src={settings.welcomeModalImageUrl}
                    alt="Fondo de bienvenida"
                    layout="fill"
                    objectFit="cover"
                    className="z-0"
                    data-ai-hint="university campus"
                    priority
                />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20 z-10" />
          
            <div className="overflow-hidden flex-grow relative z-20" ref={emblaRef}>
                <div className="flex h-full">
                    {/* Slide 1: Welcome */}
                    <div className="flex-[0_0_100%] min-w-0 h-full flex flex-col justify-center items-center p-8 text-center text-primary-foreground">
                        <div className={cn(
                            "transition-all duration-1000 ease-out",
                            showWelcomeText ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                        )}>
                             <DialogHeader>
                                <DialogTitle className="flex flex-col items-center justify-center gap-4 text-white/90 mb-4">
                                  <span className="text-4xl font-normal">Bienvenido a</span>
                                  <Logo size="large" />
                                </DialogTitle>
                                <DialogDescription className="text-primary-foreground/80 mt-2 max-w-lg text-lg">
                                    {settings.welcomeModalText || "Bienvenido a Luni Site"}
                                </DialogDescription>
                            </DialogHeader>
                        </div>
                    </div>

                    {/* Slide 2: Features */}
                    <div className="flex-[0_0_100%] min-w-0 h-full flex flex-col items-center justify-center p-4 sm:p-8">
                        <div className="w-full max-w-2xl mx-auto flex flex-col glassmorphism-bg rounded-2xl p-6 sm:p-8 max-h-[85vh]">
                             <h2 className="text-3xl font-bold font-headline text-center mb-6 flex-shrink-0 text-white">¿Qué es Luni Site?</h2>
                             <div className="flex-grow overflow-y-auto pr-4 -mr-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 text-white">
                                    {features.map((feature, index) => (
                                        <div key={index} className="flex items-start gap-4">
                                            <div className="flex-shrink-0 bg-white/10 text-white p-3 rounded-full">
                                            <feature.icon className="h-6 w-6" />
                                            </div>
                                            <div>
                                                <h3 className="font-semibold">{feature.title}</h3>
                                                <p className="text-sm text-white/80">{feature.description}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                             </div>
                        </div>
                    </div>
                    
                    {/* Slide 3: Terms */}
                     <div className="flex-[0_0_100%] min-w-0 h-full flex flex-col p-8 justify-center items-center text-center text-white">
                        <Sparkles className="h-16 w-16 text-white mb-4" />
                        <h2 className="text-3xl font-bold font-headline">¡Estás listo para empezar!</h2>
                        <p className="text-white/80 mt-2 max-w-md">Solo un último paso. Por favor, lee y acepta nuestros términos y condiciones para continuar.</p>
                        <div className="flex items-center space-x-2 mt-8 glassmorphism-bg p-4 rounded-xl">
                            <Checkbox id="terms" checked={termsAccepted} onCheckedChange={(checked) => setTermsAccepted(checked as boolean)} className="border-white/50 text-white data-[state=checked]:bg-white data-[state=checked]:text-primary" />
                            <Label htmlFor="terms" className="text-sm text-white/80">
                                He leído y acepto los{' '}
                                <button
                                type="button"
                                onClick={() => setIsTermsModalOpen(true)}
                                className="text-white hover:underline font-semibold"
                                >
                                Términos y Condiciones
                                </button>
                                .
                            </Label>
                        </div>
                    </div>
                </div>
            </div>

            <div className="relative z-20 p-6 flex justify-between items-center flex-shrink-0">
                <div className="flex gap-2">
                    {Array.from({ length: 3 }).map((_, index) => (
                        <button
                            key={index}
                            className={cn(
                                'h-2 w-2 rounded-full transition-all',
                                index === selectedIndex ? 'w-6 bg-white' : 'bg-white/50'
                            )}
                            onClick={() => emblaApi?.scrollTo(index)}
                        />
                    ))}
                </div>

                {selectedIndex < 2 ? (
                    <Button onClick={scrollNext} variant="secondary" size="icon" className="rounded-full">
                        <ArrowRight className="h-4 w-4" />
                    </Button>
                ) : (
                    <Button onClick={handleStart} disabled={!termsAccepted} variant="secondary">
                        Comenzar
                    </Button>
                )}
            </div>

        </DialogContent>
      </Dialog>
      <TermsAndPrivacyModal isOpen={isTermsModalOpen} setIsOpen={setIsTermsModalOpen} />
    </>
  );
}
