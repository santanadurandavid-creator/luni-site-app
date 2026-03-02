'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Star } from 'lucide-react';
import { getFirebaseServices } from '@/lib/firebase';
import { doc, collection, addDoc, serverTimestamp, getDoc, updateDoc } from 'firebase/firestore';
import { useAuth } from '@/hooks/use-auth';
import type { ContentItem, ClassRating } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

interface RateClassModalProps {
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
    classItem: ContentItem;
    onRatingSubmitted: () => void;
}

const RUBRICS = [
    { key: 'teachingQuality' as keyof ClassRating['ratings'], label: 'Calidad de enseñanza' },
    { key: 'topicClarity' as keyof ClassRating['ratings'], label: 'Claridad del tema' },
    { key: 'supportMaterial' as keyof ClassRating['ratings'], label: 'Material de apoyo' },
    { key: 'generalExperience' as keyof ClassRating['ratings'], label: 'Experiencia general' },
];

export function RateClassModal({ isOpen, setIsOpen, classItem, onRatingSubmitted }: RateClassModalProps) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [ratings, setRatings] = useState<ClassRating['ratings']>({
        teachingQuality: 0,
        topicClarity: 0,
        supportMaterial: 0,
        generalExperience: 0,
    });
    const [comment, setComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleStarClick = (key: keyof ClassRating['ratings'], value: number) => {
        setRatings((prev) => ({ ...prev, [key]: value }));
    };

    const handleSubmit = async () => {
        if (!user || !classItem.id) return;

        if (Object.values(ratings).some((val) => val === 0)) {
            toast({
                title: 'Faltan calificaciones',
                description: 'Por favor califica todos los aspectos.',
                variant: 'destructive',
            });
            return;
        }

        setIsSubmitting(true);
        try {
            const { db } = getFirebaseServices();
            const ratingsRef = collection(db, 'content', classItem.id, 'ratings');

            const newRating: ClassRating = {
                userId: user.id,
                userName: user.name,
                userAvatar: user.avatar,
                ratings,
                comment,
                createdAt: serverTimestamp(),
            };

            await addDoc(ratingsRef, newRating);

            // Update Professor Rating
            if (classItem.classDetails?.professorId) {
                const professorRef = doc(db, 'professors', classItem.classDetails.professorId);
                const professorSnap = await getDoc(professorRef);

                if (professorSnap.exists()) {
                    const professor = professorSnap.data();
                    const currentRating = professor.rating || 5.0;
                    const totalRatings = professor.totalRatings || 0;

                    const studentAvgRating = (ratings.teachingQuality + ratings.topicClarity + ratings.supportMaterial + ratings.generalExperience) / 4;

                    const newTotalRatings = totalRatings + 1;
                    const newRatingValue = ((currentRating * totalRatings) + studentAvgRating) / newTotalRatings;

                    await updateDoc(professorRef, {
                        rating: newRatingValue,
                        totalRatings: newTotalRatings
                    });
                }
            }

            toast({
                title: '¡Gracias por tu opinión!',
                description: 'Tu calificación ha sido guardada.',
            });
            onRatingSubmitted();
            setIsOpen(false);
        } catch (error) {
            console.error('Error submitting rating:', error);
            toast({
                title: 'Error',
                description: 'No se pudo guardar la calificación.',
                variant: 'destructive',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Calificar Clase: {classItem.title}</DialogTitle>
                    <DialogDescription>
                        La clase ha finalizado. Ayúdanos a mejorar calificando tu experiencia.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {RUBRICS.map((rubric) => (
                        <div key={rubric.key} className="space-y-2">
                            <Label>{rubric.label}</Label>
                            <div className="flex gap-2">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                        key={star}
                                        type="button"
                                        onClick={() => handleStarClick(rubric.key, star)}
                                        className={`focus:outline-none transition-transform hover:scale-110 ${star <= ratings[rubric.key] ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground'
                                            }`}
                                    >
                                        <Star className={`w-6 h-6 ${star <= ratings[rubric.key] ? 'fill-current' : ''}`} />
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}

                    <div className="space-y-2">
                        <Label htmlFor="comment">¿Qué mejorarías?</Label>
                        <Textarea
                            id="comment"
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder="Escribe tus comentarios aquí..."
                            rows={3}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={() => setIsOpen(false)}>Cancelar</Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting}>
                        {isSubmitting ? 'Enviando...' : 'Enviar Calificación'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
