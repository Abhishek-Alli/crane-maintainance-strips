import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { ptmAPI } from '../../services/api';

const TYPE_COLORS = [
  { card: 'bg-yellow-50 border-yellow-200', header: 'bg-yellow-100 text-yellow-800', badge: 'bg-yellow-100 text-yellow-800', btn: 'text-yellow-700 hover:text-yellow-900', left: 'border-l-yellow-400', ring: 'focus:ring-yellow-400' },
  { card: 'bg-blue-50 border-blue-200',     header: 'bg-blue-100 text-blue-800',     badge: 'bg-blue-100 text-blue-800',     btn: 'text-blue-700 hover:text-blue-900',   left: 'border-l-blue-400',   ring: 'focus:ring-blue-400'   },
  { card: 'bg-green-50 border-green-200',   header: 'bg-green-100 text-green-800',   badge: 'bg-green-100 text-green-800',   btn: 'text-green-700 hover:text-green-900', left: 'border-l-green-400',  ring: 'focus:ring-green-400'  },
  { card: 'bg-purple-50 border-purple-200', header: 'bg-purple-100 text-purple-800', badge: 'bg-purple-100 text-purple-800', btn: 'text-purple-700 hover:text-purple-900',left: 'border-l-purple-400', ring: 'focus:ring-purple-400' },
  { card: 'bg-orange-50 border-orange-200', header: 'bg-orange-100 text-orange-800', badge: 'bg-orange-100 text-orange-800', btn: 'text-orange-700 hover:text-orange-900',left: 'border-l-orange-400', ring: 'focus:ring-orange-400' },
  { card: 'bg-pink-50 border-pink-200',     header: 'bg-pink-100 text-pink-800',     badge: 'bg-pink-100 text-pink-800',     btn: 'text-pink-700 hover:text-pink-900',   left: 'border-l-pink-400',   ring: 'focus:ring-pink-400'   },
];

const emptyRow = () => ({ breakdown_reason: '', from_size: '', to_size: '', breakdown_minutes: '', repeated_count: '' });

// Autocomplete for reason (portal-based)
function ReasonAutocomplete({ value, onChange }) {
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
        placeholder="Type reason..." className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
      {dropdown}
    </>
  );
}

export default function PtmBreakdownForm() {
  const TOTAL_MINUTES = 1440; // 24 hours

  const navigate = useNavigate();
  const [logDate, setLogDate] = useState(new Date().toLocaleDateString('en-CA'));
  const [mills, setMills] = useState([]);
  const [breakdownTypes, setBreakdownTypes] = useState([]);
  const [sizes, setSizes] = useState([]);
  const [millData, setMillData] = useState({});
  // Per-mill production fields: { millId: { pieces, pipeLength } }
  const [millProduction, setMillProduction] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Load config from DB
  useEffect(() => {
    Promise.all([ptmAPI.getMills(), ptmAPI.getBreakdownTypes(), ptmAPI.getSizes()])
      .then(([mRes, tRes, sRes]) => {
        const activeMills = (mRes.mills || []).filter(m => m.is_active);
        const activeTypes = (tRes.breakdown_types || []).filter(t => t.is_active);
        const activeSizes = (sRes.sizes || []).filter(s => s.is_active);
        setMills(activeMills);
        setBreakdownTypes(activeTypes);
        setSizes(activeSizes);
        const data = {};
        const prod = {};
        activeMills.forEach(m => {
          data[m.id] = {};
          activeTypes.forEach(t => { data[m.id][t.id] = { enabled: false, rows: [emptyRow()] }; });
          prod[m.id] = { pieces: '', pipeLength: 6 };
        });
        setMillData(data);
        setMillProduction(prod);
        setLoading(false);
      })
      .catch(() => { toast.error('Failed to load config'); setLoading(false); });
  }, []);

  const updateProduction = (millId, field, val) => {
    setMillProduction(prev => ({ ...prev, [millId]: { ...prev[millId], [field]: val } }));
  };

  const getMillStats = (millId) => {
    const breakdownMins = breakdownTypes.reduce((s, t) => {
      const td = millData[millId]?.[t.id];
      if (!td?.enabled) return s;
      return s + (td.rows || []).reduce((rs, r) => rs + (parseInt(r.breakdown_minutes) || 0), 0);
    }, 0);
    const runtime = TOTAL_MINUTES - breakdownMins;
    const prod = millProduction[millId] || {};
    const pieces = parseInt(prod.pieces) || 0;
    const pipeLength = parseFloat(prod.pipeLength) || 6;
    const totalMeters = pieces * pipeLength;
    const speed = runtime > 0 && pieces > 0 ? (totalMeters / runtime).toFixed(2) : null;
    return { breakdownMins, runtime, pieces, pipeLength, totalMeters, speed };
  };

  const toggleType = (millId, typeId) => {
    setMillData(prev => {
      const cur = prev[millId][typeId];
      return { ...prev, [millId]: { ...prev[millId], [typeId]: { enabled: !cur.enabled, rows: [emptyRow()] } } };
    });
  };

  const updateRow = (millId, typeId, rowIdx, field, val) => {
    setMillData(prev => {
      const rows = prev[millId][typeId].rows.map((r, i) => i === rowIdx ? { ...r, [field]: val } : r);
      return { ...prev, [millId]: { ...prev[millId], [typeId]: { ...prev[millId][typeId], rows } } };
    });
  };

  const addRow = (millId, typeId) => {
    setMillData(prev => {
      const rows = [...prev[millId][typeId].rows, emptyRow()];
      return { ...prev, [millId]: { ...prev[millId], [typeId]: { ...prev[millId][typeId], rows } } };
    });
  };

  const removeRow = (millId, typeId, rowIdx) => {
    setMillData(prev => {
      const rows = prev[millId][typeId].rows.filter((_, i) => i !== rowIdx);
      return { ...prev, [millId]: { ...prev[millId], [typeId]: { ...prev[millId][typeId], rows: rows.length ? rows : [emptyRow()] } } };
    });
  };

  // Summary totals per type across all mills (safe: millData may be empty during first render)
  const totals = breakdownTypes.reduce((acc, t) => {
    acc[t.id] = mills.reduce((s, m) => {
      const td = millData[m.id]?.[t.id];
      if (!td?.enabled) return s;
      return s + (td.rows || []).reduce((rs, r) => rs + (parseInt(r.breakdown_minutes) || 0), 0);
    }, 0);
    return acc;
  }, {});
  const grandTotal = Object.values(totals).reduce((a, v) => a + v, 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!logDate) return toast.error('Date is required');
    setSubmitting(true);
    try {
      const slots = mills.map(m => {
        const entries = breakdownTypes.flatMap(t => {
          const td = millData[m.id]?.[t.id];
          if (!td?.enabled) return [];
          return td.rows
            .filter(r => t.has_size_change ? (r.from_size || r.to_size || r.breakdown_minutes) : (r.breakdown_reason || r.breakdown_minutes))
            .map(r => ({
              breakdown_type: t.name,
              breakdown_minutes: parseInt(r.breakdown_minutes) || 0,
              breakdown_reason: t.has_size_change
                ? (r.from_size || r.to_size ? `${r.from_size || '?'} → ${r.to_size || '?'}` : null)
                : (r.breakdown_reason || null),
              repeated_count: r.repeated_count ? parseInt(r.repeated_count) : null,
            }));
        });
        const prod = millProduction[m.id] || {};
        return {
          slot_label: m.name, slot_order: m.display_order, miss_roll: 0, entries,
          pipe_pieces: parseInt(prod.pieces) || null,
          pipe_length_m: parseFloat(prod.pipeLength) || 6,
        };
      });
      await ptmAPI.createBreakdownLog({ log_date: logDate, size: null, slots });
      toast.success('Breakdown report submitted');
      navigate('/ptm/checksheet/history');
    } catch (err) {
      toast.error(err?.message || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-500">Loading config...</div>;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="mb-6">
        <button type="button" onClick={() => navigate('/ptm/dashboard')}
          className="text-sm text-gray-500 hover:text-gray-700 mb-2 flex items-center gap-1">
          ← Back to Dashboard
        </button>
        <h1 className="text-2xl font-bold text-blue-800">PTM Breakdown Report</h1>
        <p className="text-gray-500 text-sm mt-1">Select breakdown types per mill and add details</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Date */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <label className="block text-sm font-semibold text-gray-700 mb-1">Date <span className="text-red-500">*</span></label>
          <input type="date" value={logDate} onChange={e => setLogDate(e.target.value)}
            className="w-full max-w-xs border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </div>

        {/* Summary */}
        {grandTotal > 0 && (
          <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
            <h3 className="font-semibold text-blue-800 mb-3 text-sm">Total Breakdown (minutes)</h3>
            <div className="flex flex-wrap gap-3">
              {breakdownTypes.map(t => (
                <div key={t.id} className="bg-white rounded-lg px-4 py-2 text-center shadow-sm min-w-[100px]">
                  <div className="text-xs text-gray-500">{t.name}</div>
                  <div className={`font-bold text-lg ${totals[t.id] > 0 ? 'text-red-600' : 'text-gray-300'}`}>{totals[t.id]}</div>
                </div>
              ))}
              <div className="bg-blue-700 text-white rounded-lg px-4 py-2 text-center shadow-sm min-w-[100px]">
                <div className="text-xs opacity-80">TOTAL</div>
                <div className="font-bold text-lg">{grandTotal}</div>
              </div>
            </div>
          </div>
        )}

        {/* Mills */}
        {mills.map(mill => {
          const millTotal = breakdownTypes.reduce((s, t) => {
            const _td = millData[mill.id]?.[t.id];
            if (!_td?.enabled) return s;
            return s + (_td.rows || []).reduce((rs, r) => rs + (parseInt(r.breakdown_minutes) || 0), 0);
          }, 0);
          const anyEnabled = breakdownTypes.some(t => millData[mill.id]?.[t.id]?.enabled);

          return (
            <div key={mill.id} className={`bg-white rounded-xl border shadow-sm overflow-hidden ${anyEnabled ? 'border-orange-300' : 'border-gray-200'}`}>
              {/* Mill header */}
              <div className={`px-5 py-3 flex items-center justify-between border-b flex-wrap gap-2 ${anyEnabled ? 'bg-orange-50 border-orange-100' : 'bg-gray-50 border-gray-100'}`}>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-gray-800 text-base">{mill.name}</span>
                  {millTotal > 0 && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">{millTotal} min total</span>}
                </div>
                <div className="flex flex-wrap gap-2">
                  {breakdownTypes.map((t, ti) => {
                    const s = TYPE_COLORS[ti % TYPE_COLORS.length];
                    const active = millData[mill.id]?.[t.id]?.enabled;
                    return (
                      <button key={t.id} type="button" onClick={() => toggleType(mill.id, t.id)}
                        className={`text-xs px-3 py-1.5 rounded-lg font-semibold border transition-colors ${active ? s.header + ' border-transparent shadow-sm' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}>
                        {t.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {!anyEnabled && (
                <p className="text-center text-sm text-gray-400 py-5">No breakdown — click a type above to add</p>
              )}

              {breakdownTypes.filter(t => millData[mill.id]?.[t.id]?.enabled).map((type, ti) => {
                const colorIdx = breakdownTypes.findIndex(t => t.id === type.id) % TYPE_COLORS.length;
                const s = TYPE_COLORS[colorIdx];
                const td = millData[mill.id]?.[type.id] || { rows: [] };
                const typeTotal = td.rows.reduce((sum, r) => sum + (parseInt(r.breakdown_minutes) || 0), 0);

                return (
                  <div key={type.id} className={`border-t ${s.card} border-l-4 ${s.left}`}>
                    <div className="flex items-center justify-between px-5 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${s.badge}`}>{type.name}</span>
                        {typeTotal > 0 && <span className="text-xs text-gray-500">{typeTotal} min</span>}
                      </div>
                      <button type="button" onClick={() => addRow(mill.id, type.id)} className={`text-xs font-semibold ${s.btn}`}>
                        {type.has_size_change ? '+ Add Roll Change' : '+ Add Reason'}
                      </button>
                    </div>

                    {/* Column headers */}
                    <div className="grid grid-cols-12 gap-2 px-5 pb-1 text-xs font-semibold text-gray-500">
                      {type.has_size_change ? (
                        <>
                          <div className="col-span-2">From Size</div>
                          <div className="col-span-1 text-center">→</div>
                          <div className="col-span-2">To Size</div>
                        </>
                      ) : (
                        <div className="col-span-5">Reason</div>
                      )}
                      <div className="col-span-3">Time (minutes)</div>
                      <div className="col-span-3">Times Repeated <span className="font-normal text-gray-400">(optional)</span></div>
                      <div className="col-span-1"></div>
                    </div>

                    {/* Rows */}
                    <div className="px-5 pb-4 space-y-2">
                      {td.rows.map((row, rowIdx) => (
                        <div key={rowIdx} className="grid grid-cols-12 gap-2 items-center">
                          {type.has_size_change ? (
                            <>
                              <div className="col-span-2">
                                <select value={row.from_size} onChange={e => updateRow(mill.id, type.id, rowIdx, 'from_size', e.target.value)}
                                  className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white">
                                  <option value="">From</option>
                                  {sizes.map(s => <option key={s.id} value={s.size_label}>{s.size_label}</option>)}
                                </select>
                              </div>
                              <div className="col-span-1 text-center text-gray-400 font-bold">→</div>
                              <div className="col-span-2">
                                <select value={row.to_size} onChange={e => updateRow(mill.id, type.id, rowIdx, 'to_size', e.target.value)}
                                  className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white">
                                  <option value="">To</option>
                                  {sizes.map(s => <option key={s.id} value={s.size_label}>{s.size_label}</option>)}
                                </select>
                              </div>
                            </>
                          ) : (
                            <div className="col-span-5">
                              <ReasonAutocomplete value={row.breakdown_reason}
                                onChange={val => updateRow(mill.id, type.id, rowIdx, 'breakdown_reason', val)} />
                            </div>
                          )}
                          <div className="col-span-3">
                            <input type="number" min="0" value={row.breakdown_minutes}
                              onChange={e => updateRow(mill.id, type.id, rowIdx, 'breakdown_minutes', e.target.value)}
                              placeholder="0"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                          </div>
                          <div className="col-span-3">
                            <input type="number" min="1" value={row.repeated_count}
                              onChange={e => updateRow(mill.id, type.id, rowIdx, 'repeated_count', e.target.value)}
                              placeholder="—"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                          </div>
                          <div className="col-span-1 flex justify-center">
                            {td.rows.length > 1 && (
                              <button type="button" onClick={() => removeRow(mill.id, type.id, rowIdx)}
                                className="text-red-400 hover:text-red-600 text-lg font-bold leading-none">×</button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}

        {/* Production Summary per Mill */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 bg-gray-50 border-b border-gray-200">
            <h3 className="font-bold text-gray-800">Production Summary</h3>
            <p className="text-xs text-gray-500 mt-0.5">Total shift = {TOTAL_MINUTES} min (24 hrs)</p>
          </div>
          <div className="p-5 space-y-4">
            {mills.map(mill => {
              const stats = getMillStats(mill.id);
              const prod = millProduction[mill.id] || {};
              return (
                <div key={mill.id} className="border border-gray-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-800">{mill.name}</span>
                    <div className="flex gap-4 text-sm">
                      <span className="text-gray-500">Total: <strong className="text-gray-800">{TOTAL_MINUTES} min</strong></span>
                      <span className="text-red-600">Breakdown: <strong>{stats.breakdownMins} min</strong></span>
                      <span className="text-green-700">Runtime: <strong>{stats.runtime} min</strong></span>
                    </div>
                  </div>

                  {/* Stat cards */}
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="text-xs text-gray-500">Total Time</div>
                      <div className="font-bold text-gray-800 text-lg">{TOTAL_MINUTES}</div>
                      <div className="text-xs text-gray-400">min</div>
                    </div>
                    <div className="bg-red-50 rounded-lg p-3">
                      <div className="text-xs text-red-500">Breakdown Time</div>
                      <div className="font-bold text-red-700 text-lg">{stats.breakdownMins}</div>
                      <div className="text-xs text-red-400">min</div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-3">
                      <div className="text-xs text-green-600">Runtime</div>
                      <div className="font-bold text-green-700 text-lg">{stats.runtime}</div>
                      <div className="text-xs text-green-500">min</div>
                    </div>
                  </div>

                  {/* Inputs row */}
                  <div className="grid grid-cols-2 gap-4 pt-1">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">No. of Pipe Pieces Made</label>
                      <input type="number" min="0" value={prod.pieces}
                        onChange={e => updateProduction(mill.id, 'pieces', e.target.value)}
                        placeholder="0"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">
                        Pipe Length <span className="font-normal text-gray-400">(meters, default 6)</span>
                      </label>
                      <input type="number" min="0.1" step="0.1" value={prod.pipeLength}
                        onChange={e => updateProduction(mill.id, 'pipeLength', e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                    </div>
                  </div>

                  {/* Speed result */}
                  {stats.pieces > 0 && (
                    <div className="bg-blue-50 rounded-lg p-3 flex items-center justify-between">
                      <div className="text-sm text-blue-700">
                        <span className="font-medium">{stats.pieces} pieces × {stats.pipeLength} m = {stats.totalMeters} m</span>
                        <span className="text-blue-400 mx-2">÷</span>
                        <span>{stats.runtime} min runtime</span>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-blue-500">Speed</div>
                        <div className="font-bold text-blue-800 text-xl">
                          {stats.speed ?? '—'} <span className="text-sm font-normal">m/min</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <button type="submit" disabled={submitting}
          className="w-full bg-blue-600 text-white rounded-xl py-3 font-semibold text-lg hover:bg-blue-700 disabled:opacity-50 transition-colors shadow">
          {submitting ? 'Submitting...' : 'Submit Breakdown Report'}
        </button>
      </form>
    </div>
  );
}
