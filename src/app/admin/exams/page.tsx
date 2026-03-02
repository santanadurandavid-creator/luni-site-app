
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { Exam } from '@/lib/types';
import { PlusCircle, MoreHorizontal, FileQuestion } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { collection, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { getFirebaseServices } from '@/lib/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { DeletePasswordModal } from '@/components/admin/DeletePasswordModal';

const ExamTable = ({
    items,
    onEdit,
    onDelete,
    isLoading
}: {
    items: Exam[],
    onEdit: (item: Exam) => void,
    onDelete: (item: Exam) => void,
    isLoading: boolean
}) => {

    if (isLoading) {
        return (
            <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
                        <div className="space-y-2 flex-1">
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-4 w-1/2" />
                        </div>
                        <Skeleton className="h-8 w-8 rounded-full" />
                    </div>
                ))}
            </div>
        )
    }

    if (items.length === 0) {
        return <p className="text-center text-muted-foreground py-8">No hay exámenes. Crea uno para empezar.</p>
    }

    return (
        <div className="border rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-muted/50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Nombre del Examen</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Área</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Tipo</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">N° Preguntas</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Acciones</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {items.map(item => (
                        <tr key={item.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.name}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.area}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.type}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.questions?.length || 0}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon">
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent>
                                        <DropdownMenuItem onClick={() => onEdit(item)}>Editar</DropdownMenuItem>
                                        <DropdownMenuItem className="text-destructive" onClick={() => onDelete(item)}>Eliminar</DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};


export default function AdminExamsPage() {
    const [exams, setExams] = useState<Exam[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { user } = useAuth();
    const { toast } = useToast();
    const router = useRouter();
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [examToDelete, setExamToDelete] = useState<Exam | null>(null);

    useEffect(() => {
        const { db } = getFirebaseServices();
        const unsubscribe = onSnapshot(collection(db, 'exams'), (snapshot) => {
            const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Exam));
            setExams(items);
            setIsLoading(false);
        });

        // Cleanup subscription on unmount
        return () => unsubscribe();
    }, []);

    const handleDelete = (item: Exam) => {
        setExamToDelete(item);
        setDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!examToDelete) return;

        try {
            const { db } = getFirebaseServices();
            await deleteDoc(doc(db, "exams", examToDelete.id));

            toast({
                title: "Examen Eliminado",
                description: `El examen "${examToDelete.name}" ha sido eliminado.`
            });
        } catch (error) {
            toast({
                title: "Error",
                description: "No se pudo eliminar el examen.",
                variant: 'destructive'
            });
            console.error("Error deleting exam:", error);
        } finally {
            setExamToDelete(null);
            setDeleteModalOpen(false);
        }
    }


    const handleEdit = (item: Exam) => {
        router.push(`/admin/exams/edit/${item.id}`);
    };

    const handleCreate = () => {
        router.push('/admin/exams/edit/new');
    };

    const simuladorExams = exams.filter(exam => exam.type !== 'diagnostico');
    const diagnosticoExams = exams.filter(exam => exam.type === 'diagnostico');

    return (
        <>
            <div className="space-y-6">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-3xl font-bold font-headline">Gestión de Exámenes</h1>
                        <p className="text-muted-foreground">Crea y administra los exámenes de simulación y diagnósticos.</p>
                    </div>
                    <Button onClick={handleCreate}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Crear Examen
                    </Button>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileQuestion />
                            Exámenes de Simulación
                        </CardTitle>
                        <CardDescription>Visualiza, edita o elimina los exámenes de simulación actuales.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ExamTable items={simuladorExams} onEdit={handleEdit} onDelete={handleDelete} isLoading={isLoading} />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileQuestion />
                            Exámenes Diagnósticos
                        </CardTitle>
                        <CardDescription>Visualiza, edita o elimina los exámenes diagnósticos actuales.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ExamTable items={diagnosticoExams} onEdit={handleEdit} onDelete={handleDelete} isLoading={isLoading} />
                    </CardContent>
                </Card>
            </div>
            <DeletePasswordModal
                isOpen={deleteModalOpen}
                onOpenChange={setDeleteModalOpen}
                onConfirm={confirmDelete}
                title={`¿Eliminar examen "${examToDelete?.name || 'Examen'}"?`}
            />
        </>
    );
}
