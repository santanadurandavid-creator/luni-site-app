'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { getFirebaseServices } from '@/lib/firebase';
import { collection, addDoc, updateDoc, doc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Professor } from '@/lib/types';
import Image from 'next/image';
import { Trash2 } from 'lucide-react';

interface ManageProfessorModalProps {
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
    professorToEdit?: Professor | null;
    onClose: () => void;
}

export function ManageProfessorModal({ isOpen, setIsOpen, professorToEdit, onClose }: ManageProfessorModalProps) {
    const [name, setName] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        if (professorToEdit) {
            setName(professorToEdit.name);
            setImagePreview(professorToEdit.avatarUrl);
        } else {
            setName('');
            setImagePreview(null);
            setImageFile(null);
        }
    }, [professorToEdit, isOpen]);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const { db, storage } = getFirebaseServices();
            let avatarUrl = professorToEdit?.avatarUrl || '';

            if (imageFile) {
                const storageRef = ref(storage, `professors/${Date.now()}_${imageFile.name}`);
                const snapshot = await uploadBytes(storageRef, imageFile);
                avatarUrl = await getDownloadURL(snapshot.ref);
            }

            if (!avatarUrl) {
                toast({ variant: 'destructive', title: 'Error', description: 'La imagen es obligatoria' });
                setIsSubmitting(false);
                return;
            }

            const professorData = {
                name,
                avatarUrl,
            };

            if (professorToEdit) {
                await updateDoc(doc(db, 'professors', professorToEdit.id), professorData);
                toast({ title: 'Éxito', description: 'Profesor actualizado correctamente' });
            } else {
                await addDoc(collection(db, 'professors'), {
                    ...professorData,
                    rating: 5.0, // Calificación inicial por defecto
                    totalRatings: 0,
                    createdAt: serverTimestamp()
                });
                toast({ title: 'Éxito', description: 'Profesor creado correctamente' });
            }

            onClose();
            setIsOpen(false);
        } catch (error) {
            console.error('Error saving professor:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo guardar el profesor' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!professorToEdit) return;
        if (!confirm('¿Estás seguro de que quieres eliminar a este profesor?')) return;

        setIsSubmitting(true);
        try {
            const { db } = getFirebaseServices();
            await deleteDoc(doc(db, 'professors', professorToEdit.id));
            toast({ title: 'Eliminado', description: 'Profesor eliminado correctamente' });
            onClose();
            setIsOpen(false);
        } catch (error) {
            console.error('Error deleting professor:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo eliminar' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{professorToEdit ? 'Editar Profesor' : 'Nuevo Profesor'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label>Nombre del Profesor</Label>
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Ej. Lic. Juan Pérez"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Foto de Perfil</Label>
                        <div className="flex flex-col items-center gap-4">
                            {imagePreview && (
                                <div className="relative w-32 h-32 rounded-full overflow-hidden border">
                                    <Image src={imagePreview} alt="Preview" fill className="object-cover" />
                                </div>
                            )}
                            <Input type="file" accept="image/*" onChange={handleImageChange} required={!professorToEdit} />
                        </div>
                    </div>

                    <DialogFooter className="flex justify-between sm:justify-between w-full">
                        {professorToEdit && (
                            <Button type="button" variant="destructive" size="icon" onClick={handleDelete} disabled={isSubmitting}>
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        )}
                        <div className="flex gap-2 justify-end w-full">
                            <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isSubmitting}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? 'Guardando...' : 'Guardar'}
                            </Button>
                        </div>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
