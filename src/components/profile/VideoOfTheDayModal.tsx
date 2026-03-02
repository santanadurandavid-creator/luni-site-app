import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useEffect, useState } from 'react';
import { getFirebaseServices } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import type { Setting } from '@/lib/types';

interface VideoOfTheDayModalProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export function VideoOfTheDayModal({ isOpen, setIsOpen }: VideoOfTheDayModalProps) {
  const [videoUrl, setVideoUrl] = useState<string>("https://www.youtube.com/embed/dQw4w9WgXcQ");

  useEffect(() => {
    const { db } = getFirebaseServices();
    const settingsRef = doc(db, 'settings', 'theme');
    const unsubscribe = onSnapshot(settingsRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data() as Setting;
        if (data.tutorialVideoUrl) {
          setVideoUrl(data.tutorialVideoUrl);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="w-[95vw] max-w-2xl rounded-lg p-0 border-0">
        <DialogHeader className="sr-only">
          <DialogTitle>Video Tutorial</DialogTitle>
        </DialogHeader>
        <div className="aspect-video">
          <iframe
            src={videoUrl}
            title="Video Tutorial"
            className="w-full h-full border-0 rounded-lg"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
