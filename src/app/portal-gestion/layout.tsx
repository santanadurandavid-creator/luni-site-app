'use client';

import Image from "next/image";
import { Logo } from "@/components/layout/Logo";
import { useState, useEffect } from 'react';
import { getFirebaseServices } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import type { Setting } from '@/lib/types';

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [settings, setSettings] = useState<Setting>({} as Setting);

  useEffect(() => {
    const { db } = getFirebaseServices();
    const settingsRef = doc(db, 'settings', 'theme');
    const unsubscribe = onSnapshot(settingsRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data() as Setting;
        setSettings(data);
      }
    });
    return () => unsubscribe();
  }, []);

  return (
     <div className="min-h-screen bg-background text-foreground relative flex items-center justify-center p-4">
        {settings.loginScreenImageUrl && (
            <Image
                src={settings.loginScreenImageUrl}
                alt="Estudiantes colaborando"
                layout="fill"
                objectFit="cover"
                className="z-0"
                data-ai-hint="students collaborating"
                priority
            />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/10 z-0" />

        <div className="relative z-10 flex flex-col items-center justify-center w-full max-w-md">
             <div className="w-48 mb-4">
                <Logo />
            </div>
             <p className="text-center text-lg text-primary-foreground/80 mb-8">
                Portal de gestión para administradores y equipo de soporte.
            </p>
            {children}
        </div>
    </div>
  );
}
