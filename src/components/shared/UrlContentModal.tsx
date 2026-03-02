

'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import type { ContentItem } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { useEffect, useState, useRef, useCallback } from 'react';
import { Loader2, ExternalLink, Video, Check } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '../ui/button';

interface UrlContentModalProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  classItem: ContentItem | null;
}

export function UrlContentModal({ isOpen, setIsOpen, classItem }: UrlContentModalProps) {
  const { incrementMultimediaWatched } = useAuth();
  const [isClassTime, setIsClassTime] = useState(false);
  const [isClassFinished, setIsClassFinished] = useState(false);
  const [showCheckmark, setShowCheckmark] = useState(false);
  const checkmarkShownRef = useRef(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const checkClassStatus = useCallback(() => {
    if (classItem?.classDetails?.classDate) {
      const now = new Date();
      const classDate = classItem.classDetails.classDate.toDate();
      const startTime = classDate.getTime();
      const endTime = classDate.getTime() + 60 * 60 * 1000; // 1 hour duration

      setIsClassTime(now.getTime() >= startTime && now.getTime() < endTime);
      setIsClassFinished(now.getTime() >= endTime || classItem.classDetails?.status === 'finished');
    }
  }, [classItem]);

  useEffect(() => {
    if (isOpen) {
      checkClassStatus(); // Check immediately on open
      intervalRef.current = setInterval(checkClassStatus, 60000); // And every minute after

      if (!checkmarkShownRef.current) {
        checkmarkShownRef.current = true;

        if (classItem?.id) {
          // Increment multimedia watched counter (protected by ID in AuthContext)
          incrementMultimediaWatched(classItem.id);

          // Show checkmark animation once
          setShowCheckmark(true);
          setTimeout(() => setShowCheckmark(false), 2000);
        }
      }
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isOpen, checkClassStatus, incrementMultimediaWatched]);

  const handleClose = () => {
    setIsOpen(false);
    setShowCheckmark(false);
    checkmarkShownRef.current = false;
  };

  if (!classItem) return null;

  const renderContent = () => {
    if (isClassFinished) {
      return (
        <div className="flex flex-col items-center justify-center h-full bg-muted text-muted-foreground p-6 text-center">
          <Video className="h-16 w-16 mx-auto mb-4" />
          <h2 className="text-2xl font-bold font-headline text-foreground mb-2">Clase Finalizada</h2>
          <p>Esta sesión ya ha terminado. ¡Esperamos verte en la próxima!</p>
        </div>
      )
    }

    if (isClassTime) {
      return (
        <div className="flex flex-col items-center justify-center h-full bg-destructive text-white p-6 text-center">
          <div className="relative mb-4">
            <Video className="h-20 w-20" />
            <div className="absolute top-0 right-0 -mr-2 -mt-2 h-6 w-6 rounded-full bg-background flex items-center justify-center">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-destructive"></span>
              </span>
            </div>
          </div>
          <h2 className="text-2xl font-bold font-headline mb-2">¡La clase está en vivo!</h2>
          <p className="mb-6">Haz clic en el botón para unirte a la transmisión en Google Meet.</p>
          <a href={classItem.contentUrl} target="_blank" rel="noopener noreferrer">
            <Button variant="secondary" size="lg">
              <ExternalLink className="mr-2 h-5 w-5" />
              Unirse a la Clase
            </Button>
          </a>
        </div>
      );
    }

    const classDate = classItem.classDetails?.classDate?.toDate();
    return (
      <div className="flex flex-col items-center justify-center h-full bg-muted text-muted-foreground p-6 text-center">
        <Video className="h-16 w-16 mx-auto mb-4" />
        <h2 className="text-2xl font-bold font-headline text-foreground mb-2">La clase aún no ha comenzado</h2>
        {classDate ? (
          <p>La transmisión iniciará el <span className="font-semibold text-foreground">{format(classDate, "eeee, d 'de' MMMM", { locale: es })}</span> a las <span className="font-semibold text-foreground">{format(classDate, "HH:mm", { locale: es })} hrs</span>.</p>
        ) : (
          <p>La fecha de la clase no está disponible.</p>
        )}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-[95vw] h-auto max-w-lg p-0 flex flex-col rounded-lg border-0 overflow-hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>{classItem.title}</DialogTitle>
        </DialogHeader>
        {renderContent()}

        {/* Checkmark Animation Overlay */}
        {showCheckmark && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/10 z-[60] animate-in fade-in zoom-in duration-300 pointer-events-none">
            <div className="bg-white dark:bg-zinc-800 p-6 rounded-full shadow-2xl animate-in zoom-in-50 slide-in-from-bottom-20 duration-500">
              <Check className="h-16 w-16 text-green-500" />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
