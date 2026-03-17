import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { hbmAPI } from '../../services/api';

// ─── SHEET CONFIGURATION ─────────────────────────────────────────────────────

const SECTION_1_BLOCK = 'ROUGHING STAND';
const SECTION_1_ITEMS = [
  'GEARBOX 1 & 2 VIBRATION',
  'CARDON SHAFT BOLTS & GREASING',
  'GEAR COUPLINGS GREASING',
  'ROLLER CONDITION',
  'PULLEYS CONDITION',
  'BELTS CONDITION',
  'CHAIN SPROCKETS CONDITION',
  'FLYWHEEL CONDITION',
];

const SECTION_2_BLOCKS = [
  'C1','C2','C3','C4','C5','C6','C7',
  'C8','C9','C10','C11','C12','C13','C14',
];
const SECTION_2_ITEMS = [
  'GEAR BOX VIBRATION',
  'GEAR COUPLING CONDITION & BOLTS',
  'GEAR COUPLING GREASING',
  'CARDON SHAFT GREASING',
  'LOCKING CYLINDER LEAKAGES',
  'CARDON SHAFT BOLT',
  'HYDROULIC HOSE PIPE CONDITION',
  'WATER PIPE CONDITION',
];

// ─── Single Item Row ──────────────────────────────────────────────────────────
const ItemRow = ({ keyStr, item, value, onChange }) => {
  const isNotOk = value?.status === 'NOT_OK';
  return (
    <div className={`border-b border-gray-100 last:border-0 px-4 py-3 ${isNotOk ? 'bg-red-50' : ''}`}>
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <p className="flex-1 text-sm font-medium text-gray-800">{item}</p>
        <div className="flex gap-2 flex-shrink-0">
          <button type="button"
            onClick={() => onChange(keyStr, { status: 'OK', remark: '', action_taken: '' })}
            className={`px-5 py-1.5 rounded-lg text-sm font-bold border-2 transition-all ${
              value?.status === 'OK'
                ? 'bg-green-500 border-green-500 text-white shadow-sm'
                : 'bg-white border-gray-300 text-gray-600 hover:border-green-400 hover:text-green-600'
            }`}>OK</button>
          <button type="button"
            onClick={() => onChange(keyStr, { status: 'NOT_OK', remark: value?.remark || '', action_taken: value?.action_taken || '' })}
            className={`px-4 py-1.5 rounded-lg text-sm font-bold border-2 transition-all ${
              value?.status === 'NOT_OK'
                ? 'bg-red-500 border-red-500 text-white shadow-sm'
                : 'bg-white border-gray-300 text-gray-600 hover:border-red-400 hover:text-red-600'
            }`}>NOT OK</button>
        </div>
      </div>
      {isNotOk && (
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-red-700 mb-1">Remark <span className="text-red-500">*</span></label>
            <input type="text"
              value={value?.remark || ''}
              onChange={e => onChange(keyStr, { ...value, remark: e.target.value })}
              placeholder="Describe the issue..."
              className="w-full px-3 py-2 border-2 border-red-200 rounded-lg text-sm bg-white focus:outline-none focus:border-red-400" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-orange-700 mb-1">Action Taken <span className="text-red-500">*</span></label>
            <input type="text"
              value={value?.action_taken || ''}
              onChange={e => onChange(keyStr, { ...value, action_taken: e.target.value })}
              placeholder="Action taken to fix..."
              className="w-full px-3 py-2 border-2 border-orange-200 rounded-lg text-sm bg-white focus:outline-none focus:border-orange-400" />
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Section Footer (Remark / Result / Checked By) ───────────────────────────
const SectionFooter = ({ label, data, onChange }) => (
  <div className="bg-gray-50 border-t border-gray-200 px-5 py-4">
    <p className="text-xs font-bold text-gray-500 uppercase mb-3">{label} — Summary</p>
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">Remark</label>
        <input type="text" value={data.remark}
          onChange={e => onChange({ ...data, remark: e.target.value })}
          placeholder="Section remark..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent" />
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">Result</label>
        <select value={data.result} onChange={e => onChange({ ...data, result: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent">
          <option value="">— Select —</option>
          <option value="OK">OK</option>
          <option value="NOT_OK">NOT OK</option>
        </select>
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">Checked By</label>
        <input type="text" value={data.checked_by}
          onChange={e => onChange({ ...data, checked_by: e.target.value })}
          placeholder="Inspector name..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent" />
      </div>
    </div>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const RollingStandForm = () => {
  const navigate = useNavigate();

  const [header, setHeader] = useState({
    log_date: new Date().toISOString().split('T')[0],
    log_time: new Date().toTimeString().slice(0, 5),
    shift: 'DAY',
  });

  const [itemValues, setItemValues] = useState({});
  const [openBlocks, setOpenBlocks] = useState({});

  const [sec1Footer, setSec1Footer] = useState({ remark: '', result: '', checked_by: '' });
  const [sec2Footer, setSec2Footer] = useState({ remark: '', result: '', checked_by: '' });

  const [submitting, setSubmitting] = useState(false);

  const handleItemChange = (key, val) => {
    setItemValues(prev => ({ ...prev, [key]: val }));
  };

  const toggleBlock = (block) => {
    setOpenBlocks(prev => ({ ...prev, [block]: !prev[block] }));
  };

  // Count filled / not-ok items for a given block & items list
  const getBlockCount = (block, items) => {
    let filled = 0, notOk = 0;
    items.forEach(item => {
      const k = `${block}__${item}`;
      if (itemValues[k]?.status) { filled++; if (itemValues[k].status === 'NOT_OK') notOk++; }
    });
    return { total: items.length, filled, notOk };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!header.log_date || !header.log_time || !header.shift) {
      toast.error('Date, time and shift are required');
      return;
    }

    const items = [];

    // Collect Section-1 items
    SECTION_1_ITEMS.forEach(item => {
      const k = `${SECTION_1_BLOCK}__${item}`;
      const val = itemValues[k];
      if (!val?.status) return;
      if (val.status === 'NOT_OK') {
        if (!val.remark?.trim()) { toast.error(`Remark required: ${item} (${SECTION_1_BLOCK})`); throw new Error('stop'); }
        if (!val.action_taken?.trim()) { toast.error(`Action Taken required: ${item} (${SECTION_1_BLOCK})`); throw new Error('stop'); }
      }
      items.push({ section_name: 'SECTION-1', block_name: SECTION_1_BLOCK, item_name: item, status: val.status, remark: val.remark || '', action_taken: val.action_taken || '' });
    });

    // Collect Section-2 items
    SECTION_2_BLOCKS.forEach(block => {
      SECTION_2_ITEMS.forEach(item => {
        const k = `${block}__${item}`;
        const val = itemValues[k];
        if (!val?.status) return;
        if (val.status === 'NOT_OK') {
          if (!val.remark?.trim()) { toast.error(`Remark required: ${item} (${block})`); throw new Error('stop'); }
          if (!val.action_taken?.trim()) { toast.error(`Action Taken required: ${item} (${block})`); throw new Error('stop'); }
        }
        items.push({ section_name: 'SECTION-2', block_name: block, item_name: item, status: val.status, remark: val.remark || '', action_taken: val.action_taken || '' });
      });
    });

    if (items.length === 0) {
      toast.error('Please fill at least one check item');
      return;
    }

    setSubmitting(true);
    try {
      await hbmAPI.createRollingStandLog({
        log_date: header.log_date,
        log_time: header.log_time,
        shift: header.shift,
        sec1_remark: sec1Footer.remark || null,
        sec1_result: sec1Footer.result || null,
        sec1_checked_by: sec1Footer.checked_by || null,
        sec2_remark: sec2Footer.remark || null,
        sec2_result: sec2Footer.result || null,
        sec2_checked_by: sec2Footer.checked_by || null,
        items,
      });
      toast.success('Rolling Stand checksheet submitted!');
      navigate('/hbm/dashboard');
    } catch (error) {
      if (error?.message === 'stop') return;
      toast.error(error?.response?.data?.message || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  return (
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
            <h1 className="text-xl font-bold text-gray-900">Rolling Stand Checksheet</h1>
            <p className="text-sm text-gray-500">Daily checksheet — saved to database</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>

          {/* Header Fields */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
            <h2 className="text-base font-bold text-gray-800 mb-4">Sheet Header</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Date <span className="text-red-500">*</span></label>
                <input type="date" value={header.log_date} required
                  max={new Date().toISOString().split('T')[0]}
                  onChange={e => setHeader(p => ({ ...p, log_date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Time <span className="text-red-500">*</span></label>
                <input type="time" value={header.log_time} required
                  onChange={e => setHeader(p => ({ ...p, log_time: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Shift <span className="text-red-500">*</span></label>
                <select value={header.shift} required
                  onChange={e => setHeader(p => ({ ...p, shift: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent">
                  <option value="DAY">Day</option>
                  <option value="NIGHT">Night</option>
                </select>
              </div>
            </div>
          </div>

          {/* ── SECTION 1 ── */}
          <div className="mb-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-px flex-1 bg-gray-200" />
              <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Section 1 — Roughing Stand</span>
              <div className="h-px flex-1 bg-gray-200" />
            </div>

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {/* Block toggle */}
              <button type="button" onClick={() => toggleBlock(SECTION_1_BLOCK)}
                className={`w-full flex items-center justify-between px-5 py-4 transition-colors ${
                  openBlocks[SECTION_1_BLOCK] ? 'bg-emerald-600 text-white' : 'bg-gray-50 hover:bg-gray-100 text-gray-900'
                }`}>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-base">{SECTION_1_BLOCK}</span>
                  {(() => {
                    const { total, filled, notOk } = getBlockCount(SECTION_1_BLOCK, SECTION_1_ITEMS);
                    return filled > 0 ? (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                        notOk > 0 ? 'bg-red-100 text-red-700'
                          : openBlocks[SECTION_1_BLOCK] ? 'bg-emerald-700 text-white' : 'bg-green-100 text-green-700'
                      }`}>{filled}/{total} {notOk > 0 ? `· ${notOk} NOT OK` : '· OK'}</span>
                    ) : null;
                  })()}
                </div>
                <svg className={`w-5 h-5 transition-transform ${openBlocks[SECTION_1_BLOCK] ? 'rotate-180' : ''}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {openBlocks[SECTION_1_BLOCK] && (
                <>
                  {SECTION_1_ITEMS.map(item => (
                    <ItemRow key={item} keyStr={`${SECTION_1_BLOCK}__${item}`} item={item}
                      value={itemValues[`${SECTION_1_BLOCK}__${item}`]}
                      onChange={handleItemChange} />
                  ))}
                </>
              )}

              <SectionFooter label="Section 1" data={sec1Footer} onChange={setSec1Footer} />
            </div>
          </div>

          {/* ── SECTION 2 ── */}
          <div className="mb-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-px flex-1 bg-gray-200" />
              <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Section 2 — C1 to C14</span>
              <div className="h-px flex-1 bg-gray-200" />
            </div>

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="space-y-0 divide-y divide-gray-100">
                {SECTION_2_BLOCKS.map(block => {
                  const { total, filled, notOk } = getBlockCount(block, SECTION_2_ITEMS);
                  const isOpen = openBlocks[block];
                  return (
                    <div key={block}>
                      <button type="button" onClick={() => toggleBlock(block)}
                        className={`w-full flex items-center justify-between px-5 py-3 transition-colors ${
                          isOpen ? 'bg-blue-600 text-white' : 'hover:bg-gray-50 text-gray-900'
                        }`}>
                        <div className="flex items-center gap-3">
                          <span className="font-bold">{block}</span>
                          {filled > 0 && (
                            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                              notOk > 0 ? 'bg-red-100 text-red-700'
                                : isOpen ? 'bg-blue-700 text-white' : 'bg-green-100 text-green-700'
                            }`}>{filled}/{total} {notOk > 0 ? `· ${notOk} NOT OK` : '· OK'}</span>
                          )}
                        </div>
                        <svg className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                          fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {isOpen && SECTION_2_ITEMS.map(item => (
                        <ItemRow key={item} keyStr={`${block}__${item}`} item={item}
                          value={itemValues[`${block}__${item}`]}
                          onChange={handleItemChange} />
                      ))}
                    </div>
                  );
                })}
              </div>

              <SectionFooter label="Section 2" data={sec2Footer} onChange={setSec2Footer} />
            </div>
          </div>

          {/* Submit */}
          <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 mt-5 shadow-lg rounded-t-xl">
            <button type="submit" disabled={submitting}
              className="w-full py-3 bg-emerald-600 text-white rounded-lg font-bold text-base hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Submitting...
                </span>
              ) : 'Submit Rolling Stand Checksheet'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default RollingStandForm;
