import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import { hbmAPI, inspectionAPI } from '../../services/api';

/**
 * Admin-only button to resend Telegram notification.
 * Props:
 *   type        – HBM checksheet slug (e.g. 'dc-motor') OR 'inspection'
 *   id          – record ID
 */
const ResendTelegramButton = ({ type, id }) => {
  const { user } = useAuth();
  const [sending, setSending] = useState(false);

  const isAdmin = user?.role === 'ADMIN' || user?.user_type === 'ADMIN';
  if (!isAdmin) return null;

  const handleResend = async () => {
    setSending(true);
    try {
      if (type === 'inspection') {
        await inspectionAPI.resendTelegram(id);
      } else {
        await hbmAPI.resendTelegram(type, id);
      }
      toast.success('Telegram notification resent!');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to resend notification');
    } finally {
      setSending(false);
    }
  };

  return (
    <button
      onClick={handleResend}
      disabled={sending}
      title="Resend Telegram notification"
      className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-50 border border-sky-300 text-sky-700 rounded-lg text-xs font-semibold hover:bg-sky-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
      {sending ? (
        <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
      ) : (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
        </svg>
      )}
      {sending ? 'Sending…' : 'Resend to Telegram'}
    </button>
  );
};

export default ResendTelegramButton;
