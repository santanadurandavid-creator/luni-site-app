
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
import { useAuth } from '@/hooks/use-auth';
import React, { useState, useEffect } from 'react';
import { BrainCircuit, Calendar, Clock, Sparkles } from 'lucide-react';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { useToast } from '@/hooks/use-toast';
import { Slider } from '../ui/slider';

interface LuniIaModalProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

type ViewState = 'welcome' | 'planning' | 'chat';

export function LuniIaModal({ isOpen, setIsOpen }: LuniIaModalProps) {
  const { user, updateUser } = useAuth();
  const { toast } = useToast();
  const [view, setView] = useState<ViewState>('welcome');
  
  // State for the planning form
  const [examDate, setExamDate] = useState('');
  const [studyHoursPerDay, setStudyHoursPerDay] = useState([2]);

  useEffect(() => {
    if (isOpen) {
      if (user?.studyPlan) {
        setView('chat');
        setExamDate(user.studyPlan.examDate || '');
        setStudyHoursPerDay([user.studyPlan.studyHoursPerDay || 2]);
      } else {
        setView('welcome');
      }
    }
  }, [isOpen, user]);

  const handleStartPlanning = () => {
    setView('planning');
  };

  const handleSavePlan = async () => {
    if (!examDate) {
        toast({ variant: 'destructive', title: 'Fecha requerida', description: 'Por favor, selecciona la fecha de tu examen.' });
        return;
    }
    try {
        const studyPlan = {
            examDate: examDate,
            studyHoursPerDay: studyHoursPerDay[0],
        };
        await updateUser({ studyPlan });
        toast({ title: '¡Plan de estudio guardado!', description: 'Ahora Luni IA puede ayudarte a prepararte.' });
        setView('chat');
    } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudo guardar tu plan de estudio.' });
    }
  };

  const WelcomeView = () => (
    <div className="text-center p-6 space-y-4">
        <div className="w-24 h-24 mx-auto rounded-full bg-primary/10 flex items-center justify-center border-4 border-primary/20">
            <BrainCircuit className="h-12 w-12 text-primary" />
        </div>
        <h2 className="text-2xl font-bold font-headline">¡Bienvenido a Luni IA!</h2>
        <p className="text-muted-foreground">
            Soy tu tutor personal. Para empezar, necesito saber un poco sobre tus metas de estudio para crear un plan personalizado para ti.
        </p>
        <Button onClick={handleStartPlanning} className="mt-4">
            <Sparkles className="mr-2 h-4 w-4" />
            Crear mi Plan de Estudio
        </Button>
    </div>
  );

  const PlanningView = () => (
    <div className="p-6 space-y-6">
        <div className="space-y-2">
            <Label htmlFor="examDate" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                ¿Cuándo es tu examen?
            </Label>
            <Input 
                id="examDate" 
                type="date"
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
            />
        </div>
        <div className="space-y-2">
            <Label htmlFor="studyHours" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                ¿Cuántas horas al día estudiarás? ({studyHoursPerDay[0]}h)
            </Label>
            <Slider
                id="studyHours"
                min={1}
                max={8}
                step={0.5}
                value={studyHoursPerDay}
                onValueChange={setStudyHoursPerDay}
            />
        </div>
        <DialogFooter>
            <Button variant="outline" onClick={() => setView('welcome')}>Atrás</Button>
            <Button onClick={handleSavePlan}>Guardar Plan y Empezar</Button>
        </DialogFooter>
    </div>
  );

  const ChatView = () => (
    <div className="p-6 text-center h-full flex flex-col items-center justify-center">
        <h2 className="text-xl font-bold">¡Todo listo!</h2>
        <p className="text-muted-foreground mt-2">
            Tu plan de estudio está configurado. La interfaz de chat con Luni IA estará disponible muy pronto para comenzar tu preparación.
        </p>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="w-[95vw] max-w-lg rounded-lg">
        <DialogHeader>
          <DialogTitle className="font-headline text-center">Tutor Luni IA</DialogTitle>
        </DialogHeader>
        {view === 'welcome' && <WelcomeView />}
        {view === 'planning' && <PlanningView />}
        {view === 'chat' && <ChatView />}
      </DialogContent>
    </Dialog>
  );
}
