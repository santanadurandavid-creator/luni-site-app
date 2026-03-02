import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { processStudyPlanRequest } from '../process-logic';

export async function POST(req: NextRequest) {
    console.log('[request-study-plan] API called');

    try {
        const { userId, preferences, fcmToken } = await req.json();

        if (!userId || !preferences) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Get user's active area
        const userDoc = await adminDb.collection('users').doc(userId).get();
        const userData = userDoc.data();
        const examTypeRaw = userData?.examType;

        let userArea: number | null = null;

        if (typeof examTypeRaw === 'number') {
            userArea = examTypeRaw;
        } else if (typeof examTypeRaw === 'string') {
            const match = examTypeRaw.match(/Área\s+(\d+)/i);
            if (match) {
                userArea = parseInt(match[1]);
            } else {
                const parsed = parseInt(examTypeRaw);
                if (!isNaN(parsed)) userArea = parsed;
            }
        }

        console.log('[request-study-plan] User examType (raw):', examTypeRaw, 'parsed area:', userArea);

        if (!userArea || userArea < 1 || userArea > 4) {
            return NextResponse.json({
                error: 'NO_AREA_SELECTED',
                message: 'Debes seleccionar un área de estudio primero.'
            }, { status: 400 });
        }

        // Check if there are active guides available
        console.log('[request-study-plan] Checking for guides with area:', userArea);
        const guidesSnapshot = await adminDb.collection('guides')
            .where('isActive', '==', true)
            .where('area', '==', userArea)
            .get();

        console.log('[request-study-plan] Guides found:', guidesSnapshot.size);

        let hasValidGuides = false;
        if (!guidesSnapshot.empty) {
            guidesSnapshot.forEach((doc: any) => {
                const data = doc.data();
                if (data.content && data.content.trim().length > 0) {
                    hasValidGuides = true;
                }
            });
        }

        if (guidesSnapshot.empty || !hasValidGuides) {
            const errorMsg = guidesSnapshot.empty
                ? `No hay guías disponibles para el área ${userArea}.`
                : `Las guías del área ${userArea} no tienen contenido.`;

            return NextResponse.json({
                error: 'NO_GUIDES_AVAILABLE',
                message: errorMsg
            }, { status: 400 });
        }

        // Create plan request
        const requestRef = adminDb.collection('plan_requests').doc();
        await requestRef.set({
            userId,
            preferences,
            fcmToken: fcmToken || null,
            status: 'pending',
            createdAt: FieldValue.serverTimestamp()
        });

        console.log('[request-study-plan] Request created:', requestRef.id);

        // Start processing immediately in background (don't await)
        processStudyPlanRequest(requestRef.id, userId, preferences, fcmToken).catch((err: any) => {
            console.error('[request-study-plan] Background process error:', err);
        });

        return NextResponse.json({ success: true, requestId: requestRef.id });

    } catch (error: any) {
        console.error('[request-study-plan] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
