
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Upload, Sparkles, Loader2, Copy } from 'lucide-react';
import Image from 'next/image';
import { extractQuestionsFromImage, type ExtractedQuiz } from '@/ai/flows/quiz-extractor-flow';

export default function ImageQuestionExtractorPage() {
    const { toast } = useToast();
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [extractedText, setExtractedText] = useState<string>('');
    const [isProcessing, setIsProcessing] = useState(false);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleProcessImage = async () => {
        if (!imageFile) {
            toast({
                variant: 'destructive',
                title: 'No hay imagen',
                description: 'Por favor, sube una imagen para procesar.',
            });
            return;
        }

        setIsProcessing(true);
        setExtractedText('');
        try {
            const reader = new FileReader();
            reader.readAsDataURL(imageFile);
            reader.onload = async (event) => {
                const photoDataUri = event.target?.result as string;
                const result: ExtractedQuiz = await extractQuestionsFromImage({ photoDataUri });
                
                const formattedText = result.questions.map((q, qIndex) => {
                    let questionBlock = `Pregunta ${qIndex + 1}:\n${q.question}\n\n`;
                    if (q.question_image_description) {
                        questionBlock += `[Descripción de imagen en pregunta: ${q.question_image_description}]\n\n`;
                    }
                    questionBlock += "Opciones:\n";
                    questionBlock += q.options.map((opt, oIndex) => {
                        let optionLine = `${String.fromCharCode(65 + oIndex)}) ${opt.text}`;
                        if (opt.image_description) {
                            optionLine += ` [Descripción de imagen en opción: ${opt.image_description}]`;
                        }
                        if (opt.is_correct) {
                            optionLine += " (Correcta)";
                        }
                        return optionLine;
                    }).join('\n');
                    return questionBlock;
                }).join('\n\n---\n\n');

                setExtractedText(formattedText);
                toast({
                    title: '¡Extracción completada!',
                    description: 'Las preguntas han sido procesadas.',
                });
            };
        } catch (error: any) {
            console.error('Error processing image:', error);
            toast({
                variant: 'destructive',
                title: 'Error de IA',
                description: error.message || 'No se pudieron extraer las preguntas de la imagen.',
            });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleCopy = () => {
        if (!extractedText) return;
        navigator.clipboard.writeText(extractedText);
        toast({ title: 'Copiado', description: 'El texto extraído se ha copiado al portapapeles.' });
    };

    return (
        <div className="min-h-screen bg-muted/40 p-4 sm:p-8 flex items-center justify-center">
            <Card className="w-full max-w-4xl">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Sparkles className="text-primary" />
                        Extractor de Preguntas con IA
                    </CardTitle>
                    <CardDescription>
                        Sube una imagen con preguntas de opción múltiple y la IA las convertirá a texto.
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="image-upload">1. Sube tu imagen</Label>
                            <Input id="image-upload" type="file" accept="image/*" onChange={handleImageChange} />
                        </div>

                        {imagePreview && (
                            <div className="space-y-4">
                                <p className="text-sm font-medium">Vista previa:</p>
                                <div className="relative aspect-video w-full rounded-md border bg-muted overflow-hidden">
                                    <Image src={imagePreview} alt="Vista previa de la imagen subida" fill objectFit="contain" />
                                </div>
                            </div>
                        )}

                        <Button onClick={handleProcessImage} disabled={!imageFile || isProcessing} className="w-full">
                            {isProcessing ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Sparkles className="mr-2 h-4 w-4" />
                            )}
                            {isProcessing ? 'Procesando...' : '2. Extraer Preguntas'}
                        </Button>
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <Label>3. Resultado en Texto</Label>
                                <Button variant="ghost" size="sm" onClick={handleCopy} disabled={!extractedText}>
                                    <Copy className="mr-2 h-4 w-4" />
                                    Copiar
                                </Button>
                            </div>
                             <Textarea
                                placeholder="Aquí aparecerán las preguntas extraídas..."
                                value={extractedText}
                                readOnly
                                className="h-80 resize-none font-mono text-sm"
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
