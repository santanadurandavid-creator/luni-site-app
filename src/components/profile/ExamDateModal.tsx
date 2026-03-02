'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { getFirebaseServices } from '@/lib/firebase';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { Calendar, Clock, AlertCircle, Edit } from 'lucide-react';
import { isFuture, intervalToDuration } from 'date-fns';

interface ExamDateModalProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  isFeedback?: boolean;
  examDate?: Date;
  isViewMode?: boolean;
}

export function ExamDateModal({ isOpen, setIsOpen, isFeedback = false, examDate, isViewMode = false }: ExamDateModalProps) {
  const { user, updateUser } = useAuth();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState('');
  const [score, setScore] = useState('');
  const [feedback, setFeedback] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [remainingTime, setRemainingTime] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (isFeedback && examDate) {
      setSelectedDate(examDate.toISOString().split('T')[0]);
    }
  }, [isFeedback, examDate]);

  useEffect(() => {
    if (isViewMode && examDate) {
      const updateRemainingTime = () => {
        const now = new Date();
        if (now > examDate) {
          setRemainingTime("Examen completado");
        } else {
          const duration = intervalToDuration({ start: now, end: examDate });
          setRemainingTime(`${duration.days || 0}d ${duration.hours || 0}h ${duration.minutes || 0}m`);
        }
      };
      updateRemainingTime();
      const intervalId = setInterval(updateRemainingTime, 60000); // Update every minute
      return () => clearInterval(intervalId);
    }
  }, [isViewMode, examDate]);

  const isPremium = user?.premiumUntil && isFuture(user.premiumUntil.toDate());

  const handleSave = async () => {
    if (!user?.id) return;
    setIsLoading(true);

    try {
      const { db } = getFirebaseServices();
      const userRef = doc(db, 'users', user.id);

      if (isFeedback) {
        // Save feedback
        await updateDoc(userRef, {
          examScore: parseFloat(score) || null,
          examFeedback: feedback || null,
        });
        toast({
          title: '¡Gracias por compartir!',
          description: 'Tu retroalimentación ha sido guardada.',
        });
      } else {
        // Set exam date
        // No limit for changing exam date

        const newDate = new Date(`${selectedDate}T00:00:00`);
        const now = new Date();
        if (newDate <= now) {
          toast({
            variant: 'destructive',
            title: 'Fecha inválida',
            description: 'La fecha debe ser futura.',
          });
          return;
        }

        await updateDoc(userRef, {
          examDate: newDate,
        });

        toast({
          title: 'Fecha guardada',
          description: `Tu examen está programado para el ${newDate.toLocaleDateString('es-ES')}.`,
        });
      }

      setIsOpen(false);
      setSelectedDate('');
      setScore('');
      setFeedback('');
      setIsEditing(false);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo guardar la información.',
      });
    } finally {
      setIsLoading(false);
    }
  };



  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            {isFeedback ? '¿Cómo te fue en tu examen?' : isViewMode ? 'Tiempo Restante para tu Examen' : 'Programar Fecha de Examen'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {isViewMode && examDate && (
            <div className="text-center">
              <div className="bg-blue-50 dark:bg-blue-950/20 p-6 rounded-lg">
                <Clock className="h-12 w-12 mx-auto mb-4 text-blue-600 dark:text-blue-400" />
                <p className="text-2xl font-bold text-blue-800 dark:text-blue-200 mb-2">
                  {remainingTime}
                </p>
                <p className="text-sm text-blue-600 dark:text-blue-400">
                  hasta tu examen programado para el {examDate.toLocaleDateString('es-ES')}
                </p>
              </div>
              <div className="mt-4">
                <Button
                  onClick={() => setIsEditing(true)}
                  variant="outline"
                  className="w-full"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Cambiar Fecha
                </Button>
              </div>
            </div>
          )}
          {!isFeedback && !isViewMode && (
            <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Nos importa dar seguimiento a tu preparación. ¿Cuándo tienes programado tu examen?
              </p>
            </div>
          )}
          {isEditing && (
            <div className="bg-yellow-50 dark:bg-yellow-950/20 p-3 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                Estás editando la fecha de tu examen
              </p>
            </div>
          )}

          {isFeedback ? (
            <>
              <div>
                <Label htmlFor="score">Puntaje obtenido (opcional)</Label>
                <Input
                  id="score"
                  type="number"
                  placeholder="Ej: 850"
                  value={score}
                  onChange={(e) => setScore(e.target.value)}
                  min="0"
                  max="1000"
                />
              </div>
              <div>
                <Label htmlFor="feedback">Comparte tu experiencia (opcional)</Label>
                <Textarea
                  id="feedback"
                  placeholder="Cuéntanos cómo te fue..."
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  rows={3}
                />
              </div>
            </>
          ) : (
            <>
              {(isEditing || !isViewMode) && (
                <div>
                  <Label htmlFor="examDate">Fecha del examen</Label>
                  <Input
                    id="examDate"
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          {isViewMode && !isEditing && (
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cerrar
            </Button>
          )}
          {(!isViewMode || isEditing) && (
            <>
              <Button variant="outline" onClick={() => {
                if (isEditing) {
                  setIsEditing(false);
                  setSelectedDate('');
                } else {
                  setIsOpen(false);
                }
              }}>
                {isFeedback ? 'Omitir' : isEditing ? 'Cancelar Edición' : 'Cancelar'}
              </Button>
              <Button onClick={handleSave} disabled={isLoading || (!isFeedback && !selectedDate)}>
                {isLoading ? 'Guardando...' : isFeedback ? 'Compartir' : isEditing ? 'Actualizar Fecha' : 'Guardar Fecha'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
