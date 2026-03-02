
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
import { Share, PlusSquare } from 'lucide-react';
import Image from 'next/image';

interface IosInstallPromptProps {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
}


export function IosInstallPrompt({isOpen, setIsOpen}: IosInstallPromptProps) {

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-center font-headline text-2xl">¡Instala Luni Site!</DialogTitle>
           <DialogDescription className="text-center">
            Añade la aplicación a tu pantalla de inicio para un acceso más rápido y una mejor experiencia.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 text-center">
            <p className="text-muted-foreground">
                Sigue estos sencillos pasos:
            </p>
            <ol className="text-left mt-4 space-y-3">
                <li className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground font-bold">1</span>
                    <span>Toca el botón de <Share className="inline-block h-4 w-4 mx-1"/> Compartir en la barra de navegación de Safari.</span>
                </li>
                 <li className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground font-bold">2</span>
                    <span>Desliza hacia arriba y selecciona <PlusSquare className="inline-block h-4 w-4 mx-1"/> "Añadir a pantalla de inicio".</span>
                </li>
            </ol>
             <Image 
                src="https://placehold.co/300x150.png"
                width={300}
                height={150}
                alt="Instrucciones para instalar en iOS"
                className="mx-auto rounded-md mt-6 border"
                data-ai-hint="iOS install instructions"
            />
        </div>
        <DialogFooter>
          <Button onClick={() => setIsOpen(false)} className="w-full">Entendido</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
