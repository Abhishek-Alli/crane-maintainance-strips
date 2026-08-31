import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { hbmAPI } from '../../services/api';
import ChecksheetPreviewModal, { PreviewSection, PreviewGrid, PreviewStatusTable } from './ChecksheetPreviewModal';

// ─── SECTION 1 FIELD CONFIG ───────────────────────────────────────────────────

const SEC1_NUMERIC = [
  { key: 'rated_current',       label: 'Rated Current',         unit: 'A', readOnly: true },
  { key: 'ct_ratio',            label: 'CT Ratio',              unit: '', type: 'text', placeholder: '200/1' },
  { key: 'bar_size',            label: 'Bar Size',              unit: '', type: 'text', placeholder: '10mm' },
  { key: 'ht_current',          label: 'HT Current',            unit: 'A' },
  { key: 'ht_volt',             label: 'HT Volt',               unit: 'V' },
  { key: 'tap_count_diff',      label: 'Tap Count Diff',        unit: '' },
  { key: 'tap_position',        label: 'Tap Position',          unit: '' },
  { key: 'wind_temperature',    label: 'Wind Temperature',      unit: '°C' },
  { key: 'oil_temperature',     label: 'Oil Temperature',       unit: '°C' },
  { key: 'main_tank_oil_level', label: 'Main Tank Oil Level',   unit: '%' },
  { key: 'oltc_oil_level',      label: 'OLTC Oil Level',        unit: '%' },
  { key: 'silica_gel_color',    label: 'Silica Gel Color',      unit: '', type: 'text', placeholder: 'e.g. Blue' },
];

const SEC1_STATUS = [
  { key: 'cleaning',            label: 'Cleaning',              options: ['OK', 'NOT_OK'] },
  { key: 'electric_inspection', label: 'Electric Inspection',   options: ['OK', 'NOT_OK'] },
  { key: 'mech_inspection',     label: 'Mech. Inspection',      options: ['Checked', 'Not_Checked'] },
  { key: 'relay_condition',     label: 'Relay Condition',       options: ['OK', 'NOT_OK'] },
  { key: 'meter_condition',     label: 'Meter Condition',       options: ['OK', 'NOT_OK'] },
  { key: 'indicator',           label: 'Indicator',             options: ['OK', 'NOT_OK'] },
  { key: 'announce_meter',      label: 'Announce Meter',        options: ['OK', 'NOT_OK'] },
  { key: 'oil_leakage',         label: 'Oil Leakage',           options: ['YES', 'NO'] },
  { key: 'tnc_operation',       label: 'TNC Operation',         options: ['Checked', 'Not_Checked'] },
  { key: 'dc_supply',           label: 'DC Supply',             options: ['OK', 'NOT_OK'] },
];

const UNITS_SEC1 = ['8 MVA DC', '4 MVA DC'];
const UNITS_SEC23 = ['8 MVA', '4 MVA'];

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const RATED_CURRENT = { '8 MVA DC': '139.96', '4 MVA DC': '69.98' };

const initSec1 = (unit = '8 MVA DC') => ({
  rated_current: RATED_CURRENT[unit] ?? '', ct_ratio: '200/1', bar_size: '',
  ht_current: '', ht_volt: '', tap_count_diff: '', tap_position: '',
  wind_temperature: '', oil_temperature: '',
  main_tank_oil_level: '', oltc_oil_level: '',
  silica_gel_color: '',
  cleaning: '', electric_inspection: '', mech_inspection: '',
  relay_condition: '', meter_condition: '', indicator: '',
  announce_meter: '', oil_leakage: '', tnc_operation: '', dc_supply: '',
});

const calcDiff = (a, b) => {
  const na = parseFloat(a), nb = parseFloat(b);
  if (isNaN(na) || isNaN(nb)) return '';
  return (na - nb).toFixed(2);
};

const calcPF = (diffKwh, diffKvah) => {
  const a = parseFloat(diffKwh), b = parseFloat(diffKvah);
  if (isNaN(a) || isNaN(b) || b === 0) return '';
  return (a / b).toFixed(4);
};

// Good options → green active, bad → red active
const btnColor = (option, active) => {
  if (!active) return 'bg-white border-gray-300 text-gray-500 hover:border-gray-400';
  const good = new Set(['OK', 'Checked', 'NO']);
  const bad  = new Set(['NOT_OK',  'YES']);
  if (good.has(option)) return 'bg-green-500 border-green-500 text-white';
  if (bad.has(option))  return 'bg-red-500 border-red-500 text-white';
  return 'bg-blue-500 border-blue-500 text-white';
};

// ─── STATUS ROW COMPONENT ─────────────────────────────────────────────────────

const StatusRow = ({ field, value, onChange }) => (
  <div className="flex items-center justify-between py-2.5 border-b border-gray-100 last:border-0">
    <span className="text-sm text-gray-700 font-medium">{field.label}</span>
    <div className="flex gap-1.5">
      {field.options.map(opt => (
        <button key={opt} type="button"
          onClick={() => onChange(opt)}
          className={`px-3 py-1 rounded-lg text-xs font-bold border-2 transition-all ${btnColor(opt, value === opt)}`}>
          {opt === 'NOT_OK' ? 'NOT OK' : opt === 'Not_Checked' ? 'Not Checked' : opt}
        </button>
      ))}
    </div>
  </div>
);

// ─── TRANSFORMER UNIT SECTION ─────────────────────────────────────────────────

const TransformerUnit = ({ unitName, value, onChange, isOpen, onToggle, color }) => {
  const notOkCount = SEC1_STATUS.filter(f => {
    const v = value[f.key];
    return v === 'NOT_OK' || v === 'YES';
  }).length;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-3">
      <button type="button" onClick={onToggle}
        className={`w-full flex items-center justify-between px-5 py-3 transition-colors ${isOpen ? `${color} text-white` : 'hover:bg-gray-50 text-gray-900'}`}>
        <div className="flex items-center gap-3">
          <span className="font-bold text-sm">{unitName}</span>
          {notOkCount > 0 && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${isOpen ? 'bg-white/20 text-white' : 'bg-red-100 text-red-700'}`}>
              {notOkCount} issue{notOkCount > 1 ? 's' : ''}
            </span>
          )}
        </div>
        <svg className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="px-5 pt-4 pb-5">
          {/* Measurement fields */}
          <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Measurements</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
            {SEC1_NUMERIC.map(f => (
              <div key={f.key}>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  {f.label}
                  {f.unit && <span className="text-gray-400 font-normal ml-1">({f.unit})</span>}
                </label>
                <input
                  type={f.type || 'number'}
                  step="0.01"
                  value={value[f.key] ?? ''}
                  placeholder={f.placeholder || ''}
                  readOnly={!!f.readOnly}
                  onChange={f.readOnly ? undefined : e => onChange(f.key, e.target.value)}
                  className={`w-full px-2 py-1.5 border rounded-lg text-sm ${f.readOnly ? 'bg-gray-100 border-gray-200 text-gray-600 cursor-not-allowed font-semibold' : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent'}`}
                />
              </div>
            ))}
          </div>

          {/* Status fields */}
          <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Status / Inspection</h4>
          <div className="border border-gray-200 rounded-xl px-4 py-1">
            {SEC1_STATUS.map(f => (
              <StatusRow
                key={f.key}
                field={f}
                value={value[f.key]}
                onChange={v => onChange(f.key, v)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

const TransformerForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const editData = location.state?.editData;
  const editId = location.state?.editId;
  const isEdit = !!editId;

  const [logDate, setLogDate]     = useState(new Date().toLocaleDateString('en-CA'));
  const [sec1, setSec1]           = useState({ '8 MVA DC': initSec1('8 MVA DC'), '4 MVA DC': initSec1('4 MVA DC') });
  const [sec2, setSec2]           = useState({ '8 MVA': { today: '', yesterday: '' }, '4 MVA': { today: '', yesterday: '' } });
  const [sec3, setSec3]           = useState({ '8 MVA': { kwhT: '', kwhY: '', kvahT: '', kvahY: '' }, '4 MVA': { kwhT: '', kwhY: '', kvahT: '', kvahY: '' } });
  const [sec2Remark, setSec2Remark] = useState('');
  const [sec3Remark, setSec3Remark] = useState('');
  const [openUnits, setOpenUnits] = useState({ '8 MVA DC': true, '4 MVA DC': false });
  const [submitting, setSubmitting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (!isEdit || !editData) return;
    setLogDate(editData.log_date?.slice(0, 10) || new Date().toLocaleDateString('en-CA'));
    setSec2Remark(editData.sec2_remark || '');
    setSec3Remark(editData.sec3_remark || '');
    if (Array.isArray(editData.sec1)) {
      const s1 = {};
      editData.sec1.forEach(row => { s1[row.unit_name] = { ...initSec1(row.unit_name), ...row }; });
      setSec1(prev => ({ ...prev, ...s1 }));
    }
    if (Array.isArray(editData.sec2)) {
      const s2 = {};
      editData.sec2.forEach(row => { s2[row.unit_name] = { today: row.today_tap_count ?? '', yesterday: row.yesterday_tap_count ?? '' }; });
      setSec2(prev => ({ ...prev, ...s2 }));
    }
    if (Array.isArray(editData.sec3)) {
      const s3 = {};
      editData.sec3.forEach(row => { s3[row.unit_name] = { kwhT: row.today_kwh ?? '', kwhY: row.yesterday_kwh ?? '', kvahT: row.today_kvah ?? '', kvahY: row.yesterday_kvah ?? '' }; });
      setSec3(prev => ({ ...prev, ...s3 }));
    }
  }, []); // eslint-disable-line

  const updateSec1 = (unit, key, val) =>
    setSec1(prev => ({ ...prev, [unit]: { ...prev[unit], [key]: val } }));

  const updateSec2 = (unit, field, val) =>
    setSec2(prev => ({ ...prev, [unit]: { ...prev[unit], [field]: val } }));

  const updateSec3 = (unit, field, val) =>
    setSec3(prev => ({ ...prev, [unit]: { ...prev[unit], [field]: val } }));

  const buildPayload = () => ({
    log_date: logDate,
    sec2_remark: sec2Remark || null,
    sec3_remark: sec3Remark || null,
    sec1: UNITS_SEC1.map(u => ({ unit_name: u, ...sec1[u] })),
    sec2: UNITS_SEC23.map(u => ({
      unit_name: u,
      today_tap_count:     sec2[u].today     || null,
      yesterday_tap_count: sec2[u].yesterday || null,
      difference: calcDiff(sec2[u].today, sec2[u].yesterday) || null,
    })),
    sec3: UNITS_SEC23.map(u => ({
      unit_name: u,
      today_kwh:      sec3[u].kwhT  || null,
      yesterday_kwh:  sec3[u].kwhY  || null,
      diff_kwh:       calcDiff(sec3[u].kwhT,  sec3[u].kwhY)  || null,
      today_kvah:     sec3[u].kvahT || null,
      yesterday_kvah: sec3[u].kvahY || null,
      diff_kvah:      calcDiff(sec3[u].kvahT, sec3[u].kvahY) || null,
    })),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!logDate) { toast.error('Date is required'); return; }
    setShowPreview(true);
  };

  const handleConfirmSubmit = async () => {
    const payload = buildPayload();
    setSubmitting(true);
    try {
      if (isEdit) { await hbmAPI.updateHbmLog('transformer', editId, payload); } else { await hbmAPI.createTransformerLog(payload); }
      toast.success(isEdit ? 'Transformer checksheet updated!' : 'Transformer checksheet submitted!');
      navigate(isEdit ? `/hbm/transformer/${editId}` : '/hbm/transformer/history');
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  const UNIT_COLORS = { '8 MVA DC': 'bg-blue-700', '4 MVA DC': 'bg-indigo-700' };

  return (
    <>
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">

        {/* Page Header */}
        <div className="flex items-center space-x-3 mb-6">
          <button onClick={() => navigate('/hbm/dashboard')}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Visual Inspection & HBM Transformer</h1>
            <p className="text-sm text-gray-500">Daily transformer inspection report</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>

          {/* Date */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Date <span className="text-red-500">*</span>
            </label>
            <input type="date" value={logDate} required
              max={new Date().toLocaleDateString('en-CA')}
              onChange={e => setLogDate(e.target.value)}
              className="w-full sm:w-56 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </div>

          {/* SECTION 1 */}
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px flex-1 bg-gray-200" />
            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Section 1 — Visual Inspection</span>
            <div className="h-px flex-1 bg-gray-200" />
          </div>

          {UNITS_SEC1.map(unit => (
            <TransformerUnit
              key={unit}
              unitName={unit}
              value={sec1[unit]}
              onChange={(k, v) => updateSec1(unit, k, v)}
              isOpen={openUnits[unit]}
              onToggle={() => setOpenUnits(prev => ({ ...prev, [unit]: !prev[unit] }))}
              color={UNIT_COLORS[unit]}
            />
          ))}

          {/* SECTION 2 — OLTC */}
          <div className="flex items-center gap-3 mt-6 mb-4">
            <div className="h-px flex-1 bg-gray-200" />
            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Section 2 — OLTC Daily Report</span>
            <div className="h-px flex-1 bg-gray-200" />
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-3">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-blue-700 text-white">
                    <th className="text-left px-4 py-3 font-semibold w-28">Unit</th>
                    <th className="text-center px-4 py-3 font-semibold">Today Tap Count</th>
                    <th className="text-center px-4 py-3 font-semibold">Yesterday Tap Count</th>
                    <th className="text-center px-4 py-3 font-semibold">Difference</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {UNITS_SEC23.map(unit => {
                    const diff = calcDiff(sec2[unit].today, sec2[unit].yesterday);
                    return (
                      <tr key={unit}>
                        <td className="px-4 py-3 font-bold text-gray-800">{unit}</td>
                        <td className="px-4 py-3">
                          <input type="number" step="1"
                            value={sec2[unit].today}
                            onChange={e => updateSec2(unit, 'today', e.target.value)}
                            placeholder="0"
                            className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm text-center focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                        </td>
                        <td className="px-4 py-3">
                          <input type="number" step="1"
                            value={sec2[unit].yesterday}
                            onChange={e => updateSec2(unit, 'yesterday', e.target.value)}
                            placeholder="0"
                            className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm text-center focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`font-bold text-sm ${diff ? (parseFloat(diff) >= 0 ? 'text-blue-700' : 'text-red-600') : 'text-gray-400'}`}>
                            {diff || '—'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 border-t border-gray-100">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Remark</label>
              <textarea value={sec2Remark} onChange={e => setSec2Remark(e.target.value)}
                rows={2} placeholder="Any remarks for OLTC..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none" />
            </div>
          </div>

          {/* SECTION 3 — KWH & KVAH */}
          <div className="flex items-center gap-3 mt-6 mb-4">
            <div className="h-px flex-1 bg-gray-200" />
            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Section 3 — KWH &amp; KVAH Daily Report</span>
            <div className="h-px flex-1 bg-gray-200" />
          </div>

          {UNITS_SEC23.map(unit => (
            <div key={unit} className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-3">
              <div className="px-4 py-2.5 bg-indigo-700 text-white">
                <h3 className="font-bold text-sm">{unit}</h3>
              </div>
              <div className="p-4">
                {/* KWH row */}
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">KWH Reading</p>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Today KWH</label>
                    <input type="number" step="0.01"
                      value={sec3[unit].kwhT}
                      onChange={e => updateSec3(unit, 'kwhT', e.target.value)}
                      placeholder="0.00"
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Yesterday KWH</label>
                    <input type="number" step="0.01"
                      value={sec3[unit].kwhY}
                      onChange={e => updateSec3(unit, 'kwhY', e.target.value)}
                      placeholder="0.00"
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Difference (KWH)</label>
                    <div className={`w-full px-2 py-1.5 border rounded-lg text-sm font-bold text-center ${calcDiff(sec3[unit].kwhT, sec3[unit].kwhY) ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-gray-200 bg-gray-50 text-gray-400'}`}>
                      {calcDiff(sec3[unit].kwhT, sec3[unit].kwhY) || '—'}
                    </div>
                  </div>
                </div>
                {/* KVAH row */}
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">KVAH Reading</p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Today KVAH</label>
                    <input type="number" step="0.01"
                      value={sec3[unit].kvahT}
                      onChange={e => updateSec3(unit, 'kvahT', e.target.value)}
                      placeholder="0.00"
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Yesterday KVAH</label>
                    <input type="number" step="0.01"
                      value={sec3[unit].kvahY}
                      onChange={e => updateSec3(unit, 'kvahY', e.target.value)}
                      placeholder="0.00"
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Difference (KVAH)</label>
                    <div className={`w-full px-2 py-1.5 border rounded-lg text-sm font-bold text-center ${calcDiff(sec3[unit].kvahT, sec3[unit].kvahY) ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-gray-200 bg-gray-50 text-gray-400'}`}>
                      {calcDiff(sec3[unit].kvahT, sec3[unit].kvahY) || '—'}
                    </div>
                  </div>
                </div>

                {/* PH Value */}
                {(() => {
                  const dKwh  = calcDiff(sec3[unit].kwhT,  sec3[unit].kwhY);
                  const dKvah = calcDiff(sec3[unit].kvahT, sec3[unit].kvahY);
                  const pf    = calcPF(dKwh, dKvah);
                  return (
                    <div className="mt-4 flex items-center gap-3 p-3 rounded-lg border border-purple-200 bg-purple-50">
                      <span className="text-xs font-bold text-purple-700 uppercase tracking-wide">PF Value</span>
                      <span className="text-xs text-gray-500">(Diff KWH / Diff KVAH)</span>
                      <span className={`ml-auto text-base font-bold ${pf ? 'text-purple-700' : 'text-gray-400'}`}>
                        {pf || '—'}
                      </span>
                    </div>
                  );
                })()}
              </div>
            </div>
          ))}

          {/* Section 3 Remark */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 mb-5">
            <label className="block text-xs font-semibold text-gray-600 mb-1">Section 3 Remark</label>
            <textarea value={sec3Remark} onChange={e => setSec3Remark(e.target.value)}
              rows={2} placeholder="Any remarks for KWH/KVAH..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none" />
          </div>

          {/* Submit */}
          <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 shadow-lg rounded-t-xl">
            <button type="submit"
              className="w-full py-3 bg-blue-700 text-white rounded-lg font-bold text-base hover:bg-blue-800 transition-colors">
              Preview & Submit
            </button>
          </div>

        </form>
      </div>
    </div>

    {/* Preview Modal */}
    <ChecksheetPreviewModal
      isOpen={showPreview}
      title="Transformer Checksheet"
      onEdit={() => setShowPreview(false)}
      onConfirm={handleConfirmSubmit}
      submitting={submitting}
    >
      <PreviewGrid rows={[['Date', logDate]]} />

      {UNITS_SEC1.map(unit => (
        <PreviewSection key={unit} title={`Section 1 — ${unit}`} color="bg-blue-700">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Measurements</p>
          <PreviewGrid rows={SEC1_NUMERIC.map(f => [f.label + (f.unit ? ` (${f.unit})` : ''), sec1[unit][f.key]])} />
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mt-4 mb-2">Status</p>
          <PreviewStatusTable rows={SEC1_STATUS.map(f => [f.label, sec1[unit][f.key]])} />
        </PreviewSection>
      ))}

      <PreviewSection title="Section 2 — OLTC Daily Report" color="bg-blue-700">
        <div className="space-y-2">
          {UNITS_SEC23.map(unit => (
            <div key={unit} className="border border-gray-200 rounded-lg p-3">
              <p className="text-xs font-bold text-gray-700 mb-2">{unit}</p>
              <PreviewGrid rows={[
                ['Today Tap Count', sec2[unit].today],
                ['Yesterday Tap Count', sec2[unit].yesterday],
                ['Difference', calcDiff(sec2[unit].today, sec2[unit].yesterday)],
              ]} />
            </div>
          ))}
          {sec2Remark && <p className="text-xs text-gray-600 mt-2"><span className="font-semibold">Remark:</span> {sec2Remark}</p>}
        </div>
      </PreviewSection>

      <PreviewSection title="Section 3 — KWH & KVAH Daily Report" color="bg-indigo-700">
        <div className="space-y-3">
          {UNITS_SEC23.map(unit => {
            const dKwh  = calcDiff(sec3[unit].kwhT,  sec3[unit].kwhY);
            const dKvah = calcDiff(sec3[unit].kvahT, sec3[unit].kvahY);
            const pf    = calcPF(dKwh, dKvah);
            return (
              <div key={unit} className="border border-gray-200 rounded-lg p-3">
                <p className="text-xs font-bold text-gray-700 mb-2">{unit}</p>
                <PreviewGrid rows={[
                  ['Today KWH',      sec3[unit].kwhT],
                  ['Yesterday KWH',  sec3[unit].kwhY],
                  ['Diff KWH',       dKwh],
                  ['Today KVAH',     sec3[unit].kvahT],
                  ['Yesterday KVAH', sec3[unit].kvahY],
                  ['Diff KVAH',      dKvah],
                  ['PF Value',       pf],
                ]} />
              </div>
            );
          })}
          {sec3Remark && <p className="text-xs text-gray-600 mt-2"><span className="font-semibold">Remark:</span> {sec3Remark}</p>}
        </div>
      </PreviewSection>
    </ChecksheetPreviewModal>
    </>
  );
};

export default TransformerForm;
