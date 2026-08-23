import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificationAPI } from '../../services/api';

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function NotificationPanel({ navHover, navActive }) {
  const [open, setOpen]           = useState(false);
  const [items, setItems]         = useState([]);
  const [unread, setUnread]       = useState(0);
  const [loading, setLoading]     = useState(false);
  const panelRef                  = useRef(null);
  const navigate                  = useNavigate();

  // Load notifications
  const load = async () => {
    setLoading(true);
    try {
      const res = await notificationAPI.getAll();
      const data = res?.data || res;
      setItems(data.data || []);
      setUnread(data.unreadCount || 0);
    } catch (_) {}
    finally { setLoading(false); }
  };

  useEffect(() => {
    load();
    // Poll every 60s for new notifications
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleOpen = () => { setOpen(o => !o); };

  const markRead = async (item) => {
    if (!item.is_read) {
      await notificationAPI.markRead(item.id);
      setItems(prev => prev.map(n => n.id === item.id ? { ...n, is_read: true } : n));
      setUnread(u => Math.max(0, u - 1));
    }
    setOpen(false);
    if (item.url) navigate(item.url);
  };

  const markAllRead = async () => {
    await notificationAPI.markAllRead();
    setItems(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnread(0);
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={handleOpen}
        className={`relative p-2 rounded-lg ${navHover} transition-colors`}
        title="Notifications"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unread > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-gray-900">Notifications</span>
              {unread > 0 && (
                <span className="bg-red-100 text-red-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{unread} new</span>
              )}
            </div>
            {unread > 0 && (
              <button onClick={markAllRead} className="text-[11px] text-blue-600 hover:underline font-medium">
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto divide-y divide-gray-50">
            {loading && items.length === 0 ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-400" />
              </div>
            ) : items.length === 0 ? (
              <div className="py-10 text-center">
                <svg className="w-10 h-10 text-gray-200 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <p className="text-xs text-gray-400">No notifications yet</p>
              </div>
            ) : (
              items.map(item => (
                <button
                  key={item.id}
                  onClick={() => markRead(item)}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex gap-3 items-start ${!item.is_read ? 'bg-blue-50/50' : ''}`}
                >
                  {/* Unread dot */}
                  <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${!item.is_read ? 'bg-blue-500' : 'bg-transparent'}`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm leading-snug ${!item.is_read ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                      {item.title}
                    </p>
                    {item.body && (
                      <p className="text-xs text-gray-500 mt-0.5 leading-snug line-clamp-2">{item.body}</p>
                    )}
                    <p className="text-[10px] text-gray-400 mt-1">{timeAgo(item.created_at)}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
