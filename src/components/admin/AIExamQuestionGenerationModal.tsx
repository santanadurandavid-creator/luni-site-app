'use client';

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import React, { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { ContentCategory, DetectedSubject } from '@/lib/types';
import { Upload, ImageIcon, Loader2, X, Crop, CheckCircle2, AlertCircle } from 'lucide-react';
import { isImage, validateImageSize, validateImageCount, fileToDataUri, MAX_IMAGES } from '@/lib/file-utils';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ImageCropper } from './ImageCropper';

interface AIExamQuestionGenerationModalProps {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    onQuestionsAdded: (questions: any[]) => void;
    defaultArea?: string;
    subjects: { id: string, name: string }[];
}

export function AIExamQuestionGenerationModal({
    isOpen,
    setIsOpen,
    onQuestionsAdded,
    defaultArea,
    subjects: availableSubjects
}: AIExamQuestionGenerationModalProps) {
    const { toast } = useToast();
    const [imageFiles, setImageFiles] = useState<File[]>([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [detectedSubjects, setDetectedSubjects] = useState<DetectedSubject[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [abortController, setAbortController] = useState<AbortController | null>(null);

    // Editing state
    const [editingQuestion, setEditingQuestion] = useState<{
        subjectId: string;
        questionIndex: number;
    } | null>(null);
    const [editQuestionText, setEditQuestionText] = useState('');
    const [editQuestionImageUrl, setEditQuestionImageUrl] = useState('');
    const [editQuestionOptions, setEditQuestionOptions] = useState<{ text: string, imageUrl: string }[]>([]);
    const [editQuestionAnswer, setEditQuestionAnswer] = useState('');

    // Cropping state
    const [showImageCropper, setShowImageCropper] = useState(false);
    const [croppingTarget, setCroppingTarget] = useState<{ type: 'question' | 'option', index?: number } | null>(null);

    const handleImageUpload = (files: FileList | null) => {
        if (!files) return;

        const newFiles = Array.from(files);
        const currentFiles = imageFiles;

        const countValidation = validateImageCount([...currentFiles, ...newFiles]);
        if (!countValidation.valid) {
            setError(countValidation.error || 'Demasiadas imágenes');
            return;
        }

        for (const file of newFiles) {
            if (!isImage(file)) {
                setError('Solo se permiten imágenes');
                return;
            }
            const sizeValidation = validateImageSize(file);
            if (!sizeValidation.valid) {
                setError(sizeValidation.error || 'Imagen demasiado grande');
                return;
            }
        }

        setImageFiles([...currentFiles, ...newFiles]);
        setError(null);
    };

    const handleRemoveImage = (index: number) => {
        const newFiles = [...imageFiles];
        newFiles.splice(index, 1);
        setImageFiles(newFiles);
        setDetectedSubjects([]); // Clear results if images change
    };

    const handleAnalyzeImages = async () => {
        if (imageFiles.length === 0) return;

        const controller = new AbortController();
        setAbortController(controller);
        setIsAnalyzing(true);
        setError(null);

        try {
            const imageDataUris = await Promise.all(imageFiles.map(fileToDataUri));

            const response = await fetch('/api/admin/analyze-guide-images', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    imageDataUris,
                    area: defaultArea || 'Área 1: Ciencias Físico-Matemáticas y de las Ingenierías',
                }),
                signal: controller.signal,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error al analizar las imágenes');
            }

            const analysisResult = await response.json();

            // Format questions to include options with imageUrl
            const formattedSubjects = (analysisResult.subjects || []).map((s: any) => ({
                ...s,
                questions: s.questions.map((q: any) => ({
                    ...q,
                    options: q.options.map((opt: any) =>
                        typeof opt === 'string' ? { text: opt, imageUrl: '' } : opt
                    ),
                    selected: true
                }))
            }));

            setDetectedSubjects(formattedSubjects);
            setIsAnalyzing(false);
            setAbortController(null);

            toast({
                title: 'Análisis Completado',
                description: `Se detectaron ${analysisResult.totalQuestions} preguntas`,
            });

        } catch (error: any) {
            if (error.name === 'AbortError') return;
            setIsAnalyzing(false);
            setError(error.message || 'Error al analizar las imágenes');
            toast({
                variant: 'destructive',
                title: 'Error',
                description: error.message || 'No se pudo analizar las imágenes'
            });
        }
    };

    const handleToggleQuestion = (subjectId: string, qIdx: number) => {
        setDetectedSubjects(prev => prev.map(s => {
            if (s.id !== subjectId) return s;
            return {
                ...s,
                questions: s.questions.map((q, idx) =>
                    idx === qIdx ? { ...q, selected: !q.selected } : q
                )
            };
        }));
    };

    const handleEditQuestion = (subjectId: string, qIdx: number) => {
        const subject = detectedSubjects.find(s => s.id === subjectId);
        if (!subject) return;

        const question = subject.questions[qIdx];
        setEditingQuestion({ subjectId, questionIndex: qIdx });
        setEditQuestionText(question.text);
        setEditQuestionImageUrl(question.imageUrl || '');
        setEditQuestionOptions((question.options || []).map((opt: any) =>
            typeof opt === 'string' ? { text: opt, imageUrl: '' } : opt
        ));
        setEditQuestionAnswer(question.answer || '');
    };

    const handleSaveQuestionEdit = () => {
        if (!editingQuestion) return;

        setDetectedSubjects(prev => prev.map(s => {
            if (s.id !== editingQuestion.subjectId) return s;
            const newQuestions = [...s.questions];
            newQuestions[editingQuestion.questionIndex] = {
                ...newQuestions[editingQuestion.questionIndex],
                text: editQuestionText,
                imageUrl: editQuestionImageUrl,
                options: editQuestionOptions,
                answer: editQuestionAnswer
            };
            return { ...s, questions: newQuestions };
        }));

        setEditingQuestion(null);
    };

    const handleAddSelectedQuestions = () => {
        const questionsToAdd: any[] = [];

        detectedSubjects.forEach(subject => {
            // Find the matching subject ID from availableSubjects
            // We'll try to match by name
            const matchingSubject = availableSubjects.find(
                s => s.name.toLowerCase() === subject.name.toLowerCase()
            );
            const subjectId = matchingSubject ? matchingSubject.id : (availableSubjects[0]?.id || 'unknown');

            subject.questions.forEach(q => {
                if (q.selected) {
                    questionsToAdd.push({
                        question: q.text,
                        imageUrl: q.imageUrl || '',
                        options: (q.options || []).map((opt: any) => ({
                            text: typeof opt === 'string' ? opt : (opt.text || ''),
                            imageUrl: typeof opt === 'string' ? '' : (opt.imageUrl || '')
                        })),
                        answer: q.answer || '',
                        subjectId: subjectId,
                        feedback: '',
                    });
                }
            });
        });

        if (questionsToAdd.length === 0) {
            toast({ variant: 'destructive', title: "Error", description: "No has seleccionado ninguna pregunta." });
            return;
        }

        onQuestionsAdded(questionsToAdd);
        setIsOpen(false);
        // Reset state
        setImageFiles([]);
        setDetectedSubjects([]);
    };

    const openCropper = (type: 'question' | 'option', index?: number) => {
        setCroppingTarget({ type, index });
        setShowImageCropper(true);
    };

    const handleCroppedImage = (url: string) => {
        if (croppingTarget?.type === 'question') {
            setEditQuestionImageUrl(url);
        } else if (croppingTarget?.type === 'option' && croppingTarget.index !== undefined) {
            const newOptions = [...editQuestionOptions];
            newOptions[croppingTarget.index] = { ...newOptions[croppingTarget.index], imageUrl: url };
            setEditQuestionOptions(newOptions);
        }
        setShowImageCropper(false);
    };

    return (
        <>
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <CheckCircle2 className="text-primary h-6 w-6" />
                            Generar Preguntas con IA
                        </DialogTitle>
                        <DialogDescription>
                            Sube imágenes de la guía para detectar preguntas automáticamente y añadirlas a este examen.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6 py-4">
                        {/* Image Upload Area */}
                        <div className="space-y-4">
                            <Label className="text-base font-semibold">1. Sube imágenes de la guía</Label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <label
                                    htmlFor="ai-exam-upload"
                                    className="border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer relative"
                                >
                                    <input
                                        id="ai-exam-upload"
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        onChange={(e) => handleImageUpload(e.target.files)}
                                        className="sr-only"
                                        disabled={isAnalyzing}
                                    />
                                    <Upload className="h-10 w-10 text-muted-foreground mb-2" />
                                    <p className="text-sm font-medium">Haga clic o arrastre las imágenes</p>
                                    <p className="text-xs text-muted-foreground mt-1">PNG, JPG hasta 5MB</p>
                                </label>

                                <div className="grid grid-cols-3 gap-2">
                                    {imageFiles.map((file, idx) => (
                                        <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border">
                                            <img
                                                src={URL.createObjectURL(file)}
                                                alt="preview"
                                                className="w-full h-full object-cover"
                                            />
                                            <button
                                                onClick={() => handleRemoveImage(idx)}
                                                className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 shadow-md hover:bg-destructive/90"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {imageFiles.length > 0 && (
                                <Button
                                    onClick={handleAnalyzeImages}
                                    className="w-full"
                                    disabled={isAnalyzing}
                                >
                                    {isAnalyzing ? (
                                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analizando...</>
                                    ) : (
                                        'Analizar Imágenes y Detectar Preguntas'
                                    )}
                                </Button>
                            )}
                        </div>

                        {error && (
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        {/* Analysis Progress */}
                        {isAnalyzing && (
                            <div className="space-y-2">
                                <Progress value={45} className="animate-pulse" />
                                <p className="text-xs text-center text-muted-foreground italic">Esto puede tomar unos segundos...</p>
                            </div>
                        )}

                        {/* Detected Questions */}
                        {detectedSubjects.length > 0 && !isAnalyzing && (
                            <div className="space-y-4">
                                <Label className="text-base font-semibold">2. Selecciona y edita las preguntas detectadas</Label>
                                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                                    {detectedSubjects.map(subject => (
                                        <div key={subject.id} className="border rounded-xl spill-hidden">
                                            <div className="bg-muted/50 p-3 border-b flex justify-between items-center">
                                                <h3 className="font-semibold text-sm">{subject.name}</h3>
                                                <span className="text-xs text-muted-foreground">{subject.questions.length} preguntas</span>
                                            </div>
                                            <div className="divide-y">
                                                {subject.questions.map((q, qIdx) => (
                                                    <div key={qIdx} className="p-3 flex items-start gap-3 hover:bg-muted/20 transition-colors">
                                                        <input
                                                            type="checkbox"
                                                            checked={q.selected}
                                                            onChange={() => handleToggleQuestion(subject.id, qIdx)}
                                                            className="mt-1 h-4 w-4 rounded border-gray-300 text-primary shadow-sm"
                                                        />
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-medium line-clamp-2">
                                                                <span className="text-primary mr-1">{q.originalIndex || qIdx + 1}.</span>
                                                                {q.text}
                                                            </p>
                                                            <div className="flex items-center gap-3 mt-1">
                                                                {q.imageUrl && <span className="text-[10px] text-blue-500 flex items-center gap-1"><ImageIcon className="h-3 w-3" /> Con imagen</span>}
                                                                <span className="text-[10px] text-green-600 font-medium">Resp: {q.answer || 'No detectada'}</span>
                                                            </div>
                                                        </div>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleEditQuestion(subject.id, qIdx)}
                                                            className="h-8 text-xs text-primary hover:text-primary hover:bg-primary/10"
                                                        >
                                                            Editar
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => setIsOpen(false)}>Cancelar</Button>
                        <Button
                            onClick={handleAddSelectedQuestions}
                            disabled={detectedSubjects.length === 0}
                            className="bg-primary hover:bg-primary/90"
                        >
                            Añadir Preguntas al Examen
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Specific Question Modal */}
            <Dialog open={!!editingQuestion} onOpenChange={(open) => !open && setEditingQuestion(null)}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Editar Pregunta Detectada</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Texto de la Pregunta</Label>
                            <Textarea
                                value={editQuestionText}
                                onChange={(e) => setEditQuestionText(e.target.value)}
                                rows={4}
                            />
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label>Imagen de la Pregunta</Label>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => openCropper('question')}
                                    className="h-8"
                                >
                                    <Crop className="mr-2 h-4 w-4" /> Recortar de Guía
                                </Button>
                            </div>
                            {editQuestionImageUrl && (
                                <div className="border rounded-lg p-2 bg-muted/30">
                                    <img src={editQuestionImageUrl} alt="preview" className="max-h-40 mx-auto rounded" />
                                    <Input
                                        value={editQuestionImageUrl}
                                        onChange={(e) => setEditQuestionImageUrl(e.target.value)}
                                        className="mt-2 text-xs"
                                        placeholder="URL de la imagen"
                                    />
                                </div>
                            )}
                        </div>

                        <div className="space-y-3">
                            <Label>Opciones de Respuesta</Label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {editQuestionOptions.map((opt, idx) => (
                                    <div key={idx} className="p-3 border rounded-lg space-y-2 bg-muted/10">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-xs">{String.fromCharCode(65 + idx)})</span>
                                            <Input
                                                value={opt.text}
                                                onChange={(e) => {
                                                    const newOpts = [...editQuestionOptions];
                                                    newOpts[idx] = { ...newOpts[idx], text: e.target.value };
                                                    setEditQuestionOptions(newOpts);
                                                }}
                                                className="flex-1 h-8 text-sm"
                                            />
                                            <input
                                                type="radio"
                                                name="ai-correct"
                                                checked={editQuestionAnswer === opt.text}
                                                onChange={() => setEditQuestionAnswer(opt.text)}
                                            />
                                        </div>
                                        <div className="flex items-center justify-between gap-2">
                                            {opt.imageUrl ? (
                                                <img src={opt.imageUrl} className="h-10 w-auto rounded border" alt="" />
                                            ) : (
                                                <span className="text-[10px] text-muted-foreground italic">Sin imagen</span>
                                            )}
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => openCropper('option', idx)}
                                                className="h-6 text-[10px]"
                                            >
                                                <Crop className="h-3 w-3 mr-1" /> Cortar
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button onClick={handleSaveQuestionEdit}>Guardar Cambios</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Reusable Image Cropper wrapper */}
            {editingQuestion && (
                <ImageCropper
                    isOpen={showImageCropper}
                    onClose={() => setShowImageCropper(false)}
                    sourceImages={imageFiles.map(file => URL.createObjectURL(file))}
                    onImageCropped={handleCroppedImage}
                    area={defaultArea || 'Área 1'}
                    questionId={`ai_gen_${editingQuestion.subjectId}_${editingQuestion.questionIndex}`}
                />
            )}
        </>
    );
}
