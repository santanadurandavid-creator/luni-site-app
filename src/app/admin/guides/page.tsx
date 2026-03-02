'use client';

import { useState, useEffect } from 'react';
import { getFirebaseServices } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { Guide } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, FileText, Trash2, Calendar, Pencil } from 'lucide-react';
import GuideUploadModal from '@/components/admin/GuideUploadModal';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function AdminGuidesPage() {
    const [guides, setGuides] = useState<Guide[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingGuide, setEditingGuide] = useState<Guide | null>(null);
    const { toast } = useToast();

    useEffect(() => {
        const { db } = getFirebaseServices();
        const q = query(collection(db, 'guides'), orderBy('createdAt', 'desc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const guidesData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Guide[];
            setGuides(guidesData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching guides:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const handleDelete = async (guideId: string) => {
        if (!confirm('¿Estás seguro de eliminar esta guía? Esto podría afectar la generación de planes.')) return;

        try {
            const { db } = getFirebaseServices();
            await deleteDoc(doc(db, 'guides', guideId));
            toast({
                title: 'Guía eliminada',
                description: 'La guía ha sido eliminada correctamente.',
            });
        } catch (error) {
            console.error("Error deleting guide:", error);
            toast({
                title: 'Error',
                description: 'No se pudo eliminar la guía.',
                variant: 'destructive',
            });
        }
    };

    const getAreaName = (area: number) => {
        const areas: Record<number, string> = {
            1: 'Ciencias Físico-Matemáticas y de las Ingenierías',
            2: 'Ciencias Biológicas, Químicas y de la Salud',
            3: 'Ciencias Sociales',
            4: 'Humanidades y de las Artes'
        };
        return areas[area] || `Área ${area}`;
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Guías de Estudio</h1>
                    <p className="text-muted-foreground">
                        Administra los temarios de cada área para generar planes de estudio.
                    </p>
                </div>
                <GuideUploadModal />
            </div>

            {loading ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3].map((i) => (
                        <Card key={i} className="animate-pulse h-48" />
                    ))}
                </div>
            ) : guides.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed rounded-lg">
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium">No hay guías creadas</h3>
                    <p className="text-muted-foreground mb-4">
                        Crea tu primera guía para comenzar a generar planes de estudio.
                    </p>
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {guides.map((guide) => (
                        <Card key={guide.id} className="relative group">
                            <CardHeader className="pb-3">
                                <div className="flex justify-between items-start">
                                    <div className="p-2 bg-primary/10 rounded-lg">
                                        <FileText className="h-6 w-6 text-primary" />
                                    </div>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => setEditingGuide(guide)}
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-destructive"
                                            onClick={() => handleDelete(guide.id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                                <CardTitle className="mt-4 line-clamp-1" title={guide.title}>
                                    {guide.title}
                                </CardTitle>
                                <CardDescription className="line-clamp-1">
                                    {getAreaName(guide.area)}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2 text-sm text-muted-foreground">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="h-4 w-4" />
                                        <span>
                                            {guide.createdAt?.toDate
                                                ? format(guide.createdAt.toDate(), "d MMM yyyy", { locale: es })
                                                : "Reciente"}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline">
                                            Área {guide.area}
                                        </Badge>
                                        {guide.isActive && (
                                            <Badge variant="default" className="bg-green-500 hover:bg-green-600">
                                                Activa
                                            </Badge>
                                        )}
                                    </div>
                                    {(guide as any).content && (
                                        <p className="text-xs line-clamp-2 mt-2">
                                            {(guide as any).content.substring(0, 100)}...
                                        </p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Edit Modal */}
            {editingGuide && (
                <GuideUploadModal
                    editingGuide={editingGuide}
                    onClose={() => setEditingGuide(null)}
                />
            )}
        </div>
    );
}
