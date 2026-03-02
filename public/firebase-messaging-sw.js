importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

const firebaseConfig = {
    apiKey: "AIzaSyAT9wsPUW7RFSF3-O8XBTrOJVBY8CTpILY",
    authDomain: "studio-5437783532-5f953.firebaseapp.com",
    databaseURL: "https://studio-5437783532-5f953-default-rtdb.firebaseio.com",
    projectId: "studio-5437783532-5f953",
    storageBucket: "studio-5437783532-5f953.firebasestorage.app",
    messagingSenderId: "680559094401",
    appId: "1:680559094401:web:a734241f6a8fe65b447b80"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);

    // Explicitly show notification if payload has data but no notification object
    // or if you want to customize the notification display
    if (payload.data && !payload.notification) {
        const { title, body, icon, url, type, tab } = payload.data;
        const notificationTitle = title || 'Luni Site';
        const notificationOptions = {
            body: body || '',
            icon: icon || '/icon-192x192.png',
            badge: '/icon-192x192.png',
            data: { url, type, tab }
        };
        self.registration.showNotification(notificationTitle, notificationOptions);
    }
});

// Handle notification clicks
self.addEventListener('notificationclick', function (event) {
    console.log('[firebase-messaging-sw.js] Notification click received', event);

    event.notification.close();

    // Get the URL from the notification data
    const url = event.notification.data?.url || event.notification.data?.clickAction || '/';

    // This looks to see if the current is already open and focuses if it is
    event.waitUntil(
        clients.matchAll({
            type: 'window',
            includeUncontrolled: true
        }).then(function (clientList) {
            // Check if there's already a tab open
            for (let i = 0; i < clientList.length; i++) {
                const client = clientList[i];
                // If url matches or just focus first available
                if (client.url.includes(self.registration.scope) && 'focus' in client) {
                    if (url && url !== '/') {
                        client.navigate(url);
                    }
                    return client.focus();
                }
            }
            // If not, open a new window
            if (clients.openWindow) {
                return clients.openWindow(url);
            }
        })
    );
});
