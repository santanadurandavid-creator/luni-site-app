import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { ContentCategory, DetectedSubject, GuideAnalysisResult } from '@/lib/types';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || process.env.gemini_api_key || '');

export async function POST(request: NextRequest) {
    try {
        const { text, area } = await request.json();

        if (!text || !area) {
            return NextResponse.json(
                { error: 'Se requiere el texto de la pregunta y el área' },
                { status: 400 }
            );
        }

        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

        const analysisPrompt = `Analiza esta pregunta de estudio para ${area}.

Tu tarea es:
1. Identificar la MATERIA específica de la pregunta (ej: Matemáticas, Física, Química, Biología, Historia de México, Historia Universal, Geografía, Literatura, Español, Filosofía).
2. Estructurar la pregunta correctamente (texto, opciones si las tiene).
3. 🔴 RESPUESTA CORRECTA: DEBES usar tu conocimiento para RESOLVER la pregunta y determinar cuál de las opciones es la correcta. Proporciónala siempre en el campo "answer".
4. 🔴 CRÍTICO: EXTRAER EL NÚMERO DE REACTIVO si aparece en el texto (ej: "45.", "102."). Si no hay, usa "1". Ponlo en el campo "originalIndex".
5. 🔴 OBLIGATORIO: El nombre de la materia DEBE ser uno de los estándar en ESPAÑOL.

Retorna ÚNICAMENTE un JSON válido con esta estructura exacta (sin markdown, sin explicaciones):
{
  "subjects": [
    {
      "name": "Nombre de la Materia",
      "questions": [
        {
          "originalIndex": "45",
          "text": "Texto completo de la pregunta...",
          "options": ["Opción A", "Opción B", "Opción C", "Opción D"],
          "answer": "Opción C" (o null si no se detecta)
        }
      ],
      "questionCount": 1
    }
  ],
  "totalQuestions": 1
}

PREGUNTA A ANALIZAR:
"""
${text}
"""`;

        const result = await model.generateContent(analysisPrompt);
        const response = result.response;
        const responseText = response.text();

        // Parse the JSON response
        let analysisData;
        try {
            const cleanedText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            analysisData = JSON.parse(cleanedText);
        } catch (parseError) {
            console.error('Error parsing AI response:', responseText);
            return NextResponse.json(
                { error: 'Error al analizar la respuesta de la IA' },
                { status: 500 }
            );
        }

        const processedSubjects: DetectedSubject[] = analysisData.subjects.map((subject: any, subjectIndex: number) => ({
            id: `subject-text-${subjectIndex}`,
            name: subject.name,
            questionCount: subject.questionCount,
            questions: subject.questions.map((q: any) => ({
                text: q.text,
                options: q.options || [],
                answer: q.answer || null,
                originalIndex: q.originalIndex || "1",
                selected: true,
            })),
            selected: true,
        }));

        const result_data: GuideAnalysisResult = {
            area: area as ContentCategory,
            subjects: processedSubjects,
            totalQuestions: analysisData.totalQuestions || 1,
        };

        return NextResponse.json(result_data);

    } catch (error: any) {
        console.error('Error analyzing text question:', error);
        return NextResponse.json(
            { error: error.message || 'Error al analizar la pregunta' },
            { status: 500 }
        );
    }
}
