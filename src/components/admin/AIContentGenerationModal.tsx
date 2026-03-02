'use client';

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { ContentCategory, DetectedSubject } from '@/lib/types';
import { Upload, FileText, Image as ImageIcon, Loader2, Trash2, CheckCircle2, AlertCircle, X, Crop } from 'lucide-react';
import { isImage, validateImageSize, validateImageCount, formatFileSize, fileToDataUri, MAX_IMAGES } from '@/lib/file-utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { getFirebaseServices } from '@/lib/firebase';
import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { useAuth } from '@/hooks/use-auth';
import { ImageCropper } from './ImageCropper';
import { DeletePasswordModal } from './DeletePasswordModal';

interface AIContentGenerationModalProps {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
}

type AreaKey = 'area1' | 'area2' | 'area3' | 'area4';

interface AreaData {
    imageFiles: File[];
    coverImage: File | null;
    coverImageUrl: string | null;
    isAnalyzing: boolean;
    analysisProgress: number;
    detectedSubjects: DetectedSubject[];
    readingText?: string;
    showReadingInput?: boolean;
    isGenerating: boolean;
    progress: number;
    currentItem: string;
    hasContent: boolean;
    error: string | null;
    abortController: AbortController | null;
    textQuestion?: string;
    showTextInput?: boolean;
}

const areaCategories: Record<AreaKey, ContentCategory> = {
    area1: 'Área 1: Ciencias Físico-Matemáticas y de las Ingenierías',
    area2: 'Área 2: Ciencias Biológicas, Químicas y de la Salud',
    area3: 'Área 3: Ciencias Sociales',
    area4: 'Área 4: Humanidades y de las Artes',
};

const initialAreaData: AreaData = {
    imageFiles: [],
    coverImage: null,
    coverImageUrl: null,
    isAnalyzing: false,
    analysisProgress: 0,
    detectedSubjects: [],
    readingText: '',
    showReadingInput: false,
    isGenerating: false,
    progress: 0,
    currentItem: '',
    hasContent: false,
    error: null,
    abortController: null,
    textQuestion: '',
    showTextInput: false,
};

export function AIContentGenerationModal({ isOpen, setIsOpen }: AIContentGenerationModalProps) {
    const { toast } = useToast();
    const { firebaseUser } = useAuth();
    const [areas, setAreas] = useState<Record<AreaKey, AreaData>>({
        area1: { ...initialAreaData },
        area2: { ...initialAreaData },
        area3: { ...initialAreaData },
        area4: { ...initialAreaData },
    });
    const [showModeDialog, setShowModeDialog] = useState(false);
    const [pendingAreaKey, setPendingAreaKey] = useState<AreaKey | null>(null);

    // Estado para editar preguntas
    const [editingQuestion, setEditingQuestion] = useState<{
        areaKey: AreaKey;
        subjectId: string;
        questionIndex: number;
    } | null>(null);
    const [editQuestionText, setEditQuestionText] = useState('');
    const [editQuestionImageUrl, setEditQuestionImageUrl] = useState('');
    const [editQuestionOptions, setEditQuestionOptions] = useState<string[]>([]);
    const [editQuestionAnswer, setEditQuestionAnswer] = useState('');
    const [showImageCropper, setShowImageCropper] = useState(false);

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [areaKeyToDelete, setAreaKeyToDelete] = useState<AreaKey | null>(null);

    // Check if content exists for each area
    useEffect(() => {
        if (!isOpen) return;

        const checkExistingContent = async () => {
            const { db } = getFirebaseServices();

            for (const [key, category] of Object.entries(areaCategories)) {
                const q = query(
                    collection(db, 'content'),
                    where('category', '==', category),
                    where('isAIGenerated', '==', true)
                );

                const snapshot = await getDocs(q);
                setAreas(prev => ({
                    ...prev,
                    [key]: { ...prev[key as AreaKey], hasContent: !snapshot.empty }
                }));
            }
        };

        checkExistingContent();
    }, [isOpen]);

    const handleImageUpload = async (areaKey: AreaKey, files: FileList | null) => {
        if (!files) return;

        const newFiles = Array.from(files);
        const currentFiles = areas[areaKey].imageFiles;

        // Validate count
        const countValidation = validateImageCount([...currentFiles, ...newFiles]);
        if (!countValidation.valid) {
            setAreas(prev => ({ ...prev, [areaKey]: { ...prev[areaKey], error: countValidation.error || '' } }));
            return;
        }

        // Validate type and size
        for (const file of newFiles) {
            if (!isImage(file)) {
                setAreas(prev => ({ ...prev, [areaKey]: { ...prev[areaKey], error: 'Solo se permiten imágenes' } }));
                return;
            }
            const sizeValidation = validateImageSize(file);
            if (!sizeValidation.valid) {
                setAreas(prev => ({ ...prev, [areaKey]: { ...prev[areaKey], error: sizeValidation.error || '' } }));
                return;
            }
        }

        const updatedFiles = [...currentFiles, ...newFiles];
        setAreas(prev => ({ ...prev, [areaKey]: { ...prev[areaKey], imageFiles: updatedFiles, error: null } }));


    };

    const handleAddMoreImages = (areaKey: AreaKey) => {
        const inputId = `file-upload-${areaKey}`;
        const input = document.getElementById(inputId);
        if (input) input.click();
    };

    const DEFAULT_SUBJECTS = [
        'Matemáticas', 'Física', 'Química', 'Biología', 'Historia de México', 'Historia Universal', 'Geografía', 'Literatura', 'Español', 'Filosofía'
    ];

    const toggleTextInput = (areaKey: AreaKey) => {
        setAreas(prev => {
            const isClosing = prev[areaKey].showTextInput;
            const newShowTextInput = !isClosing;

            let newDetectedSubjects = prev[areaKey].detectedSubjects;

            // If opening text input and no subjects are detected, populate with defaults
            if (newShowTextInput && newDetectedSubjects.length === 0) {
                newDetectedSubjects = DEFAULT_SUBJECTS.map((name, index) => ({
                    id: `default-${index}`,
                    name,
                    questionCount: 0,
                    questions: [],
                    selected: false
                }));
            }

            return {
                ...prev,
                [areaKey]: {
                    ...prev[areaKey],
                    showTextInput: newShowTextInput,
                    textQuestion: isClosing ? '' : prev[areaKey].textQuestion,
                    detectedSubjects: newDetectedSubjects
                }
            };
        });
    };

    const handleCancel = (areaKey: AreaKey) => {
        const areaData = areas[areaKey];
        if (areaData.abortController) {
            areaData.abortController.abort();
            setAreas(prev => ({
                ...prev,
                [areaKey]: {
                    ...prev[areaKey],
                    isAnalyzing: false,
                    isGenerating: false,
                    abortController: null,
                    currentItem: 'Cancelado por el usuario',
                    error: 'Operación cancelada'
                }
            }));
        }
    };

    const handleRemoveImage = (areaKey: AreaKey, index: number) => {
        setAreas(prev => {
            const newFiles = [...prev[areaKey].imageFiles];
            newFiles.splice(index, 1);
            return {
                ...prev,
                [areaKey]: { ...prev[areaKey], imageFiles: newFiles, detectedSubjects: [] } // Clear results on change
            };
        });
    };

    const handleAnalyzeImages = async (areaKey: AreaKey) => {
        const areaData = areas[areaKey];
        if (areaData.imageFiles.length === 0) return;

        const abortController = new AbortController();
        setAreas(prev => ({ ...prev, [areaKey]: { ...prev[areaKey], isAnalyzing: true, analysisProgress: 0, error: null, abortController } }));

        try {
            // Convert images to data URIs
            const imageDataUris = await Promise.all(areaData.imageFiles.map(fileToDataUri));

            // Call analysis API
            const response = await fetch('/api/admin/analyze-guide-images', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    imageDataUris,
                    area: areaCategories[areaKey],
                }),
                signal: abortController.signal,
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Error al analizar las imágenes');
            }

            const analysisResult = await response.json();

            setAreas(prev => ({
                ...prev,
                [areaKey]: {
                    ...prev[areaKey],
                    isAnalyzing: false,
                    analysisProgress: 100,
                    detectedSubjects: analysisResult.subjects || [],
                    abortController: null,
                }
            }));

            // Guardar automáticamente el análisis en Firestore
            try {
                await fetch('/api/admin/save-analyzed-images', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        area: areaKey,
                        subjects: analysisResult.subjects,
                        totalQuestions: analysisResult.totalQuestions,
                        userId: firebaseUser?.uid || 'admin',
                    }),
                });
            } catch (saveError) {
                console.error('Error saving analysis:', saveError);
                // No mostramos error al usuario, solo lo registramos
            }

            toast({
                title: 'Análisis Completado',
                description: `Se detectaron ${analysisResult.totalQuestions} preguntas en ${analysisResult.subjects.length} materias`,
            });

        } catch (error: any) {
            if (error.name === 'AbortError') return;
            console.error('Error analyzing images:', error);
            setAreas(prev => ({
                ...prev,
                [areaKey]: {
                    ...prev[areaKey],
                    isAnalyzing: false,
                    error: error.message || 'Error al analizar las imágenes'
                }
            }));
            toast({
                variant: 'destructive',
                title: 'Error',
                description: error.message || 'No se pudo analizar las imágenes'
            });
        }
    };

    const handleAnalyzeText = async (areaKey: AreaKey) => {
        const areaData = areas[areaKey];
        if (!areaData.textQuestion) return;

        const abortController = new AbortController();
        setAreas(prev => ({ ...prev, [areaKey]: { ...prev[areaKey], isAnalyzing: true, analysisProgress: 0, error: null, abortController } }));

        try {
            const response = await fetch('/api/admin/analyze-text-question', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: areaData.textQuestion,
                    area: areaCategories[areaKey],
                }),
                signal: abortController.signal,
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Error al analizar el texto');
            }

            const analysisResult = await response.json();

            setAreas(prev => ({
                ...prev,
                [areaKey]: {
                    ...prev[areaKey],
                    isAnalyzing: false,
                    analysisProgress: 100,
                    detectedSubjects: analysisResult.subjects || [],
                    abortController: null,
                }
            }));

            toast({
                title: 'Texto Analizado',
                description: `Se detectó la materia: ${analysisResult.subjects[0]?.name || 'No identificada'}`,
            });

        } catch (error: any) {
            if (error.name === 'AbortError') return;
            console.error('Error analyzing text:', error);
            setAreas(prev => ({
                ...prev,
                [areaKey]: {
                    ...prev[areaKey],
                    isAnalyzing: false,
                    error: error.message || 'Error al analizar el texto'
                }
            }));
            toast({
                variant: 'destructive',
                title: 'Error',
                description: error.message || 'No se pudo analizar el texto'
            });
        }
    };



    const handleToggleSubject = (areaKey: AreaKey, subjectId: string) => {
        setAreas(prev => ({
            ...prev,
            [areaKey]: {
                ...prev[areaKey],
                detectedSubjects: prev[areaKey].detectedSubjects.map(subject =>
                    subject.id === subjectId
                        ? {
                            ...subject,
                            selected: !subject.selected,
                            // When toggling subject, also toggle all its questions
                            questions: subject.questions.map(q => ({ ...q, selected: !subject.selected }))
                        }
                        : subject
                )
            }
        }));
    };

    const handleToggleQuestion = (areaKey: AreaKey, subjectId: string, questionIndex: number) => {
        setAreas(prev => ({
            ...prev,
            [areaKey]: {
                ...prev[areaKey],
                detectedSubjects: prev[areaKey].detectedSubjects.map(subject => {
                    if (subject.id !== subjectId) return subject;

                    const updatedQuestions = subject.questions.map((q, idx) =>
                        idx === questionIndex ? { ...q, selected: !q.selected } : q
                    );

                    // Update subject selection based on whether any questions are selected
                    const anySelected = updatedQuestions.some(q => q.selected);

                    return {
                        ...subject,
                        questions: updatedQuestions,
                        selected: anySelected
                    };
                })
            }
        }));
    };

    const handleToggleRequiresReading = (areaKey: AreaKey, subjectId: string, questionIndex: number) => {
        setAreas(prev => ({
            ...prev,
            [areaKey]: {
                ...prev[areaKey],
                detectedSubjects: prev[areaKey].detectedSubjects.map(subject => {
                    if (subject.id !== subjectId) return subject;

                    const updatedQuestions = subject.questions.map((q, idx) =>
                        idx === questionIndex ? { ...q, requiresReading: !q.requiresReading } : q
                    );

                    return {
                        ...subject,
                        questions: updatedQuestions,
                    };
                })
            }
        }));
    };

    const handleSelectAllQuestions = (areaKey: AreaKey, subjectId: string) => {
        setAreas(prev => ({
            ...prev,
            [areaKey]: {
                ...prev[areaKey],
                detectedSubjects: prev[areaKey].detectedSubjects.map(subject =>
                    subject.id === subjectId
                        ? {
                            ...subject,
                            selected: true,
                            questions: subject.questions.map(q => ({ ...q, selected: true }))
                        }
                        : subject
                )
            }
        }));
    };

    const handleDeselectAllQuestions = (areaKey: AreaKey, subjectId: string) => {
        setAreas(prev => ({
            ...prev,
            [areaKey]: {
                ...prev[areaKey],
                detectedSubjects: prev[areaKey].detectedSubjects.map(subject =>
                    subject.id === subjectId
                        ? {
                            ...subject,
                            selected: false,
                            questions: subject.questions.map(q => ({ ...q, selected: false }))
                        }
                        : subject
                )
            }
        }));
    };

    const handleEditQuestion = (areaKey: AreaKey, subjectId: string, questionIndex: number) => {
        const subject = areas[areaKey].detectedSubjects.find(s => s.id === subjectId);
        if (!subject) return;

        const question = subject.questions[questionIndex];
        setEditingQuestion({ areaKey, subjectId, questionIndex });
        setEditQuestionText(question.text);
        setEditQuestionImageUrl(question.imageUrl || '');
        setEditQuestionOptions((question.options || []).map((opt: any) =>
            typeof opt === 'string' ? opt : (opt.text || '')
        ));
        setEditQuestionAnswer(question.answer || '');
    };

    const handleSaveQuestionEdit = () => {
        if (!editingQuestion) return;

        const { areaKey, subjectId, questionIndex } = editingQuestion;

        setAreas(prev => ({
            ...prev,
            [areaKey]: {
                ...prev[areaKey],
                detectedSubjects: prev[areaKey].detectedSubjects.map(subject => {
                    if (subject.id !== subjectId) return subject;

                    const updatedQuestions = [...subject.questions];
                    updatedQuestions[questionIndex] = {
                        ...updatedQuestions[questionIndex],
                        text: editQuestionText,
                        imageUrl: editQuestionImageUrl || null,
                        options: editQuestionOptions,
                        answer: editQuestionAnswer
                    };

                    return {
                        ...subject,
                        questions: updatedQuestions
                    };
                })
            }
        }));

        setEditingQuestion(null);
        toast({ title: 'Pregunta actualizada', description: 'Los cambios se han guardado correctamente' });
    };


    const handleCoverImageUpload = (areaKey: AreaKey, file: File | null) => {
        if (!file) {
            setAreas(prev => ({ ...prev, [areaKey]: { ...prev[areaKey], coverImage: null } }));
            return;
        }

        if (!file.type.startsWith('image/')) {
            toast({ variant: 'destructive', title: 'Error', description: 'El archivo debe ser una imagen' });
            return;
        }

        setAreas(prev => ({ ...prev, [areaKey]: { ...prev[areaKey], coverImage: file } }));
    };

    const handleGenerateContent = async (areaKey: AreaKey, replaceExisting: boolean = false) => {
        const areaData = areas[areaKey];

        if (areaData.imageFiles.length === 0 && !areaData.textQuestion) {
            toast({ variant: 'destructive', title: 'Error', description: 'Debes subir imágenes o ingresar una pregunta en texto primero' });
            return;
        }

        // Check if any questions are selected
        const selectedSubjects = areaData.detectedSubjects.filter(s => s.selected);
        const totalSelectedQuestions = areaData.detectedSubjects.reduce(
            (total, s) => total + (s.questions.filter(q => q.selected).length || 0),
            0
        );

        if (areaData.detectedSubjects.length > 0 && totalSelectedQuestions === 0 && !areaData.textQuestion) {
            toast({ variant: 'destructive', title: 'Error', description: 'Debes seleccionar al menos una pregunta o ingresar texto' });
            return;
        }

        if (areaData.textQuestion && selectedSubjects.length === 0) {
            toast({ variant: 'destructive', title: 'Error', description: 'Debes seleccionar al menos una materia para generar contenido con el texto' });
            return;
        }

        // If content exists and we haven't decided yet, show dialog
        if (areaData.hasContent && !replaceExisting && pendingAreaKey !== areaKey) {
            setPendingAreaKey(areaKey);
            setShowModeDialog(true);
            return;
        }

        // If user chose to replace, delete existing content first
        if (replaceExisting && areaData.hasContent) {
            await handleDeleteContent(areaKey);
        }

        const abortController = new AbortController();
        setAreas(prev => ({
            ...prev,
            [areaKey]: { ...prev[areaKey], isGenerating: true, progress: 0, currentItem: 'Iniciando...', error: null, abortController }
        }));

        try {
            const { storage } = getFirebaseServices();

            // Upload cover image if provided
            let coverImageUrl: string | null = null;
            if (areaData.coverImage) {
                const imageRef = ref(storage, `ai-content-covers/${areaKey}_${Date.now()}.jpg`);
                const snapshot = await uploadBytes(imageRef, areaData.coverImage);
                coverImageUrl = await getDownloadURL(snapshot.ref);
                setAreas(prev => ({ ...prev, [areaKey]: { ...prev[areaKey], coverImageUrl } }));
            }

            // Convert images to data URIs
            setAreas(prev => ({ ...prev, [areaKey]: { ...prev[areaKey], currentItem: 'Procesando imágenes...' } }));
            const imageDataUris = await Promise.all(areaData.imageFiles.map(fileToDataUri));

            // Prepare selected subjects data - only include selected questions
            const selectedSubjectsData = selectedSubjects.map(subject => {
                // Filter to only include selected questions
                let selectedQuestions = subject.questions.filter(q => q.selected);

                // If no questions but we have a text question, create a virtual question
                if (selectedQuestions.length === 0 && areaData.textQuestion) {
                    selectedQuestions = [{
                        text: areaData.textQuestion,
                        imageUrl: null,
                        options: [],
                        answer: '',
                        selected: true,
                        requiresReading: false
                    }] as any;
                }

                return {
                    name: subject.name,
                    questions: selectedQuestions.map(q => ({
                        text: q.text,
                        imageUrl: q.imageUrl || null,
                        options: q.options,
                        answer: q.answer,
                        originalIndex: q.originalIndex,
                        requiresReading: q.requiresReading || false
                    })),
                };
            }).filter(subject => subject.questions.length > 0);

            // Call API to generate content
            setAreas(prev => ({ ...prev, [areaKey]: { ...prev[areaKey], currentItem: 'Generando contenido con IA...' } }));

            const response = await fetch('/api/admin/generate-bulk-content', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    area: areaCategories[areaKey],
                    imageDataUris,
                    coverImageUrl: coverImageUrl || '',
                    selectedSubjects: selectedSubjectsData.length > 0 ? selectedSubjectsData : undefined,
                    readingText: areaData.readingText || '',
                    textQuestion: areaData.textQuestion || '',
                }),
                signal: abortController.signal,
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Error al generar contenido');
            }

            // Read streaming response
            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            let receivedCompleted = false;

            if (reader) {
                try {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;

                        buffer += decoder.decode(value, { stream: true });
                        const lines = buffer.split('\n');
                        buffer = lines.pop() || '';

                        for (const line of lines) {
                            if (line.trim() && line.startsWith('data: ')) {
                                const jsonStr = line.slice(6).trim();
                                if (!jsonStr) continue;

                                try {
                                    const data = JSON.parse(jsonStr);

                                    if (data.progress !== undefined) {
                                        setAreas(prev => ({
                                            ...prev,
                                            [areaKey]: {
                                                ...prev[areaKey],
                                                progress: data.progress,
                                                currentItem: data.currentItem || prev[areaKey].currentItem
                                            }
                                        }));
                                    }

                                    if (data.error) {
                                        throw new Error(data.error);
                                    }

                                    if (data.completed) {
                                        receivedCompleted = true;
                                        setAreas(prev => ({
                                            ...prev,
                                            [areaKey]: {
                                                ...prev[areaKey],
                                                isGenerating: false,
                                                progress: 100,
                                                currentItem: 'Completado',
                                                hasContent: true,
                                                abortController: null
                                            }
                                        }));

                                        toast({
                                            title: 'Contenido Generado',
                                            description: `Se generaron ${data.totalItems} items para ${areaCategories[areaKey]}`,
                                        });
                                    }
                                } catch (parseError: any) {
                                    // If it's our own thrown error (e.g. from data.error case), propagate it
                                    if (parseError.message && (parseError.message === jsonStr || jsonStr.includes(parseError.message))) {
                                        throw parseError;
                                    }
                                    console.error('Error parsing JSON:', parseError, 'Line:', line);
                                }
                            }
                        }
                    }

                    if (!receivedCompleted && !abortController.signal.aborted) {
                        throw new Error('La conexión se cerró inesperadamente antes de completar la generación.');
                    }

                } finally {
                    reader.releaseLock();
                }
            } else {
                throw new Error('No se pudo establecer el canal de comunicación con el servidor.');
            }

        } catch (error: any) {
            if (error.name === 'AbortError') return;
            console.error('Error generating content:', error);
            setAreas(prev => ({
                ...prev,
                [areaKey]: {
                    ...prev[areaKey],
                    isGenerating: false,
                    error: error.message || 'Error al generar contenido',
                    abortController: null
                }
            }));
            toast({
                variant: 'destructive',
                title: 'Error',
                description: error.message || 'No se pudo generar el contenido'
            });
        }
    };

    const handleDeleteContent = (areaKey: AreaKey) => {
        setAreaKeyToDelete(areaKey);
        setIsDeleteModalOpen(true);
    };

    const confirmDeleteContentArea = async () => {
        if (!areaKeyToDelete) return;
        const areaKey = areaKeyToDelete;

        try {
            const response = await fetch('/api/admin/delete-area-content', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ area: areaCategories[areaKey] }),
            });

            if (!response.ok) {
                throw new Error('Error al eliminar contenido');
            }

            const result = await response.json();

            setAreas(prev => ({
                ...prev,
                [areaKey]: {
                    ...initialAreaData,
                    imageFiles: prev[areaKey].imageFiles,
                    coverImage: prev[areaKey].coverImage,
                }
            }));

            toast({
                title: 'Contenido Eliminado',
                description: `Se eliminaron ${result.deletedCount} items`,
            });
        } catch (error: any) {
            console.error('Error deleting content:', error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'No se pudo eliminar el contenido'
            });
        } finally {
            setAreaKeyToDelete(null);
            setIsDeleteModalOpen(false);
        }
    };

    const renderAreaCard = (areaKey: AreaKey, areaNumber: number) => {
        const areaData = areas[areaKey];
        const category = areaCategories[areaKey];

        return (
            <Card key={areaKey} className="relative">
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <span>Área {areaNumber}</span>
                        {areaData.hasContent && (
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                        )}
                    </CardTitle>
                    <CardDescription className="text-xs">{category}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Image Upload */}
                    <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                            <ImageIcon className="h-4 w-4" />
                            Imágenes de la Guía ({areaData.imageFiles.length}/{MAX_IMAGES})
                        </Label>
                        <div className="flex flex-col gap-2">
                            <div className="flex gap-2">
                                <Input
                                    id={`file-upload-${areaKey}`}
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    onChange={(e) => handleImageUpload(areaKey, e.target.files)}
                                    disabled={areaData.isGenerating || areaData.isAnalyzing || areaData.imageFiles.length >= MAX_IMAGES || areaData.showTextInput}
                                    className="flex-1"
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => toggleTextInput(areaKey)}
                                    disabled={areaData.isGenerating || areaData.isAnalyzing}
                                    className={areaData.showTextInput ? "bg-blue-50 border-blue-200 text-blue-700" : ""}
                                >
                                    <FileText className="h-4 w-4 mr-2" />
                                    Ingresar pregunta con texto
                                </Button>
                            </div>

                            {areaData.showTextInput && (
                                <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
                                    <Textarea
                                        placeholder="Pega aquí la pregunta en texto... La IA generará el contenido basado en esta pregunta."
                                        value={areaData.textQuestion}
                                        onChange={(e) => setAreas(prev => ({
                                            ...prev,
                                            [areaKey]: { ...prev[areaKey], textQuestion: e.target.value }
                                        }))}
                                        className="min-h-[100px] text-sm resize-y"
                                    />
                                </div>
                            )}
                        </div>

                        {/* Image Preview List */}
                        {areaData.imageFiles.length > 0 && (
                            <div className="grid grid-cols-4 gap-2 mt-2">
                                {areaData.imageFiles.map((file, index) => (
                                    <div key={index} className="relative group border rounded-md overflow-hidden aspect-square">
                                        <img
                                            src={URL.createObjectURL(file)}
                                            alt={`Preview ${index}`}
                                            className="w-full h-full object-cover"
                                        />
                                        <button
                                            onClick={() => handleRemoveImage(areaKey, index)}
                                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {((areaData.imageFiles.length > 0 && !areaData.showTextInput) || (areaData.showTextInput && areaData.textQuestion)) && !areaData.isGenerating && (
                            <div className="flex gap-2 mt-2">
                                {!areaData.isAnalyzing ? (
                                    <Button
                                        onClick={() => areaData.showTextInput ? handleAnalyzeText(areaKey) : handleAnalyzeImages(areaKey)}
                                        className="flex-1"
                                        variant="secondary"
                                    >
                                        <Loader2 className="mr-2 h-4 w-4" />
                                        {areaData.detectedSubjects.length > 0 && areaData.detectedSubjects.some(s => s.questions.length > 0) ? 'Analizar Nuevamente' : areaData.showTextInput ? 'Analizar Texto' : 'Analizar Imágenes'}
                                    </Button>
                                ) : (
                                    <Button
                                        onClick={() => handleCancel(areaKey)}
                                        className="flex-1"
                                        variant="destructive"
                                    >
                                        <X className="mr-2 h-4 w-4" />
                                        Cancelar Análisis
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Cover Image Upload */}
                    <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                            <ImageIcon className="h-4 w-4" />
                            Imagen de Portada (Opcional)
                        </Label>
                        <div className="flex gap-2">
                            <Input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleCoverImageUpload(areaKey, e.target.files?.[0] || null)}
                                disabled={areaData.isGenerating}
                                className="flex-1"
                            />
                            {areaData.coverImage && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleCoverImageUpload(areaKey, null)}
                                    disabled={areaData.isGenerating}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                        {areaData.coverImage && (
                            <p className="text-xs text-muted-foreground">
                                {areaData.coverImage.name}
                            </p>
                        )}
                    </div>

                    {/* Error Display */}
                    {areaData.error && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{areaData.error}</AlertDescription>
                        </Alert>
                    )}

                    {/* Analysis Progress */}
                    {areaData.isAnalyzing && (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">{areaData.showTextInput ? 'Analizando texto y detectando materia...' : 'Analizando imágenes y detectando preguntas...'}</span>
                                <Loader2 className="h-4 w-4 animate-spin" />
                            </div>
                            <Progress value={50} className="animate-pulse" />
                        </div>
                    )}

                    {/* Detected Subjects */}
                    {!areaData.isAnalyzing && areaData.detectedSubjects.length > 0 && (
                        <div className="space-y-4">
                            {/* Reading Text Input */}
                            <div className="space-y-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setAreas(prev => ({
                                        ...prev,
                                        [areaKey]: { ...prev[areaKey], showReadingInput: !prev[areaKey].showReadingInput }
                                    }))}
                                    className="w-full flex items-center justify-center gap-2 py-6 bg-blue-50/50 hover:bg-blue-50 border-blue-200 text-blue-700 font-medium"
                                >
                                    <FileText className="h-4 w-4" />
                                    {areaData.readingText ? 'Editar Lectura Base' : 'Agregar Lectura Base'}
                                </Button>

                                {areaData.showReadingInput && (
                                    <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
                                        <Label className="text-xs font-semibold text-blue-700">Lectura para comprensión lectora</Label>
                                        <Textarea
                                            placeholder="Pega aquí el texto de la lectura..."
                                            value={areaData.readingText}
                                            onChange={(e) => setAreas(prev => ({
                                                ...prev,
                                                [areaKey]: { ...prev[areaKey], readingText: e.target.value }
                                            }))}
                                            className="min-h-[200px] text-sm resize-y border-blue-200 focus-visible:ring-blue-400"
                                        />
                                        <p className="text-[10px] text-muted-foreground italic">
                                            * Las preguntas marcadas como "Requiere lectura" utilizarán este texto.
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
                                <div className="flex items-center justify-between">
                                    <Label className="text-sm font-semibold">Materias y Preguntas Detectadas</Label>
                                    <span className="text-xs text-muted-foreground">
                                        {areaData.detectedSubjects.reduce((total, s) => total + (s.questions.filter(q => q.selected).length || 0), 0)} preguntas seleccionadas
                                    </span>
                                </div>
                                <div className="space-y-3 max-h-96 overflow-y-auto">
                                    {areaData.detectedSubjects.map((subject) => {
                                        const selectedQuestions = subject.questions.filter(q => q.selected).length;
                                        const totalQuestions = subject.questions.length;

                                        return (
                                            <div key={subject.id} className="border rounded-lg overflow-hidden">
                                                {/* Subject Header */}
                                                <div className="bg-muted/50 p-3 border-b">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3 flex-1">
                                                            <input
                                                                type="checkbox"
                                                                checked={subject.selected}
                                                                onChange={() => handleToggleSubject(areaKey, subject.id)}
                                                                className="h-4 w-4 rounded border-gray-300"
                                                            />
                                                            <div className="flex-1">
                                                                <p className="text-sm font-semibold">{subject.name}</p>
                                                                <p className="text-xs text-muted-foreground">
                                                                    {selectedQuestions} de {totalQuestions} preguntas seleccionadas
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="flex gap-1">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleSelectAllQuestions(areaKey, subject.id)}
                                                                className="h-7 text-xs"
                                                            >
                                                                Todas
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleDeselectAllQuestions(areaKey, subject.id)}
                                                                className="h-7 text-xs"
                                                            >
                                                                Ninguna
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Questions List */}
                                                <div className="p-2 space-y-1 max-h-48 overflow-y-auto">
                                                    {subject.questions.map((question, qIdx) => (
                                                        <div
                                                            key={qIdx}
                                                            className="flex items-start gap-2 p-2 rounded hover:bg-muted/30 transition-colors"
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={question.selected || false}
                                                                onChange={() => handleToggleQuestion(areaKey, subject.id, qIdx)}
                                                                className="h-4 w-4 rounded border-gray-300 mt-0.5 shrink-0"
                                                                onClick={(e) => e.stopPropagation()}
                                                            />
                                                            <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handleToggleQuestion(areaKey, subject.id, qIdx)}>
                                                                <p className="text-xs line-clamp-2">
                                                                    {question.originalIndex || qIdx + 1}. {question.text}
                                                                </p>
                                                                <div className="flex items-center gap-3 mt-1">
                                                                    {question.imageUrl && (
                                                                        <span className="text-[10px] text-blue-500 flex items-center gap-1">
                                                                            <ImageIcon className="h-3 w-3" /> Con imagen
                                                                        </span>
                                                                    )}
                                                                    <label className="flex items-center gap-1.5 cursor-pointer group" onClick={(e) => e.stopPropagation()}>
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={question.requiresReading || false}
                                                                            onChange={() => handleToggleRequiresReading(areaKey, subject.id, qIdx)}
                                                                            className="h-3 w-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                                        />
                                                                        <span className="text-[10px] text-muted-foreground group-hover:text-blue-600 transition-colors font-medium">Requiere lectura</span>
                                                                    </label>
                                                                </div>
                                                            </div>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-6 px-2 text-xs"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleEditQuestion(areaKey, subject.id, qIdx);
                                                                }}
                                                            >
                                                                ✏️ Editar
                                                            </Button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Progress Display */}
                    {areaData.isGenerating && (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">{areaData.currentItem}</span>
                                <span className="font-medium">{areaData.progress}%</span>
                            </div>
                            <Progress value={areaData.progress} />
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                        <Button
                            onClick={() => handleGenerateContent(areaKey)}
                            disabled={
                                (areaData.imageFiles.length === 0 && !areaData.textQuestion) ||
                                areaData.isGenerating ||
                                areaData.isAnalyzing ||
                                (areaData.detectedSubjects.length > 0 && areaData.detectedSubjects.reduce((total, s) => total + (s.questions.filter(q => q.selected).length || 0), 0) === 0)
                            }
                            className="flex-1"
                        >
                            {areaData.isGenerating ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Generando...
                                </>
                            ) : (
                                <>
                                    <Upload className="mr-2 h-4 w-4" />
                                    Generar Contenido
                                </>
                            )}
                        </Button>

                        {areaData.isGenerating && (
                            <Button
                                variant="destructive"
                                onClick={() => handleCancel(areaKey)}
                            >
                                <X className="mr-2 h-4 w-4" />
                                Cancelar
                            </Button>
                        )}

                        {areaData.hasContent && !areaData.isGenerating && (
                            <Button
                                variant="destructive"
                                onClick={() => handleDeleteContent(areaKey)}
                            >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Borrar
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>
        );
    };

    return (
        <>
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Crear Contenido con IA</DialogTitle>
                        <DialogDescription>
                            Sube imágenes de la guía (fotos de las preguntas) para cada área. El sistema detectará automáticamente las preguntas y las agrupará por materia.
                            Selecciona las materias para las que deseas generar contenido educativo.
                            Por cada materia seleccionada se generarán: 5 lecturas explicativas + 3 quizzes de práctica (30 preguntas total).
                            Opcionalmente, sube una imagen de portada que se usará para todo el contenido generado.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                        {renderAreaCard('area1', 1)}
                        {renderAreaCard('area2', 2)}
                        {renderAreaCard('area3', 3)}
                        {renderAreaCard('area4', 4)}
                    </div>

                    <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            <strong>Nota:</strong> La generación de contenido puede tomar 30-60 minutos por área.
                            Puedes cerrar este modal y el proceso continuará en segundo plano.
                        </AlertDescription>
                    </Alert>
                </DialogContent>
            </Dialog>

            {/* Mode Selection Dialog */}
            <Dialog open={showModeDialog} onOpenChange={setShowModeDialog}>
                <DialogContent className="sm:max-w-xl">
                    <DialogHeader className="space-y-3">
                        <div className="mx-auto w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center">
                            <AlertCircle className="h-6 w-6 text-amber-600 dark:text-amber-500" />
                        </div>
                        <DialogTitle className="text-center">Contenido Existente</DialogTitle>
                        <DialogDescription className="text-center text-sm">
                            Elige cómo proceder con el contenido:
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col gap-3 py-4">
                        <Button
                            onClick={() => {
                                setShowModeDialog(false);
                                if (pendingAreaKey) {
                                    handleGenerateContent(pendingAreaKey, false);
                                }
                            }}
                            className="w-full h-auto py-4 px-4 border-2 hover:border-primary transition-all"
                            variant="outline"
                        >
                            <div className="flex items-start gap-3 text-left w-full">
                                <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/20 shrink-0">
                                    <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-500" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-semibold mb-1">Conservar y Agregar</div>
                                    <div className="text-sm text-muted-foreground">
                                        Mantiene el contenido existente y agrega el nuevo
                                    </div>
                                </div>
                            </div>
                        </Button>
                        <Button
                            onClick={() => {
                                setShowModeDialog(false);
                                if (pendingAreaKey) {
                                    handleGenerateContent(pendingAreaKey, true);
                                }
                            }}
                            className="w-full h-auto py-4 px-4 border-2 hover:border-destructive transition-all"
                            variant="outline"
                        >
                            <div className="flex items-start gap-3 text-left w-full">
                                <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/20 shrink-0">
                                    <Trash2 className="h-5 w-5 text-red-600 dark:text-red-500" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-semibold mb-1">Borrar y Reemplazar</div>
                                    <div className="text-sm text-muted-foreground">
                                        Elimina todo y crea contenido nuevo
                                    </div>
                                </div>
                            </div>
                        </Button>
                    </div>
                    <div className="border-t pt-3">
                        <Button
                            onClick={() => {
                                setShowModeDialog(false);
                                setPendingAreaKey(null);
                            }}
                            variant="ghost"
                            className="w-full"
                        >
                            Cancelar
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Edit Question Modal */}
            <Dialog open={!!editingQuestion} onOpenChange={(open) => !open && setEditingQuestion(null)}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Editar Pregunta</DialogTitle>
                        <DialogDescription>
                            Revisa y modifica los detalles de la pregunta detectada
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        {/* Texto de la Pregunta */}
                        <div className="space-y-2">
                            <Label htmlFor="edit-question-text">Texto de la Pregunta</Label>
                            <Textarea
                                id="edit-question-text"
                                value={editQuestionText}
                                onChange={(e) => setEditQuestionText(e.target.value)}
                                rows={4}
                                className="resize-none"
                            />
                        </div>

                        {/* Imagen de la Pregunta */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label>Imagen/Gráfico de la Pregunta</Label>
                                {editingQuestion && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setShowImageCropper(true)}
                                        className="h-8"
                                    >
                                        <Crop className="mr-2 h-4 w-4" />
                                        Obtener Recorte de Imagen
                                    </Button>
                                )}
                            </div>

                            {editQuestionImageUrl && (
                                <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <ImageIcon className="h-4 w-4" />
                                        <span>Vista previa de la imagen:</span>
                                    </div>
                                    <div className="relative w-full aspect-video rounded-md overflow-hidden border bg-white">
                                        <img
                                            src={editQuestionImageUrl}
                                            alt="Imagen de la pregunta"
                                            className="w-full h-full object-contain"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="edit-image-url" className="text-xs">URL de la Imagen</Label>
                                        <Input
                                            id="edit-image-url"
                                            value={editQuestionImageUrl}
                                            onChange={(e) => setEditQuestionImageUrl(e.target.value)}
                                            placeholder="https://..."
                                            className="text-xs font-mono"
                                        />
                                    </div>
                                </div>
                            )}

                            {!editQuestionImageUrl && (
                                <div className="border border-dashed rounded-lg p-6 text-center text-sm text-muted-foreground">
                                    <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                    <p>Esta pregunta no tiene imagen asociada</p>
                                    <Input
                                        value={editQuestionImageUrl}
                                        onChange={(e) => setEditQuestionImageUrl(e.target.value)}
                                        placeholder="Agregar URL de imagen (opcional)"
                                        className="mt-3 text-xs"
                                    />
                                </div>
                            )}
                        </div>

                        {/* Opciones de Respuesta */}
                        <div className="space-y-2">
                            <Label>Opciones de Respuesta</Label>
                            <div className="space-y-2">
                                {editQuestionOptions.map((option, idx) => (
                                    <div key={idx} className="flex items-center gap-2">
                                        <span className="text-sm font-medium w-6">{String.fromCharCode(65 + idx)})</span>
                                        <Input
                                            value={option}
                                            onChange={(e) => {
                                                const newOptions = [...editQuestionOptions];
                                                newOptions[idx] = e.target.value;
                                                setEditQuestionOptions(newOptions);
                                            }}
                                            className="flex-1"
                                        />
                                        <input
                                            type="radio"
                                            name="correct-answer"
                                            checked={editQuestionAnswer === option}
                                            onChange={() => setEditQuestionAnswer(option)}
                                            className="h-4 w-4"
                                            title="Marcar como correcta"
                                        />
                                    </div>
                                ))}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Selecciona el radio button para marcar la respuesta correcta
                            </p>
                        </div>

                        {/* Respuesta Correcta */}
                        {editQuestionAnswer && (
                            <Alert>
                                <CheckCircle2 className="h-4 w-4" />
                                <AlertDescription>
                                    <strong>Respuesta correcta:</strong> {editQuestionAnswer}
                                </AlertDescription>
                            </Alert>
                        )}
                    </div>

                    <div className="flex gap-2 justify-end">
                        <Button
                            variant="outline"
                            onClick={() => setEditingQuestion(null)}
                        >
                            Cancelar
                        </Button>
                        <Button onClick={handleSaveQuestionEdit}>
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Guardar Cambios
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Image Cropper */}
            {editingQuestion && (
                <ImageCropper
                    isOpen={showImageCropper}
                    onClose={() => setShowImageCropper(false)}
                    sourceImages={areas[editingQuestion.areaKey].imageFiles.map(file => URL.createObjectURL(file))}
                    onImageCropped={(url) => setEditQuestionImageUrl(url)}
                    area={areaCategories[editingQuestion.areaKey]}
                    questionId={`${editingQuestion.subjectId}_${editingQuestion.questionIndex}`}
                />
            )}
            <DeletePasswordModal
                isOpen={isDeleteModalOpen}
                onOpenChange={setIsDeleteModalOpen}
                onConfirm={confirmDeleteContentArea}
                title={`¿Eliminar contenido de ${areaKeyToDelete ? areaCategories[areaKeyToDelete] : 'Área'}?`}
            />
        </>
    );
}
