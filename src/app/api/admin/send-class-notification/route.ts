import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminMessaging } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';

export async function POST(request: NextRequest) {
    try {
        const { userIds, message, classId, classTitle, notificationType, imageUrl } = await request.json();

        if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
            return NextResponse.json(
                { error: 'userIds debe ser un array no vacío' },
                { status: 400 }
            );
        }

        if (!message || !classId) {
            return NextResponse.json(
                { error: 'message y classId son requeridos' },
                { status: 400 }
            );
        }

        // Get FCM tokens for users
        // Note: Firestore 'in' query supports up to 10 or 30 values? It is 30 in some contexts, 10 in others.
        // But for safety and API limits, we should batch if it's large. The user code sliced to 30.
        // Correct implementation for Admin SDK:
        const usersSnapshot = await adminDb.collection('users').where('id', 'in', userIds.slice(0, 30)).get();
        const fcmTokens: string[] = [];

        usersSnapshot.forEach((doc: any) => {
            const userData = doc.data();
            if (userData.fcmToken) {
                fcmTokens.push(userData.fcmToken);
            }
        });

        // Create in-app notifications for each user
        const notificationPromises = userIds.map(userId =>
            adminDb.collection('notifications').add({
                recipientIds: [userId],
                title: notificationType === 'reminder' ? '🔔 Recordatorio de Clase' : '📋 Notificación de Clase',
                message,
                type: 'info',
                read: false,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                url: `/clases?open=${classId}`, // URL to open class modal
                imageUrl: imageUrl || null,
                metadata: {
                    type: 'class',
                    classId,
                    classTitle,
                    notificationType
                }
            })
        );

        await Promise.all(notificationPromises);

        // Send push notifications via FCM
        const pushResults = {
            success: 0,
            failed: 0
        };

        if (fcmTokens.length > 0) {
            const pushMessage: admin.messaging.MulticastMessage = {
                notification: {
                    title: notificationType === 'reminder' ? '🔔 Recordatorio de Clase' : '📋 Notificación de Clase',
                    body: message,
                },
                webpush: {
                    notification: {
                        icon: imageUrl || '/icon-192x192.png',
                        badge: '/icon-192x192.png',
                        ...(imageUrl && { image: imageUrl }),
                        requireInteraction: true,
                    },
                    fcmOptions: {
                        link: `/clases?open=${classId}`
                    }
                },
                data: {
                    type: 'class',
                    classId,
                    classTitle,
                    url: `/clases?open=${classId}`
                },
                tokens: fcmTokens
            };

            try {
                const response = await adminMessaging.sendEachForMulticast(pushMessage);
                pushResults.success = response.successCount;
                pushResults.failed = response.failureCount;

                if (response.failureCount > 0) {
                    console.error('Some push notifications failed:', response.responses);
                }
            } catch (fcmError) {
                console.error('Error sending FCM notifications:', fcmError);
            }
        }

        return NextResponse.json({
            success: true,
            inAppNotifications: userIds.length,
            pushNotifications: pushResults
        });

    } catch (error: any) {
        console.error('Error in send-class-notification:', error);
        return NextResponse.json(
            { error: error.message || 'Error al enviar notificaciones' },
            { status: 500 }
        );
    }
}
