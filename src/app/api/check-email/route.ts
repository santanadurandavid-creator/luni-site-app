import { NextRequest, NextResponse } from 'next/server';
import { initFirebaseAdmin } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    console.log('Checking email:', email);

    const { admin } = await initFirebaseAdmin();

    try {
      await admin.auth().getUserByEmail(email);
      console.log('User found for email:', email);
      return NextResponse.json({ exists: true });
    } catch (error: any) {
      console.log('Auth error details:', error.code, error.message);
      if (error.code === 'auth/user-not-found') {
        return NextResponse.json({ exists: false });
      }
            // For any other Firebase Auth error, return a 500 status
            console.error('Error fetching user by email:', error);
            return NextResponse.json({ error: 'Failed to check email availability', details: error.message }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Error in check-email:', error);
    console.error('Full error stack:', error.stack);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
