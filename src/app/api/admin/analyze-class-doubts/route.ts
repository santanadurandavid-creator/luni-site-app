import { NextRequest, NextResponse } from 'next/server';
import { ai } from '@/ai/genkit';

export async function POST(request: NextRequest) {
    try {
        const { classId, classTitle, messages } = await request.json();

        if (!messages || messages.length === 0) {
            return NextResponse.json(
                { success: false, error: 'No hay mensajes para analizar' },
                { status: 400 }
            );
        }

        // Preparar el contexto de mensajes
        const messagesText = messages
            .map((m: { userName: string; message: string }) => `${m.userName}: ${m.message}`)
            .join('\n');

        const prompt = `Eres un asistente educativo experto. Analiza los siguientes mensajes de chat de una clase en vivo titulada "${classTitle}".

Mensajes del chat:
${messagesText}

Tu tarea es identificar las 5 dudas o preguntas más comunes o importantes que tienen los estudiantes basándote en los mensajes del chat.

Reglas:
1. Identifica EXACTAMENTE 5 dudas (ni más ni menos)
2. Prioriza dudas que se repiten o son fundamentales para entender el tema
3. Ignora mensajes irrelevantes (saludos, comentarios sueltos, etc.)
4. Cada duda debe ser clara y concisa
5. Redacta las dudas de forma que reflejen la pregunta o confusión del estudiante

Formato de respuesta:
Devuelve SOLO un array JSON con las 5 dudas, sin texto adicional.

Ejemplo de respuesta esperada:
["¿Cómo se calcula el área de un círculo?", "¿Cuál es la diferencia entre radio y diámetro?", "¿Por qué usamos π en la fórmula?", "¿Cómo se aplica esta fórmula en problemas reales?", "¿Qué pasa si el radio está en metros pero quiero el área en centímetros?"]

Si no hay suficientes dudas válidas, genera dudas sobre los temas que podrían tener los estudiantes basándote en el contexto de los mensajes.`;

        const result = await ai.generate({
            model: 'googleai/gemini-2.0-flash-exp',
            prompt: prompt,
            config: {
                temperature: 0.7,
                maxOutputTokens: 1000
            }
        });

        let doubts: string[] = [];

        try {
            // Limpiartexto de markdown si existe
            let responseText = result.text.trim();
            responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

            doubts = JSON.parse(responseText);

            // Validar que sean exactamente 5
            if (!Array.isArray(doubts) || doubts.length !== 5) {
                throw new Error('El formato no es válido');
            }
        } catch (parseError) {
            console.error('Error parsing AI response:', parseError);

            // Fallback: extraer dudas manualmente del texto
            const lines = result.text.split('\n').filter(line => line.trim().length > 0);
            doubts = lines
                .filter(line => line.includes('?') || line.match(/^\d+\./))
                .map(line => line.replace(/^\d+\.\s*/, '').replace(/^["']|["']$/g, '').trim())
                .slice(0, 5);

            // Si aún no tenemos 5, rellenar con mensaje genérico
            while (doubts.length < 5) {
                doubts.push('No se pudieron identificar más dudas específicas en los mensajes del chat.');
            }
        }

        return NextResponse.json({
            success: true,
            doubts: doubts,
            totalMessages: messages.length
        });

    } catch (error) {
        console.error('Error analyzing class doubts:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Error desconocido'
            },
            { status: 500 }
        );
    }
}
