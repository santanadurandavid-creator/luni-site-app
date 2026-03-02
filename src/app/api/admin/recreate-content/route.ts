import { NextRequest, NextResponse } from 'next/server';
import { createContentForQuestion } from '@/ai/flows/bulk-content-generation-flow';
import { getAdminFirestore, initFirebaseAdmin } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(request: NextRequest) {
    try {
        const { contentId, feedback } = await request.json();

        if (!contentId) {
            return NextResponse.json({ error: 'Content ID es requerido' }, { status: 400 });
        }

        // Initialize Firebase Admin
        await initFirebaseAdmin();
        const db = getAdminFirestore();

        // Get the existing content
        const contentDoc = await db.collection('content').doc(contentId).get();

        if (!contentDoc.exists) {
            return NextResponse.json({ error: 'Contenido no encontrado' }, { status: 404 });
        }

        const existingContent = contentDoc.data();

        if (!existingContent?.generationMetadata) {
            return NextResponse.json({
                error: 'Este contenido no tiene metadata de generación. Solo se puede recrear contenido generado por IA.'
            }, { status: 400 });
        }

        const metadata = existingContent.generationMetadata || {};

        // Fallback calculations for missing metadata
        const area = metadata.area || existingContent.category || 'General';
        const subjectName = metadata.subjectName || existingContent.subject || 'General';
        const questionText = metadata.questionText || existingContent.sourceQuestion || existingContent.title || '';
        const options = metadata.options || [];
        const correctAnswer = metadata.correctAnswer || '';
        const questionNumber = metadata.questionNumber || '1';

        // Regenerate the content using the stored metadata or fallbacks
        const newContent = await createContentForQuestion({
            area: String(area),
            subjectName: String(subjectName),
            questionText: String(questionText),
            questionImageUrl: metadata.questionImageUrl || null,
            options: Array.isArray(options) ? options : [],
            correctAnswer: String(correctAnswer),
            questionNumber: String(questionNumber),
            feedback: feedback
        });

        // Sanitizar datos para evitar undefined
        const sanitizeData = (obj: any): any => {
            if (obj === null || obj === undefined) return null;
            if (typeof obj !== 'object') return obj;
            if (Array.isArray(obj)) return obj.map(sanitizeData);

            const sanitized: any = {};
            Object.keys(obj).forEach(key => {
                const value = obj[key];
                if (value !== undefined) {
                    sanitized[key] = sanitizeData(value);
                }
            });
            return sanitized;
        };

        const updateData = sanitizeData({
            title: newContent.reading.title,
            interactiveContent: {
                splashTitle: newContent.reading.title,
                splashBackgroundImageUrl: existingContent.imageUrl || '',
                explanatory: {
                    title: newContent.reading.explanatoryTitle,
                    htmlContent: '',
                    blocksJson: JSON.stringify(newContent.reading.blocks || []),
                    blocks: []
                },
                linkedQuizId: existingContent.interactiveContent?.linkedQuizId || '',
                linkedVideoId: existingContent.interactiveContent?.linkedVideoId || '',
                linkedPodcastId: existingContent.interactiveContent?.linkedPodcastId || ''
            },
            updatedAt: FieldValue.serverTimestamp()
        });

        // Update the existing content document
        await db.collection('content').doc(contentId).update(updateData);

        return NextResponse.json({
            success: true,
            message: 'Contenido recreado exitosamente'
        });

    } catch (error: any) {
        console.error('Error recreating content:', error);

        let errorMessage = error.message || 'Error al recrear contenido';
        if (errorMessage.includes('503') || errorMessage.includes('Overloaded')) {
            errorMessage = 'Servidores de IA sobrecargados. Intenta de nuevo más tarde.';
        } else if (errorMessage.includes('429') || errorMessage.includes('Quota')) {
            errorMessage = 'Límite de cuota de IA excedido. Espera unos minutos.';
        } else if (errorMessage.includes('safety') || errorMessage.includes('blocked')) {
            errorMessage = 'El contenido fue bloqueado por los filtros de seguridad de la IA.';
        }

        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
