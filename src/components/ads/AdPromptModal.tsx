import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface AdPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onWatchAd: () => void;
}

export function AdPromptModal({ isOpen, onClose, onWatchAd }: AdPromptModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ver Anuncio</DialogTitle>
          <DialogDescription>
            Para ver el contenido, ve el siguiente anuncio.
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={onWatchAd}>
            Ver Anuncio
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
