'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Trophy, Swords, Plus, Edit, Trash2, Users } from 'lucide-react';
import { getFirebaseServices } from '@/lib/firebase';
import { collection, query, onSnapshot, orderBy, limit, where } from 'firebase/firestore';
import type { Challenge, User } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChallengeQuestionFormModal } from '@/components/admin/ChallengeQuestionFormModal';

interface ChallengeStats {
    userId: string;
    userName: string;
    userAvatar: string;
    wins: number;
    losses: number;
    draws: number;
    totalChallenges: number;
    winRate: number;
}

export default function AdminChallengesPage() {
    const [challenges, setChallenges] = useState<Challenge[]>([]);
    const [stats, setStats] = useState<ChallengeStats[]>([]);
    const [questions, setQuestions] = useState<any[]>([]);
    const [guides, setGuides] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);

    useEffect(() => {
        const { db } = getFirebaseServices();

        // Obtener todos los retos
        const challengesQuery = query(
            collection(db, 'challenges'),
            orderBy('createdAt', 'desc'),
            limit(100)
        );

        const unsubChallenges = onSnapshot(challengesQuery, (snapshot) => {
            const challengesData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Challenge));
            setChallenges(challengesData);
            calculateStats(challengesData);
            setIsLoading(false);
        });

        // Obtener preguntas del banco
        const questionsQuery = query(
            collection(db, 'challengeQuestions'),
            orderBy('createdAt', 'desc')
        );

        const unsubQuestions = onSnapshot(questionsQuery, (snapshot) => {
            const questionsData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
            setQuestions(questionsData);
        });

        // Obtener guías
        const guidesQuery = query(collection(db, 'guides'));
        const unsubGuides = onSnapshot(guidesQuery, (snapshot) => {
            const guidesData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
            setGuides(guidesData);
        });

        return () => {
            unsubChallenges();
            unsubQuestions();
            unsubGuides();
        };
    }, []);

    const calculateStats = (challengesData: Challenge[]) => {
        const userStatsMap = new Map<string, ChallengeStats>();

        challengesData
            .filter(c => c.status === 'completed')
            .forEach(challenge => {
                // Procesar retador
                if (!userStatsMap.has(challenge.challengerId)) {
                    userStatsMap.set(challenge.challengerId, {
                        userId: challenge.challengerId,
                        userName: challenge.challengerName,
                        userAvatar: challenge.challengerAvatar,
                        wins: 0,
                        losses: 0,
                        draws: 0,
                        totalChallenges: 0,
                        winRate: 0
                    });
                }

                // Procesar retado
                if (!userStatsMap.has(challenge.challengedId)) {
                    userStatsMap.set(challenge.challengedId, {
                        userId: challenge.challengedId,
                        userName: challenge.challengedName,
                        userAvatar: challenge.challengedAvatar,
                        wins: 0,
                        losses: 0,
                        draws: 0,
                        totalChallenges: 0,
                        winRate: 0
                    });
                }

                const challengerStats = userStatsMap.get(challenge.challengerId)!;
                const challengedStats = userStatsMap.get(challenge.challengedId)!;

                challengerStats.totalChallenges++;
                challengedStats.totalChallenges++;

                if (!challenge.winnerId) {
                    // Empate
                    challengerStats.draws++;
                    challengedStats.draws++;
                } else if (challenge.winnerId === challenge.challengerId) {
                    // Ganó el retador
                    challengerStats.wins++;
                    challengedStats.losses++;
                } else {
                    // Ganó el retado
                    challengerStats.losses++;
                    challengedStats.wins++;
                }

                // Calcular win rate
                challengerStats.winRate = challengerStats.totalChallenges > 0
                    ? (challengerStats.wins / challengerStats.totalChallenges) * 100
                    : 0;
                challengedStats.winRate = challengedStats.totalChallenges > 0
                    ? (challengedStats.wins / challengedStats.totalChallenges) * 100
                    : 0;
            });

        const statsArray = Array.from(userStatsMap.values())
            .sort((a, b) => b.winRate - a.winRate);

        setStats(statsArray);
    };

    const getStatusBadge = (status: string) => {
        const variants: Record<string, { variant: any; label: string }> = {
            pending: { variant: 'secondary', label: 'Pendiente' },
            accepted: { variant: 'default', label: 'Aceptado' },
            in_progress: { variant: 'default', label: 'En Progreso' },
            completed: { variant: 'default', label: 'Completado' },
            rejected: { variant: 'destructive', label: 'Rechazado' },
            cancelled: { variant: 'destructive', label: 'Cancelado' },
            expired: { variant: 'secondary', label: 'Expirado' }
        };

        const config = variants[status] || { variant: 'secondary', label: status };
        return <Badge variant={config.variant}>{config.label}</Badge>;
    };

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Administración de Retos</h1>
                    <p className="text-muted-foreground">Gestiona retos, ranking y banco de preguntas</p>
                </div>
                <Button onClick={() => setIsQuestionModalOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar Preguntas
                </Button>
            </div>

            <Tabs defaultValue="ranking" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="ranking">
                        <Trophy className="h-4 w-4 mr-2" />
                        Ranking
                    </TabsTrigger>
                    <TabsTrigger value="historial">
                        <Swords className="h-4 w-4 mr-2" />
                        Historial de Duelos
                    </TabsTrigger>
                    <TabsTrigger value="preguntas">
                        <Plus className="h-4 w-4 mr-2" />
                        Banco de Preguntas
                    </TabsTrigger>
                </TabsList>

                {/* Ranking */}
                <TabsContent value="ranking">
                    <Card>
                        <CardHeader>
                            <CardTitle>Ranking de Jugadores</CardTitle>
                            <CardDescription>Top jugadores por tasa de victoria</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-16">Pos.</TableHead>
                                        <TableHead>Jugador</TableHead>
                                        <TableHead className="text-center">Victorias</TableHead>
                                        <TableHead className="text-center">Derrotas</TableHead>
                                        <TableHead className="text-center">Empates</TableHead>
                                        <TableHead className="text-center">Total</TableHead>
                                        <TableHead className="text-center">% Victoria</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {stats.map((stat, index) => (
                                        <TableRow key={stat.userId}>
                                            <TableCell className="font-bold">
                                                {index + 1}
                                                {index === 0 && <Trophy className="inline h-4 w-4 ml-1 text-amber-500" />}
                                            </TableCell>
                                            <TableCell>{stat.userName}</TableCell>
                                            <TableCell className="text-center text-green-600 font-semibold">{stat.wins}</TableCell>
                                            <TableCell className="text-center text-red-600 font-semibold">{stat.losses}</TableCell>
                                            <TableCell className="text-center text-gray-600 font-semibold">{stat.draws}</TableCell>
                                            <TableCell className="text-center font-semibold">{stat.totalChallenges}</TableCell>
                                            <TableCell className="text-center font-bold">{stat.winRate.toFixed(1)}%</TableCell>
                                        </TableRow>
                                    ))}
                                    {stats.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                                                No hay estadísticas disponibles
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Historial */}
                <TabsContent value="historial">
                    <Card>
                        <CardHeader>
                            <CardTitle>Historial de Duelos</CardTitle>
                            <CardDescription>Últimos 100 duelos realizados</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Retador</TableHead>
                                        <TableHead>Retado</TableHead>
                                        <TableHead>Guía</TableHead>
                                        <TableHead>Resultado</TableHead>
                                        <TableHead>Estado</TableHead>
                                        <TableHead>Fecha</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {challenges.map((challenge) => (
                                        <TableRow key={challenge.id}>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <span>{challenge.challengerName}</span>
                                                    {challenge.winnerId === challenge.challengerId && (
                                                        <Trophy className="h-4 w-4 text-amber-500" />
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <span>{challenge.challengedName}</span>
                                                    {challenge.winnerId === challenge.challengedId && (
                                                        <Trophy className="h-4 w-4 text-amber-500" />
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>{challenge.guideName}</TableCell>
                                            <TableCell>
                                                {challenge.status === 'completed' && (
                                                    <span className="text-sm">
                                                        {challenge.challenger.score} - {challenge.challenged.score}
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell>{getStatusBadge(challenge.status)}</TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {challenge.createdAt && formatDistanceToNow(challenge.createdAt.toDate(), { addSuffix: true, locale: es })}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {challenges.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                                                No hay duelos registrados
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Banco de Preguntas */}
                <TabsContent value="preguntas">
                    <Card>
                        <CardHeader>
                            <CardTitle>Banco de Preguntas para Retos ({questions.length})</CardTitle>
                            <CardDescription>
                                Las preguntas se asignarán aleatoriamente a los retos según la guía seleccionada
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {questions.length === 0 ? (
                                <div className="text-center py-8">
                                    <p className="text-muted-foreground mb-4">
                                        No hay preguntas en el banco. Haz clic en "Agregar Preguntas" para comenzar.
                                    </p>
                                    <Button onClick={() => setIsQuestionModalOpen(true)}>
                                        <Plus className="h-4 w-4 mr-2" />
                                        Agregar Primera Pregunta
                                    </Button>
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Pregunta</TableHead>
                                            <TableHead>Guía</TableHead>
                                            <TableHead className="text-center">Opciones</TableHead>
                                            <TableHead className="text-center">Estado</TableHead>
                                            <TableHead>Fecha</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {questions.map((q) => {
                                            const guide = guides.find(g => g.id === q.guideId);
                                            return (
                                                <TableRow key={q.id}>
                                                    <TableCell className="max-w-md">
                                                        <div className="line-clamp-2">{q.question}</div>
                                                        {q.imageUrl && (
                                                            <Badge variant="secondary" className="mt-1">
                                                                Con imagen
                                                            </Badge>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>{guide?.title || 'Guía eliminada'}</TableCell>
                                                    <TableCell className="text-center">{q.options?.length || 0}</TableCell>
                                                    <TableCell className="text-center">
                                                        {q.isActive ? (
                                                            <Badge variant="default">Activa</Badge>
                                                        ) : (
                                                            <Badge variant="secondary">Inactiva</Badge>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-sm text-muted-foreground">
                                                        {q.createdAt && formatDistanceToNow(q.createdAt.toDate(), { addSuffix: true, locale: es })}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <ChallengeQuestionFormModal
                isOpen={isQuestionModalOpen}
                setIsOpen={setIsQuestionModalOpen}
            />
        </div>
    );
}
