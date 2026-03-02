'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type { User } from '@/lib/types';
import { Calendar, Trophy, MessageSquare, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface UserExamInfoModalProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  user: User;
}

export function UserExamInfoModal({ isOpen, setIsOpen, user }: UserExamInfoModalProps) {
  const examDate = user.examDate?.toDate();
  const lastChange = user.lastExamDateChange?.toDate();

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Información de Examen - {user.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {examDate && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-blue-500" />
                <span className="font-medium">Fecha del Examen:</span>
              </div>
              <p className="text-sm text-muted-foreground ml-6">
                {format(examDate, 'PPP', { locale: es })}
              </p>
            </div>
          )}

          {user.examDateChangesCount !== undefined && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-orange-500" />
                <span className="font-medium">Cambios de Fecha:</span>
              </div>
              <p className="text-sm text-muted-foreground ml-6">
                {user.examDateChangesCount} cambios realizados
              </p>
            </div>
          )}

          {lastChange && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-purple-500" />
                <span className="font-medium">Último Cambio:</span>
              </div>
              <p className="text-sm text-muted-foreground ml-6">
                {format(lastChange, 'PPP p', { locale: es })}
              </p>
            </div>
          )}

          {(user.examScore || user.examFeedback) && (
            <>
              <Separator />
              <div className="space-y-3">
                <h3 className="font-medium flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-green-500" />
                  Retroalimentación del Examen
                </h3>

                {user.examScore && (
                  <div className="space-y-1">
                    <span className="text-sm font-medium">Puntaje:</span>
                    <Badge variant="secondary" className="ml-2">
                      {user.examScore}
                    </Badge>
                  </div>
                )}

                {user.examFeedback && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-blue-500" />
                      <span className="text-sm font-medium">Comentarios:</span>
                    </div>
                    <p className="text-sm text-muted-foreground ml-6 bg-muted p-2 rounded">
                      {user.examFeedback}
                    </p>
                  </div>
                )}
              </div>
            </>
          )}

          {!examDate && !user.examScore && !user.examFeedback && (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No hay información de examen registrada</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
