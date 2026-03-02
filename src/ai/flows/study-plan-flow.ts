import { ai } from '@/ai/genkit';
import { z } from 'zod';

const StudyPlanInputSchema = z.object({
    examDate: z.string().optional(),
    durationDays: z.number().optional(),
    dailyHours: z.number(),
    guideDataUri: z.string().refine((val) => val.startsWith('data:application/pdf') || val.startsWith('data:image/'), {
        message: 'Debe ser un archivo PDF válido.',
    }),
});

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

export type StudyPlan = z.infer<typeof StudyPlanOutputSchema>;

// Flow definition kept for reference or internal use, but logic is now in API route
// to avoid Server Action timeouts in production.
export const generateStudyPlanFlow = ai.defineFlow(
    {
        name: 'generateStudyPlanFlow',
        inputSchema: StudyPlanInputSchema,
        outputSchema: StudyPlanOutputSchema,
    },
    async (input) => {
        // ... logic is duplicated in API route for now ...
        return {} as any;
    }
);

