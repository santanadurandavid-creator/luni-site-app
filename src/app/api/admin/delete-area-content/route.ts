import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore, initFirebaseAdmin } from '@/lib/firebase-admin';
import type { ContentCategory } from '@/lib/types';

export async function POST(request: NextRequest) {
    try {
        const { area } = await request.json();

        // Initialize Firebase Admin
        await initFirebaseAdmin();

        if (!area) {
            return NextResponse.json(
                { error: 'Área es requerida' },
                { status: 400 }
            );
        }

        const db = getAdminFirestore();

        // Query all AI-generated content for this area
        const snapshot = await db.collection('content')
            .where('category', '==', area as ContentCategory)
            .where('isAIGenerated', '==', true)
            .get();

        if (snapshot.empty) {
            return NextResponse.json({
                success: true,
                deletedCount: 0,
            });
        }

        // Delete documents in batches (max 500 per batch)
        const batch = db.batch();
        const backupBatch = db.batch();
        let count = 0;

        snapshot.docs.forEach((docSnap: any) => {
            // Backup
            const backupRef = db.collection('content_backups').doc();
            backupBatch.set(backupRef, {
                ...docSnap.data(),
                originalId: docSnap.id,
                backupType: 'area_mass_delete',
                backedUpAt: new Date(), // Using JS Date for simplicity, or admin.firestore.FieldValue.serverTimestamp() if imported
            });

            // Delete
            batch.delete(docSnap.ref);
            count++;
        });

        await backupBatch.commit();
        await batch.commit();

        return NextResponse.json({
            success: true,
            deletedCount: count,
        });

    } catch (error: any) {
        console.error('Error deleting area content:', error);
        return NextResponse.json(
            { error: error.message || 'Error al eliminar contenido' },
            { status: 500 }
        );
    }
}
