'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { getFirebaseServices } from '@/lib/firebase';
import { X, Loader2, Edit, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface FaqItem {
    id: string;
    question: string;
    answer: string;
}

const FaqManager = () => {
    const { toast } = useToast();
    const [faqs, setFaqs] = useState<FaqItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingFaq, setEditingFaq] = useState<FaqItem | null>(null);
    const [question, setQuestion] = useState('');
    const [answer, setAnswer] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const { db } = getFirebaseServices();
        const unsubscribe = onSnapshot(collection(db, 'faqs'), (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FaqItem));
            setFaqs(data);
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const resetForm = () => {
        setQuestion('');
        setAnswer('');
        setEditingFaq(null);
    };

    const openModal = (faq?: FaqItem) => {
        if (faq) {
            setEditingFaq(faq);
            setQuestion(faq.question);
            setAnswer(faq.answer);
        } else {
            resetForm();
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        resetForm();
    };

    const handleSave = async () => {
        if (!question.trim() || !answer.trim()) {
            toast({ variant: 'destructive', title: "Campos requeridos", description: "La pregunta y respuesta no pueden estar vacías." });
            return;
        }

        setIsSaving(true);
        try {
            const { db } = getFirebaseServices();
            const faqData = { question: question.trim(), answer: answer.trim() };

            if (editingFaq) {
                await updateDoc(doc(db, 'faqs', editingFaq.id), faqData);
                toast({ title: "FAQ actualizada", description: "La pregunta frecuente ha sido actualizada." });
            } else {
                await addDoc(collection(db, 'faqs'), faqData);
                toast({ title: "FAQ añadida", description: "La nueva pregunta frecuente ha sido añadida." });
            }
            closeModal();
        } catch (error) {
            console.error('Error saving FAQ:', error);
            toast({ variant: 'destructive', title: "Error", description: "No se pudo guardar la FAQ." });
        } finally {
            setIsSaving(false);
        }
    };

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [faqToDelete, setFaqToDelete] = useState<FaqItem | null>(null);

    const handleDelete = (faq: FaqItem) => {
        setFaqToDelete(faq);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!faqToDelete) return;

        try {
            const { db } = getFirebaseServices();
            await deleteDoc(doc(db, 'faqs', faqToDelete.id));
            toast({ title: "FAQ eliminada", description: "La pregunta frecuente ha sido eliminada." });
        } catch (error) {
            console.error('Error deleting FAQ:', error);
            toast({ variant: 'destructive', title: "Error", description: "No se pudo eliminar la FAQ." });
        } finally {
            setIsDeleteModalOpen(false);
            setFaqToDelete(null);
        }
    };

    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle>Ayuda y Soporte</CardTitle>
                    <CardDescription>Gestiona las preguntas frecuentes que aparecen en la sección de ayuda.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex justify-between items-center">
                        <p className="text-sm text-muted-foreground">
                            {isLoading ? 'Cargando...' : `${faqs.length} preguntas frecuentes`}
                        </p>
                        <Button onClick={() => openModal()} size="sm">
                            <Plus className="h-4 w-4 mr-2" />
                            Añadir FAQ
                        </Button>
                    </div>

                    {isLoading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin" />
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {faqs.map(faq => (
                                <div key={faq.id} className="flex items-start gap-3 p-3 border rounded-lg">
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-medium text-sm truncate">{faq.question}</h4>
                                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{faq.answer}</p>
                                    </div>
                                    <div className="flex gap-1">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => openModal(faq)}
                                            className="h-8 w-8 p-0"
                                        >
                                            <Edit className="h-3 w-3" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleDelete(faq)}
                                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                        >
                                            <X className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                            {faqs.length === 0 && (
                                <p className="text-center text-muted-foreground py-8">
                                    No hay preguntas frecuentes. Haz clic en "Añadir FAQ" para crear la primera.
                                </p>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>
                            {editingFaq ? 'Editar Pregunta Frecuente' : 'Añadir Pregunta Frecuente'}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="question">Pregunta</Label>
                            <Input
                                id="question"
                                value={question}
                                onChange={(e) => setQuestion(e.target.value)}
                                placeholder="Escribe la pregunta frecuente..."
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="answer">Respuesta</Label>
                            <Textarea
                                id="answer"
                                value={answer}
                                onChange={(e) => setAnswer(e.target.value)}
                                placeholder="Escribe la respuesta..."
                                rows={4}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="ghost">Cancelar</Button>
                        </DialogClose>
                        <Button onClick={handleSave} disabled={isSaving}>
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {editingFaq ? 'Actualizar' : 'Añadir'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle>Eliminar Pregunta Frecuente</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <p className="text-sm text-muted-foreground">
                            ¿Estás seguro de que quieres eliminar esta pregunta frecuente?
                        </p>
                        {faqToDelete && (
                            <div className="mt-3 p-3 bg-muted rounded-lg">
                                <p className="font-medium text-sm">{faqToDelete.question}</p>
                            </div>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                            Esta acción no se puede deshacer.
                        </p>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsDeleteModalOpen(false)}>
                            Cancelar
                        </Button>
                        <Button variant="destructive" onClick={confirmDelete}>
                            Eliminar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};

export { FaqManager };
