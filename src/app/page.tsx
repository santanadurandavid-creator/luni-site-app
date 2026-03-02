
'use client';

import { useAuth } from '@/hooks/use-auth';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, Suspense, useState, ReactNode } from 'react';
import { Logo } from '@/components/layout/Logo';

function LoadingSpinner() {
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
  )
}

function MainRedirector() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // We don't want to redirect until the auth state is fully loaded.
    if (isLoading) {
      return;
    }

    const currentParams = searchParams.toString();
    const queryString = currentParams ? `?${currentParams}` : '';

    if (isAuthenticated && user) {
      // User is logged in, redirect based on role
      if (user.role === 'admin' || user.role === 'support' || user.role === 'supervisor_support' || user.role === 'content_creator') {
        router.replace(`/admin${queryString}`);
      } else {
        router.replace(`/profile${queryString}`);
      }
    } else {
      // User is not logged in, redirect to landing page
      router.replace(`/landing${queryString}`);
    }
  }, [isLoading, isAuthenticated, user, router, searchParams]);

  return <LoadingSpinner />;
}


export default function HomePage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <MainRedirector />
    </Suspense>
  );
}
