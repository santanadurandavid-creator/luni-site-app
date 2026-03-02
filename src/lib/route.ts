import { NextRequest, NextResponse } from 'next/server';
import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

// Initialize Firebase Admin SDK (only once)
function initializeFirebaseAdmin() {
  if (getApps().length === 0) {
    initializeApp({
      credential: cert({
        projectId: process.env.ADMIN_PROJECT_ID,
        clientEmail: process.env.ADMIN_CLIENT_EMAIL,
        privateKey: process.env.ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
  }
  return {
    messaging: getMessaging(),
    firestore: getFirestore(),
  };
}

export async function POST(request: NextRequest) {
  console.log('API route /api/notifications/process-scheduled called');
  try {
    const { firestore, messaging } = initializeFirebaseAdmin();
    const db = firestore;
    const now = new Date();

    // Find scheduled notifications that are due
    const scheduledNotificationsRef = db.collection('notifications');
    const dueNotifications = await scheduledNotificationsRef
      .where('isScheduled', '==', true)
      .where('scheduledFor', '<=', now)
      .where('sentAt', '==', null)
      .get();

    console.log(`Found ${dueNotifications.size} potentially due notifications`);
    console.log('Current time:', now.toISOString());

    if (dueNotifications.empty) {
      console.log('No scheduled notifications to process');
      return NextResponse.json({ message: 'No scheduled notifications to process' });
    }

    let processedCount = 0;
    const results = [];

    for (const doc of dueNotifications.docs) {
      const notification = doc.data();
      console.log('Processing scheduled notification:', notification.title);
      console.log('Scheduled for:', notification.scheduledFor?.toDate?.()?.toISOString() || notification.scheduledFor);
      console.log('Is scheduled:', notification.isScheduled);
      console.log('Sent at:', notification.sentAt);
      console.log('Current time:', now.toISOString());
      const scheduledTime = notification.scheduledFor?.toDate?.() || new Date(notification.scheduledFor);
      console.log('Time difference (ms):', scheduledTime.getTime() - now.getTime());

      try {
        // Get recipient FCM tokens
        let userTokens: string[] = [];
        const recipientIds = notification.recipientIds;

        if (recipientIds && recipientIds.length > 0) {
          // Send to specific users
          const usersRef = db.collection('users');
          const userDocs = await usersRef.where('__name__', 'in', recipientIds.slice(0, 10)).get(); // Firestore limit

          userDocs.forEach(userDoc => {
            const userData = userDoc.data();
            if (userData.fcmToken) {
              userTokens.push(userData.fcmToken);
            }
          });
        } else {
          // Send to all users
          const usersRef = db.collection('users');
          const userDocs = await usersRef.get();

          userDocs.forEach(userDoc => {
            const userData = userDoc.data();
            if (userData.fcmToken && !userData.isAdmin) { // Exclude admins if desired
              userTokens.push(userData.fcmToken);
            }
          });
        }

        if (userTokens.length === 0) {
          console.log('No users with FCM tokens found for notification:', notification.title);
          continue;
        }

        // Prepare FCM message
        const message = {
          notification: {
            title: notification.title,
            body: notification.description,
          },
          webpush: notification.imageUrl || notification.url ? {
            notification: {
              icon: notification.imageUrl || '/icon-192x192.png',
              badge: '/icon-192x192.png',
              ...(notification.imageUrl && { image: notification.imageUrl }),
            },
            fcmOptions: notification.url ? {
              link: notification.url,
            } : undefined,
          } : undefined,
          data: {
            url: notification.url || '',
            imageUrl: notification.imageUrl || '',
          },
          tokens: userTokens,
        };

        // Send the message using modern API
        const response = await messaging.sendEachForMulticast(message);

        console.log('Push notifications sent for scheduled notification:', response);

        // Update the notification as sent
        await doc.ref.update({
          sentAt: FieldValue.serverTimestamp(),
        });

        results.push({
          id: doc.id,
          title: notification.title,
          successCount: response.successCount,
          failureCount: response.failureCount
        });

        processedCount++;

      } catch (error: any) {
        console.error('Error sending scheduled notification:', notification.title, error);
        results.push({
          id: doc.id,
          title: notification.title,
          error: error.message || error.toString()
        });
      }
    }

    return NextResponse.json({
      message: `Processed ${processedCount} scheduled notifications`,
      results
    });

  } catch (error: any) {
    console.error('Error processing scheduled notifications:', error);
    return NextResponse.json({ error: 'Failed to process scheduled notifications', message: error.message || error.toString() }, { status: 500 });
  }
}
