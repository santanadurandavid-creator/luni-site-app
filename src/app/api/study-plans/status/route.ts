import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const requestId = searchParams.get('requestId');

    if (!requestId) {
        return NextResponse.json({ error: 'Missing requestId' }, { status: 400 });
    }

    try {
        const doc = await adminDb.collection('plan_requests').doc(requestId).get();
        if (!doc.exists) {
            return NextResponse.json({ error: 'Request not found' }, { status: 404 });
        }

        const data = doc.data();
        return NextResponse.json({
            status: data?.status,
            error: data?.error
        });

    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
