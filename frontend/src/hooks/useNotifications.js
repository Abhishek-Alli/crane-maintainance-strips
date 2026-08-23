import { useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { requestNotificationPermission, onForegroundMessage } from '../firebase';
import { notificationAPI } from '../services/api';

/**
 * Call this hook once in App.js after the user logs in.
 * - Requests notification permission
 * - Saves FCM token to backend
 * - Shows toast for foreground notifications
 */
export default function useNotifications(user) {
  const tokenRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return;

    let cancelled = false;

    (async () => {
      try {
        const token = await requestNotificationPermission();
        if (!token || cancelled) return;
        tokenRef.current = token;
        await notificationAPI.saveToken(token);
      } catch (err) {
        console.error('Notification setup error:', err);
      }
    })();

    // Foreground message handler — show toast
    const unsubscribe = onForegroundMessage(({ title, body, data }) => {
      toast.info(
        <div>
          <p className="font-semibold text-sm">{title}</p>
          {body && <p className="text-xs text-gray-600 mt-0.5">{body}</p>}
        </div>,
        {
          autoClose: 6000,
          onClick: () => { if (data?.url) window.location.href = data.url; },
        }
      );
    });

    return () => {
      cancelled = true;
      if (unsubscribe) unsubscribe();
    };
  }, [user?.id]);

  // Return token remover for logout
  return {
    removeToken: async () => {
      if (tokenRef.current) {
        try { await notificationAPI.removeToken(tokenRef.current); } catch (_) {}
        tokenRef.current = null;
      }
    },
  };
}
