
'use client';

import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import Image from 'next/image';

interface ImageModalProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  imageUrl: string | null;
}

export function ImageModal({ isOpen, setIsOpen, imageUrl }: ImageModalProps) {
  if (!imageUrl) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="w-[95vw] h-[95vh] max-w-4xl p-0 border-0 rounded-lg bg-transparent shadow-none">
        <div className="relative w-full h-full">
            <Image src={imageUrl} alt="Vista ampliada" layout="fill" objectFit="contain" className="rounded-lg"/>
        </div>
      </DialogContent>
    </Dialog>
  );
}
