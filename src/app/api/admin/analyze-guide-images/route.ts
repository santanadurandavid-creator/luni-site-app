import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { ContentCategory, DetectedSubject, GuideAnalysisResult } from '@/lib/types';
import { initFirebaseAdmin } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || process.env.gemini_api_key || '');

export async function POST(request: NextRequest) {
    try {
        const { imageDataUris, area } = await request.json();

        if (!imageDataUris || !Array.isArray(imageDataUris) || imageDataUris.length === 0 || !area) {
            return NextResponse.json(
                { error: 'Se requieren imágenes de la guía y el área' },
                { status: 400 }
            );
        }

        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        const analysisPrompt = `Analiza estas imágenes de una guía de estudio para ${area}.

Tu tarea es:
1. Detectar TODAS las preguntas de examen que aparecen en las imágenes.
2. Identificar la MATERIA específica de cada pregunta (ej: Matemáticas, Física, Química, Biología, Historia, etc.).
3. Agrupar las preguntas por materia.
4. 🔴 CRÍTICO: Si una pregunta incluye una imagen, gráfico, diagrama, tabla o figura importante para responderla:
   - Marca "hasImage": true
   - Proporciona "imagePageIndex": el índice de la página (0-based) donde está la imagen
   - Proporciona "imageDescription": descripción breve de qué muestra la imagen
5. EXTRAER LAS OPCIONES DE RESPUESTA (A, B, C, D) y la RESPUESTA CORRECTA si está marcada.
6. 🔴 CRÍTICO: EXTRAER EL NÚMERO DE REACTIVO EXACTO QUE APARECE EN LA IMAGEN.
   - Las preguntas suelen empezar con un número (ej: "45. ¿Cuál es...?", "102. Calcula...").
   - DEBES extraer ese número ("45", "102") y ponerlo en el campo "originalIndex".
   - NO re-numeres desde 1. Usa el número REAL de la imagen.

IMPORTANTE:
- Busca preguntas que tengan formato de examen (opción múltiple, verdadero/falso, etc.).
- 🔴 DETECCIÓN DE MATERIA: Escanea las imágenes buscando títulos, encabezados o etiquetas que indiquen la materia (ej: "FISICA", "MATEMÁTICAS"). Si no hay un título explícito, infiere la materia basándote en palabras clave, conceptos y contexto de las preguntas.
- 🔴 OBLIGATORIO: Los nombres de las materias DEBEN ser en ESPAÑOL (ej: "Matemáticas", "Historia", "Geografía", "Física", "Química", "Biología", "Literatura", "Filosofía"). NO uses inglés.
- 🔴 RESPUESTA CORRECTA: Identifica si la respuesta está marcada (circulada, subrayada, negrita). Si NO está marcada, DEBES usar tu conocimiento para DETERMINAR cuál de las opciones es la correcta y proporcionarla en el campo "answer". No la dejes nula a menos que sea una pregunta abierta. 
- 🔴 MUY IMPORTANTE: Si una pregunta tiene un gráfico, diagrama, tabla, mapa, imagen o cualquier elemento visual necesario para responderla, DEBES marcar "hasImage": true.

Retorna ÚNICAMENTE un JSON válido con esta estructura exacta (sin markdown, sin explicaciones):
{
  "subjects": [
    {
      "name": "Nombre de la Materia",
      "questions": [
        {
          "originalIndex": "45", (OBLIGATORIO: El número EXACTO que inicia la pregunta en la imagen. Ej: "45", "102")
          "text": "Texto completo de la pregunta...",
          "hasImage": true, (true si la pregunta tiene gráfico/imagen/diagrama)
          "imagePageIndex": 0, (índice de la página donde está la imagen, 0-based)
          "imageDescription": "Gráfica de función cuadrática", (descripción breve)
          "options": ["Opción A", "Opción B", "Opción C", "Opción D"],
          "answer": "Opción C" (o null si no se detecta)
        },
        ...
      ],
      "questionCount": número
    }
  ],
  "totalQuestions": número_total
}`;

        // Prepare image parts for Gemini
        const imageParts = imageDataUris.map((uri: string) => {
            const base64Data = uri.split(',')[1];
            const mimeType = uri.split(';')[0].split(':')[1];
            return {
                inlineData: {
                    mimeType,
                    data: base64Data,
                },
            };
        });

        const result = await model.generateContent([
            ...imageParts,
            { text: analysisPrompt },
        ]);

        const response = result.response;
        const text = response.text();

        // Parse the JSON response
        let analysisData;
        try {
            // Remove markdown code blocks if present
            const cleanedText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            console.log("AI Raw Response:", cleanedText); // DEBUG LOG
            analysisData = JSON.parse(cleanedText);
            console.log("Parsed Analysis Data:", JSON.stringify(analysisData, null, 2)); // DEBUG LOG
        } catch (parseError) {
            console.error('Error parsing AI response:', text);
            return NextResponse.json(
                { error: 'Error al analizar la respuesta de la IA' },
                { status: 500 }
            );
        }

        // Process questions and extract images where needed
        await initFirebaseAdmin();

        const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'studio-5437783532-5f953.firebasestorage.app';
        console.log(`📦 Using storage bucket: ${bucketName}`);

        const bucket = admin.storage().bucket(bucketName);
        const processedSubjects: DetectedSubject[] = [];

        for (let subjectIndex = 0; subjectIndex < analysisData.subjects.length; subjectIndex++) {
            const subject = analysisData.subjects[subjectIndex];
            const processedQuestions = [];

            for (let qIndex = 0; qIndex < subject.questions.length; qIndex++) {
                const q = subject.questions[qIndex];
                let imageUrl = null;

                // If question has an image, extract and upload it
                if (q.hasImage && q.imagePageIndex !== undefined && q.imagePageIndex < imageDataUris.length) {
                    try {
                        console.log(`🔍 Extracting image for question ${q.originalIndex || qIndex}: ${q.imageDescription}`);

                        const pageImageUri = imageDataUris[q.imagePageIndex];

                        // Ask AI to confirm and validate the image
                        const extractionPrompt = `En esta imagen, identifica y describe EXACTAMENTE el elemento visual mencionado:

"${q.imageDescription}"

Esta imagen pertenece a la pregunta: "${q.text}"

Necesito que me confirmes:
1. ¿La imagen/gráfico/diagrama es ESENCIAL para responder la pregunta? (sin ella, la pregunta no se puede responder)
2. ¿Qué tipo de elemento visual es?
3. Descripción detallada de lo que muestra

Responde SOLO con un JSON válido (sin markdown):
{
  "isEssential": true/false,
  "visualType": "gráfico" | "diagrama" | "tabla" | "mapa" | "imagen" | "esquema",
  "description": "Descripción detallada de lo que muestra la imagen"
}`;

                        const extractionResult = await model.generateContent([
                            {
                                inlineData: {
                                    mimeType: pageImageUri.split(';')[0].split(':')[1],
                                    data: pageImageUri.split(',')[1],
                                },
                            },
                            { text: extractionPrompt },
                        ]);

                        const extractionText = extractionResult.response.text();
                        const cleanedExtractionText = extractionText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

                        let extractionData;
                        try {
                            extractionData = JSON.parse(cleanedExtractionText);
                            console.log(`📊 Extraction validation:`, extractionData);
                        } catch (e) {
                            console.warn('Could not parse extraction validation, assuming essential');
                            extractionData = { isEssential: true, visualType: 'gráfico', description: q.imageDescription };
                        }

                        // If the image is essential, upload it
                        if (extractionData.isEssential) {
                            const timestamp = Date.now();
                            const questionId = q.originalIndex || `${subjectIndex}-${qIndex}`;
                            const sanitizedSubjectName = subject.name.replace(/[^a-zA-Z0-9]/g, '_');
                            const sanitizedArea = area.replace(/[^a-zA-Z0-9]/g, '_');
                            const filePath = `question-images/${sanitizedArea}/${sanitizedSubjectName}/${questionId}_${timestamp}.jpg`;

                            // Convert data URI to buffer
                            const base64Data = pageImageUri.split(',')[1];
                            const buffer = Buffer.from(base64Data, 'base64');

                            // Upload to Firebase Storage using Admin SDK
                            const file = bucket.file(filePath);
                            await file.save(buffer, {
                                metadata: {
                                    contentType: 'image/jpeg',
                                },
                                public: true,
                            });

                            // Get public URL
                            imageUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;

                            console.log(`✅ Image uploaded successfully for question ${questionId}: ${imageUrl}`);
                        } else {
                            console.log(`⏭️  Skipping non-essential image for question ${q.originalIndex || qIndex}`);
                        }
                    } catch (uploadError) {
                        console.error(`❌ Error uploading image for question ${q.originalIndex || qIndex}:`, uploadError);
                        // Continue without image if upload fails
                    }
                }

                processedQuestions.push({
                    id: q.originalIndex ? `q-${q.originalIndex}` : undefined,
                    text: typeof q === 'string' ? q : q.text,
                    imageUrl: imageUrl,
                    options: q.options || [],
                    answer: q.answer || null,
                    originalIndex: q.originalIndex,
                    selected: true, // Default to selected
                });
            }

            processedSubjects.push({
                id: `subject-${subjectIndex}`,
                name: subject.name,
                questionCount: subject.questionCount || subject.questions.length,
                questions: processedQuestions,
                selected: true,
            });
        }

        const result_data: GuideAnalysisResult = {
            area: area as ContentCategory,
            subjects: processedSubjects,
            totalQuestions: analysisData.totalQuestions || processedSubjects.reduce((sum, s) => sum + s.questionCount, 0),
        };

        return NextResponse.json(result_data);

    } catch (error: any) {
        console.error('Error analyzing guide:', error);
        return NextResponse.json(
            { error: error.message || 'Error al analizar la guía' },
            { status: 500 }
        );
    }
}
