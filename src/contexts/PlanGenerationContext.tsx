"use client";

import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { StudyPlan } from '@/ai/flows/study-plan-flow';
import { getFirebaseServices } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

interface PlanGenerationContextProps {
    isGenerating: boolean;
    progress: number;
    currentPlan: StudyPlan | null;
    startGeneration: (params: {
        dailyHours: number;
        examDate?: string;
        durationDays?: number;
        userId: string;
        fcmToken?: string;
    }) => Promise<void>;
    clearPlan: () => void;
}

const PlanGenerationContext = createContext<PlanGenerationContextProps | undefined>(undefined);

export const PlanGenerationProvider = ({ children }: { children: ReactNode }) => {
    const [isGenerating, setIsGenerating] = useState(false);
    const [progress, setProgress] = useState(0);
    const [currentPlan, setCurrentPlan] = useState<StudyPlan | null>(null);
    const [requestId, setRequestId] = useState<string | null>(null);
    const [showNoGuidesError, setShowNoGuidesError] = useState(false);

    // Polling effect
    useEffect(() => {
        if (!isGenerating || !requestId) return;

        let pollCount = 0;
        const maxPolls = 120; // 6 minutes max (120 * 3s = 360s)

        const pollInterval = setInterval(async () => {
            pollCount++;

            // Timeout detection
            if (pollCount > maxPolls) {
                console.error('Plan generation timed out');
                setIsGenerating(false);
                setRequestId(null);
                setProgress(0);
                clearInterval(pollInterval);
                return;
            }

            try {
                const response = await fetch(`/api/study-plans/status?requestId=${requestId}`);
                if (response.ok) {
                    const data = await response.json();

                    if (data.status === 'completed') {
                        // Fetch the plan
                        const { db, auth } = getFirebaseServices();
                        const userId = auth.currentUser?.uid;
                        if (userId) {
                            const planRef = doc(db, 'users', userId, 'study_plan', 'current');
                            const planDoc = await getDoc(planRef);
                            if (planDoc.exists()) {
                                setCurrentPlan(planDoc.data().plan as StudyPlan);
                            }
                        }
                        setProgress(100);
                        setIsGenerating(false);
                        setRequestId(null);

                        // Show success toast
                        toast({
                            title: "¡Plan Generado!",
                            description: "Tu plan de estudio ha sido creado exitosamente.",
                            duration: 5000,
                        });
                    } else if (data.status === 'failed') {
                        console.error('Plan generation failed:', data.error);
                        setIsGenerating(false);
                        setRequestId(null);
                        setProgress(0);
                    } else {
                        // Still processing, gradual progress update
                        setProgress(prev => {
                            // Slow down as we approach 95%
                            if (prev >= 95) return Math.min(prev + 0.5, 98);
                            if (prev >= 85) return Math.min(prev + 1, 95);
                            return Math.min(prev + 2, 85);
                        });
                    }
                }
            } catch (error) {
                console.error('Error polling status:', error);
            }
        }, 3000);

        return () => clearInterval(pollInterval);
    }, [isGenerating, requestId]);

    const startGeneration = async ({
        dailyHours,
        examDate,
        durationDays,
        userId,
        fcmToken
    }: {
        dailyHours: number;
        examDate?: string;
        durationDays?: number;
        userId: string;
        fcmToken?: string;
    }) => {
        setIsGenerating(true);
        setProgress(10); // Start progress

        try {
            const response = await fetch('/api/study-plans/request', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId,
                    preferences: {
                        dailyHours,
                        examDate,
                        durationDays,
                    },
                    fcmToken
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));

                // Check for NO_GUIDES_AVAILABLE error
                if (errorData.error === 'NO_GUIDES_AVAILABLE') {
                    setShowNoGuidesError(true);
                    setIsGenerating(false);
                    setProgress(0);
                    return;
                }

                throw new Error(errorData.error || 'Error al solicitar el plan');
            }

            const data = await response.json();
            setRequestId(data.requestId);
            setProgress(20);

        } catch (error) {
            console.error('Error starting generation:', error);
            setIsGenerating(false);
            setProgress(0);
        }
    };

    const clearPlan = () => {
        setCurrentPlan(null);
        setProgress(0);
        setIsGenerating(false);
        setRequestId(null);
    };

    return (
        <PlanGenerationContext.Provider
            value={{ isGenerating, progress, currentPlan, startGeneration, clearPlan }}
        >
            {children}

            {/* No Guides Available Error Dialog */}
            <Dialog open={showNoGuidesError} onOpenChange={setShowNoGuidesError}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Generación no disponible</DialogTitle>
                        <DialogDescription>
                            Por el momento no está disponible la generación de plan. Intenta más tarde.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button onClick={() => setShowNoGuidesError(false)}>
                            Entendido
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </PlanGenerationContext.Provider>
    );
};

export const usePlanGeneration = () => {
    const context = useContext(PlanGenerationContext);
    if (!context) {
        throw new Error('usePlanGeneration must be used within a PlanGenerationProvider');
    }
    return context;
};
