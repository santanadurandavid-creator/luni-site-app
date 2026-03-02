import { NextRequest, NextResponse } from 'next/server';
import { ai } from '@/ai/genkit';
import { z } from 'zod';

export const maxDuration = 60; // Set max duration to 60 seconds (Vercel/Firebase limit)
export const dynamic = 'force-dynamic';

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

export async function POST(request: NextRequest) {
    console.log('[generate-study-plan] API route called');

    try {
        const body = await request.json();
        const input = StudyPlanInputSchema.parse(body);

        console.log('[generate-study-plan] Input validated', {
            examDate: input.examDate,
            durationDays: input.durationDays,
            dailyHours: input.dailyHours,
            dataUriLength: input.guideDataUri.length
        });

        // Calculate totalDays accurately
        let totalDays: number;
        if (input.examDate) {
            const today = new Date();
            today.setHours(0, 0, 0, 0); // Reset time to start of day
            const examDate = new Date(input.examDate);
            examDate.setHours(0, 0, 0, 0);
            const diffTime = examDate.getTime() - today.getTime();
            totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            if (totalDays < 1) {
                return NextResponse.json({ error: 'La fecha del examen debe ser en el futuro.' }, { status: 400 });
            }
            if (totalDays > 60) {
                return NextResponse.json({ error: 'El plan de estudio no puede superar los 60 días.' }, { status: 400 });
            }
        } else if (input.durationDays) {
            totalDays = input.durationDays;
            if (totalDays > 60) {
                return NextResponse.json({ error: 'El plan de estudio no puede superar los 60 días.' }, { status: 400 });
            }
        } else {
            return NextResponse.json({ error: 'Debe proporcionar examDate o durationDays.' }, { status: 400 });
        }

        const prompt = `
Eres un experto tutor de IA encargado de crear un plan de estudio personalizado.
El estudiante tiene las siguientes restricciones:
- Horas de estudio diarias: ${input.dailyHours} horas.
- Total de días para el plan: ${totalDays} días.

Analiza el documento PDF proporcionado (la guía de estudio del examen).
Basado en el contenido de la guía y el tiempo disponible, genera un plan de estudio estructurado día a día.

Reglas:
1. El campo "totalDays" DEBE ser exactamente ${totalDays}.
2. El array "syllabus" DEBE tener exactamente ${totalDays} elementos, uno por cada día.
3. Cubre TODOS los temas importantes de la guía en el tiempo disponible.
4. Distribuye la carga de trabajo de manera equilibrada.
5. Si el tiempo es corto (menos de 30 días), prioriza los temas más importantes.
6. Si hay mucho tiempo (más de 60 días), incluye días de repaso y práctica.
7. Genera un mensaje de bienvenida motivador explicando cómo abordaremos el estudio.

Formato de salida JSON:
{
  "totalDays": ${totalDays},
  "dailyHours": ${input.dailyHours},
  "welcomeMessage": "Mensaje motivador...",
  "syllabus": [
    {
      "day": 1,
      "topic": "Título del tema principal del día",
      "description": "Breve descripción de qué se estudiará",
      "keyPoints": ["Punto clave 1", "Punto clave 2"]
    },
    ...
  ]
}
`;

        // Detect content type from data URI
        const contentType = input.guideDataUri.startsWith('data:application/pdf')
            ? 'application/pdf'
            : 'image/jpeg';

        console.log('[generate-study-plan] Calling Gemini API', { contentType });

        const response = await ai.generate({
            model: 'googleai/gemini-2.5-flash',
            prompt: [
                { text: prompt },
                { media: { url: input.guideDataUri, contentType } },
            ],
            output: { schema: StudyPlanOutputSchema },
        });

        const output = response.output;
        if (!output) {
            console.error('[generate-study-plan] No output from AI');
            return NextResponse.json({ error: 'No se pudo generar el plan de estudio.' }, { status: 500 });
        }

        // Ensure totalDays matches the calculated value
        output.totalDays = totalDays;

        // Add default welcome message if missing
        if (!output.welcomeMessage) {
            output.welcomeMessage = `¡Bienvenido a tu plan de estudio personalizado de ${totalDays} días! Vamos a trabajar juntos para alcanzar tu objetivo.`;
        }

        console.log('[generate-study-plan] Success');
        return NextResponse.json(output);

    } catch (error: any) {
        console.error('[generate-study-plan] Error:', error);
        return NextResponse.json(
            { error: error.message || 'Error interno del servidor' },
            { status: 500 }
        );
    }
}
