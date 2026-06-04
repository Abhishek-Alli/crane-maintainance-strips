import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { hbmAPI } from '../../services/api';

const TIME_SLOTS = [
  '08:00-09:00','09:00-10:00','10:00-11:00','11:00-12:00',
  '12:00-13:00','13:00-14:00','14:00-15:00','15:00-16:00',
  '16:00-17:00','17:00-18:00','18:00-19:00','19:00-20:00',
  '20:00-21:00','21:00-22:00','22:00-23:00','23:00-00:00',
  '00:00-01:00','01:00-02:00','02:00-03:00','03:00-04:00',
  '04:00-05:00','05:00-06:00','06:00-07:00','07:00-08:00',
];

const BREAKDOWN_TYPES = [
  'Mill Breakdown',
  'Mechanical Breakdown',
  'Electrical Breakdown',
  'RHF Breakdown',
  'Mill Maintenance',
  '132 KV Breakdown',
  'RHF Low Temperature',
  'Cold, CCM Chilli & Piping Breakdown',
  'CCM Heat Over',
  'Other',
  'Contractor Mistake',
];

const SIZE_OPTIONS = ['12MM', '16MM', '20MM'];

const emptyEntry = () => ({ breakdown_type: '', breakdown_minutes: '', breakdown_reason: '' });

const initSlots = () =>
  TIME_SLOTS.map((label, i) => ({
    slot_label: label,
    slot_order: i + 1,
    miss_roll: '',
    miss_roll_18: '',
    entries: [emptyEntry()],
  }));

const sumByType = (slots, type) =>
  slots.flatMap(s => s.entries)
    .filter(e => e.breakdown_type === type)
    .reduce((acc, e) => acc + (parseInt(e.breakdown_minutes) || 0), 0);

const calcSummary = (slots) => {
  const mill   = sumByType(slots, 'Mill Breakdown');
  const mech   = sumByType(slots, 'Mechanical Breakdown');
  const elec   = sumByType(slots, 'Electrical Breakdown');
  const rhf    = sumByType(slots, 'RHF Breakdown');
  const tmt    = mill + mech + elec + rhf;
  const maint  = sumByType(slots, 'Mill Maintenance');
  const kv132  = sumByType(slots, '132 KV Breakdown');
  const rhfLow = sumByType(slots, 'RHF Low Temperature');
  const cold   = sumByType(slots, 'Cold, CCM Chilli & Piping Breakdown');
  const ccm    = sumByType(slots, 'CCM Heat Over');
  const other  = sumByType(slots, 'Other');
  const cont   = sumByType(slots, 'Contractor Mistake');
  const total  = tmt + maint + kv132 + rhfLow + cold + ccm + other + cont;
  return { mill, mech, elec, rhf, tmt, maint, kv132, rhfLow, cold, ccm, other, cont, total };
};

const BreakdownReportForm = () => {
  const navigate = useNavigate();
  const [logDate, setLogDate] = useState(new Date().toLocaleDateString('en-CA'));
  const [size, setSize]       = useState('');
  const [customSize, setCustomSize] = useState('');
  const [slots, setSlots]     = useState(initSlots);
  const [openSlots, setOpenSlots] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const toggleSlot = (i) => setOpenSlots(prev => ({ ...prev, [i]: !prev[i] }));

  const updateSlot = (i, field, val) =>
    setSlots(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: val } : s));

  const updateEntry = (si, ei, field, val) =>
    setSlots(prev => prev.map((s, idx) => {
      if (idx !== si) return s;
      const entries = s.entries.map((e, eidx) => eidx === ei ? { ...e, [field]: val } : e);
      return { ...s, entries };
    }));

  const addEntry = (si) =>
    setSlots(prev => prev.map((s, idx) =>
      idx === si ? { ...s, entries: [...s.entries, emptyEntry()] } : s));

  const removeEntry = (si, ei) =>
    setSlots(prev => prev.map((s, idx) => {
      if (idx !== si) return s;
      if (s.entries.length === 1) return s;
      return { ...s, entries: s.entries.filter((_, eidx) => eidx !== ei) };
    }));

  const summary = calcSummary(slots);

  const handleSubmit = async () => {
    if (!logDate) return toast.error('Please select a date');
    const finalSize = size === 'Custom' ? customSize.trim() : size;
    if (!finalSize) return toast.error('Please select or enter a size');

    setSubmitting(true);
    try {
      const payload = {
        log_date: logDate,
        size: finalSize,
        slots: slots.map(s => ({
          ...s,
          entries: s.entries.filter(e => e.breakdown_type),
        })),
      };
      await hbmAPI.createBreakdownLog(payload);
      toast.success('Breakdown report submitted successfully!');
      navigate('/hbm/breakdown/history');
    } catch (err) {
      console.error(err);
      toast.error('Failed to submit breakdown report');
    } finally {
      setSubmitting(false);
    }
  };

  const SummaryRow = ({ label, value, highlight }) => (
    <div className={`flex justify-between items-center py-2 px-3 rounded-lg ${highlight ? 'bg-blue-50 font-bold' : 'bg-gray-50'}`}>
      <span className="text-sm text-gray-700">{label}</span>
      <span className={`text-sm font-semibold ${highlight ? 'text-blue-700' : 'text-gray-900'}`}>{value} min</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="mb-6">
          <button onClick={() => navigate('/hbm/dashboard')}
            className="text-sm text-gray-500 hover:text-gray-700 mb-2 flex items-center gap-1">
            ← Back to Dashboard
          </button>
          <h1 className="text-2xl font-bold text-gray-900">HBM Breakdown Report</h1>
          <p className="text-gray-500 text-sm mt-1">24-hour breakdown checksheet (08:00 AM to 08:00 AM)</p>
        </div>

        {/* Top fields */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Date <span className="text-red-500">*</span></label>
              <input type="date" value={logDate} onChange={e => setLogDate(e.target.value)}
                max={new Date().toLocaleDateString('en-CA')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Size <span className="text-red-500">*</span></label>
              <select value={size} onChange={e => setSize(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500">
                <option value="">-- Select Size --</option>
                {SIZE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                <option value="Custom">Custom</option>
              </select>
            </div>
            {size === 'Custom' && (
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Custom Size <span className="text-red-500">*</span></label>
                <input type="text" value={customSize} onChange={e => setCustomSize(e.target.value)}
                  placeholder="e.g. 25MM"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
              </div>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-3">Time Zone: Today 08:00 AM → Tomorrow 08:00 AM (24-hour report)</p>
        </div>

        {/* Hourly Slots */}
        <div className="mb-6 space-y-3">
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Hourly Breakdown Entries</h2>

          {slots.map((slot, si) => {
            const isOpen = !!openSlots[si];
            const hasData = slot.miss_roll !== '' || slot.miss_roll_18 !== '' ||
              slot.entries.some(e => e.breakdown_type || e.breakdown_minutes || e.breakdown_reason);
            const slotTotal = slot.entries.reduce((acc, e) => acc + (parseInt(e.breakdown_minutes) || 0), 0);

            return (
              <div key={si} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                {/* Slot Header */}
                <button
                  onClick={() => toggleSlot(si)}
                  className="w-full flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors text-left">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-gray-800">{slot.slot_label}</span>
                    {hasData && (
                      <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-semibold">
                        {slotTotal > 0 ? `${slotTotal} min` : 'Data entered'}
                      </span>
                    )}
                  </div>
                  <span className="text-gray-400 text-sm">{isOpen ? '▲' : '▼'}</span>
                </button>

                {/* Slot Body */}
                {isOpen && (
                  <div className="border-t border-gray-100 p-5 space-y-4">
                    {/* Miss Roll fields */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Miss Roll</label>
                        <input type="number" min="0" value={slot.miss_roll}
                          onChange={e => updateSlot(si, 'miss_roll', e.target.value)}
                          placeholder="0"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">18" Miss Roll</label>
                        <input type="number" min="0" value={slot.miss_roll_18}
                          onChange={e => updateSlot(si, 'miss_roll_18', e.target.value)}
                          placeholder="0"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
                      </div>
                    </div>

                    {/* Breakdown entries */}
                    <div>
                      <p className="text-xs font-semibold text-gray-500 mb-2">Breakdown Entries</p>
                      <div className="space-y-3">
                        {slot.entries.map((entry, ei) => (
                          <div key={ei} className="bg-gray-50 rounded-lg p-3 space-y-2">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                              <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1">Breakdown Type</label>
                                <select value={entry.breakdown_type}
                                  onChange={e => updateEntry(si, ei, 'breakdown_type', e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400 bg-white">
                                  <option value="">-- Select --</option>
                                  {BREAKDOWN_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1">Breakdown Minutes</label>
                                <input type="number" min="0" value={entry.breakdown_minutes}
                                  onChange={e => updateEntry(si, ei, 'breakdown_minutes', e.target.value)}
                                  placeholder="Minutes"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1">Breakdown Reason</label>
                                <input type="text" value={entry.breakdown_reason}
                                  onChange={e => updateEntry(si, ei, 'breakdown_reason', e.target.value)}
                                  placeholder="Reason..."
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
                              </div>
                            </div>
                            {slot.entries.length > 1 && (
                              <button onClick={() => removeEntry(si, ei)}
                                className="text-xs text-red-500 hover:text-red-700 font-medium">
                                − Remove Row
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                      <button onClick={() => addEntry(si)}
                        className="mt-2 text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1">
                        + Add Row
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Summary Section */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-6">
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-4">Summary (Auto-Calculated)</h2>
          <div className="space-y-2">
            <SummaryRow label="Mill Breakdown Time"                          value={summary.mill} />
            <SummaryRow label="Mechanical Breakdown Time"                    value={summary.mech} />
            <SummaryRow label="Electrical Breakdown Time"                    value={summary.elec} />
            <SummaryRow label="RHF Breakdown Time"                           value={summary.rhf} />
            <SummaryRow label="TMT (HBM) Total Breakdown Time"               value={summary.tmt}  highlight />
            <div className="h-px bg-gray-200 my-1" />
            <SummaryRow label="Mill Maintenance Time"                        value={summary.maint} />
            <SummaryRow label="132 KV Breakdown Time"                        value={summary.kv132} />
            <SummaryRow label="RHF Low Temperature Time"                     value={summary.rhfLow} />
            <SummaryRow label="Cold, CCM Chilli & Piping Breakdown Time"     value={summary.cold} />
            <SummaryRow label="CCM Heat Over Time"                           value={summary.ccm} />
            <SummaryRow label="Other Time"                                   value={summary.other} />
            <SummaryRow label="Contractor Mistake"                           value={summary.cont} />
            <SummaryRow label="Total Breakdown Time"                         value={summary.total} highlight />
          </div>
        </div>

        {/* Submit */}
        <div className="flex gap-3 justify-end">
          <button onClick={() => navigate('/hbm/breakdown/history')}
            className="px-6 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={submitting}
            className="px-6 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed">
            {submitting ? 'Submitting…' : 'Submit Report'}
          </button>
        </div>

      </div>
    </div>
  );
};

export default BreakdownReportForm;
