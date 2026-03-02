import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(req: NextRequest) {
    try {
        console.log('[guides/process] Starting...');
        const { title, description, area, pdfUrl, createdBy } = await req.json();
        console.log('[guides/process] Received:', { title, area, pdfUrl, createdBy });

        if (!title || !pdfUrl || !createdBy || !area) {
            console.error('[guides/process] Missing fields:', { title: !!title, pdfUrl: !!pdfUrl, createdBy: !!createdBy, area: !!area });
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        console.log(`[guides/process] Processing guide: ${title} for area ${area}`);

        // Verify PDF is accessible
        console.log('[guides/process] Verifying PDF...');
        const response = await fetch(pdfUrl, { method: 'HEAD' });
        if (!response.ok) {
            throw new Error(`Failed to access PDF: ${response.statusText}`);
        }
        console.log('[guides/process] PDF verified successfully');

        // Save to Firestore
        console.log('[guides/process] Saving to Firestore...');
        const guideRef = adminDb.collection('guides').doc();
        await guideRef.set({
            id: guideRef.id,
            title,
            description: description || '',
            area, // Area 1, 2, 3, or 4
            pdfUrl,
            topics: [], // Will be populated when needed
            isActive: true,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
            createdBy
        });
        console.log('[guides/process] Saved successfully with ID:', guideRef.id);

        return NextResponse.json({
            success: true,
            guideId: guideRef.id,
            message: 'Guía guardada exitosamente. Los temas se extraerán cuando se genere un plan de estudio.'
        });

    } catch (error: any) {
        console.error('[guides/process] Error:', error);
        console.error('[guides/process] Error stack:', error.stack);
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
