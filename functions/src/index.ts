import * as functions from "firebase-functions/v1";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";
import { initializeApp } from "firebase-admin/app";
import { v4 as uuidv4 } from "uuid";

initializeApp();

export const checkExpiredPremium = functions.pubsub
  .schedule("every 24 hours")
  .onRun(async (context: functions.EventContext) => {
    const db = getFirestore();
    const messaging = getMessaging();
    const now = Timestamp.now();

    const usersRef = db.collection("users");
    const expiredUsersQuery = usersRef
      .where("premiumUntil", "<=", now)
      .where("premiumPlan", "!=", null);

    const snapshot = await expiredUsersQuery.get();

    if (snapshot.empty) {
      console.log("No expired premium users found.");
      return;
    }

    const batch = db.batch();

    for (const doc of snapshot.docs) {
      const userData = doc.data();
      const userId = doc.id;

      // 1. Update user document
      batch.update(doc.ref, {
        premiumPlan: null,
        premiumUntil: null,
        examsTakenThisPeriod: 0,
        customExamsAllowed: null
      });

      // 2. Create in-app notification
      const notificationId = uuidv4();
      const notificationRef = db.collection("notifications").doc(notificationId);
      batch.set(notificationRef, {
        id: notificationId,
        title: "¡Premium Desactivado!",
        description: "Tu tiempo de acceso premium ha terminado. Obtén más días contactándonos por WhatsApp aquí.",
        type: "info",
        read: false,
        createdAt: now,
        recipientIds: [userId],
        url: `https://wa.me/525619764631?text=${encodeURIComponent('Hola, mi periodo premium terminó. Me gustaría obtener más días de acceso.')}`,
        imageUrl: "/images/premium-expired.png",
        source: "system"
      });

      // 3. Send push notification if token exists
      if (userData.fcmToken) {
        try {
          await messaging.send({
            token: userData.fcmToken,
            notification: {
              title: "¡Premium Desactivado!",
              body: "Tu tiempo de premium ha terminado. Obtén más días por WhatsApp aquí.",
            },
            data: {
              url: `https://wa.me/525619764631?text=${encodeURIComponent('Hola, mi periodo premium terminó. Me gustaría obtener más días de acceso.')}`,
              imageUrl: "/images/premium-expired.png"
            }
          });
        } catch (error) {
          console.error(`Error sending push to user ${userId}:`, error);
        }
      }
    }

    await batch.commit();
    console.log(`Processed ${snapshot.size} expired premium users.`);
  });
