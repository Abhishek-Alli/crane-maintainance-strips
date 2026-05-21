import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { hbmAPI } from '../../services/api';
import ChecksheetPreviewModal, { PreviewSection, PreviewGrid } from './ChecksheetPreviewModal';

// ─── STANDS ──────────────────────────────────────────────────────────────────
const STANDS = [
  'C-1', 'C-2', 'CCS-1', 'C-3', 'C-4', 'CCS-2',
  'C-5', 'C-6', 'C-7', 'C-8', 'C-9', 'C-10',
  'C-11', 'C-12', 'C-13', 'C-14',
  'PRE PINCH', 'POST PINCH', 'FLY. SHEAR', 'CONST. SHEAR',
  'TB-1', 'TB-2', 'RAKE-1', 'RAKE-2',
];

// ─── DEFAULT KW VALUES PER STAND ─────────────────────────────────────────────
const STAND_DEFAULTS = {
  'C-1':        { dc_motor_kw: '400', blower_kw_rating: '7.5' },
  'C-2':        { dc_motor_kw: '400', blower_kw_rating: '9.3' },
  'CCS-1':      { dc_motor_kw: '250', blower_kw_rating: '5.5' },
  'C-3':        { dc_motor_kw: '400', blower_kw_rating: '9.3' },
  'C-4':        { dc_motor_kw: '400', blower_kw_rating: '9.3' },
  'CCS-2':      { dc_motor_kw: '110', blower_kw_rating: '5.5' },
  'C-5':        { dc_motor_kw: '400', blower_kw_rating: '9.3' },
  'C-6':        { dc_motor_kw: '400', blower_kw_rating: '7.5' },
  'C-7':        { dc_motor_kw: '400', blower_kw_rating: '7.5' },
  'C-8':        { dc_motor_kw: '400', blower_kw_rating: '7.5' },
  'C-9':        { dc_motor_kw: '400', blower_kw_rating: '7.5' },
  'C-10':       { dc_motor_kw: '400', blower_kw_rating: '7.5' },
  'C-11':       { dc_motor_kw: '300', blower_kw_rating: '7.5' },
  'C-12':       { dc_motor_kw: '400', blower_kw_rating: '7.5' },
  'C-13':       { dc_motor_kw: '400', blower_kw_rating: '7.5' },
  'C-14':       { dc_motor_kw: '400', blower_kw_rating: '7.5' },
  'PRE PINCH':  { dc_motor_kw: '60',  blower_kw_rating: '3.7' },
  'POST PINCH': { dc_motor_kw: '60',  blower_kw_rating: '3.7' },
  'FLY. SHEAR': { dc_motor_kw: '250', blower_kw_rating: '7.5' },
  'CONST. SHEAR': { dc_motor_kw: '250', blower_kw_rating: '7.5' },
  'TB-1':       { dc_motor_kw: '90',  blower_kw_rating: '3.7' },
  'TB-2':       { dc_motor_kw: '90',  blower_kw_rating: '3.7' },
  'RAKE-1':     { dc_motor_kw: '110', blower_kw_rating: '3.7' },
  'RAKE-2':     { dc_motor_kw: '110', blower_kw_rating: '3.7' },
};

// ─── STATUS HELPERS ───────────────────────────────────────────────────────────
// Per-stand KPA thresholds: ok = lower bound for OK, notOk = upper bound for NOT_OK
// When ok === notOk it's a simple threshold; when ok > notOk there is a gap zone (no badge).
const KPA_THRESHOLDS = {
  'CCS-1':        { ok: 2.3, notOk: 2.1 },
  'CCS-2':        { ok: 2.3, notOk: 2.1 },
  'PRE PINCH':    { ok: 2.1, notOk: 2.1 },
  'POST PINCH':   { ok: 2.1, notOk: 2.1 },
  'TB-1':         { ok: 2.1, notOk: 2.1 },
  'TB-2':         { ok: 2.1, notOk: 2.1 },
  'RAKE-1':       { ok: 2.1, notOk: 2.1 },
  'RAKE-2':       { ok: 2.1, notOk: 2.1 },
};
const DEFAULT_KPA = { ok: 2.3, notOk: 2.3 };

const getKpaStatus = (v, stand) => {
  const n = parseFloat(v);
  if (isNaN(n)) return null;
  const { ok, notOk } = KPA_THRESHOLDS[stand] || DEFAULT_KPA;
  if (n >= ok) return 'OK';
  if (n < notOk) return 'NOT_OK';
  return null;
};
const getKpaHint = (stand) => {
  const { ok, notOk } = KPA_THRESHOLDS[stand] || DEFAULT_KPA;
  return ok === notOk
    ? `OK if ≥ ${ok} KPA`
    : `OK if ≥ ${ok} KPA, NOT OK if < ${notOk} KPA`;
};
const getTempStatus = (v) => { const n = parseFloat(v); return isNaN(n) ? null : (n < 70  ? 'OK' : 'NOT_OK'); };
const getVibStatus  = (v) => { const n = parseFloat(v); return isNaN(n) ? null : (n < 4   ? 'OK' : 'NOT_OK'); };

const StatusBadge = ({ status }) => {
  if (!status) return null;
  return status === 'OK'
    ? <span className="ml-1 text-xs font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">OK</span>
    : <span className="ml-1 text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">NOT OK</span>;
};

// ─── NUMBER INPUT ─────────────────────────────────────────────────────────────
const NumInput = ({ label, value, onChange, hint, status, step = '0.01', unit }) => (
  <div>
    <label className="block text-xs font-semibold text-gray-600 mb-1">
      {label}{unit && <span className="font-normal text-gray-400"> ({unit})</span>}
      <StatusBadge status={status} />
    </label>
    <input
      type="number" step={step} min="0"
      value={value ?? ''}
      onChange={e => onChange(e.target.value)}
      placeholder="—"
      className={`w-full px-3 py-2 border-2 rounded-lg text-sm focus:outline-none focus:ring-1 transition-colors ${
        status === 'OK'     ? 'border-green-400 bg-green-50 focus:ring-green-400' :
        status === 'NOT_OK' ? 'border-red-400   bg-red-50   focus:ring-red-400'   :
        'border-gray-300 bg-white focus:ring-blue-400'
      }`}
    />
    {hint && <p className="text-xs text-gray-400 mt-0.5">{hint}</p>}
  </div>
);

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
const DcMotorAirflowForm = () => {
  const navigate = useNavigate();

  const [header, setHeader] = useState({
    log_date:   new Date().toLocaleDateString('en-CA'),
    shift_eng:  '',
    reading_by: '',
  });
  const [values, setValues]     = useState(() => {
    const init = {};
    for (const stand of STANDS) {
      if (STAND_DEFAULTS[stand]) init[stand] = { ...STAND_DEFAULTS[stand] };
    }
    return init;
  });
  const [standStatus2, setStandStatus2] = useState(() => {
    const init = {};
    for (const stand of STANDS) init[stand] = 'ON';
    return init;
  });
  const [remark, setRemark]     = useState('');
  const [openStands, setOpenStands] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const toggleStandOnOff = (stand, status) => {
    setStandStatus2(prev => ({ ...prev, [stand]: status }));
    if (status === 'OFF') {
      setValues(prev => ({
        ...prev,
        [stand]: STAND_DEFAULTS[stand] ? { ...STAND_DEFAULTS[stand] } : {},
      }));
    }
  };

  const set = (stand, field, val) =>
    setValues(prev => ({ ...prev, [stand]: { ...(prev[stand] || {}), [field]: val } }));

  const get = (stand, field) => values[stand]?.[field] ?? '';

  const toggleStand = (stand) =>
    setOpenStands(prev => ({ ...prev, [stand]: !prev[stand] }));

  // count NOT OK fields per stand for badge
  const standStatus = (stand) => {
    const v = values[stand] || {};
    const notOk = [
      getKpaStatus(v.running_kpa, stand),
      v.air_flow_condition,
      getTempStatus(v.dc_motor_temp),
      getTempStatus(v.de_bearing_temp),
      getTempStatus(v.nde_bearing_temp),
      getTempStatus(v.blower_motor_temp),
      getVibStatus(v.motor_center_vib),
      getVibStatus(v.encoder_side_vib),
      getVibStatus(v.blower_vib),
    ].filter(s => s === 'NOT_OK').length;
    const filled = Object.values(v).filter(x => x !== '' && x != null).length;
    return { filled, notOk };
  };

  const buildEntries = () => STANDS.map(stand => {
      const v = values[stand] || {};
      const isOff = standStatus2[stand] === 'OFF';
      const kpa = !isOff && v.running_kpa !== '' && v.running_kpa != null ? v.running_kpa : null;
      return {
        stand_name:               stand,
        stand_status:             standStatus2[stand] || 'ON',
        dc_motor_kw:              !isOff && v.dc_motor_kw      !== '' ? v.dc_motor_kw      : null,
        blower_kw_rating:         !isOff && v.blower_kw_rating !== '' ? v.blower_kw_rating : null,
        running_kpa:              kpa,
        kpa_status:               kpa != null ? getKpaStatus(kpa, stand) : null,
        air_flow_condition:       !isOff ? (v.air_flow_condition || null) : null,
        dc_motor_temp:            !isOff && v.dc_motor_temp     !== '' ? v.dc_motor_temp     : null,
        dc_motor_temp_status:     !isOff && v.dc_motor_temp     !== '' && v.dc_motor_temp != null ? getTempStatus(v.dc_motor_temp) : null,
        de_bearing_temp:          !isOff && v.de_bearing_temp   !== '' ? v.de_bearing_temp   : null,
        de_bearing_temp_status:   !isOff && v.de_bearing_temp   !== '' && v.de_bearing_temp != null ? getTempStatus(v.de_bearing_temp) : null,
        nde_bearing_temp:         !isOff && v.nde_bearing_temp  !== '' ? v.nde_bearing_temp  : null,
        nde_bearing_temp_status:  !isOff && v.nde_bearing_temp  !== '' && v.nde_bearing_temp != null ? getTempStatus(v.nde_bearing_temp) : null,
        blower_motor_temp:        !isOff && v.blower_motor_temp !== '' ? v.blower_motor_temp : null,
        blower_motor_temp_status: !isOff && v.blower_motor_temp !== '' && v.blower_motor_temp != null ? getTempStatus(v.blower_motor_temp) : null,
        motor_center_vib:         !isOff && v.motor_center_vib  !== '' ? v.motor_center_vib  : null,
        motor_center_vib_status:  !isOff && v.motor_center_vib  !== '' && v.motor_center_vib != null ? getVibStatus(v.motor_center_vib) : null,
        encoder_side_vib:         !isOff && v.encoder_side_vib  !== '' ? v.encoder_side_vib  : null,
        encoder_side_vib_status:  !isOff && v.encoder_side_vib  !== '' && v.encoder_side_vib != null ? getVibStatus(v.encoder_side_vib) : null,
        blower_vib:               !isOff && v.blower_vib        !== '' ? v.blower_vib        : null,
        blower_vib_status:        !isOff && v.blower_vib        !== '' && v.blower_vib != null ? getVibStatus(v.blower_vib) : null,
      };
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!header.log_date) { toast.error('Date is required'); return; }
    const hasAnyOn = STANDS.some(s => standStatus2[s] === 'ON');
    if (!hasAnyOn) { toast.error('At least one stand must be ON'); return; }
    setShowPreview(true);
  };

  const handleConfirmSubmit = async () => {
    setSubmitting(true);
    try {
      await hbmAPI.createDcMotorAirflowLog({
        log_date:   header.log_date,
        shift_eng:  header.shift_eng  || null,
        reading_by: header.reading_by || null,
        remark:     remark || null,
        entries:    buildEntries(),
      });
      toast.success('DC Motor Airflow sheet submitted!');
      navigate('/hbm/dc-motor-airflow/history');
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

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
            <h1 className="text-xl font-bold text-gray-900">DC Motor Air Flow, Temperature &amp; Vibration</h1>
            <p className="text-sm text-gray-500">Daily report — all stands</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>

          {/* Sheet Header */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
            <h2 className="text-base font-bold text-gray-800 mb-4">Sheet Header</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                <label className="block text-sm font-semibold text-gray-700 mb-1">Shift Engineer</label>
                <input type="text" value={header.shift_eng}
                  onChange={e => setHeader(p => ({ ...p, shift_eng: e.target.value }))}
                  placeholder="Name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Reading Taken By</label>
                <input type="text" value={header.reading_by}
                  onChange={e => setHeader(p => ({ ...p, reading_by: e.target.value }))}
                  placeholder="Name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
            </div>
          </div>

          {/* Stand Entries */}
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px flex-1 bg-gray-200" />
            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Stand Readings</span>
            <div className="h-px flex-1 bg-gray-200" />
          </div>

          <div className="space-y-3 mb-5">
            {STANDS.map(stand => {
              const isOpen = openStands[stand];
              const isOff = standStatus2[stand] === 'OFF';
              const { filled, notOk } = standStatus(stand);
              return (
                <div key={stand} className={`bg-white rounded-xl border overflow-hidden ${isOff ? 'border-gray-200 opacity-70' : 'border-gray-200'}`}>
                  {/* Accordion Header */}
                  <div className={`flex items-center justify-between px-5 py-3 transition-colors ${
                    isOff ? 'bg-gray-100' : isOpen ? 'bg-blue-600 text-white' : 'bg-gray-50 hover:bg-gray-100 text-gray-900'
                  }`}>
                    <button type="button" onClick={() => !isOff && toggleStand(stand)}
                      className="flex items-center gap-3 flex-1 text-left">
                      <span className={`font-bold text-base ${isOff ? 'text-gray-400' : ''}`}>{stand}</span>
                      {!isOff && filled > 0 && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                          notOk > 0
                            ? 'bg-red-100 text-red-700'
                            : isOpen ? 'bg-blue-700 text-white' : 'bg-green-100 text-green-700'
                        }`}>
                          {notOk > 0 ? `${notOk} NOT OK` : 'OK'}
                        </span>
                      )}
                      {isOff && <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-gray-200 text-gray-500">OFF</span>}
                    </button>
                    {/* ON / OFF toggle */}
                    <div className="flex gap-1.5 ml-3">
                      <button type="button"
                        onClick={() => toggleStandOnOff(stand, 'ON')}
                        className={`px-3 py-1 rounded-lg text-xs font-bold border-2 transition-all ${
                          !isOff ? 'bg-green-500 border-green-500 text-white' : 'bg-white border-gray-300 text-gray-500 hover:border-green-400'
                        }`}>ON</button>
                      <button type="button"
                        onClick={() => toggleStandOnOff(stand, 'OFF')}
                        className={`px-3 py-1 rounded-lg text-xs font-bold border-2 transition-all ${
                          isOff ? 'bg-gray-500 border-gray-500 text-white' : 'bg-white border-gray-300 text-gray-500 hover:border-gray-400'
                        }`}>OFF</button>
                    </div>
                    {!isOff && (
                      <button type="button" onClick={() => toggleStand(stand)} className="ml-3">
                        <svg className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''} ${isOpen ? 'text-white' : 'text-gray-500'}`}
                          fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    )}
                  </div>

                  {isOpen && !isOff && (
                    <div className="p-5 space-y-5">

                      {/* KW & KPA */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <NumInput label="DC Motor KW" unit="KW"
                          value={get(stand, 'dc_motor_kw')}
                          onChange={v => set(stand, 'dc_motor_kw', v)} />
                        <NumInput label="Blower KW Rating" unit="KW"
                          value={get(stand, 'blower_kw_rating')}
                          onChange={v => set(stand, 'blower_kw_rating', v)} />
                        <NumInput label="Running KPA" unit="KPA" step="0.001"
                          value={get(stand, 'running_kpa')}
                          status={getKpaStatus(get(stand, 'running_kpa'), stand)}
                          hint={getKpaHint(stand)}
                          onChange={v => set(stand, 'running_kpa', v)} />
                      </div>

                      {/* Air Flow Condition */}
                      <div>
                        <p className="text-xs font-semibold text-gray-600 mb-2">Air Flow Condition</p>
                        <div className="flex gap-3">
                          {['OK', 'NOT_OK'].map(s => (
                            <button key={s} type="button"
                              onClick={() => set(stand, 'air_flow_condition', s)}
                              className={`px-5 py-2 rounded-lg text-sm font-bold border-2 transition-all ${
                                get(stand, 'air_flow_condition') === s
                                  ? s === 'OK' ? 'bg-green-500 border-green-500 text-white' : 'bg-red-500 border-red-500 text-white'
                                  : 'bg-white border-gray-300 text-gray-600 hover:border-gray-400'
                              }`}>
                              {s === 'NOT_OK' ? 'NOT OK' : 'OK'}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* DC Motor Temperature */}
                      <div>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">DC Motor Temperature</p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <NumInput label="Motor Temperature" unit="°C"
                            value={get(stand, 'dc_motor_temp')}
                            status={getTempStatus(get(stand, 'dc_motor_temp'))}
                            hint="OK if < 70 °C"
                            onChange={v => set(stand, 'dc_motor_temp', v)} />
                          <NumInput label="DE Bearing Temperature" unit="°C"
                            value={get(stand, 'de_bearing_temp')}
                            status={getTempStatus(get(stand, 'de_bearing_temp'))}
                            hint="OK if < 70 °C"
                            onChange={v => set(stand, 'de_bearing_temp', v)} />
                          <NumInput label="NDE Bearing Temperature" unit="°C"
                            value={get(stand, 'nde_bearing_temp')}
                            status={getTempStatus(get(stand, 'nde_bearing_temp'))}
                            hint="OK if < 70 °C"
                            onChange={v => set(stand, 'nde_bearing_temp', v)} />
                        </div>
                      </div>

                      {/* Blower Motor Temperature */}
                      <div>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Blower Motor Temperature</p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <NumInput label="Motor Temperature" unit="°C"
                            value={get(stand, 'blower_motor_temp')}
                            status={getTempStatus(get(stand, 'blower_motor_temp'))}
                            hint="OK if < 70 °C"
                            onChange={v => set(stand, 'blower_motor_temp', v)} />
                        </div>
                      </div>

                      {/* Vibration */}
                      <div>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Vibration</p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <NumInput label="Motor Center Vibration" unit="MM/S" step="0.001"
                            value={get(stand, 'motor_center_vib')}
                            status={getVibStatus(get(stand, 'motor_center_vib'))}
                            hint="OK if < 4 MM/S"
                            onChange={v => set(stand, 'motor_center_vib', v)} />
                          <NumInput label="Encoder Side Vibration" unit="MM/S" step="0.001"
                            value={get(stand, 'encoder_side_vib')}
                            status={getVibStatus(get(stand, 'encoder_side_vib'))}
                            hint="OK if < 4 MM/S"
                            onChange={v => set(stand, 'encoder_side_vib', v)} />
                          <NumInput label="Blower Vibration" unit="MM/S" step="0.001"
                            value={get(stand, 'blower_vib')}
                            status={getVibStatus(get(stand, 'blower_vib'))}
                            hint="OK if < 4 MM/S"
                            onChange={v => set(stand, 'blower_vib', v)} />
                        </div>
                      </div>

                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Remark */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Remark</label>
            <textarea rows={3} value={remark}
              onChange={e => setRemark(e.target.value)}
              placeholder="Any additional remarks..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none" />
          </div>

          {/* Submit */}
          <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 shadow-lg rounded-t-xl">
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
      title="DC Motor Air Flow, Temperature & Vibration"
      onEdit={() => setShowPreview(false)}
      onConfirm={handleConfirmSubmit}
      submitting={submitting}
    >
      <PreviewGrid rows={[['Date', header.log_date], ['Shift Eng', header.shift_eng], ['Reading By', header.reading_by]]} />
      <PreviewSection title="Stand Summary" color="bg-blue-700">
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {STANDS.map(stand => {
            const isOff = standStatus2[stand] === 'OFF';
            const { filled, notOk } = standStatus(stand);
            return (
              <div key={stand} className={`rounded-lg p-2 text-center border text-xs ${
                isOff ? 'border-gray-200 bg-gray-50' :
                notOk > 0 ? 'border-red-200 bg-red-50' :
                filled > 0 ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'
              }`}>
                <p className={`font-bold ${isOff ? 'text-gray-400' : 'text-gray-700'}`}>{stand}</p>
                {isOff
                  ? <p className="text-gray-400">OFF</p>
                  : filled > 0 && <p className="text-gray-500">{filled} fields{notOk > 0 ? ` · ${notOk} NOT OK` : ''}</p>
                }
              </div>
            );
          })}
        </div>
      </PreviewSection>
      {remark && <div className="bg-gray-50 rounded-lg p-3 text-sm"><span className="font-semibold text-gray-600">Remark: </span><span className="text-gray-800">{remark}</span></div>}
    </ChecksheetPreviewModal>
    </>
  );
};

export default DcMotorAirflowForm;
