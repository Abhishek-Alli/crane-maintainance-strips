importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// Config is written by the app when registering the SW via a MessageChannel
// so no credentials are hardcoded here
let messaging;

self.addEventListener('message', (event) => {
  if (event.data?.type === 'FIREBASE_CONFIG') {
    if (!messaging) {
      firebase.initializeApp(event.data.config);
      messaging = firebase.messaging();

      messaging.onBackgroundMessage((payload) => {
        const { title = 'SRJ Notification', body = '' } = payload.notification || {};
        self.registration.showNotification(title, {
          body,
          icon: '/logo192.png',
          badge: '/logo192.png',
          data: payload.data || {},
          tag: payload.data?.tag || 'srj-notification',
          renotify: true,
        });
      });
    }
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      const existing = list.find(c => c.url.includes(self.location.origin));
      if (existing) { existing.focus(); existing.navigate(url); }
      else clients.openWindow(url);
    })
  );
});
