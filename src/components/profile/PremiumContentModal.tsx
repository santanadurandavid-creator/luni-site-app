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
import { Star, ShieldCheck, Video, FileText, ClipboardCheck, ArrowRight } from 'lucide-react';
import { DynamicPurchaseSimulatorModal } from '../shared/dynamic';
import { useState } from 'react';

interface PremiumContentModalProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onConfirm: () => void;
}

const premiumFeatures = [
    { icon: Video, text: 'Acceso a todos los videos y clases exclusivas.'},
    { icon: FileText, text: 'Material de lectura avanzado y detallado.'},
    { icon: ClipboardCheck, text: 'Quizzes y retos solo para miembros Premium.'},
    { icon: ShieldCheck, text: 'Soporte prioritario para tus consultas.'},
]

export function PremiumContentModal({ isOpen, setIsOpen, onConfirm }: PremiumContentModalProps) {
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);

  const handleConfirm = () => {
    setIsOpen(false);
    setIsPurchaseModalOpen(true);
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="w-[95vw] max-w-md rounded-lg">
          <DialogHeader className="text-center items-center">
              <div className="h-16 w-16 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center mb-4 border-4 border-amber-200 dark:border-amber-800">
                  <Star className="h-8 w-8 text-amber-500 fill-amber-400" />
              </div>
              <DialogTitle className="font-headline text-2xl">Contenido Premium Exclusivo</DialogTitle>
              <DialogDescription>
                  Este contenido solo está disponible para miembros Premium. ¡Actualiza tu cuenta para desbloquear todo el potencial de Luni Site!
              </DialogDescription>
          </DialogHeader>
          <div className="py-4">
              <ul className="space-y-3">
                  {premiumFeatures.map((feature, index) => (
                      <li key={index} className="flex items-start gap-3">
                          <div className="flex-shrink-0 mt-1">
                              <feature.icon className="h-5 w-5 text-primary" />
                          </div>
                          <span className="text-sm text-muted-foreground">{feature.text}</span>
                      </li>
                  ))}
              </ul>
          </div>
          <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
              <Button variant="outline" onClick={() => setIsOpen(false)}>Quizás más tarde</Button>
              <Button onClick={handleConfirm} className="bg-amber-500 hover:bg-amber-600">
                  <Star className="mr-2 h-4 w-4" />
                  Hazte Premium
                  <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <DynamicPurchaseSimulatorModal isOpen={isPurchaseModalOpen} setIsOpen={setIsPurchaseModalOpen} />
    </>
  );
}
