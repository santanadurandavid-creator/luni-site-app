'use client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { getFirebaseServices } from '@/lib/firebase';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, getDocs } from 'firebase/firestore';
import { Calendar } from '@/components/ui/calendar';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bot, Check, Play, BookOpen, ArrowLeft, Loader2, Star, Trophy, RefreshCw, Crown, Sparkles, Pause, FileText } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { type StudyPlan } from '@/ai/flows/study-plan-flow';
import { createDailyContent, type DailyContent } from '@/ai/flows/daily-content-flow';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { usePlanGeneration } from '@/contexts/PlanGenerationContext';
import { RichContentRenderer } from '@/components/content/RichContentRenderer';
import { PremiumContentModal } from '@/components/profile/PremiumContentModal';


interface StudyPlanModalProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

type Step = 'intro' | 'setup_date' | 'setup_hours' | 'generating_plan' | 'dashboard' | 'daily_view';

export function StudyPlanModal({ isOpen, setIsOpen }: StudyPlanModalProps) {
  const { user, addStudyTime } = useAuth();
  const { toast } = useToast();
  const { isGenerating, progress, currentPlan: generatedPlan, startGeneration, clearPlan } = usePlanGeneration();
  const [step, setStep] = useState<Step>('intro');
  const [loading, setLoading] = useState(false);

  const [examDate, setExamDate] = useState<Date | undefined>(undefined);
  const [dailyHours, setDailyHours] = useState<number>(2);

  const [currentPlan, setCurrentPlan] = useState<StudyPlan | null>(null);
  const [completedDays, setCompletedDays] = useState<number[]>([]);
  const [planCreatedAt, setPlanCreatedAt] = useState<Date | null>(null);

  const [activeDay, setActiveDay] = useState<number | null>(null);
  const [dailyContent, setDailyContent] = useState<DailyContent | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [showQuizResults, setShowQuizResults] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isPlayingClass, setIsPlayingClass] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Study time tracking for active day
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (activeDay !== null && dailyContent && user) {
      timer = setInterval(() => {
        addStudyTime(1, dailyContent.topic || 'Plan de Estudio');
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [activeDay, dailyContent, user, addStudyTime]);
  const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);




  useEffect(() => {
    if (isOpen && user?.id) {
      // If generation is in progress when modal opens, show generating screen
      if (isGenerating) {
        setStep('generating_plan');
        return;
      }

      // If generation stopped but we're still on generating screen and no plan was created, go back to setup
      if (!isGenerating && step === 'generating_plan' && !generatedPlan) {
        setStep('setup_hours');
        return;
      }

      // If plan was just generated, show it
      if (generatedPlan && !currentPlan) {
        setCurrentPlan(generatedPlan);
        setStep('dashboard');
        return;
      }

      // Only load user plan if we're not in the middle of setup flow
      // (intro, setup_date, setup_hours, setup_upload are setup steps)
      const isInSetupFlow = ['setup_date', 'setup_hours'].includes(step);
      if (!isInSetupFlow && step === 'intro') {
        loadUserPlan();
      }
    }
  }, [isOpen, user?.id, isGenerating, generatedPlan, step]);

  const loadUserPlan = async () => {
    if (!user?.id) {
      setStep('intro');
      return;
    }
    setLoading(true);
    try {
      const { db } = getFirebaseServices();
      const planRef = doc(db, 'users', user.id, 'study_plan', 'current');
      const planDoc = await getDoc(planRef);

      if (planDoc.exists()) {
        const data = planDoc.data();
        setCurrentPlan(data.plan as StudyPlan);
        setCompletedDays(data.completedDays || []);
        setPlanCreatedAt(data.createdAt?.toDate ? data.createdAt.toDate() : new Date());
        setStep('dashboard');
      } else {
        setStep('intro');
      }
    } catch (error) {
      console.error('Error loading plan:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo cargar tu plan de estudio.' });
      setStep('intro');
    } finally {
      setLoading(false);
    }
  };

  const resetPlan = async () => {
    if (!user?.id) return;
    setShowResetConfirm(false);

    try {
      const { db } = getFirebaseServices();
      const planRef = doc(db, 'users', user.id, 'study_plan', 'current');

      // Delete all days in the subcollection first
      const daysCollectionRef = collection(db, 'users', user.id, 'study_plan', 'current', 'days');
      const daysSnapshot = await getDocs(daysCollectionRef);

      const deletePromises = daysSnapshot.docs.map(dayDoc => deleteDoc(dayDoc.ref));
      await Promise.all(deletePromises);

      // Delete the plan document
      await deleteDoc(planRef);

      // Clear context state
      clearPlan();

      // Clear local state
      setCurrentPlan(null);
      setCompletedDays([]);
      setPlanCreatedAt(null);
      setExamDate(undefined);
      setDailyHours(2);
      setActiveDay(null);
      setDailyContent(null);
      setStep('intro');

      toast({ title: 'Plan eliminado', description: 'Puedes crear un nuevo plan ahora.' });
    } catch (error) {
      console.error('Error:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo eliminar el plan.' });
    }
  };

  // Sync step with generation state
  useEffect(() => {
    if (isGenerating) {
      setStep('generating_plan');
    } else if (generatedPlan) {
      setCurrentPlan(generatedPlan);
      setStep('dashboard');
    }
  }, [isGenerating, generatedPlan]);

  const generatePlan = async () => {
    if (!user?.id) {
      toast({ variant: 'destructive', title: 'Error', description: 'No has iniciado sesión.' });
      return;
    }

    let fcmToken = undefined;
    try {
      // Request notification permission
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        const { getMessaging, getToken } = await import('firebase/messaging');
        const { getApp } = await import('firebase/app');

        // Ensure Firebase is initialized
        const app = getApp();
        const messaging = getMessaging(app);

        // Get VAPID key from env or config if needed, but usually works without if configured in firebase.json
        // For now, try getting token directly. 
        // Note: You might need a VAPID key here if not set in project config.
        // Assuming it works or fails gracefully.
        fcmToken = await getToken(messaging, {
          vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY
        });
      }
    } catch (error) {
      console.warn('Failed to get notification token:', error);
      // Continue without token
    }

    const userId = user.id;
    // Trigger generation via context (continues even if modal is closed)
    await startGeneration({
      dailyHours,
      examDate: examDate ? format(examDate, 'yyyy-MM-dd') : undefined,
      durationDays: examDate ? undefined : 30,
      userId,
      fcmToken
    });
    // UI will update via context effect
  };

  // UI for generating plan (uses context progress)
  const generatingUI = (
    <div className='flex flex-col items-center justify-center py-12 space-y-6 text-center'>
      <div className='relative'>
        <div className='absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse'></div>
        <Bot className='w-20 h-20 text-primary relative z-10' />
      </div>
      <div className='space-y-2'>
        <h3 className='text-2xl font-bold'>Creando tu Plan Maestro...</h3>
        <p className='text-muted-foreground'>Estoy analizando las guías oficiales, organizando temas y preparando quizzes.</p>
        <p className='text-sm text-muted-foreground'>El proceso sigue en segundo plano; puedes cerrar esta ventana y te avisaremos cuando esté listo.</p>
      </div>
      <div className='w-full max-w-md space-y-3'>
        <div className='flex items-center justify-between text-sm'>
          <span className='text-muted-foreground'>Progreso</span>
          <span className='font-bold text-primary'>{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className='h-3' />
      </div>
      <Button variant='ghost' onClick={() => setIsOpen(false)} className='mt-2'>Cerrar</Button>
      <Loader2 className='w-8 h-8 text-primary animate-spin' />
    </div>
  );

  // Replace inline generation UI usage later in render with {isGenerating && generatingUI}

  const startDay = async (day: number) => {
    if (!currentPlan || !user?.id) return;
    setActiveDay(day);
    setLoading(true);
    setDailyContent(null);
    setQuizAnswers({});
    setShowQuizResults(false);
    stopClassPlayback();
    setStep('daily_view'); // Show loading screen immediately

    try {
      const { db } = getFirebaseServices();
      const dayRef = doc(db, 'users', user.id, 'study_plan', 'current', 'days', day.toString());
      const dayDoc = await getDoc(dayRef);

      if (dayDoc.exists()) {
        setDailyContent(dayDoc.data() as DailyContent);
        setLoading(false);
        return;
      }

      const dayTopic = currentPlan.syllabus.find(d => d.day === day);
      if (!dayTopic) throw new Error('Day not found');

      // Generate content in background
      const content = await createDailyContent({
        day,
        topic: dayTopic.topic,
        description: dayTopic.description,
        keyPoints: dayTopic.keyPoints
      });

      await setDoc(dayRef, content);

      setDailyContent(content);
    } catch (error) {
      console.error('Error:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo cargar el contenido del día.' });
      setActiveDay(null);
      setStep('dashboard'); // Go back to dashboard on error
    } finally {
      setLoading(false);
    }
  };

  const completeDay = async () => {
    if (!user?.id || !activeDay) return;

    try {
      const newCompleted = [...completedDays, activeDay];
      setCompletedDays(newCompleted);

      const { db } = getFirebaseServices();
      const planRef = doc(db, 'users', user.id, 'study_plan', 'current');
      await updateDoc(planRef, {
        completedDays: newCompleted
      });

      setStep('dashboard');
      toast({ title: '¡Día Completado!', description: 'Has avanzado en tu plan de estudio.' });
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const stopClassPlayback = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsPlayingClass(false);
  };


  const handlePlayClass = () => {
    const audioUrl = (dailyContent as any)?.audioUrl;
    if (!audioUrl) return;

    if (!audioRef.current) {
      const audio = new Audio(audioUrl);
      audio.onended = () => setIsPlayingClass(false);
      audio.onerror = () => {
        setIsPlayingClass(false);
        console.error("Error playing study plan audio");
      };
      audioRef.current = audio;
    }

    if (isPlayingClass) {
      audioRef.current.pause();
      setIsPlayingClass(false);
    } else {
      audioRef.current.play();
      setIsPlayingClass(true);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className='w-[95vw] md:w-[90vw] sm:max-w-[800px] md:max-w-5xl h-[85vh] flex flex-col p-0 gap-0 overflow-hidden rounded-lg sm:rounded-xl'>
        <DialogHeader className='px-6 py-4 border-b shrink-0'>
          <DialogTitle className='flex items-center gap-2'>
            <Bot className='w-5 h-5 text-primary' />
            Plan de Estudio AI
          </DialogTitle>
          <DialogDescription>
            {step === 'dashboard' ? 'Tu ruta personalizada al éxito.' : 'Configura tu asistente personal.'}
          </DialogDescription>
        </DialogHeader>

        <div className='flex-1 overflow-hidden p-6 bg-muted/5'>
          {step === 'intro' && (
            <div className='flex flex-col items-center text-center space-y-6 py-8'>
              <div className='bg-primary/10 p-6 rounded-full'>
                <Bot className='w-16 h-16 text-primary' />
              </div>
              <div className='space-y-2'>
                <h3 className='text-2xl font-bold'>¡Crea tu Plan de Estudio Personalizado!</h3>
                <p className='text-muted-foreground max-w-md mx-auto'>
                  Genera un plan de estudio perfecto adaptado a tus necesidades y objetivos.
                </p>
              </div>
              <Button onClick={() => setStep('setup_date')} size='lg' className='w-full max-w-xs'>
                Comenzar <Play className='w-4 h-4 ml-2' />
              </Button>
            </div>
          )}

          {step === 'setup_date' && (
            <div className='space-y-6'>
              <div className='text-center space-y-2'>
                <h3 className='text-xl font-semibold'>¿Cuándo es tu examen?</h3>
                <p className='text-sm text-muted-foreground'>Esto me ayudará a distribuir los temas.</p>
              </div>
              <div className='flex justify-center'>
                <Calendar
                  mode='single'
                  selected={examDate}
                  onSelect={setExamDate}
                  className='rounded-md border shadow'
                  locale={es}
                  disabled={(date) => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const maxDate = addDays(today, 60);
                    return date < today || date > maxDate;
                  }}
                />
              </div>
              <div className='flex justify-between'>
                <Button variant='ghost' onClick={() => setStep('intro')}>Atrás</Button>
                <Button onClick={() => setStep('setup_hours')} disabled={!examDate}>Siguiente</Button>
              </div>
            </div>
          )}

          {step === 'setup_hours' && (
            <div className='space-y-8 py-4'>
              <div className='text-center space-y-2'>
                <h3 className='text-xl font-semibold'>¿Cuántas horas estudiarás al día?</h3>
              </div>
              <div className='px-8 space-y-6'>
                <div className='flex justify-center items-end gap-2'>
                  <span className='text-6xl font-bold text-primary'>{dailyHours}</span>
                  <span className='text-xl text-muted-foreground mb-2'>horas</span>
                </div>
                <Slider
                  value={[dailyHours]}
                  onValueChange={(val) => setDailyHours(val[0])}
                  min={1}
                  max={8}
                  step={0.5}
                  className='w-full'
                />
              </div>
              <div className='flex justify-between'>
                <Button variant='ghost' onClick={() => setStep('setup_date')}>Atrás</Button>
                <Button onClick={generatePlan} disabled={loading} className='w-32'>
                  {loading ? <Loader2 className='w-4 h-4 animate-spin' /> : 'Generar Plan'}
                </Button>
              </div>
            </div>
          )}

          {step === 'generating_plan' && (
            <div className='flex flex-col items-center justify-center py-12 space-y-6 text-center'>
              <div className='relative'>
                <div className='absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse'></div>
                <Bot className='w-20 h-20 text-primary relative z-10' />
              </div>
              <div className='space-y-2'>
                <h3 className='text-2xl font-bold'>Creando tu Plan Maestro...</h3>
                <p className='text-muted-foreground'>Estoy leyendo tu guía, organizando temas y preparando quizzes.</p>
              </div>
              <div className='w-full max-w-md space-y-3'>
                <div className='flex items-center justify-between text-sm'>
                  <span className='text-muted-foreground'>Progreso</span>
                  <span className='font-bold text-primary'>{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className='h-3' />
              </div>
              <Loader2 className='w-8 h-8 text-primary animate-spin' />
            </div>
          )}

          {step === 'dashboard' && currentPlan && (
            <div className='space-y-6 h-full flex flex-col'>
              <div className='flex items-start justify-between gap-3'>
                <div className='flex-1'>
                  <h3 className='text-xl sm:text-2xl font-bold'>Tu Plan de Estudio</h3>
                  <p className='text-xs sm:text-sm text-muted-foreground'>{completedDays.length} de {currentPlan.totalDays} días completados</p>
                </div>
                <div className='flex flex-col items-end gap-2'>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => {
                      const isFinished = currentPlan && completedDays.length === currentPlan.totalDays;
                      if (!isFinished) {
                        toast({
                          variant: 'destructive',
                          title: 'Plan en curso',
                          description: 'Debes completar tu plan actual al 100% antes de poder generar uno nuevo.'
                        });
                        return;
                      }

                      const now = Date.now();
                      const monthMs = 30 * 24 * 60 * 60 * 1000;
                      let generations = user?.planGenerationsCount ?? 0;
                      const lastReset = user?.lastPlanGenerationReset?.toDate ? user.lastPlanGenerationReset.toDate() : user?.lastPlanGenerationReset;
                      if (lastReset && now - lastReset.getTime() > monthMs) {
                        generations = 0;
                      }
                      if (generations >= 5) {
                        toast({
                          variant: 'destructive',
                          title: 'Límite alcanzado',
                          description: 'Has alcanzado el máximo de 5 planes de estudio este mes.'
                        });
                        return;
                      }
                      setShowResetConfirm(true);
                    }}
                    className='h-8 px-3'
                  >
                    <RefreshCw className='w-4 h-4 mr-1.5' />
                    <span className='text-xs'>Nuevo Plan</span>
                  </Button>
                  <div className='flex items-center gap-2'>
                    <div className='text-xs sm:text-sm font-medium text-primary'>{Math.round((completedDays.length / currentPlan.totalDays) * 100)}%</div>
                    <Progress value={(completedDays.length / currentPlan.totalDays) * 100} className='w-16 sm:w-24 h-2' />
                  </div>
                </div>
              </div>

              <ScrollArea className='flex-1 pr-4 -mr-4'>
                <div className='space-y-3'>
                  {currentPlan.syllabus.map((day) => {
                    const isCompleted = completedDays.includes(day.day);
                    const isLocked = !isCompleted && day.day > (completedDays.length > 0 ? Math.max(...completedDays) + 1 : 1);
                    const premiumUntilDate = user?.premiumUntil ? (user.premiumUntil.toDate ? user.premiumUntil.toDate() : new Date(user.premiumUntil)) : null;
                    const isPremium = premiumUntilDate && premiumUntilDate > new Date();
                    const requiresPremium = day.day > 1 && !isPremium;
                    const isNext = !isCompleted && !isLocked && !requiresPremium;

                    return (
                      <Card
                        key={day.day}
                        className={cn(
                          'transition-all duration-200 border-l-4',
                          isCompleted ? 'border-l-green-500 bg-green-500/5' :
                            isNext ? 'border-l-primary shadow-md scale-[1.01]' : 'border-l-muted opacity-70'
                        )}
                      >
                        <CardContent className='p-4 flex items-center justify-between'>
                          <div className='space-y-1'>
                            <div className='flex items-center gap-2'>
                              <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full', isCompleted ? 'bg-green-100 text-green-700' : 'bg-primary/10 text-primary')}>
                                Día {day.day}
                              </span>
                              <h4 className='font-semibold'>{day.topic}</h4>
                            </div>
                            <p className='text-sm text-muted-foreground line-clamp-1'>{day.description}</p>
                          </div>

                          {isCompleted ? (
                            <div className='flex items-center gap-3'>
                              <div className='h-8 w-8 rounded-full bg-green-500/20 flex items-center justify-center shrink-0'>
                                <Check className='w-4 h-4 text-green-600' />
                              </div>
                              <Button
                                size='sm'
                                variant='outline'
                                onClick={() => startDay(day.day)}
                                className='h-8 bg-green-50/50 hover:bg-green-100 border-green-200 text-green-700 font-medium'
                              >
                                <RefreshCw className='w-3 h-3 mr-1.5' />
                                Repasar
                              </Button>
                            </div>
                          ) : requiresPremium ? (
                            <Button
                              size='sm'
                              onClick={() => setIsPremiumModalOpen(true)}
                              variant='outline'
                              className='gap-1'
                            >
                              <Crown className='w-3 h-3' />
                              Premium
                            </Button>
                          ) : (
                            <Button
                              size='sm'
                              disabled={isLocked}
                              onClick={() => startDay(day.day)}
                              variant={isNext ? 'default' : 'outline'}
                            >
                              {isNext ? 'Comenzar' : 'Bloqueado'}
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          )}

          {step === 'daily_view' && (
            loading ? (
              <div className='flex flex-col items-center justify-center h-full space-y-6 text-center'>
                <div className='relative'>
                  <div className='absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse'></div>
                  <BookOpen className='w-16 h-16 text-primary relative z-10 animate-pulse' />
                </div>
                <div className='space-y-2'>
                  <h3 className='text-2xl font-bold'>Generando contenido...</h3>
                  <p className='text-muted-foreground max-w-md'>
                    Estoy creando el contenido de estudio para este día. Esto puede tomar unos momentos.
                  </p>
                  <p className='text-sm text-muted-foreground'>
                    Puedes cerrar esta ventana y volver más tarde. El contenido seguirá generándose.
                  </p>
                </div>
                <Loader2 className='w-10 h-10 text-primary animate-spin' />
                <Button variant='outline' onClick={() => setIsOpen(false)} className='mt-4'>
                  Cerrar y continuar después
                </Button>
              </div>
            ) : dailyContent ? (
              <div className='h-full flex flex-col space-y-4'>
                <div className='flex items-center gap-2 pb-2 border-b'>
                  <Button variant='ghost' size='icon' onClick={() => setStep('dashboard')} className="h-8 w-8 sm:h-10 sm:w-10">
                    <ArrowLeft className='w-4 h-4' />
                  </Button>
                  <div>
                    <h3 className='font-bold text-base sm:text-lg'>Día {dailyContent.day}: {dailyContent.topic}</h3>
                  </div>
                  <div className="flex-1" />
                  <div className="flex items-center gap-1">
                    {(dailyContent as any).audioUrl && (
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handlePlayClass}
                          className="bg-green-500/10 border-green-500/20 hover:bg-green-500/20 text-green-600 rounded-full h-8 gap-2"
                        >
                          {isPlayingClass ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                          {isPlayingClass ? 'Pausar Clase' : 'Escuchar Clase'}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                <ScrollArea className='flex-1 pr-1 sm:pr-4'>
                  <div className='space-y-6 sm:space-y-8 pb-8 px-2 sm:px-0'>
                    {/* Rich Content (Legacy HTML or Modern Blocks) */}
                    <RichContentRenderer
                      blocks={dailyContent.blocks}
                      blocksJson={dailyContent.blocksJson}
                      isLoading={loading}
                    />

                    <section className='space-y-4 pt-4 border-t'>
                      <h4 className='text-xl font-semibold text-primary flex items-center gap-2'>
                        <Trophy className='w-5 h-5' /> Quiz Rápido
                      </h4>
                      <div className='space-y-6'>
                        {dailyContent.quiz.questions.map((q, qIndex) => (
                          <Card key={qIndex}>
                            <CardHeader className='pb-2'>
                              <CardTitle className='text-base'>{qIndex + 1}. {q.question}</CardTitle>
                            </CardHeader>
                            <CardContent className='space-y-2'>
                              {q.options.map((opt, optIndex) => {
                                const isSelected = quizAnswers[qIndex] === optIndex;
                                const isCorrect = q.correctAnswer === optIndex;
                                const showCorrectness = showQuizResults;

                                let btnClass = 'justify-start h-auto py-3 px-4 text-left whitespace-normal';
                                if (showCorrectness) {
                                  if (isCorrect) btnClass += ' bg-green-500/20 hover:bg-green-500/30 border-green-500 text-green-700 dark:text-green-300';
                                  else if (isSelected && !isCorrect) btnClass += ' bg-red-500/20 hover:bg-red-500/30 border-red-500 text-red-700 dark:text-red-300';
                                } else if (isSelected) {
                                  btnClass += ' border-primary bg-primary/10 text-primary';
                                }

                                return (
                                  <Button
                                    key={optIndex}
                                    variant='outline'
                                    className={cn('w-full', btnClass)}
                                    onClick={() => !showQuizResults && setQuizAnswers(prev => ({ ...prev, [qIndex]: optIndex }))}
                                  >
                                    <span className='mr-2 font-bold'>{String.fromCharCode(65 + optIndex)}.</span> {opt}
                                  </Button>
                                );
                              })}
                              {showQuizResults && (
                                <div className='text-sm text-muted-foreground mt-2 bg-muted p-2 rounded'>
                                  <strong>Explicación:</strong> {q.explanation}
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>

                      {!showQuizResults ? (
                        <Button
                          className='w-full'
                          onClick={() => setShowQuizResults(true)}
                          disabled={Object.keys(quizAnswers).length < dailyContent.quiz.questions.length}
                        >
                          Verificar Respuestas
                        </Button>
                      ) : (
                        <Button className='w-full' size='lg' onClick={completeDay}>
                          ¡Terminar Día! <Star className='w-4 h-4 ml-2 fill-current' />
                        </Button>
                      )}
                    </section>

                    {/* Banner Ad removed as per user request */}
                    <div className='pt-8 mt-12 border-t'>
                      {/* Content specific ads are handled by the content itself */}
                    </div>
                  </div>
                </ScrollArea>
              </div>
            ) : (
              <div>Error al cargar contenido.</div>
            )
          )}
        </div>

        {/* Confirm Reset Dialog */}
        <Dialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
          <DialogContent className="w-[90vw] max-w-md rounded-xl">
            <DialogHeader>
              <DialogTitle>¿Crear un nuevo plan?</DialogTitle>
              <DialogDescription className="space-y-2 pt-2">
                <p>Esta acción eliminará tu plan actual y todo tu progreso.</p>
                <p className="text-xs text-amber-600 dark:text-amber-500 font-medium">
                  ⚠️ Solo puedes generar 5 planes por mes. Después de eso, deberás esperar hasta el próximo mes.
                </p>
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowResetConfirm(false)} className="w-full sm:w-auto">
                Cancelar
              </Button>
              <Button variant="destructive" onClick={resetPlan} className="w-full sm:w-auto">
                Crear Nuevo Plan
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Premium Content Modal */}
        <PremiumContentModal
          isOpen={isPremiumModalOpen}
          setIsOpen={setIsPremiumModalOpen}
          onConfirm={() => setIsPremiumModalOpen(false)}
        />

      </DialogContent>
    </Dialog>
  );
}
