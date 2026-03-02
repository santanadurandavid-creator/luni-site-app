'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2, Upload } from 'lucide-react';
import { getFirebaseServices } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useToast } from '@/hooks/use-toast';
import type { Guide, QuizOption } from '@/lib/types';

interface ChallengeQuestionFormModalProps {
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
}

export function ChallengeQuestionFormModal({ isOpen, setIsOpen }: ChallengeQuestionFormModalProps) {
    const { toast } = useToast();
    const [guides, setGuides] = useState<Guide[]>([]);
    const [selectedGuideId, setSelectedGuideId] = useState('');
    const [question, setQuestion] = useState('');
    const [questionImage, setQuestionImage] = useState<File | null>(null);
    const [questionImageUrl, setQuestionImageUrl] = useState('');
    const [options, setOptions] = useState<QuizOption[]>([
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false }
    ]);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const fetchGuides = async () => {
            const { db } = getFirebaseServices();
            const guidesQuery = query(collection(db, 'guides'), where('isActive', '==', true));
            const snapshot = await getDocs(guidesQuery);
            const guidesData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Guide));
            setGuides(guidesData);
        };

        if (isOpen) {
            fetchGuides();
        }
    }, [isOpen]);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setQuestionImage(e.target.files[0]);
        }
    };

    const handleOptionChange = (index: number, text: string) => {
        const newOptions = [...options];
        newOptions[index].text = text;
        setOptions(newOptions);
    };

    const handleCorrectChange = (index: number) => {
        const newOptions = options.map((opt, i) => ({
            ...opt,
            isCorrect: i === index
        }));
        setOptions(newOptions);
    };

    const addOption = () => {
        setOptions([...options, { text: '', isCorrect: false }]);
    };

    const removeOption = (index: number) => {
        if (options.length > 2) {
            setOptions(options.filter((_, i) => i !== index));
        }
    };

    const handleSubmit = async () => {
        if (!selectedGuideId || !question.trim()) {
            toast({ variant: 'destructive', title: 'Error', description: 'Selecciona una guía y escribe una pregunta' });
            return;
        }

        const filledOptions = options.filter(opt => opt.text.trim() !== '');
        if (filledOptions.length < 2) {
            toast({ variant: 'destructive', title: 'Error', description: 'Agrega al menos 2 opciones' });
            return;
        }

        if (!filledOptions.some(opt => opt.isCorrect)) {
            toast({ variant: 'destructive', title: 'Error', description: 'Marca una opción como correcta' });
            return;
        }

        setIsSaving(true);
        try {
            const { db, storage } = getFirebaseServices();
            let uploadedImageUrl = questionImageUrl;

            // Subir imagen si existe
            if (questionImage) {
                const imageRef = ref(storage, `challenge-questions/${Date.now()}_${questionImage.name}`);
                await uploadBytes(imageRef, questionImage);
                uploadedImageUrl = await getDownloadURL(imageRef);
            }

            // Guardar pregunta en el banco
            await addDoc(collection(db, 'challengeQuestions'), {
                guideId: selectedGuideId,
                question: question.trim(),
                imageUrl: uploadedImageUrl || null,
                options: filledOptions,
                createdAt: serverTimestamp(),
                isActive: true
            });

            toast({ title: 'Pregunta agregada', description: 'La pregunta se agregó al banco correctamente' });

            // Resetear formulario
            setQuestion('');
            setQuestionImage(null);
            setQuestionImageUrl('');
            setOptions([
                { text: '', isCorrect: false },
                { text: '', isCorrect: false },
                { text: '', isCorrect: false },
                { text: '', isCorrect: false }
            ]);
            setSelectedGuideId('');
            setIsOpen(false);
        } catch (error) {
            console.error('Error saving question:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo guardar la pregunta' });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Agregar Pregunta al Banco de Retos</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Seleccionar Guía */}
                    <div className="space-y-2">
                        <Label>Guía</Label>
                        <Select value={selectedGuideId} onValueChange={setSelectedGuideId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecciona una guía" />
                            </SelectTrigger>
                            <SelectContent>
                                {guides.map(guide => (
                                    <SelectItem key={guide.id} value={guide.id}>
                                        {guide.title}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Pregunta */}
                    <div className="space-y-2">
                        <Label>Pregunta</Label>
                        <Textarea
                            value={question}
                            onChange={(e) => setQuestion(e.target.value)}
                            placeholder="Escribe la pregunta aquí..."
                            rows={3}
                        />
                    </div>

                    {/* Imagen de la pregunta */}
                    <div className="space-y-2">
                        <Label>Imagen de la pregunta (opcional)</Label>
                        <div className="flex gap-2">
                            <Input
                                type="file"
                                accept="image/*"
                                onChange={handleImageChange}
                            />
                            {questionImage && (
                                <Button variant="outline" size="sm" onClick={() => setQuestionImage(null)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Opciones */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label>Opciones de respuesta</Label>
                            <Button variant="outline" size="sm" onClick={addOption}>
                                <Plus className="h-4 w-4 mr-1" />
                                Agregar opción
                            </Button>
                        </div>

                        {options.map((option, index) => (
                            <div key={index} className="flex items-center gap-2">
                                <Checkbox
                                    checked={option.isCorrect}
                                    onCheckedChange={() => handleCorrectChange(index)}
                                />
                                <Input
                                    value={option.text}
                                    onChange={(e) => handleOptionChange(index, e.target.value)}
                                    placeholder={`Opción ${index + 1}`}
                                    className="flex-1"
                                />
                                {options.length > 2 && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removeOption(index)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        ))}
                        <p className="text-xs text-muted-foreground">
                            Marca la casilla de la opción correcta
                        </p>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsOpen(false)}>
                        Cancelar
                    </Button>
                    <Button onClick={handleSubmit} disabled={isSaving}>
                        {isSaving ? 'Guardando...' : 'Guardar Pregunta'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
