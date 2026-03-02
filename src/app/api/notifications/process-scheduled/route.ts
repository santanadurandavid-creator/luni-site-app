import { NextRequest, NextResponse } from 'next/server';
import { adminDb as firestore, adminMessaging as messaging } from '@/lib/firebase-admin';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const now = Timestamp.now();
    const scheduledNotificationsRef = firestore.collection('scheduled_notifications');
    const query = scheduledNotificationsRef.where('scheduledTime', '<=', now).where('status', '==', 'scheduled');

    const snapshot = await query.get();

    if (snapshot.empty) {
      return NextResponse.json({ message: 'No scheduled notifications to process' });
    }

    const promises = snapshot.docs.map(async (doc: any) => {
      const notification = doc.data();
      const { title, description, imageUrl, url, recipientIds } = notification;

      const usersRef = firestore.collection('users');
      const userTokens = await getFcmTokens(usersRef, recipientIds);

      const uniqueTokens = [...new Set(userTokens)];

      if (uniqueTokens.length > 0) {
        const tokenBatches = chunkArray(uniqueTokens, 500);

        for (const batch of tokenBatches) {
          const message = {
            notification: { title, body: description },
            webpush: {
              notification: {
                icon: imageUrl || '/icon-192x192.png',
                badge: '/icon-192x192.png',
                ...(imageUrl && { image: imageUrl }),
                requireInteraction: true,
              },
              fcmOptions: {
                link: url || '/',
              },
            },
            data: {
              url: url || '',
              imageUrl: imageUrl || '',
              clickAction: url || '',
            },
            tokens: batch,
          };

          await messaging.sendEachForMulticast(message);
        }
      }

      return doc.ref.update({ status: 'sent', processedAt: FieldValue.serverTimestamp() });
    });

    await Promise.all(promises);

    return NextResponse.json({ message: `Processed ${snapshot.size} scheduled notifications` });

  } catch (error: any) {
    console.error('Error processing scheduled notifications:', error);
    return NextResponse.json({ error: 'Failed to process scheduled notifications', message: error.message || error.toString() }, { status: 500 });
  }
}

async function getFcmTokens(usersRef: any, recipientIds?: string[]): Promise<string[]> {
  const tokens: string[] = [];
  let querySnapshots: any[] = [];

  if (recipientIds && recipientIds.length > 0) {
    const idChunks = chunkArray(recipientIds, 10);
    for (const chunk of idChunks) {
      const query = usersRef.where('__name__', 'in', chunk);
      const snapshot = await query.get();
      querySnapshots.push(...snapshot.docs);
    }
  } else {
    const snapshot = await usersRef.get();
    querySnapshots = snapshot.docs;
  }

  for (const doc of querySnapshots) {
    const userData = doc.data();
    const shouldAddToken = recipientIds || !userData.isAdmin;
    if (userData.fcmToken && shouldAddToken) {
      tokens.push(userData.fcmToken);
    }
  }

  return tokens;
}

function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}
