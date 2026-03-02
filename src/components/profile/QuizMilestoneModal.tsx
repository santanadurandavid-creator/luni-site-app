'use client';

import { useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Trophy, Clock } from 'lucide-react';

interface QuizMilestoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  milestoneReward: { quizzes: number; minutes: number } | null;
}

export function QuizMilestoneModal({ isOpen, onClose, milestoneReward }: QuizMilestoneModalProps) {
  useEffect(() => {
    if (isOpen) {
      // Auto-close after 5 seconds
      const timer = setTimeout(() => {
        onClose();
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [isOpen, onClose]);

  if (!milestoneReward) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] sm:max-w-md rounded-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-center">
            <Trophy className="h-6 w-6 text-yellow-500" />
            ¡Felicidades!
          </DialogTitle>
        </DialogHeader>

        <div className="text-center space-y-4">
          <div className="text-2xl font-bold text-green-600">
            ¡Hito alcanzado!
          </div>

          <div className="space-y-2">
            <p className="text-lg">
              Has completado <span className="font-bold text-blue-600">{milestoneReward.quizzes}</span> cuestionarios
              con calificación de 90% o superior
            </p>

            <div className="flex items-center justify-center gap-2 text-lg font-semibold text-green-600">
              <Clock className="h-5 w-5" />
              ¡Has ganado {milestoneReward.minutes} minutos de Premium!
            </div>
          </div>

          <div className="text-sm text-muted-foreground">
            Tu tiempo premium ha sido activado automáticamente.
          </div>

          <Button onClick={onClose} className="w-full">
            ¡Genial!
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
