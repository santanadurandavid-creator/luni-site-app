'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { getFirebaseServices } from '@/lib/firebase';
import { collection, addDoc, updateDoc, doc, Timestamp } from 'firebase/firestore';
import { Guide } from '@/lib/types';

interface GuideUploadModalProps {
    editingGuide?: Guide | null;
    onClose?: () => void;
}

export default function GuideUploadModal({ editingGuide, onClose }: GuideUploadModalProps) {
    const { user, firebaseUser } = useAuth();
    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    const [title, setTitle] = useState('');
    const [area, setArea] = useState('');
    const [content, setContent] = useState('');
    const [saving, setSaving] = useState(false);

    // Update form when editingGuide changes
    useEffect(() => {
        if (editingGuide) {
            setTitle(editingGuide.title || '');
            setArea(editingGuide.area?.toString() || '');
            setContent(editingGuide.content || '');
            setOpen(true);
        }
    }, [editingGuide]);

    const handleClose = () => {
        setOpen(false);
        setTitle('');
        setArea('');
        setContent('');
        if (onClose) onClose();
    };

    const handleSave = async () => {
        if (!title.trim()) {
            toast({ title: 'Error', description: 'Ingresa un título para la guía.', variant: 'destructive' });
            return;
        }
        if (!area) {
            toast({ title: 'Error', description: 'Selecciona un área.', variant: 'destructive' });
            return;
        }
        if (!content.trim()) {
            toast({ title: 'Error', description: 'Ingresa el contenido del temario.', variant: 'destructive' });
            return;
        }
        if (!firebaseUser && !editingGuide) {
            toast({ title: 'Error', description: 'Usuario no autenticado.', variant: 'destructive' });
            return;
        }

        setSaving(true);
        try {
            const { db } = getFirebaseServices();

            if (editingGuide) {
                // Update existing guide
                await updateDoc(doc(db, 'guides', editingGuide.id), {
                    title: title.trim(),
                    area: parseInt(area),
                    content: content.trim(),
                    updatedAt: Timestamp.now(),
                });
                toast({ title: 'Éxito', description: 'Guía actualizada correctamente.' });
            } else {
                // Create new guide
                await addDoc(collection(db, 'guides'), {
                    title: title.trim(),
                    area: parseInt(area),
                    content: content.trim(),
                    createdAt: Timestamp.now(),
                    updatedAt: Timestamp.now(),
                    createdBy: firebaseUser!.uid,
                    isActive: true,
                });
                toast({ title: 'Éxito', description: 'Guía creada correctamente.' });
            }

            handleClose();
        } catch (err) {
            console.error(err);
            toast({
                title: 'Error',
                description: editingGuide ? 'No se pudo actualizar la guía.' : 'No se pudo crear la guía.',
                variant: 'destructive'
            });
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            {!editingGuide && (
                <Button onClick={() => setOpen(true)} variant="outline">
                    Crear Guía
                </Button>
            )}
            <Dialog open={open} onOpenChange={handleClose}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{editingGuide ? 'Editar Guía de Estudio' : 'Crear Guía de Estudio'}</DialogTitle>
                        <DialogDescription>
                            {editingGuide
                                ? 'Modifica el título, área o contenido del temario de esta guía.'
                                : 'Ingresa el título, área y contenido del temario para esta guía.'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="title">Título</Label>
                            <Input
                                id="title"
                                placeholder="Ej: Temario Área 1 - Matemáticas"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                disabled={saving}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="area">Área</Label>
                            <Select value={area} onValueChange={setArea} disabled={saving}>
                                <SelectTrigger id="area">
                                    <SelectValue placeholder="Selecciona un área" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="1">Área 1: Ciencias Físico-Matemáticas y de las Ingenierías</SelectItem>
                                    <SelectItem value="2">Área 2: Ciencias Biológicas, Químicas y de la Salud</SelectItem>
                                    <SelectItem value="3">Área 3: Ciencias Sociales</SelectItem>
                                    <SelectItem value="4">Área 4: Humanidades y de las Artes</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="content">Contenido del Temario</Label>
                            <Textarea
                                id="content"
                                placeholder="Pega aquí el contenido completo del temario..."
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                disabled={saving}
                                rows={12}
                                className="font-mono text-sm"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="secondary" disabled={saving}>Cancelar</Button>
                        </DialogClose>
                        <Button onClick={handleSave} disabled={saving}>
                            {saving ? 'Guardando...' : (editingGuide ? 'Actualizar' : 'Guardar')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
