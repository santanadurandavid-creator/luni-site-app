
'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { getFirebaseServices } from '@/lib/firebase';
import { doc, getDoc, setDoc, updateDoc, collection, serverTimestamp, addDoc, onSnapshot } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Loader2, PlusCircle, Trash2, ArrowLeft, ImageIcon, Edit } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import Image from 'next/image';
import { AIExamQuestionGenerationModal } from '@/components/admin/AIExamQuestionGenerationModal';
import { Sparkles } from 'lucide-react';


const optionSchema = z.object({
    text: z.string().min(1, "La opción no puede estar vacía."),
    imageUrl: z.string().url("Debe ser una URL válida.").optional().or(z.literal('')),
    imageFile: z.any().optional(),
});

const questionSchema = z.object({
    id: z.string().optional(),
    question: z.string().min(1, "La pregunta no puede estar vacía."),
    imageUrl: z.string().url("Debe ser una URL válida.").optional().or(z.literal('')),
    imageFile: z.any().optional(),
    options: z.array(optionSchema).length(4, "Debe haber 4 opciones."),
    answer: z.string().min(1, "Debes seleccionar una respuesta correcta."),
    feedback: z.string().optional(),
    subjectId: z.string().min(1, "Debes seleccionar una materia."),
    linkedContentId: z.string().optional(),
    // Optional banner fields
    bannerImageUrl: z.string().url("Debe ser una URL válida.").optional().or(z.literal('')),
    bannerClickUrl: z.string().url("Debe ser una URL válida.").optional().or(z.literal('')),
});

const examSchema = z.object({
    name: z.string().min(5, "El nombre del examen es requerido."),
    area: z.string().min(3, "El área es requerida."),
    type: z.string().min(3, "El tipo es requerido."),
    questions: z.array(questionSchema).min(1, "El examen debe tener al menos una pregunta."),
});

type ExamFormData = z.infer<typeof examSchema>;

const isValidUrl = (url: string | undefined | null): boolean => {
    if (!url) return false;
    try {
        new URL(url);
        return true;
    } catch (e) {
        return false;
    }
};

const examAreas = ['Área 1: Ciencias Físico-Matemáticas y de las Ingenierías', 'Área 2: Ciencias Biológicas, Químicas y de la Salud', 'Área 3: Ciencias Sociales', 'Área 4: Humanidades y de las Artes'];

const examTypes = ['diagnostico', 'examen simulador'];

export default function EditExamPage() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const examId = params.id as string;
    const isNew = examId === 'new';

    const [isLoading, setIsLoading] = useState(!isNew);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingQuestionIndex, setEditingQuestionIndex] = useState<number | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isAIGenModalOpen, setIsAIGenModalOpen] = useState(false);


    const { register, control, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<ExamFormData>({
        resolver: zodResolver(examSchema),
        defaultValues: {
            name: '',
            area: '',
            type: '',
            questions: [],
        },
    });

    const [subjects, setSubjects] = useState<{ id: string, name: string }[]>([]);
    const [contentItems, setContentItems] = useState<{ id: string, title: string, subject: string }[]>([]);

    useEffect(() => {
        const { db } = getFirebaseServices();
        const unsubscribeSubjects = onSnapshot(collection(db, 'subjects'), (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name }));
            setSubjects(data);
        });
        const unsubscribeContent = onSnapshot(collection(db, 'content'), (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, title: doc.data().title, subject: doc.data().subject }));
            setContentItems(data);
        });
        return () => {
            unsubscribeSubjects();
            unsubscribeContent();
        };
    }, []);

    const { fields, append, remove } = useFieldArray({
        control,
        name: "questions"
    });

    const watchedQuestions = watch('questions');

    // Show toast for validation errors
    useEffect(() => {
        if (Object.keys(errors).length > 0) {
            console.log("Form Errors:", errors);
            toast({
                variant: 'destructive',
                title: "Error de validación",
                description: "Por favor, revisa todos los campos obligatorios. Asegúrate de que las preguntas tengan texto y una respuesta seleccionada.",
            });
        }
    }, [errors, toast]);

    useEffect(() => {
        if (!isNew) {
            const fetchExam = async () => {
                try {
                    const { db } = getFirebaseServices();
                    const examRef = doc(db, 'exams', examId);
                    const examSnap = await getDoc(examRef);
                    if (examSnap.exists()) {
                        const examData = examSnap.data();
                        // Ensure options are in the new format
                        const questions = (examData.questions || []).map((q: any) => ({
                            ...q,
                            linkedContentId: q.linkedContentId || '',
                            bannerImageUrl: q.bannerImageUrl || '',
                            bannerClickUrl: q.bannerClickUrl || '',
                            options: q.options.map((opt: any) =>
                                typeof opt === 'string' ? { text: opt, imageUrl: '' } : opt
                            )
                        }));
                        reset({ ...examData, questions } as ExamFormData);
                    }
                } catch (error) {
                    toast({ variant: 'destructive', title: "Error", description: "No se pudo cargar el examen." });
                } finally {
                    setIsLoading(false);
                }
            };
            fetchExam();
        }
    }, [examId, isNew, reset, toast]);

    const uploadImage = async (file: File, path: string): Promise<string> => {
        const { storage } = getFirebaseServices();
        const storageRef = ref(storage, path);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        return url;
    };

    const onSubmit = async (data: ExamFormData) => {
        setIsSubmitting(true);
        try {
            // Upload images for questions and options if new files are selected
            const updatedQuestions = await Promise.all(data.questions.map(async (q, index) => {
                let questionImageUrl = q.imageUrl || '';
                if ((q as any).imageFile && (q as any).imageFile.length > 0) {
                    const file = (q as any).imageFile[0];
                    questionImageUrl = await uploadImage(file, `exams/${examId}/questions/question-${index}-${file.name}`);
                }
                const updatedOptions = await Promise.all(q.options.map(async (opt, optIndex) => {
                    let optionImageUrl = opt.imageUrl || '';
                    if ((opt as any).imageFile && (opt as any).imageFile.length > 0) {
                        const file = (opt as any).imageFile[0];
                        optionImageUrl = await uploadImage(file, `exams/${examId}/questions/question-${index}-option-${optIndex}-${file.name}`);
                    }
                    return { text: opt.text, imageUrl: optionImageUrl };
                }));
                return {
                    id: q.id,
                    question: q.question,
                    imageUrl: questionImageUrl,
                    options: updatedOptions,
                    answer: q.answer,
                    feedback: q.feedback,
                    subjectId: q.subjectId,
                    linkedContentId: q.linkedContentId,
                    bannerImageUrl: q.bannerImageUrl || '',
                    bannerClickUrl: q.bannerClickUrl || ''
                };
            }));

            const { db } = getFirebaseServices();
            const examData = {
                name: data.name,
                area: data.area,
                type: data.type,
                questions: updatedQuestions.map((q, index) => {
                    const questionData: any = { ...q, id: q.id || `q-${index}` };
                    if (!questionData.linkedContentId) {
                        delete questionData.linkedContentId;
                    }
                    return questionData;
                })
            };

            if (isNew) {
                const docRef = await addDoc(collection(db, 'exams'), {
                    ...examData,
                    createdAt: serverTimestamp()
                });
                toast({ title: "Éxito", description: "Examen creado correctamente." });
                router.push('/admin/exams');
            } else {
                const examRef = doc(db, 'exams', examId);
                await updateDoc(examRef, examData);
                toast({ title: "Éxito", description: "Examen actualizado correctamente." });
                router.push('/admin/exams');
            }

        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: "Error", description: "No se pudo guardar el examen." });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading && !isNew) {
        return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    const handleQuestionImageChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
        const fileList = e.target.files;
        if (fileList && fileList.length > 0) {
            setValue(`questions.${index}.imageFile`, fileList);
        }
    };

    const handleOptionImageChange = (qIndex: number, oIndex: number, e: React.ChangeEvent<HTMLInputElement>) => {
        const fileList = e.target.files;
        if (fileList && fileList.length > 0) {
            setValue(`questions.${qIndex}.options.${oIndex}.imageFile`, fileList);
        }
    };

    const handleQuestionsAdded = (newQuestions: any[]) => {
        newQuestions.forEach(q => append(q));
        toast({
            title: "Preguntas Añadidas",
            description: `Se han añadido ${newQuestions.length} preguntas detectadas por la IA.`
        });
    };


    return (
        <>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <Button type="button" variant="outline" size="sm" onClick={() => router.back()}>
                            <ArrowLeft className="mr-2" />
                            Volver
                        </Button>
                        <h1 className="text-3xl font-bold font-headline mt-2">{isNew ? 'Crear Nuevo Examen' : 'Editar Examen'}</h1>
                        <p className="text-muted-foreground">Completa la información y las preguntas del examen.</p>
                    </div>
                    <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
                        {isSubmitting && <Loader2 className="mr-2 animate-spin" />}
                        Guardar Examen
                    </Button>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Información General</CardTitle>
                    </CardHeader>
                    <CardContent className="grid md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="name">Nombre del Examen</Label>
                            <Input id="name" {...register('name')} />
                            {errors.name && <p className="text-destructive text-sm">{errors.name.message}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label>Área</Label>
                            <Controller
                                name="area"
                                control={control}
                                render={({ field }) => (
                                    <Select
                                        onValueChange={field.onChange}
                                        value={field.value}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecciona un área" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {examAreas.map(area => (
                                                <SelectItem key={area} value={area}>
                                                    {area}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                            />
                            {errors.area && <p className="text-destructive text-sm">{errors.area.message}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label>Tipo de Examen</Label>
                            <Controller
                                name="type"
                                control={control}
                                render={({ field }) => (
                                    <Select
                                        onValueChange={field.onChange}
                                        value={field.value}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecciona un tipo" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {examTypes.map(type => (
                                                <SelectItem key={type} value={type}>
                                                    {type}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                            />
                            {errors.type && <p className="text-destructive text-sm">{errors.type.message}</p>}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Preguntas del Examen</CardTitle>
                        <CardDescription>Haz clic en una pregunta para editarla. Puedes subir imágenes desde tu dispositivo.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-5 md:grid-cols-10 lg:grid-cols-10 gap-2">
                            {fields.map((field, index) => (
                                <Card key={field.id} className="relative cursor-pointer hover:shadow-md transition-shadow p-2" onClick={() => {
                                    setEditingQuestionIndex(index);
                                    setIsEditModalOpen(true);
                                }}>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm font-medium">P{index + 1}</span>
                                        <Button
                                            type="button"
                                            variant="destructive"
                                            size="icon"
                                            className="h-4 w-4"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                remove(index);
                                            }}
                                        >
                                            <Trash2 className="h-2 w-2" />
                                        </Button>
                                    </div>
                                </Card>
                            ))}
                        </div>
                        <Separator />
                        <div className="flex flex-wrap gap-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => append({
                                    question: '',
                                    imageUrl: '',
                                    options: [{ text: '' }, { text: '' }, { text: '' }, { text: '' }],
                                    answer: '',
                                    feedback: '',
                                    subjectId: subjects.length > 0 ? subjects[0].id : '',
                                    linkedContentId: '',
                                    bannerImageUrl: '',
                                    bannerClickUrl: ''
                                })}
                            >
                                <PlusCircle className="mr-2" />
                                Añadir Pregunta Manual
                            </Button>

                            <Button
                                type="button"
                                variant="secondary"
                                onClick={() => setIsAIGenModalOpen(true)}
                                className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white border-none hover:opacity-90"
                            >
                                <Sparkles className="mr-2 h-4 w-4" />
                                Crear Preguntas con IA
                            </Button>
                        </div>
                        {errors.questions && (
                            <p className="text-destructive text-sm mt-2">
                                {Array.isArray(errors.questions)
                                    ? "Hay errores en una o más preguntas. Haz clic en ellas para revisar que tengan texto, 4 opciones y una respuesta seleccionada."
                                    : (errors.questions as any).message}
                            </p>
                        )}
                    </CardContent>

                </Card>
            </form>

            {/* Edit Question Modal */}
            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Editar Pregunta {editingQuestionIndex !== null ? editingQuestionIndex + 1 : ''}</DialogTitle>
                    </DialogHeader>
                    {editingQuestionIndex !== null && (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor={`edit-question`}>Pregunta</Label>
                                <Textarea
                                    id="edit-question"
                                    {...register(`questions.${editingQuestionIndex}.question`)}
                                />
                                {errors.questions?.[editingQuestionIndex]?.question && (
                                    <p className="text-destructive text-sm">{errors.questions[editingQuestionIndex].question.message}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label>Imagen para la Pregunta (Opcional)</Label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => handleQuestionImageChange(editingQuestionIndex, e)}
                                />
                                {isValidUrl(watchedQuestions[editingQuestionIndex]?.imageUrl) && (
                                    <Image
                                        src={watchedQuestions[editingQuestionIndex].imageUrl!}
                                        alt="Preview"
                                        width={200}
                                        height={200}
                                        className="rounded-md mt-2 mx-auto"
                                    />
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {Array.from({ length: 4 }).map((_, optionIndex) => (
                                    <div className="space-y-2 p-2 border rounded-md" key={optionIndex}>
                                        <Label htmlFor={`edit-option-${optionIndex}`}>Opción {optionIndex + 1}</Label>
                                        <Input
                                            id={`edit-option-${optionIndex}`}
                                            {...register(`questions.${editingQuestionIndex}.options.${optionIndex}.text`)}
                                        />
                                        <Label>Imagen para la Opción (Opcional)</Label>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => handleOptionImageChange(editingQuestionIndex, optionIndex, e)}
                                        />
                                        {isValidUrl(watchedQuestions[editingQuestionIndex]?.options[optionIndex]?.imageUrl) && (
                                            <Image
                                                src={watchedQuestions[editingQuestionIndex].options[optionIndex].imageUrl!}
                                                alt="Preview"
                                                width={100}
                                                height={100}
                                                className="rounded-md mt-2 mx-auto"
                                            />
                                        )}
                                    </div>
                                ))}
                            </div>
                            {errors.questions?.[editingQuestionIndex]?.options && (
                                <p className="text-destructive text-sm">Todas las 4 opciones son requeridas.</p>
                            )}

                            <div className="space-y-2">
                                <Label>Respuesta Correcta</Label>
                                <Controller
                                    name={`questions.${editingQuestionIndex}.answer`}
                                    control={control}
                                    render={({ field }) => {
                                        const options = watchedQuestions[editingQuestionIndex]?.options || [];
                                        const selectedOptionIndex = options.findIndex(opt => opt.text === field.value);

                                        return (
                                            <Select
                                                onValueChange={(value) => {
                                                    const selectedOption = options[parseInt(value)];
                                                    if (selectedOption) {
                                                        field.onChange(selectedOption.text);
                                                    }
                                                }}
                                                value={selectedOptionIndex !== -1 ? selectedOptionIndex.toString() : undefined}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecciona la respuesta correcta" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {options.map((option, optionIdx) => (
                                                        option?.text?.trim() && (
                                                            <SelectItem key={`edit-${editingQuestionIndex}-${optionIdx}`} value={optionIdx.toString()}>
                                                                Opción {optionIdx + 1}: {option.text}
                                                            </SelectItem>
                                                        )
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        );
                                    }}
                                />
                                {errors.questions?.[editingQuestionIndex]?.answer && (
                                    <p className="text-destructive text-sm">{errors.questions[editingQuestionIndex].answer.message}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label>Materia</Label>
                                <Controller
                                    name={`questions.${editingQuestionIndex}.subjectId`}
                                    control={control}
                                    render={({ field }) => (
                                        <Select
                                            onValueChange={field.onChange}
                                            value={field.value}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecciona una materia" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {subjects.map((subject) => (
                                                    <SelectItem key={subject.id} value={subject.id}>
                                                        {subject.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                                {errors.questions?.[editingQuestionIndex]?.subjectId && (
                                    <p className="text-destructive text-sm">{errors.questions[editingQuestionIndex].subjectId.message}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label>Contenido Vinculado (Opcional)</Label>
                                <Controller
                                    name={`questions.${editingQuestionIndex}.linkedContentId`}
                                    control={control}
                                    render={({ field }) => (
                                        <Select
                                            onValueChange={(value) => field.onChange(value === 'none' ? '' : value)}
                                            value={field.value || 'none'}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecciona un contenido para vincular" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">Ninguno</SelectItem>
                                                {contentItems.map((content) => (
                                                    <SelectItem key={content.id} value={content.id}>
                                                        {content.title} ({content.subject})
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor={`edit-feedback`}>Feedback para esta Pregunta (Opcional)</Label>
                                <Textarea
                                    id="edit-feedback"
                                    {...register(`questions.${editingQuestionIndex}.feedback`)}
                                    placeholder="Explica por qué la respuesta correcta es la correcta..."
                                />
                            </div>

                            <Separator className="my-4" />

                            <div className="space-y-4">
                                <div className="flex items-center gap-2">
                                    <ImageIcon className="h-5 w-5" />
                                    <h3 className="font-semibold">Banner Personalizado (Opcional)</h3>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    Configura un banner específico para esta pregunta. Solo se mostrará a usuarios no premium.
                                </p>

                                <div className="space-y-2">
                                    <Label htmlFor={`edit-banner-image`}>URL de Imagen del Banner</Label>
                                    <Input
                                        id="edit-banner-image"
                                        type="url"
                                        {...register(`questions.${editingQuestionIndex}.bannerImageUrl`)}
                                        placeholder="https://ejemplo.com/banner.jpg"
                                    />
                                    {errors.questions?.[editingQuestionIndex]?.bannerImageUrl && (
                                        <p className="text-destructive text-sm">{errors.questions[editingQuestionIndex].bannerImageUrl?.message}</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor={`edit-banner-click`}>URL de Destino del Banner</Label>
                                    <Input
                                        id="edit-banner-click"
                                        type="url"
                                        {...register(`questions.${editingQuestionIndex}.bannerClickUrl`)}
                                        placeholder="https://ejemplo.com/destino"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        URL que se abrirá al hacer clic en el banner
                                    </p>
                                    {errors.questions?.[editingQuestionIndex]?.bannerClickUrl && (
                                        <p className="text-destructive text-sm">{errors.questions[editingQuestionIndex].bannerClickUrl?.message}</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button onClick={() => setIsEditModalOpen(false)}>Guardar Cambios</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <AIExamQuestionGenerationModal
                isOpen={isAIGenModalOpen}
                setIsOpen={setIsAIGenModalOpen}
                onQuestionsAdded={handleQuestionsAdded}
                subjects={subjects}
                defaultArea={watch('area')}
            />
        </ >

    );
}
