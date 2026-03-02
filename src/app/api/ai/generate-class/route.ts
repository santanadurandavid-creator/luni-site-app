
import { ai } from '@/ai/genkit';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const ClassOutputSchema = z.object({
    classText: z.string(),
});

export async function POST(req: Request) {
    try {
        const { contentBlocks, title } = await req.json();

        if (!contentBlocks || !Array.isArray(contentBlocks)) {
            return NextResponse.json({ error: 'Invalid content' }, { status: 400 });
        }

        const contentText = contentBlocks
            .map((block: any) => {
                if (typeof block.content === 'string') return block.content;
                if (Array.isArray(block.content)) return block.content.join('\n');
                return '';
            })
            .join('\n\n');

        const prompt = `
      Eres un profesor experto, dinámico y con mucha onda, originario de México. 
      Tu objetivo es grabar una "clase relámpago" auditiva sobre el siguiente contenido académico.
      
      CONTENIDO:
      Título: ${title}
      Texto: ${contentText}
      
      INSTRUCCIONES DE TONO Y ESTILO:
      1. Usa un español latino con acento mexicano natural. No seas formal ni robótico.
      2. Explica los conceptos de forma fluida y relajada, como si estuvieras platicando con un compa o grabando un podcast educativo premium.
      3. Usa expresiones naturales como "fíjate bien", "¿cómo la ves?", "está súper fácil", "ponle mucha atención a esto".
      4. No menciones "según el texto" o "el bloque dice". Di cosas como "Hoy nos toca ver...", "Algo que está bien padre es...", "Imagínatelo así...".
      5. Mantén la explicación concisa pero completa (máximo 2-3 minutos de habla).
      6. Enfócate en que el estudiante entienda el "por qué" de las cosas con ejemplos sencillos.
      7. Empieza con un saludo bien enérgico (ej: "¡Qué onda! ¿Cómo estás? Hoy vamos a darle con todo a...") y termina motivando al éxito.
      8. IMPORTANTE: Escribe de forma FLUIDA. No abuses de los puntos suspensivos. Usa comas y puntos de forma natural para que el discurso sea continuo pero comprensible. Imagina que el profesor está emocionado y habla con ritmo constante.
      
      Escribe el guion exacto que vas a decir. No incluyas acotaciones como [Pausa] o [Música]. Solo el texto que se va a leer.
    `;

        const aiResponse = await ai.generate({
            model: 'googleai/gemini-2.5-flash',
            prompt,
            output: { schema: ClassOutputSchema },
        });

        const output = aiResponse.output;

        if (!output?.classText) {
            throw new Error('No se pudo generar la clase');
        }

        return NextResponse.json({ classText: output.classText });
    } catch (error: any) {
        console.error('[GENERATE-CLASS-ERROR]:', error);
        return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
    }
}
