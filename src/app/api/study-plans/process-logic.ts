import { adminDb, adminMessaging } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { ai } from '@/ai/genkit';
import { z } from 'zod';

// Schema definitions for AI output
const SyllabusDaySchema = z.object({
    day: z.number(),
    topic: z.string(),
    description: z.string(),
    keyPoints: z.array(z.string()),
});

const StudyPlanOutputSchema = z.object({
    totalDays: z.number(),
    dailyHours: z.number(),
    syllabus: z.array(SyllabusDaySchema),
    welcomeMessage: z.string().optional(),
});

export async function processStudyPlanRequest(
    requestId: string,
    userId: string,
    preferences: any,
    fcmToken?: string
) {
    console.log('[process-logic] Starting process for request:', requestId);
    console.log('[process-logic] GEMINI_API_KEY exists:', !!process.env.GEMINI_API_KEY);

    try {
        // 1. Mark request as processing
        const requestRef = adminDb.collection('plan_requests').doc(requestId);
        await requestRef.update({ status: 'processing' });

        // 2. Retrieve user data
        const userDoc = await adminDb.collection('users').doc(userId).get();
        const userData = userDoc.data();
        const examTypeRaw = userData?.examType;

        let userArea: number | null = null;
        if (typeof examTypeRaw === 'number') {
            userArea = examTypeRaw;
        } else if (typeof examTypeRaw === 'string') {
            const match = examTypeRaw.match(/Área\s+(\d+)/i);
            if (match) {
                userArea = parseInt(match[1]);
            } else {
                const parsed = parseInt(examTypeRaw);
                if (!isNaN(parsed)) userArea = parsed;
            }
        }

        console.log('[process-logic] User area:', userArea);

        if (!userArea || userArea < 1 || userArea > 4) {
            await requestRef.update({ status: 'failed', error: 'Invalid area' });
            throw new Error('Invalid user area');
        }

        // 3. Fetch guides
        const guidesSnapshot = await adminDb
            .collection('guides')
            .where('isActive', '==', true)
            .where('area', '==', userArea)
            .get();

        if (guidesSnapshot.empty) {
            await requestRef.update({ status: 'failed', error: 'No guides' });
            throw new Error('No guides found');
        }

        // 4. Collect guide contents
        const guideContents: { title: string; content: string }[] = [];
        guidesSnapshot.forEach((doc: any) => {
            const data = doc.data();
            if (data.content) {
                guideContents.push({ title: data.title, content: data.content });
            }
        });

        if (guideContents.length === 0) {
            await requestRef.update({ status: 'failed', error: 'No content' });
            throw new Error('No guide content');
        }

        // 5. Calculate days
        let totalDays: number;
        if (preferences.examDate) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const examDate = new Date(preferences.examDate);
            examDate.setHours(0, 0, 0, 0);
            const diff = examDate.getTime() - today.getTime();
            totalDays = Math.ceil(diff / (1000 * 60 * 60 * 24));
            if (totalDays < 1) totalDays = 30;
        } else {
            totalDays = preferences.durationDays || 30;
        }

        // 6. Generate plan with AI
        const guideText = guideContents
            .map((g) => `\n=== ${g.title} ===\n${g.content}\n`)
            .join('\n');

        const prompt = `
Eres un tutor de IA que debe crear un plan de estudio personalizado.
Restricciones:
- Horas diarias: ${preferences.dailyHours}
- Días totales: ${totalDays}

TEMARIO COMPLETO:${guideText}

Genera un JSON con los campos totalDays, dailyHours, welcomeMessage (opcional) y syllabus (array de días con topic, description y keyPoints).`;

        console.log('[process-logic] Calling Gemini AI...');

        const aiResponse = await ai.generate({
            model: 'googleai/gemini-2.5-flash',
            prompt,
            output: { schema: StudyPlanOutputSchema },
        });

        console.log('[process-logic] AI generation successful');

        const plan = aiResponse.output;
        if (!plan) {
            throw new Error('AI returned no output');
        }

        plan.totalDays = totalDays;

        // 7. Save plan
        const userPlanRef = adminDb
            .collection('users')
            .doc(userId)
            .collection('study_plan')
            .doc('current');

        await userPlanRef.set({
            plan,
            createdAt: FieldValue.serverTimestamp(),
            completedDays: [],
            status: 'active',
            generatedFromRequestId: requestId,
        });

        console.log('[process-logic] Plan saved');

        // 8. Update counters
        const userRef = adminDb.collection('users').doc(userId);
        const now = Date.now();
        const monthMs = 30 * 24 * 60 * 60 * 1000;
        const lastReset = userData?.lastPlanGenerationReset?.toDate ? userData.lastPlanGenerationReset.toDate() : null;

        if (lastReset && now - lastReset.getTime() > monthMs) {
            await userRef.update({
                planGenerationsCount: 1,
                lastPlanGenerationReset: FieldValue.serverTimestamp(),
            });
        } else {
            await userRef.update({
                planGenerationsCount: FieldValue.increment(1),
                lastPlanGenerationReset: FieldValue.serverTimestamp(),
            });
        }

        // 9. Mark as completed
        await requestRef.update({ status: 'completed', completedAt: FieldValue.serverTimestamp() });

        console.log('[process-logic] Request marked as completed');

        // 10. Send notification
        if (fcmToken) {
            try {
                await adminMessaging.send({
                    token: fcmToken,
                    notification: {
                        title: '¡Tu Plan de Estudio está listo!',
                        body: `Hemos generado tu plan de ${totalDays} días. ¡Entra y comienza a estudiar!`,
                    },
                    data: {
                        url: '/profile?tab=study-plan',
                        click_action: '/profile?tab=study-plan',
                    },
                });
                console.log('[process-logic] Notification sent');
            } catch (notifError) {
                console.error('[process-logic] Notification failed:', notifError);
            }
        }

        console.log('[process-logic] Process completed successfully');
        return { success: true };

    } catch (error: any) {
        console.error('[process-logic] ERROR:', error);
        console.error('[process-logic] Error stack:', error.stack);

        try {
            await adminDb.collection('plan_requests').doc(requestId).update({
                status: 'failed',
                error: error.message || 'Unknown error',
            });
        } catch (e) {
            console.error('[process-logic] Failed to update status:', e);
        }

        throw error;
    }
}
