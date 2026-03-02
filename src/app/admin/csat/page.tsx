
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Star, BarChart, MessageSquare, Smile } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, where, getDocs } from 'firebase/firestore';
import { getFirebaseServices } from '@/lib/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import type { SupportTicket, User } from '@/lib/types';
import { Bar, BarChart as RechartsBarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from '@/hooks/use-auth';

interface CsatData {
    rating: number;
    comment?: string;
    ratedAt: Date;
    ticketSubject: string;
    assignedTo?: string;
}

export default function AdminCsatPage() {
    const { user } = useAuth();
    const [allRatings, setAllRatings] = useState<CsatData[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const { db } = getFirebaseServices();
        const ticketsRef = collection(db, 'supportTickets');
        const q = query(ticketsRef, where("csat", "!=", null));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            let ratings: CsatData[] = [];
            snapshot.forEach(doc => {
                const ticket = doc.data() as SupportTicket;
                if (ticket.csat) {
                    // Handle both Timestamp and Date types
                    let ratedAtDate: Date;
                    if (ticket.csat.ratedAt && typeof ticket.csat.ratedAt === 'object' && 'toDate' in ticket.csat.ratedAt) {
                        ratedAtDate = ticket.csat.ratedAt.toDate();
                    } else if (ticket.csat.ratedAt instanceof Date) {
                        ratedAtDate = ticket.csat.ratedAt;
                    } else {
                        ratedAtDate = new Date(); // Fallback
                    }

                    ratings.push({
                        rating: ticket.csat.rating,
                        comment: ticket.csat.comment,
                        ratedAt: ratedAtDate,
                        ticketSubject: ticket.subject,
                        assignedTo: ticket.assignedTo,
                    });
                }
            });

            if (user?.role === 'support') {
                ratings = ratings.filter(r => r.assignedTo === user.id);
            }

            ratings.sort((a, b) => b.ratedAt.getTime() - a.ratedAt.getTime());
            setAllRatings(ratings);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    const { averageRating, totalRatings, ratingDistribution } = useMemo(() => {
        if (allRatings.length === 0) {
            return { averageRating: 0, totalRatings: 0, ratingDistribution: [] };
        }

        const total = allRatings.reduce((sum, r) => sum + r.rating, 0);
        const average = total / allRatings.length;

        const distribution = [1, 2, 3, 4, 5].map(star => ({
            name: `${star} ${star > 1 ? 'estrellas' : 'estrella'}`,
            total: allRatings.filter(r => r.rating === star).length
        }));

        return {
            averageRating: parseFloat(average.toFixed(2)),
            totalRatings: allRatings.length,
            ratingDistribution: distribution,
        };

    }, [allRatings]);

    return (
        <div className="space-y-8">
            <div className="space-y-2">
                <h1 className="text-3xl font-bold font-headline flex items-center gap-2"><Smile />Satisfacción del Cliente (CSAT)</h1>
                <p className="text-muted-foreground">Analiza la calidad de tu soporte a través de las calificaciones de los usuarios.</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
                <Card className="lg:col-span-3 shadow-md">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><BarChart /> Distribución de Calificaciones</CardTitle>
                        <CardDescription>Cantidad de calificaciones por cada puntuación.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? <Skeleton className="h-64 w-full" /> : (
                            <ResponsiveContainer width="100%" height={300}>
                                <RechartsBarChart data={ratingDistribution}>
                                    <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
                                    <Bar dataKey="total" fill="hsl(var(--primary))" name="Total" radius={[4, 4, 0, 0]} />
                                </RechartsBarChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>
                <div className="lg:col-span-2 space-y-6">
                    <Card className="shadow-md">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Calificación Promedio</CardTitle>
                            <Star className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            {isLoading ? <Skeleton className="h-8 w-24" /> : <div className="text-2xl font-bold">{averageRating} / 5</div>}
                            {!isLoading && <p className="text-xs text-muted-foreground">Basado en {totalRatings} tickets calificados</p>}
                        </CardContent>
                    </Card>
                    <Card className="shadow-md">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total de Calificaciones</CardTitle>
                            <MessageSquare className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            {isLoading ? <Skeleton className="h-8 w-24" /> : <div className="text-2xl font-bold">{totalRatings}</div>}
                            {!isLoading && <p className="text-xs text-muted-foreground">Tickets calificados en total</p>}
                        </CardContent>
                    </Card>
                </div>
            </div>

            <Card className="shadow-md">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><MessageSquare /> Comentarios Recientes</CardTitle>
                    <CardDescription>Los últimos 5 comentarios dejados por los usuarios en el chat de soporte.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full mb-2" />)
                    ) : allRatings.filter(r => r.comment).length > 0 ? (
                        <div className="space-y-4">
                            {allRatings.filter(r => r.comment).slice(0, 5).map((rating, index) => (
                                <div key={index} className="flex items-start gap-4 p-3 border rounded-lg">
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-semibold">{rating.ticketSubject}</p>
                                                <p className="text-sm text-muted-foreground">{format(rating.ratedAt, "d MMM, yyyy", { locale: es })}</p>
                                            </div>
                                            <div className="flex items-center gap-1 text-amber-500">
                                                <span className="font-bold text-lg">{rating.rating}</span>
                                                <Star className="h-5 w-5 fill-current" />
                                            </div>
                                        </div>
                                        <p className="mt-2 text-sm italic">"{rating.comment}"</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-center text-muted-foreground py-8">No se han dejado comentarios.</p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
