
'use client';

import {
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { ExamResult } from '@/lib/types';
import { BookOpen, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useState, useMemo } from 'react';
import { DynamicReviewModal, DynamicStartExamModal } from '@/components/shared/dynamic';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/hooks/use-auth';

interface ResultDetailsModalContentProps {
  result: ExamResult;
  setIsOpen: (isOpen: boolean) => void;
}

const formatDate = (timestamp: any) => {
  if (!timestamp) return 'Fecha inválida';
  const date = timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
  if (isNaN(date.getTime())) return 'Fecha inválida';
  return format(date, "PPPp", { locale: es });
};

const getMotivationalMessage = (progress: number) => {
    if (progress === 0) return "Cada error es una oportunidad para aprender. ¡Vamos a empezar!";
    if (progress < 25) return "¡Buen comienzo! Sigue así.";
    if (progress < 50) return "¡Vas a mitad de camino! Estás construyendo una base sólida.";
    if (progress < 75) return "¡Impresionante! Ya casi lo tienes.";
    if (progress < 100) return "¡Estás a punto de dominarlo! Un último esfuerzo.";
    return "Has repasado todos tus errores. ¡Ahora estás mucho mejor preparado para poner a prueba tus conocimientos en un nuevo intento!";
};

export function ResultDetailsModal({ result, setIsOpen }: ResultDetailsModalContentProps) {
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isStartExamModalOpen, setIsStartExamModalOpen] = useState(false);
  const { user } = useAuth();

  const incorrectQuestionsCount = result.answers.filter(a => !a.isCorrect).length;
  const learnedQuestionsCount = result.learnedQuestionIds?.length || 0;
  
  const reviewProgress = incorrectQuestionsCount > 0 
    ? Math.round((learnedQuestionsCount / incorrectQuestionsCount) * 100)
    : 100;

  const motivationalMessage = getMotivationalMessage(reviewProgress);

  const handleOpenReview = () => {
    setIsOpen(false);
    setTimeout(() => {
        setIsReviewModalOpen(true);
    }, 150);
  }

  return (
    <>
      <DialogContent className="w-[95vw] max-w-md rounded-lg flex flex-col p-0">
        <DialogHeader className="p-6 pb-4 border-b flex-shrink-0 text-center items-center">
          <DialogTitle className="font-headline text-2xl">Resumen del Examen</DialogTitle>
          <DialogDescription>{result.examName}</DialogDescription>
          <p className="text-xs text-muted-foreground pt-1">{formatDate(result.completedAt)}</p>
        </DialogHeader>
        <div className="p-6 space-y-4 flex-grow">
          <div className="text-center">
            <p className={cn("text-6xl font-bold font-headline", result.score >= 70 ? 'text-green-500' : result.score >= 50 ? 'text-yellow-500' : 'text-destructive')}>
              {result.score}%
            </p>
            <p className="text-sm text-muted-foreground">({result.correctAnswers} de {result.totalQuestions} correctas)</p>
          </div>
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="p-4 bg-green-500/10 rounded-lg">
              <p className="text-2xl font-bold text-green-600">{result.correctAnswers}</p>
              <p className="text-xs font-medium text-green-700">Correctas</p>
            </div>
            <div className="p-4 bg-destructive/10 rounded-lg">
              <p className="text-2xl font-bold text-destructive">{(result.totalQuestions || 0) - (result.correctAnswers || 0)}</p>
              <p className="text-xs font-medium text-destructive/80">Incorrectas</p>
            </div>
          </div>
          
          {incorrectQuestionsCount > 0 && (
             <div className="pt-4 space-y-3">
              {reviewProgress === 100 ? (
                <div className="text-center py-4 px-6 bg-green-50 dark:bg-green-900/50 border border-green-200 dark:border-green-800 rounded-lg space-y-3">
                  <Trophy className="h-10 w-10 mx-auto text-green-500"/>
                  <h3 className="font-bold text-lg text-green-800 dark:text-green-200">¡Felicidades!</h3>
                  <p className="text-sm text-green-700 dark:text-green-300">{motivationalMessage}</p>
                  <Button 
                      onClick={() => setIsStartExamModalOpen(true)} 
                      disabled={!user || (user.examTokens || 0) <= 0}
                      className="mt-2"
                      size="sm"
                    >
                      Comenzar Examen
                    </Button>
                    {(user?.examTokens || 0) <= 0 && <p className="text-xs text-muted-foreground mt-1">Necesitas tokens de examen.</p>}
                </div>
              ) : (
                <div className="p-4 rounded-lg bg-muted/50 space-y-3">
                  <div className="flex justify-between items-center text-sm">
                      <p className="font-medium">Progreso de Repaso</p>
                      <p className="font-semibold text-primary">{reviewProgress}%</p>
                  </div>
                  <Progress value={reviewProgress} />
                  <p className="text-xs text-muted-foreground text-center italic">{motivationalMessage}</p>
                </div>
              )}
            </div>
          )}
          
          {incorrectQuestionsCount > 0 && (
            <div className="pt-2">
                <Button className="w-full" onClick={handleOpenReview}>
                  <BookOpen className="h-4 w-4 mr-2" />
                  Repasar mis errores
                </Button>
            </div>
          )}
        </div>
        <DialogFooter className="p-6 pt-0 border-t flex-shrink-0 bg-background z-10">
          <Button onClick={() => setIsOpen(false)} className="w-full" variant="outline">Cerrar</Button>
        </DialogFooter>
      </DialogContent>
      <DynamicReviewModal isOpen={isReviewModalOpen} setIsOpen={setIsReviewModalOpen} result={result} />
      <DynamicStartExamModal isOpen={isStartExamModalOpen} setIsOpen={setIsStartExamModalOpen} />
    </>
  );
}
