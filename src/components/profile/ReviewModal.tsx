
'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { Exam, ExamResult, ExamQuestion, ContentItem } from '@/lib/types';
import { useState, useMemo, useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { Card } from '../ui/card';
import { ArrowLeft, BookOpen, Check, CheckCircle, Lightbulb, XCircle, Trophy, Loader2 } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { getFirebaseServices } from '@/lib/firebase';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';


interface EnrichedQuestion extends ExamQuestion {
  userAnswer: string;
  isCorrect: boolean;
}

interface ReviewModalProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  result: ExamResult | null;
}

const getMotivationalMessage = (progress: number) => {
    if (progress === 0) return "Cada error es una oportunidad para aprender. ¡Vamos a empezar!";
    if (progress < 25) return "¡Buen comienzo! Sigue así.";
    if (progress < 50) return "¡Vas a mitad de camino! Estás construyendo una base sólida.";
    if (progress < 75) return "¡Impresionante! Ya casi lo tienes.";
    if (progress < 100) return "¡Estás a punto de dominarlo! Un último esfuerzo.";
    return "Has repasado todos tus errores. ¡Estás listo para el siguiente reto!";
};

const QuestionDetailView = ({
  question,
  onBack,
  onMarkLearned,
  isLearned,
  onViewContent,
  isMarking,
}: {
  question: EnrichedQuestion;
  onBack: () => void;
  onMarkLearned: (questionId: string) => Promise<void>;
  isLearned: boolean;
  onViewContent: (contentId: string) => void;
  isMarking: boolean;
}) => (
  <div className="h-full flex flex-col rounded-lg">
     <div className="p-4 border-b flex-shrink-0 flex items-center justify-between gap-4">
        <Button variant="ghost" size="sm" onClick={onBack} className="h-auto p-1">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
        </Button>
        <DialogHeader className="text-center flex-grow">
            <DialogTitle className="text-lg font-semibold">
                Detalle de la Pregunta
            </DialogTitle>
             <VisuallyHidden>
                <DialogDescription>Detalle de la pregunta incorrecta.</DialogDescription>
            </VisuallyHidden>
        </DialogHeader>
        <div className="w-20" />
    </div>
    <ScrollArea className="flex-grow p-4">
      <p className="font-semibold mb-4">{question.question}</p>
      {question.imageUrl && (
        <div className="relative h-48 w-full mb-4">
          <Image src={question.imageUrl} alt="Imagen de pregunta" layout="fill" objectFit="contain" className="rounded-md" />
        </div>
      )}
      <div className="space-y-2">
        <h4 className="text-sm font-semibold">Tu Respuesta:</h4>
        <div className="flex items-start gap-2 p-3 border border-destructive/50 bg-destructive/10 rounded-md">
          <XCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
          <p>{question.userAnswer}</p>
        </div>
      </div>
      <div className="space-y-2 mt-4">
        <h4 className="text-sm font-semibold">Respuesta Correcta:</h4>
        <div className="flex items-start gap-2 p-3 border border-green-500/50 bg-green-500/10 rounded-md">
          <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
          <p>{typeof question.answer === 'string' ? question.answer : (question.answer as any)?.text}</p>
        </div>
      </div>
      {(question.feedback) && (
        <div className="space-y-2 mt-4 border-t pt-4">
          <h4 className="font-semibold flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-amber-500" />
            Explicación
          </h4>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{question.feedback}</p>
        </div>
      )}
    </ScrollArea>
    <div className="p-4 border-t flex-shrink-0 flex gap-2">
        {question.linkedContentId && (
            <Button variant="outline" className="w-full" onClick={() => onViewContent(question.linkedContentId!)}>
                <BookOpen className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">Estudiar Tema</span>
            </Button>
        )}
        <Button
            className={cn(
                "w-full",
                isLearned && "bg-green-600 hover:bg-green-700"
            )}
            onClick={() => onMarkLearned(question.id)}
            disabled={isLearned || isMarking}
            >
            {isMarking ? (
                <Loader2 className="h-4 w-4 animate-spin md:mr-2" />
            ) : (
                <Check className="h-4 w-4 md:mr-2" />
            )}
            <span className="hidden md:inline">
                {isMarking ? 'Guardando...' : isLearned ? 'Tema Aprendido' : 'Marcar como Aprendido'}
            </span>
        </Button>
    </div>
  </div>
);

export function ReviewModal({ isOpen, setIsOpen, result: initialResult }: ReviewModalProps) {
  const { user, updateExamResult } = useAuth();
  const router = useRouter();
  const [exam, setExam] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedQuestion, setSelectedQuestion] = useState<EnrichedQuestion | null>(null);
  const [isMarking, setIsMarking] = useState(false);
  
  // Use local state for the result to allow for instant updates
  const [result, setResult] = useState(initialResult);

  useEffect(() => {
    setResult(initialResult);
  }, [initialResult]);

  const enrichedQuestions = useMemo((): EnrichedQuestion[] => {
    if (!exam || !result) return [];
    return result.answers
      .map(answer => {
        const question = exam.questions.find((q: any) => q.id === answer.questionId);
        if (!question) return null;
        return {
          ...question,
          userAnswer: answer.selectedOption,
          isCorrect: answer.isCorrect,
        };
      })
      .filter((q): q is EnrichedQuestion => q !== null);
  }, [exam, result]);

  const incorrectQuestions = useMemo(() => enrichedQuestions.filter(q => !q.isCorrect), [enrichedQuestions]);
  const learnedQuestions = useMemo(() => new Set(result?.learnedQuestionIds || []), [result]);
  
  const reviewProgress = incorrectQuestions.length > 0 
    ? Math.round((learnedQuestions.size / incorrectQuestions.length) * 100)
    : 100;
  const motivationalMessage = getMotivationalMessage(reviewProgress);


  useEffect(() => {
    const fetchExamDetails = async () => {
      if (!result?.examId) return;
      setIsLoading(true);
      try {
        const { db } = getFirebaseServices();
        const examRef = doc(db, 'exams', result.examId);
        const examSnap = await getDoc(examRef);
        if (examSnap.exists()) {
          setExam({ id: examSnap.id, ...examSnap.data() });
        }
      } catch (error) {
        console.error('Error fetching exam details:', error);
      } finally {
        setIsLoading(false);
      }
    };
    if (isOpen) {
      fetchExamDetails();
    } else {
        setSelectedQuestion(null);
    }
  }, [isOpen, result?.examId]);

  const handleMarkLearned = async (questionId: string) => {
    if (!result?.resultId) return;
    setIsMarking(true);
    const newLearnedIds = Array.from(new Set([...(result.learnedQuestionIds || []), questionId]));
    
    // Optimistic UI Update
    const updatedResult = {
        ...result,
        learnedQuestionIds: newLearnedIds,
    };
    setResult(updatedResult);

    try {
        await updateExamResult(result.resultId, { learnedQuestionIds: newLearnedIds });
    } catch (error) {
        console.error("Failed to mark as learned:", error);
        // Revert on error if needed
        setResult(result);
    } finally {
        setIsMarking(false);
    }
  };
  
  const handleViewContent = (contentId: string) => {
      setIsOpen(false);
      router.push(`/content?open=${contentId}`);
  };

  if (!isOpen || !result) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="w-[95vw] max-w-4xl h-[90vh] p-0 flex flex-col rounded-lg">
        {selectedQuestion ? (
          <QuestionDetailView
            question={selectedQuestion}
            onBack={() => setSelectedQuestion(null)}
            onMarkLearned={handleMarkLearned}
            isLearned={learnedQuestions.has(selectedQuestion.id)}
            onViewContent={handleViewContent}
            isMarking={isMarking}
          />
        ) : (
          <>
            <DialogHeader className="p-4 border-b flex-shrink-0">
                <DialogTitle>Repasar mis Errores</DialogTitle>
                <DialogDescription>
                    Revisa las preguntas que contestaste incorrectamente. Tu progreso se guardará.
                </DialogDescription>
            </DialogHeader>
            <div className="p-4 flex-shrink-0 space-y-2">
              {reviewProgress === 100 && incorrectQuestions.length > 0 ? (
                  <div className="text-center py-4 px-6 bg-green-50 dark:bg-green-900/50 border border-green-200 dark:border-green-800 rounded-lg space-y-3">
                      <Trophy className="h-10 w-10 mx-auto text-green-500"/>
                      <h3 className="font-bold text-lg text-green-800 dark:text-green-200">¡Felicidades!</h3>
                      <p className="text-sm text-green-700 dark:text-green-300">
                          {motivationalMessage}
                      </p>
                  </div>
                ) : (
                    <>
                        <div className="flex justify-between items-center text-sm">
                            <p className="font-medium">Progreso de Repaso</p>
                            <p className="font-semibold text-primary">{reviewProgress}%</p>
                        </div>
                        <Progress value={reviewProgress} />
                        <p className="text-xs text-muted-foreground text-center italic">{motivationalMessage}</p>
                    </>
                )}
            </div>
            <ScrollArea className="flex-grow p-4 pt-0">
              {isLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <Skeleton className="h-32 w-3/4" />
                  </div>
              ) : incorrectQuestions.length > 0 ? (
                  <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
                    {incorrectQuestions.map((q, index) => (
                      <Card
                        key={q.id}
                        onClick={() => setSelectedQuestion(q)}
                        className={cn(
                            "aspect-square flex items-center justify-center cursor-pointer transition-all hover:scale-105 rounded-lg",
                            learnedQuestions.has(q.id) 
                                ? 'bg-green-100 dark:bg-green-900/50 border-green-500 text-green-700 dark:text-green-300'
                                : 'bg-destructive/10 border-destructive/20'
                        )}
                      >
                        <div className="text-center">
                            <p className="text-xs text-muted-foreground">Pregunta</p>
                            <p className="font-bold text-lg">{exam?.questions.findIndex((eq: any) => eq.id === q.id) + 1}</p>
                        </div>
                      </Card>
                    ))}
                  </div>
              ) : (
                <div className="text-center py-16 text-muted-foreground">
                  <Check className="h-12 w-12 mx-auto mb-2" />
                  <p>¡Felicidades! No tuviste errores en este examen.</p>
                </div>
              )}
            </ScrollArea>
             <div className="p-4 border-t flex-shrink-0">
                <Button variant="outline" className="w-full" onClick={() => setIsOpen(false)}>Volver al Resumen</Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
