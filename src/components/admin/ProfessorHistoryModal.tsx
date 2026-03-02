'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getFirebaseServices } from '@/lib/firebase';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { ContentItem } from '@/lib/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar, Clock, Video } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';

interface ProfessorHistoryModalProps {
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
    professorId: string | null;
    professorName: string | null;
}

export function ProfessorHistoryModal({ isOpen, setIsOpen, professorId, professorName }: ProfessorHistoryModalProps) {
    const [classes, setClasses] = useState<ContentItem[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!isOpen || !professorId) return;

        const fetchClasses = async () => {
            setLoading(true);
            try {
                const { db } = getFirebaseServices();
                const q = query(
                    collection(db, 'content'),
                    where('type', '==', 'class'),
                    where('classDetails.professorId', '==', professorId)
                );

                const snapshot = await getDocs(q);
                const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ContentItem));

                // Sort locally if index is missing for compound query
                data.sort((a, b) => {
                    const dateA = a.classDetails?.classDate?.toDate ? a.classDetails.classDate.toDate() : new Date(0);
                    const dateB = b.classDetails?.classDate?.toDate ? b.classDetails.classDate.toDate() : new Date(0);
                    return dateB.getTime() - dateA.getTime();
                });

                setClasses(data);
            } catch (error) {
                console.error("Error fetching classes:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchClasses();
    }, [isOpen, professorId]);

    const getStatusBadge = (status?: string) => {
        switch (status) {
            case 'scheduled': return <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">Programada</Badge>;
            case 'live': return <Badge variant="destructive" className="animate-pulse">En Vivo</Badge>;
            case 'finished': return <Badge variant="secondary">Finalizada</Badge>;
            default: return <Badge variant="outline">Pendiente</Badge>;
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="max-w-2xl h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Historial de Clases - {professorName}</DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-hidden">
                    {loading ? (
                        <div className="flex justify-center items-center h-full text-muted-foreground">Cargando historial...</div>
                    ) : classes.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                            <Video className="w-12 h-12 mb-2 opacity-20" />
                            <p>Este profesor no tiene clases asignadas aún.</p>
                        </div>
                    ) : (
                        <ScrollArea className="h-full pr-4">
                            <div className="space-y-4">
                                {classes.map((item) => (
                                    <div key={item.id} className="border rounded-lg p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                                        <div className="space-y-1">
                                            <h4 className="font-semibold text-lg">{item.title}</h4>
                                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                                <div className="flex items-center gap-1">
                                                    <Calendar className="w-4 h-4" />
                                                    {item.classDetails?.classDay || 'Fecha no definida'}
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Clock className="w-4 h-4" />
                                                    {item.classDetails?.classTime || '--:--'}
                                                </div>
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {item.classDetails?.classSubject || 'Sin materia'}
                                            </p>
                                        </div>
                                        <div className="flex flex-col items-end gap-2">
                                            {getStatusBadge(item.classDetails?.status)}
                                            {item.classDetails?.finishedAt && (
                                                <span className="text-xs text-muted-foreground">
                                                    Finalizó: {format(item.classDetails.finishedAt.toDate(), 'dd/MM/yyyy')}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
