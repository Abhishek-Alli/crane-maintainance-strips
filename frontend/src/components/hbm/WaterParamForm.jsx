import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { hbmAPI } from '../../services/api';
import ChecksheetPreviewModal, { PreviewSection, PreviewGrid } from './ChecksheetPreviewModal';

// ─── WATER SOURCES CONFIGURATION ─────────────────────────────────────────────

const WATER_SOURCES = [
  {
    key: 'RAW_WATER', label: 'Raw Water', canBeOff: false,
    params: {
      tds:         { min: 200, max: 2000 },
      hardness:    { min: 50,  max: 700  },
      ph:          { min: 6.5, max: 7.5  },
      temperature: { min: 23,  max: 36   },
    },
  },
  {
    key: 'ICW_WATER', label: 'ICW Water', canBeOff: false,
    params: {
      tds:         { min: 10,  max: 200  },
      hardness:    { min: 0,   max: 100  },
      ph:          { min: 6.5, max: 7.5  },
      temperature: { min: 23,  max: 38   },
    },
  },
  {
    key: 'TMT_WATER', label: 'TMT Water', canBeOff: false,
    params: {
      tds:         { min: 10,  max: 200  },
      hardness:    { min: 0,   max: 100  },
      ph:          { min: 6.5, max: 7.5  },
      temperature: { min: 23,  max: 36   },
    },
  },
  {
    key: 'DCW_WATER', label: 'DCW Water', canBeOff: false,
    params: {
      tds:         { min: 10,  max: 200  },
      hardness:    { min: 0,   max: 100  },
      ph:          { min: 6.5, max: 7.5  },
      temperature: { min: 23,  max: 36   },
    },
  },
  {
    key: 'LAMINAR_WATER', label: 'Laminar Water', canBeOff: false,
    params: {
      tds:         { min: 10,  max: 200  },
      hardness:    { min: 0,   max: 100  },
      ph:          { min: 6.5, max: 7.5  },
      temperature: { min: 23,  max: 37   },
    },
  },
  {
    key: 'RO_1', label: 'RO-1', canBeOff: true,
    params: {
      tds:         { min: 0,   max: 100  },
      hardness:    { min: 0,   max: 100  },
      ph:          { min: 6.5, max: 7.5  },
      temperature: { min: 0,   max: 36   },
    },
  },
  {
    key: 'RO_2', label: 'RO-2', canBeOff: true,
    params: {
      tds:         { min: 0,   max: 100  },
      hardness:    { min: 0,   max: 100  },
      ph:          { min: 6.5, max: 7.5  },
      temperature: { min: 0,   max: 36   },
    },
  },
  {
    key: 'RO_3', label: 'RO-3', canBeOff: true,
    params: {
      tds:         { min: 0,   max: 100  },
      hardness:    { min: 0,   max: 100  },
      ph:          { min: 6.5, max: 7.5  },
      temperature: { min: 0,   max: 36   },
    },
  },
  {
    key: 'RO_WASTE_1', label: 'RO Waste Water-1', canBeOff: true,
    params: {
      tds:         { min: 0,   max: 4000 },
      ph:          { min: 6.5, max: 7.5  },
      temperature: { min: 0,   max: 36   },
    },
  },
  {
    key: 'RO_WASTE_2', label: 'RO Waste Water-2', canBeOff: true,
    params: {
      tds:         { min: 0,   max: 4000 },
      ph:          { min: 6.5, max: 7.5  },
      temperature: { min: 0,   max: 36   },
    },
  },
  {
    key: 'RO_WASTE_3', label: 'RO Waste Water-3', canBeOff: true,
    params: {
      tds:         { min: 0,   max: 4000 },
      ph:          { min: 6.5, max: 7.5  },
      temperature: { min: 0,   max: 36   },
    },
  },
];

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const inRange = (val, min, max) => {
  if (val === '' || val == null) return null;
  const n = parseFloat(val);
  if (isNaN(n)) return null;
  return n >= min && n <= max;
};

const statusOf = (val, min, max) => {
  const ok = inRange(val, min, max);
  if (ok === null) return null;
  return ok ? 'OK' : 'NOT_OK';
};

const fieldClass = (ok) => {
  if (ok === null) return 'border-gray-300 bg-white';
  return ok ? 'border-green-400 bg-green-50' : 'border-red-300 bg-red-100';
};

// ─── PARAM LABELS ─────────────────────────────────────────────────────────────

const PARAM_META = {
  tds:         { label: 'TDS',         unit: 'ppm',  step: '0.01' },
  hardness:    { label: 'Hardness',    unit: 'ppm',  step: '0.01' },
  ph:          { label: 'PH',          unit: '',     step: '0.01' },
  temperature: { label: 'Temperature', unit: '°C',   step: '0.1'  },
};

// ─── SOURCE ROW COMPONENT ─────────────────────────────────────────────────────

const SourceRow = ({ source, value, onChange }) => {
  const v = value || {};
  const isOff = source.canBeOff && v.source_status === 'OFF';

  const handleVal = (param, val) => {
    const range = source.params[param];
    const status = statusOf(val, range.min, range.max);
    onChange(source.key, {
      ...v,
      [param]: val,
      [`${param}_status`]: status,
    });
  };

  return (
    <div className={`rounded-xl border-2 p-4 mb-3 last:mb-0 transition-all ${
      isOff ? 'border-gray-200 bg-gray-50' : 'border-blue-100 bg-white'
    }`}>
      {/* Source name + ON/OFF toggle */}
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-bold text-sm text-gray-800">{source.label}</h4>
        {source.canBeOff && (
          <div className="flex gap-1.5">
            <button type="button"
              onClick={() => onChange(source.key, { ...v, source_status: 'ON' })}
              className={`px-3 py-1 rounded-lg text-xs font-bold border-2 transition-all ${
                v.source_status === 'ON'
                  ? 'bg-green-500 border-green-500 text-white'
                  : 'bg-white border-gray-300 text-gray-500 hover:border-green-400'
              }`}>ON</button>
            <button type="button"
              onClick={() => onChange(source.key, { ...v, source_status: 'OFF' })}
              className={`px-3 py-1 rounded-lg text-xs font-bold border-2 transition-all ${
                v.source_status === 'OFF'
                  ? 'bg-gray-500 border-gray-500 text-white'
                  : 'bg-white border-gray-300 text-gray-500 hover:border-gray-400'
              }`}>OFF</button>
          </div>
        )}
      </div>

      {/* Parameter fields — hidden when OFF */}
      {!isOff && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Object.entries(source.params).map(([param, range]) => {
            const meta = PARAM_META[param];
            const val = v[param] ?? '';
            const ok = inRange(val, range.min, range.max);
            return (
              <div key={param}>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  {meta.label}
                  {meta.unit && <span className="font-normal text-gray-400 ml-1">({meta.unit})</span>}
                  <span className="font-normal text-gray-400 ml-1 block">
                    {range.min}–{range.max}
                  </span>
                </label>
                <input
                  type="number"
                  step={meta.step}
                  min="0"
                  value={val}
                  onChange={e => handleVal(param, e.target.value)}
                  placeholder="—"
                  className={`w-full px-2 py-1.5 border-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 ${fieldClass(ok)}`}
                />
              </div>
            );
          })}
        </div>
      )}
      {isOff && (
        <p className="text-xs text-gray-400 italic">Source is OFF — no readings required</p>
      )}
    </div>
  );
};

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

const WaterParamForm = () => {
  const navigate = useNavigate();

  const [logDate, setLogDate] = useState(new Date().toLocaleDateString('en-CA'));
  const [remark, setRemark]   = useState('');
  const [values, setValues]   = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const handleChange = (key, val) =>
    setValues(prev => ({ ...prev, [key]: val }));

  const countNotOk = () => {
    let count = 0;
    WATER_SOURCES.forEach(src => {
      const v = values[src.key];
      if (!v || v.source_status === 'OFF') return;
      Object.keys(src.params).forEach(param => {
        if (v[`${param}_status`] === 'NOT_OK') count++;
      });
    });
    return count;
  };

  const buildEntries = () => WATER_SOURCES.map(src => {
    const v = values[src.key] || {};
    const isOff = src.canBeOff && v.source_status === 'OFF';
    return {
      water_source:    src.label,
      source_status:   src.canBeOff ? (v.source_status || 'ON') : null,
      tds:             isOff ? null : (v.tds !== '' && v.tds != null ? v.tds : null),
      tds_status:      isOff ? null : (v.tds_status || null),
      hardness:        isOff || !src.params.hardness ? null : (v.hardness !== '' && v.hardness != null ? v.hardness : null),
      hardness_status: isOff || !src.params.hardness ? null : (v.hardness_status || null),
      ph:              isOff ? null : (v.ph !== '' && v.ph != null ? v.ph : null),
      ph_status:       isOff ? null : (v.ph_status || null),
      temperature:     isOff ? null : (v.temperature !== '' && v.temperature != null ? v.temperature : null),
      temp_status:     isOff ? null : (v.temp_status || null),
    };
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!logDate) { toast.error('Date is required'); return; }
    setShowPreview(true);
  };

  const handleConfirmSubmit = async () => {
    setSubmitting(true);
    try {
      await hbmAPI.createWaterParamLog({ log_date: logDate, remark: remark || null, entries: buildEntries() });
      toast.success('Water Parameter report submitted!');
      navigate('/hbm/water-param/history');
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  const notOkCount = countNotOk();

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
            <h1 className="text-xl font-bold text-gray-900">Pump House Water Parameters</h1>
            <p className="text-sm text-gray-500">Daily water quality readings</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>

          {/* Header */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
            <h2 className="text-base font-bold text-gray-800 mb-4">Sheet Header</h2>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Date <span className="text-red-500">*</span>
              </label>
              <input type="date" value={logDate} required
                max={new Date().toLocaleDateString('en-CA')}
                onChange={e => setLogDate(e.target.value)}
                className="w-full sm:w-56 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </div>
          </div>

          {/* Water Sources */}
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px flex-1 bg-gray-200" />
            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Water Source Readings</span>
            {notOkCount > 0 && (
              <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold">
                {notOkCount} NOT OK
              </span>
            )}
            <div className="h-px flex-1 bg-gray-200" />
          </div>

          {WATER_SOURCES.map(src => (
            <SourceRow
              key={src.key}
              source={src}
              value={values[src.key]}
              onChange={handleChange}
            />
          ))}

          {/* Remark */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 mt-5">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Remark</label>
            <textarea
              value={remark}
              onChange={e => setRemark(e.target.value)}
              rows={3}
              placeholder="Any observations or remarks..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

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
      title="Pump House Water Parameters"
      onEdit={() => setShowPreview(false)}
      onConfirm={handleConfirmSubmit}
      submitting={submitting}
    >
      <div className="bg-gray-50 rounded-lg p-3 text-sm">
        <span className="font-semibold text-gray-600">Date: </span>
        <span className="text-gray-900">{logDate}</span>
      </div>

      <PreviewSection title="Water Source Readings" color="bg-blue-700">
        <div className="space-y-3">
          {WATER_SOURCES.map(src => {
            const v = values[src.key] || {};
            const isOff = src.canBeOff && v.source_status === 'OFF';
            return (
              <div key={src.key} className="border border-gray-200 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold text-gray-700">{src.label}</p>
                  {src.canBeOff && (
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${v.source_status === 'OFF' ? 'bg-gray-100 text-gray-600' : 'bg-green-100 text-green-700'}`}>
                      {v.source_status || 'ON'}
                    </span>
                  )}
                </div>
                {isOff ? (
                  <p className="text-xs text-gray-400 italic">Source is OFF</p>
                ) : (
                  <PreviewGrid rows={Object.entries(src.params).map(([param, range]) => {
                    const meta = { tds: 'TDS (ppm)', hardness: 'Hardness (ppm)', ph: 'PH', temperature: 'Temp (°C)' };
                    const status = v[`${param}_status`];
                    return [`${meta[param] || param} [${range.min}–${range.max}]`, v[param] ? `${v[param]}${status ? ` · ${status}` : ''}` : ''];
                  })} />
                )}
              </div>
            );
          })}
        </div>
      </PreviewSection>

      {remark && (
        <div className="bg-gray-50 rounded-lg p-3 text-sm">
          <span className="font-semibold text-gray-600">Remark: </span>
          <span className="text-gray-800">{remark}</span>
        </div>
      )}
    </ChecksheetPreviewModal>
    </>
  );
};

export default WaterParamForm;
