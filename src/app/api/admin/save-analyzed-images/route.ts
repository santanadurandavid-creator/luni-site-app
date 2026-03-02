import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore, initFirebaseAdmin } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(request: NextRequest) {
    try {
        const { area, subjects, totalQuestions, userId } = await request.json();

        if (!area || !subjects || !totalQuestions) {
            return NextResponse.json(
                { error: 'Faltan datos requeridos' },
                { status: 400 }
            );
        }

        await initFirebaseAdmin();
        const db = getAdminFirestore();

        // Guardar el análisis en Firestore
        const docRef = await db.collection('analyzedImages').add({
            area,
            subjects,
            totalQuestions,
            createdAt: FieldValue.serverTimestamp(),
            createdBy: userId || 'admin',
        });

        return NextResponse.json({
            success: true,
            id: docRef.id,
            message: 'Análisis guardado correctamente'
        });

    } catch (error: any) {
        console.error('Error saving analysis:', error);
        return NextResponse.json(
            { error: error.message || 'Error al guardar el análisis' },
            { status: 500 }
        );
    }
}
