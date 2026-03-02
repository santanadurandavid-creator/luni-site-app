'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ClipboardCheck, Trophy, Target, RefreshCcw } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
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

export function QuizzesCompletedCard() {
    const { user, resetQuizzesCompleted } = useAuth();
    const { t } = useLanguage();
    const [showConfirm, setShowConfirm] = useState(false);

    if (!user) return null;

    const handleConfirmReset = async () => {
        await resetQuizzesCompleted();
        setShowConfirm(false);
    };

    const quizzesCompleted = user.quizzesCompleted || 0;

    // Calculate high-performing quizzes (above 90% or 900 points minimum)
    const highPerformingQuizzes = user.examResults?.filter(result => {
        // Calculate percentage if not already available
        const percentage = result.score >= 900 ? 90 : (result.score / 10); // Assuming score is out of 1000
        return percentage >= 90;
    }).length || 0;

    return (
        <>
            <Card className="h-full shadow-sm hover:shadow-md transition-all duration-300 border-0 bg-gradient-to-br from-primary/5 via-card to-primary/10 hover:from-primary/10 hover:via-card/50 hover:to-primary/15 group">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                        {t('quizzesCompleted')}
                    </CardTitle>
                    <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary" onClick={() => setShowConfirm(true)} title="Reiniciar contador">
                            <RefreshCcw className="h-3 w-3" />
                        </Button>
                        <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                            <ClipboardCheck className="h-4 w-4 text-primary" />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-3">
                    {/* Total quizzes */}
                    <div className="space-y-1">
                        <div className="text-2xl font-bold font-headline text-primary group-hover:scale-105 transition-transform duration-200">
                            {quizzesCompleted}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {t('totalQuizzesCompleted')}
                        </p>
                    </div>

                    {/* High performing quizzes */}
                    {highPerformingQuizzes > 0 && (
                        <div className="space-y-1 pt-2 border-t border-primary/20">
                            <div className="flex items-center gap-2">
                                <Trophy className="h-4 w-4 text-yellow-500" />
                                <div className="text-lg font-bold font-headline text-yellow-600 group-hover:scale-105 transition-transform duration-200">
                                    {highPerformingQuizzes}
                                </div>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Con 90%+ de calificación
                            </p>
                        </div>
                    )}

                    {/* Performance indicator */}
                    <div className="flex items-center justify-between pt-2">
                        <div className="flex items-center gap-1">
                            <Target className="h-3 w-3 text-muted-foreground" />

                        </div>
                        <span className="text-xs text-muted-foreground">
                            Éxito
                        </span>
                    </div>

                    {/* Motivational message */}
                    {quizzesCompleted === 0 && (
                        <div className="text-center p-2 rounded-lg bg-primary/5 border border-primary/10">
                            <p className="text-xs text-primary font-medium">
                                ¡Comienza tu primer examen!
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>

            <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
                <AlertDialogContent className="rounded-2xl max-w-[85%] sm:max-w-md border-border bg-card">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="font-headline text-lg">¿Reiniciar Contador de Quizzes?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción pondrá tu contador de quizzes completados a cero.
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
