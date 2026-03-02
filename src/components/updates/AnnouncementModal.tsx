
'use client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import type { UpdateInfo } from '@/lib/types';
import Image from 'next/image';
import { useEffect } from 'react';

interface AnnouncementModalProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  announcement: UpdateInfo | null;
}

export function AnnouncementModal({ isOpen, setIsOpen, announcement }: AnnouncementModalProps) {
  if (!announcement) return null;

  // Auto-open URL content when modal opens
  useEffect(() => {
    if (isOpen && announcement.contentType === 'url' && announcement.contentUrl) {
      window.open(announcement.contentUrl, '_blank', 'noopener,noreferrer');
      setIsOpen(false); // Close modal immediately after opening URL
    }
  }, [isOpen, announcement, setIsOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="w-[95vw] md:w-[90vw] h-[90vh] md:h-[95vh] max-w-4xl md:max-w-5xl p-0 flex flex-col rounded-lg bg-background overflow-hidden border-none shadow-2xl">
        <DialogHeader className="sr-only">
          <DialogTitle>{announcement.title}</DialogTitle>
          <DialogDescription>{announcement.description}</DialogDescription>
        </DialogHeader>

        <div className="flex-grow flex flex-col overflow-y-auto bg-black/5">
          {announcement.imageUrl && (
            <div className="w-full relative flex-shrink-0 bg-black">
              <img
                src={announcement.imageUrl}
                alt={announcement.title}
                className="w-full h-auto max-h-[60vh] md:max-h-[70vh] object-contain mx-auto"
              />
            </div>
          )}

          {announcement.contentType === 'html' && announcement.contentHtml ? (
            <div className="flex-grow w-full min-h-[300px] bg-white">
              <iframe
                srcDoc={announcement.contentHtml}
                title={announcement.title}
                className="w-full h-full border-0 min-h-[50vh]"
                sandbox="allow-scripts allow-same-origin allow-popups allow-top-navigation"
              />
            </div>
          ) : !announcement.imageUrl && (
            // Only show "No content" if there is ALSO no image
            <div className="flex-grow flex items-center justify-center p-6 text-center text-muted-foreground bg-background">
              No hay contenido que mostrar.
            </div>
          )}

          {/* Show title/description if purely visual ad? Optional but good for context if just image */}
          {announcement.description && (
            <div className="p-4 bg-white border-t">
              <h2 className="text-xl font-bold mb-2">{announcement.title}</h2>
              <p className="text-gray-600">{announcement.description}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
