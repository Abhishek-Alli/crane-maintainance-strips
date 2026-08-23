import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { hodAPI } from '../../services/api';
import {
  FM_CHECK_ITEMS,
  FM_GUIDE_CENTERLINE_KEYS,
  statusDisplay,
} from '../hsm/fmDailyConfig';

const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  }) : '—';

/* ──────────────────────────────────────────
   HOD Sign-off Banner (used below the data)
────────────────────────────────────────── */
function HodSignoffBox({ sheetKey, moduleCode, recordId, signoff, onSigned }) {
  const [remark, setRemark] = useState(signoff?.remark || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setRemark(signoff?.remark || '');
  }, [signoff]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await hodAPI.upsertSignoff({
        sheet_key: sheetKey,
        record_id: recordId,
        module_code: moduleCode,
        remark: remark.trim() || null,
      });
      toast.success('Marked as seen by HOD');
      onSigned(res?.data || res);
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to save sign-off');
    } finally {
      setSaving(false);
    }
  };

  if (signoff) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-2">
          <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-sm font-bold text-emerald-700">Seen by HOD</span>
        </div>
        <p className="text-xs text-emerald-600">
          {signoff.seen_by_name} &nbsp;·&nbsp;{' '}
          {new Date(signoff.seen_at).toLocaleString('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
          })}
        </p>
        {signoff.remark && (
          <p className="mt-2 text-sm text-emerald-800 bg-emerald-100 rounded-lg px-3 py-2 whitespace-pre-wrap">
            <span className="font-semibold">Remark: </span>{signoff.remark}
          </p>
        )}

        {/* Allow remark update even after seen */}
        <div className="mt-4 border-t border-emerald-200 pt-3">
          <p className="text-xs font-semibold text-emerald-700 mb-1">Update remark</p>
          <textarea
            rows={2}
            value={remark}
            onChange={e => setRemark(e.target.value)}
            placeholder="Update remark (optional)…"
            className="w-full text-sm border border-emerald-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-400 focus:border-transparent resize-none"
          />
          <button
            onClick={handleSave}
            disabled={saving}
            className="mt-2 px-4 py-1.5 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Update Remark'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
        <span className="text-sm font-bold text-red-700">HOD Review Pending</span>
      </div>
      <textarea
        rows={3}
        value={remark}
        onChange={e => setRemark(e.target.value)}
        placeholder="Add HOD remark (optional)…"
        className="w-full text-sm border border-red-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-400 focus:border-transparent resize-none mb-3"
      />
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-2 bg-red-600 text-white text-sm font-bold rounded-lg hover:bg-red-700 disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Mark as Seen by HOD'}
      </button>
    </div>
  );
}

/* ──────────────────────────────────────────
   FM Daily render
────────────────────────────────────────── */
function FmDailyView({ log }) {
  const items = log.checklist_items || {};
  const guide = log.guide_centerline || {};

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-5">
        <h2 className="text-sm font-bold text-indigo-800 uppercase tracking-wide mb-4 border-b border-indigo-100 pb-2">
          All guide centerline should be check
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {FM_GUIDE_CENTERLINE_KEYS.map(({ key, label }) => (
            <div key={key} className="bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
              <p className="text-[11px] font-semibold text-gray-500 uppercase">{label}</p>
              <p className="text-sm text-gray-900 mt-0.5">{guide[key] || '—'}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-5">
        <div className="px-5 py-3 border-b border-gray-100">
          <h2 className="text-sm font-bold text-indigo-800 uppercase tracking-wide">Checklist</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">#</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Item</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase">Remark</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {FM_CHECK_ITEMS.map(({ key, label }, i) => {
                const row = items[key] || {};
                const st = row.status;
                return (
                  <tr key={key} className="odd:bg-indigo-50/30">
                    <td className="px-4 py-2.5 text-gray-500">{i + 1}</td>
                    <td className="px-4 py-2.5 text-gray-900">{label}</td>
                    <td className="px-4 py-2.5">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                        st === 'OK' ? 'bg-emerald-100 text-emerald-800'
                          : st === 'NOT_OK' ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-500'
                      }`}>
                        {statusDisplay(st)}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-gray-600">{row.remark || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {log.note && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-5">
          <h2 className="text-sm font-bold text-indigo-800 uppercase tracking-wide mb-2">Note</h2>
          <p className="text-sm text-gray-900 whitespace-pre-wrap">{log.note}</p>
        </div>
      )}
    </>
  );
}

/* ──────────────────────────────────────────
   Generic key-value view for other sheets
────────────────────────────────────────── */
function GenericView({ log }) {
  const skip = new Set(['id', 'filled_by', 'created_at', 'updated_at']);

  // Separate flat fields from array/nested fields
  const flat = Object.entries(log).filter(([k, v]) => !skip.has(k) && !Array.isArray(v) && typeof v !== 'object');
  const items = log.items || log.checklist_items || null;

  function formatVal(val) {
    if (val == null) return '—';
    // Date-like strings
    if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val)) {
      const d = new Date(val);
      if (!isNaN(d)) return d.toLocaleDateString('en-IN');
    }
    return String(val);
  }

  return (
    <div className="space-y-4 mb-5">
      {/* Flat fields */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-gray-100">
              {flat.map(([key, val]) => (
                <tr key={key} className="odd:bg-gray-50/50">
                  <td className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase w-48 whitespace-nowrap">
                    {key.replace(/_/g, ' ')}
                  </td>
                  <td className="px-4 py-2.5 text-gray-800">{formatVal(val)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Items table if present */}
      {Array.isArray(items) && items.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Checklist Items</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {Object.keys(items[0]).filter(k => !['id','log_id'].includes(k)).map(k => (
                    <th key={k} className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">
                      {k.replace(/_/g, ' ')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((row, i) => (
                  <tr key={i} className="odd:bg-gray-50/40">
                    {Object.entries(row).filter(([k]) => !['id','log_id'].includes(k)).map(([k, v]) => (
                      <td key={k} className="px-4 py-2 text-gray-700 whitespace-nowrap">{v ?? '—'}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────
   Main component
────────────────────────────────────────── */
// Map sheet key → module code (for signoff scope check)
const SHEET_MODULE = {
  'fm-daily-checklist':   'HSM_CHECKSHEETS',
  'delay-report':         'HSM_CHECKSHEETS',
  'breakdown-analysis':   'HSM_CHECKSHEETS',
  'roll-change-activity': 'HSM_CHECKSHEETS',
  'dc-motor':             'HBM_CHECKSHEETS',
  'rolling-stand':        'HBM_CHECKSHEETS',
  'mill-mech':            'HBM_CHECKSHEETS',
  'cooling-bed':          'HBM_CHECKSHEETS',
  'pumphouse':            'HBM_CHECKSHEETS',
  'bar-bundle':           'HBM_CHECKSHEETS',
  'before-rolling':       'HBM_CHECKSHEETS',
  'pump-param':           'HBM_CHECKSHEETS',
  'water-param':          'HBM_CHECKSHEETS',
  'ph-maint':             'HBM_CHECKSHEETS',
  'transformer':          'HBM_CHECKSHEETS',
  'oil-level':            'HBM_CHECKSHEETS',
  'dc-motor-airflow':     'HBM_CHECKSHEETS',
  'roughing-gb-temp':     'HBM_CHECKSHEETS',
  'breakdown':            'HBM_CHECKSHEETS',
  'checksheet':           'PTM_CHECKSHEETS',
};

// Generic fetch — works for any sheet registered in hodRoutes
const SHEET_FETCH = (sheetKey) => (id) => hodAPI.getById(sheetKey, id);

const SHEET_PDF = (sheetKey) => (id) => hodAPI.downloadPDF(sheetKey, id);


export default function HodSheetView() {
  const { sheetKey, id } = useParams();
  const navigate = useNavigate();

  const [log, setLog] = useState(null);
  const [signoff, setSignoff] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    Promise.all([
      SHEET_FETCH(sheetKey)(id),
      hodAPI.getSignoffs({ sheet: sheetKey, module: SHEET_MODULE[sheetKey] }),
    ])
      .then(([logRes, signoffsRes]) => {
        const logData = logRes?.data || logRes;
        setLog(logData);
        const signoffs = signoffsRes?.data || signoffsRes || [];
        const found = (Array.isArray(signoffs) ? signoffs : []).find(s => String(s.record_id) === String(id));
        setSignoff(found || null);
      })
      .catch(() => {
        toast.error('Failed to load record');
        navigate(`/hod/sheets/${sheetKey}`);
      })
      .finally(() => setLoading(false));
  }, [sheetKey, id, navigate]);

  const handleDownload = async () => {
    const pdfFn = SHEET_PDF(sheetKey);
    setDownloading(true);
    try {
      const res = await pdfFn(id);
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${sheetKey}_${id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to download PDF');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-600" />
      </div>
    );
  }
  if (!log) return null;

  const label = sheetKey.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => navigate(`/hod/sheets/${sheetKey}`)}
          className="text-sm text-gray-500 hover:text-gray-700 mb-3"
        >
          ← Back to list
        </button>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded">
                HOD — View Only
              </span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{label}</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {log.report_date || log.breakdown_date || log.activity_date
                ? formatDate(log.report_date || log.breakdown_date || log.activity_date)
                : `Record #${id}`}
              {log.shift ? ` · Shift ${log.shift}` : ''}
              {log.filled_by_name ? ` · ${log.filled_by_name}` : ''}
            </p>
          </div>
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="px-4 py-2 bg-gray-800 text-white rounded-lg text-sm font-semibold hover:bg-gray-900 disabled:opacity-50 shrink-0"
          >
            {downloading ? 'Preparing…' : 'Download PDF'}
          </button>
        </div>

        {/* Sheet content */}
        {sheetKey === 'fm-daily-checklist' ? (
          <FmDailyView log={log} />
        ) : (
          <GenericView log={log} />
        )}

        {/* HOD Sign-off box */}
        <HodSignoffBox
          sheetKey={sheetKey}
          moduleCode={SHEET_MODULE[sheetKey] || 'HSM_CHECKSHEETS'}
          recordId={parseInt(id, 10)}
          signoff={signoff}
          onSigned={(newSignoff) => setSignoff(newSignoff)}
        />
      </div>
    </div>
  );
}
