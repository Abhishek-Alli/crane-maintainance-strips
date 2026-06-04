import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { hbmAPI } from '../../services/api';

const SHEET_TYPES = [
  { value: 'dc-motor',         label: 'DC Motor' },
  { value: 'cooling-bed',      label: 'Cooling Bed' },
  { value: 'mill-mech',        label: 'Mill Mechanical' },
  { value: 'rolling-stand',    label: 'Rolling Stand' },
  { value: 'pumphouse',        label: 'Pumphouse' },
  { value: 'bar-bundle',       label: 'Bar Bundle Area' },
  { value: 'before-rolling',   label: 'Before Rolling' },
  { value: 'oil-level',        label: 'Daily Oil Level' },
  { value: 'dc-motor-airflow', label: 'DC Motor Airflow, Temp & Vibration' },
  { value: 'pump-param',       label: 'Pump Parameter' },
  { value: 'water-param',      label: 'Water Parameters' },
  { value: 'ph-maint',         label: 'PH Maintenance Work Sheet' },
  { value: 'transformer',      label: 'HBM Transformer' },
  { value: 'roughing-gb-temp', label: 'Roughing Stand & GB Bearing Temp' },
  { value: 'breakdown',        label: 'HBM Breakdown Report' },
];

const STATUS_COLS = ['Status', 'TDS Sts', 'Hard Sts', 'pH Sts', 'Temp Sts'];
const NOK_VALS    = ['NOT_OK', 'NOK'];

function StatusBadge({ val }) {
  if (val === null || val === undefined || val === '') return <span className="text-gray-400">—</span>;
  if (NOK_VALS.includes(val))
    return <span className="inline-block px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">NOT OK</span>;
  if (val === 'OFF')
    return <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-500">OFF</span>;
  if (val === 'LOW')
    return <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700">LOW</span>;
  if (val === 'OK')
    return <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">OK</span>;
  return <span className="text-gray-700">{val}</span>;
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtCell(col, val) {
  if (val === null || val === undefined || val === '') return '—';
  return String(val);
}

export default function SheetViewer() {
  const today = new Date().toLocaleDateString('en-CA');
  const [sheetType, setSheetType] = useState('dc-motor');
  const [fromDate, setFromDate]   = useState(today);
  const [toDate, setToDate]       = useState(today);
  const [loading, setLoading]     = useState(false);
  const [result, setResult]       = useState(null);
  const [error, setError]         = useState('');
  const [filter, setFilter]       = useState('');
  const [collapsed, setCollapsed] = useState({});

  const handleSearch = async () => {
    if (!fromDate || !toDate) { setError('Please select both dates'); return; }
    if (fromDate > toDate)    { setError('From date cannot be after To date'); return; }
    setError(''); setLoading(true); setResult(null); setFilter(''); setCollapsed({});
    try {
      const data = await hbmAPI.getSheetView(sheetType, { date_from: fromDate, date_to: toDate });
      // Normalize: convert each row object to an ordered array matching columns
      const keys = data.rows?.length > 0 ? Object.keys(data.rows[0]) : [];
      const normalized = {
        columns: data.columns || [],
        keys,
        rows: (data.rows || []).map(r => keys.map(k => r[k])),
      };
      setResult(normalized);
    } catch (err) {
      console.error('Sheet view error:', err);
      setError('Failed to fetch data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleDate = (d) => setCollapsed(prev => ({ ...prev, [d]: !prev[d] }));

  // Group rows by date (first value in each row array = log_date)
  const grouped = React.useMemo(() => {
    if (!result || !result.rows.length) return [];
    const rows = filter
      ? result.rows.filter(r => r.some(v => String(v ?? '').toLowerCase().includes(filter.toLowerCase())))
      : result.rows;

    const map = {};
    const order = [];
    for (const row of rows) {
      const raw = row[0]; // log_date is always first column
      const dateStr = raw ? String(raw).split('T')[0] : 'Unknown';
      if (!map[dateStr]) { map[dateStr] = []; order.push(dateStr); }
      map[dateStr].push(row.slice(1)); // skip date — shown in group header
    }
    return order.map(d => ({ date: d, rows: map[d] }));
  }, [result, filter]);

  // Columns without the Date column (shown as group header instead)
  const subCols = result ? result.columns.slice(1) : [];

  const totalRows = result?.rows?.length ?? 0;
  const nokCount  = grouped.reduce((acc, g) => acc + g.rows.filter(r => r.some(v => NOK_VALS.includes(v))).length, 0);
  const dateCount = grouped.length;

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-full mx-auto">

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <Link to="/hbm/dashboard"
            className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Sheet Viewer</h1>
            <p className="text-sm text-gray-500">View any HBM sheet date-wise in tabular format</p>
          </div>
        </div>

        {/* Filter bar */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-5">
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-48">
              <label className="block text-xs font-semibold text-gray-500 mb-1">Sheet Type</label>
              <select value={sheetType} onChange={e => { setSheetType(e.target.value); setResult(null); }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white">
                {SHEET_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">From Date</label>
              <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">To Date</label>
              <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
            </div>
            <div className="flex items-end">
              <button onClick={handleSearch} disabled={loading}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold rounded-lg text-sm transition-colors flex items-center gap-2">
                {loading
                  ? <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>Loading…</>
                  : <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>View</>
                }
              </button>
            </div>
          </div>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </div>

        {/* Results */}
        {result && (
          <>
            {/* Stats row */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex gap-2 flex-wrap">
                <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-center shadow-sm">
                  <div className="text-base font-bold text-gray-800">{dateCount}</div>
                  <div className="text-xs text-gray-500">Days</div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-center shadow-sm">
                  <div className="text-base font-bold text-gray-800">{totalRows}</div>
                  <div className="text-xs text-gray-500">Total Rows</div>
                </div>
                {nokCount > 0
                  ? <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-center shadow-sm">
                      <div className="text-base font-bold text-red-600">{nokCount}</div>
                      <div className="text-xs text-red-500">NOT OK</div>
                    </div>
                  : <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-center shadow-sm">
                      <div className="text-base font-bold text-green-600">✓</div>
                      <div className="text-xs text-green-600">All OK</div>
                    </div>
                }
                <button onClick={() => setCollapsed({})}
                  className="text-xs px-3 py-1.5 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50">
                  Expand All
                </button>
                <button onClick={() => {
                  const all = {};
                  grouped.forEach(g => { all[g.date] = true; });
                  setCollapsed(all);
                }} className="text-xs px-3 py-1.5 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50">
                  Collapse All
                </button>
              </div>
              <input type="text" placeholder="Search in results…" value={filter}
                onChange={e => setFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none w-56" />
            </div>

            {grouped.length === 0 ? (
              <div className="bg-white rounded-xl border border-orange-200 p-10 text-center shadow-sm">
                <div className="text-4xl mb-3">📭</div>
                <p className="text-gray-700 font-semibold">No records found</p>
                <p className="text-gray-400 text-sm mt-1">
                  No data for <b>{SHEET_TYPES.find(t => t.value === sheetType)?.label}</b> between{' '}
                  {fromDate} and {toDate}{filter ? ` matching "${filter}"` : ''}.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {grouped.map(({ date, rows: dateRows }) => {
                  const isOpen   = !collapsed[date];
                  const dateNok  = dateRows.filter(r => r.some(v => NOK_VALS.includes(v))).length;
                  const dateOk   = dateRows.length - dateNok;

                  return (
                    <div key={date} className={`bg-white rounded-xl border shadow-sm overflow-hidden ${dateNok > 0 ? 'border-red-200' : 'border-gray-200'}`}>

                      {/* Date header — clickable to collapse */}
                      <button onClick={() => toggleDate(date)}
                        className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors ${dateNok > 0 ? 'bg-red-50 hover:bg-red-100' : 'bg-emerald-50 hover:bg-emerald-100'}`}>
                        <div className="flex items-center gap-3">
                          <span className={`text-sm font-bold ${dateNok > 0 ? 'text-red-800' : 'text-emerald-800'}`}>
                            📅 {fmtDate(date)}
                          </span>
                          <span className="text-xs text-gray-500">{dateRows.length} rows</span>
                          {dateNok > 0
                            ? <span className="text-xs bg-red-100 text-red-700 font-semibold px-2 py-0.5 rounded-full">
                                {dateNok} NOT OK
                              </span>
                            : <span className="text-xs bg-green-100 text-green-700 font-semibold px-2 py-0.5 rounded-full">
                                All OK
                              </span>
                          }
                        </div>
                        <span className="text-gray-400 text-xs">{isOpen ? '▲' : '▼'}</span>
                      </button>

                      {/* Table for this date */}
                      {isOpen && (
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs border-collapse">
                            <thead>
                              <tr className="bg-gray-700 text-white">
                                <th className="px-3 py-2 text-left font-semibold whitespace-nowrap border-r border-gray-600">#</th>
                                {subCols.map(col => (
                                  <th key={col} className="px-3 py-2 text-left font-semibold whitespace-nowrap border-r border-gray-600 last:border-r-0">
                                    {col}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {dateRows.map((subVals, ri) => {
                                const isNok = subVals.some(v => NOK_VALS.includes(v));
                                return (
                                  <tr key={ri}
                                    className={`${isNok ? 'bg-red-50' : ri % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-yellow-50 transition-colors`}>
                                    <td className="px-3 py-1.5 text-gray-400 border-r border-gray-100 whitespace-nowrap">{ri + 1}</td>
                                    {subCols.map((col, ci) => {
                                      const val = subVals[ci];
                                      return (
                                        <td key={col} className="px-3 py-1.5 border-r border-gray-100 last:border-r-0 whitespace-nowrap">
                                          {STATUS_COLS.includes(col)
                                            ? <StatusBadge val={val} />
                                            : <span className={NOK_VALS.includes(val) ? 'text-red-700 font-semibold' : 'text-gray-700'}>
                                                {fmtCell(col, val)}
                                              </span>
                                          }
                                        </td>
                                      );
                                    })}
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
