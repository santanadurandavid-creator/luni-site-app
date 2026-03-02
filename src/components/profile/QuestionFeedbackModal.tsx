
'use client';
import {
  Dialog,
  DialogContent,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { ExamQuestion } from '@/lib/types';
import { useState, useEffect } from 'react';
import { Loader2, Lightbulb, Check, X } from 'lucide-react';
import { getQuestionFeedback } from '@/ai/flows/question-feedback-flow';
import { ScrollArea } from '../ui/scroll-area';

interface QuestionFeedbackModalProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  question: ExamQuestion | null;
  userAnswer: string | null;
}

export function QuestionFeedbackModal({ isOpen, setIsOpen, question, userAnswer }: QuestionFeedbackModalProps) {
  const [feedback, setFeedback] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && question && userAnswer) {
      const generateFeedback = async () => {
        setIsLoading(true);
        setFeedback('');
        try {
          const fb = await getQuestionFeedback({
            question: question.question,
            options: question.options.map(opt => typeof opt === 'string' ? opt : opt.text).join(', '),
            correctAnswer: typeof question.answer === 'string' ? question.answer : (question.answer as any).text,
            userAnswer: userAnswer,
          });
          setFeedback(fb);
        } catch (error) {
          console.error("Error generating feedback:", error);
          setFeedback('No se pudo generar el feedback en este momento. Por favor, intenta de nuevo más tarde.');
        } finally {
          setIsLoading(false);
        }
      };
      generateFeedback();
    }
  }, [isOpen, question, userAnswer]);

  if (!question) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="w-[95vw] max-w-2xl rounded-lg flex flex-col h-[600px]">
        <ScrollArea className="flex-grow pr-6 -mr-6">
          <div>
            <h2 className="font-headline text-lg mb-2">Análisis de la Pregunta</h2>
            <p className="mb-4">{question.question}</p>
            {question.imageUrl && (
              <img
                src={question.imageUrl}
                alt="Imagen de la pregunta"
                className="mb-4 max-w-full max-h-64 object-contain rounded-md"
              />
            )}
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <p className="font-semibold text-sm">Tu Respuesta:</p>
                <div className="flex items-center gap-2 p-2 border border-destructive/50 bg-destructive/10 rounded-md">
                  <X className="h-5 w-5 text-destructive flex-shrink-0" />
                  <p>{userAnswer}</p>
                </div>
              </div>
              <div className="space-y-2">
                <p className="font-semibold text-sm">Respuesta Correcta:</p>
                <div className="flex items-center gap-2 p-2 border border-green-500/50 bg-green-500/10 rounded-md">
                  <Check className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <p>{typeof question.answer === 'string' ? question.answer : (question.answer as any).text}</p>
                </div>
              </div>

              <div className="border-t pt-4 mt-4 space-y-2">
                <h4 className="font-semibold flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-amber-500" />
                  Explicación de la IA
                </h4>
                {isLoading ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Generando explicación...</span>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{feedback}</p>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="mt-auto pt-4 border-t">
          <Button onClick={() => setIsOpen(false)}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
