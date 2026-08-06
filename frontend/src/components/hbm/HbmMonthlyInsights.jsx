import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { hbmAPI } from '../../services/api';

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const SHEET_KEYS = [
  'dc-motor','rolling-stand','mill-mech','cooling-bed','pumphouse',
  'bar-bundle','before-rolling','pump-param','water-param','ph-maint',
  'transformer','oil-level','dc-motor-airflow','roughing-gb-temp','breakdown',
];

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', weekday: 'short' });
}

// ── Date-wise detail drawer for one sheet ──────────────────────────────────
function SheetDetailDrawer({ sheetKey, label, year, month, onClose }) {
  const [data, setData]   = useState(null);
  const [loading, setLoading] = useState(true);
  // Default to filled days so the panel is never a wall of empty "Not filled" rows
  const [filter, setFilter]   = useState('filled'); // 'filled' | 'issues' | 'not-filled'

  useEffect(() => {
    setLoading(true);
    hbmAPI.getMonthlyDetail(sheetKey, { year, month })
      .then(res => setData(res.data))
      .catch(() => toast.error(`Failed to load detail for ${label}`))
      .finally(() => setLoading(false));
  }, [sheetKey, year, month, label]);

  const today = new Date().toISOString().slice(0, 10);

  const totalFilled    = data?.days.filter(d => d.logs.length > 0).length ?? 0;
  const totalNotFilled = data?.days.filter(d => d.logs.length === 0 && d.date <= today).length ?? 0;
  const totalIssues    = data?.days.flatMap(d => d.logs.flatMap(l => l.not_ok_items || [])).length ?? 0;
  const daysInMonth    = data?.days.length ?? 0;

  const filledDays = (data?.days || []).filter(d => d.logs.length > 0).map(({ date, logs }) => {
    const notOkAll = logs.flatMap(l => l.not_ok_items || []);
    return {
      date,
      shift: logs.map(l => l.shift).filter(Boolean).join(', ') || '—',
      filledBy: logs.map(l => l.filled_by).filter(Boolean).join(', ') || '—',
      remarks: logs.map(l => l.remarks).filter(Boolean).join(' | '),
      issues: notOkAll,
      ok: notOkAll.length === 0,
    };
  });

  const issueDays = filledDays.filter(d => !d.ok);
  const notFilledDays = (data?.days || []).filter(d => d.logs.length === 0 && d.date <= today);

  const listDays =
    filter === 'issues' ? issueDays
    : filter === 'not-filled' ? notFilledDays.map(d => ({ date: d.date, notFilled: true }))
    : filledDays;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />

      <div className="w-full max-w-2xl bg-white shadow-2xl flex flex-col max-h-full">
        <div className="bg-emerald-700 text-white px-5 py-4 flex items-start justify-between shrink-0">
          <div>
            <h2 className="text-lg font-bold">{label}</h2>
            <p className="text-emerald-200 text-sm">{MONTH_NAMES[month - 1]} {year}</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 hover:bg-emerald-600 rounded-lg" aria-label="Close">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600" />
          </div>
        ) : !data ? (
          <div className="p-10 text-center text-gray-400 text-sm">Failed to load details</div>
        ) : (
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* Compact month calendar — avoids listing 31 blank rows */}
            <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Month overview</p>
                <p className="text-xs text-gray-500">
                  <span className="text-emerald-600 font-semibold">{totalFilled}</span> filled ·{' '}
                  <span className="text-gray-500 font-semibold">{totalNotFilled}</span> missed ·{' '}
                  <span className={`font-semibold ${totalIssues ? 'text-red-600' : 'text-gray-400'}`}>{totalIssues}</span> issues
                </p>
              </div>
              <div className="grid grid-cols-7 gap-1.5">
                {['S','M','T','W','T','F','S'].map((d, i) => (
                  <div key={i} className="text-[10px] text-center text-gray-400 font-semibold py-0.5">{d}</div>
                ))}
                {(() => {
                  const first = new Date(year, month - 1, 1).getDay();
                  const cells = [];
                  for (let i = 0; i < first; i++) cells.push(<div key={`e${i}`} />);
                  for (let day = 1; day <= daysInMonth; day++) {
                    const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const entry = data.days.find(d => d.date === date);
                    const filled = (entry?.logs?.length || 0) > 0;
                    const hasIssue = filled && (entry.logs || []).some(l => (l.not_ok_items || []).length > 0);
                    const isPast = date <= today;
                    const isFuture = date > today;
                    let cls = 'bg-gray-100 text-gray-400';
                    if (isFuture) cls = 'bg-white border border-dashed border-gray-200 text-gray-300';
                    else if (hasIssue) cls = 'bg-red-500 text-white';
                    else if (filled) cls = 'bg-emerald-500 text-white';
                    else if (isPast) cls = 'bg-red-100 text-red-700';
                    cells.push(
                      <div
                        key={date}
                        title={`${formatDate(date)}: ${hasIssue ? 'Issues' : filled ? 'Filled' : isPast ? 'Not filled' : 'Future'}`}
                        className={`aspect-square rounded-md text-[11px] font-semibold flex items-center justify-center ${cls}`}
                      >
                        {day}
                      </div>
                    );
                  }
                  return cells;
                })()}
              </div>
              <div className="mt-3 flex flex-wrap gap-3 text-[10px] text-gray-500">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-emerald-500" /> Filled OK</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-red-500" /> Issues</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-red-100" /> Missed</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded border border-dashed border-gray-300" /> Future</span>
              </div>
            </div>

            {/* Filters — filled first */}
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'filled', label: `Filled (${totalFilled})`, active: 'bg-emerald-600 text-white', idle: 'bg-white text-gray-600 border-gray-200' },
                { id: 'issues', label: `Issues (${totalIssues})`, active: 'bg-red-600 text-white', idle: 'bg-white text-gray-600 border-gray-200' },
                { id: 'not-filled', label: `Missed (${totalNotFilled})`, active: 'bg-slate-700 text-white', idle: 'bg-white text-gray-600 border-gray-200' },
              ].map(f => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilter(f.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${filter === f.id ? f.active : f.idle}`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Content list */}
            {listDays.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-6 py-12 text-center">
                <p className="text-sm font-semibold text-gray-600">
                  {filter === 'issues' && 'No issues this month'}
                  {filter === 'not-filled' && 'No missed days (past)'}
                  {filter === 'filled' && 'No submissions this month'}
                </p>
                <p className="text-xs text-gray-400 mt-1">Try another filter or month</p>
              </div>
            ) : filter === 'not-filled' ? (
              <div className="rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-4 py-2.5 bg-slate-50 border-b border-gray-200 text-xs font-semibold text-slate-600">
                  Missed days — compact list
                </div>
                <div className="p-3 flex flex-wrap gap-2">
                  {listDays.map(d => (
                    <span key={d.date} className="text-xs px-2.5 py-1 rounded-md bg-red-50 text-red-700 border border-red-100 font-medium">
                      {formatDate(d.date)}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {listDays.map(day => (
                  <div
                    key={day.date}
                    className={`rounded-xl border p-4 ${day.ok ? 'border-emerald-100 bg-emerald-50/40' : 'border-red-200 bg-red-50/50'}`}
                  >
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <p className="text-sm font-bold text-gray-900">{formatDate(day.date)}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Shift: {day.shift} · By: {day.filledBy}
                        </p>
                      </div>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                        day.ok ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {day.ok ? 'All OK' : `${day.issues.length} NOT OK`}
                      </span>
                    </div>
                    {day.remarks && (
                      <p className="mt-2 text-xs text-gray-600 bg-white/70 rounded-lg px-2.5 py-1.5 border border-gray-100">
                        Remark: {day.remarks}
                      </p>
                    )}
                    {!day.ok && (
                      <div className="mt-3 space-y-2">
                        {day.issues.map((item, i) => (
                          <div key={i} className="bg-white rounded-lg border border-red-100 px-3 py-2.5">
                            <p className="text-[10px] text-gray-400 uppercase tracking-wide">{item.section_name || 'Item'}</p>
                            <p className="text-sm font-semibold text-red-800">{item.item_name}</p>
                            <div className="mt-1.5 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                              <div>
                                <span className="text-gray-400">Cause / remark</span>
                                <p className="text-gray-800 mt-0.5">{item.remark || '—'}</p>
                              </div>
                              <div>
                                <span className="text-gray-400">Action taken</span>
                                <p className="text-gray-800 mt-0.5">{item.action_taken || '—'}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main monthly insights page ─────────────────────────────────────────────
export default function HbmMonthlyInsights({ allowedSheets }) {
  const now = new Date();
  const [year, setYear]     = useState(now.getFullYear());
  const [month, setMonth]   = useState(now.getMonth() + 1);
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(false);
  const [drawer, setDrawer] = useState(null); // { key, label }

  const canSeeSheet = (key) => !allowedSheets || allowedSheets.includes(key);

  const fetchInsights = useCallback(async () => {
    setLoading(true);
    try {
      const res = await hbmAPI.getMonthlyInsights({ year, month });
      const raw = res.data;
      if (raw?.sheets && allowedSheets) {
        setData({ ...raw, sheets: raw.sheets.filter(s => allowedSheets.includes(s.key)) });
      } else {
        setData(raw);
      }
    } catch {
      toast.error('Failed to load monthly insights');
    } finally {
      setLoading(false);
    }
  }, [year, month, allowedSheets]);

  useEffect(() => { fetchInsights(); }, [fetchInsights]);

  // Open sheet detail when arriving from dashboard View → Monthly insights (?type=)
  useEffect(() => {
    if (!data?.sheets) return;
    const type = new URLSearchParams(window.location.search).get('type');
    if (!type || !SHEET_KEYS.includes(type) || !canSeeSheet(type)) return;
    const sheet = data.sheets.find(s => s.key === type);
    setDrawer({ key: type, label: sheet?.label || type });
  }, [data, allowedSheets]);

  const prevMonth = () => { if (month === 1) { setMonth(12); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 12) { setMonth(1); setYear(y => y + 1); } else setMonth(m => m + 1); };

  const totalSubmissions = data?.sheets.reduce((s, r) => s + r.total, 0) ?? 0;
  const totalIssues      = data?.sheets.reduce((s, r) => s + r.issues, 0) ?? 0;
  const sheetsWithData   = data?.sheets.filter(r => r.total > 0).length ?? 0;

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="mb-5">
          <Link to="/hbm/dashboard" className="text-emerald-600 hover:underline text-sm">← Dashboard</Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">Monthly Insights</h1>
          <p className="text-sm text-gray-500">Coverage and issues by checksheet — open a row for filled days and problem details</p>
        </div>

        {/* Month Selector */}
        <div className="flex items-center gap-3 mb-5 flex-wrap">
          <button onClick={prevMonth} className="p-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50">
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <select value={month} onChange={e => setMonth(+e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500">
            {MONTH_NAMES.map((n, i) => <option key={i} value={i+1}>{n}</option>)}
          </select>
          <select value={year} onChange={e => setYear(+e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500">
            {Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i).map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <button onClick={nextMonth} className="p-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50">
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <span className="text-base font-semibold text-gray-700">{MONTH_NAMES[month-1]} {year}</span>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600" />
          </div>
        ) : data ? (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
              {[
                { label: 'Total Submissions', value: totalSubmissions, color: 'text-emerald-600' },
                { label: 'Total Issues (NOT OK)', value: totalIssues, color: totalIssues > 0 ? 'text-red-500' : 'text-gray-400' },
                { label: 'Active Checksheets', value: `${sheetsWithData} / ${data.sheets.length}`, color: 'text-blue-600' },
                { label: 'Days in Month', value: data.days_in_month, color: 'text-gray-700' },
              ].map(card => (
                <div key={card.label} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                  <p className="text-xs text-gray-500 mb-1">{card.label}</p>
                  <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
                </div>
              ))}
            </div>

            {/* Per-sheet table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                <h2 className="font-semibold text-gray-800">Checksheet Summary</h2>
                <span className="text-xs text-gray-400">Click a row to see date-wise details</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
                    <tr>
                      <th className="text-left px-5 py-3">Checksheet</th>
                      <th className="text-center px-4 py-3">Submissions</th>
                      <th className="text-center px-4 py-3">Days Filed</th>
                      <th className="text-center px-4 py-3">Coverage</th>
                      <th className="text-center px-4 py-3">Issues</th>
                      <th className="text-left px-4 py-3">Daily Activity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {[...data.sheets].sort((a, b) => (b.total || 0) - (a.total || 0)).map(sheet => {
                      const coverage  = Math.round((sheet.unique_days / data.days_in_month) * 100);
                      const filledSet = new Set(sheet.daily.map(d => String(d.day).slice(0, 10)));
                      const focusType = new URLSearchParams(window.location.search).get('type');
                      const focused = focusType === sheet.key;
                      return (
                        <tr
                          key={sheet.key}
                          onClick={() => setDrawer({ key: sheet.key, label: sheet.label })}
                          className={`hover:bg-emerald-50 cursor-pointer transition-colors group ${focused ? 'bg-emerald-50 ring-1 ring-inset ring-emerald-200' : ''}`}
                        >
                          <td className="px-5 py-3">
                            <span className="font-medium text-gray-800 group-hover:text-emerald-700 transition-colors">
                              {sheet.label}
                            </span>
                            <svg className="inline w-3.5 h-3.5 ml-1.5 text-gray-300 group-hover:text-emerald-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </td>
                          <td className="px-4 py-3 text-center font-semibold">
                            <span className={sheet.total > 0 ? 'text-emerald-600' : 'text-gray-300'}>{sheet.total}</span>
                          </td>
                          <td className="px-4 py-3 text-center text-gray-600">{sheet.unique_days}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-2">
                              <div className="w-16 bg-gray-200 rounded-full h-1.5">
                                <div
                                  className={`h-1.5 rounded-full ${coverage >= 80 ? 'bg-emerald-500' : coverage >= 50 ? 'bg-yellow-400' : sheet.total === 0 ? 'bg-gray-200' : 'bg-red-400'}`}
                                  style={{ width: `${coverage}%` }}
                                />
                              </div>
                              <span className="text-xs text-gray-500 w-8">{coverage}%</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {sheet.issues > 0
                              ? <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">{sheet.issues}</span>
                              : <span className="text-gray-300 text-xs">—</span>}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-0.5 items-end">
                              {Array.from({ length: data.days_in_month }, (_, i) => {
                                const d     = `${year}-${String(month).padStart(2,'0')}-${String(i+1).padStart(2,'0')}`;
                                const filled = filledSet.has(d);
                                const isPast = d <= new Date().toISOString().slice(0, 10);
                                const dayCnt = sheet.daily.find(r => String(r.day).slice(0, 10) === d)?.cnt ?? 0;
                                return (
                                  <div
                                    key={i}
                                    title={`${i+1} ${MONTH_SHORT[month-1]}: ${filled ? `Filled (${dayCnt}x)` : isPast ? 'Not filled' : 'Future'}`}
                                    className={`w-2 rounded-sm transition-colors ${filled ? 'bg-emerald-500 h-5' : isPast ? 'bg-red-200 h-3' : 'bg-gray-100 h-2'}`}
                                  />
                                );
                              })}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Legend */}
            <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1.5"><span className="w-2 h-5 rounded-sm bg-emerald-500 inline-block" /> Filled</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-3 rounded-sm bg-red-200 inline-block" /> Not filled (past)</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-gray-100 inline-block" /> Future</span>
            </div>
          </>
        ) : null}
      </div>

      {/* Date-wise detail drawer */}
      {drawer && (
        <SheetDetailDrawer
          sheetKey={drawer.key}
          label={drawer.label}
          year={year}
          month={month}
          onClose={() => setDrawer(null)}
        />
      )}
    </div>
  );
}
