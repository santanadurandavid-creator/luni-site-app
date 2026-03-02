
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
import { useAuth } from '@/hooks/use-auth';
import { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { getFirebaseServices } from '@/lib/firebase';
import type { Exam } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Skeleton } from '../ui/skeleton';
import { Loader2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface StartExamModalProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export function StartExamModal({ isOpen, setIsOpen }: StartExamModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExam, setSelectedExam] = useState<string | null>(null);
  const [isLoadingExams, setIsLoadingExams] = useState(true);
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const fetchExams = async () => {
        if (!user?.examType) {
          setIsLoadingExams(false);
          return;
        }
        setIsLoadingExams(true);
        try {
          const { db } = getFirebaseServices();
          const q = query(
            collection(db, 'exams'),
            where('area', '==', user.examType),
            where('type', '!=', 'diagnostico')
          );
          const querySnapshot = await getDocs(q);
          const fetchedExams = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Exam));
          setExams(fetchedExams);
          if (fetchedExams.length > 0) {
            setSelectedExam(fetchedExams[0].id);
          }
        } catch (error) {
          console.error("Error fetching exams: ", error);
          toast({ variant: 'destructive', title: "Error", description: "No se pudieron cargar los exámenes disponibles." });
        } finally {
          setIsLoadingExams(false);
        }
      };
      fetchExams();
    }
  }, [isOpen, user?.examType, toast]);

  const handleStartExam = () => {
    if (!selectedExam) return;
    setIsStarting(true);
    router.push(`/exam/${selectedExam}`);
    setIsOpen(false);
  };
  
  if (!user) return null;
  const examTokens = user.examTokens || 0;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Comenzar un Nuevo Examen</DialogTitle>
          <DialogDescription>
            Tienes {examTokens} token{examTokens !== 1 ? 's' : ''} de examen disponible{examTokens !== 1 ? 's' : ''}. Selecciona el examen que deseas realizar.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {isLoadingExams ? (
            <Skeleton className="h-10 w-full" />
          ) : exams.length > 0 ? (
            <Select onValueChange={setSelectedExam} defaultValue={selectedExam || undefined}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar un examen" />
              </SelectTrigger>
              <SelectContent>
                {exams.map(exam => (
                  <SelectItem key={exam.id} value={exam.id}>
                    {exam.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="text-sm text-muted-foreground text-center">No hay exámenes disponibles para tu área de estudio en este momento.</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>Cancelar</Button>
           <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button disabled={isLoadingExams || !selectedExam || examTokens <= 0}>
                    Iniciar Examen
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>¿Confirmar inicio del examen?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Esto consumirá un token de examen. Una vez iniciado, el temporizador comenzará y no podrás detenerlo. ¿Estás listo?
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleStartExam} disabled={isStarting}>
                        {isStarting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                        Confirmar e Iniciar
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
