import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { hbmAPI } from '../../services/api';

const StatusBadge = ({ value }) => {
  if (!value) return <span className="text-gray-400 text-xs">—</span>;
  const good = new Set(['OK', 'Checked', 'NO']);
  const bad  = new Set(['NOT_OK', 'Not_Checked', 'YES']);
  if (good.has(value)) return <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">{value === 'Not_Checked' ? 'Not Checked' : value === 'NOT_OK' ? 'NOT OK' : value}</span>;
  if (bad.has(value))  return <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold">{value === 'Not_Checked' ? 'Not Checked' : value === 'NOT_OK' ? 'NOT OK' : value}</span>;
  return <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full font-semibold">{value}</span>;
};

const v = (val) => (val != null ? String(val) : '—');

const SEC1_DISPLAY = [
  { key: 'rated_current',       label: 'Rated Current',         unit: 'A' },
  { key: 'ct_ratio',            label: 'CT Ratio',              unit: '' },
  { key: 'bar_size',            label: 'Bar Size',              unit: '' },
  { key: 'ht_current',          label: 'HT Current',            unit: 'A' },
  { key: 'ht_volt',             label: 'HT Volt',               unit: 'V' },
  { key: 'tap_count_diff',      label: 'Tap Count Diff',        unit: '' },
  { key: 'tap_position',        label: 'Tap Position',          unit: '' },
  { key: 'wind_temperature',    label: 'Wind Temperature',      unit: '°C' },
  { key: 'oil_temperature',     label: 'Oil Temperature',       unit: '°C' },
  { key: 'main_tank_oil_level', label: 'Main Tank Oil Level',   unit: '%' },
  { key: 'oltc_oil_level',      label: 'OLTC Oil Level',        unit: '%' },
  { key: 'silica_gel_color',    label: 'Silica Gel Color',      unit: '' },
];

const SEC1_STATUS = [
  { key: 'cleaning',            label: 'Cleaning' },
  { key: 'electric_inspection', label: 'Electric Inspection' },
  { key: 'mech_inspection',     label: 'Mech. Inspection' },
  { key: 'relay_condition',     label: 'Relay Condition' },
  { key: 'meter_condition',     label: 'Meter Condition' },
  { key: 'indicator',           label: 'Indicator' },
  { key: 'announce_meter',      label: 'Announce Meter' },
  { key: 'oil_leakage',         label: 'Oil Leakage' },
  { key: 'tnc_operation',       label: 'TNC Operation' },
  { key: 'dc_supply',           label: 'DC Supply' },
];

const TransformerView = () => {
  const { id } = useParams();
  const [log, setLog]             = useState(null);
  const [loading, setLoading]     = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    hbmAPI.getTransformerLogById(id)
      .then(res => setLog(res))
      .catch(() => toast.error('Failed to load Transformer log'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      const res = await hbmAPI.downloadTransformerPDF(id);
      const url = URL.createObjectURL(res.data instanceof Blob ? res.data : new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url; a.download = `hbm_transformer_${id}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error('Failed to download PDF'); }
    finally { setDownloading(false); }
  };

  const formatDate = (d) =>
    d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-700"></div>
    </div>
  );

  if (!log) return <div className="p-8 text-center text-gray-400">Log not found.</div>;

  const sec1  = log.sec1  || [];
  const sec2  = log.sec2  || [];
  const sec3  = log.sec3  || [];

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link to="/hbm/transformer/history"
            className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">Visual Inspection & HBM Transformer</h1>
            <p className="text-sm text-gray-500">{formatDate(log.log_date)}</p>
          </div>
          <button onClick={handleDownloadPDF} disabled={downloading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-700 text-white rounded-lg text-sm font-semibold hover:bg-blue-800 transition-colors disabled:opacity-50">
            {downloading
              ? <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>
              : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>}
            PDF
          </button>
        </div>

        {/* Log Info */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5 grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
          <div><p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Date</p><p className="font-semibold text-gray-900 mt-0.5">{formatDate(log.log_date)}</p></div>
          <div><p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Filled By</p><p className="font-semibold text-gray-900 mt-0.5">{log.filled_by_name}</p></div>
          <div><p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Submitted</p><p className="font-semibold text-gray-900 mt-0.5">{new Date(log.created_at).toLocaleString('en-IN')}</p></div>
        </div>

        {/* SECTION 1 */}
        <div className="flex items-center gap-3 mb-4">
          <div className="h-px flex-1 bg-gray-200" />
          <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Section 1 — Visual Inspection</span>
          <div className="h-px flex-1 bg-gray-200" />
        </div>

        {sec1.map(unit => (
          <div key={unit.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-4">
            <div className="px-5 py-3 bg-blue-700 text-white">
              <h3 className="font-bold text-sm">{unit.unit_name}</h3>
            </div>
            <div className="p-5">
              {/* Measurements */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                {SEC1_DISPLAY.map(f => (
                  <div key={f.key} className="bg-gray-50 rounded-lg px-3 py-2">
                    <p className="text-xs text-gray-500 font-semibold">{f.label}{f.unit && ` (${f.unit})`}</p>
                    <p className="font-bold text-gray-900 text-sm mt-0.5">{v(unit[f.key])}</p>
                  </div>
                ))}
              </div>
              {/* Status */}
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                {SEC1_STATUS.map((f, idx) => (
                  <div key={f.key} className={`flex items-center justify-between px-4 py-2.5 ${idx < SEC1_STATUS.length - 1 ? 'border-b border-gray-100' : ''}`}>
                    <span className="text-sm text-gray-700">{f.label}</span>
                    <StatusBadge value={unit[f.key]} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}

        {/* SECTION 2 */}
        <div className="flex items-center gap-3 mt-2 mb-4">
          <div className="h-px flex-1 bg-gray-200" />
          <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Section 2 — OLTC Daily Report</span>
          <div className="h-px flex-1 bg-gray-200" />
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-blue-700 text-white">
                  <th className="text-left px-5 py-3 font-semibold">Unit</th>
                  <th className="text-center px-5 py-3 font-semibold">Today Tap Count</th>
                  <th className="text-center px-5 py-3 font-semibold">Yesterday Tap Count</th>
                  <th className="text-center px-5 py-3 font-semibold">Difference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sec2.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-bold text-gray-900">{u.unit_name}</td>
                    <td className="px-5 py-3 text-center text-gray-700">{v(u.today_tap_count)}</td>
                    <td className="px-5 py-3 text-center text-gray-700">{v(u.yesterday_tap_count)}</td>
                    <td className="px-5 py-3 text-center font-bold text-blue-700">{v(u.difference)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {log.sec2_remark && (
            <div className="px-5 py-3 border-t border-gray-100">
              <span className="text-xs font-semibold text-gray-500">Remark: </span>
              <span className="text-sm text-gray-800">{log.sec2_remark}</span>
            </div>
          )}
        </div>

        {/* SECTION 3 */}
        <div className="flex items-center gap-3 mb-4">
          <div className="h-px flex-1 bg-gray-200" />
          <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Section 3 — KWH &amp; KVAH Daily Report</span>
          <div className="h-px flex-1 bg-gray-200" />
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-indigo-700 text-white">
                  <th className="text-left px-4 py-3 font-semibold">Unit</th>
                  <th className="text-center px-3 py-3 font-semibold">KWH Today</th>
                  <th className="text-center px-3 py-3 font-semibold">KWH Yesterday</th>
                  <th className="text-center px-3 py-3 font-semibold">KWH Diff</th>
                  <th className="text-center px-3 py-3 font-semibold">KVAH Today</th>
                  <th className="text-center px-3 py-3 font-semibold">KVAH Yesterday</th>
                  <th className="text-center px-3 py-3 font-semibold">KVAH Diff</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sec3.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-bold text-gray-900">{u.unit_name}</td>
                    <td className="px-3 py-3 text-center text-gray-700">{v(u.today_kwh)}</td>
                    <td className="px-3 py-3 text-center text-gray-700">{v(u.yesterday_kwh)}</td>
                    <td className="px-3 py-3 text-center font-bold text-indigo-700">{v(u.diff_kwh)}</td>
                    <td className="px-3 py-3 text-center text-gray-700">{v(u.today_kvah)}</td>
                    <td className="px-3 py-3 text-center text-gray-700">{v(u.yesterday_kvah)}</td>
                    <td className="px-3 py-3 text-center font-bold text-indigo-700">{v(u.diff_kvah)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {log.sec3_remark && (
            <div className="px-5 py-3 border-t border-gray-100">
              <span className="text-xs font-semibold text-gray-500">Remark: </span>
              <span className="text-sm text-gray-800">{log.sec3_remark}</span>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default TransformerView;
