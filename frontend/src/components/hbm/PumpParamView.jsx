import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { hbmAPI } from '../../services/api';
import ResendTelegramButton from './ResendTelegramButton';

// Same groups as the form — used to order display
const GROUP_ORDER = [
  'TMT Water Pump-1', 'TMT Water Pump-2',
  'Mill Water Pump-1', 'Mill Water Pump-2',
  'DCW Pump-1', 'DCW Pump-2', 'DCW Pump-3', 'DCW Pump-4', 'DCW Pump-5',
  'ICW Pump-1', 'ICW Pump-2', 'ICW Pump-3', 'ICW Pump-4', 'ICW Pump-5',
  'LHW Pump-1', 'LHW Pump-2', 'LHW Pump-3', 'LHW Pump-4',
  'LCW Pump-1', 'LCW Pump-2', 'LCW Pump-3',
  'Back Wash Pump',
  'Scale Pit Pump-1', 'Scale Pit Pump-2', 'Scale Pit Pump-3', 'Scale Pit Pump-4',
  'Scale Pit Pump-5', 'Scale Pit Pump-6', 'Scale Pit Pump-7', 'Scale Pit Pump-8',
  'ICW CT Fan-1', 'ICW CT Fan-2', 'ICW CT Fan-3',
  'DCW CT Fan-1', 'DCW CT Fan-2', 'DCW CT Fan-3',
  'LAMINAR CT Fan-1', 'LAMINAR CT Fan-2', 'LAMINAR CT Fan-3',
  'LC SPRAY PUMP-1', 'LC SPRAY PUMP-2',
  'Compressor-1',
  'Compressor-2',
  'TMT CT',
];

// Thresholds lookup
const THRESHOLDS = {
  'TMT Water Pump-1':  { kw: 200, amp: 332, rpm: 1490 },
  'TMT Water Pump-2':  { kw: 200, amp: 332, rpm: 1490 },
  'Mill Water Pump-1': { kw: 90,  amp: 160, rpm: 1487 },
  'Mill Water Pump-2': { kw: 90,  amp: 160, rpm: 1487 },
  'DCW Pump-1':        { kw: 90,  amp: 149, rpm: 1480 },
  'DCW Pump-2':        { kw: 90,  amp: 149, rpm: 1480 },
  'DCW Pump-3':        { kw: 90,  amp: 149, rpm: 1480 },
  'DCW Pump-4':        { kw: 90,  amp: 149, rpm: 1480 },
  'DCW Pump-5':        { kw: 90,  amp: 149, rpm: 1480 },
  'ICW Pump-1':        { kw: 45,  amp: 81,  rpm: 1475 },
  'ICW Pump-2':        { kw: 45,  amp: 81,  rpm: 1475 },
  'ICW Pump-3':        { kw: 45,  amp: 81,  rpm: 1475 },
  'ICW Pump-4':        { kw: 45,  amp: 81,  rpm: 1475 },
  'ICW Pump-5':        { kw: 45,  amp: 81,  rpm: 1475 },
  'LHW Pump-1':        { kw: 55,  amp: 97,  rpm: 1480 },
  'LHW Pump-2':        { kw: 55,  amp: 97,  rpm: 1480 },
  'LHW Pump-3':        { kw: 55,  amp: 97,  rpm: 1480 },
  'LHW Pump-4':        { kw: 55,  amp: 97,  rpm: 1480 },
  'LCW Pump-1':        { kw: 45,  amp: 81,  rpm: 1475 },
  'LCW Pump-2':        { kw: 45,  amp: 81,  rpm: 1475 },
  'LCW Pump-3':        { kw: 45,  amp: 81,  rpm: 1475 },
  'Back Wash Pump':    { kw: 45,  amp: 80,  rpm: 1475 },
  'Scale Pit Pump-1':  { kw: 75,  amp: 126, rpm: 1480 },
  'Scale Pit Pump-2':  { kw: 75,  amp: 126, rpm: 1480 },
  'Scale Pit Pump-3':  { kw: 55,  amp: 97,  rpm: 1480 },
  'Scale Pit Pump-4':  { kw: 55,  amp: 97,  rpm: 1480 },
  'Scale Pit Pump-5':  { kw: 55,  amp: 97,  rpm: 1480 },
  'Scale Pit Pump-6':  { kw: 55,  amp: 97,  rpm: 1480 },
  'Scale Pit Pump-7':  { kw: 55,  amp: 97,  rpm: 1480 },
  'Scale Pit Pump-8':  { kw: 45,  amp: 81,  rpm: 1475 },
  'ICW CT Fan-1':      { kw: 15,  amp: 38,  rpm: 285  },
  'ICW CT Fan-2':      { kw: 15,  amp: 38,  rpm: 285  },
  'ICW CT Fan-3':      { kw: 15,  amp: 38,  rpm: 285  },
  'DCW CT Fan-1':      { kw: 15,  amp: 38,  rpm: 285  },
  'DCW CT Fan-2':      { kw: 15,  amp: 38,  rpm: 285  },
  'DCW CT Fan-3':      { kw: 15,  amp: 38,  rpm: 285  },
  'LAMINAR CT Fan-1':  { kw: 15,  amp: 38,  rpm: 285  },
  'LAMINAR CT Fan-2':  { kw: 15,  amp: 38,  rpm: 285  },
  'LAMINAR CT Fan-3':  { kw: 15,  amp: 38,  rpm: 285  },
  'LC SPRAY PUMP-1':   { kw: 90,  amp: 149, rpm: 1480 },
  'LC SPRAY PUMP-2':   { kw: 90,  amp: 149, rpm: 1480 },
  'Compressor-1':      { kw: 160, amp: 277, rpm: 1489 },
  'Compressor-2':      { kw: 160, amp: 277, rpm: 1489 },
  'TMT CT':            { kw: 15,  amp: 32,  rpm: 410  },
};

const valBadge = (val, max) => {
  if (val == null) return <span className="text-gray-400 text-sm">—</span>;
  const n = parseFloat(val);
  const ok = !isNaN(n) && n <= max;
  return (
    <span className={`text-sm font-semibold ${ok ? 'text-green-700' : 'text-red-700'}`}>
      {val}
      <span className={`ml-1 text-xs px-1.5 py-0.5 rounded-full font-bold ${ok ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
        {ok ? 'OK' : 'HIGH'}
      </span>
    </span>
  );
};

const PumpParamView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [log, setLog] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchLog(); }, []); // eslint-disable-line

  const fetchLog = async () => {
    try {
      const res = await hbmAPI.getPumpParamLogById(id);
      setLog(res.data);
    } catch {
      toast.error('Failed to load Pump Parameter log');
      navigate('/hbm/pump-param/history');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  if (!log) return null;

  const canEdit = log.created_at && (Date.now() - new Date(log.created_at).getTime()) < 24 * 60 * 60 * 1000;

  // Sort entries by GROUP_ORDER
  const sortedEntries = [...(log.entries || [])].sort(
    (a, b) => GROUP_ORDER.indexOf(a.pump_name) - GROUP_ORDER.indexOf(b.pump_name)
  );

  // Count highs
  const highEntries = sortedEntries.filter(e => {
    if (e.status === 'OFF') return false;
    const t = THRESHOLDS[e.pump_name];
    if (!t) return false;
    return (
      (e.amp != null && parseFloat(e.amp) > t.amp) ||
      (e.rpm != null && parseFloat(e.rpm) > t.rpm)
    );
  });

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-5xl mx-auto">

        {/* Page Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <button onClick={() => navigate('/hbm/pump-param/history')}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Pump Parameter Report #{log.id}</h1>
              <p className="text-sm text-gray-500">Section 1 &amp; 2</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canEdit && (
              <button
                onClick={() => navigate(`/hbm/pump-param/new`, { state: { editData: log, editId: log.id } })}
                className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit
              </button>
            )}
            <ResendTelegramButton type="pump-param" id={log.id} />
          </div>
        </div>

        {/* Summary Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-gray-400 uppercase font-semibold">Date</p>
            <p className="font-bold text-gray-900 mt-1">
              {new Date(log.log_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase font-semibold">Size</p>
            <p className="font-bold text-gray-900 mt-1">{log.size_value || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase font-semibold">Filled By</p>
            <p className="font-bold text-gray-900 mt-1">{log.filled_by_name}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase font-semibold">Pumps Recorded</p>
            <p className="font-bold text-gray-900 mt-1">{sortedEntries.length}</p>
          </div>
        </div>

        {/* Status Summary */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className={`rounded-xl border p-4 ${highEntries.length > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
            <p className="text-xs font-semibold text-gray-500 uppercase">Overall Status</p>
            <p className={`text-2xl font-bold mt-1 ${highEntries.length > 0 ? 'text-red-700' : 'text-green-700'}`}>
              {highEntries.length > 0 ? `${highEntries.length} High Values` : 'All Normal'}
            </p>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase">Section 2 Readings</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">{(log.sec2_items || []).length}</p>
          </div>
        </div>

        {/* High Values Alert */}
        {highEntries.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-5 mb-5">
            <h3 className="font-bold text-red-800 mb-3">High Value Alerts</h3>
            <div className="space-y-2">
              {highEntries.map(e => {
                const t = THRESHOLDS[e.pump_name];
                const highs = [];
                if (e.amp != null && parseFloat(e.amp) > t.amp) highs.push(`AMP: ${e.amp} (max ${t.amp})`);
                if (e.rpm != null && parseFloat(e.rpm) > t.rpm) highs.push(`RPM: ${e.rpm} (max ${t.rpm})`);
                return (
                  <div key={e.id} className="bg-white rounded-lg border border-red-200 px-4 py-3 flex items-start justify-between">
                    <p className="font-semibold text-gray-900 text-sm">{e.pump_name}</p>
                    <p className="text-xs text-red-700 font-medium ml-3 text-right">{highs.join(' · ')}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── SECTION 1 ── */}
        <div className="flex items-center gap-3 mb-4">
          <div className="h-px flex-1 bg-gray-200" />
          <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Section 1 — Pump Parameters</span>
          <div className="h-px flex-1 bg-gray-200" />
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-5">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Pump</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Drive</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Hz</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">AMP</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">RPM</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Pressure (kg/cm²)</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Load %</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">24H KWH Diff</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sortedEntries.map(entry => {
                  const t = THRESHOLDS[entry.pump_name];
                  const isOff = entry.status === 'OFF';
                  return (
                    <tr key={entry.id} className={isOff ? 'bg-gray-50 opacity-70' : 'hover:bg-gray-50'}>
                      <td className="px-4 py-3 font-semibold text-gray-900">{entry.pump_name}</td>
                      <td className="px-4 py-3 text-gray-600">{entry.drive_details || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                          entry.status === 'ON'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}>{entry.status || '—'}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{isOff ? <span className="text-gray-400">—</span> : (entry.kw ?? '—')}</td>
                      <td className="px-4 py-3">{isOff ? <span className="text-gray-400">—</span> : valBadge(entry.amp, t?.amp)}</td>
                      <td className="px-4 py-3">{isOff ? <span className="text-gray-400">—</span> : valBadge(entry.rpm, t?.rpm)}</td>
                      <td className="px-4 py-3 text-gray-700">{entry.pressure ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-700">{entry.load_pct != null ? `${entry.load_pct}%` : '—'}</td>
                      <td className="px-4 py-3 text-gray-700">{entry.kwh_diff ?? '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── SECTION 2 ── */}
        {(log.sec2_items || []).length > 0 && (
          <>
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px flex-1 bg-gray-200" />
              <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Section 2 — Meter Readings</span>
              <div className="h-px flex-1 bg-gray-200" />
            </div>
            {(() => {
              const sec2Map = {};
              (log.sec2_items || []).forEach(i => { sec2Map[i.item_name] = i; });
              const rawWater   = parseFloat(sec2Map['RAW Water']?.value_text)   || 0;
              const wasteWater = parseFloat(sec2Map['Waste Water']?.value_text) || 0;
              const roWater    = parseFloat(sec2Map['RO Water']?.value_text) || (rawWater - wasteWater);
              const wasteWaterPct = rawWater > 0 ? (wasteWater / rawWater * 100).toFixed(1) : null;
              const roWaterPct    = rawWater > 0 ? (roWater    / rawWater * 100).toFixed(1) : null;

              return (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-5">
                  {log.sec2_items.map((item, idx) => (
                    <div key={item.id}
                      className={`flex items-center justify-between px-5 py-3 ${idx < log.sec2_items.length - 1 ? 'border-b border-gray-100' : ''}`}>
                      <p className="text-sm font-medium text-gray-800">{item.item_name}</p>
                      <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                        {item.value_text && (
                          <span className="text-sm font-semibold text-gray-900">{item.value_text}</span>
                        )}
                        {item.item_name === 'Waste Water' && wasteWaterPct !== null && (
                          <span className="text-xs font-bold px-2 py-1 rounded-lg bg-orange-100 text-orange-700">{wasteWaterPct}%</span>
                        )}
                        {item.item_name === 'RO Water' && roWaterPct !== null && (
                          <span className="text-xs font-bold px-2 py-1 rounded-lg bg-blue-100 text-blue-700">{roWaterPct}%</span>
                        )}
                        {item.item_status && (
                          <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                            item.item_status === 'OK'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}>{item.item_status === 'OK' ? 'OK' : 'NOT OK'}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </>
        )}

      </div>
    </div>
  );
};

export default PumpParamView;
