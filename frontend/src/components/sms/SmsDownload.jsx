import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import * as XLSX from 'xlsx';
import { SMS_DOWNLOAD_SHEETS, flattenRecord, monthRange } from './smsDownloadConfig';

const inputCls =
  'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400';

const todayISO = () => new Date().toISOString().slice(0, 10);

export default function SmsDownload() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const sheet = SMS_DOWNLOAD_SHEETS[params.get('type')];
  const monthly = params.get('mode') === 'monthly';
  const [date, setDate] = useState(todayISO());
  const [month, setMonth] = useState(todayISO().slice(0, 7));
  const [busy, setBusy] = useState(false);

  if (!sheet) {
    return (
      <div className="max-w-xl mx-auto px-4 py-10 text-center text-gray-500">
        Unknown sheet. <Link to="/sms/dashboard" className="text-amber-700 font-semibold">Back to Dashboard</Link>
      </div>
    );
  }

  const handleDownload = async () => {
    setBusy(true);
    try {
      const range = monthly ? monthRange(month) : { date_from: date, date_to: date };
      const listRes = await sheet.list(range);
      const ids = (listRes?.data || []).map((r) => r.id);
      if (!ids.length) {
        toast.info(`No ${sheet.label} records found for ${monthly ? month : date}`);
        return;
      }
      // Fetch the full records a few at a time
      const rows = [];
      for (let i = 0; i < ids.length; i += 10) {
        const batch = await Promise.all(ids.slice(i, i + 10).map((id) => sheet.get(id)));
        batch.forEach((res) => rows.push(flattenRecord(res?.data || res)));
      }
      // Union of columns, in first-seen order, so records with different columns still line up
      const columns = [];
      rows.forEach((r) => Object.keys(r).forEach((k) => { if (!columns.includes(k)) columns.push(k); }));
      const ws = XLSX.utils.json_to_sheet(rows, { header: columns });
      ws['!cols'] = columns.map((c) => ({ wch: Math.min(Math.max(c.length + 2, 12), 40) }));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, sheet.label.replace(/[\\/?*[\]:]/g, ' ').slice(0, 31));
      XLSX.writeFile(wb, `${sheet.label.replace(/[^\w-]+/g, '_')}_${monthly ? month : date}.xlsx`);
      toast.success(`${rows.length} record${rows.length === 1 ? '' : 's'} downloaded`);
    } catch {
      toast.error('Failed to download report');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-xl mx-auto">
        <button type="button" onClick={() => navigate(-1)} className="text-sm text-gray-500 hover:text-gray-700 mb-1">← Back</button>
        <h1 className="text-2xl font-bold text-gray-900">{monthly ? 'Monthly report' : 'Single date download'}</h1>
        <p className="text-sm text-gray-500 mt-1 mb-5">{sheet.label}</p>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
          {monthly ? (
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Month</label>
              <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className={inputCls} />
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
            </div>
          )}
          <button
            type="button"
            onClick={handleDownload}
            disabled={busy || !(monthly ? month : date)}
            className="w-full px-4 py-2.5 bg-amber-600 text-white rounded-lg text-sm font-semibold hover:bg-amber-700 disabled:opacity-50"
          >
            {busy ? 'Preparing…' : 'Download Excel'}
          </button>
        </div>
      </div>
    </div>
  );
}
