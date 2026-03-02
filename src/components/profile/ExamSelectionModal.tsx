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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/hooks/use-auth';
import React, { useState, useEffect } from 'react';

interface ExamSelectionModalProps {
  isOpen: boolean;
  setIsOpen?: (isOpen: boolean) => void;
  isUpdate?: boolean;
}

const examAreas = ['Área 1: Ciencias Físico-Matemáticas y de las Ingenierías', 'Área 2: Ciencias Biológicas, Químicas y de la Salud', 'Área 3: Ciencias Sociales', 'Área 4: Humanidades y de las Artes'];

export function ExamSelectionModal({ isOpen, setIsOpen, isUpdate = false }: ExamSelectionModalProps) {
  const { user, setExamType } = useAuth();
  const [selectedExamArea, setSelectedExamArea] = useState<string | null>(user?.examType || null);

  useEffect(() => {
    if (user?.examType) {
      setSelectedExamArea(user.examType);
    }
  }, [user, isOpen]);


  const handleClose = () => {
    if (setIsOpen) {
      setIsOpen(false);
    }
  }

  const handleSubmit = async () => {
    if (selectedExamArea) {
      try {
        await setExamType(selectedExamArea);
        handleClose();
      } catch (error) {
        console.error('Error setting exam type:', error);
        // Error is already handled in setExamType with toast
      }
    }
  };

  const dialogProps = isUpdate ?
    { open: isOpen, onOpenChange: setIsOpen } :
    { open: isOpen, onOpenChange: setIsOpen };

  return (
    <Dialog {...dialogProps}>
      <DialogContent className="w-[95vw] max-w-md rounded-lg" onInteractOutside={(e) => {
          if(!isUpdate) e.preventDefault();
      }}>
        <DialogHeader>
          <DialogTitle>{isUpdate ? 'Actualizar Área de Estudio' : '¡Bienvenido a Luni Site!'}</DialogTitle>
          <DialogDescription>
            {isUpdate ? 'Selecciona la nueva área para la que te estás preparando.' : 'Para personalizar tu experiencia, por favor selecciona el área para la que te estás preparando.'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
            <Select value={selectedExamArea || ''} onValueChange={setSelectedExamArea}>
                <SelectTrigger>
                    <SelectValue placeholder="Selecciona un área..." />
                </SelectTrigger>
                <SelectContent>
                    {examAreas.map(area => (
                        <SelectItem key={area} value={area} className="break-words whitespace-normal">{area}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={!selectedExamArea}>
            {isUpdate ? 'Guardar Cambios' : 'Empezar a Aprender'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
