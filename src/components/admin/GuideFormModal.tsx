'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Upload, FileText, Loader2 } from 'lucide-react';
import { getFirebaseServices } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '@/hooks/use-auth';

interface GuideFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function GuideFormModal({ isOpen, onClose, onSuccess }: GuideFormModalProps) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [area, setArea] = useState<number>(1);
    const [file, setFile] = useState<File | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            if (selectedFile.type !== 'application/pdf') {
                toast({
                    title: 'Error',
                    description: 'Solo se permiten archivos PDF.',
                    variant: 'destructive',
                });
                return;
            }
            setFile(selectedFile);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !file || !title.trim()) return;

        setLoading(true);
        try {
            // 1. Upload PDF to Storage
            const { storage } = getFirebaseServices();
            const timestamp = Date.now();
            const storageRef = ref(storage, `guides/${timestamp}_${file.name}`);
            await uploadBytes(storageRef, file);
            const pdfUrl = await getDownloadURL(storageRef);

            // 2. Call API to process guide
            const response = await fetch('/api/admin/guides/process', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title,
                    description,
                    area,
                    pdfUrl,
                    createdBy: user.id
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Failed to process guide' }));
                throw new Error(errorData.error || 'Failed to process guide');
            }

            toast({
                title: 'Guía creada',
                description: 'La guía se ha subido y procesado correctamente.',
            });
            onSuccess();
            onClose();

            // Reset form
            setTitle('');
            setDescription('');
            setArea(1);
            setFile(null);

        } catch (error: any) {
            console.error('Error creating guide:', error);
            toast({
                title: 'Error',
                description: error.message || 'Hubo un error al procesar la guía.',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Subir Nueva Guía</DialogTitle>
                    <DialogDescription>
                        Sube un PDF con el contenido de estudio. La IA lo procesará automáticamente.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="title">Título</Label>
                        <Input
                            id="title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Ej: Guía de Matemáticas 2024"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Descripción (Opcional)</Label>
                        <Textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Breve descripción del contenido..."
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="area">Área</Label>
                        <Select value={area.toString()} onValueChange={(value) => setArea(parseInt(value))}>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecciona un área" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="1">Área 1</SelectItem>
                                <SelectItem value="2">Área 2</SelectItem>
                                <SelectItem value="3">Área 3</SelectItem>
                                <SelectItem value="4">Área 4</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Archivo PDF</Label>
                        <div className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors"
                            onClick={() => document.getElementById('pdf-upload')?.click()}>
                            {file ? (
                                <div className="flex items-center gap-2 text-primary">
                                    <FileText className="h-8 w-8" />
                                    <span className="font-medium">{file.name}</span>
                                </div>
                            ) : (
                                <>
                                    <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                                    <span className="text-sm text-muted-foreground">Click para seleccionar PDF</span>
                                </>
                            )}
                            <input
                                id="pdf-upload"
                                type="file"
                                accept="application/pdf"
                                className="hidden"
                                onChange={handleFileChange}
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={loading || !file || !title}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {loading ? 'Procesando...' : 'Subir y Procesar'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
