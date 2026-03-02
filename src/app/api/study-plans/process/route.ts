import { NextRequest, NextResponse } from 'next/server';
import { processStudyPlanRequest } from '../process-logic';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    console.log('[process-route] Called');

    try {
        const body = await req.json();
        const { requestId, userId, preferences, fcmToken } = body;

        if (!requestId || !userId || !preferences) {
            return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
        }

        // Call the processing logic directly
        await processStudyPlanRequest(requestId, userId, preferences, fcmToken);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('[process-route] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
