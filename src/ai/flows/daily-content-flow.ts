'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const DailyContentInputSchema = z.object({
  day: z.number(),
  topic: z.string(),
  description: z.string(),
  keyPoints: z.array(z.string()),
  guideDataUri: z.string().optional(),
});

const QuizQuestionSchema = z.object({
  question: z.string(),
  options: z.array(z.string()),
  correctAnswer: z.number(),
  explanation: z.string(),
});

const ContentBlockSchema = z.object({
  type: z.enum(['title', 'subTitle', 'paragraph', 'tip', 'highlight', 'image', 'example', 'summary', 'list', 'table', 'step', 'divider', 'info']),
  content: z.union([
    z.string(),
    z.array(z.string()),
    z.object({
      headers: z.array(z.string()),
      rows: z.array(z.array(z.string()))
    })
  ]),
});

const DailyContentOutputSchema = z.object({
  day: z.number(),
  topic: z.string(),
  blocks: z.array(ContentBlockSchema),
  blocksJson: z.string().optional(),
  quiz: z.object({
    questions: z.array(QuizQuestionSchema),
  }),
  miniGame: z.object({
    type: z.enum(['flashcards', 'true_false']),
    data: z.array(z.object({
      front: z.string(),
      back: z.string(),
    })),
  }),
  generatedClassText: z.string().optional(),
  audioUrl: z.string().optional(),
});

export type DailyContent = z.infer<typeof DailyContentOutputSchema>;

const generateDailyContentFlow = ai.defineFlow(
  {
    name: 'generateDailyContentFlow',
    inputSchema: DailyContentInputSchema,
    outputSchema: DailyContentOutputSchema,
  },
  async (input) => {
    const prompt = `
Eres un tutor de élite preparando una clase maestra para el Día ${input.day}.
Tema: "${input.topic}"
Descripción: "${input.description}"

⚠️ IMPORTANTE: 
- Genera SOLO bloques estructurados con TEXTO PLANO. NO uses HTML.
- USA ÚNICAMENTE los tipos de bloques permitidos (ver lista abajo)
- NO inventes tipos nuevos como "heading1", "callout", "quote", etc.

TIPOS DE BLOQUES PERMITIDOS (USA SOLO ESTOS):
1. 'title' - Para títulos principales
2. 'subTitle' - Para subtítulos
3. 'paragraph' - Para párrafos normales
4. 'tip' - Para consejos y trucos
5. 'highlight' - Para resaltar información
6. 'info' - Para bloques informativos
7. 'summary' - Para resúmenes
8. 'example' - Para ejemplos
9. 'list' - Para listas (array de strings)
10. 'table' - Para tablas (objeto con headers y rows)
11. 'step' - Para pasos numerados
12. 'divider' - Para separadores visuales

ESTRUCTURA OBLIGATORIA (20-30 bloques):

1. TÍTULO ÉPICO (type: 'title', 'paragraph'):
   { "type": "title", "content": "🚀 Día ${input.day}: Título motivador" }
   { "type": "paragraph", "content": "Introducción energética..." }

2. INFORMACIÓN CLAVE (type: 'info'):
   { "type": "info", "content": "Objetivos del día..." }

3. TEORÍA (type: 'subTitle', 'paragraph', 'list'):
   { "type": "subTitle", "content": "Conceptos Fundamentales" }
   { "type": "paragraph", "content": "Explicación..." }
   { "type": "list", "content": ["Punto 1", "Punto 2"] }

4. TABLA (type: 'table'):
   { "type": "table", "content": { "headers": ["Col1", "Col2"], "rows": [["A", "B"]] } }

5. HACK DEL DÍA (type: 'tip'):
   { "type": "tip", "content": "💡 Truco importante..." }

6. PASOS (type: 'step'):
   { "type": "step", "content": "Paso 1: ..." }

7. CONCLUSIÓN (type: 'summary'):
   { "type": "summary", "content": "Resumen final..." }

REGLAS ESTRICTAS:
- USA SOLO los 12 tipos de bloques listados arriba
- NO uses: "heading1", "heading2", "callout", "quote" u otros
- TODO el contenido debe ser TEXTO PLANO (sin HTML, sin markdown)
- Usa emojis para dinamismo
- Mínimo 20-30 bloques
- Tono: Divertido, premium y profesional

🚨 GENERACIÓN DE CLASE AUDIO:
Al final del objeto, genera un campo "generatedClassText" que contenga un guion para una clase de audio de 2-3 minutos.
- Usa un español latino mexicano muy natural y carismático (ej: "¡Qué onda!", "fíjate bien", "está bien padre").
- No seas robótico. Explica el tema del día de forma conversacional y fluida.
- No abuses de los puntos suspensivos. Usa puntuación natural para que el discurso sea constante y ameno.
- Saluda al inicio y motiva al final.
`;

    const promptParts: any[] = [{ text: prompt }];
    if (input.guideDataUri) {
      promptParts.push({ media: { url: input.guideDataUri } });
    }

    const response = await ai.generate({
      model: 'googleai/gemini-2.5-flash',
      prompt: promptParts,
      output: { schema: DailyContentOutputSchema },
      config: { temperature: 0.8, maxOutputTokens: 16384 }
    });

    const output = response.output;
    if (!output) throw new Error('No se pudo generar el contenido del día.');

    // Add blocksJson for Firestore compatibility
    return {
      ...output,
      blocksJson: JSON.stringify(output.blocks),
      blocks: [] // Clear blocks array to avoid nested array issues in Firestore
    };
  }
);

export async function createDailyContent(input: z.infer<typeof DailyContentInputSchema>): Promise<DailyContent> {
  return await generateDailyContentFlow(input);
}
