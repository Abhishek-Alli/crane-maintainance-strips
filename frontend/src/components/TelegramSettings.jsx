import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { telegramAPI, hbmAPI } from '../services/api';

const ALL_CHECKSHEET_TYPES = [
  { key: 'dc-motor',       label: 'DC Motor' },
  { key: 'rolling-stand',  label: 'Rolling Stand' },
  { key: 'mill-mech',      label: 'Mill Mechanical' },
  { key: 'cooling-bed',    label: 'Cooling Bed' },
  { key: 'pumphouse',      label: 'Pumphouse' },
  { key: 'bar-bundle',     label: 'Bar Bundle Area' },
  { key: 'before-rolling', label: 'Before Rolling' },
];

// ─── Subscription Editor ──────────────────────────────────────────────────────
function SubscriptionEditor({ recipient, onSaved, onClose }) {
  // null in DB = all types; pre-select all in that case
  const initial = recipient.checksheet_types ?? ALL_CHECKSHEET_TYPES.map(t => t.key);
  const [selected, setSelected] = useState(new Set(initial));
  const [saving, setSaving] = useState(false);

  const allSelected = selected.size === ALL_CHECKSHEET_TYPES.length;

  const toggle = (key) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected(allSelected
      ? new Set()
      : new Set(ALL_CHECKSHEET_TYPES.map(t => t.key))
    );
  };

  const handleSave = async () => {
    if (selected.size === 0) { toast.warn('Select at least one checksheet type'); return; }
    setSaving(true);
    try {
      // all selected → send null so DB stores NULL (receives all, no filter overhead)
      const types = allSelected ? null : [...selected];
      await telegramAPI.updateRecipientChecksheets(recipient.id, types);
      toast.success('Subscriptions saved');
      onSaved();
    } catch {
      toast.error('Failed to save subscriptions');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-3 border-t border-gray-200 pt-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">
          Checksheet Subscriptions
        </p>
        <button type="button" onClick={toggleAll}
          className="text-xs text-blue-600 hover:underline font-medium">
          {allSelected ? 'Deselect All' : 'Select All'}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-1.5 mb-3">
        {ALL_CHECKSHEET_TYPES.map(({ key, label }) => (
          <label key={key}
            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border cursor-pointer transition-colors text-xs font-medium select-none ${
              selected.has(key)
                ? 'bg-blue-50 border-blue-300 text-blue-800'
                : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
            }`}>
            <input
              type="checkbox"
              checked={selected.has(key)}
              onChange={() => toggle(key)}
              className="w-3 h-3 accent-blue-600"
            />
            {label}
          </label>
        ))}
      </div>

      <div className="flex gap-2">
        <button type="button" onClick={handleSave}
          disabled={saving || selected.size === 0}
          className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors">
          {saving ? 'Saving…' : 'Save Subscriptions'}
        </button>
        <button type="button" onClick={onClose}
          className="px-4 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg transition-colors">
          Cancel
        </button>
      </div>
      {selected.size === 0 && (
        <p className="text-xs text-red-500 mt-1">At least one type must be selected.</p>
      )}
    </div>
  );
}

// ─── Subscription Pills (read-only) ──────────────────────────────────────────
function SubscriptionPills({ checksheetTypes }) {
  if (!checksheetTypes) {
    return (
      <span className="inline-block mt-1.5 text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold">
        All checksheets
      </span>
    );
  }
  if (checksheetTypes.length === 0) {
    return (
      <span className="inline-block mt-1.5 text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-semibold">
        None selected
      </span>
    );
  }
  return (
    <div className="flex flex-wrap gap-1 mt-1.5">
      {checksheetTypes.map(key => {
        const found = ALL_CHECKSHEET_TYPES.find(t => t.key === key);
        return (
          <span key={key}
            className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
            {found?.label ?? key}
          </span>
        );
      })}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
function TelegramSettings() {
  const [recipients, setRecipients] = useState([]);
  const [chatId, setChatId]         = useState('');
  const [label, setLabel]           = useState('');
  const [loading, setLoading]       = useState(false);
  const [adding, setAdding]         = useState(false);
  const [testingId, setTestingId]   = useState(null);
  const [editingId, setEditingId]   = useState(null);
  const [sending, setSending]       = useState(false);
  const [sendResult, setSendResult] = useState(null);
  const [notifDate, setNotifDate]   = useState(new Date().toLocaleDateString('en-CA'));

  const fetchRecipients = useCallback(async () => {
    setLoading(true);
    try {
      const data = await telegramAPI.getRecipients();
      setRecipients(data.recipients || []);
    } catch {
      toast.error('Failed to load recipients');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRecipients(); }, [fetchRecipients]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!chatId.trim() || !label.trim()) { toast.warn('Both fields are required'); return; }
    setAdding(true);
    try {
      await telegramAPI.addRecipient({ chat_id: chatId.trim(), label: label.trim() });
      toast.success('Recipient added — subscribed to all checksheets by default');
      setChatId('');
      setLabel('');
      fetchRecipients();
    } catch (err) {
      toast.error(err?.message || 'Failed to add recipient');
    } finally {
      setAdding(false);
    }
  };

  const handleToggle = async (id) => {
    try {
      await telegramAPI.toggleRecipient(id);
      fetchRecipients();
    } catch {
      toast.error('Failed to toggle status');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this recipient?')) return;
    try {
      await telegramAPI.deleteRecipient(id);
      toast.success('Recipient removed');
      if (editingId === id) setEditingId(null);
      fetchRecipients();
    } catch {
      toast.error('Failed to delete');
    }
  };

  const handleSendDailyNotifications = async () => {
    setSending(true);
    setSendResult(null);
    try {
      const res = await hbmAPI.sendDailyNotifications(notifDate);
      setSendResult(res.data.results);
      const { sent, skipped, failed } = res.data.results;
      if (failed.length === 0) toast.success(`Sent ${sent.length} notifications, ${skipped.length} not filled today`);
      else toast.warn(`Sent ${sent.length}, skipped ${skipped.length}, failed ${failed.length}`);
    } catch {
      toast.error('Failed to send notifications');
    } finally {
      setSending(false);
    }
  };

  const handleTest = async (targetChatId) => {
    setTestingId(targetChatId);
    try {
      const data = await telegramAPI.sendTest({ chat_id: targetChatId });
      data.success ? toast.success('Test message sent!') : toast.error(data.message || 'Test failed');
    } catch {
      toast.error('Failed to send test message');
    } finally {
      setTestingId(null);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-xl font-bold text-gray-800 mb-1">Telegram Notifications</h1>
      <p className="text-sm text-gray-500 mb-5">
        Manage recipients and control which checksheet notifications each person receives.
      </p>

      {/* ── Send Notifications by Date ── */}
      <div className="bg-white rounded-xl shadow-sm border border-blue-200 p-4 mb-6">
        <h2 className="text-sm font-semibold text-gray-600 mb-1 uppercase tracking-wide">Send Notifications by Date</h2>
        <p className="text-xs text-gray-500 mb-3">
          Pick a date and send Telegram notifications for all HBM sheets filled on that day. Only the latest submission per sheet is sent.
        </p>
        <div className="flex gap-2 mb-3">
          <input
            type="date"
            value={notifDate}
            max={new Date().toLocaleDateString('en-CA')}
            onChange={e => { setNotifDate(e.target.value); setSendResult(null); }}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
          <button
            onClick={() => { setNotifDate(new Date().toLocaleDateString('en-CA')); setSendResult(null); }}
            className="px-3 py-2 text-xs border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 font-medium"
          >Today</button>
        </div>
        <button
          onClick={handleSendDailyNotifications}
          disabled={sending || !notifDate}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
        >
          {sending ? (
            <>
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Sending…
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
              Send Notifications for {new Date(notifDate + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            </>
          )}
        </button>

        {sendResult && (
          <div className="mt-3 space-y-2 text-xs">
            <p className="font-semibold text-gray-600">
              Results for {new Date(notifDate + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
            </p>
            {sendResult.sent.length > 0 && (
              <div>
                <p className="font-semibold text-green-700 mb-1">✅ Sent ({sendResult.sent.length})</p>
                <div className="flex flex-wrap gap-1">
                  {sendResult.sent.map(s => (
                    <span key={s} className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{s}</span>
                  ))}
                </div>
              </div>
            )}
            {sendResult.skipped.length > 0 && (
              <div>
                <p className="font-semibold text-gray-500 mb-1">⏭ Not filled today ({sendResult.skipped.length})</p>
                <div className="flex flex-wrap gap-1">
                  {sendResult.skipped.map(s => (
                    <span key={s} className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{s}</span>
                  ))}
                </div>
              </div>
            )}
            {sendResult.failed.length > 0 && (
              <div>
                <p className="font-semibold text-red-600 mb-1">❌ Failed ({sendResult.failed.length})</p>
                <div className="flex flex-wrap gap-1">
                  {sendResult.failed.map(s => (
                    <span key={s} className="bg-red-100 text-red-600 px-2 py-0.5 rounded-full">{s}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Add Recipient Form ── */}
      <form onSubmit={handleAdd} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <h2 className="text-sm font-semibold text-gray-600 mb-3 uppercase tracking-wide">
          Add Recipient
        </h2>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Chat ID</label>
            <input type="text" value={chatId} onChange={e => setChatId(e.target.value)}
              placeholder="e.g. 7277986981"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Label</label>
            <input type="text" value={label} onChange={e => setLabel(e.target.value)}
              placeholder="e.g. Maintenance Head"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
          </div>
          <button type="submit" disabled={adding}
            className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium text-sm hover:bg-blue-700 disabled:bg-gray-400 transition-colors">
            {adding ? 'Adding…' : 'Add Recipient'}
          </button>
        </div>
        <p className="mt-3 text-xs text-gray-500">
          To get your Chat ID, message <strong>@userinfobot</strong> on Telegram.
          New recipients receive <strong>all checksheet types</strong> by default — use
          the <strong>Sheets</strong> button to customise.
        </p>
      </form>

      {/* ── Recipients List ── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <h2 className="text-sm font-semibold text-gray-600 mb-3 uppercase tracking-wide">
          Recipients ({recipients.length})
        </h2>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : recipients.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-6">
            No recipients added yet. Add a Telegram Chat ID above.
          </p>
        ) : (
          <div className="space-y-3">
            {recipients.map((r) => (
              <div key={r.id}
                className={`border rounded-xl p-3 transition-colors ${
                  r.is_active ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'
                }`}>

                {/* Top row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-800 truncate">{r.label}</p>
                    <p className="text-xs text-gray-500 font-mono">{r.chat_id}</p>
                    <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-semibold ${
                      r.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'
                    }`}>
                      {r.is_active ? 'Active' : 'Disabled'}
                    </span>
                    {/* Which checksheets this recipient gets */}
                    <SubscriptionPills checksheetTypes={r.checksheet_types} />
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <button onClick={() => handleTest(r.chat_id)}
                      disabled={testingId === r.chat_id}
                      className="text-xs px-2.5 py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 disabled:opacity-50 font-medium">
                      {testingId === r.chat_id ? '…' : 'Test'}
                    </button>
                    <button onClick={() => handleToggle(r.id)}
                      className={`text-xs px-2.5 py-1.5 rounded-lg font-medium ${
                        r.is_active
                          ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                          : 'bg-green-100 text-green-700 hover:bg-green-200'
                      }`}>
                      {r.is_active ? 'Disable' : 'Enable'}
                    </button>
                    <button
                      onClick={() => setEditingId(editingId === r.id ? null : r.id)}
                      className={`text-xs px-2.5 py-1.5 rounded-lg font-medium ${
                        editingId === r.id
                          ? 'bg-indigo-600 text-white'
                          : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                      }`}>
                      Sheets
                    </button>
                    <button onClick={() => handleDelete(r.id)}
                      className="text-xs px-2.5 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 font-medium">
                      Delete
                    </button>
                  </div>
                </div>

                {/* Inline subscription editor */}
                {editingId === r.id && (
                  <SubscriptionEditor
                    recipient={r}
                    onSaved={() => { fetchRecipients(); setEditingId(null); }}
                    onClose={() => setEditingId(null)}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default TelegramSettings;
