'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import type { ContentItem, QuestionOption } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';
import { Clock, Trophy, ChevronRight, Check, X, CloudDownload, FileCheck, Loader2 } from 'lucide-react';
import { ModalBanner } from '@/components/ads/ModalBanner';
import { ShareButton } from '@/components/shared/ShareButton';
import { downloadFileForOffline, isFileCached } from '@/lib/offline-utils';
import { useToast } from '@/hooks/use-toast';

interface QuizPlayerModalProps {
  quiz: ContentItem | null;
  onClose: () => void;
  onQuizComplete: (score: number, totalQuestions: number) => void;
}

export function QuizPlayerModal({ quiz, onClose, onQuizComplete }: QuizPlayerModalProps) {
  const { user, addStudyTime } = useAuth();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes default
  const [answers, setAnswers] = useState<Record<string, number>>({}); // Map question ID to selected option index
  const [isDownloading, setIsDownloading] = useState(false);
  const [isOfflineReady, setIsOfflineReady] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (quiz) {
      setCurrentQuestionIndex(0);
      setSelectedOption(null);
      setScore(0);
      setShowResult(false);
      setTimeLeft(600);
      setAnswers({});
    }
  }, [quiz]);

  useEffect(() => {
    if (!quiz || showResult) return;

    const timer = setInterval(() => {
      setTimeLeft((prev: number) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleFinishQuiz();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [quiz, showResult]);

  useEffect(() => {
    // Mark content as viewed when the modal opens
    if (quiz?.id) {
      const completedContentIds: string[] = JSON.parse(localStorage.getItem('completedContentIds') || '[]');
      if (!completedContentIds.includes(quiz.id)) {
        completedContentIds.push(quiz.id);
        localStorage.setItem('completedContentIds', JSON.stringify(completedContentIds));
        window.dispatchEvent(new CustomEvent('contentCompleted', { detail: { id: quiz.id } }));
      }
    }
  }, [quiz]);

  useEffect(() => {
    const checkOfflineStatus = async () => {
      if (!quiz) return;

      const imageUrl = quiz.imageUrl;
      if (imageUrl) {
        const cached = await isFileCached(imageUrl, 'static-image-assets');
        if (cached) {
          setIsOfflineReady(true);
          return;
        }
      }

      const downloadedItems = JSON.parse(localStorage.getItem('offlineDownloadedItems') || '[]');
      if (downloadedItems.includes(quiz.id)) {
        setIsOfflineReady(true);
      }
    };
    checkOfflineStatus();
  }, [quiz]);

  const handleDownloadOffline = async () => {
    if (!quiz) return;
    setIsDownloading(true);
    try {
      if (quiz.imageUrl) {
        await downloadFileForOffline(quiz.imageUrl, 'static-image-assets');
      }
      // Also cache question images
      if (quiz.quizDetails?.questions) {
        for (const q of quiz.quizDetails.questions) {
          if (q.imageUrl) await downloadFileForOffline(q.imageUrl, 'static-image-assets');
          const options = (Array.isArray(q.options) ? q.options : Object.values(q.options)) as QuestionOption[];
          for (const opt of options) {
            if (opt.imageUrl) await downloadFileForOffline(opt.imageUrl, 'static-image-assets');
          }
        }
      }

      // Mark as downloaded in localStorage
      const downloadedItems = JSON.parse(localStorage.getItem('offlineDownloadedItems') || '[]');
      if (!downloadedItems.includes(quiz.id)) {
        downloadedItems.push(quiz.id);
        localStorage.setItem('offlineDownloadedItems', JSON.stringify(downloadedItems));
      }

      setIsOfflineReady(true);
      toast({ title: "Quiz listo Offline", description: "Imágenes guardadas." });
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo descargar." });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleOptionSelect = (optionIndex: number) => {
    if (showResult) return;
    setSelectedOption(optionIndex);
  };

  const handleNextQuestion = () => {
    if (!quiz || selectedOption === null) return;

    // Save answer
    const currentQuestion = quiz.quizDetails?.questions[currentQuestionIndex];
    if (currentQuestion) {
      setAnswers(prev => ({ ...prev, [currentQuestion.id]: selectedOption }));
    }

    // Check if correct
    const isCorrect = currentQuestion?.options?.[selectedOption]?.isCorrect;
    if (isCorrect) {
      setScore((prev: number) => prev + 1);
    }

    if (currentQuestionIndex < (quiz.quizDetails?.questions.length || 0) - 1) {
      setCurrentQuestionIndex((prev: number) => prev + 1);
      setSelectedOption(null);
    } else {
      handleFinishQuiz();
    }
  };

  const handleFinishQuiz = () => {
    if (!quiz || showResult) return;
    setShowResult(true);

    if (user) {
      addStudyTime(10, quiz.subject || 'General');
    }

    // Calculate final score
    let calculatedScore = 0;
    const currentQ = quiz.quizDetails?.questions[currentQuestionIndex];

    // Add current selection to answers if not already
    const finalAnswers = { ...answers };
    if (currentQ && selectedOption !== null) {
      finalAnswers[currentQ.id] = selectedOption;
      if (currentQ?.options?.[selectedOption]?.isCorrect) calculatedScore++;
    }

    // Add previous correct answers
    quiz.quizDetails?.questions.forEach(q => {
      if (q.id !== currentQ?.id && finalAnswers[q.id] !== undefined && q.options?.[finalAnswers[q.id]]?.isCorrect) {
        calculatedScore++;
      }
    });

    setScore(calculatedScore);
    onQuizComplete(calculatedScore, quiz.quizDetails?.questions.length || 0);
  };

  if (!quiz || !quiz.quizDetails || !quiz.quizDetails.questions || quiz.quizDetails.questions.length === 0) return null;

  const currentQuestion = quiz.quizDetails.questions[currentQuestionIndex];
  if (!currentQuestion) return null;
  const progress = ((currentQuestionIndex + 1) / quiz.quizDetails.questions.length) * 100;

  // Styles
  const bgStyle = {
    backgroundColor: quiz.quizDetails.backgroundColor || '#ffffff',
    color: quiz.quizDetails.textColor || '#000000',
  };

  const bgImageStyle = quiz.quizDetails.backgroundImageUrl ? {
    backgroundImage: `url(${quiz.quizDetails.backgroundImageUrl})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  } : {};

  const overlayStyle = {
    backgroundColor: quiz.quizDetails.backgroundColor || '#ffffff',
    opacity: quiz.quizDetails.backgroundImageOpacity ?? 0.9,
  };

  return (
    <Dialog open={!!quiz} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[95vw] md:w-[90vw] max-w-2xl md:max-w-4xl h-[90vh] p-0 rounded-lg flex flex-col overflow-hidden border-0 bg-background dark:bg-background" showCloseButton={false}>
        <div className="absolute inset-0 z-0 dark:hidden" style={bgImageStyle}></div>
        <div className="absolute inset-0 z-0 dark:hidden" style={overlayStyle}></div>

        {/* Dark mode background override */}
        <div className="absolute inset-0 z-0 hidden dark:block bg-background/95 backdrop-blur-sm"></div>

        <div className="relative z-10 flex flex-col h-full text-foreground dark:text-foreground" style={{ color: 'inherit' }}>
          <DialogHeader className="p-6 pb-2 flex-shrink-0 relative border-b dark:border-border">
            <div className="flex justify-between items-center mb-2">
              <DialogTitle>{quiz.title}</DialogTitle>
              <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-full" aria-label="Close quiz modal">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex items-center gap-2 text-sm font-mono mb-2">
              <Clock className="h-4 w-4" />
              {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
            </div>
            <Progress value={progress} className="h-2" />
          </DialogHeader>

          <div className="flex-grow overflow-y-auto p-6 pt-2">
            {!showResult ? (
              <div className="space-y-6">
                <div className="space-y-2">
                  <span className="text-sm opacity-70">Pregunta {currentQuestionIndex + 1} de {quiz.quizDetails.questions.length}</span>
                  <h3 className="text-xl font-semibold leading-tight">{currentQuestion.question}</h3>
                  {currentQuestion.imageUrl && (
                    <div className="relative w-full h-48 md:h-64 mt-4 rounded-xl overflow-hidden border bg-muted/10 shadow-sm flex items-center justify-center">
                      <img src={currentQuestion.imageUrl} alt="Pregunta" className="max-w-full max-h-full object-contain p-2" />
                    </div>
                  )}
                </div>

                <div className="space-y-3 pt-2">
                  {((Array.isArray(currentQuestion?.options) ? currentQuestion.options : Object.values(currentQuestion?.options || {})) as QuestionOption[]).map((option, index) => (
                    <button
                      key={option.id}
                      onClick={() => handleOptionSelect(index)}
                      className={cn(
                        "w-full p-4 text-left rounded-xl border transition-all duration-300 hover:shadow-md",
                        selectedOption === index
                          ? "border-primary ring-2 ring-primary/20 bg-primary/5 dark:bg-primary/20"
                          : "border-transparent bg-black/5 dark:bg-white/5 dark:border-white/10"
                      )}
                    >
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-bold flex-shrink-0 transition-colors duration-300",
                            selectedOption === index
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-muted-foreground/30 text-muted-foreground"
                          )}>
                            {String.fromCharCode(65 + index)}
                          </div>
                          <span className="text-base font-medium">{option.text}</span>
                        </div>
                        {option.imageUrl && (
                          <div className="ml-12 relative w-full h-32 md:h-40 rounded-lg overflow-hidden bg-background/40 border border-black/5 dark:border-white/10 shadow-inner flex items-center justify-center">
                            <img src={option.imageUrl} alt={`Opción ${String.fromCharCode(65 + index)}`} className="max-w-full max-h-full object-contain p-1" />
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center space-y-6 py-4">
                <div className="text-center space-y-2">
                  <div className="relative inline-block">
                    <div className="absolute inset-0 bg-yellow-400/20 blur-2xl rounded-full scale-150 animate-pulse"></div>
                    <Trophy className="h-16 w-16 text-yellow-500 relative z-10 mx-auto" />
                  </div>
                  <h3 className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                    ¡Quiz Completado!
                  </h3>
                  <p className="text-lg font-medium opacity-70">
                    Puntuación: <span className="text-primary font-black">{score}</span> / {quiz.quizDetails.questions.length}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
                  <div className="bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/20 p-4 rounded-2xl text-center">
                    <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400">{score}</div>
                    <div className="text-xs font-bold uppercase tracking-wider opacity-60">Correctas</div>
                  </div>
                  <div className="bg-rose-500/10 dark:bg-rose-500/20 border border-rose-500/20 p-4 rounded-2xl text-center">
                    <div className="text-3xl font-black text-rose-600 dark:text-rose-400">{quiz.quizDetails.questions.length - score}</div>
                    <div className="text-xs font-bold uppercase tracking-wider opacity-60">Incorrectas</div>
                  </div>
                </div>

                <div className="w-full space-y-4 pt-4 border-t dark:border-white/10">
                  <h4 className="text-sm font-black uppercase tracking-widest opacity-40 px-2">Resumen de Respuestas</h4>
                  <div className="space-y-3">
                    {quiz.quizDetails.questions.map((q, idx) => {
                      const userChoiceIdx = answers[q.id];
                      const options = (Array.isArray(q.options) ? q.options : Object.values(q.options)) as QuestionOption[];
                      const isCorrect = options[userChoiceIdx]?.isCorrect;
                      const correctOption = options.find(o => o.isCorrect);

                      return (
                        <div key={q.id} className={cn(
                          "p-4 rounded-2xl border transition-all",
                          isCorrect
                            ? "bg-emerald-500/[0.03] border-emerald-500/10"
                            : "bg-rose-500/[0.03] border-rose-500/10"
                        )}>
                          <div className="flex items-start gap-3">
                            <div className={cn(
                              "mt-1 shrink-0 w-6 h-6 rounded-full flex items-center justify-center",
                              isCorrect ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"
                            )}>
                              {isCorrect ? <Check className="h-3.5 w-3.5 stroke-[4]" /> : <X className="h-3.5 w-3.5 stroke-[4]" />}
                            </div>
                            <div className="space-y-2 min-w-0 flex-1">
                              <p className="text-sm font-bold leading-tight">{idx + 1}. {q.question}</p>
                              <div className="space-y-1">
                                <p className="text-xs">
                                  <span className="opacity-50 font-medium">Tu respuesta: </span>
                                  <span className={cn("font-bold", isCorrect ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
                                    {options[userChoiceIdx]?.text || 'No respondida'}
                                  </span>
                                </p>
                                {!isCorrect && (
                                  <p className="text-xs">
                                    <span className="opacity-50 font-medium">Correcta: </span>
                                    <span className="text-emerald-600 dark:text-emerald-400 font-bold italic">
                                      {correctOption?.text}
                                    </span>
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="p-6 pt-2 flex-shrink-0 flex justify-end gap-2">
            {!showResult ? (
              <Button onClick={handleNextQuestion} disabled={selectedOption === null}>
                {currentQuestionIndex === quiz.quizDetails.questions.length - 1 ? 'Finalizar' : 'Siguiente'}
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={onClose}>Cerrar</Button>
            )}
          </div>

          <div className="absolute bottom-4 left-4 sm:bottom-[10px] sm:left-6 z-50 flex items-center gap-2">


            <ShareButton
              itemId={quiz.id || ''}
              itemTitle={quiz.title}
              itemType="quiz"
            />
          </div>

          {/* Banner at bottom of modal */}
          {quiz && <ModalBanner item={quiz} />}
        </div>
      </DialogContent>
    </Dialog>
  );
}
