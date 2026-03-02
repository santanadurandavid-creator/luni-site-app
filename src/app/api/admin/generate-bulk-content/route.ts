import { NextRequest, NextResponse } from 'next/server';
import { createContentForQuestion } from '@/ai/flows/bulk-content-generation-flow';
import { getAdminFirestore, initFirebaseAdmin } from '@/lib/firebase-admin';
import { v4 as uuidv4 } from 'uuid';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(request: NextRequest) {
    try {
        const { area, imageDataUris, coverImageUrl, selectedSubjects, readingText, textQuestion } = await request.json();

        await initFirebaseAdmin();

        if (!area || !selectedSubjects || !Array.isArray(selectedSubjects) || selectedSubjects.length === 0) {
            return NextResponse.json({ error: 'Área y materias seleccionadas son requeridos' }, { status: 400 });
        }

        const encoder = new TextEncoder();
        const stream = new ReadableStream({
            async start(controller) {
                let isClosed = false;
                try {
                    const batchId = uuidv4();
                    const db = getAdminFirestore();

                    let totalQuestions = 0;
                    selectedSubjects.forEach((s: any) => {
                        // Use actual selected questions count
                        if (s.questions && s.questions.length > 0) {
                            totalQuestions += s.questions.length;
                        } else if (textQuestion) {
                            // Fallback only if no questions detected
                            totalQuestions += 1;
                        }
                    });

                    controller.enqueue(
                        encoder.encode(
                            `data: ${JSON.stringify({ progress: 0, currentItem: `Iniciando generación para ${totalQuestions} preguntas...` })}\n\n`
                        )
                    );

                    let processedQuestions = 0;

                    for (const subject of selectedSubjects) {
                        // Determine which questions to process for this subject
                        let questionsToProcess = [];

                        if (subject.questions && subject.questions.length > 0) {
                            // Use the actual selected questions
                            questionsToProcess = subject.questions;
                        } else if (textQuestion) {
                            // Fallback if no questions detected but text exists
                            questionsToProcess = [{
                                text: textQuestion,
                                originalIndex: 1,
                                requiresReading: false
                            }];
                        }

                        for (const question of questionsToProcess) {
                            if (isClosed) break;

                            processedQuestions++;
                            const progress = Math.floor((processedQuestions / totalQuestions) * 100);

                            try {
                                controller.enqueue(
                                    encoder.encode(
                                        `data: ${JSON.stringify({
                                            progress,
                                            currentItem: `Generando contenido ${processedQuestions}/${totalQuestions}: ${subject.name}`
                                        })}\n\n`
                                    )
                                );
                            } catch (e) {
                                isClosed = true;
                                break;
                            }

                            try {
                                // DETECCIÓN INTELIGENTE DEL NÚMERO DE REACTIVO
                                // ... rest of the logic
                                let qNum = String(question.originalIndex || processedQuestions);
                                if (question.text && typeof question.text === 'string') {
                                    const match = question.text.match(/^(\d+)[\.\-\)\s]/);
                                    if (match && match[1]) {
                                        qNum = match[1];
                                    }
                                }

                                // Generar contenido
                                const content = await createContentForQuestion({
                                    area,
                                    subjectName: subject.name,
                                    questionText: question.text,
                                    questionImageUrl: question.imageUrl || undefined, // ✅ Usar la imagen extraída
                                    options: question.options || [],
                                    correctAnswer: question.answer || '',
                                    questionNumber: qNum,
                                    readingText: readingText || '', // Pass global reading text
                                    requiresReading: question.requiresReading || false // Pass question specific flag
                                });

                                // FORZAR FORMATO DE TÍTULO "Reactivo N: [Tema]"
                                const titlePrefix = `Reactivo ${qNum}`;

                                // 1. Título de lectura
                                if (content.reading.title && !content.reading.title.toLowerCase().includes('reactivo')) {
                                    content.reading.title = `${titlePrefix}: ${content.reading.title}`;
                                } else if (content.reading.title && !content.reading.title.includes(qNum)) {
                                    // Si dice "Reactivo" pero no el número correcto
                                    content.reading.title = content.reading.title.replace(/Reactivo \d+/, titlePrefix);
                                }

                                // 2. Títulos de quizzes
                                if (content.quizzes) {
                                    content.quizzes.forEach(q => {
                                        if (q.title && !q.title.toLowerCase().includes('reactivo')) {
                                            q.title = `${titlePrefix}: ${q.title}`;
                                        }
                                    });
                                }

                                // 1. Construir Bloques Limpios
                                const blocks = (content.reading.blocks || []).map((block: any) => {
                                    if (!block || !block.type) return null;

                                    const cleanBlock: any = {
                                        type: String(block.type)
                                    };

                                    // Manejo específico por tipo para asegurar primitivos
                                    if (block.type === 'list') {
                                        cleanBlock.content = Array.isArray(block.content)
                                            ? block.content.map((i: any) => String(i || ''))
                                            : [];
                                    } else if (block.type === 'table') {
                                        const headers = Array.isArray(block.content?.headers)
                                            ? block.content.headers.map((h: any) => String(h || ''))
                                            : [];
                                        const rows = Array.isArray(block.content?.rows)
                                            ? block.content.rows.map((row: any) =>
                                                Array.isArray(row) ? row.map((c: any) => String(c || '')) : []
                                            )
                                            : [];
                                        cleanBlock.content = { headers, rows };
                                    } else {
                                        cleanBlock.content = String(block.content || '');
                                    }

                                    return cleanBlock;
                                }).filter((b: any) => b !== null);

                                // 2. Construir Documento Base (Plain Object)
                                const docBase = {
                                    title: String(content.reading.title || 'Contenido'),
                                    subject: String(subject.name || ''),
                                    type: 'content',
                                    category: String(area),
                                    accessLevel: 'free',
                                    imageUrl: String(coverImageUrl || ''),
                                    interactiveContent: {
                                        splashTitle: String(content.reading.title || 'Contenido'),
                                        splashBackgroundImageUrl: String(coverImageUrl || ''),
                                        explanatory: {
                                            title: String(content.reading.title || 'Explicación'),
                                            htmlContent: '',
                                            // GUARDAR COMO STRING JSON PARA EVITAR ERRORES DE FIRESTORE
                                            // El renderer deberá hacer JSON.parse si es string
                                            blocksJson: JSON.stringify(blocks),
                                            blocks: [] // Mantener array vacío por compatibilidad type
                                        },
                                        linkedQuizId: '',
                                        linkedVideoId: '',
                                        linkedPodcastId: ''
                                    },
                                    views: 0,
                                    isAIGenerated: true,
                                    generationBatchId: String(batchId),
                                    sourceQuestion: String(question.text || ''),
                                    generationMetadata: { // Agregar metadata plana útil para recreación
                                        area: String(area),
                                        subjectName: String(subject.name || ''),
                                        questionText: String(question.text || ''),
                                        options: question.options || [],
                                        correctAnswer: String(question.answer || ''),
                                        questionNumber: String(qNum),
                                        questionImageUrl: question.imageUrl || undefined, // ✅ Guardar URL de imagen
                                        requiresReading: question.requiresReading || false,
                                        sourceReadingText: question.requiresReading ? (readingText || '') : ''
                                    }
                                };

                                // 3. Serializar y Deserializar para eliminar referencias, undefined, clases, etc.
                                const cleanDoc = JSON.parse(JSON.stringify(docBase));

                                // 4. Agregar Timestamp (que no es compatible con JSON)
                                cleanDoc.createdAt = FieldValue.serverTimestamp();

                                // Guardar
                                await db.collection('content').add(cleanDoc);

                                // Guardar quizzes (misma lógica de limpieza)
                                if (content.quizzes && Array.isArray(content.quizzes)) {
                                    for (const quiz of content.quizzes) {
                                        if (!quiz || !quiz.questions) continue;

                                        const quizBase = {
                                            title: String(quiz.title || 'Quiz'),
                                            subject: String(subject.name || ''),
                                            type: 'quiz',
                                            category: String(area),
                                            accessLevel: 'free',
                                            imageUrl: String(coverImageUrl || ''),
                                            quizDetails: {
                                                questions: quiz.questions, // Asumimos estructura simple
                                                backgroundColor: '#FFFFFF',
                                                textColor: '#000000',
                                                backgroundImageUrl: '',
                                                backgroundImageOpacity: 0.2
                                            },
                                            views: 0,
                                            isAIGenerated: true,
                                            generationBatchId: String(batchId),
                                            sourceQuestion: String(question.text || '')
                                        };

                                        const cleanQuiz = JSON.parse(JSON.stringify(quizBase));
                                        cleanQuiz.createdAt = FieldValue.serverTimestamp();

                                        await db.collection('content').add(cleanQuiz);
                                    }
                                }
                            } catch (err: any) {
                                console.error(`Error generando contenido:`, err);

                                let friendlyMessage = err.message || 'Error desconocido';
                                if (friendlyMessage.includes('quota') || friendlyMessage.includes('429')) {
                                    friendlyMessage = 'Límite de cuota de IA alcanzado. Por favor, espera unos minutos antes de continuar.';
                                } else if (friendlyMessage.includes('overloaded') || friendlyMessage.includes('503')) {
                                    friendlyMessage = 'El servidor de IA está sobrecargado. Reintentando automáticamente en breve...';
                                } else if (friendlyMessage.includes('safety') || friendlyMessage.includes('blocked')) {
                                    friendlyMessage = 'El contenido fue bloqueado por los filtros de seguridad de la IA.';
                                }

                                if (!isClosed) {
                                    try {
                                        controller.enqueue(
                                            encoder.encode(
                                                `data: ${JSON.stringify({
                                                    progress,
                                                    currentItem: `Error: ${friendlyMessage}`,
                                                    error: friendlyMessage
                                                })}\n\n`
                                            )
                                        );
                                    } catch (e) {
                                        isClosed = true;
                                    }
                                }
                            }
                        }
                        if (isClosed) break;
                    }

                    if (!isClosed) {
                        try {
                            controller.enqueue(
                                encoder.encode(
                                    `data: ${JSON.stringify({
                                        progress: 100,
                                        currentItem: 'Completado',
                                        completed: true,
                                        totalItems: processedQuestions * 4 // 1 reading + 3 quizzes
                                    })}\n\n`
                                )
                            );
                        } catch (e) { }
                    }
                    if (!isClosed) {
                        controller.close();
                    }
                } catch (error: any) {
                    console.error('Error en generación:', error);
                    let friendlyMessage = error.message || 'Error crítico en la generación';
                    if (friendlyMessage.includes('quota') || friendlyMessage.includes('429')) {
                        friendlyMessage = 'Límite de cuota de IA alcanzado globalmente.';
                    }

                    if (!isClosed) {
                        try {
                            controller.enqueue(
                                encoder.encode(
                                    `data: ${JSON.stringify({ error: friendlyMessage })}\n\n`
                                )
                            );
                            controller.close();
                        } catch (e) { }
                    }
                }
            }
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                Connection: 'keep-alive'
            }
        });
    } catch (error: any) {
        console.error('Error en API:', error);
        return NextResponse.json({ error: error.message || 'Error al generar contenido' }, { status: 500 });
    }
}
