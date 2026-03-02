'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { getFirebaseServices } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { ImageIcon, Trash2, CheckCircle2, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface AnalyzedQuestion {
    id?: string;
    text: string;
    imageUrl?: string | null;
    options: string[];
    answer: string | null;
    originalIndex?: string;
}

interface AnalyzedSubject {
    id: string;
    name: string;
    questionCount: number;
    questions: AnalyzedQuestion[];
}

interface AnalyzedImage {
    id: string;
    area: string;
    subjects: AnalyzedSubject[];
    totalQuestions: number;
    createdAt: Timestamp;
    createdBy: string;
}

interface AnalyzedImagesModalProps {
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
}

export default function AnalyzedImagesModal({ isOpen, setIsOpen }: AnalyzedImagesModalProps) {
    const [analyzedImages, setAnalyzedImages] = useState<AnalyzedImage[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedAnalysis, setSelectedAnalysis] = useState<AnalyzedImage | null>(null);
    const { toast } = useToast();

    useEffect(() => {
        if (!isOpen) return;

        const { db } = getFirebaseServices();
        const q = query(collection(db, 'analyzedImages'), orderBy('createdAt', 'desc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as AnalyzedImage[];
            setAnalyzedImages(data);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching analyzed images:", error);
            toast({
                title: 'Error',
                description: 'No se pudieron cargar las imágenes analizadas.',
                variant: 'destructive',
            });
            setLoading(false);
        });

        return () => unsubscribe();
    }, [isOpen, toast]);

    const getAreaName = (area: string) => {
        const areas: Record<string, string> = {
            'area1': 'Área 1 - Ciencias Físico-Matemáticas',
            'area2': 'Área 2 - Ciencias Biológicas y de la Salud',
            'area3': 'Área 3 - Ciencias Sociales',
            'area4': 'Área 4 - Humanidades y Artes',
        };
        return areas[area] || area;
    };

    const renderQuestionDetail = (question: AnalyzedQuestion, index: number) => (
        <Card key={index} className="mb-4">
            <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                        {question.originalIndex && (
                            <Badge variant="outline" className="font-mono">
                                #{question.originalIndex}
                            </Badge>
                        )}
                        <CardTitle className="text-sm font-medium">
                            Pregunta {index + 1}
                        </CardTitle>
                    </div>
                    {question.answer && (
                        <Badge variant="default" className="bg-green-500">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Respuesta detectada
                        </Badge>
                    )}
                </div>
            </CardHeader>
            <CardContent className="space-y-3">
                <p className="text-sm text-foreground">{question.text}</p>

                {question.imageUrl && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <ImageIcon className="h-3 w-3" />
                        <span>Incluye imagen</span>
                    </div>
                )}

                {question.options && question.options.length > 0 && (
                    <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">Opciones:</p>
                        <div className="space-y-1">
                            {question.options.map((option, idx) => (
                                <div
                                    key={idx}
                                    className={`p-2 rounded-md text-sm ${question.answer === option
                                            ? 'bg-green-100 dark:bg-green-900/20 border border-green-500'
                                            : 'bg-muted'
                                        }`}
                                >
                                    <span className="font-medium mr-2">{String.fromCharCode(65 + idx)}.</span>
                                    {option}
                                    {question.answer === option && (
                                        <CheckCircle2 className="inline h-4 w-4 ml-2 text-green-500" />
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );

    const renderAnalysisDetail = () => {
        if (!selectedAnalysis) return null;

        return (
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedAnalysis(null)}
                    >
                        ← Volver
                    </Button>
                    <Badge variant="outline">
                        {selectedAnalysis.totalQuestions} preguntas
                    </Badge>
                </div>

                <div className="space-y-1">
                    <h3 className="text-lg font-semibold">{getAreaName(selectedAnalysis.area)}</h3>
                    <p className="text-sm text-muted-foreground">
                        Analizado el {format(selectedAnalysis.createdAt.toDate(), "d 'de' MMMM yyyy 'a las' HH:mm", { locale: es })}
                    </p>
                </div>

                <ScrollArea className="h-[500px] pr-4">
                    {selectedAnalysis.subjects.map((subject) => (
                        <div key={subject.id} className="mb-6">
                            <div className="flex items-center justify-between mb-3">
                                <h4 className="text-md font-semibold">{subject.name}</h4>
                                <Badge>{subject.questionCount} preguntas</Badge>
                            </div>
                            {subject.questions.map((question, idx) => renderQuestionDetail(question, idx))}
                        </div>
                    ))}
                </ScrollArea>
            </div>
        );
    };

    const renderAnalysisList = () => (
        <div className="space-y-4">
            {loading ? (
                <div className="text-center py-8 text-muted-foreground">
                    Cargando...
                </div>
            ) : analyzedImages.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed rounded-lg">
                    <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium">No hay imágenes analizadas</h3>
                    <p className="text-muted-foreground">
                        Las imágenes analizadas aparecerán aquí.
                    </p>
                </div>
            ) : (
                <ScrollArea className="h-[500px] pr-4">
                    <div className="space-y-3">
                        {analyzedImages.map((analysis) => (
                            <Card key={analysis.id} className="hover:bg-muted/50 transition-colors">
                                <CardHeader className="pb-3">
                                    <div className="flex items-start justify-between">
                                        <div className="space-y-1">
                                            <CardTitle className="text-base">
                                                {getAreaName(analysis.area)}
                                            </CardTitle>
                                            <p className="text-xs text-muted-foreground">
                                                {format(analysis.createdAt.toDate(), "d MMM yyyy, HH:mm", { locale: es })}
                                            </p>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setSelectedAnalysis(analysis)}
                                        >
                                            <Eye className="h-4 w-4 mr-2" />
                                            Ver detalles
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex flex-wrap gap-2">
                                        <Badge variant="outline">
                                            {analysis.totalQuestions} preguntas
                                        </Badge>
                                        <Badge variant="outline">
                                            {analysis.subjects.length} {analysis.subjects.length === 1 ? 'materia' : 'materias'}
                                        </Badge>
                                        {analysis.subjects.slice(0, 3).map((subject) => (
                                            <Badge key={subject.id} variant="secondary">
                                                {subject.name}
                                            </Badge>
                                        ))}
                                        {analysis.subjects.length > 3 && (
                                            <Badge variant="secondary">
                                                +{analysis.subjects.length - 3} más
                                            </Badge>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </ScrollArea>
            )}
        </div>
    );

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="sm:max-w-4xl">
                <DialogHeader>
                    <DialogTitle>
                        {selectedAnalysis ? 'Detalle de Análisis' : 'Imágenes Analizadas'}
                    </DialogTitle>
                    <DialogDescription>
                        {selectedAnalysis
                            ? 'Revisa las preguntas extraídas de las imágenes'
                            : 'Historial de imágenes analizadas con IA'}
                    </DialogDescription>
                </DialogHeader>

                {selectedAnalysis ? renderAnalysisDetail() : renderAnalysisList()}
            </DialogContent>
        </Dialog>
    );
}
