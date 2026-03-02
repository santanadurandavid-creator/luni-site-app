
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';
import { Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { useToast } from '@/hooks/use-toast';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { getFirebaseServices } from '@/lib/firebase';
import { useEffect, useMemo, useState } from 'react';
import type { Exam } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Skeleton } from '../ui/skeleton';
import { DynamicPremiumContentModal } from '../shared/dynamic';
import { safeToDate } from '@/lib/utils';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { isFuture } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';

const getExamsAllowed = (plan?: '10-day' | '30-day' | '60-day' | 'permanent' | 'trial' | 'custom' | null, customExams?: number): number => {
  switch (plan) {
    case '10-day': return 1;
    case '30-day': return 3;
    case '60-day': return 6;
    case 'permanent': return Infinity;
    case 'trial': return 1;
    case 'custom': return customExams || 0;
    default: return 0;
  }
}

export function AvailableExams() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const { t } = useLanguage();
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExam, setSelectedExam] = useState<string | null>(null);
  const [isLoadingExams, setIsLoadingExams] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);

  useEffect(() => {
    const fetchExams = async () => {
      if (!user?.examType) return;
      setIsLoadingExams(true);
      try {
        const { db } = getFirebaseServices();
        const q = query(collection(db, 'exams'));
        const querySnapshot = await getDocs(q);
        const fetchedExams = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Exam)).filter(exam => exam.area === user.examType && exam.type !== 'diagnostico');
        setExams(fetchedExams);
        if (fetchedExams.length > 0) {
          setSelectedExam(fetchedExams[0].id);
        }
      } catch (error) {
        console.error("Error fetching exams: ", error);
        toast({ variant: 'destructive', title: "Error", description: "No se pudieron cargar los exámenes disponibles." })
      } finally {
        setIsLoadingExams(false);
      }
    };
    fetchExams();
  }, [user?.examType, toast]);

  const isUserPremium = user?.premiumUntil && isFuture(safeToDate(user.premiumUntil)!);

  const { examsAllowed, examsTaken, hasExamsLeft } = useMemo(() => {
    const tokens = user?.examTokens ?? 0;
    const hasLeft = tokens > 0;

    // For trial users, if trial expired, revoke access
    if (user?.premiumPlan === 'trial' && user?.premiumUntil && !isFuture(safeToDate(user.premiumUntil)!)) {
      return { examsAllowed: 0, examsTaken: 0, hasExamsLeft: false };
    }

    return {
      examsAllowed: tokens,
      examsTaken: 0,
      hasExamsLeft: hasLeft
    };
  }, [user?.premiumPlan, user?.premiumUntil, user?.examTokens]);

  const handleStartExam = async () => {
    if (!selectedExam) {
      toast({ variant: 'destructive', title: "Error", description: "Por favor, selecciona un examen para empezar." });
      return;
    }

    if (!hasExamsLeft && !user?.isAdmin) {
      setIsPurchaseModalOpen(true);
      return;
    }

    setIsStarting(true);
    router.push(`/exam/${selectedExam}`);
    setIsConfirmModalOpen(false);
  };

  const handleInitiateStart = () => {
    if (!selectedExam) {
      toast({ variant: 'destructive', title: "Error", description: "Por favor, selecciona un examen para empezar." });
      return;
    }
    if (!hasExamsLeft && !user?.isAdmin) {
      setIsPurchaseModalOpen(true);
      return;
    }
    setIsConfirmModalOpen(true);
  }

  const handleConfirmPurchase = async () => {
    setIsPremiumModalOpen(false);
  };

  if (!user) return null;

  return (
    <>
      <div className="flex flex-col gap-4">
        {(!user?.examTokens || user.examTokens === 0) ? (
          <div className="text-[10px] uppercase tracking-widest font-black text-center text-primary/60 bg-primary/5 p-2 rounded-xl border border-primary/10">
            Obtén tokens para realizar un examen simulador
          </div>
        ) : (
          <div className="text-sm text-center text-muted-foreground bg-muted/50 p-2 rounded-md">
            Tokens disponibles: <span className="font-bold text-green-600">{user.examTokens}</span>
          </div>
        )}
        {isLoadingExams ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <div className="space-y-2">
            <Select onValueChange={setSelectedExam} defaultValue={selectedExam || undefined}>
              <SelectTrigger>
                <SelectValue placeholder={t('selectExam')} />
              </SelectTrigger>
              <SelectContent>
                {exams.map(exam => (
                  <SelectItem key={exam.id} value={exam.id}>
                    {exam.name} - ({exam.area})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleInitiateStart} className="w-full" disabled={isStarting || isLoadingExams || !selectedExam}>
              {isStarting && <Loader2 className="mr-2 animate-spin" />}
              {t('startExam')}
            </Button>
          </div>
        )}
      </div>

      <AlertDialog open={isConfirmModalOpen} onOpenChange={setIsConfirmModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('confirmExamStart')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('examStartDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleStartExam} disabled={isStarting}>
              {isStarting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('confirmAndStart')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <DynamicPremiumContentModal
        isOpen={isPremiumModalOpen}
        setIsOpen={setIsPremiumModalOpen}
        onConfirm={handleConfirmPurchase}
      />

      <AlertDialog open={isPurchaseModalOpen} onOpenChange={setIsPurchaseModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Comprar Token de Examen</AlertDialogTitle>
            <AlertDialogDescription>
              No tienes tokens disponibles para realizar un examen simulado. Cada token te permite acceder a un examen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              const message = encodeURIComponent('Hola, quiero obtener un token para acceso a examen simulador');
              const whatsappUrl = `https://wa.me/525538442731?text=${message}`;
              window.open(whatsappUrl, '_blank');
              setIsPurchaseModalOpen(false);
            }}>
              Comprar Token
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
