import { adminDb, adminMessaging } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';

export const firebaseAdmin = admin;
export const firestore = adminDb;
export const messaging = adminMessaging;