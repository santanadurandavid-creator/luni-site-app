'use client';

import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";


import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, RefreshCcw, Lightbulb } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';

function formatStudyTime(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

function getStudyLevel(totalHours: number): string {
  if (totalHours < 2) return 'novato';
  if (totalHours < 6) return 'intermedio';
  return 'sayajin';
}

export function StudyTimeCard() {
  const { user, resetStudyTime } = useAuth();
  const { t } = useLanguage();
  const [showConfirm, setShowConfirm] = useState(false);
  const [showLevelInfo, setShowLevelInfo] = useState(false);

  if (!user) return null;

  const handleConfirmReset = async () => {
    await resetStudyTime();
    setShowConfirm(false);
  };

  const totalStudyTime = Object.values(user.studyTime || {}).reduce((acc, time) => acc + time, 0);
  const totalHours = Math.floor(totalStudyTime / 3600);
  const level = getStudyLevel(totalHours);

  return (
    <>
      <Card
        className="h-full shadow-sm hover:shadow-md transition-all duration-300 border-0 bg-gradient-to-br from-primary/5 via-card to-primary/10 hover:from-primary/10 hover:via-card/50 hover:to-primary/15 group cursor-pointer"
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
            {t('studyTime')}
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary" onClick={(e) => { e.stopPropagation(); setShowConfirm(true); }} title="Reiniciar tiempo">
              <RefreshCcw className="h-3 w-3" />
            </Button>
            <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
              <Clock className="h-4 w-4 text-primary" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <div className="text-2xl font-bold font-headline text-primary group-hover:scale-105 transition-transform duration-200">
              {formatStudyTime(totalStudyTime)}
            </div>
            <p className="text-xs text-muted-foreground">
              {t('totalTimeSpent')}
            </p>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <div className="text-sm font-medium text-blue-600 group-hover:scale-105 transition-transform duration-200 uppercase tracking-wide">
              {t(level)}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 p-0"
              onClick={(e) => { e.stopPropagation(); setShowLevelInfo(true); }}
            >
              <Lightbulb className="h-3 w-3 fill-current" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showLevelInfo} onOpenChange={setShowLevelInfo}>
        <AlertDialogContent className="rounded-3xl max-w-[90%] sm:max-w-sm border-0 bg-background/95 backdrop-blur-xl shadow-2xl">
          <AlertDialogHeader>
            <div className="mx-auto p-3 rounded-2xl bg-blue-500/10 text-blue-600 w-fit mb-2">
              <Lightbulb className="h-8 w-8 animate-pulse" />
            </div>
            <AlertDialogTitle className="font-headline text-xl text-center">Niveles de Estudio</AlertDialogTitle>
            <AlertDialogDescription className="text-center space-y-4 pt-2" asChild>
              <div className="text-center space-y-4 pt-2">
                <div className="grid gap-3">
                  <div className="p-3 rounded-2xl bg-blue-50 border border-blue-100 flex flex-col items-center">
                    <span className="font-black text-blue-600 uppercase tracking-tighter">Novato</span>
                    <span className="text-xs font-semibold text-blue-400">Menos de 2 horas</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-purple-50 border border-purple-100 flex flex-col items-center">
                    <span className="font-black text-purple-600 uppercase tracking-tighter">Intermedio</span>
                    <span className="text-xs font-semibold text-purple-400">Entre 2 y 6 horas</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-orange-50 border border-orange-100 flex flex-col items-center">
                    <span className="font-black text-orange-600 uppercase tracking-tighter">Sayajin</span>
                    <span className="text-xs font-semibold text-orange-400">Más de 6 horas</span>
                  </div>
                </div>
                <p className="text-[11px] font-medium opacity-70">
                  ¡Sigue dedicando tiempo a tus estudios para alcanzar el máximo nivel de concentración!
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center pt-2">
            <AlertDialogAction className="bg-blue-600 hover:bg-blue-700 text-white rounded-2xl px-8 font-black uppercase tracking-widest text-[10px] h-10">
              ¡Entendido!
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent className="rounded-2xl max-w-[85%] sm:max-w-md border-border bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-headline text-lg">¿Reiniciar Tiempo de Estudio?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Tu contador de horas volverá a cero.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmReset} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl">
              Sí, Reiniciar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
