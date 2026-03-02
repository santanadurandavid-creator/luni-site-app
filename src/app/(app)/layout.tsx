
'use client';

import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import React, { useEffect, useCallback, useRef, useState, Suspense } from 'react';
import { AuthRedirectHandler } from '@/components/layout/AuthRedirectHandler';
import { BottomNav } from '@/components/layout/BottomNav';
import { Sidebar } from '@/components/layout/Sidebar';
import { MainHeader } from '@/components/layout/MainHeader';
import { ExamSelectionModal } from '@/components/profile/ExamSelectionModal';
import { Logo } from '@/components/layout/Logo';
import { Button } from '@/components/ui/button';
import AdManager from '@/components/ads/AdManager';
import { PremiumActivationModal } from '@/components/profile/PremiumActivationModal';
import { cn } from '@/lib/utils';
import { getFirebaseServices } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import type { Setting } from '@/lib/types';
import { SwipeNavigation } from '@/components/layout/SwipeNavigation';
import { BouncingBubbles } from '@/components/layout/BouncingBubbles';

const pageOrder = ['/profile', '/clases', '/content', '/quizzes', '/updates'];

function LoadingScreen() {
  const [showOverride, setShowOverride] = useState(false);
  const { setIsLoading } = useAuth();

  useEffect(() => {
    const timer = setTimeout(() => setShowOverride(true), 6000);
    return () => clearTimeout(timer);
  }, []);

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
        {!showOverride ? (
          <div className="flex gap-1.5">
            <div className="w-2 h-2 bg-white/80 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
            <div className="w-2 h-2 bg-white/80 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></div>
            <div className="w-2 h-2 bg-white/80 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
          </div>
        ) : (
          <Button
            variant="outline"
            className="bg-white/10 border-white/20 text-white hover:bg-white/20 transition-all animate-in fade-in zoom-in-50"
            onClick={() => {
              console.log('[AppLayout] Manual loading override');
              setIsLoading(false);
            }}
          >
            Abrir App (Modo Offline)
          </Button>
        )}
      </div>
    </div>
  );
}

function BannedScreen() {
  const { user, logout } = useAuth();
  const supportNumber = "525619764631";
  const message = `Hello, my account (email: ${user?.email}) has been blocked and I would like to appeal the decision.`;
  const whatsappUrl = `https://wa.me/${supportNumber}?text=${encodeURIComponent(message)}`;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-destructive/10 text-center p-4">
      <h1 className="text-3xl font-bold font-headline text-destructive mb-4">Account Blocked</h1>
      <p className="text-muted-foreground max-w-md mb-2">Your account has been blocked by an administrator.</p>
      {user?.banDetails?.reason && (
        <div className="mb-4">
          <p className="font-semibold">Reason:</p>
          <p className="italic">"{user.banDetails.reason}"</p>
        </div>
      )}
      {user?.banDetails?.bannedUntil && (
        <div className="mb-6">
          <p className="font-semibold">Block Ends:</p>
          <p>{new Date(user.banDetails.bannedUntil.seconds * 1000).toLocaleString('en-US')}</p>
        </div>
      )}
      <div className="flex gap-4">
        <Button onClick={logout} variant="outline">Log Out</Button>
        <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
          <Button>Appeal via WhatsApp</Button>
        </a>
      </div>
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth();

  // New state to track if exam selection modal should be shown
  const [showExamSelectionModal, setShowExamSelectionModal] = React.useState(false);

  // State to track sidebar collapse
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);

  // State for dynamic logo URL
  const [logoUrl, setLogoUrl] = React.useState<string>('https://firebasestorage.googleapis.com/v0/b/luni-site-res01.firebasestorage.app/o/favicon.png?alt=media&token=3e46c93a-1ab3-4928-8824-01bc4745ef89');


  // Listen to logo changes from Firebase
  React.useEffect(() => {
    const { db } = getFirebaseServices();
    const settingsRef = doc(db, 'settings', 'theme');
    const unsubscribe = onSnapshot(settingsRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data() as Setting;
        if (data.logoUrl) {
          setLogoUrl(data.logoUrl);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  React.useEffect(() => {
    if (user?.role === 'normal' && !user.examType) {
      setShowExamSelectionModal(true);
    } else {
      setShowExamSelectionModal(false);
    }
  }, [user]);

  const router = useRouter();

  // Handle auth redirects for unauthenticated users BEFORE showing loading screen
  if (!isLoading && !isAuthenticated) {
    return (
      <Suspense fallback={<LoadingScreen />}>
        <AuthRedirectHandler />
        <LoadingScreen />
      </Suspense>
    );
  }

  if (isLoading || !user) {
    return <LoadingScreen />;
  }

  if (user.banDetails?.isBanned) {
    const now = new Date();
    const bannedUntil = user.banDetails.bannedUntil ? new Date(user.banDetails.bannedUntil.seconds * 1000) : null;
    if (!bannedUntil || now < bannedUntil) {
      return <BannedScreen />;
    }
  }

  return (
    <>
      <div className="flex min-h-screen bg-gradient-to-br from-background to-muted/50">
        {/* Animated bouncing bubbles background */}
        <BouncingBubbles />

        <AdManager />
        {/* Sidebar for desktop */}
        <Sidebar
          isCollapsed={sidebarCollapsed}
          setIsCollapsed={setSidebarCollapsed}
          logoUrl={logoUrl}
        />

        {/* Main content area - adjusted for sidebar on desktop */}
        <div
          className={cn(
            "flex flex-col flex-1 transition-[margin] duration-300 ease-in-out",
            sidebarCollapsed ? "md:ml-20" : "md:ml-64"
          )}
        >
          <MainHeader />
          <main className="flex-1 flex flex-col overflow-y-auto pb-20 md:pb-4 md:max-w-[1400px] lg:max-w-[1600px] xl:max-w-[1800px] w-full mx-auto">
            <SwipeNavigation>
              {children}
            </SwipeNavigation>
          </main>
        </div>

        <BottomNav />
        {user.role === 'normal' && <ExamSelectionModal isOpen={showExamSelectionModal} setIsOpen={() => setShowExamSelectionModal(false)} />}
        <Suspense fallback={null}>
          <PremiumActivationModal />
        </Suspense>
      </div>
    </>
  );
}
