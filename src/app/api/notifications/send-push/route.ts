import { NextRequest, NextResponse } from 'next/server';
import { adminDb as firestore, adminMessaging as messaging } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  console.log('[send-push] API route called');

  try {
    const { title, description, imageUrl, url, recipientIds, isScheduled, scheduledTime } = await request.json();

    console.log('[send-push] Request:', { title, description, recipientIds: recipientIds?.length || 'all' });

    // Validation
    if (!title || !description) {
      return NextResponse.json(
        { error: 'Title and description are required' },
        { status: 400 }
      );
    }

    // Handle scheduled notifications
    if (isScheduled) {
      if (!scheduledTime) {
        return NextResponse.json(
          { error: 'Scheduled time is required for scheduled notifications' },
          { status: 400 }
        );
      }

      await firestore.collection('scheduled_notifications').add({
        title,
        description,
        imageUrl,
        url,
        recipientIds,
        scheduledTime: new Date(scheduledTime),
        status: 'scheduled',
      });

      return NextResponse.json({ message: 'Scheduled notification saved' });
    }

    // Get FCM tokens from users
    const usersRef = firestore.collection('users');
    let tokensQuery;

    if (recipientIds && recipientIds.length > 0) {
      // Send to specific users
      const userDocs = await Promise.all(
        recipientIds.map((id: string) => usersRef.doc(id).get())
      );
      const tokens = userDocs
        .map(doc => doc.data()?.fcmToken)
        .filter((token): token is string => !!token);

      if (tokens.length === 0) {
        return NextResponse.json(
          { message: 'No users with FCM tokens found' },
          { status: 200 }
        );
      }

      return await sendNotifications(messaging, tokens, title, description, imageUrl, url);
    } else {
      // Send to all users with FCM tokens
      const snapshot = await usersRef.where('fcmToken', '!=', null).get();
      const tokens = snapshot.docs
        .map((doc: any) => doc.data().fcmToken)
        .filter((token: string | undefined): token is string => !!token);

      if (tokens.length === 0) {
        // Even if no tokens, we might want to save to history?
        // But usually we want both. Let's proceed to save history anyway if we are broadcasting or sending to specific users.
      }

      // Save to notification history in Firestore
      await firestore.collection('notifications').add({
        title,
        description,
        imageUrl,
        url,
        recipientIds: recipientIds || null, // null means all users
        createdAt: new Date(),
        type: 'system', // or 'live_class', generic type
      });

      if (tokens.length === 0) {
        return NextResponse.json(
          { message: 'Notification saved to history, but no FCM tokens found for push.' },
          { status: 200 }
        );
      }

      return await sendNotifications(messaging, tokens, title, description, imageUrl, url);
    }
  } catch (error: any) {
    console.error('[send-push] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to send push notifications',
        message: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}

async function sendNotifications(
  messaging: any,
  tokens: string[],
  title: string,
  description: string,
  imageUrl?: string,
  url?: string
) {
  console.log(`[send-push] Sending to ${tokens.length} tokens`);

  // Remove duplicates
  const uniqueTokens = [...new Set(tokens)];

  // FCM allows up to 500 tokens per batch
  const batchSize = 500;
  const batches: string[][] = [];

  for (let i = 0; i < uniqueTokens.length; i += batchSize) {
    batches.push(uniqueTokens.slice(i, i + batchSize));
  }

  let totalSuccess = 0;
  let totalFailure = 0;
  const failedTokens: string[] = [];

  // Process each batch
  for (const batch of batches) {
    try {
      // Create the multicast message
      const message = {
        notification: {
          title,
          body: description,
        },
        webpush: {
          notification: {
            icon: imageUrl || '/icon-192x192.png',
            badge: '/icon-192x192.png',
            ...(imageUrl && { image: imageUrl }),
            requireInteraction: true,
            actions: url ? [
              { action: 'open_url', title: 'Ver Ahora', icon: '/icon-192x192.png' }
            ] : [],
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

      // Use sendEachForMulticast (modern API)
      const response = await messaging.sendEachForMulticast(message);

      totalSuccess += response.successCount;
      totalFailure += response.failureCount;

      console.log(`[send-push] Batch result: ${response.successCount} success, ${response.failureCount} failed`);

      // Collect failed tokens and cleanup
      if (response.failureCount > 0) {
        const usersRef = firestore.collection('users');

        for (let idx = 0; idx < response.responses.length; idx++) {
          const resp = response.responses[idx];
          if (!resp.success) {
            const token = batch[idx];
            const error = resp.error;
            failedTokens.push(token);

            console.error(`[send-push] Failed token: ${error?.message || 'Unknown error'}`);

            // Cleanup: If token is invalid or not registered, remove it from Firestore
            if (error?.code === 'messaging/registration-token-not-registered' ||
              error?.code === 'messaging/invalid-registration-token' ||
              error?.message?.includes('Requested entity was not found')) {

              console.log(`[send-push] Cleaning up invalid token: ${token.substring(0, 10)}...`);

              // Find the user with this token and remove it
              const userSnapshot = await usersRef.where('fcmToken', '==', token).get();
              if (!userSnapshot.empty) {
                const batch_firestore = firestore.batch();
                userSnapshot.docs.forEach((doc: any) => {
                  batch_firestore.update(doc.ref, {
                    fcmToken: null,
                    lastTokenError: error?.message,
                    lastTokenErrorAt: new Date()
                  });
                });
                await batch_firestore.commit();
                console.log(`[send-push] Removed invalid token from ${userSnapshot.size} user(s)`);
              }
            }
          }
        }
      }
    } catch (error: any) {
      console.error('[send-push] Batch error:', error);
      totalFailure += batch.length;
      failedTokens.push(...batch);
    }
  }

  console.log(`[send-push] Total: ${totalSuccess} success, ${totalFailure} failed`);

  return NextResponse.json({
    message: 'Push notifications sent',
    successCount: totalSuccess,
    failureCount: totalFailure,
    totalTokens: uniqueTokens.length,
    ...(failedTokens.length > 0 && { failedTokens: failedTokens.slice(0, 10) }), // Only return first 10 failed tokens
  });
}
