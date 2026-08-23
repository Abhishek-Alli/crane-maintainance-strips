import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { notificationAPI, userAPI } from '../../services/api';

const MODULE_OPTIONS = [
  { value: 'all',              label: 'All Users' },
  { value: 'HBM_CHECKSHEETS', label: 'HBM Operators' },
  { value: 'HSM_CHECKSHEETS', label: 'HSM Operators' },
  { value: 'SMS_CHECKSHEETS', label: 'SMS Operators' },
  { value: 'PTM_CHECKSHEETS', label: 'PTM Operators' },
  { value: 'HOD',              label: 'HOD Users' },
  { value: 'custom',           label: 'Select Specific Users…' },
];

const QUICK_MESSAGES = [
  { label: 'Fill HBM Checksheets',    title: 'Action Required: Fill HBM Checksheets', body: 'Please fill today\'s HBM checksheets before shift end.' },
  { label: 'Fill HSM Checksheets',    title: 'Action Required: Fill HSM Checksheets', body: 'Please fill today\'s HSM checksheets before shift end.' },
  { label: 'Pending HOD Review',      title: 'HOD Review Pending',                   body: 'You have checksheets pending HOD review. Please check the dashboard.' },
  { label: 'Shift End Reminder',      title: 'Shift End Reminder',                   body: 'Please complete all checksheets before end of shift.' },
  { label: 'Maintenance Due',         title: 'Maintenance Due Today',                body: 'A crane maintenance task is due today. Please complete it.' },
];

export default function SendNotification() {
  const [target,   setTarget]   = useState('all');
  const [users,    setUsers]    = useState([]);
  const [selected, setSelected] = useState([]);
  const [title,    setTitle]    = useState('');
  const [body,     setBody]     = useState('');
  const [url,      setUrl]      = useState('/');
  const [sending,  setSending]  = useState(false);
  const [history,  setHistory]  = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Load users for custom picker
  useEffect(() => {
    if (target !== 'custom') { setSelected([]); return; }
    setLoadingUsers(true);
    userAPI.getAll?.()
      .then(res => {
        const data = res?.data || res;
        setUsers(Array.isArray(data) ? data : data?.users || data?.data || []);
      })
      .catch(() => toast.error('Failed to load users'))
      .finally(() => setLoadingUsers(false));
  }, [target]);

  const applyQuick = (q) => { setTitle(q.title); setBody(q.body); };

  const handleSend = async () => {
    if (!title.trim()) { toast.error('Title is required'); return; }
    setSending(true);
    try {
      let user_ids = target === 'all' ? 'all' : target === 'custom' ? selected : target;
      if (target === 'custom' && !selected.length) { toast.error('Select at least one user'); setSending(false); return; }

      const res = await notificationAPI.send({ title: title.trim(), body: body.trim(), url, user_ids });
      const msg = (res?.data || res)?.message || 'Sent!';
      toast.success(msg);
      setHistory(h => [{ title, body, target, sentAt: new Date().toLocaleString('en-IN'), msg }, ...h.slice(0, 9)]);
      setTitle(''); setBody(''); setUrl('/');
    } catch (err) {
      toast.error(err?.message || 'Failed to send');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Send Notification</h1>
        <p className="text-sm text-gray-500 mt-0.5">Send in-app + push notifications to users</p>
      </div>

      {/* Quick message templates */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Quick Templates</p>
        <div className="flex flex-wrap gap-2">
          {QUICK_MESSAGES.map(q => (
            <button
              key={q.label}
              onClick={() => applyQuick(q)}
              className="text-xs px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors"
            >
              {q.label}
            </button>
          ))}
        </div>
      </div>

      {/* Compose */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Compose</p>

        {/* Target */}
        <div>
          <label className="text-xs font-semibold text-gray-600 block mb-1">Send To</label>
          <select
            value={target}
            onChange={e => setTarget(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-slate-400 focus:border-transparent"
          >
            {MODULE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        {/* Custom user picker */}
        {target === 'custom' && (
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">Select Users</label>
            {loadingUsers ? (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-slate-400" />
              </div>
            ) : (
              <div className="border border-gray-200 rounded-lg max-h-40 overflow-y-auto divide-y divide-gray-50">
                {users.map(u => (
                  <label key={u.id} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selected.includes(u.id)}
                      onChange={e => setSelected(s => e.target.checked ? [...s, u.id] : s.filter(id => id !== u.id))}
                      className="accent-slate-600"
                    />
                    <span className="text-sm text-gray-800">{u.username}</span>
                    <span className="text-[10px] text-gray-400 ml-auto">{u.user_type}</span>
                  </label>
                ))}
              </div>
            )}
            {selected.length > 0 && (
              <p className="text-xs text-slate-600 mt-1">{selected.length} user{selected.length !== 1 ? 's' : ''} selected</p>
            )}
          </div>
        )}

        {/* Title */}
        <div>
          <label className="text-xs font-semibold text-gray-600 block mb-1">Title <span className="text-red-500">*</span></label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Notification title…"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-slate-400 focus:border-transparent"
          />
        </div>

        {/* Body */}
        <div>
          <label className="text-xs font-semibold text-gray-600 block mb-1">Message</label>
          <textarea
            rows={3}
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="Optional message body…"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-slate-400 focus:border-transparent resize-none"
          />
        </div>

        {/* URL */}
        <div>
          <label className="text-xs font-semibold text-gray-600 block mb-1">Link (on tap)</label>
          <input
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="/hbm/dashboard"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-slate-400 focus:border-transparent"
          />
        </div>

        <button
          onClick={handleSend}
          disabled={sending || !title.trim()}
          className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white text-sm font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          {sending ? (
            <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> Sending…</>
          ) : (
            <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg> Send Notification</>
          )}
        </button>
      </div>

      {/* Recent sent history */}
      {history.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Recently Sent</p>
          <div className="space-y-2">
            {history.map((h, i) => (
              <div key={i} className="flex items-start justify-between gap-3 bg-gray-50 rounded-lg px-3 py-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{h.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{h.sentAt} · {h.msg}</p>
                </div>
                <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-semibold whitespace-nowrap flex-shrink-0">Sent</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
