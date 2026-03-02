
'use client';

import Image from "next/image";
import { Logo } from "@/components/layout/Logo";
import { useState, useEffect } from 'react';
import { getFirebaseServices } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import type { Setting } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';

function LoadingScreen() {
  // Fixed positions and durations for bouncing bubbles
  const bubbles = [
    { size: 16, color: 'bg-pink-400/60', delay: 0, duration: 4, x: 10, y: 20 },
    { size: 24, color: 'bg-blue-500/50', delay: 0.5, duration: 5, x: 80, y: 70 },
    { size: 20, color: 'bg-pink-500/50', delay: 1, duration: 4.5, x: 30, y: 60 },
    { size: 18, color: 'bg-blue-400/60', delay: 1.5, duration: 5.5, x: 70, y: 30 },
    { size: 22, color: 'bg-pink-400/50', delay: 2, duration: 4.8, x: 50, y: 80 },
    { size: 16, color: 'bg-blue-500/60', delay: 2.5, duration: 5.2, x: 20, y: 40 },
  ];

  return (
    <div className="flex flex-col items-center justify-center min-h-screen overflow-hidden relative" style={{ backgroundColor: '#3A5064' }}>
      {/* Bouncing bubbles */}
      <div className="absolute inset-0 pointer-events-none">
        {bubbles.map((bubble, i) => (
          <div
            key={i}
            className={`absolute rounded-full ${bubble.color} animate-bubble-bounce`}
            style={{
              width: `${bubble.size}px`,
              height: `${bubble.size}px`,
              left: `${bubble.x}%`,
              top: `${bubble.y}%`,
              animationDelay: `${bubble.delay}s`,
              animationDuration: `${bubble.duration}s`
            }}
          />
        ))}
      </div>

      {/* Logo with app icon style */}
      <div className="relative z-10 flex flex-col items-center gap-6">
        <div className="relative p-1 bg-white rounded-3xl shadow-2xl">
          <img
            src="/images/luni-logo.png"
            alt="Luni"
            className="w-32 h-32 object-contain"
          />
        </div>

        {/* Minimal spinner */}
        <div className="flex gap-1.5">
          <div className="w-2 h-2 bg-white/80 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
          <div className="w-2 h-2 bg-white/80 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></div>
          <div className="w-2 h-2 bg-white/80 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
        </div>
      </div>
    </div>
  );
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isLoading } = useAuth();
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

  if (isLoading) {
    return <LoadingScreen />;
  }

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
          Tu plataforma todo en uno para prepararte y tener éxito en tu examen de admisión a la UNAM.
        </p>
        {children}
      </div>
    </div>
  );
}
