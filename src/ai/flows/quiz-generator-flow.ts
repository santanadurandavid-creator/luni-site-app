
'use server';
/**
 * @fileOverview Flow para generar quizzes a partir de texto usando IA.
 *
 * - generateQuizzesFromText - Genera dos quizzes de 10 preguntas cada uno y notifica al usuario.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import type { ContentItem, ContentCategory } from '@/lib/types';
import { initFirebaseAdmin } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';


const QuizQuestionSchema = z.object({
  id: z.string(),
  question: z.string(),
  options: z.array(z.object({
    id: z.string(),
    text: z.string(),
    isCorrect: z.boolean(),
  })).length(4, "Debe haber 4 opciones."),
});

const QuizGeneratorInputSchema = z.object({
  text: z.string().min(100, "El texto debe tener al menos 100 caracteres."),
  title: z.string(),
  subject: z.string(),
  category: z.string(),
  accessLevel: z.enum(['free', 'premium']),
  imageUrl: z.string().optional().nullable(),
  userId: z.string(), // ID of the admin user requesting the generation
});

const QuizGeneratorOutputSchema = z.object({
  quizzes: z.array(z.object({
    title: z.string(),
    questions: z.array(QuizQuestionSchema),
  })),
});

export type QuizGeneratorInput = z.infer<typeof QuizGeneratorInputSchema>;
export type QuizGeneratorOutput = z.infer<typeof QuizGeneratorOutputSchema>;

// This function is now a "fire-and-forget" call from the client.
export async function generateQuizzesFromText(input: QuizGeneratorInput): Promise<void> {
  // We don't await the flow here. It runs in the background on the server.
  generateQuizzesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'quizGeneratorPrompt',
  input: { schema: QuizGeneratorInputSchema },
  output: { schema: QuizGeneratorOutputSchema },
  prompt: `
    Eres un experto creando material de estudio para exámenes de admisión.
    Basado en el siguiente texto y su título, genera un total de 20 preguntas de opción múltiple únicas y relevantes.
    Divide estas 20 preguntas en 2 quizzes distintos, cada uno con 10 preguntas.
    El título de cada quiz debe ser el título original seguido de "(Quiz 1)" y "(Quiz 2)".
    Cada pregunta debe tener 4 opciones, donde solo una es correcta. Asegúrate de que las opciones incorrectas (distractores) sean plausibles pero claramente incorrectas según el texto.
    Genera un ID único para cada pregunta y para cada opción usando el formato UUID.

    Título del material: {{{title}}}
    
    Texto base:
    {{{text}}}

    Formato de salida esperado:
    {
      "quizzes": [
        {
          "title": "{{{title}}} (Quiz 1)",
          "questions": [
            {
              "id": "uuid",
              "question": "Texto de la pregunta 1",
              "options": [
                { "id": "uuid", "text": "Opción A", "isCorrect": true },
                { "id": "uuid", "text": "Opción B", "isCorrect": false },
                { "id": "uuid", "text": "Opción C", "isCorrect": false },
                { "id": "uuid", "text": "Opción D", "isCorrect": false }
              ]
            },
            // ...9 preguntas más
          ]
        },
        {
          "title": "{{{title}}} (Quiz 2)",
          "questions": [
            // ...10 preguntas
          ]
        }
      ]
    }
  `,
});

const generateQuizzesFlow = ai.defineFlow(
  {
    name: 'generateQuizzesFlow',
    inputSchema: QuizGeneratorInputSchema,
    // The flow now returns nothing to the original caller, as it runs in the background.
    outputSchema: z.void(),
  },
  async (input) => {
    const { firestore } = await initFirebaseAdmin();

    try {
      const { output } = await prompt(input);
      if (!output || !output.quizzes) {
        throw new Error("La IA no pudo generar los quizzes.");
      }

      // Ensure all IDs are unique before saving
      output.quizzes.forEach(quiz => {
          quiz.questions.forEach(question => {
              question.id = uuidv4();
              question.options.forEach(option => {
                  option.id = uuidv4();
              });
          });
      });

      const contentCollection = firestore.collection('content');
      const notificationsCollection = firestore.collection('notifications');

      // Save the generated quizzes to Firestore
      for (const quizData of output.quizzes) {
        const newQuizItem: Omit<ContentItem, 'id'> = {
            title: quizData.title,
            subject: input.subject,
            type: 'quiz',
            category: input.category as ContentCategory,
            accessLevel: input.accessLevel,
        imageUrl: input.imageUrl ?? undefined,
            createdAt: FieldValue.serverTimestamp() as any,
            quizDetails: {
                questions: quizData.questions,
                backgroundColor: '#FFFFFF',
                textColor: '#000000',
                backgroundImageUrl: '',
                backgroundImageOpacity: 0.2
            },
            views: 0,
        };
        await contentCollection.add(newQuizItem);
      }
      
      // Create a success notification for the admin user
      await notificationsCollection.add({
        title: '✅ Quizzes Generados',
        description: `Los quizzes para "${input.title}" se han creado exitosamente.`,
        type: 'success',
        createdAt: FieldValue.serverTimestamp(),
        recipientIds: [input.userId], // Send only to the user who requested it
        isScheduled: false,
        sentAt: null,
      });

    } catch (error: any) {
        console.error("Error in generateQuizzesFlow:", error);
        
        // Create an error notification for the admin user
        const notificationsCollection = firestore.collection('notifications');
        await notificationsCollection.add({
            title: '❌ Error al Generar Quizzes',
            description: `Hubo un problema al crear los quizzes para "${input.title}". Razón: ${error.message || 'Desconocida'}`,
            type: 'error',
            createdAt: FieldValue.serverTimestamp(),
            recipientIds: [input.userId],
            isScheduled: false,
            sentAt: null,
        });
    }
  }
);
