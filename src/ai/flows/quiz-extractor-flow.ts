'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const ImageInputSchema = z.object({
  photoDataUri: z.string().startsWith('data:image/', 'Debe ser una URI de imagen válida.'),
});

const ExtractedQuestionSchema = z.object({
  question: z.string(),
  question_image_description: z.string().optional(),
  options: z.array(z.object({
    text: z.string(),
    image_description: z.string().optional(),
    is_correct: z.boolean().optional(),
  })).length(4, 'Debe haber 4 opciones por pregunta.'),
});

const ExtractedQuizSchema = z.object({
  questions: z.array(ExtractedQuestionSchema),
});

export type ExtractedQuiz = z.infer<typeof ExtractedQuizSchema>;

const extractQuizFlow = ai.defineFlow(
  {
    name: 'extractQuizFlow',
    inputSchema: ImageInputSchema,
    outputSchema: ExtractedQuizSchema,
  },
  async (input) => {
    const prompt = `
Analiza la imagen proporcionada que contiene preguntas de opción múltiple (probablemente de un examen o quiz).
Extrae todas las preguntas visibles, incluyendo:
- El texto de cada pregunta.
- Si hay una imagen en la pregunta, describe brevemente su contenido relevante.
- Las 4 opciones (A, B, C, D) con su texto.
- Si hay imágenes en las opciones, describe brevemente su contenido.
- Identifica la opción correcta si es posible (basado en contexto visual o marcas), pero si no, deja is_correct como false para todas inicialmente.

Formato de salida estricto como JSON:
{
  "questions": [
    {
      "question": "Texto completo de la pregunta 1",
      "question_image_description": "Descripción breve si hay imagen en pregunta, sino omite",
      "options": [
        {
          "text": "Opción A completa",
          "image_description": "Descripción si hay imagen en opción A",
          "is_correct": true/false
        },
        // ... 3 más
      ]
    }
    // ... más preguntas
  ]
}

Asegúrate de que cada pregunta tenga exactamente 4 opciones. Si la imagen tiene múltiples preguntas, extrae todas.
Si no puedes identificar correctamente, usa tu mejor estimación basada en el layout típico de exámenes.
`;

    const response = await ai.generate({
      model: 'googleai/gemini-2.5-flash',
      prompt: [
        { text: prompt },
        { media: { url: input.photoDataUri } },
      ],
      output: { schema: ExtractedQuizSchema },
    });

    const output = response.output;
    if (!output) {
      throw new Error('No se pudo extraer preguntas de la imagen.');
    }
    return output;
  }
);

export async function extractQuestionsFromImage(input: { photoDataUri: string }): Promise<ExtractedQuiz> {
  return await extractQuizFlow(input);
}
