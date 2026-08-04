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
  const [filter, setFilter]   = useState('all'); // 'all' | 'issues' | 'not-filled'

  useEffect(() => {
    hbmAPI.getMonthlyDetail(sheetKey, { year, month })
      .then(res => setData(res.data))
      .catch(() => toast.error(`Failed to load detail for ${label}`))
      .finally(() => setLoading(false));
  }, [sheetKey, year, month]);

  const today = new Date().toISOString().slice(0, 10);

  // Build flat table rows: one row per date; if filled with issues → extra rows per issue
  const buildRows = () => {
    if (!data) return [];
    const rows = [];
    for (const { date, logs } of data.days) {
      const isPast   = date <= today;
      const isFilled = logs.length > 0;
      const notOkAll = logs.flatMap(l => l.not_ok_items || []);
      const remarks  = logs.map(l => l.remarks).filter(Boolean).join(' | ');
      const shift    = logs.map(l => l.shift).filter(Boolean).join(', ');
      const filledBy = logs.map(l => l.filled_by).filter(Boolean).join(', ');

      if (filter === 'not-filled' && (isFilled || !isPast)) continue;
      if (filter === 'issues' && notOkAll.length === 0) continue;

      if (!isFilled) {
        rows.push({ type: 'not-filled', date, isPast });
      } else if (notOkAll.length === 0) {
        rows.push({ type: 'ok', date, shift, filledBy, remarks });
      } else {
        // First item also carries the date header
        notOkAll.forEach((item, idx) => {
          rows.push({
            type: 'issue',
            date: idx === 0 ? date : null,
            shift: idx === 0 ? shift : null,
            filledBy: idx === 0 ? filledBy : null,
            remarks: idx === 0 ? remarks : null,
            issueCount: idx === 0 ? notOkAll.length : null,
            section: item.section_name,
            item:    item.item_name,
            remark:  item.remark,
            action:  item.action_taken,
            isFirst: idx === 0,
            isLast:  idx === notOkAll.length - 1,
          });
        });
      }
    }
    return rows;
  };

  const rows = buildRows();
  const totalFilled    = data?.days.filter(d => d.logs.length > 0).length ?? 0;
  const totalNotFilled = data?.days.filter(d => d.logs.length === 0 && d.date <= today).length ?? 0;
  const totalIssues    = data?.days.flatMap(d => d.logs.flatMap(l => l.not_ok_items || [])).length ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />

      <div className="w-full max-w-5xl bg-white shadow-2xl overflow-y-auto flex flex-col">

        {/* Sticky header */}
        <div className="sticky top-0 bg-emerald-700 text-white z-10">
          <div className="px-5 py-4 flex items-start justify-between">
            <div>
              <h2 className="text-lg font-bold">{label}</h2>
              <p className="text-emerald-200 text-sm">{MONTH_NAMES[month - 1]} {year} — Date-wise Detail</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-emerald-600 rounded-lg">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Summary chips + filter */}
          {data && (
            <div className="px-5 pb-3 flex items-center gap-3 flex-wrap">
              <button onClick={() => setFilter('all')}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${filter === 'all' ? 'bg-white text-emerald-800' : 'bg-emerald-600 text-emerald-100 hover:bg-emerald-500'}`}>
                All Days ({data.days.length})
              </button>
              <button onClick={() => setFilter('issues')}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${filter === 'issues' ? 'bg-red-100 text-red-800' : 'bg-emerald-600 text-emerald-100 hover:bg-emerald-500'}`}>
                Issues Only ({totalIssues} items)
              </button>
              <button onClick={() => setFilter('not-filled')}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${filter === 'not-filled' ? 'bg-gray-200 text-gray-800' : 'bg-emerald-600 text-emerald-100 hover:bg-emerald-500'}`}>
                Not Filled ({totalNotFilled} days)
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600" />
          </div>
        ) : !data ? null : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead className="sticky top-[104px] z-10">
                <tr className="bg-gray-100 text-gray-600 text-xs uppercase tracking-wide">
                  <th className="text-left px-4 py-2.5 font-semibold w-36 border-b border-gray-200">Date</th>
                  <th className="text-center px-3 py-2.5 font-semibold w-20 border-b border-gray-200">Status</th>
                  <th className="text-center px-3 py-2.5 font-semibold w-20 border-b border-gray-200">Shift</th>
                  <th className="text-left px-3 py-2.5 font-semibold border-b border-gray-200">NOT OK Item</th>
                  <th className="text-left px-3 py-2.5 font-semibold border-b border-gray-200">Remark / Cause</th>
                  <th className="text-left px-3 py-2.5 font-semibold border-b border-gray-200">Action Taken</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-gray-400 text-sm">No data for selected filter</td>
                  </tr>
                )}
                {rows.map((row, idx) => {
                  if (row.type === 'not-filled') {
                    return (
                      <tr key={idx} className="border-b border-gray-100 bg-gray-50">
                        <td className="px-4 py-3 text-gray-500 text-xs font-medium">
                          {formatDate(row.date)}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className="inline-flex items-center gap-1 text-xs text-gray-400 italic">
                            <span className="w-2 h-2 rounded-full bg-gray-300 inline-block" />
                            Not filled
                          </span>
                        </td>
                        <td colSpan={4} className="px-3 py-3 text-gray-300 text-xs">—</td>
                      </tr>
                    );
                  }

                  if (row.type === 'ok') {
                    return (
                      <tr key={idx} className="border-b border-gray-100 hover:bg-emerald-50/40">
                        <td className="px-4 py-3 text-gray-700 text-xs font-medium">
                          {formatDate(row.date)}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                            All OK
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center text-xs text-gray-500">
                          {row.shift || '—'}
                        </td>
                        <td colSpan={2} className="px-3 py-3 text-xs text-gray-500 italic">
                          {row.remarks || '—'}
                        </td>
                        <td className="px-3 py-3 text-xs text-gray-300">—</td>
                      </tr>
                    );
                  }

                  // type === 'issue'
                  return (
                    <tr
                      key={idx}
                      className={`border-b border-red-100 bg-red-50 hover:bg-red-100/60 ${row.isFirst ? 'border-t-2 border-t-red-200' : ''}`}
                    >
                      {/* Date cell — only on first issue row of a date */}
                      <td className={`px-4 py-2.5 align-top text-xs font-semibold text-red-700 ${!row.isFirst ? 'border-l-2 border-l-red-200' : ''}`}>
                        {row.date ? (
                          <>
                            <div>{formatDate(row.date)}</div>
                            {row.issueCount > 0 && (
                              <div className="mt-1 text-[10px] font-normal text-red-400">{row.issueCount} issue{row.issueCount > 1 ? 's' : ''}</div>
                            )}
                            {row.remarks && (
                              <div className="mt-1 text-[10px] font-normal text-gray-500 bg-white/60 rounded px-1 py-0.5">{row.remarks}</div>
                            )}
                          </>
                        ) : null}
                      </td>

                      {/* Status — only on first row */}
                      <td className="px-3 py-2.5 text-center align-top">
                        {row.isFirst && (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 bg-red-100 px-2 py-0.5 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
                            NOT OK
                          </span>
                        )}
                      </td>

                      {/* Shift — only on first row */}
                      <td className="px-3 py-2.5 text-center align-top text-xs text-gray-500">
                        {row.isFirst ? (row.shift || '—') : ''}
                      </td>

                      {/* NOT OK item */}
                      <td className="px-3 py-2.5 align-top">
                        {row.section && (
                          <span className="block text-[10px] text-gray-400 leading-none mb-0.5">{row.section}</span>
                        )}
                        <span className="text-red-800 font-medium text-xs">{row.item}</span>
                      </td>

                      {/* Remark / Cause */}
                      <td className="px-3 py-2.5 align-top text-xs text-gray-700">
                        {row.remark
                          ? <span className="bg-yellow-50 border border-yellow-200 text-yellow-900 rounded px-2 py-1 block">{row.remark}</span>
                          : <span className="text-gray-300 italic">No remark</span>}
                      </td>

                      {/* Action Taken */}
                      <td className="px-3 py-2.5 align-top text-xs text-gray-700">
                        {row.action
                          ? <span className="bg-blue-50 border border-blue-200 text-blue-900 rounded px-2 py-1 block">{row.action}</span>
                          : <span className="text-gray-300 italic">No action recorded</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main monthly insights page ─────────────────────────────────────────────
export default function HbmMonthlyInsights() {
  const now = new Date();
  const [year, setYear]     = useState(now.getFullYear());
  const [month, setMonth]   = useState(now.getMonth() + 1);
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(false);
  const [drawer, setDrawer] = useState(null); // { key, label }

  const fetchInsights = useCallback(async () => {
    setLoading(true);
    try {
      const res = await hbmAPI.getMonthlyInsights({ year, month });
      setData(res.data);
    } catch {
      toast.error('Failed to load monthly insights');
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => { fetchInsights(); }, [fetchInsights]);

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
          <p className="text-sm text-gray-500">Click any checksheet row to see date-wise details, issues, causes and actions</p>
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
                    {data.sheets.map(sheet => {
                      const coverage  = Math.round((sheet.unique_days / data.days_in_month) * 100);
                      const filledSet = new Set(sheet.daily.map(d => String(d.day).slice(0, 10)));
                      return (
                        <tr
                          key={sheet.key}
                          onClick={() => setDrawer({ key: sheet.key, label: sheet.label })}
                          className="hover:bg-emerald-50 cursor-pointer transition-colors group"
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
