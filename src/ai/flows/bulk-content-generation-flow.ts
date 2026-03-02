'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';

// Input schema for a single question generation
const SingleQuestionInputSchema = z.object({
  area: z.string(),
  subjectName: z.string(),
  questionText: z.string(),
  questionImageUrl: z.string().nullable().optional(),
  options: z.array(z.string()),
  correctAnswer: z.string(),
  questionNumber: z.string(),
  feedback: z.string().optional(),
  readingText: z.string().optional(),
  requiresReading: z.boolean().optional(),
});

const QuizQuestionSchema = z.object({
  id: z.string(),
  question: z.string(),
  questionImageUrl: z.string().nullable().optional(),
  options: z.array(z.object({
    id: z.string(),
    text: z.string(),
    imageUrl: z.string().nullable().optional(),
    isCorrect: z.boolean(),
  })),
});

const ContentBlockSchema = z.object({
  type: z.enum(['title', 'subTitle', 'paragraph', 'tip', 'highlight', 'image', 'example', 'summary', 'list', 'table', 'step', 'divider', 'info', 'question']),
  content: z.union([
    z.string(),
    z.array(z.string()),
    z.object({
      headers: z.array(z.string()),
      rows: z.array(z.array(z.string()))
    })
  ]),
});

const ReadingContentSchema = z.object({
  title: z.string(),
  subject: z.string(),
  explanatoryTitle: z.string(),
  blocks: z.array(ContentBlockSchema),
});

const QuizContentSchema = z.object({
  title: z.string(),
  subject: z.string(),
  questions: z.array(QuizQuestionSchema),
});

const SingleQuestionOutputSchema = z.object({
  reading: ReadingContentSchema,
  quizzes: z.array(QuizContentSchema),
});

export type SingleQuestionOutput = z.infer<typeof SingleQuestionOutputSchema>;

// --- STEP 1: READING CONTENT GENERATION ---
const ReadingContentOutputSchema = z.object({
  reading: ReadingContentSchema
});

const generateReadingContentFlow = ai.defineFlow(
  {
    name: 'generateReadingContentFlow',
    inputSchema: SingleQuestionInputSchema,
    outputSchema: ReadingContentOutputSchema,
  },
  async (input) => {
    const prompt = `
Eres un diseñador de contenido educativo de élite. Crea una lección VISUALMENTE IMPACTANTE y SUPER ATRACTIVA.

DATOS DEL REACTIVO:
- ÁREA: ${input.area}
- MATERIA: ${input.subjectName}
- PREGUNTA: "${input.questionText}"
- OPCIONES: ${input.options.map((opt, i) => `${String.fromCharCode(65 + i)}) ${opt}`).join(', ')}
- RESPUESTA CORRECTA: ${input.correctAnswer}
${input.requiresReading && input.readingText ? `\n🔴🔴 LECTURA NECESARIA PARA ESTA PREGUNTA:\n"""\n${input.readingText}\n"""\n⚠️ ESTA PREGUNTA ES DE COMPRENSIÓN LECTORA. LA EXPLICACIÓN DEBE CENTRARSE EN ANALIZAR EL TEXTO PROPORCIONADO.\n` : ''}
${input.questionImageUrl ? `\n🔴 IMPORTANTE: Esta pregunta incluye una IMAGEN/GRÁFICO esencial. URL: ${input.questionImageUrl}\n⚠️ DEBES incluir un bloque de tipo 'image' con esta URL justo después de mostrar la pregunta.\n` : ''}
${input.feedback ? `\n🚨 AJUSTES SOLICITADOS (FEEDBACK): ${input.feedback}\n` : ''}

⚠️ REGLAS ESTRICTAS:
- USA SOLO los 13 tipos de bloques permitidos
- TODO debe ser TEXTO PLANO (sin HTML, sin markdown, sin negritas con **, sin cursivas con *, sin enlaces)
- Usa EMOJIS abundantes para hacer el contenido visual y atractivo
- Sé EXTENSO: mínimo 30-40 bloques
- Usa MUCHOS bloques 'tip', 'highlight', 'info' para hacer el contenido dinámico
- En la sección "Resolviendo Paso a Paso", los bloques 'step' DEBEN empezar siempre desde 1 (1️⃣ Paso 1, 2️⃣ Paso 2, etc.) y NUNCA usar el número de reactivo ni continuar numeraciones previas.
${input.questionImageUrl ? `\n🔴🔴🔴 CRÍTICO: Esta pregunta tiene una IMAGEN/GRÁFICO esencial (URL: ${input.questionImageUrl})\n⚠️ DEBES incluir un bloque: { "type": "image", "content": "${input.questionImageUrl}" }\n⚠️ Colócalo INMEDIATAMENTE después del bloque "question"\n⚠️ NO OMITAS este bloque bajo ninguna circunstancia\n` : ''}

TIPOS DE BLOQUES (USA SOLO ESTOS 13):
1. 'title' - Títulos principales con emojis
2. 'subTitle' - Subtítulos con emojis
3. 'paragraph' - Párrafos explicativos
4. 'tip' - Consejos y trucos (USA MUCHOS)
5. 'highlight' - Información importante (USA MUCHOS)
6. 'info' - Bloques informativos (USA MUCHOS)
7. 'summary' - Resúmenes y conclusiones
8. 'example' - Ejemplos prácticos
9. 'list' - Listas (array de strings)
10. 'table' - Tablas comparativas
11. 'step' - Pasos numerados
12. 'divider' - Separadores visuales
13. 'question' - La pregunta del examen

ESTRUCTURA OBLIGATORIA (30-40 bloques):

1. INICIO ÉPICO (3-4 bloques):
   { "type": "title", "content": "Reactivo ${input.questionNumber}: [Título super motivador con emojis] 🚀" }
   { "type": "paragraph", "content": "Introducción enganchadora..." }
   { "type": "info", "content": "💡 Dato importante sobre este tema..." }

2. LA PREGUNTA ${input.questionImageUrl ? 'CON IMAGEN' : ''} (${input.questionImageUrl ? '2' : '1'} bloque${input.questionImageUrl ? 's' : ''}):
   { "type": "question", "content": "${input.questionText}" }${input.questionImageUrl ? `
   { "type": "image", "content": "${input.questionImageUrl}" } ⚠️ OBLIGATORIO - Esta es la imagen/gráfico de la pregunta` : ''}

3. CONTEXTO (2-3 bloques):
   { "type": "subTitle", "content": "📚 ¿De qué trata esto?" }
   { "type": "paragraph", "content": "Explicación..." }
   { "type": "highlight", "content": "⭐ Punto clave a recordar..." }

4. FUNDAMENTOS (8-10 bloques):
   { "type": "subTitle", "content": "🎯 Conceptos Fundamentales" }
   { "type": "paragraph", "content": "Explicación detallada..." }
   { "type": "list", "content": ["📌 Punto 1", "📌 Punto 2", "📌 Punto 3"] }
   { "type": "tip", "content": "💡 Truco: ..." }
   { "type": "example", "content": "📝 Ejemplo: ..." }
   { "type": "highlight", "content": "⚡ Importante: ..." }

5. TABLA COMPARATIVA (1 bloque):
   { "type": "table", "content": { "headers": ["Concepto", "Explicación"], "rows": [["A", "B"]] } }

6. TIPS Y TRUCOS (3-5 bloques):
   { "type": "subTitle", "content": "✨ Trucos para Dominar Esto" }
   { "type": "tip", "content": "🎯 Truco 1: ..." }
   { "type": "tip", "content": "🎯 Truco 2: ..." }
   { "type": "tip", "content": "🎯 Truco 3: ..." }

7. RESOLUCIÓN PASO A PASO (5-7 bloques):
   { "type": "subTitle", "content": "🔍 Resolviendo Paso a Paso" }
   { "type": "step", "content": "1️⃣ Paso 1: ..." } (RECUERDA: Siempre empezar en 1)
   { "type": "step", "content": "2️⃣ Paso 2: ..." }
   { "type": "step", "content": "3️⃣ Paso 3: ..." }
   { "type": "highlight", "content": "✅ Resultado: ..." }

8. RESPUESTA CORRECTA (2-3 bloques):
   { "type": "divider", "content": "" }
   { "type": "summary", "content": "🎉 La respuesta correcta es ${input.correctAnswer} porque..." }
   { "type": "info", "content": "💯 Explicación completa..." }

9. ANÁLISIS DE ERRORES (4-6 bloques):
   { "type": "subTitle", "content": "❌ ¿Por qué las otras opciones fallan?" }
   { "type": "highlight", "content": "🚫 Opción X: Razón..." }
   { "type": "highlight", "content": "🚫 Opción Y: Razón..." }

10. CIERRE MOTIVADOR (2-3 bloques):
    { "type": "divider", "content": "" }
    { "type": "summary", "content": "🌟 Resumen final..." }
    { "type": "title", "content": "💪 ¡Ahora dominas este tema!" }

FORMATO DE SALIDA JSON:
{
  "reading": {
    "title": "Reactivo ${input.questionNumber}: [Título del Tema con Emojis]",
    "subject": "${input.subjectName}",
    "explanatoryTitle": "Subtítulo explicativo",
    "blocks": [
      { "type": "title", "content": "texto con emojis" },
      { "type": "paragraph", "content": "texto plano" },
      { "type": "list", "content": ["item1", "item2"] },
      { "type": "table", "content": { "headers": [...], "rows": [[...]] } }
    ]
  }
}

RECUERDA:
- Usa MUCHOS emojis (🚀 💡 ⭐ 🎯 ✨ 🔍 ✅ ❌ 💯 etc.)
- Alterna tipos de bloques para variedad visual
- USA MUCHOS 'tip', 'highlight', 'info' para hacer el contenido dinámico
- TODO en texto plano, SIN HTML, SIN markdown
- Mínimo 30-40 bloques para contenido extenso y completo
`;

    const maxRetries = 3;
    let retryCount = 0;
    let response;

    const isValidImageUrl = (url: string | null | undefined): boolean => {
      if (!url) return false;
      return url.startsWith('http') || url.startsWith('data:image');
    };

    while (retryCount < maxRetries) {
      try {
        const promptConfig: any[] = [{ text: prompt }];

        // ✅ Incluir imagen si existe
        if (isValidImageUrl(input.questionImageUrl)) {
          const mediaUrl = input.questionImageUrl!;

          if (mediaUrl.startsWith('data:')) {
            const matches = mediaUrl.match(/^data:([^;]+);base64,(.+)$/);
            if (matches && matches.length === 3) {
              const mimeType = matches[1];
              promptConfig.push({
                media: {
                  contentType: mimeType,
                  url: mediaUrl
                }
              });
            }
          } else if (mediaUrl.startsWith('http')) {
            promptConfig.push({
              media: {
                contentType: 'image/jpeg',
                url: mediaUrl
              }
            });
          }
        }

        response = await ai.generate({
          model: 'googleai/gemini-2.5-flash',
          prompt: promptConfig,
          output: { schema: ReadingContentOutputSchema },
          config: { temperature: 0.85, maxOutputTokens: 16384 }
        });
        break;
      } catch (error: any) {
        if (error.status === 503 || error.message?.includes('503')) {
          retryCount++;
          await new Promise(resolve => setTimeout(resolve, 2000 * retryCount));
        } else {
          throw error;
        }
      }
    }

    if (!response || !response.output) throw new Error('Failed to generate reading content');
    return response.output;
  }
);

// --- STEP 2: QUIZ GENERATION ---
const QuizzesOutputSchema = z.object({
  quizzes: z.array(QuizContentSchema)
});

const generateQuizzesFlow = ai.defineFlow(
  {
    name: 'generateQuizzesFlow',
    inputSchema: SingleQuestionInputSchema,
    outputSchema: QuizzesOutputSchema,
  },
  async (input) => {
    const prompt = `
Genera 3 quizzes de 10 preguntas cada uno, BASADOS ESTRICTAMENTE en el tema y nivel de la siguiente pregunta de examen:

PREGUNTA BASE: "${input.questionText}"
RESPUESTA CORRECTA: "${input.correctAnswer}"
MATERIA: "${input.subjectName}"
ÁREA: "${input.area}"
${input.requiresReading && input.readingText ? `\n🔴 LECTURA BASE PARA ESTE QUIZ:\n"""\n${input.readingText}\n"""\n⚠️ ESTE QUIZ DEBE SER DE COMPRENSIÓN LECTORA BASADO EN EL TEXTO ARRIBA.\n` : ''}
${input.feedback ? `\n🚨 AJUSTES SOLICITADOS (FEEDBACK): ${input.feedback}\n` : ''}

INSTRUCCIONES CLAVE:
1. TÍTULO DEL QUIZ: Debe seguir estrictamente el formato "Reactivo ${input.questionNumber}: [Nombre del Tema]".
2. El objetivo es que el estudiante practique EXACTAMENTE el mismo concepto o tipo de problema que la "PREGUNTA BASE".
3. Las preguntas generadas deben ser VARIACIONES DIRECTAS de la pregunta base:
   - Si es un problema matemático/físico: Cambia los valores numéricos pero mantén la lógica y fórmulas necesarias.
   - Si es teórico: Pregunta sobre el mismo concepto desde ángulos ligeramente diferentes, o conceptos hermanos directos.
4. Mantén el MISMO NIVEL DE DIFICULTAD y TIPO DE LENGUAJE que la pregunta base.
5. Genera opciones de respuesta plausibles para cada pregunta.
6. Marca claramente la respuesta correcta.

REQUERIMIENTOS DE SALIDA:
- Genera 3 quizzes completos.
- Cada quiz debe tener 10 preguntas.
- Formato JSON estricto según el esquema.
`;
    const response = await ai.generate({
      model: 'googleai/gemini-2.5-flash',
      prompt: prompt,
      output: { schema: QuizzesOutputSchema },
      config: { temperature: 0.7 }
    });
    return response.output!;
  }
);

export async function createContentForQuestion(input: z.infer<typeof SingleQuestionInputSchema>): Promise<SingleQuestionOutput> {
  const readingResult = await generateReadingContentFlow(input);
  const quizzesResult = await generateQuizzesFlow(input);
  return { reading: readingResult.reading, quizzes: quizzesResult.quizzes };
}
