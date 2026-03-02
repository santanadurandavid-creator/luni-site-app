import { NextRequest, NextResponse } from 'next/server';
import { initFirebaseAdmin } from '@/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

export async function POST(request: NextRequest) {
  const { admin, firestore } = await initFirebaseAdmin();
  const db = firestore;

  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Get user by email using admin
    const userRecord = await admin.auth().getUserByEmail(email);

    if (!userRecord.emailVerified) {
      // Check last resend timestamp from Firestore
      const userDocRef = db.collection('users').doc(userRecord.uid);
      const userDoc = await userDocRef.get();
      let lastResendTimestamp = null;

      if (userDoc.exists) {
        const userData = userDoc.data();
        lastResendTimestamp = userData?.lastEmailResendTimestamp || null;
      }

      return NextResponse.json({
        success: true,
        unverified: true,
        lastResendTimestamp: lastResendTimestamp,
        message: 'Account exists but is not verified. Verification email can be resent.'
      });
    } else {
      return NextResponse.json({
        success: false,
        unverified: false,
        message: 'Account is already verified.'
      });
    }
  } catch (error: any) {
    if (error.code === 'auth/user-not-found') {
      return NextResponse.json({
        success: false,
        unverified: false,
        message: 'No account found with this email.'
      });
    }
    console.error('Error in resend-verification:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const { admin, firestore } = await initFirebaseAdmin();
  const db = firestore;

  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Get user by email using admin
    const userRecord = await admin.auth().getUserByEmail(email);

    // Update last resend timestamp in Firestore
    const userDocRef = db.collection('users').doc(userRecord.uid);
    await userDocRef.update({
      lastEmailResendTimestamp: Date.now()
    });

    return NextResponse.json({
      success: true,
      message: 'Resend timestamp updated.'
    });
  } catch (error: any) {
    console.error('Error updating resend timestamp:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
