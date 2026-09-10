import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { ptmAPI } from '../../services/api';

const fmt = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', weekday: 'short' }) : '-';

const fmtMinutes = (min) => {
  const total = parseInt(min) || 0;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h === 0 ? `${m}m` : `${h}h ${m}m`;
};

// Autocomplete for reason search (portal-based, mirrors PtmBreakdownForm's ReasonAutocomplete)
function ReasonSearchAutocomplete({ value, onChange, placeholder }) {
  const [suggestions, setSuggestions] = useState([]);
  const [rect, setRect] = useState(null);
  const debounceRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const hide = (e) => { if (inputRef.current && !inputRef.current.contains(e.target)) setRect(null); };
    document.addEventListener('mousedown', hide);
    return () => document.removeEventListener('mousedown', hide);
  }, []);

  const handleChange = (val) => {
    onChange(val);
    clearTimeout(debounceRef.current);
    if (!val.trim()) { setSuggestions([]); setRect(null); return; }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await ptmAPI.getBreakdownReasons(val);
        const list = res.reasons || [];
        setSuggestions(list);
        if (list.length > 0 && inputRef.current) setRect(inputRef.current.getBoundingClientRect());
        else setRect(null);
      } catch {}
    }, 250);
  };

  const pick = (r) => { onChange(r); setSuggestions([]); setRect(null); };

  const dropdown = rect && suggestions.length > 0 && createPortal(
    <ul style={{ position: 'fixed', top: rect.bottom + 2, left: rect.left, width: rect.width, zIndex: 999999, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.15)', maxHeight: 200, overflowY: 'auto', margin: 0, padding: 0, listStyle: 'none' }}>
      {suggestions.map((r, i) => (
        <li key={i} onMouseDown={e => { e.preventDefault(); pick(r); }}
          style={{ padding: '8px 12px', fontSize: 13, cursor: 'pointer', borderBottom: '1px solid #f3f4f6', color: '#374151' }}
          onMouseEnter={e => e.currentTarget.style.background = '#eff6ff'}
          onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
          {r}
        </li>
      ))}
    </ul>,
    document.body
  );

  return (
    <>
      <input ref={inputRef} type="text" value={value} onChange={e => handleChange(e.target.value)}
        onFocus={() => { if (suggestions.length > 0 && inputRef.current) setRect(inputRef.current.getBoundingClientRect()); }}
        placeholder={placeholder || 'Search reason...'}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
      {dropdown}
    </>
  );
}

function BreakdownAnalytics({ dateFrom, dateTo }) {
  const [mills, setMills] = useState([]);
  const [types, setTypes] = useState([]);
  const [selectedMill, setSelectedMill] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [reasonQuery, setReasonQuery] = useState('');
  const [rangeFrom, setRangeFrom] = useState(dateFrom || '');
  const [rangeTo, setRangeTo] = useState(dateTo || '');
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  // Reset the range whenever a different report is opened (new default month)
  useEffect(() => {
    setRangeFrom(dateFrom || '');
    setRangeTo(dateTo || '');
  }, [dateFrom, dateTo]);

  useEffect(() => {
    Promise.allSettled([ptmAPI.getMills(), ptmAPI.getBreakdownTypes()]).then(([mRes, tRes]) => {
      if (mRes.status === 'fulfilled') setMills((mRes.value.mills || []).filter(m => m.is_active));
      if (tRes.status === 'fulfilled') setTypes((tRes.value.breakdown_types || []).filter(t => t.is_active));
    });
  }, []);

  useEffect(() => {
    setLoading(true);
    ptmAPI.getBreakdownAnalytics({ date_from: rangeFrom || undefined, date_to: rangeTo || undefined, mill: selectedMill || undefined })
      .then(res => setAnalytics(res.data || res))
      .catch(() => toast.error('Failed to load analytics'))
      .finally(() => setLoading(false));
  }, [rangeFrom, rangeTo, selectedMill]);

  const filteredReasons = (analytics?.reasons || []).filter(r =>
    (!selectedType || r.breakdown_type === selectedType) &&
    (!reasonQuery.trim() || r.reason.toLowerCase().includes(reasonQuery.trim().toLowerCase()))
  );
  const topReasons = [...filteredReasons].sort((a, b) => b.minutes - a.minutes).slice(0, 5);
  const mostRepeated = filteredReasons.length ? [...filteredReasons].sort((a, b) => b.count - a.count)[0] : null;
  const filteredByType = selectedType ? (analytics?.byType || []).filter(t => t.breakdown_type === selectedType) : (analytics?.byType || []);
  const filteredByMill = selectedMill ? (analytics?.byMill || []).filter(m => m.slot_label === selectedMill) : (analytics?.byMill || []);
  const maxTrend = Math.max(1, ...((analytics?.trend || []).map(t => t.minutes)));

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-5 space-y-5">
      <h2 className="font-bold text-gray-900 text-sm">
        Analytics {analytics ? `(${fmt(analytics.date_from)} – ${fmt(analytics.date_to)})` : ''}
      </h2>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">From Date</label>
          <input type="date" value={rangeFrom} onChange={e => setRangeFrom(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">To Date</label>
          <input type="date" value={rangeTo} onChange={e => setRangeTo(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Mill</label>
          <select value={selectedMill} onChange={e => setSelectedMill(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white">
            <option value="">All Mills</option>
            {mills.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Breakdown Type</label>
          <select value={selectedType} onChange={e => setSelectedType(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white">
            <option value="">All Types</option>
            {types.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
          </select>
        </div>
        <div className="flex-1 min-w-[220px]">
          <label className="block text-xs font-semibold text-gray-600 mb-1">Search Reason</label>
          <ReasonSearchAutocomplete value={reasonQuery} onChange={setReasonQuery} />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>
      ) : !analytics ? (
        <p className="text-center text-gray-400 py-6 text-sm">No data</p>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-emerald-700">{fmtMinutes(analytics.summary.running_minutes)}</div>
              <div className="text-xs text-emerald-600 font-medium mt-0.5">Running Time</div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-red-600">{fmtMinutes(analytics.summary.breakdown_minutes)}</div>
              <div className="text-xs text-red-500 font-medium mt-0.5">Breakdown Time</div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-blue-700">{analytics.summary.uptime_pct}%</div>
              <div className="text-xs text-blue-600 font-medium mt-0.5">Overall Uptime</div>
            </div>
          </div>

          {/* Most repeated reason */}
          {mostRepeated && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 text-sm text-amber-900">
              <span className="font-semibold">Most Repeated Reason:</span> {mostRepeated.reason}
              <span className="text-amber-600"> ({mostRepeated.breakdown_type})</span>
              {' — '}repeated <strong>{mostRepeated.count}×</strong>, total <strong>{fmtMinutes(mostRepeated.minutes)}</strong>
            </div>
          )}

          {/* Type breakdown */}
          {filteredByType.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">Time by Breakdown Type</h3>
              <div className="space-y-1.5">
                {filteredByType.map(t => (
                  <div key={t.breakdown_type} className="flex items-center gap-2 text-xs">
                    <span className="w-24 shrink-0 truncate text-gray-700 font-medium">{t.breakdown_type}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
                      <div className="h-full bg-orange-400" style={{ width: `${t.pct}%` }} />
                    </div>
                    <span className="w-28 shrink-0 text-right text-gray-500">{fmtMinutes(t.minutes)} · {t.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top reasons leaderboard */}
          <div>
            <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">Top Reasons</h3>
            {topReasons.length === 0 ? (
              <p className="text-xs text-gray-400">No matching reasons</p>
            ) : (
              <div className="space-y-1">
                {topReasons.map((r, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 px-3 py-2 bg-gray-50 rounded-lg text-xs">
                    <div className="min-w-0 flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-gray-200 text-gray-600 font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                      <span className="font-medium text-gray-800 truncate">{r.reason}</span>
                      <span className="text-gray-400">({r.breakdown_type})</span>
                    </div>
                    <span className="shrink-0 text-gray-600">{r.count}× · {fmtMinutes(r.minutes)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Trend chart */}
          {(analytics.trend || []).length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">Day-wise Breakdown Trend</h3>
              <div className="flex items-end gap-1 h-28 overflow-x-auto pb-1">
                {analytics.trend.map(t => (
                  <div key={t.log_date} className="flex flex-col items-center gap-1 shrink-0" style={{ width: 22 }} title={`${fmt(t.log_date)} · ${t.minutes} min`}>
                    <div className="w-3 bg-red-400 rounded-t" style={{ height: `${Math.max(2, (t.minutes / maxTrend) * 90)}px` }} />
                    <span className="text-[9px] text-gray-400">{t.log_date.slice(8, 10)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Mill-wise detail */}
          <div>
            <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">Mill-wise Detail</h3>
            {filteredByMill.length === 0 ? (
              <p className="text-xs text-gray-400">No mill data</p>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                {filteredByMill.map(m => (
                  <div key={m.slot_label} className="border border-gray-200 rounded-xl p-3 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-gray-800 text-sm">{m.slot_label}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${m.efficiency_pct >= 90 ? 'bg-emerald-100 text-emerald-700' : m.efficiency_pct >= 70 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                        {m.efficiency_pct}% efficiency
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 space-y-0.5">
                      <div>Off time: <span className="font-medium text-gray-700">{fmtMinutes(m.breakdown_minutes)}</span></div>
                      <div>Pieces made: <span className="font-medium text-gray-700">{m.total_pieces}</span></div>
                      <div>Avg speed: <span className="font-medium text-gray-700">{m.avg_speed_m_per_min ?? '—'} m/min</span></div>
                      {m.roll_change_count > 0 && (
                        <div>Roll changes: <span className="font-medium text-gray-700">{m.roll_change_count}× ({fmtMinutes(m.roll_change_minutes)})</span></div>
                      )}
                      {m.sizes_run.length > 0 && (
                        <div>Sizes run: <span className="font-medium text-gray-700">{m.sizes_run.join(', ')}</span></div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function BreakdownDetailModal({ logId, onClose }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ptmAPI.getBreakdownLogById(logId)
      .then(res => setDetail(res.data || res))
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false));
  }, [logId]);

  const grandTotal = (detail?.slots || []).reduce(
    (s, slot) => s + (slot.entries || []).reduce((rs, e) => rs + (parseInt(e.breakdown_minutes) || 0), 0), 0
  );

  let monthStart = null, monthEnd = null;
  if (detail?.log_date) {
    const y = parseInt(detail.log_date.slice(0, 4), 10);
    const mo = parseInt(detail.log_date.slice(5, 7), 10);
    const lastDay = new Date(y, mo, 0).getDate();
    monthStart = `${y}-${String(mo).padStart(2, '0')}-01`;
    monthEnd = `${y}-${String(mo).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 overflow-y-auto py-6 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl relative">
        <div className="sticky top-0 bg-white rounded-t-2xl border-b border-gray-200 px-6 py-4 flex items-start justify-between z-10">
          <div>
            <h2 className="text-lg font-bold text-gray-900">PTM Breakdown Report</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {detail ? fmt(detail.log_date) : '—'}
              {detail?.filled_by_name ? ` · ${detail.filled_by_name}` : ''}
            </p>
            {detail && (
              <div className="flex gap-2 mt-2">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${grandTotal > 0 ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'}`}>
                  {grandTotal} min total breakdown
                </span>
              </div>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none font-bold mt-1">×</button>
        </div>

        <div className="px-6 py-5">
          {loading ? (
            <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>
          ) : !detail ? (
            <p className="text-center text-gray-400 py-10">Failed to load</p>
          ) : (detail.slots || []).length === 0 ? (
            <p className="text-center text-gray-400 py-8">No mill data found</p>
          ) : (
            (detail.slots || []).map(slot => {
              const entries = slot.entries || [];
              const slotTotal = entries.reduce((s, e) => s + (parseInt(e.breakdown_minutes) || 0), 0);
              return (
                <div key={slot.id} className="mb-5 border border-gray-100 rounded-xl overflow-hidden">
                  <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
                    <span className="font-bold text-gray-800 text-sm">{slot.slot_label}</span>
                    <div className="flex gap-2 flex-wrap text-xs text-gray-500">
                      {slot.pipe_pieces ? <span>{slot.pipe_pieces} pcs × {slot.pipe_length_m || 6}m</span> : null}
                      {slotTotal > 0 && <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">{slotTotal} min</span>}
                    </div>
                  </div>
                  {entries.length === 0 ? (
                    <p className="text-center text-sm text-gray-400 py-4">No breakdown</p>
                  ) : (
                    <div className="divide-y divide-gray-50">
                      {entries.map(e => (
                        <div key={e.id} className="px-4 py-2.5 text-sm">
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <span className="font-semibold text-gray-700 mr-2">{e.breakdown_type}</span>
                              {e.breakdown_reason && <span className="text-gray-500">{e.breakdown_reason}</span>}
                              {e.repeated_count ? <span className="text-xs text-gray-400 ml-2">×{e.repeated_count}</span> : null}
                            </div>
                            <span className="shrink-0 font-medium text-gray-700">{e.breakdown_minutes || 0} min</span>
                          </div>
                          {(e.size || e.pipe_pieces || e.pipe_length_m || e.production_mt || e.remarks) && (
                            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-500">
                              {e.size && <span>Size: <span className="font-medium text-gray-700">{e.size}</span></span>}
                              {e.pipe_pieces ? <span>Pipes: <span className="font-medium text-gray-700">{e.pipe_pieces}</span></span> : null}
                              {e.pipe_length_m ? <span>Length: <span className="font-medium text-gray-700">{e.pipe_length_m}m</span></span> : null}
                              {e.production_mt ? <span>Prod: <span className="font-medium text-gray-700">{e.production_mt} MT</span></span> : null}
                              {e.remarks && <span className="italic">"{e.remarks}"</span>}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}

          {detail && (
            <div className="mt-6 pt-5 border-t border-gray-200">
              <BreakdownAnalytics dateFrom={monthStart} dateTo={monthEnd} />
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

function LogDetailModal({ logId, onClose }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ptmAPI.getLogById(logId)
      .then(res => setDetail(res.data || res))
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false));
  }, [logId]);

  // Group entries by section
  const sections = {};
  (detail?.entries || []).forEach(e => {
    const sec = e.section_name || 'General';
    if (!sections[sec]) sections[sec] = [];
    sections[sec].push(e);
  });

  const notOkCount = (detail?.entries || []).filter(e => e.status === 'NOT_OK').length;
  const okCount = (detail?.entries || []).filter(e => e.status === 'OK').length;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 overflow-y-auto py-6 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl relative">
        {/* Header */}
        <div className="sticky top-0 bg-white rounded-t-2xl border-b border-gray-200 px-6 py-4 flex items-start justify-between z-10">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{detail?.template_name || 'Checksheet'}</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {detail ? fmt(detail.log_date) : '—'}
              {detail?.shift ? ` · Shift ${detail.shift}` : ''}
              {detail?.filled_by_name ? ` · ${detail.filled_by_name}` : ''}
            </p>
            {detail && (
              <div className="flex gap-2 mt-2">
                <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-medium">{okCount} OK</span>
                {notOkCount > 0 && <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded-full font-medium">{notOkCount} NOT OK</span>}
              </div>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none font-bold mt-1">×</button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          {loading ? (
            <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>
          ) : !detail ? (
            <p className="text-center text-gray-400 py-10">Failed to load</p>
          ) : (
            <>
              {detail.remark && (
                <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-2 text-sm text-yellow-800 italic">
                  Remark: "{detail.remark}"
                </div>
              )}

              {Object.entries(sections).map(([section, entries]) => (
                <div key={section} className="mb-5">
                  <h3 className="text-sm font-bold text-gray-700 mb-2 pb-1 border-b border-gray-100">{section}</h3>
                  <div className="space-y-2">
                    {entries.map(entry => (
                      <div key={entry.id} className={`rounded-xl border p-3 ${entry.status === 'NOT_OK' ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-100'}`}>
                        <div className="flex items-start justify-between gap-3">
                          <span className="text-sm font-medium text-gray-800">{entry.item_name}</span>
                          <div className="flex gap-2 items-center shrink-0">
                            {entry.value_text && <span className="text-sm font-semibold text-gray-700">{entry.value_text}</span>}
                            {entry.status && (
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${entry.status === 'OK' ? 'bg-emerald-200 text-emerald-800' : 'bg-red-200 text-red-800'}`}>
                                {entry.status}
                              </span>
                            )}
                          </div>
                        </div>
                        {(entry.remark || entry.action_taken) && (
                          <div className="mt-2 space-y-1 text-xs">
                            {entry.remark && <div className="text-red-700"><span className="font-semibold">Remark:</span> {entry.remark}</div>}
                            {entry.action_taken && <div className="text-blue-700"><span className="font-semibold">Action:</span> {entry.action_taken}</div>}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {(detail?.entries || []).length === 0 && (
                <p className="text-center text-gray-400 py-8">No entries found</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function PtmChecksheetHistory() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') === 'breakdown' ? 'breakdown' : 'checksheets';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [singleDate, setSingleDate] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [modalLogId, setModalLogId] = useState(null);

  const fetchLogs = async (from, to, tab = activeTab) => {
    setLoading(true);
    try {
      const params = { date_from: from || undefined, date_to: to || undefined, limit: 200 };
      const res = tab === 'breakdown' ? await ptmAPI.getBreakdownLogs(params) : await ptmAPI.getLogs(params);
      setLogs(res.data || res.logs || []);
    } catch {
      toast.error('Failed to load logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLogs(singleDate || dateFrom, singleDate || dateTo, activeTab); }, [activeTab]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setModalLogId(null);
    setSearchParams(tab === 'breakdown' ? { tab: 'breakdown' } : {});
  };

  const handleSingleDate = (date) => {
    setSingleDate(date);
    setDateFrom('');
    setDateTo('');
    fetchLogs(date, date);
  };

  const handleRangeFilter = () => {
    setSingleDate('');
    fetchLogs(dateFrom, dateTo);
  };

  const handleClear = () => {
    setSingleDate('');
    setDateFrom('');
    setDateTo('');
    fetchLogs();
  };

  const typeColor = (type) => {
    if (type === 'dc-motor') return 'bg-blue-100 text-blue-700';
    if (type === 'mechanical') return 'bg-emerald-100 text-emerald-700';
    return 'bg-purple-100 text-purple-700';
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="mb-6">
        <button type="button" onClick={() => navigate('/ptm/dashboard')}
          className="text-sm text-gray-500 hover:text-gray-700 mb-2 flex items-center gap-1">
          ← Back to Dashboard
        </button>
        <h1 className="text-2xl font-bold text-blue-800">PTM Checksheet History</h1>
        <p className="text-gray-500 text-sm mt-1">{logs.length} records found</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5 border-b border-gray-200">
        <button type="button" onClick={() => handleTabChange('checksheets')}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'checksheets' ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
          Checksheets
        </button>
        <button type="button" onClick={() => handleTabChange('breakdown')}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'breakdown' ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
          Breakdown Reports
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-5 space-y-3">
        {/* Single date — quick view */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Quick — View a specific date</label>
          <div className="flex gap-2">
            <input type="date" value={singleDate} onChange={e => handleSingleDate(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            {singleDate && (
              <span className="text-xs self-center text-blue-600 font-medium">Showing: {fmt(singleDate)}</span>
            )}
          </div>
        </div>

        <div className="border-t border-gray-100 pt-3">
          <label className="block text-xs font-semibold text-gray-600 mb-1">Or filter by date range</label>
          <div className="flex flex-wrap gap-2 items-center">
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              placeholder="From"
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            <span className="text-gray-400 text-sm">to</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              placeholder="To"
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            <button onClick={handleRangeFilter} className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-blue-700 font-medium">Filter</button>
            <button onClick={handleClear} className="border border-gray-300 text-gray-600 px-4 py-1.5 rounded-lg text-sm hover:bg-gray-50">Clear</button>
          </div>
        </div>
      </div>

      {/* Log list */}
      {loading ? (
        <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>
      ) : logs.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-4xl mb-3">📋</div>
          <p className="font-medium">{activeTab === 'breakdown' ? 'No breakdown reports found' : 'No checksheets found'}</p>
          {singleDate && <p className="text-sm mt-1">No records for {fmt(singleDate)}</p>}
        </div>
      ) : activeTab === 'breakdown' ? (
        <div className="space-y-2">
          {logs.map(log => (
            <div key={log.id}
              className="bg-white rounded-xl border border-gray-200 hover:border-blue-300 transition-all shadow-sm cursor-pointer"
              onClick={() => setModalLogId(log.id)}>
              <div className="px-4 py-3 flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-800">Breakdown Report</span>
                    {parseInt(log.total_minutes) > 0 ? (
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">{log.total_minutes} min</span>
                    ) : (
                      <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">No BD</span>
                    )}
                  </div>
                  <div className="flex gap-3 mt-1 text-xs text-gray-500 flex-wrap">
                    <span>{fmt(log.log_date)}</span>
                    {log.filled_by_name && <span>by {log.filled_by_name}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-blue-600 font-medium hover:underline">View →</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map(log => (
            <div key={log.id}
              className="bg-white rounded-xl border border-gray-200 hover:border-blue-300 transition-all shadow-sm cursor-pointer"
              onClick={() => setModalLogId(log.id)}>
              <div className="px-4 py-3 flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-800">{log.template_name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeColor(log.template_type)}`}>
                      {log.template_type}
                    </span>
                    {parseInt(log.not_ok_count) > 0 && (
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
                        {log.not_ok_count} NOT OK
                      </span>
                    )}
                  </div>
                  <div className="flex gap-3 mt-1 text-xs text-gray-500 flex-wrap">
                    <span>{fmt(log.log_date)}</span>
                    {log.shift && <span>Shift {log.shift}</span>}
                    {log.filled_by_name && <span>by {log.filled_by_name}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-blue-600 font-medium hover:underline">View →</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Full detail modal */}
      {modalLogId && activeTab === 'breakdown' && <BreakdownDetailModal logId={modalLogId} onClose={() => setModalLogId(null)} />}
      {modalLogId && activeTab === 'checksheets' && <LogDetailModal logId={modalLogId} onClose={() => setModalLogId(null)} />}
    </div>
  );
}
