
'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '../ui/button';
import { BarChart3, Rocket, Star, History, Shield, PlayCircle, Clock, FileText, Edit, RefreshCw, Calendar, ZapOff } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { getFirebaseServices } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import type { Setting } from '@/lib/types';
import { Skeleton } from '../ui/skeleton';
import Image from 'next/image';
import { cn, safeToDate } from '@/lib/utils';
import { DynamicDiagnosticExamModal } from '../shared/dynamic';
import { StudyPlanModal } from './StudyPlanModal';
import { isFuture, intervalToDuration, addDays, differenceInDays } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
import { ChallengesModal } from './ChallengesModal';
import { useSearchParams } from 'next/navigation';

const formatRemainingTime = (endDate: Date) => {
  const now = new Date();
  if (now > endDate) {
    return "Expirado";
  }
  const duration = intervalToDuration({ start: now, end: endDate });
  return `${duration.days || 0}d ${duration.hours || 0}h ${duration.minutes || 0}m`;
};






export function ProfileHeaderCard({
  onOpenRankingModal,
  onOpenVideoModal,
  onOpenPurchaseModal
}: {
  onOpenRankingModal: () => void;
  onOpenVideoModal: () => void;
  onOpenPurchaseModal: () => void;
}) {
  const { user, updateUser } = useAuth();
  const { toast } = useToast();
  const [settings, setSettings] = useState<Setting | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDiagnosticModalOpen, setIsDiagnosticModalOpen] = useState(false);
  const [isStudyPlanModalOpen, setIsStudyPlanModalOpen] = useState(false);
  const [isExamDateModalOpen, setIsExamDateModalOpen] = useState(false);
  const [isExamCountdownModalOpen, setIsExamCountdownModalOpen] = useState(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [isRetosModalOpen, setIsRetosModalOpen] = useState(false);
  const [retosInitialTab, setRetosInitialTab] = useState<string>('retos');
  const [remainingTime, setRemainingTime] = useState<string>('');
  const [examCountdown, setExamCountdown] = useState<string>('');
  const [isGeneratingId, setIsGeneratingId] = useState(false);

  const handleGenerateId = async () => {
    if (!user || user.referralId) return;
    setIsGeneratingId(true);
    try {
      // Simple random 8-digit ID
      const generatedId = Math.floor(10000000 + Math.random() * 90000000).toString();
      await updateUser({ referralId: generatedId });
      toast({ title: 'ID de Referido Generado', description: `Tu nuevo ID es: ${generatedId}` });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo generar el ID de referido.' });
    } finally {
      setIsGeneratingId(false);
    }
  };

  useEffect(() => {
    const { db } = getFirebaseServices();
    const settingsRef = doc(db, 'settings', 'theme');
    const unsubscribe = onSnapshot(settingsRef, (doc) => {
      if (doc.exists()) {
        setSettings(doc.data() as Setting);
      } else {
        setSettings(null); // No settings found, use default
      }
      setIsLoading(false);
    }, () => setIsLoading(false));

    return () => unsubscribe();
  }, []);

  const premiumUntilDate = safeToDate(user?.premiumUntil);
  const isUserPremium = premiumUntilDate && isFuture(premiumUntilDate);
  const isPermanentPremium = premiumUntilDate && premiumUntilDate > addDays(new Date(), 365 * 90); // Heuristic for "permanent"

  useEffect(() => {
    if (isUserPremium && premiumUntilDate && !isPermanentPremium) {
      const updateTimer = () => {
        setRemainingTime(formatRemainingTime(premiumUntilDate));
      };
      updateTimer();
      const intervalId = setInterval(updateTimer, 60000); // Update every minute
      return () => clearInterval(intervalId);
    }
  }, [isUserPremium, premiumUntilDate, isPermanentPremium]);

  // Handle URL params to open modal
  const searchParams = useSearchParams();
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'retos') {
      setRetosInitialTab('retos');
      setIsRetosModalOpen(true);
    }
  }, [searchParams]);

  // Listen for custom event from in-app notifications
  useEffect(() => {
    const handleOpenChallengesModal = (event: CustomEvent) => {
      console.log('[ProfileHeaderCard] Opening challenges modal from custom event', event.detail);
      setRetosInitialTab(event.detail?.tab || 'retos');
      setIsRetosModalOpen(true);
    };

    window.addEventListener('openChallengesModal', handleOpenChallengesModal as EventListener);

    return () => {
      window.removeEventListener('openChallengesModal', handleOpenChallengesModal as EventListener);
    };
  }, []);

  // Listen for messages from service worker (push notifications)
  useEffect(() => {
    const handleServiceWorkerMessage = (event: MessageEvent) => {
      console.log('[ProfileHeaderCard] Received message from service worker', event.data);
      if (event.data && event.data.type === 'OPEN_CHALLENGES_MODAL') {
        setRetosInitialTab(event.data?.tab || 'retos');
        setIsRetosModalOpen(true);
      }
    };

    navigator.serviceWorker?.addEventListener('message', handleServiceWorkerMessage);

    return () => {
      navigator.serviceWorker?.removeEventListener('message', handleServiceWorkerMessage);
    };
  }, []);






  if (!user) return null;

  if (isLoading) {
    return <Skeleton className="h-48 w-full" />
  }

  const backgroundValue = settings?.profileHeaderBackground;
  const isImage = backgroundValue?.startsWith('http') ?? false;
  const backgroundStyle: React.CSSProperties = {};

  if (backgroundValue && !isImage) {
    backgroundStyle.backgroundColor = backgroundValue;
  }

  const cardClasses = cn(
    "overflow-hidden border-0 shadow-xl text-primary-foreground relative transform hover:scale-[1.02] transition-all duration-300",
    !backgroundValue && "bg-gradient-to-br from-primary/90 via-primary/80 to-primary/70"
  );

  const overlayOpacity = settings?.profileHeaderImageOpacity ?? 0.4;
  const overlayStyle: React.CSSProperties = {
    backgroundColor: `rgba(0, 0, 0, ${overlayOpacity})`,
    backdropFilter: 'blur(1px)'
  };

  const userIsAdminOrSupport = user.isAdmin || user.role === 'support' || user.role === 'supervisor_support';

  return (
    <>
      <Card className={cardClasses} style={backgroundStyle}>
        {isImage && backgroundValue && (
          <>
            <Image src={backgroundValue} alt="Profile background" layout="fill" objectFit="cover" className="z-0" />
            <div className="absolute inset-0 z-10" style={overlayStyle} />
          </>
        )}
        <CardContent className="pt-8 pb-6 px-6 relative z-20">
          <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-8">
            <Avatar className="h-32 w-32 ring-4 ring-offset-4 ring-offset-background ring-primary-foreground/30 hover:ring-primary-foreground/50 transition-all duration-300 shadow-2xl">
              <AvatarImage src={user.avatar} alt={user.name} data-ai-hint="profile avatar" className="object-cover" />
              <AvatarFallback className="text-2xl font-bold bg-primary/20 text-primary-foreground">{user.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="flex-grow space-y-4 min-w-0">
              <div>
                <p className="text-primary-foreground/80 text-lg">¡Hola de nuevo!</p>
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <h2 className="text-3xl font-bold font-headline">{user.name}</h2>
                  {userIsAdminOrSupport && (
                    <div className="p-1 bg-red-400/20 rounded-full">
                      <Shield className="h-5 w-5 text-red-400 fill-red-400" />
                    </div>
                  )}
                  {isUserPremium && !userIsAdminOrSupport && (
                    <button
                      onClick={() => {
                        const daysLeft = premiumUntilDate ? differenceInDays(premiumUntilDate, new Date()) : 0;
                        window.dispatchEvent(new CustomEvent('openPremiumActivationModal', {
                          detail: {
                            days: daysLeft > 0 ? daysLeft : 0,
                            tokens: user.examTokens || 0
                          }
                        }));
                      }}
                      className="p-1.5 bg-amber-400/20 rounded-full hover:bg-amber-400/30 transition-colors cursor-pointer border-none"
                      title="Ver beneficios premium"
                    >
                      <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
                    </button>
                  )}
                </div>
                {isUserPremium && !userIsAdminOrSupport && (
                  <div className="mt-2 text-xs text-amber-200 bg-black/20 inline-flex items-center gap-1.5 px-2 py-1 rounded-full">
                    <Clock className="h-3 w-3" />
                    Tiempo Premium restante:
                    <span className="font-semibold">{isPermanentPremium ? 'Permanente' : remainingTime}</span>
                  </div>
                )}
                {user.referralId && (
                  <div className="mt-1 flex items-center justify-center sm:justify-start gap-1">
                    <p className="text-xs text-primary-foreground/80">ID de Referido: {user.referralId}</p>
                  </div>
                )}
                {!user.referralId && (
                  <Button variant="ghost" size="sm" className="h-auto p-1 mt-1 text-primary-foreground/70 hover:text-primary-foreground" onClick={handleGenerateId} disabled={isGeneratingId}>
                    <RefreshCw className={cn("h-3 w-3 mr-1.5", isGeneratingId && "animate-spin")} />
                    <span className="text-xs">Generar ID de Referido</span>
                  </Button>
                )}
                {user.examType && !userIsAdminOrSupport && (
                  <div className="mt-1 flex flex-col sm:flex-row sm:items-center sm:gap-1">
                    <p className="text-primary-foreground/80 text-sm">
                      Estás practicando para:
                    </p>
                    <p className="text-primary-foreground/80 text-sm font-semibold break-words max-w-full overflow-hidden" style={{ wordBreak: 'break-word', whiteSpace: 'normal' }}>
                      {user.examType}
                    </p>
                  </div>
                )}
                {userIsAdminOrSupport && (
                  <p className="text-primary-foreground/80 text-sm mt-1 capitalize">
                    Rol: <strong>{user.role?.replace('_', ' ') || 'Admin'}</strong>
                  </p>
                )}
              </div>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
                <Button
                  onClick={onOpenRankingModal}
                  size="sm"
                  variant="secondary"
                  className="w-auto bg-white/10 hover:bg-white/20 border-white/20 text-primary-foreground backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
                >
                  <BarChart3 className="h-4 w-4 md:mr-2" />
                  <span className="hidden md:inline font-medium">Ranking</span>
                </Button>
                <Button
                  onClick={onOpenVideoModal}
                  size="sm"
                  variant="secondary"
                  className="w-auto bg-white/10 hover:bg-white/20 border-white/20 text-primary-foreground backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
                >
                  <PlayCircle className="h-4 w-4 md:mr-2" />
                  <span className="hidden md:inline font-medium">Video Tutorial</span>
                </Button>
                <Button
                  onClick={() => setIsDiagnosticModalOpen(true)}
                  size="sm"
                  variant="secondary"
                  className="w-auto bg-green-500/20 hover:bg-green-500/30 border-green-500/30 text-green-100 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
                >
                  <FileText className="h-4 w-4 md:mr-2" />
                  <span className="hidden md:inline font-medium">Examen Diagnóstico</span>
                </Button>

                <Button
                  onClick={() => setIsStudyPlanModalOpen(true)}
                  size="sm"
                  variant="secondary"
                  className="w-auto bg-blue-500/20 hover:bg-blue-500/30 border-blue-500/30 text-blue-100 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
                >
                  <Calendar className="h-4 w-4 md:mr-2" />
                  <span className="hidden md:inline font-medium">Plan de Estudio</span>
                </Button>

                <Button
                  onClick={() => setIsRetosModalOpen(true)}
                  size="sm"
                  variant="secondary"
                  className="w-auto bg-purple-500/20 hover:bg-purple-500/30 border-purple-500/30 text-purple-100 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
                >
                  <Rocket className="h-4 w-4 md:mr-2" />
                  <span className="hidden md:inline font-medium">Retos</span>
                </Button>

                {!isUserPremium && !user?.examDate && (
                  <Button
                    onClick={onOpenPurchaseModal}
                    size="sm"
                    className="bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 animate-pulse border-0"
                  >
                    <Star className="h-4 w-4 md:mr-2 fill-current" />
                    <span className="hidden md:inline font-semibold">Hazte Premium</span>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      <DynamicDiagnosticExamModal
        isOpen={isDiagnosticModalOpen}
        setIsOpen={setIsDiagnosticModalOpen}
      />
      <StudyPlanModal
        isOpen={isStudyPlanModalOpen}
        setIsOpen={setIsStudyPlanModalOpen}
      />
      <ChallengesModal
        isOpen={isRetosModalOpen}
        setIsOpen={setIsRetosModalOpen}
        initialTab={retosInitialTab}
      />
    </>
  );
}
