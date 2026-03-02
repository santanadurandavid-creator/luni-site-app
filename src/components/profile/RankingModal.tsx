

'use client';

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { useAuth } from '@/hooks/use-auth';
import React, { useState, useEffect, useMemo } from 'react';
import type { User } from '@/lib/types';
import { getFirebaseServices } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '../ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Crown, Trophy, Timer, MoreHorizontal } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';
import { cn } from '@/lib/utils';


interface RankingModalProps {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
}

interface RankedUser {
    id: string;
    name: string;
    avatar: string;
    score: number;
    timeTaken: number;
    rank: number;
}

const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
};

const getRankColor = (rank: number) => {
    if (rank === 0) return 'text-amber-400';
    if (rank === 1) return 'text-gray-400';
    if (rank === 2) return 'text-amber-600';
    return 'text-muted-foreground';
};

const getRankIndicator = (rank: number) => {
    if (rank < 3) return <Crown className="mx-auto h-6 w-6" />;
    return rank + 1;
};

const UserRankCard = ({ rankedUser, isCurrentUser }: { rankedUser: RankedUser, isCurrentUser: boolean }) => (
    <div className={cn(
        "flex items-center gap-4 p-2 rounded-lg hover:bg-muted/50 transition-colors",
        isCurrentUser && "bg-primary/10 border border-primary/20"
    )}>
        <div className={cn('w-8 text-center text-lg font-bold font-headline', getRankColor(rankedUser.rank))}>
            {getRankIndicator(rankedUser.rank)}
        </div>
        <Avatar className="h-12 w-12">
            <AvatarImage src={rankedUser.avatar} alt={rankedUser.name} />
            <AvatarFallback>{rankedUser.name.charAt(0)}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
            <p className="font-semibold">{rankedUser.name}</p>
            <p className="text-sm text-muted-foreground">
                Puntuación: <span className="font-bold text-primary">{rankedUser.score}</span>
            </p>
        </div>
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Timer className="h-4 w-4" />
            <span>{formatTime(rankedUser.timeTaken)}</span>
        </div>
    </div>
);


export function RankingModal({ isOpen, setIsOpen }: RankingModalProps) {
    const { user } = useAuth();
    const [fullRanking, setFullRanking] = useState<RankedUser[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        if (isOpen) {
            const fetchRankingData = async () => {
                setIsLoading(true);
                try {
                    const { db } = getFirebaseServices();
                    const usersSnapshot = await getDocs(collection(db, 'users'));
                    const allUsers = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));

                    const usersWithLatestExam = allUsers
                        .map(u => {
                            if (!u.examResults || u.examResults.length === 0) return null;

                            const latestResult = u.examResults.reduce((latest, current) => {
                                const latestDate = latest.completedAt.seconds ? new Date(latest.completedAt.seconds * 1000) : new Date(latest.completedAt);
                                const currentDate = current.completedAt.seconds ? new Date(current.completedAt.seconds * 1000) : new Date(current.completedAt);
                                return currentDate > latestDate ? current : latest;
                            });

                            return {
                                id: u.id,
                                name: u.name,
                                avatar: u.avatar,
                                score: latestResult.score,
                                timeTaken: latestResult.timeTaken || 0,
                            };
                        })
                        .filter((u): u is Omit<RankedUser, 'rank'> => u !== null && u.timeTaken > 0);

                    usersWithLatestExam.sort((a, b) => {
                        if (b.score !== a.score) return b.score - a.score;
                        return a.timeTaken - b.timeTaken;
                    });

                    const rankedUsers = usersWithLatestExam.map((u, index) => ({ ...u, rank: index }));
                    setFullRanking(rankedUsers);

                } catch (error) {
                    console.error("Error fetching ranking:", error);
                    toast({ variant: 'destructive', title: 'Error', description: 'No se pudo cargar el ranking.' });
                } finally {
                    setIsLoading(false);
                }
            };

            fetchRankingData();
        }
    }, [isOpen, toast]);

    const { top5, currentUserRank, isCurrentUserInTop5 } = useMemo(() => {
        const top5 = fullRanking.slice(0, 5);
        const currentUserData = user ? fullRanking.find(u => u.id === user.id) : null;
        return {
            top5,
            currentUserRank: currentUserData,
            isCurrentUserInTop5: !!(currentUserData && currentUserData.rank < 5),
        };
    }, [fullRanking, user]);


    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="w-[95vw] max-w-lg rounded-lg flex flex-col max-h-[80vh]">
                <DialogHeader>
                    <DialogTitle className="font-headline text-center text-2xl flex items-center justify-center gap-2">
                        <Trophy className="h-6 w-6" /> Ranking de Exámenes
                    </DialogTitle>
                    <DialogDescription className="text-center">
                        Ranking basado en el último examen realizado.
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="h-[400px] pr-4 -mr-4">
                    <div className="space-y-3 py-4">
                        {isLoading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <div key={i} className="flex items-center gap-4 p-2 rounded-lg">
                                    <Skeleton className="h-6 w-8" />
                                    <Skeleton className="h-12 w-12 rounded-full" />
                                    <div className="flex-1 space-y-2">
                                        <Skeleton className="h-4 w-3/4" />
                                        <Skeleton className="h-3 w-1/2" />
                                    </div>
                                </div>
                            ))
                        ) : top5.length > 0 ? (
                            <>
                                {top5.map((rankedUser) => (
                                    <UserRankCard
                                        key={rankedUser.id}
                                        rankedUser={rankedUser}
                                        isCurrentUser={user?.id === rankedUser.id}
                                    />
                                ))}
                                {currentUserRank && !isCurrentUserInTop5 && (
                                    <>
                                        <div className="flex items-center justify-center gap-2 text-muted-foreground py-2">
                                            <MoreHorizontal className="h-5 w-5" />
                                        </div>
                                        <UserRankCard
                                            rankedUser={currentUserRank}
                                            isCurrentUser={true}
                                        />
                                    </>
                                )}
                            </>
                        ) : (
                            <p className="text-center text-muted-foreground py-10">
                                Nadie ha completado un examen aún. ¡Sé el primero!
                            </p>
                        )}
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog >
    );
}

