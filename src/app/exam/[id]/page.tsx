
'use client';
import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getFirebaseServices } from '@/lib/firebase';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import type { Exam, UserAnswer } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/use-auth';
import { useLanguage } from '@/contexts/LanguageContext';
import { Loader2, CheckCircle, XCircle, Timer, Info, LogOut } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import Image from 'next/image';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle as DialogTitleComponent } from '@/components/ui/dialog';
import { v4 as uuidv4 } from 'uuid';

const LoadingSkeleton = () => (
    <div className="flex items-center justify-center min-h-screen bg-muted">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
    </div>
);

const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
};

const EXAM_DURATION_SECONDS = 3 * 60 * 60; // 3 hours

const isValidUrl = (url: string | undefined | null): boolean => {
    if (!url) return false;
    try {
        new URL(url);
        return true;
    } catch (e) {
        return false;
    }
};

export default function ExamPage() {
    const { t } = useLanguage();
    const [exam, setExam] = useState<Exam | null>(null);
    const [loading, setLoading] = useState(true);
    const [examStarted, setExamStarted] = useState(false);
    const [timeLeft, setTimeLeft] = useState(EXAM_DURATION_SECONDS);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [isFinished, setIsFinished] = useState(false);
    const [score, setScore] = useState(0);
    const { addExamResult, user } = useAuth();
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;
    const submittedRef = useRef(false);
    const [exitConfirmationInput, setExitConfirmationInput] = useState('');
    const [isExitAlertOpen, setIsExitAlertOpen] = useState(false);
    const [imageModalUrl, setImageModalUrl] = useState<string | null>(null);
    const [subjects, setSubjects] = useState<{ id: string, name: string }[]>([]);

    useEffect(() => {
        const fetchExam = async () => {
            if (!id) return;
            try {
                const { db } = getFirebaseServices();
                const examRef = doc(db, 'exams', id);
                const examSnap = await getDoc(examRef);
                if (examSnap.exists()) {
                    const examData = { id: examSnap.id, ...examSnap.data() } as Exam;
                    setExam(examData);

                    // Fetch subjects
                    const subjectsRef = collection(db, 'subjects');
                    const subjectsSnapshot = await getDocs(subjectsRef);
                    const subjectsArray = subjectsSnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name }));
                    setSubjects(subjectsArray);
                }
            } catch (error) {
                console.error("Error fetching exam:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchExam();
    }, [id]);

    const handleSubmit = async () => {
        if (!exam || submittedRef.current || !user) return;
        submittedRef.current = true; // Prevent multiple submissions

        let correctAnswers = 0;
        const userAnswers: UserAnswer[] = exam.questions.map(q => {
            const userAnswer = answers[q.id];
            const correctAnswerText = typeof q.answer === 'string' ? q.answer : (q.answer as any).text;
            const isCorrect = userAnswer === correctAnswerText;
            if (isCorrect) {
                correctAnswers++;
            }
            return {
                questionId: q.id,
                selectedOption: userAnswer || '',
                isCorrect,
                answer: correctAnswerText
            };
        });

        const finalScore = Math.round((correctAnswers / exam.questions.length) * 100);
        const timeTaken = EXAM_DURATION_SECONDS - timeLeft;
        setScore(finalScore);

        await addExamResult({
            id: uuidv4(),
            userId: user.id,
            examId: exam.id,
            examName: exam.name,
            score: finalScore,
            correctAnswers: correctAnswers,
            totalQuestions: exam.questions.length,
            completedAt: new Date(),
            answers: userAnswers,
            timeTaken: timeTaken,
        });
        setIsFinished(true);
    };

    useEffect(() => {
        if (examStarted && timeLeft > 0 && !isFinished) {
            const timerId = setInterval(() => {
                setTimeLeft(prev => prev - 1);
            }, 1000);
            return () => clearInterval(timerId);
        } else if (timeLeft === 0 && !submittedRef.current) {
            handleSubmit();
        }
    }, [examStarted, timeLeft, isFinished, handleSubmit]);


    const handleAnswerChange = (questionId: string, value: string) => {
        setAnswers(prev => ({ ...prev, [questionId]: value }));
    };

    const handleNext = () => {
        if (exam && currentQuestionIndex < exam.questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
        }
    };

    const handlePrev = () => {
        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex(prev => prev - 1);
        }
    };

    const handleExit = () => {
        setIsExitAlertOpen(false);
        router.push('/profile');
    }

    if (loading) {
        return <LoadingSkeleton />;
    }

    if (!exam || !exam.questions || exam.questions.length === 0) {
        return <div>Examen no encontrado o sin preguntas.</div>;
    }

    if (!examStarted) {
        return (
            <div className="min-h-screen bg-muted/40 flex flex-col items-center justify-center p-4">
                <Card className="w-full max-w-lg shadow-lg">
                    <CardHeader className="text-center">
                        <Info className="mx-auto h-12 w-12 text-primary" />
                        <CardTitle className="text-2xl mt-4">{t('instructions')}</CardTitle>
                        <CardDescription>{exam.name}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 text-center">
                        <p>{t('examStarted')}</p>
                        <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
                            <p className="font-bold">{t('duration')}</p>
                            <p className="text-sm text-muted-foreground">{t('timeRunning')}</p>
                        </div>
                        <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                            <p className="font-bold">{t('attention')}</p>
                            <p className="text-sm text-muted-foreground">{t('noExit')}</p>
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button className="w-full" size="lg" onClick={() => setExamStarted(true)}>{t('startExam')}</Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    const currentQuestion = exam.questions[currentQuestionIndex];
    const progress = ((currentQuestionIndex + 1) / exam.questions.length) * 100;

    return (
        <div className="min-h-screen bg-muted/40 flex flex-col">
            <header className="bg-background border-b shadow-sm sticky top-0 z-10">
                <div className="container mx-auto p-4 flex justify-between items-center">
                    <h1 className="text-lg font-bold font-headline truncate pr-4">{exam.name}</h1>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 font-mono text-lg font-semibold text-primary">
                            <Timer className="h-5 w-5" />
                            <span>{formatTime(timeLeft)}</span>
                        </div>
                        <AlertDialog open={isExitAlertOpen} onOpenChange={setIsExitAlertOpen}>
                            <AlertDialogTrigger asChild>
                                <Button variant="outline">{t('exit')}</Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>{t('sureExit')}</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        {t('progressLost')}
                                        {t('writeExit').replace('Salir', t('exit'))}
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <Input
                                    value={exitConfirmationInput}
                                    onChange={(e) => setExitConfirmationInput(e.target.value)}
                                    placeholder={t('writeExit').replace('Salir', t('exit'))}
                                />
                                <AlertDialogFooter>
                                    <AlertDialogCancel onClick={() => setExitConfirmationInput('')}>{t('cancel')}</AlertDialogCancel>
                                    <AlertDialogAction
                                        onClick={handleExit}
                                        disabled={exitConfirmationInput !== t('exit')}
                                        className="bg-destructive hover:bg-destructive/90"
                                    >
                                        {t('confirmExit')}
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                </div>
            </header>

            <main className="flex-1 flex items-center justify-center p-4">
                <Card className="w-full max-w-3xl shadow-2xl border-none ring-1 ring-black/5 rounded-[2rem] overflow-hidden bg-white/100 dark:bg-zinc-900 shadow-primary/5">
                    <CardHeader className="space-y-6 pb-2">
                        <div className="flex flex-col gap-4">
                            <Progress value={progress} className="h-1.5" />
                            <div className="flex flex-wrap items-center gap-2">
                                <div className="px-3 py-1 bg-primary/10 text-primary border border-primary/20 text-[10px] font-black uppercase tracking-widest rounded-full flex items-center gap-1.5 shadow-sm">
                                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                                    Reactivo {currentQuestionIndex + 1} de {exam.questions.length}
                                </div>
                                {currentQuestion.subjectId && (
                                    <div className="px-3 py-1 bg-muted/50 border border-border text-muted-foreground text-[10px] font-black uppercase tracking-widest rounded-full">
                                        {subjects.find(s => s.id === currentQuestion.subjectId)?.name || t('withoutSubject')}
                                    </div>
                                )}
                            </div>
                        </div>

                        {isValidUrl(currentQuestion.imageUrl) && (
                            <div className="relative w-full max-w-md h-64 my-2 cursor-pointer mx-auto group" onClick={() => setImageModalUrl(currentQuestion.imageUrl!)}>
                                <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-2xl z-10">
                                    <span className="bg-white/90 backdrop-blur-sm text-black text-xs font-bold px-3 py-1 rounded-full shadow-lg">Click para ampliar</span>
                                </div>
                                <Image
                                    src={currentQuestion.imageUrl!}
                                    alt="Imagen de la pregunta"
                                    layout="fill"
                                    objectFit="contain"
                                    className="rounded-2xl border bg-white shadow-inner p-2"
                                />
                            </div>
                        )}

                        <div className="space-y-4 pt-2">
                            <h3 className="text-xl md:text-2xl font-black leading-tight tracking-tight text-gray-900 dark:text-white">
                                {currentQuestion.question}
                            </h3>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <RadioGroup
                            value={answers[currentQuestion.id] || ''}
                            onValueChange={(value) => handleAnswerChange(currentQuestion.id, value)}
                            className="space-y-4"
                        >
                            {currentQuestion.options.map((option, index) => (
                                <div key={index} className="flex items-start space-x-3 border rounded-md p-4 has-[:checked]:bg-primary/10 has-[:checked]:border-primary">
                                    <RadioGroupItem value={option.text} id={`${currentQuestion.id}-opt-${index}`} className="mt-1" />
                                    <div className="flex flex-col gap-2 w-full">
                                        <Label htmlFor={`${currentQuestion.id}-opt-${index}`} className="text-base flex-1 cursor-pointer">{option.text}</Label>
                                        {isValidUrl(option.imageUrl) && (
                                            <div className="relative w-48 h-48 cursor-pointer rounded-md overflow-hidden mx-auto" onClick={(e) => { e.stopPropagation(); setImageModalUrl(option.imageUrl!); }}>
                                                <Image src={option.imageUrl!} alt={`Imagen para ${option.text}`} layout="fill" objectFit="contain" className="rounded-md" />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </RadioGroup>
                    </CardContent>

                    {/* Per-question banner for non-premium users */}
                    {currentQuestion.bannerImageUrl && currentQuestion.bannerClickUrl && (
                        (() => {
                            const isPremium = user?.premiumUntil && new Date(user.premiumUntil.toDate ? user.premiumUntil.toDate() : user.premiumUntil) > new Date();
                            if (!isPremium) {
                                return (
                                    <div className="px-6 pb-4">
                                        <a
                                            href={currentQuestion.bannerClickUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="block mx-auto transition-all duration-300 overflow-hidden rounded-lg shadow-md hover:shadow-lg border border-gray-200 dark:border-gray-700"
                                        >
                                            <img
                                                src={currentQuestion.bannerImageUrl}
                                                alt="Banner"
                                                className="w-full h-auto object-contain max-h-24"
                                            />
                                        </a>
                                    </div>
                                );
                            }
                            return null;
                        })()
                    )}

                    <CardFooter className="flex justify-between">
                        <Button variant="outline" onClick={handlePrev} disabled={currentQuestionIndex === 0}>{t('previous')}</Button>
                        {currentQuestionIndex < exam.questions.length - 1 ? (
                            <Button onClick={handleNext}>{t('next')}</Button>
                        ) : (
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button>{t('finishExam')}</Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>{t('sureFinish')}</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            {t('noChange')}
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleSubmit}>{t('confirmFinish')}</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        )}
                    </CardFooter>
                </Card>
            </main>

            <AlertDialog open={isFinished}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <div className="flex justify-center mb-4">
                            {score >= 70 ? <CheckCircle className="h-16 w-16 text-green-500" /> : <XCircle className="h-16 w-16 text-destructive" />}
                        </div>
                        <AlertDialogTitle className="text-center text-2xl font-bold">{t('examFinished')}</AlertDialogTitle>
                        <AlertDialogDescription className="text-center text-lg">
                            {t('yourScore')} <strong className="text-2xl font-headline">{score}/100</strong>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogAction onClick={() => router.push('/profile')} className="w-full">{t('backProfile')}</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <Dialog open={!!imageModalUrl && isValidUrl(imageModalUrl)} onOpenChange={(open) => !open && setImageModalUrl(null)}>
                <DialogContent className="w-[95vw] h-[95vh] max-w-4xl p-0 border-0 rounded-lg">
                    <DialogHeader className="sr-only">
                        <DialogTitleComponent>Vista ampliada de la imagen</DialogTitleComponent>
                    </DialogHeader>
                    {imageModalUrl && (
                        <div className="relative w-full h-full rounded-lg overflow-hidden">
                            <Image src={imageModalUrl} alt="Vista ampliada de la imagen" layout="fill" objectFit="contain" />
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
