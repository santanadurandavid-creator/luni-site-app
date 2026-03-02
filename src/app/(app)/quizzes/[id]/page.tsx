'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';

export default function QuizItemPage() {
    const router = useRouter();
    const params = useParams();
    const { isAuthenticated, isLoading } = useAuth();
    const id = params?.id as string;

    useEffect(() => {
        if (!isLoading) {
            if (id) {
                if (isAuthenticated) {
                    // User is authenticated, redirect to quizzes page with open parameter
                    router.replace(`/quizzes?open=${id}`);
                } else {
                    // User is not authenticated, redirect to access-content page
                    router.replace(`/access-content?redirect=${encodeURIComponent(`/quizzes?open=${id}`)}`);
                }
            }
        }
    }, [id, router, isAuthenticated, isLoading]);

    // Show loading while redirecting
    return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-[#3A5064] to-[#2d3e50]">
            <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin" />
                <p className="text-white text-lg">Cargando quiz...</p>
            </div>
        </div>
    );
}
