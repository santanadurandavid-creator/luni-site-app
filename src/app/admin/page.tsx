'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Users, GraduationCap, Video, Star } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { getFirebaseServices } from '@/lib/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/use-auth';
import type { ContentItem, User } from '@/lib/types';
import { Separator } from '@/components/ui/separator';

const StatsCard = ({ title, value, icon: Icon, isLoading }: { title: string, value: string, icon: React.ElementType, isLoading: boolean }) => (
    <Card className="shadow-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
            {isLoading ? (
                <Skeleton className="h-8 w-24" />
            ) : (
                <div className="text-2xl font-bold">{value}</div>
            )}
        </CardContent>
    </Card>
);

export default function AdminDashboardPage() {
    const { user } = useAuth();
    const [stats, setStats] = useState({
        students: 0,
        premiumUsers: 0,
        classes: 0,
    });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (user && !user.isAdmin) {
            if (user.role === 'ventas') {
                window.location.href = '/admin/my-sales';
            } else if (user.role === 'content_creator') {
                window.location.href = '/admin/content';
            } else if (user.role === 'support' || user.role === 'supervisor_support') {
                window.location.href = '/admin/support';
            }
        }

        if (user?.isAdmin) {
            const fetchStats = async () => {
                try {
                    const { db } = getFirebaseServices();

                    const usersRef = collection(db, 'users');
                    const usersSnapshot = await getDocs(usersRef);
                    const allUsers = usersSnapshot.docs.map(doc => doc.data() as User);

                    const students = allUsers.filter(u => u.role === 'normal');
                    const premiumUsers = allUsers.filter(u => u.premiumUntil && u.premiumUntil.toDate() > new Date()).length;

                    const classesRef = collection(db, 'content');
                    const approvedClassesQuery = query(classesRef, where('type', '==', 'class'), where('classDetails.approvalStatus', '==', 'approved'));
                    const classesSnapshot = await getDocs(approvedClassesQuery);

                    setStats({
                        students: students.length,
                        premiumUsers,
                        classes: classesSnapshot.size,
                    });

                } catch (error) {
                    console.error("Error fetching stats:", error);
                } finally {
                    setIsLoading(false);
                }
            };
            fetchStats();
        } else {
            setIsLoading(false);
        }
    }, [user?.isAdmin]);

    return (
        <div className="space-y-8">
            <div className="space-y-2">
                <h1 className="text-3xl font-bold font-headline">Panel de Administración</h1>
                <p className="text-muted-foreground">¡Hola! Aquí tienes un resumen del estado actual de la plataforma Luni Site.</p>
            </div>

            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Users /> Métricas de Crecimiento</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-6 md:grid-cols-3">
                        <StatsCard title="Total de Estudiantes" value={stats.students.toLocaleString()} icon={GraduationCap} isLoading={isLoading} />
                        <StatsCard title="Usuarios Premium Activos" value={stats.premiumUsers.toLocaleString()} icon={Star} isLoading={isLoading} />
                        <StatsCard title="Clases Aprobadas" value={stats.classes.toLocaleString()} icon={Video} isLoading={isLoading} />
                    </CardContent>
                </Card>

            </div>
        </div>
    );
}
