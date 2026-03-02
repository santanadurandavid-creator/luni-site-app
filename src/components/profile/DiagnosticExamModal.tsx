'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Info, Clock, FileText, CheckCircle, XCircle, Lightbulb, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getFirebaseServices } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { DynamicPurchaseSimulatorModal } from '../shared/dynamic';

interface DiagnosticExamModalProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const getRecommendation = (score: number) => {
    if (score < 50) return { plan: 'Plan Completo', advice: 'Tu resultado indica que necesitas una base sólida. Este plan te dará tiempo suficiente para cubrir todos los temas a profundidad y practicar con múltiples exámenes.' };
    if (score < 70) return { plan: 'Plan Avanzado', advice: 'Vas por buen camino, pero hay áreas clave que reforzar. Este plan es ideal para un repaso intensivo y enfocado en tus debilidades.' };
    return { plan: 'Plan Básico', advice: '¡Excelente! Estás muy cerca de tu meta. Este plan te ayudará a pulir los últimos detalles y a llegar al examen con máxima confianza.' };
};

const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-500';
    if (score >= 50) return 'text-yellow-500';
    return 'text-destructive';
};

export function DiagnosticExamModal({ isOpen, setIsOpen }: DiagnosticExamModalProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [recommendedPackage, setRecommendedPackage] = useState<string | null>(null);


  const handleStartExam = async () => {
    if (!user?.examType) return;
    try {
      const { db } = getFirebaseServices();
      const q = query(collection(db, 'exams'), where('type', '==', 'diagnostico'), where('area', '==', user.examType));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const exam = querySnapshot.docs[0];
        setIsOpen(false);
        router.push(`/exam/${exam.id}`);
      } else {
        // Handle no exam found
        console.error('No diagnostic exam found for this area');
      }
    } catch (error) {
      console.error('Error fetching diagnostic exam:', error);
    }
  };

  const renderContent = () => {
    if (user?.hasTakenDiagnosticExam && user.diagnosticExamResult) {
      const { score, correctAnswers = 0, totalQuestions = 0 } = user.diagnosticExamResult;
      const recommendation = getRecommendation(score);

      const handleGetPremium = () => {
        setRecommendedPackage(recommendation.plan);
        setIsPurchaseModalOpen(true);
      };
      return (
        <>
          <DialogHeader>
            <DialogTitle className="text-center text-2xl font-headline">¡Tus Resultados del Diagnóstico!</DialogTitle>
          </DialogHeader>
          <div className="py-6 text-center space-y-4">
              <div className="flex flex-col items-center space-y-2">
                  {score >= 70 ? (
                  <CheckCircle className="h-16 w-16 text-green-500" />
                  ) : (
                  <XCircle className="h-16 w-16 text-destructive" />
                  )}
                  <p className={cn('text-6xl font-bold font-headline', getScoreColor(score))}>
                      {score}
                  </p>
                  <p className="text-sm text-muted-foreground">Calificación Final</p>
              </div>
              <div className="rounded-lg border bg-muted/30 p-4 space-y-2 text-left">
                  <div className="flex justify-between items-center">
                      <p className="font-semibold">Respuestas Correctas:</p>
                      <p>{correctAnswers} de {totalQuestions}</p>
                  </div>
                   <div className="flex justify-between items-center">
                      <p className="font-semibold">Respuestas Incorrectas:</p>
                      <p>{totalQuestions - correctAnswers}</p>
                  </div>
              </div>
              <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg text-left">
                  <h4 className="font-semibold text-primary flex items-center gap-2"><Lightbulb className="h-5 w-5"/>Nuestra Recomendación</h4>
                  <p className="text-sm mt-2">Te recomendamos el <strong>{recommendation.plan}</strong>.</p>
                  <p className="text-xs text-muted-foreground mt-1">{recommendation.advice}</p>
              </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row sm:justify-between gap-2">
            <Button onClick={() => setIsOpen(false)} className="w-full">
              Entendido, ¡gracias!
            </Button>
            <Button onClick={handleGetPremium} className="w-full bg-amber-500 hover:bg-amber-600">
              <Star className="mr-2 h-4 w-4" />
              Obtener Acceso Premium
            </Button>
          </DialogFooter>
          <DynamicPurchaseSimulatorModal
            isOpen={isPurchaseModalOpen}
            setIsOpen={setIsPurchaseModalOpen}
            recommendedPackageName={recommendedPackage}
            isFromPremiumButton={true}
          />
        </>
      );
    }

    // Instructions for users who haven't taken the exam
    return (
      <>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Examen Diagnóstico
          </DialogTitle>
          <DialogDescription>
            Este examen te ayudará a conocer tus conocimientos actuales y te recomendamos un plan premium adecuado.
          </DialogDescription> 
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
            <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-blue-900 dark:text-blue-100">Instrucciones:</p>
              <ul className="mt-1 text-blue-800 dark:text-blue-200 space-y-1">
                <li>• Tienes 3 horas para completar el examen</li>
                <li>• Solo puedes realizar este examen una vez</li>
                <li>• El resultado determinará el plan premium recomendado</li>
              </ul>
            </div>
          </div>
          <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
            <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            <p className="text-sm text-amber-800 dark:text-amber-200">
              Una vez iniciado, el tiempo comenzará a correr y no podrás salir hasta finalizar.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleStartExam}>
            Comenzar Examen
          </Button>
        </DialogFooter>
      </>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="w-[95vw] sm:max-w-md rounded-lg">
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
}
