'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Trophy, Clock, CheckCircle, XCircle, Swords } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import type { Challenge, ChallengeQuestion } from '@/lib/types';
import { getFirebaseServices } from '@/lib/firebase';
import { doc, onSnapshot, updateDoc, serverTimestamp, addDoc, collection } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';


interface DuelModalProps {
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
    challenge: Challenge | null;
}

export function DuelModal({ isOpen, setIsOpen, challenge: initialChallenge }: DuelModalProps) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [challenge, setChallenge] = useState<Challenge | null>(initialChallenge);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [timeLeft, setTimeLeft] = useState(30); // 30 segundos por pregunta

    // Sincronizar challenge con el prop e inicializar índice
    useEffect(() => {
        if (initialChallenge && user) {
            setChallenge(initialChallenge);
            const isChallenger = initialChallenge.challengerId === user.id;
            const me = isChallenger ? initialChallenge.challenger : initialChallenge.challenged;
            // Si ya hay respuestas, continuar desde la siguiente
            if (me.answers && me.answers.length > 0) {
                setCurrentQuestionIndex(me.answers.length);
            }
        }
    }, [initialChallenge, user]);

    // Escuchar cambios en tiempo real y mantener sincronía
    useEffect(() => {
        if (!challenge?.id || !isOpen || !user) return;

        const { db } = getFirebaseServices();
        const challengeRef = doc(db, 'challenges', challenge.id);

        const unsubscribe = onSnapshot(challengeRef, (doc) => {
            if (doc.exists()) {
                const data = doc.data() as Challenge;
                const updatedChallenge = { ...data, id: doc.id };
                setChallenge(updatedChallenge);

                // Sincronizar índice con respuestas guardadas para evitar desajustes
                const isChallenger = updatedChallenge.challengerId === user.id;
                const me = isChallenger ? updatedChallenge.challenger : updatedChallenge.challenged;

                // Solo actualizar si el reto no ha terminado para este usuario
                if (!me.completedAt) {
                    setCurrentQuestionIndex(me.answers.length);
                }
            }
        });

        return () => unsubscribe();
    }, [challenge?.id, isOpen, user]);

    useEffect(() => {
        const isChallenger = challenge?.challengerId === user?.id;
        const myParticipant = isChallenger ? challenge?.challenger : challenge?.challenged;

        if (!isOpen || !challenge || myParticipant?.completedAt) return;

        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    handleSubmitAnswer(null); // Auto-submit si se acaba el tiempo
                    return 30;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [isOpen, currentQuestionIndex, challenge, user?.id]);

    if (!challenge || !user) {
        console.log('[DUEL_MODAL] No challenge or user', { challenge, user });
        return null;
    }

    if (!challenge.questions || challenge.questions.length === 0) {
        console.warn('[DUEL_MODAL] No questions in challenge');
        return (
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Error</DialogTitle>
                    </DialogHeader>
                    <p>Este duelo no tiene preguntas. Por favor, contacta al administrador.</p>
                    <Button onClick={() => setIsOpen(false)}>Cerrar</Button>
                </DialogContent>
            </Dialog>
        );
    }

    const currentQuestion = challenge.questions[currentQuestionIndex];
    const isChallenger = challenge.challengerId === user.id;
    const myParticipant = isChallenger ? challenge.challenger : challenge.challenged;
    const opponentParticipant = isChallenger ? challenge.challenged : challenge.challenger;

    const handleSubmitAnswer = async (option: string | null) => {
        if (isSubmitting) return;
        setIsSubmitting(true);

        try {
            const { db } = getFirebaseServices();
            const isCorrect = option ? currentQuestion.options.find(o => o.text === option)?.isCorrect || false : false;

            const newAnswer = {
                questionId: currentQuestion.id,
                selectedOption: option || '',
                isCorrect,
                answeredAt: new Date()
            };

            const updatedAnswers = [...myParticipant.answers, newAnswer];
            const updatedScore = myParticipant.score + (isCorrect ? 1 : 0);

            const participantField = isChallenger ? 'challenger' : 'challenged';

            await updateDoc(doc(db, 'challenges', challenge.id), {
                [`${participantField}.answers`]: updatedAnswers,
                [`${participantField}.score`]: updatedScore,
                updatedAt: serverTimestamp()
            });

            // Si es la última pregunta
            if (currentQuestionIndex >= challenge.questions.length - 1) {
                await updateDoc(doc(db, 'challenges', challenge.id), {
                    [`${participantField}.completedAt`]: serverTimestamp(),
                    updatedAt: serverTimestamp()
                });

                // Si ambos completaron, determinar ganador
                if (opponentParticipant.completedAt) {
                    const winnerId = updatedScore > opponentParticipant.score
                        ? user.id
                        : updatedScore < opponentParticipant.score
                            ? (isChallenger ? challenge.challengedId : challenge.challengerId)
                            : null;

                    await updateDoc(doc(db, 'challenges', challenge.id), {
                        status: 'completed',
                        winnerId,
                        completedAt: serverTimestamp()
                    });

                    // Determinar mensajes para cada usuario
                    const myResult = winnerId === user.id ? 'victoria' : winnerId ? 'derrota' : 'empate';
                    const opponentResult = winnerId === opponentParticipant.userId ? 'victoria' : winnerId ? 'derrota' : 'empate';

                    // Enviar notificación al oponente (que ya había terminado)
                    try {
                        const opponentTitle = opponentResult === 'victoria' ? '¡Victoria!' : opponentResult === 'derrota' ? 'Derrota' : '¡Empate!';
                        const opponentDescription = opponentResult === 'victoria'
                            ? `¡Ganaste el duelo de ${challenge.guideName}! ${opponentParticipant.score} - ${updatedScore}`
                            : opponentResult === 'derrota'
                                ? `Perdiste el duelo de ${challenge.guideName}. ${opponentParticipant.score} - ${updatedScore}`
                                : `Empate en el duelo de ${challenge.guideName}. ${opponentParticipant.score} - ${updatedScore}`;

                        await fetch('/api/notifications/send-push', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                title: opponentTitle,
                                description: opponentDescription,
                                recipientIds: [opponentParticipant.userId],
                                url: '/profile?tab=retos',
                                imageUrl: '/challenge-notification.jpg'
                            }),
                        });

                        // Notificación in-app para el oponente
                        await addDoc(collection(db, 'notifications'), {
                            title: opponentTitle,
                            description: opponentDescription,
                            message: `El duelo de ${challenge.guideName} ha finalizado`,
                            type: opponentResult === 'victoria' ? 'success' : opponentResult === 'derrota' ? 'error' : 'info',
                            recipientIds: [opponentParticipant.userId],
                            imageUrl: '/challenge-notification.jpg',
                            url: '/profile?tab=retos',
                            createdAt: serverTimestamp()
                        });
                    } catch (error) {
                        console.error('Error sending opponent notification:', error);
                    }

                    toast({
                        title: winnerId === user.id ? '¡Victoria!' : winnerId ? 'Derrota' : 'Empate',
                        description: `Puntuación final: ${updatedScore} - ${opponentParticipant.score}`
                    });

                    // No cerramos el modal aquí para mostrar los resultados
                    // setIsOpen(false); 
                }
            } else {
                setCurrentQuestionIndex(prev => prev + 1);
                setTimeLeft(30);
            }

            setSelectedOption(null);
        } catch (error) {
            console.error('Error submitting answer:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo enviar la respuesta' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const opponentProgress = ((opponentParticipant.answers?.length || 0) / challenge.questions.length) * 100;

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="w-[95vw] max-w-4xl max-h-[100vh] overflow-hidden flex flex-col p-0 gap-0 bg-slate-50 dark:bg-slate-950 rounded-lg">
                <DialogTitle className="sr-only">Duelo de Conocimiento: {challenge.guideName}</DialogTitle>

                {/* Header del Duelo */}
                <div className="bg-white dark:bg-slate-900 border-b p-4 shadow-sm z-10">
                    <div className="flex items-center justify-between gap-4">
                        {/* Jugador (Yo) */}
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="relative">
                                <Avatar className="h-12 w-12 border-2 border-blue-500 shadow-lg">
                                    <AvatarImage src={myParticipant.userAvatar} />
                                    <AvatarFallback>{myParticipant.userName.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <Badge className="absolute -bottom-2 -right-2 bg-blue-500 hover:bg-blue-600 text-[10px] px-1.5">
                                    TÚ
                                </Badge>
                            </div>
                            <div className="min-w-0">
                                <p className="font-bold truncate text-sm md:text-base">{myParticipant.userName}</p>
                                <div className="flex items-center gap-2">
                                    <Trophy className="h-4 w-4 text-amber-500" />
                                    <span className="font-bold text-lg text-blue-600">{myParticipant.score}</span>
                                </div>
                            </div>
                        </div>

                        {/* VS y Temporizador */}
                        <div className="flex flex-col items-center justify-center shrink-0">
                            <div className="text-2xl font-black text-slate-200 dark:text-slate-800 tracking-widest select-none">VS</div>
                            <Badge
                                variant={timeLeft <= 10 ? 'destructive' : 'secondary'}
                                className={`text-lg px-4 py-1 font-mono transition-all duration-300 ${timeLeft <= 5 ? 'animate-pulse scale-110' : ''}`}
                            >
                                <Clock className="h-4 w-4 mr-2" />
                                {timeLeft}s
                            </Badge>
                        </div>

                        {/* Oponente */}
                        <div className="flex items-center gap-3 flex-1 justify-end min-w-0 text-right">
                            <div className="min-w-0">
                                <p className="font-bold truncate text-sm md:text-base">{opponentParticipant.userName}</p>
                                <div className="flex items-center justify-end gap-2">
                                    <span className="font-bold text-lg text-red-600">{opponentParticipant.score}</span>
                                    <Trophy className="h-4 w-4 text-amber-500" />
                                </div>
                            </div>
                            <div className="relative">
                                <Avatar className="h-12 w-12 border-2 border-red-500 shadow-lg">
                                    <AvatarImage src={opponentParticipant.userAvatar} />
                                    <AvatarFallback>{opponentParticipant.userName.charAt(0)}</AvatarFallback>
                                </Avatar>
                                {opponentParticipant.completedAt && (
                                    <Badge className="absolute -bottom-2 -left-2 bg-green-500 text-[10px] px-1.5">
                                        FIN
                                    </Badge>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Barras de Progreso */}
                    <div className="mt-4 space-y-1">
                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                            <span>Tu progreso</span>
                            <span>Oponente</span>
                        </div>
                        <div className="relative h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            {/* Barra Oponente (Fondo) */}
                            <div
                                className="absolute top-0 left-0 h-full bg-red-200 dark:bg-red-900/30 transition-all duration-1000 ease-out"
                                style={{ width: `${opponentProgress}%` }}
                            />
                            {/* Barra Jugador (Frente) */}
                            <div
                                className="absolute top-0 left-0 h-full bg-blue-500 transition-all duration-500 ease-out"
                                style={{ width: `${((currentQuestionIndex) / challenge.questions.length) * 100}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* Área Principal: Resultados, Espera o Pregunta */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50 dark:bg-slate-950">

                    {/* CASO 1: Duelo Completado (Resultados Finales) */}
                    {(challenge.status === 'completed' || (myParticipant.completedAt && opponentParticipant.completedAt)) ? (
                        <div className="flex flex-col items-center justify-center h-full space-y-4 md:space-y-8 animate-in fade-in zoom-in duration-700 px-2">
                            <div className="relative">
                                <div className={`absolute inset-0 blur-3xl opacity-30 rounded-full animate-pulse ${challenge.winnerId === user.id ? 'bg-amber-500' : challenge.winnerId ? 'bg-red-500' : 'bg-blue-500'
                                    }`}></div>
                                {challenge.winnerId === user.id ? (
                                    <Trophy className="h-20 w-20 md:h-32 md:w-32 text-amber-500 relative z-10 drop-shadow-2xl animate-bounce" />
                                ) : challenge.winnerId ? (
                                    <XCircle className="h-20 w-20 md:h-32 md:w-32 text-red-500 relative z-10 drop-shadow-2xl" />
                                ) : (
                                    <Swords className="h-20 w-20 md:h-32 md:w-32 text-blue-500 relative z-10 drop-shadow-2xl" />
                                )}
                            </div>

                            <div className="text-center space-y-1 md:space-y-2">
                                <h3 className="text-2xl md:text-4xl font-black tracking-tight text-slate-800 dark:text-slate-100 uppercase">
                                    {challenge.winnerId === user.id ? '¡Victoria!' : challenge.winnerId ? 'Derrota' : '¡Empate!'}
                                </h3>
                                <p className="text-muted-foreground text-base md:text-xl font-medium">
                                    {challenge.winnerId === user.id ? '¡Eres el campeón!' : challenge.winnerId ? 'Mejor suerte la próxima vez.' : '¡Qué duelo tan reñido!'}
                                </p>
                                {challenge.completedAt && (
                                    <p className="text-xs md:text-sm text-muted-foreground flex items-center justify-center gap-1 md:gap-2 mt-1 md:mt-2">
                                        <Clock className="h-3 w-3 md:h-4 md:w-4" />
                                        <span className="hidden md:inline">
                                            {new Date(challenge.completedAt.toDate()).toLocaleString('es-ES', {
                                                day: '2-digit',
                                                month: 'long',
                                                year: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </span>
                                        <span className="md:hidden">
                                            {new Date(challenge.completedAt.toDate()).toLocaleString('es-ES', {
                                                day: '2-digit',
                                                month: 'short',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </span>
                                    </p>
                                )}
                            </div>

                            <div className="flex items-center justify-center gap-3 md:gap-8 w-full max-w-lg">
                                {/* Mi Resultado */}
                                <Card className={`flex-1 border-2 ${challenge.winnerId === user.id ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/10' : 'border-slate-200'}`}>
                                    <CardContent className="p-3 md:p-6 flex flex-col items-center">
                                        <Avatar className="h-12 w-12 md:h-16 md:w-16 mb-2 md:mb-3 border-2 border-slate-200">
                                            <AvatarImage src={myParticipant.userAvatar} />
                                            <AvatarFallback>{myParticipant.userName.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <p className="font-bold truncate w-full text-center mb-1 text-xs md:text-base">{myParticipant.userName}</p>
                                        <span className="text-2xl md:text-3xl font-black text-blue-600">{myParticipant.score}</span>
                                        <span className="text-[10px] md:text-xs text-muted-foreground">Puntos</span>
                                    </CardContent>
                                </Card>

                                <div className="text-lg md:text-2xl font-black text-slate-300">VS</div>

                                {/* Resultado Oponente */}
                                <Card className={`flex-1 border-2 ${challenge.winnerId === opponentParticipant.userId ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/10' : 'border-slate-200'}`}>
                                    <CardContent className="p-3 md:p-6 flex flex-col items-center">
                                        <Avatar className="h-12 w-12 md:h-16 md:w-16 mb-2 md:mb-3 border-2 border-slate-200">
                                            <AvatarImage src={opponentParticipant.userAvatar} />
                                            <AvatarFallback>{opponentParticipant.userName.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <p className="font-bold truncate w-full text-center mb-1 text-xs md:text-base">{opponentParticipant.userName}</p>
                                        <span className="text-2xl md:text-3xl font-black text-red-600">{opponentParticipant.score}</span>
                                        <span className="text-[10px] md:text-xs text-muted-foreground">Puntos</span>
                                    </CardContent>
                                </Card>
                            </div>

                            <Button size="lg" className="w-full max-w-xs font-bold text-base md:text-lg" onClick={() => setIsOpen(false)}>
                                Cerrar Duelo
                            </Button>
                        </div>
                    ) :

                        /* CASO 2: Esperando al Oponente */
                        myParticipant.completedAt ? (
                            <div className="flex flex-col items-center justify-center h-full space-y-6 animate-in fade-in zoom-in duration-500">
                                <div className="relative">
                                    <div className="absolute inset-0 bg-blue-500 blur-xl opacity-20 rounded-full animate-pulse"></div>
                                    <Clock className="h-24 w-24 text-blue-500 relative z-10 animate-spin-slow" />
                                </div>

                                <div className="text-center space-y-2">
                                    <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                                        ¡Has terminado!
                                    </h3>
                                    <p className="text-muted-foreground text-lg">
                                        Tu puntuación final: <span className="font-bold text-blue-600">{myParticipant.score} / {challenge.questions.length}</span>
                                    </p>
                                </div>

                                <Card className="w-full max-w-md border-blue-100 bg-blue-50/50 dark:bg-blue-900/10">
                                    <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
                                        <div>
                                            <p className="font-semibold text-slate-700 dark:text-slate-300 text-lg">Esperando al oponente...</p>
                                            <p className="text-sm text-muted-foreground">El resultado final aparecerá aquí automáticamente.</p>
                                        </div>
                                        <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-blue-500 animate-progress-indeterminate"
                                                style={{ width: '100%' }}
                                            />
                                        </div>
                                    </CardContent>
                                </Card>

                                <Button variant="outline" onClick={() => setIsOpen(false)}>
                                    Cerrar y esperar notificación
                                </Button>
                            </div>
                        ) :

                            /* CASO 3: Pregunta Activa */
                            currentQuestion && (
                                <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <Card className="border-none shadow-md overflow-hidden">
                                        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-1"></div>
                                        <CardContent className="p-6">
                                            <div className="flex justify-between items-start mb-4">
                                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                                    Pregunta {currentQuestionIndex + 1} / {challenge.questions.length}
                                                </Badge>
                                                <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                                                    {challenge.guideName}
                                                </span>
                                            </div>

                                            <h3 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-slate-100 leading-tight mb-6">
                                                {currentQuestion.question}
                                            </h3>

                                            {currentQuestion.imageUrl && (
                                                <div className="relative w-full h-56 md:h-64 mb-6 bg-slate-100 rounded-xl overflow-hidden border">
                                                    <Image
                                                        src={currentQuestion.imageUrl}
                                                        alt="Imagen de la pregunta"
                                                        fill
                                                        className="object-contain"
                                                        priority
                                                    />
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>

                                    {/* Opciones */}
                                    <div className="grid grid-cols-1 gap-3">
                                        {currentQuestion.options.map((option, index) => {
                                            const isSelected = selectedOption === option.text;
                                            return (
                                                <button
                                                    key={index}
                                                    onClick={() => setSelectedOption(option.text)}
                                                    disabled={isSubmitting}
                                                    className={`
                                                relative group w-full text-left p-4 rounded-xl border-2 transition-all duration-200
                                                hover:shadow-md active:scale-[0.99]
                                                ${isSelected
                                                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-sm'
                                                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-300 dark:hover:border-blue-700'
                                                        }
                                                ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}
                                            `}
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div className={`
                                                    flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm transition-colors
                                                    ${isSelected
                                                                ? 'bg-blue-500 text-white'
                                                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 group-hover:bg-blue-100 dark:group-hover:bg-blue-900'
                                                            }
                                                `}>
                                                            {String.fromCharCode(65 + index)}
                                                        </div>
                                                        <span className={`flex-1 font-medium ${isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-slate-700 dark:text-slate-300'}`}>
                                                            {option.text}
                                                        </span>
                                                        {isSelected && (
                                                            <CheckCircle className="h-6 w-6 text-blue-500 animate-in zoom-in duration-200" />
                                                        )}
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {/* Botón enviar */}
                                    <Button
                                        onClick={() => handleSubmitAnswer(selectedOption)}
                                        disabled={!selectedOption || isSubmitting}
                                        className={`
                                    w-full py-6 text-lg font-bold shadow-lg transition-all duration-300
                                    ${!selectedOption
                                                ? 'bg-slate-200 text-slate-400'
                                                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 hover:shadow-xl hover:-translate-y-0.5'
                                            }
                                `}
                                    >
                                        {isSubmitting ? (
                                            <div className="flex items-center gap-2">
                                                <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                <span>Enviando...</span>
                                            </div>
                                        ) : (
                                            'Confirmar Respuesta'
                                        )}
                                    </Button>
                                </div>
                            )}
                </div>

                {/* Banner Space at Bottom - Always visible, fixed height */}
            </DialogContent>
        </Dialog>
    );
}
