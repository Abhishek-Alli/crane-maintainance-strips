const admin = require('firebase-admin');
require('dotenv').config();

let _messaging = null;

function getMessaging() {
  if (_messaging) return _messaging;

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) {
    console.warn('FIREBASE_SERVICE_ACCOUNT not set — push notifications disabled');
    return null;
  }

  try {
    const serviceAccount = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!admin.apps.length) {
      admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    }
    _messaging = admin.messaging();
    return _messaging;
  } catch (err) {
    console.error('Firebase Admin init failed:', err.message);
    return null;
  }
}

/**
 * Send a push notification to a list of FCM tokens.
 * Silently removes invalid tokens from the DB.
 */
async function sendPush(tokens, { title, body, data = {}, url = '/' }) {
  const messaging = getMessaging();
  if (!messaging || !tokens.length) return;

  const message = {
    notification: { title, body },
    data: { ...data, url },
    webpush: {
      notification: { icon: '/logo192.png', badge: '/logo192.png' },
      fcmOptions: { link: url },
    },
    tokens,
  };

  try {
    const res = await messaging.sendEachForMulticast(message);
    // Collect invalid tokens to clean up
    const invalid = [];
    res.responses.forEach((r, i) => {
      if (!r.success && ['messaging/invalid-registration-token',
        'messaging/registration-token-not-registered'].includes(r.error?.code)) {
        invalid.push(tokens[i]);
      }
    });
    return { successCount: res.successCount, invalid };
  } catch (err) {
    console.error('FCM sendPush error:', err.message);
    return null;
  }
}

module.exports = { getMessaging, sendPush };
