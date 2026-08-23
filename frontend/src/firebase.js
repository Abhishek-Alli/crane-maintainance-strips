import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

const firebaseConfig = {
  apiKey:            process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain:        process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.REACT_APP_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

export async function requestNotificationPermission() {
  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return null;

    // Register SW and send it the config (no hardcoded values in SW file)
    const reg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    await navigator.serviceWorker.ready;
    reg.active?.postMessage({ type: 'FIREBASE_CONFIG', config: firebaseConfig });

    const token = await getToken(messaging, {
      vapidKey: process.env.REACT_APP_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: reg,
    });
    return token || null;
  } catch (err) {
    console.error('FCM token error:', err);
    return null;
  }
}

export function onForegroundMessage(handler) {
  return onMessage(messaging, (payload) => {
    handler({
      title: payload.notification?.title || 'SRJ Notification',
      body:  payload.notification?.body  || '',
      data:  payload.data || {},
    });
  });
}

export { messaging };
