
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Star, BarChart, TrendingUp, MessageSquare, User } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { getFirebaseServices } from '@/lib/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import type { User as UserType, Rating } from '@/lib/types';
import { Bar, BarChart as RechartsBarChart, Line, LineChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface RatingData {
    rating: number;
    comment?: string;
    date: Date;
    user: {
        id: string;
        name: string;
        avatar: string;
    }
}

export default function AdminRatingsPage() {
    const [allRatings, setAllRatings] = useState<RatingData[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const { db } = getFirebaseServices();
        const usersRef = collection(db, 'users');
        const unsubscribe = onSnapshot(usersRef, (snapshot) => {
            const ratings: RatingData[] = [];
            snapshot.forEach(doc => {
                const user = doc.data() as UserType;
                if (user.ratings && user.ratings.length > 0) {
                    user.ratings.forEach(r => {
                        ratings.push({
                            ...r,
                            date: r.date.seconds ? new Date(r.date.seconds * 1000) : new Date(r.date),
                            user: { id: user.id, name: user.name, avatar: user.avatar }
                        });
                    });
                }
            });
            ratings.sort((a, b) => b.date.getTime() - a.date.getTime());
            setAllRatings(ratings);
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, []);
    
    const { averageRating, totalRatings, ratingDistribution, ratingTrend } = useMemo(() => {
        if (allRatings.length === 0) {
            return { averageRating: 0, totalRatings: 0, ratingDistribution: [], ratingTrend: [] };
        }
        
        const total = allRatings.reduce((sum, r) => sum + r.rating, 0);
        const average = total / allRatings.length;
        
        const distribution = [1, 2, 3, 4, 5].map(star => ({
            name: `${star} ${star > 1 ? 'estrellas' : 'estrella'}`,
            total: allRatings.filter(r => r.rating === star).length
        }));

        const trend = allRatings
            .sort((a, b) => a.date.getTime() - b.date.getTime())
            .map((r, index) => {
                const cumulativeRatings = allRatings.slice(0, index + 1);
                const cumulativeTotal = cumulativeRatings.reduce((sum, cr) => sum + cr.rating, 0);
                return {
                    name: format(r.date, 'dd MMM'),
                    Promedio: cumulativeTotal / (index + 1),
                };
            })
            // Simple moving average over 5 ratings to smooth the trend
            .map((data, index, array) => {
                if (index < 4) return data;
                const window = array.slice(index - 4, index + 1);
                const avg = window.reduce((sum, d) => sum + d.Promedio, 0) / 5;
                return { ...data, Promedio: parseFloat(avg.toFixed(2)) };
            });

        return {
            averageRating: parseFloat(average.toFixed(2)),
            totalRatings: allRatings.length,
            ratingDistribution: distribution,
            ratingTrend: trend,
        };

    }, [allRatings]);

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold font-headline">Panel de Calificaciones</h1>
        <p className="text-muted-foreground">Analiza la satisfacción de los usuarios a través de sus calificaciones.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Calificación Promedio</CardTitle>
                <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                {isLoading ? <Skeleton className="h-8 w-24" /> : <div className="text-2xl font-bold">{averageRating} / 5</div>}
                {!isLoading && <p className="text-xs text-muted-foreground">Basado en {totalRatings} calificaciones</p>}
            </CardContent>
        </Card>
        <Card className="shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Calificaciones Totales</CardTitle>
                <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                {isLoading ? <Skeleton className="h-8 w-24" /> : <div className="text-2xl font-bold">{totalRatings}</div>}
                {!isLoading && <p className="text-xs text-muted-foreground">Calificaciones recibidas en total</p>}
            </CardContent>
        </Card>
      </div>

       <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
            <Card className="lg:col-span-4 shadow-md">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><TrendingUp /> Tendencia de Calificaciones</CardTitle>
                    <CardDescription>Evolución del promedio de satisfacción a lo largo del tiempo.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? <Skeleton className="h-64 w-full" /> : (
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={ratingTrend}>
                                <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} domain={[1, 5]} />
                                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}/>
                                <Legend />
                                <Line type="monotone" dataKey="Promedio" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    )}
                </CardContent>
            </Card>
             <Card className="lg:col-span-3 shadow-md">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><BarChart/> Distribución</CardTitle>
                    <CardDescription>Cantidad de calificaciones por cada puntuación.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? <Skeleton className="h-64 w-full" /> : (
                       <ResponsiveContainer width="100%" height={300}>
                            <RechartsBarChart data={ratingDistribution}>
                                <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}/>
                                <Bar dataKey="total" fill="hsl(var(--primary))" name="Total" radius={[4, 4, 0, 0]} />
                            </RechartsBarChart>
                       </ResponsiveContainer>
                    )}
                </CardContent>
            </Card>
       </div>
      
        <Card className="shadow-md">
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><MessageSquare /> Comentarios Recientes</CardTitle>
                <CardDescription>Los últimos 5 comentarios dejados por los usuarios.</CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full mb-2" />)
                ) : (
                    <div className="space-y-4">
                        {allRatings.slice(0, 5).map((rating, index) => (
                           <div key={index} className="flex items-start gap-4 p-3 border rounded-lg">
                               <Avatar>
                                   <AvatarImage src={rating.user.avatar} alt={rating.user.name} />
                                   <AvatarFallback>{rating.user.name.charAt(0)}</AvatarFallback>
                               </Avatar>
                               <div className="flex-1">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-semibold">{rating.user.name}</p>
                                            <p className="text-sm text-muted-foreground">{format(rating.date, "d MMM, yyyy", { locale: es })}</p>
                                        </div>
                                        <div className="flex items-center gap-1 text-amber-500">
                                            <span className="font-bold text-lg">{rating.rating}</span>
                                            <Star className="h-5 w-5 fill-current" />
                                        </div>
                                    </div>
                                    <p className="mt-2 text-sm italic">"{rating.comment || 'Sin comentario.'}"</p>
                               </div>
                           </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    </div>
  );
}
