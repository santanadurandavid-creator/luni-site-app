
'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/use-auth';
import React, { useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface RatingModalProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export function RatingModal({ isOpen, setIsOpen }: RatingModalProps) {
  const { addRating } = useAuth();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const { toast } = useToast();

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
        toast({ variant: 'destructive', title: 'Error', description: 'Por favor, selecciona al menos una estrella.' });
        return;
    }
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await addRating(rating, comment);
      toast({ title: 'Gracias', description: 'Tu calificación ha sido enviada.' });
      setIsOpen(false);
      // Reset state after closing
      setTimeout(() => {
          setRating(0);
          setHoverRating(0);
          setComment('');
          setIsSubmitting(false);
      }, 300);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo enviar la calificación. Intenta de nuevo.' });
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="w-[95vw] max-w-lg rounded-lg">
        <DialogHeader>
          <DialogTitle>Califica tu Experiencia</DialogTitle>
          <DialogDescription>
            Tus comentarios nos ayudan a mejorar Luni Site para todos.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-6 py-4">
            <div 
                className="flex justify-center gap-2"
                onMouseLeave={() => setHoverRating(0)}
            >
                {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                        key={star}
                        className={cn(
                            "h-10 w-10 cursor-pointer transition-all",
                            (hoverRating || rating) >= star ? "text-amber-400 fill-amber-400" : "text-gray-300"
                        )}
                        onMouseEnter={() => setHoverRating(star)}
                        onClick={() => setRating(star)}
                    />
                ))}
            </div>
            <div className="space-y-2">
                <Textarea
                    placeholder="Cuéntanos más sobre tu experiencia (opcional)..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={4}
                    disabled={isSubmitting}
                />
            </div>
            <DialogFooter>
                <Button type="submit" disabled={isSubmitting}>Enviar Calificación</Button>
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
