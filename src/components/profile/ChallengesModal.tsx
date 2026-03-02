'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy, Swords, Clock, CheckCircle, XCircle } from 'lucide-react';
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc, serverTimestamp, getDocs } from 'firebase/firestore';
import { getFirebaseServices } from '@/lib/firebase';
import type { User, Challenge, Guide, ChallengeStats, ChallengeQuestion } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { DuelModal } from './DuelModal';
import { BannerAd } from '@/components/ads/AdManager';

interface ChallengesModalProps {
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
    initialTab?: string;
}

export function ChallengesModal({ isOpen, setIsOpen, initialTab }: ChallengesModalProps) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [users, setUsers] = useState<User[]>([]);
    const [challenges, setChallenges] = useState<Challenge[]>([]);
    const [guides, setGuides] = useState<Guide[]>([]);
    const [stats, setStats] = useState<ChallengeStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [selectedGuide, setSelectedGuide] = useState<string>('');
    const [isChallenging, setIsChallenging] = useState(false);
    const [activeTab, setActiveTab] = useState('jugadores');
    const [activeDuel, setActiveDuel] = useState<Challenge | null>(null);
    const [isDuelModalOpen, setIsDuelModalOpen] = useState(false);

    const hasPendingChallenge = challenges.some(
        c => c.challengerId === user?.id && (c.status === 'pending' || c.status === 'in_progress')
    );

    const hasActiveChallenge = challenges.some(
        c => (c.challengerId === user?.id || c.challengedId === user?.id) &&
            (c.status === 'pending' || c.status === 'in_progress' || c.status === 'accepted')
    );

    useEffect(() => {
        if (!user || !isOpen) return;

        const { db } = getFirebaseServices();

        const usersQuery = query(collection(db, 'users'));
        const unsubUsers = onSnapshot(usersQuery, (snapshot) => {
            const usersData = snapshot.docs
                .map(doc => ({ ...doc.data(), id: doc.id } as User))
                .filter(u => u.id !== user.id);
            setUsers(usersData);
        });

        const challengesQuery = query(
            collection(db, 'challenges'),
            where('participants', 'array-contains', user.id)
        );
        const unsubChallenges = onSnapshot(challengesQuery, (snapshot) => {
            const challengesData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Challenge));
            setChallenges(challengesData);
            setIsLoading(false);
        });

        const guidesQuery = query(collection(db, 'guides'), where('isActive', '==', true));
        const unsubGuides = onSnapshot(guidesQuery, (snapshot) => {
            const guidesData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Guide));
            setGuides(guidesData);
        });

        return () => {
            unsubUsers();
            unsubChallenges();
            unsubGuides();
        };
    }, [user, isOpen]);

    useEffect(() => {
        if (!user) return;

        const checkExpiredChallenges = async () => {
            const { db } = getFirebaseServices();
            const now = new Date();

            for (const challenge of challenges) {
                if (challenge.status === 'pending' && challenge.expiresAt) {
                    const expiresAt = challenge.expiresAt.toDate();
                    if (now > expiresAt) {
                        await updateDoc(doc(db, 'challenges', challenge.id), {
                            status: 'expired',
                            updatedAt: serverTimestamp()
                        });
                    }
                }
            }
        };

        const interval = setInterval(checkExpiredChallenges, 30000);
        return () => clearInterval(interval);
    }, [challenges, user]);

    const sendChallenge = async () => {
        if (!user || !selectedUser || !selectedGuide || hasPendingChallenge) return;

        setIsChallenging(true);
        try {
            const { db } = getFirebaseServices();
            const guide = guides.find(g => g.id === selectedGuide);

            if (!guide) {
                toast({ variant: 'destructive', title: 'Error', description: 'Guía no encontrada' });
                return;
            }

            // Obtener preguntas del banco para esta guía
            const questionsQuery = query(
                collection(db, 'challengeQuestions'),
                where('guideId', '==', guide.id),
                where('isActive', '==', true)
            );

            const questionsSnapshot = await getDocs(questionsQuery);
            const availableQuestions = questionsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            if (availableQuestions.length < 5) {
                toast({
                    variant: 'destructive',
                    title: 'Error',
                    description: `No hay suficientes preguntas para esta guía. Se necesitan al menos 5 preguntas. (Disponibles: ${availableQuestions.length})`
                });
                return;
            }

            // Seleccionar 10 preguntas aleatorias (o todas si hay menos de 10)
            const numQuestions = Math.min(10, availableQuestions.length);
            const shuffled = [...availableQuestions].sort(() => 0.5 - Math.random());
            const selectedQuestions = shuffled.slice(0, numQuestions);


            // Formatear preguntas para el reto
            const questions: ChallengeQuestion[] = selectedQuestions.map((q: any) => {
                const question: any = {
                    id: q.id,
                    question: q.question,
                    options: q.options,
                    subject: guide.title
                };

                // Solo agregar imageUrl si existe
                if (q.imageUrl) {
                    question.imageUrl = q.imageUrl;
                }

                return question;
            });

            const now = new Date();
            const expiresAt = new Date(now.getTime() + 10 * 60 * 1000);

            const challengeRef = await addDoc(collection(db, 'challenges'), {
                challengerId: user.id,
                challengerName: user.name,
                challengerAvatar: user.avatar,
                challengedId: selectedUser.id,
                challengedName: selectedUser.name,
                challengedAvatar: selectedUser.avatar,
                status: 'pending',
                guideId: guide.id,
                guideName: guide.title,
                questions,
                challenger: {
                    userId: user.id,
                    userName: user.name,
                    userAvatar: user.avatar,
                    answers: [],
                    score: 0
                },
                challenged: {
                    userId: selectedUser.id,
                    userName: selectedUser.name,
                    userAvatar: selectedUser.avatar,
                    answers: [],
                    score: 0
                },
                createdAt: serverTimestamp(),
                expiresAt: expiresAt,
                participants: [user.id, selectedUser.id]
            });

            // Enviar notificación push al usuario desafiado
            try {
                await fetch('/api/notifications/send-push', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        title: '¡Nuevo Reto!',
                        description: `${user.name} te ha desafiado a un duelo de ${guide.title}.`,
                        recipientIds: [selectedUser.id],
                        url: '/profile?tab=retos', // Redirigir a la pestaña de retos
                        imageUrl: '/challenge-notification.jpg'
                    }),
                });
            } catch (error) {
                console.error('Error sending push notification:', error);
                // No bloqueamos el flujo si falla la notificación
            }

            await addDoc(collection(db, 'notifications'), {
                title: '¡Te han retado!',
                description: `${user.name} te ha retado a un duelo de conocimiento`,
                message: `Tienes 10 minutos para aceptar el reto sobre ${guide.title}`,
                type: 'info',
                recipientIds: [selectedUser.id],
                imageUrl: '/challenge-notification.jpg',
                url: '/profile?tab=retos',
                createdAt: serverTimestamp()
            });

            toast({
                title: 'Reto enviado',
                description: `Has retado a ${selectedUser.name} con ${questions.length} preguntas. Esperando respuesta...`
            });

            setSelectedUser(null);
            setSelectedGuide('');
            setActiveTab('retos');
        } catch (error) {
            console.error('Error sending challenge:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo enviar el reto' });
        } finally {
            setIsChallenging(false);
        }
    };

    const acceptChallenge = async (challengeId: string) => {
        try {
            const { db } = getFirebaseServices();
            const challenge = challenges.find(c => c.id === challengeId);

            if (!challenge) {
                toast({ variant: 'destructive', title: 'Error', description: 'Reto no encontrado' });
                return;
            }

            await updateDoc(doc(db, 'challenges', challengeId), {
                status: 'accepted',
                acceptedAt: serverTimestamp()
            });

            // Enviar notificación push al usuario que envió el reto
            try {
                await fetch('/api/notifications/send-push', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        title: '¡Reto Aceptado!',
                        description: `${user?.name} ha aceptado tu reto de ${challenge.guideName}.`,
                        recipientIds: [challenge.challengerId],
                        url: '/profile?tab=retos',
                        imageUrl: '/challenge-notification.jpg'
                    }),
                });
            } catch (error) {
                console.error('Error sending push notification:', error);
            }

            // Enviar notificación in-app
            await addDoc(collection(db, 'notifications'), {
                title: '¡Reto Aceptado!',
                description: `${user?.name} ha aceptado tu reto`,
                message: `El duelo de ${challenge.guideName} está listo para comenzar`,
                type: 'success',
                recipientIds: [challenge.challengerId],
                imageUrl: '/challenge-notification.jpg',
                url: '/profile?tab=retos',
                createdAt: serverTimestamp()
            });

            toast({ title: 'Reto aceptado', description: 'El duelo comenzará pronto' });
        } catch (error) {
            console.error('Error accepting challenge:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo aceptar el reto' });
        }
    };

    const rejectChallenge = async (challengeId: string) => {
        try {
            const { db } = getFirebaseServices();
            const challenge = challenges.find(c => c.id === challengeId);

            if (!challenge) {
                toast({ variant: 'destructive', title: 'Error', description: 'Reto no encontrado' });
                return;
            }

            await updateDoc(doc(db, 'challenges', challengeId), {
                status: 'rejected',
                updatedAt: serverTimestamp()
            });

            // Enviar notificación push al usuario que envió el reto
            try {
                await fetch('/api/notifications/send-push', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        title: 'Reto Rechazado',
                        description: `${user?.name} ha rechazado tu reto de ${challenge.guideName}.`,
                        recipientIds: [challenge.challengerId],
                        url: '/profile?tab=retos',
                        imageUrl: '/challenge-notification.jpg'
                    }),
                });
            } catch (error) {
                console.error('Error sending push notification:', error);
            }

            // Enviar notificación in-app
            await addDoc(collection(db, 'notifications'), {
                title: 'Reto Rechazado',
                description: `${user?.name} ha rechazado tu reto`,
                message: `El reto de ${challenge.guideName} no fue aceptado`,
                type: 'warning',
                recipientIds: [challenge.challengerId],
                imageUrl: '/challenge-notification.jpg',
                url: '/profile?tab=retos',
                createdAt: serverTimestamp()
            });

            toast({ title: 'Reto rechazado' });
        } catch (error) {
            console.error('Error rejecting challenge:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo rechazar el reto' });
        }
    };

    const startDuel = async (challengeId: string) => {
        console.log('[DUEL] startDuel called with ID:', challengeId);
        try {
            const { db } = getFirebaseServices();
            const challenge = challenges.find(c => c.id === challengeId);

            console.log('[DUEL] Challenge found:', challenge);

            if (!challenge) {
                toast({ variant: 'destructive', title: 'Error', description: 'Reto no encontrado' });
                return;
            }

            // Verificar si hay preguntas
            if (!challenge.questions || challenge.questions.length === 0) {
                console.warn('[DUEL] No questions in challenge');
                toast({
                    variant: 'destructive',
                    title: 'Error',
                    description: 'Este reto no tiene preguntas aún. Las preguntas se generarán automáticamente.'
                });
                return;
            }

            console.log('[DUEL] Updating challenge status to in_progress');
            await updateDoc(doc(db, 'challenges', challengeId), {
                status: 'in_progress',
                updatedAt: serverTimestamp()
            });

            console.log('[DUEL] Opening duel modal');
            setActiveDuel(challenge);
            setIsDuelModalOpen(true);
            setIsOpen(false);
        } catch (error) {
            console.error('[DUEL] Error starting duel:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo iniciar el duelo' });
        }
    };

    const cancelChallenge = async (challengeId: string) => {
        try {
            const { db } = getFirebaseServices();
            await updateDoc(doc(db, 'challenges', challengeId), {
                status: 'cancelled',
                updatedAt: serverTimestamp()
            });

            toast({ title: 'Reto cancelado' });
        } catch (error) {
            console.error('Error cancelling challenge:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo cancelar el reto' });
        }
    };

    useEffect(() => {
        if (hasActiveChallenge) {
            setActiveTab('retos');
        } else if (initialTab) {
            setActiveTab(initialTab);
        } else {
            setActiveTab('jugadores');
        }
    }, [hasActiveChallenge, initialTab, isOpen]);


    if (!user) return null;

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="w-[95vw] max-w-4xl max-h-[85vh] overflow-hidden flex flex-col rounded-lg p-0">
                <DialogHeader className="px-6 pt-6 pb-0">
                    <DialogTitle>Retos</DialogTitle>
                </DialogHeader>

                {/* Scrollable Content Area */}
                <div className="flex-1 overflow-hidden flex flex-col px-6">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex-1 flex flex-col overflow-hidden">
                        <TabsList className={`grid w-full gap-1 h-auto ${hasActiveChallenge ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3'}`}>
                            {hasActiveChallenge && (
                                <TabsTrigger value="retos" className="text-xs sm:text-sm">
                                    Retos
                                    <Badge variant="destructive" className="ml-1 h-4 w-4 p-0 flex items-center justify-center text-[10px]">!</Badge>
                                </TabsTrigger>
                            )}
                            <TabsTrigger value="ranking" className="text-xs sm:text-sm">Ranking</TabsTrigger>
                            <TabsTrigger value="jugadores" className="text-xs sm:text-sm">Jugadores</TabsTrigger>
                            <TabsTrigger value="historial" className="text-xs sm:text-sm">Historial</TabsTrigger>
                        </TabsList>

                        <div className="flex-1 overflow-y-auto mt-4">
                            {hasActiveChallenge && (
                                <TabsContent value="retos" className="m-0">
                                    <div className="space-y-4 p-1">
                                        {challenges
                                            .filter(c =>
                                                (c.challengerId === user.id || c.challengedId === user.id) &&
                                                ['pending', 'accepted', 'in_progress'].includes(c.status)
                                            )
                                            .map(challenge => (
                                                <Card key={challenge.id}>
                                                    <CardContent className="p-4">
                                                        <div className="flex items-center justify-between flex-wrap gap-3">
                                                            <div className="flex items-center gap-3">
                                                                <Avatar>
                                                                    <AvatarImage src={
                                                                        challenge.challengerId === user.id
                                                                            ? challenge.challengedAvatar
                                                                            : challenge.challengerAvatar
                                                                    } />
                                                                    <AvatarFallback>
                                                                        {(challenge.challengerId === user.id
                                                                            ? challenge.challengedName
                                                                            : challenge.challengerName
                                                                        ).charAt(0)}
                                                                    </AvatarFallback>
                                                                </Avatar>
                                                                <div>
                                                                    <p className="font-semibold text-sm">
                                                                        {challenge.challengerId === user.id
                                                                            ? `Retaste a ${challenge.challengedName}`
                                                                            : `${challenge.challengerName} te retó`}
                                                                    </p>
                                                                    <p className="text-xs text-muted-foreground">{challenge.guideName}</p>
                                                                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                                        <Clock className="h-3 w-3" />
                                                                        {challenge.createdAt ? formatDistanceToNow(challenge.createdAt.toDate(), { addSuffix: true, locale: es }) : 'Reciente'}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <div className="flex gap-2 flex-wrap">
                                                                {challenge.challengedId === user.id && challenge.status === 'pending' && (
                                                                    <>
                                                                        <Button size="sm" onClick={() => acceptChallenge(challenge.id)}>
                                                                            <CheckCircle className="h-4 w-4 mr-1" />
                                                                            Aceptar
                                                                        </Button>
                                                                        <Button size="sm" variant="outline" onClick={() => rejectChallenge(challenge.id)}>
                                                                            <XCircle className="h-4 w-4 mr-1" />
                                                                            Rechazar
                                                                        </Button>
                                                                    </>
                                                                )}
                                                                {challenge.challengerId === user.id && challenge.status === 'pending' && (
                                                                    <Button size="sm" variant="destructive" onClick={() => cancelChallenge(challenge.id)}>
                                                                        <XCircle className="h-4 w-4 mr-1" />
                                                                        Cancelar Reto
                                                                    </Button>
                                                                )}
                                                                {challenge.status === 'accepted' && (
                                                                    <>
                                                                        <Button size="sm" onClick={() => startDuel(challenge.id)}>
                                                                            <Swords className="h-4 w-4 mr-1" />
                                                                            Comenzar Duelo
                                                                        </Button>
                                                                        <Button size="sm" variant="destructive" onClick={() => cancelChallenge(challenge.id)}>
                                                                            <XCircle className="h-4 w-4 mr-1" />
                                                                            Cancelar
                                                                        </Button>
                                                                    </>
                                                                )}
                                                                {challenge.status === 'in_progress' && (
                                                                    <>
                                                                        <Button size="sm" variant="default" onClick={() => {
                                                                            console.log('[DUEL] Continue duel clicked', challenge);
                                                                            setActiveDuel(challenge);
                                                                            setIsDuelModalOpen(true);
                                                                            console.log('[DUEL] Modal state set to open');
                                                                        }}>
                                                                            <Swords className="h-4 w-4 mr-1" />
                                                                            Continuar Duelo
                                                                        </Button>
                                                                        <Button size="sm" variant="destructive" onClick={() => cancelChallenge(challenge.id)}>
                                                                            <XCircle className="h-4 w-4 mr-1" />
                                                                            Cancelar Duelo
                                                                        </Button>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            ))}
                                    </div>
                                </TabsContent>
                            )}

                            <TabsContent value="ranking" className="m-0">
                                <div className="space-y-3 p-1">
                                    {(() => {
                                        // Calcular estadísticas para todos los usuarios
                                        const userStats = new Map<string, {
                                            userId: string;
                                            userName: string;
                                            userAvatar: string;
                                            wins: number;
                                            losses: number;
                                            draws: number;
                                            total: number;
                                            winRate: number;
                                        }>();

                                        // Inicializar stats para el usuario actual
                                        if (user) {
                                            userStats.set(user.id, {
                                                userId: user.id,
                                                userName: user.name,
                                                userAvatar: user.avatar,
                                                wins: 0,
                                                losses: 0,
                                                draws: 0,
                                                total: 0,
                                                winRate: 0
                                            });
                                        }

                                        // Procesar todos los duelos completados
                                        challenges
                                            .filter(c => c.status === 'completed')
                                            .forEach(challenge => {
                                                // Procesar challenger
                                                if (!userStats.has(challenge.challengerId)) {
                                                    userStats.set(challenge.challengerId, {
                                                        userId: challenge.challengerId,
                                                        userName: challenge.challengerName,
                                                        userAvatar: challenge.challengerAvatar,
                                                        wins: 0,
                                                        losses: 0,
                                                        draws: 0,
                                                        total: 0,
                                                        winRate: 0
                                                    });
                                                }

                                                // Procesar challenged
                                                if (!userStats.has(challenge.challengedId)) {
                                                    userStats.set(challenge.challengedId, {
                                                        userId: challenge.challengedId,
                                                        userName: challenge.challengedName,
                                                        userAvatar: challenge.challengedAvatar,
                                                        wins: 0,
                                                        losses: 0,
                                                        draws: 0,
                                                        total: 0,
                                                        winRate: 0
                                                    });
                                                }

                                                const challengerStats = userStats.get(challenge.challengerId)!;
                                                const challengedStats = userStats.get(challenge.challengedId)!;

                                                // Actualizar estadísticas
                                                if (!challenge.winnerId) {
                                                    // Empate
                                                    challengerStats.draws++;
                                                    challengedStats.draws++;
                                                } else if (challenge.winnerId === challenge.challengerId) {
                                                    // Ganó el challenger
                                                    challengerStats.wins++;
                                                    challengedStats.losses++;
                                                } else {
                                                    // Ganó el challenged
                                                    challengedStats.wins++;
                                                    challengerStats.losses++;
                                                }

                                                challengerStats.total++;
                                                challengedStats.total++;
                                            });

                                        // Calcular win rate
                                        userStats.forEach(stats => {
                                            if (stats.total > 0) {
                                                stats.winRate = (stats.wins / stats.total) * 100;
                                            }
                                        });

                                        // Convertir a array y ordenar por victorias, luego por win rate
                                        const rankedUsers = Array.from(userStats.values())
                                            .filter(stats => stats.total > 0) // Solo usuarios con duelos
                                            .sort((a, b) => {
                                                if (b.wins !== a.wins) return b.wins - a.wins;
                                                return b.winRate - a.winRate;
                                            });

                                        if (rankedUsers.length === 0) {
                                            return (
                                                <p className="text-muted-foreground text-sm text-center py-8">
                                                    No hay estadísticas de duelos aún. ¡Completa tu primer duelo para aparecer en el ranking!
                                                </p>
                                            );
                                        }

                                        return rankedUsers.map((stats, index) => (
                                            <Card key={stats.userId} className={stats.userId === user?.id ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/10' : ''}>
                                                <CardContent className="p-3">
                                                    <div className="flex items-center gap-3">
                                                        {/* Posición */}
                                                        <div className="flex items-center justify-center w-10 h-10 rounded-full font-bold text-lg shrink-0"
                                                            style={{
                                                                background: index === 0 ? 'linear-gradient(135deg, #FFD700, #FFA500)' :
                                                                    index === 1 ? 'linear-gradient(135deg, #C0C0C0, #808080)' :
                                                                        index === 2 ? 'linear-gradient(135deg, #CD7F32, #8B4513)' :
                                                                            'transparent',
                                                                color: index < 3 ? 'white' : 'inherit',
                                                                border: index >= 3 ? '2px solid currentColor' : 'none'
                                                            }}
                                                        >
                                                            {index + 1}
                                                        </div>

                                                        {/* Avatar y Nombre */}
                                                        <Avatar className="h-12 w-12">
                                                            <AvatarImage src={stats.userAvatar} />
                                                            <AvatarFallback>{stats.userName.charAt(0)}</AvatarFallback>
                                                        </Avatar>

                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <p className="font-semibold text-sm truncate">
                                                                    {stats.userName}
                                                                </p>
                                                                {stats.userId === user?.id && (
                                                                    <Badge variant="outline" className="text-xs">Tú</Badge>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                                                                <span className="flex items-center gap-1">
                                                                    <Trophy className="h-3 w-3 text-green-500" />
                                                                    {stats.wins}
                                                                </span>
                                                                <span className="flex items-center gap-1">
                                                                    <XCircle className="h-3 w-3 text-red-500" />
                                                                    {stats.losses}
                                                                </span>
                                                                <span className="flex items-center gap-1">
                                                                    <Swords className="h-3 w-3 text-blue-500" />
                                                                    {stats.draws}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {/* Estadísticas */}
                                                        <div className="text-right">
                                                            <div className="text-lg font-bold text-blue-600">
                                                                {stats.winRate.toFixed(0)}%
                                                            </div>
                                                            <div className="text-xs text-muted-foreground">
                                                                {stats.total} duelos
                                                            </div>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ));
                                    })()}
                                </div>
                            </TabsContent>

                            <TabsContent value="jugadores" className="m-0">
                                <div className="space-y-3 p-1">
                                    {isLoading ? (
                                        Array.from({ length: 5 }).map((_, i) => (
                                            <Card key={i}>
                                                <CardContent className="p-3">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <Skeleton className="h-10 w-10 rounded-full" />
                                                            <Skeleton className="h-4 w-32" />
                                                        </div>
                                                        <Skeleton className="h-9 w-20" />
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))
                                    ) : (
                                        users.map(u => (
                                            <Card key={u.id}>
                                                <CardContent className="p-3">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <Avatar>
                                                                <AvatarImage src={u.avatar} />
                                                                <AvatarFallback>{u.name.charAt(0)}</AvatarFallback>
                                                            </Avatar>
                                                            <div>
                                                                <p className="font-semibold text-sm">{u.name}</p>
                                                                {u.examType && (
                                                                    <p className="text-xs text-muted-foreground">{u.examType}</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <Button
                                                            size="sm"
                                                            onClick={() => setSelectedUser(u)}
                                                            disabled={hasPendingChallenge}
                                                        >
                                                            <Swords className="h-4 w-4 mr-1" />
                                                            Retar
                                                        </Button>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))
                                    )}
                                </div>
                            </TabsContent>

                            <TabsContent value="historial" className="m-0">
                                <div className="space-y-3 p-1">
                                    {challenges
                                        .filter(c => c.status === 'completed')
                                        .sort((a, b) => {
                                            const aTime = a.completedAt?.toDate?.()?.getTime() || 0;
                                            const bTime = b.completedAt?.toDate?.()?.getTime() || 0;
                                            return bTime - aTime; // Más reciente primero
                                        })
                                        .map(challenge => (
                                            <Card
                                                key={challenge.id}
                                                className="cursor-pointer hover:bg-accent transition-colors"
                                                onClick={() => {
                                                    setActiveDuel(challenge);
                                                    setIsDuelModalOpen(true);
                                                }}
                                            >
                                                <CardContent className="p-3">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <Avatar>
                                                                <AvatarImage src={
                                                                    challenge.challengerId === user.id
                                                                        ? challenge.challengedAvatar
                                                                        : challenge.challengerAvatar
                                                                } />
                                                                <AvatarFallback>
                                                                    {(challenge.challengerId === user.id
                                                                        ? challenge.challengedName
                                                                        : challenge.challengerName
                                                                    ).charAt(0)}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                            <div>
                                                                <p className="font-semibold text-sm">
                                                                    vs {challenge.challengerId === user.id
                                                                        ? challenge.challengedName
                                                                        : challenge.challengerName}
                                                                </p>
                                                                <p className="text-xs text-muted-foreground">{challenge.guideName}</p>
                                                                {challenge.completedAt && (
                                                                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                                                        <Clock className="h-3 w-3" />
                                                                        {formatDistanceToNow(challenge.completedAt.toDate(), { addSuffix: true, locale: es })}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            {challenge.winnerId === user.id && (
                                                                <Badge variant="default" className="bg-green-500">
                                                                    <Trophy className="h-3 w-3 mr-1" />
                                                                    Victoria
                                                                </Badge>
                                                            )}
                                                            {challenge.winnerId && challenge.winnerId !== user.id && (
                                                                <Badge variant="destructive">Derrota</Badge>
                                                            )}
                                                            {!challenge.winnerId && (
                                                                <Badge variant="secondary">Empate</Badge>
                                                            )}
                                                            <p className="text-xs text-muted-foreground mt-1">
                                                                {challenge.challenger.score} - {challenge.challenged.score}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    {challenges.filter(c => c.status === 'completed').length === 0 && (
                                        <p className="text-muted-foreground text-sm text-center py-8">
                                            No has completado ningún reto aún
                                        </p>
                                    )}
                                </div>
                            </TabsContent>
                        </div>
                    </Tabs>
                </div>
            </DialogContent>

            <Dialog open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Retar a {selectedUser?.name}</DialogTitle>
                        <DialogDescription>
                            Selecciona una guía para el duelo de conocimiento
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <Select value={selectedGuide} onValueChange={setSelectedGuide}>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecciona una guía" />
                            </SelectTrigger>
                            <SelectContent>
                                {guides.map(guide => (
                                    <SelectItem key={guide.id} value={guide.id}>
                                        {guide.title}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="text-sm text-muted-foreground">
                            El reto consistirá en 10 preguntas sobre esta guía.
                            {selectedUser?.name} tendrá 10 minutos para aceptar.
                        </p>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSelectedUser(null)}>
                            Cancelar
                        </Button>
                        <Button
                            onClick={sendChallenge}
                            disabled={!selectedGuide || isChallenging}
                        >
                            {isChallenging ? 'Enviando...' : 'Enviar Reto'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <DuelModal
                isOpen={isDuelModalOpen}
                setIsOpen={setIsDuelModalOpen}
                challenge={activeDuel}
            />
        </Dialog >
    );
}
