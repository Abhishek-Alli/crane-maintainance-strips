import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { telegramAPI, hbmAPI } from '../services/api';
import { SMS_DOWNLOAD_SHEETS } from './sms/smsDownloadConfig';

const ALL_CHECKSHEET_TYPES = [
  { key: 'dc-motor',       label: 'DC Motor' },
  { key: 'rolling-stand',  label: 'Rolling Stand' },
  { key: 'mill-mech',      label: 'Mill Mechanical' },
  { key: 'cooling-bed',    label: 'Cooling Bed' },
  { key: 'pumphouse',      label: 'Pumphouse' },
  { key: 'bar-bundle',     label: 'Bar Bundle Area' },
  { key: 'before-rolling', label: 'Before Rolling' },
  { key: 'pump-param',     label: 'Pump Parameter Report' },
  { key: 'water-param',    label: 'Pump House Water Parameters' },
  { key: 'ph-maint',       label: 'Pump House Maintenance Work Sheet' },
  { key: 'transformer',    label: 'Visual Inspection & HBM Transformer' },
  { key: 'oil-level',      label: 'Daily Oil Level Sheet' },
  { key: 'dc-motor-airflow', label: 'DC Motor Airflow, Temp & Vibration' },
  { key: 'roughing-gb-temp', label: 'Roughing Stand & Gearbox Bearing Temp' },
  { key: 'breakdown',      label: 'HBM Breakdown Report' },
];

// ─── Unified editor: Admin flag, Alerts-only and every department's sheets ───
// Every department's sheets are listed from the backend (GET /api/telegram/sheets).
// HBM subscriptions are stored in checksheet_types; SMS / HSM / PTM / Crane keys all go in
// sms_sheets (non-SMS keys carry a prefix such as "hsm:" so they never clash).
// The live list comes from the backend (GET /api/telegram/sheets), so new sheets appear without a
// frontend change. These are only the fallback if that request fails.
const FALLBACK_SMS_SHEETS = Object.entries(SMS_DOWNLOAD_SHEETS).map(([key, s]) => ({ key, label: s.label }));

function Department({ title, total, selectedCount, soon, children, defaultOpen }) {
  return (
    <details open={defaultOpen} className="border border-gray-200 rounded-lg bg-white">
      <summary className="cursor-pointer select-none px-3 py-2 flex items-center justify-between gap-2 text-xs">
        <span className="font-bold text-gray-700">{title}</span>
        <span className={`font-semibold ${soon ? 'text-gray-400' : 'text-blue-700'}`}>
          {soon ? `${total} sheets · coming soon` : `${selectedCount}/${total} selected`}
        </span>
      </summary>
      <div className="px-3 pb-3 pt-1">{children}</div>
    </details>
  );
}

function SheetChip({ label, checked, disabled, onChange, tone = 'blue' }) {
  const on = tone === 'amber'
    ? 'bg-amber-50 border-amber-300 text-amber-800'
    : 'bg-blue-50 border-blue-300 text-blue-800';
  return (
    <label className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs font-medium select-none ${
      disabled
        ? 'border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed'
        : checked ? `${on} cursor-pointer` : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300 cursor-pointer'
    }`}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={onChange} className="w-3 h-3 shrink-0" />
      {label}
    </label>
  );
}

function RecipientEditor({ recipient, hbmSheets, smsSheets, extraSheets, onSaved, onClose }) {
  const [isAdmin, setIsAdmin] = useState(Boolean(recipient.is_admin));
  const [alertsOnly, setAlertsOnly] = useState(Boolean(recipient.alerts_only));
  // null in DB = all HBM types; pre-select all in that case
  const [hbm, setHbm] = useState(new Set(recipient.checksheet_types ?? hbmSheets.map((t) => t.key)));
  const [sms, setSms] = useState(new Set(recipient.sms_sheets || []));
  const [saving, setSaving] = useState(false);

  const flip = (setter) => (key) => setter((prev) => {
    const next = new Set(prev);
    next.has(key) ? next.delete(key) : next.add(key);
    return next;
  });
  const hbmAll = hbmSheets.every((t) => hbm.has(t.key));
  const smsAll = smsSheets.every((t) => sms.has(t.key));
  const countIn = (list) => list.filter((t) => sms.has(t.key)).length;

  const handleSave = async () => {
    if (!isAdmin && hbm.size === 0 && sms.size === 0) {
      toast.warn('Select at least one sheet, or make this recipient an Admin');
      return;
    }
    setSaving(true);
    try {
      // HBM: all selected -> null (receives all). None selected -> a key that matches no sheet,
      // because null/empty means "all" on the server.
      const hbmTypes = hbmAll ? null : hbm.size === 0 ? ['__none__'] : [...hbm];
      await telegramAPI.updateRecipientChecksheets(recipient.id, hbmTypes);
      await telegramAPI.updateRecipientSettings(recipient.id, {
        is_admin: isAdmin,
        alerts_only: alertsOnly,
        sms_sheets: [...sms],
      });
      toast.success('Notification settings saved');
      onSaved();
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-3 border-t border-gray-200 pt-3 space-y-3">
      <label className="flex items-start gap-2 text-xs cursor-pointer select-none">
        <input type="checkbox" checked={isAdmin} onChange={(e) => setIsAdmin(e.target.checked)} className="mt-0.5 w-3.5 h-3.5 accent-red-600" />
        <span>
          <span className="font-bold text-red-700">Admin — receive every notification</span>
          <span className="block text-gray-500">All departments and sheets, normal and abnormal, new entries and edits. Ignores the choices below.</span>
        </span>
      </label>

      <div className={`space-y-2 ${isAdmin ? 'opacity-40 pointer-events-none' : ''}`}>
        <label className="flex items-start gap-2 text-xs cursor-pointer select-none">
          <input type="checkbox" checked={alertsOnly} onChange={(e) => setAlertsOnly(e.target.checked)} className="mt-0.5 w-3.5 h-3.5 accent-amber-600" />
          <span>
            <span className="font-bold text-gray-700">Alerts only</span>
            <span className="block text-gray-500">Only send abnormal entries (e.g. a motor current above its max, or a Not OK answer). Applies to every department except HBM.</span>
          </span>
        </label>

        <Department title="HBM Checksheets" total={hbmSheets.length} selectedCount={hbm.size} defaultOpen>
          <div className="flex justify-end mb-1.5">
            <button type="button" onClick={() => setHbm(hbmAll ? new Set() : new Set(hbmSheets.map((t) => t.key)))}
              className="text-xs text-blue-600 hover:underline font-medium">{hbmAll ? 'Deselect All' : 'Select All'}</button>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {hbmSheets.map(({ key, label }) => (
              <SheetChip key={key} label={label} checked={hbm.has(key)} onChange={() => flip(setHbm)(key)} />
            ))}
          </div>
        </Department>

        <Department title="SMS Checksheets" total={smsSheets.length} selectedCount={countIn(smsSheets)} defaultOpen>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] text-gray-500">Admin receives all of these automatically</span>
            <button type="button" onClick={() => setSms(smsAll ? new Set() : new Set(smsSheets.map((t) => t.key)))}
              className="text-xs text-blue-600 hover:underline font-medium">{smsAll ? 'Deselect All' : 'Select All'}</button>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {smsSheets.map(({ key, label }) => (
              <SheetChip key={key} tone="amber" label={label} checked={sms.has(key)}
                onChange={() => flip(setSms)(key)} />
            ))}
          </div>
        </Department>

        {[
          { code: 'hsm', name: 'HSM Checksheets' },
          { code: 'ptm', name: 'PTM Checksheets' },
          { code: 'crane', name: 'Crane Maintenance' },
        ].map(({ code, name }) => {
          const list = extraSheets[code] || [];
          const allOn = list.length > 0 && list.every((t) => sms.has(t.key));
          return (
            <Department key={code} title={name} total={list.length} selectedCount={countIn(list)}>
              <div className="flex justify-end mb-1.5">
                <button type="button"
                  onClick={() => setSms((prev) => {
                    const next = new Set(prev);
                    list.forEach((t) => (allOn ? next.delete(t.key) : next.add(t.key)));
                    return next;
                  })}
                  className="text-xs text-blue-600 hover:underline font-medium">{allOn ? 'Deselect All' : 'Select All'}</button>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {list.map(({ key, label }) => (
                  <SheetChip key={key} label={label} checked={sms.has(key)} onChange={() => flip(setSms)(key)} />
                ))}
                {list.length === 0 && <p className="text-xs text-gray-400 col-span-2">No sheets found.</p>}
              </div>
            </Department>
          );
        })}
      </div>

      <div className="flex gap-2">
        <button type="button" onClick={handleSave} disabled={saving}
          className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors">
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button type="button" onClick={onClose}
          className="px-4 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg transition-colors">
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Subscription Pills (read-only) ──────────────────────────────────────────
function SubscriptionPills({ checksheetTypes, hbmSheets }) {
  if (!checksheetTypes) {
    return (
      <span className="inline-block mt-1.5 text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold">
        All HBM sheets
      </span>
    );
  }
  if (checksheetTypes.length === 0 || (checksheetTypes.length === 1 && checksheetTypes[0] === '__none__')) {
    return (
      <span className="inline-block mt-1.5 text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-semibold">
        No HBM sheets
      </span>
    );
  }
  return (
    <div className="flex flex-wrap gap-1 mt-1.5">
      {checksheetTypes.map(key => {
        const found = hbmSheets.find(t => t.key === key);
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
  const [extraSheets, setExtraSheets] = useState({});
  const [hbmSheets, setHbmSheets] = useState(ALL_CHECKSHEET_TYPES);
  const [smsSheets, setSmsSheets] = useState(FALLBACK_SMS_SHEETS);
  const [sending, setSending]           = useState(false);
  const [sendResult, setSendResult]     = useState(null);
  const [notifDate, setNotifDate]       = useState(new Date().toLocaleDateString('en-CA'));
  const [sendingSummary, setSendingSummary] = useState(false);

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

  // Live list of notifiable sheets (HBM + SMS) from the backend
  useEffect(() => {
    telegramAPI.getSheets().then((res) => {
      if (Array.isArray(res.hbm) && res.hbm.length) setHbmSheets(res.hbm);
      if (Array.isArray(res.sms) && res.sms.length) setSmsSheets(res.sms);
      setExtraSheets({ hsm: res.hsm || [], ptm: res.ptm || [], crane: res.crane || [] });
    }).catch(() => {});
  }, []);

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
      // HBM sheets, then SMS / HSM / PTM sheets and Crane inspections of the same day
      const hbm = await hbmAPI.sendDailyNotifications(notifDate);
      let others = { sent: [], skipped: [], failed: [] };
      try {
        const res = await telegramAPI.sendDateNotifications({ date: notifDate });
        others = res.results || others;
      } catch {
        others.failed.push('SMS / HSM / PTM / Crane');
      }
      const merged = {
        sent: [...hbm.results.sent, ...others.sent],
        skipped: [...hbm.results.skipped, ...others.skipped],
        failed: [...hbm.results.failed, ...others.failed],
      };
      setSendResult(merged);
      const { sent, skipped, failed } = merged;
      if (failed.length === 0) toast.success(`Sent ${sent.length} notifications, ${skipped.length} not filled that day`);
      else toast.warn(`Sent ${sent.length}, skipped ${skipped.length}, failed ${failed.length}`);
    } catch {
      toast.error('Failed to send notifications');
    } finally {
      setSending(false);
    }
  };

  const handleSendStatusSummary = async () => {
    setSendingSummary(true);
    try {
      await hbmAPI.sendStatusSummary(notifDate);
      // also the SMS / HSM / PTM tables
      try {
        await telegramAPI.sendDeptSummary({ dept: 'all', date: notifDate });
      } catch {
        toast.warn('HBM summary sent, but the SMS / HSM / PTM summaries failed');
      }
      toast.success(`Daily status summary sent for ${new Date(notifDate + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`);
    } catch {
      toast.error('Failed to send status summary');
    } finally {
      setSendingSummary(false);
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
          Pick a date and send Telegram notifications for every sheet filled on that day — HBM, SMS, HSM, PTM and Crane inspections. Only the latest submission per sheet is sent.
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
        <div className="flex gap-2">
        <button
          onClick={handleSendDailyNotifications}
          disabled={sending || !notifDate}
          className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
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
        <button
          onClick={handleSendStatusSummary}
          disabled={sendingSummary || !notifDate}
          title="Send sheet-wise filled/not-filled status summary"
          className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
        >
          {sendingSummary ? (
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Send Status Summary
            </>
          )}
        </button>
        </div>

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
                    <SubscriptionPills checksheetTypes={r.checksheet_types} hbmSheets={hbmSheets} />
                    {/* SMS options summary */}
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {r.is_admin && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-semibold">Admin · gets everything</span>
                      )}
                      {!r.is_admin && r.alerts_only && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold">Alerts only</span>
                      )}
                      {!r.is_admin && (r.sms_sheets || []).length > 0 && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-medium">
                          {r.sms_sheets.length} sheet{r.sms_sheets.length > 1 ? 's' : ''} (SMS / HSM / PTM / Crane)
                        </span>
                      )}
                    </div>
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
                      Notifications
                    </button>
                    <button onClick={() => handleDelete(r.id)}
                      className="text-xs px-2.5 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 font-medium">
                      Delete
                    </button>
                  </div>
                </div>

                {/* Inline subscription editor */}
                {editingId === r.id && (
                  <RecipientEditor
                    recipient={r}
                    hbmSheets={hbmSheets}
                    smsSheets={smsSheets}
                    extraSheets={extraSheets}
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
