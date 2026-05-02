import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { hbmAPI } from '../../services/api';
import ChecksheetPreviewModal, { PreviewSection, PreviewGrid } from './ChecksheetPreviewModal';

// ─── PUMP GROUPS CONFIGURATION ───────────────────────────────────────────────

const PUMP_GROUPS = [
  {
    key: 'TMT_WATER', label: 'TMT Water Pump', color: 'bg-blue-600', textColor: 'text-blue-700', borderColor: 'border-blue-200',
    pumps: [
      { name: 'TMT Water Pump-1', kw_max: 200, amp_max: 332, rpm_max: 1490 },
      { name: 'TMT Water Pump-2', kw_max: 200, amp_max: 332, rpm_max: 1490 },
    ],
  },
  {
    key: 'MILL_WATER', label: 'Mill Water Pump', color: 'bg-cyan-600', textColor: 'text-cyan-700', borderColor: 'border-cyan-200',
    pumps: [
      { name: 'Mill Water Pump-1', kw_max: 90, amp_max: 160, rpm_max: 1487 },
      { name: 'Mill Water Pump-2', kw_max: 90, amp_max: 160, rpm_max: 1487 },
    ],
  },
  {
    key: 'DCW', label: 'DCW Pump', color: 'bg-emerald-600', textColor: 'text-emerald-700', borderColor: 'border-emerald-200',
    pumps: [
      { name: 'DCW Pump-1', kw_max: 90, amp_max: 149, rpm_max: 1480 },
      { name: 'DCW Pump-2', kw_max: 90, amp_max: 149, rpm_max: 1480 },
      { name: 'DCW Pump-3', kw_max: 90, amp_max: 149, rpm_max: 1480 },
      { name: 'DCW Pump-4', kw_max: 90, amp_max: 149, rpm_max: 1480 },
      { name: 'DCW Pump-5', kw_max: 90, amp_max: 149, rpm_max: 1480 },
    ],
  },
  {
    key: 'ICW', label: 'ICW Pump', color: 'bg-teal-600', textColor: 'text-teal-700', borderColor: 'border-teal-200',
    pumps: [
      { name: 'ICW Pump-1', kw_max: 45, amp_max: 81, rpm_max: 1475 },
      { name: 'ICW Pump-2', kw_max: 45, amp_max: 81, rpm_max: 1475 },
      { name: 'ICW Pump-3', kw_max: 45, amp_max: 81, rpm_max: 1475 },
      { name: 'ICW Pump-4', kw_max: 45, amp_max: 81, rpm_max: 1475 },
      { name: 'ICW Pump-5', kw_max: 45, amp_max: 81, rpm_max: 1475 },
    ],
  },
  {
    key: 'LHW', label: 'LHW Pump', color: 'bg-violet-600', textColor: 'text-violet-700', borderColor: 'border-violet-200',
    pumps: [
      { name: 'LHW Pump-1', kw_max: 55, amp_max: 97, rpm_max: 1480 },
      { name: 'LHW Pump-2', kw_max: 55, amp_max: 97, rpm_max: 1480 },
      { name: 'LHW Pump-3', kw_max: 55, amp_max: 97, rpm_max: 1480 },
      { name: 'LHW Pump-4', kw_max: 55, amp_max: 97, rpm_max: 1480 },
    ],
  },
  {
    key: 'LCW', label: 'LCW Pump', color: 'bg-purple-600', textColor: 'text-purple-700', borderColor: 'border-purple-200',
    pumps: [
      { name: 'LCW Pump-1', kw_max: 45, amp_max: 81, rpm_max: 1475 },
      { name: 'LCW Pump-2', kw_max: 45, amp_max: 81, rpm_max: 1475 },
      { name: 'LCW Pump-3', kw_max: 45, amp_max: 81, rpm_max: 1475 },
    ],
  },
  {
    key: 'BACKWASH', label: 'Back Wash Pump', color: 'bg-orange-600', textColor: 'text-orange-700', borderColor: 'border-orange-200',
    pumps: [
      { name: 'Back Wash Pump', kw_max: 45, amp_max: 80, rpm_max: 1475 },
    ],
  },
  {
    key: 'SCALE_PIT', label: 'Scale Pit Pump', color: 'bg-amber-600', textColor: 'text-amber-700', borderColor: 'border-amber-200',
    pumps: [
      { name: 'Scale Pit Pump-1', kw_max: 75, amp_max: 126, rpm_max: 1480 },
      { name: 'Scale Pit Pump-2', kw_max: 75, amp_max: 126, rpm_max: 1480 },
      { name: 'Scale Pit Pump-3', kw_max: 55, amp_max: 97,  rpm_max: 1480 },
      { name: 'Scale Pit Pump-4', kw_max: 55, amp_max: 97,  rpm_max: 1480 },
      { name: 'Scale Pit Pump-5', kw_max: 55, amp_max: 97,  rpm_max: 1480 },
      { name: 'Scale Pit Pump-6', kw_max: 55, amp_max: 97,  rpm_max: 1480 },
      { name: 'Scale Pit Pump-7', kw_max: 55, amp_max: 97,  rpm_max: 1480 },
      { name: 'Scale Pit Pump-8', kw_max: 45, amp_max: 81,  rpm_max: 1475 },
    ],
  },
  {
    key: 'ICW_CT_FAN', label: 'ICW CT Fan', color: 'bg-sky-600', textColor: 'text-sky-700', borderColor: 'border-sky-200',
    pumps: [
      { name: 'ICW CT Fan-1', kw_max: 15, amp_max: 38, rpm_max: 285 },
      { name: 'ICW CT Fan-2', kw_max: 15, amp_max: 38, rpm_max: 285 },
      { name: 'ICW CT Fan-3', kw_max: 15, amp_max: 38, rpm_max: 285 },
    ],
  },
  {
    key: 'DCW_CT_FAN', label: 'DCW CT Fan', color: 'bg-indigo-600', textColor: 'text-indigo-700', borderColor: 'border-indigo-200',
    pumps: [
      { name: 'DCW CT Fan-1', kw_max: 15, amp_max: 38, rpm_max: 285 },
      { name: 'DCW CT Fan-2', kw_max: 15, amp_max: 38, rpm_max: 285 },
      { name: 'DCW CT Fan-3', kw_max: 15, amp_max: 38, rpm_max: 285 },
    ],
  },
  {
    key: 'LAMINAR_CT_FAN', label: 'LAMINAR CT Fan', color: 'bg-rose-600', textColor: 'text-rose-700', borderColor: 'border-rose-200',
    pumps: [
      { name: 'LAMINAR CT Fan-1', kw_max: 15, amp_max: 38, rpm_max: 285 },
      { name: 'LAMINAR CT Fan-2', kw_max: 15, amp_max: 38, rpm_max: 285 },
      { name: 'LAMINAR CT Fan-3', kw_max: 15, amp_max: 38, rpm_max: 285 },
    ],
  },
  {
    key: 'LC_SPRAY', label: 'LC SPRAY PUMP', color: 'bg-lime-600', textColor: 'text-lime-700', borderColor: 'border-lime-200',
    pumps: [
      { name: 'LC SPRAY PUMP-1', kw_max: 90, amp_max: 149, rpm_max: 1480 },
      { name: 'LC SPRAY PUMP-2', kw_max: 90, amp_max: 149, rpm_max: 1480 },
    ],
  },
  {
    key: 'COMPRESSOR', label: 'Compressor', color: 'bg-gray-700', textColor: 'text-gray-700', borderColor: 'border-gray-300',
    pumps: [
      { name: 'Compressor-2', kw_max: 160, amp_max: 277, rpm_max: 1489 },
    ],
  },
  {
    key: 'TMT_CT', label: 'TMT CT', color: 'bg-pink-600', textColor: 'text-pink-700', borderColor: 'border-pink-200',
    pumps: [
      { name: 'TMT CT', kw_max: 15, amp_max: 32, rpm_max: 410 },
    ],
  },
];

// ─── SECTION-2 ITEMS ──────────────────────────────────────────────────────────

const SEC2_ITEMS = [
  { name: 'RO-1',       type: 'number', unit: 'm³' },
  { name: 'RO-2',       type: 'number', unit: 'm³' },
  { name: 'RO-3',       type: 'number', unit: 'm³' },
  { name: 'RAW Water',  type: 'computed', unit: 'm³' },
  { name: 'Waste Water',    type: 'number', unit: 'm³' },
  { name: 'RO Water',   type: 'computed', unit: 'm³' },
  { name: 'Earthing Water', type: 'number', unit: 'm³' },
  { name: 'Induction Heater DM Water Levels', type: 'text', placeholder: 'e.g. Top up' },
  { name: 'All HSM, TMT, PTM Earthing Points Water Supply', type: 'status' },
];

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const numOk = (val, max) => {
  if (val === '' || val == null) return null;
  const n = parseFloat(val);
  if (isNaN(n)) return null;
  return n < max;
};

const numFieldClass = (ok) => {
  if (ok === null) return 'border-gray-300 bg-white';
  return ok ? 'border-green-400 bg-green-50' : 'border-red-400 bg-red-50';
};

// ─── PUMP ENTRY COMPONENT ─────────────────────────────────────────────────────

const PumpEntry = ({ pump, value, onChange, showPressure = true }) => {
  const v = value || {};
  const isOff = v.status === 'OFF';

  return (
    <div className={`rounded-lg border-2 p-3 sm:p-4 mb-3 last:mb-0 transition-all ${
      isOff ? 'border-gray-200 bg-gray-50' : 'border-gray-200 bg-white'
    }`}>
      {/* Pump name + Status toggle */}
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-bold text-sm text-gray-800">{pump.name}</h4>
        <div className="flex gap-1.5">
          <button type="button"
            onClick={() => onChange(pump.name, { ...v, status: 'ON' })}
            className={`px-3 py-1 rounded-lg text-xs font-bold border-2 transition-all ${
              v.status === 'ON'
                ? 'bg-green-500 border-green-500 text-white'
                : 'bg-white border-gray-300 text-gray-500 hover:border-green-400'
            }`}>ON</button>
          <button type="button"
            onClick={() => onChange(pump.name, { ...v, status: 'OFF' })}
            className={`px-3 py-1 rounded-lg text-xs font-bold border-2 transition-all ${
              v.status === 'OFF'
                ? 'bg-gray-500 border-gray-500 text-white'
                : 'bg-white border-gray-300 text-gray-500 hover:border-gray-400'
            }`}>OFF</button>
        </div>
      </div>

      {/* Drive Details */}
      <div className="mb-3">
        <label className="block text-xs font-semibold text-gray-600 mb-1">Drive Details</label>
        <select
          value={v.drive_details || ''}
          onChange={e => onChange(pump.name, { ...v, drive_details: e.target.value })}
          disabled={isOff}
          className="w-full sm:w-48 px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50">
          <option value="">— Select —</option>
          <option value="VFD">VFD</option>
          <option value="Soft Starter">Soft Starter</option>
          <option value="Star Delta">Star Delta</option>
        </select>
      </div>

      {/* Numeric fields — hidden when OFF */}
      {!isOff && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {/* Hz */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Hz</label>
            <input
              type="number" step="0.01" min="0"
              value={v.kw ?? ''}
              onChange={e => onChange(pump.name, { ...v, kw: e.target.value })}
              placeholder="0.00"
              className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </div>
          {/* AMP */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              AMP
              <span className="font-normal text-gray-400 ml-1">(&lt;{pump.amp_max})</span>
            </label>
            <input
              type="number" step="0.01" min="0"
              value={v.amp ?? ''}
              onChange={e => {
                const ampVal = e.target.value;
                const computed = ampVal !== '' && !isNaN(parseFloat(ampVal))
                  ? parseFloat((parseFloat(ampVal) / pump.amp_max * 100).toFixed(1))
                  : '';
                onChange(pump.name, { ...v, amp: ampVal, load_pct: computed });
              }}
              placeholder="0.00"
              className={`w-full px-2 py-1.5 border-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 ${numFieldClass(numOk(v.amp, pump.amp_max))}`} />
            {v.amp !== '' && v.amp != null && numOk(v.amp, pump.amp_max) === false && (
              <p className="text-xs text-red-600 mt-0.5 font-semibold">High!</p>
            )}
          </div>
          {/* RPM */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              RPM
              <span className="font-normal text-gray-400 ml-1">(&lt;{pump.rpm_max})</span>
            </label>
            <input
              type="number" step="0.1" min="0"
              value={v.rpm ?? ''}
              onChange={e => onChange(pump.name, { ...v, rpm: e.target.value })}
              placeholder="0.0"
              className={`w-full px-2 py-1.5 border-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 ${numFieldClass(numOk(v.rpm, pump.rpm_max))}`} />
            {v.rpm !== '' && v.rpm != null && numOk(v.rpm, pump.rpm_max) === false && (
              <p className="text-xs text-red-600 mt-0.5 font-semibold">High!</p>
            )}
          </div>
          {/* Pressure */}
          {showPressure && (
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Pressure
              <span className="font-normal text-gray-400 ml-1">(kg/cm²)</span>
            </label>
            <input
              type="number" step="0.01" min="0"
              value={v.pressure ?? ''}
              onChange={e => onChange(pump.name, { ...v, pressure: e.target.value })}
              placeholder="0.00"
              className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </div>
          )}
          {/* Load % — auto-calculated from AMP / amp_max × 100 */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Load %
              <span className="font-normal text-gray-400 ml-1">(auto)</span>
            </label>
            <input
              type="number" step="0.1" min="0"
              value={v.load_pct ?? ''}
              readOnly
              placeholder="—"
              className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-700 cursor-not-allowed" />
          </div>
          {/* 24H KWH Diff */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">24H KWH Diff</label>
            <input
              type="number" step="0.1" min="0"
              value={v.kwh_diff ?? ''}
              onChange={e => onChange(pump.name, { ...v, kwh_diff: e.target.value })}
              placeholder="0.0"
              className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </div>
        </div>
      )}
    </div>
  );
};

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

const PumpParamForm = () => {
  const navigate = useNavigate();

  const [header, setHeader] = useState({
    log_date:   new Date().toLocaleDateString('en-CA'),
    size_value: '',
  });

  const [pumpValues, setPumpValues]   = useState({});
  const [sec2Values, setSec2Values]   = useState({});
  const [openGroups, setOpenGroups]   = useState({});
  const [submitting, setSubmitting]   = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const handlePumpChange = (pumpName, val) =>
    setPumpValues(prev => ({ ...prev, [pumpName]: val }));

  const handleSec2Change = (itemName, field, val) =>
    setSec2Values(prev => ({
      ...prev,
      [itemName]: { ...(prev[itemName] || {}), [field]: val },
    }));

  const toggleGroup = (key) =>
    setOpenGroups(prev => ({ ...prev, [key]: !prev[key] }));

  const getGroupSummary = (group) => {
    let filled = 0, highCount = 0;
    group.pumps.forEach(p => {
      const v = pumpValues[p.name];
      if (v?.status) {
        filled++;
        if (v.status === 'ON') {
          if (numOk(v.kw,  p.kw_max)  === false) highCount++;
          if (numOk(v.amp, p.amp_max) === false) highCount++;
          if (numOk(v.rpm, p.rpm_max) === false) highCount++;
        }
      }
    });
    return { filled, total: group.pumps.length, highCount };
  };

  const buildPayload = () => {
    const entries = [];
    for (const group of PUMP_GROUPS) {
      for (const pump of group.pumps) {
        const v = pumpValues[pump.name];
        if (!v?.status) continue;
        entries.push({
          pump_name: pump.name, drive_details: v.drive_details || null, status: v.status,
          kw: v.kw !== '' && v.kw != null ? v.kw : null,
          amp: v.amp !== '' && v.amp != null ? v.amp : null,
          rpm: v.rpm !== '' && v.rpm != null ? v.rpm : null,
          pressure: v.pressure !== '' && v.pressure != null ? v.pressure : null,
          load_pct: v.load_pct !== '' && v.load_pct != null ? v.load_pct : null,
          kwh_diff: v.kwh_diff !== '' && v.kwh_diff != null ? v.kwh_diff : null,
        });
      }
    }
    const ro1 = parseFloat(sec2Values['RO-1']?.value_text) || 0;
    const ro2 = parseFloat(sec2Values['RO-2']?.value_text) || 0;
    const ro3 = parseFloat(sec2Values['RO-3']?.value_text) || 0;
    const rawWater = ro1 + ro2 + ro3;
    const wasteWater = parseFloat(sec2Values['Waste Water']?.value_text) || 0;
    const roWater = rawWater - wasteWater;
    const computedMap = { 'RAW Water': rawWater > 0 ? rawWater.toFixed(2) : null, 'RO Water': rawWater > 0 ? roWater.toFixed(2) : null };
    const sec2_items = SEC2_ITEMS
      .filter(item => item.type === 'computed' ? !!computedMap[item.name] : (sec2Values[item.name]?.value_text || sec2Values[item.name]?.item_status))
      .map(item => ({ item_name: item.name, value_text: item.type === 'computed' ? computedMap[item.name] : (sec2Values[item.name]?.value_text || null), item_status: sec2Values[item.name]?.item_status || null }));
    return { entries, sec2_items };
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!header.log_date) { toast.error('Date is required'); return; }
    const { entries } = buildPayload();
    if (entries.length === 0) { toast.error('Please fill at least one pump entry'); return; }
    setShowPreview(true);
  };

  const handleConfirmSubmit = async () => {
    const { entries, sec2_items } = buildPayload();
    setSubmitting(true);
    try {
      await hbmAPI.createPumpParamLog({ log_date: header.log_date, size_value: header.size_value || null, entries, sec2_items });
      toast.success('Pump Parameter Report submitted!');
      navigate('/hbm/pump-param/history');
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-5xl mx-auto">

        {/* Page Header */}
        <div className="flex items-center space-x-3 mb-6">
          <button onClick={() => navigate('/hbm/dashboard')}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Pump Parameter Report</h1>
            <p className="text-sm text-gray-500">Daily pump readings — Section 1 &amp; 2</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>

          {/* Header */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
            <h2 className="text-base font-bold text-gray-800 mb-4">Sheet Header</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Date <span className="text-red-500">*</span>
                </label>
                <input type="date" value={header.log_date} required
                  max={new Date().toLocaleDateString('en-CA')}
                  onChange={e => setHeader(p => ({ ...p, log_date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Size</label>
                <input type="text" value={header.size_value}
                  onChange={e => setHeader(p => ({ ...p, size_value: e.target.value }))}
                  placeholder="e.g. 100mm"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
            </div>
          </div>

          {/* ── SECTION 1 ── */}
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px flex-1 bg-gray-200" />
            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Section 1 — Pump Parameters</span>
            <div className="h-px flex-1 bg-gray-200" />
          </div>

          {PUMP_GROUPS.map(group => {
            const { filled, total, highCount } = getGroupSummary(group);
            const isOpen = openGroups[group.key];
            return (
              <div key={group.key} className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-3">
                {/* Group Header */}
                <button type="button" onClick={() => toggleGroup(group.key)}
                  className={`w-full flex items-center justify-between px-5 py-3 transition-colors ${
                    isOpen ? `${group.color} text-white` : 'hover:bg-gray-50 text-gray-900'
                  }`}>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-sm">{group.label}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                      isOpen ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                    }`}>{total} pump{total > 1 ? 's' : ''}</span>
                    {filled > 0 && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                        highCount > 0
                          ? 'bg-red-100 text-red-700'
                          : isOpen ? 'bg-white/20 text-white' : 'bg-green-100 text-green-700'
                      }`}>
                        {filled}/{total} filled{highCount > 0 ? ` · ${highCount} High` : ''}
                      </span>
                    )}
                  </div>
                  <svg className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Pump entries */}
                {isOpen && (
                  <div className="px-4 pt-3 pb-4">
                    {group.pumps.map(pump => (
                      <PumpEntry
                        key={pump.name}
                        pump={pump}
                        value={pumpValues[pump.name]}
                        onChange={handlePumpChange}
                        showPressure={group.key !== 'ICW_CT_FAN' && group.key !== 'DCW_CT_FAN' && group.key !== 'LAMINAR_CT_FAN' && group.key !== 'TMT_CT'}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* ── SECTION 2 ── */}
          <div className="flex items-center gap-3 mt-6 mb-4">
            <div className="h-px flex-1 bg-gray-200" />
            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Section 2 — Meter Readings</span>
            <div className="h-px flex-1 bg-gray-200" />
          </div>

          {(() => {
            const ro1 = parseFloat(sec2Values['RO-1']?.value_text) || 0;
            const ro2 = parseFloat(sec2Values['RO-2']?.value_text) || 0;
            const ro3 = parseFloat(sec2Values['RO-3']?.value_text) || 0;
            const rawWater   = ro1 + ro2 + ro3;
            const wasteWater = parseFloat(sec2Values['Waste Water']?.value_text) || 0;
            const roWater    = rawWater - wasteWater;

            const wasteWaterPct = rawWater > 0 ? (wasteWater / rawWater * 100).toFixed(1) : null;
            const roWaterPct    = rawWater > 0 ? (roWater    / rawWater * 100).toFixed(1) : null;

            return (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-5">
                {SEC2_ITEMS.map((item, idx) => (
                  <div key={item.name}
                    className={`px-5 py-4 ${idx < SEC2_ITEMS.length - 1 ? 'border-b border-gray-100' : ''}`}>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <p className="flex-1 text-sm font-medium text-gray-800">{item.name}
                        {item.unit && <span className="text-xs text-gray-400 ml-1">({item.unit})</span>}
                      </p>
                      <div className="flex-shrink-0 flex items-center gap-2">
                        {/* Computed read-only fields */}
                        {item.type === 'computed' && (
                          <input
                            type="text"
                            readOnly
                            value={
                              item.name === 'RAW Water'
                                ? (rawWater > 0 ? rawWater.toFixed(2) : '—')
                                : item.name === 'RO Water'
                                  ? (rawWater > 0 ? roWater.toFixed(2) : '—')
                                  : '—'
                            }
                            className="w-32 px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-700 cursor-not-allowed" />
                        )}
                        {/* Regular number inputs */}
                        {item.type === 'number' && (
                          <input
                            type="number" step="0.01" min="0"
                            value={sec2Values[item.name]?.value_text ?? ''}
                            onChange={e => handleSec2Change(item.name, 'value_text', e.target.value)}
                            placeholder="0.00"
                            className="w-32 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                        )}
                        {/* Percentage badges */}
                        {item.name === 'Waste Water' && wasteWaterPct !== null && (
                          <span className="text-xs font-bold px-2 py-1 rounded-lg bg-orange-100 text-orange-700 whitespace-nowrap">
                            {wasteWaterPct}%
                          </span>
                        )}
                        {item.name === 'RO Water' && roWaterPct !== null && (
                          <span className="text-xs font-bold px-2 py-1 rounded-lg bg-blue-100 text-blue-700 whitespace-nowrap">
                            {roWaterPct}%
                          </span>
                        )}
                        {item.type === 'text' && (
                          <input
                            type="text"
                            value={sec2Values[item.name]?.value_text ?? ''}
                            onChange={e => handleSec2Change(item.name, 'value_text', e.target.value)}
                            placeholder={item.placeholder || ''}
                            className="w-48 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                        )}
                        {item.type === 'status' && (
                          <div className="flex gap-1.5">
                            <button type="button"
                              onClick={() => handleSec2Change(item.name, 'item_status', 'OK')}
                              className={`px-4 py-1.5 rounded-lg text-xs font-bold border-2 transition-all ${
                                sec2Values[item.name]?.item_status === 'OK'
                                  ? 'bg-green-500 border-green-500 text-white'
                                  : 'bg-white border-gray-300 text-gray-600 hover:border-green-400'
                              }`}>OK</button>
                            <button type="button"
                              onClick={() => handleSec2Change(item.name, 'item_status', 'NOT_OK')}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-all ${
                                sec2Values[item.name]?.item_status === 'NOT_OK'
                                  ? 'bg-red-500 border-red-500 text-white'
                                  : 'bg-white border-gray-300 text-gray-600 hover:border-red-400'
                              }`}>NOT OK</button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}

          {/* Submit */}
          <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 mt-5 shadow-lg rounded-t-xl">
            <button type="submit"
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-bold text-base hover:bg-blue-700 transition-colors">
              Preview & Submit
            </button>
          </div>

        </form>
      </div>
    </div>

    <ChecksheetPreviewModal
      isOpen={showPreview}
      title="Pump Parameter Report"
      onEdit={() => setShowPreview(false)}
      onConfirm={handleConfirmSubmit}
      submitting={submitting}
    >
      <PreviewGrid rows={[['Date', header.log_date], ['Size', header.size_value]]} />
      <PreviewSection title="Section 1 — Pump Groups" color="bg-blue-700">
        <div className="space-y-2">
          {PUMP_GROUPS.map(group => {
            const filledPumps = group.pumps.filter(p => pumpValues[p.name]?.status);
            const offPumps    = group.pumps.filter(p => pumpValues[p.name]?.status === 'OFF');
            return (
              <div key={group.key} className="border border-gray-200 rounded-lg p-3">
                <p className="text-xs font-bold text-gray-700 mb-1">{group.label}</p>
                <div className="flex flex-wrap gap-1">
                  {group.pumps.map(p => {
                    const v = pumpValues[p.name];
                    const s = v?.status;
                    return (
                      <span key={p.name} className={`text-xs px-2 py-0.5 rounded-full font-semibold ${s === 'ON' ? 'bg-green-100 text-green-700' : s === 'OFF' ? 'bg-gray-100 text-gray-600' : 'bg-yellow-100 text-yellow-700'}`}>
                        {p.name.replace(group.label + ' ', '')}: {s || '—'}
                      </span>
                    );
                  })}
                </div>
                <p className="text-xs text-gray-400 mt-1">{filledPumps.length}/{group.pumps.length} filled · {offPumps.length} OFF</p>
              </div>
            );
          })}
        </div>
      </PreviewSection>
    </ChecksheetPreviewModal>
    </>
  );
};

export default PumpParamForm;
