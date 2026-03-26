import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { hbmAPI } from '../../services/api';

// ─── ITEM LISTS ────────────────────────────────────────────────────────────────

const STAND_ITEMS = [
  'ROLLGAP',
  'GUIDE',
  'TWIST PIPE',
  'ROLL PASS CHANGE / WELDING',
  'WATER PIPES',
];

const LOOPER_ITEMS = [
  'LOOPER ARM / REELS',
  'PNEUMATIC CYLINDER / FRL UNIT',
];

const SNAPSHEAR_ITEMS = [
  'SNAPSHEAR ARM / BLADE',
  'PNEUMATIC CYLINDER / FRL UNIT',
];

const PINCH_ITEMS = [
  'WHEEL',
  'PNEUMATIC CYLINDER / FRL UNIT',
];

const TAIL_ITEMS = [
  'WHEEL',
  'PNEUMATIC CYLINDER / FRL UNIT',
];

const SHEAR_ITEMS = [
  'BLADE',
  'DIVERTER',
  'SERVOMOTOR',
];

// ─── SHEET CONFIGURATION ──────────────────────────────────────────────────────

const STAND_BLOCKS = Object.fromEntries(
  Array.from({ length: 14 }, (_, i) => [`C${i + 1}`, STAND_ITEMS])
);

const SHEET_CONFIG = {
  'SECTION-1': {
    label: 'Section 1 — Rolling Stands C1–C14',
    color: 'bg-blue-700',
    blocks: STAND_BLOCKS,
  },
  'SECTION-2': {
    label: 'Section 2 — Loopers & Snapshears',
    color: 'bg-teal-600',
    blocks: {
      'LOOPER-1':    LOOPER_ITEMS,
      'SNAPSHEAR-1': SNAPSHEAR_ITEMS,
      'LOOPER-2':    LOOPER_ITEMS,
      'SNAPSHEAR-2': SNAPSHEAR_ITEMS,
      'LOOPER-3':    LOOPER_ITEMS,
      'SNAPSHEAR-3': SNAPSHEAR_ITEMS,
    },
  },
  'SECTION-3': {
    label: 'Section 3 — Pinch Rolls & Tail Breakers',
    color: 'bg-orange-600',
    blocks: {
      'PRE PINCH':      PINCH_ITEMS,
      'POST PINCH':     PINCH_ITEMS,
      'TAIL BREAKER-1': TAIL_ITEMS,
      'TAIL BREAKER-2': TAIL_ITEMS,
    },
  },
  'SECTION-4': {
    label: 'Section 4 — Flying / Continue Shear',
    color: 'bg-rose-600',
    blocks: {
      'FLYING / CONTINUE SHEAR': SHEAR_ITEMS,
    },
  },
};

// ─── Item Row (with optional value field) ─────────────────────────────────────
const ItemRow = ({ keyStr, item, value, onChange }) => {
  const isNotOk = value?.status === 'NOT_OK';
  return (
    <div className={`border-b border-gray-100 last:border-0 px-4 py-3 ${isNotOk ? 'bg-red-50' : ''}`}>
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <p className="flex-1 text-sm font-medium text-gray-800">{item}</p>
        {/* Optional value input */}
        <input
          type="text"
          value={value?.item_value || ''}
          onChange={e => onChange(keyStr, { ...value, item_value: e.target.value })}
          placeholder="Value"
          className="w-28 px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-blue-400 focus:border-blue-400 bg-white"
        />
        {/* Status buttons */}
        <div className="flex gap-1.5 flex-shrink-0">
          {['OK', 'NOT_OK', 'OFF'].map((s) => (
            <button key={s} type="button"
              onClick={() => onChange(keyStr, {
                ...value,
                status: s,
                remark: s === 'NOT_OK' ? (value?.remark || '') : '',
                action_taken: s === 'NOT_OK' ? (value?.action_taken || '') : '',
              })}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-all ${
                value?.status === s
                  ? s === 'OK'     ? 'bg-green-500 border-green-500 text-white shadow-sm'
                  : s === 'NOT_OK' ? 'bg-red-500 border-red-500 text-white shadow-sm'
                  :                  'bg-gray-500 border-gray-500 text-white shadow-sm'
                  : 'bg-white border-gray-300 text-gray-600 hover:border-gray-400'
              }`}>
              {s === 'NOT_OK' ? 'NOT OK' : s}
            </button>
          ))}
        </div>
      </div>
      {isNotOk && (
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-red-700 mb-1">Remark <span className="text-red-500">*</span></label>
            <input type="text" value={value?.remark || ''}
              onChange={e => onChange(keyStr, { ...value, remark: e.target.value })}
              placeholder="Describe the issue..."
              className="w-full px-3 py-2 border-2 border-red-200 rounded-lg text-sm bg-white focus:outline-none focus:border-red-400" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-orange-700 mb-1">Action Taken <span className="text-red-500">*</span></label>
            <input type="text" value={value?.action_taken || ''}
              onChange={e => onChange(keyStr, { ...value, action_taken: e.target.value })}
              placeholder="Action taken to fix..."
              className="w-full px-3 py-2 border-2 border-orange-200 rounded-lg text-sm bg-white focus:outline-none focus:border-orange-400" />
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Block Remark ─────────────────────────────────────────────────────────────
const BlockRemark = ({ blockKey, value, onChange }) => (
  <div className="bg-gray-50 border-t border-gray-200 px-4 py-3">
    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Remark</label>
    <input type="text" value={value || ''}
      onChange={e => onChange(blockKey, e.target.value)}
      placeholder="Block remark..."
      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
  </div>
);

// ─── Section Result ───────────────────────────────────────────────────────────
const SectionResult = ({ label, value, onChange }) => (
  <div className="bg-gray-100 border-t-2 border-gray-200 px-5 py-3 flex flex-wrap items-center gap-4">
    <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">{label} — Result</p>
    <select value={value} onChange={e => onChange(e.target.value)}
      className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent">
      <option value="">— Select —</option>
      <option value="OK">OK</option>
      <option value="NOT_OK">NOT OK</option>
    </select>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const BeforeRollingForm = () => {
  const navigate = useNavigate();

  const [header, setHeader] = useState({
    log_date:             new Date().toISOString().split('T')[0],
    checked_by:           '',
    mill_shift_incharge:  '',
    mechanical_engineer:  '',
  });

  const [itemValues, setItemValues]     = useState({});
  const [blockRemarks, setBlockRemarks] = useState({});
  const [openBlocks, setOpenBlocks]     = useState({});
  const [sectionResults, setSectionResults] = useState(
    Object.fromEntries(Object.keys(SHEET_CONFIG).map(k => [k, '']))
  );
  const [submitting, setSubmitting] = useState(false);

  const handleItemChange = (key, val) => setItemValues(prev => ({ ...prev, [key]: val }));
  const handleBlockRemark = (key, val) => setBlockRemarks(prev => ({ ...prev, [key]: val }));
  const toggleBlock = (block) => setOpenBlocks(prev => ({ ...prev, [block]: !prev[block] }));

  const getBlockCount = (secKey, block, blockItems) => {
    let filled = 0, notOk = 0;
    blockItems.forEach(item => {
      const val = itemValues[`${secKey}__${block}__${item}`];
      if (val?.status) { filled++; if (val.status === 'NOT_OK') notOk++; }
    });
    return { total: blockItems.length, filled, notOk };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!header.log_date) { toast.error('Date is required'); return; }

    const items = [];
    try {
      for (const [secKey, secData] of Object.entries(SHEET_CONFIG)) {
        for (const [block, blockItems] of Object.entries(secData.blocks)) {
          const blockRemark = blockRemarks[`${secKey}__${block}`] || null;
          for (const item of blockItems) {
            const k = `${secKey}__${block}__${item}`;
            const val = itemValues[k];
            if (!val?.status) continue;
            if (val.status === 'NOT_OK') {
              if (!val.remark?.trim())       { toast.error(`Remark required: ${item} (${block})`);       throw new Error('stop'); }
              if (!val.action_taken?.trim()) { toast.error(`Action Taken required: ${item} (${block})`); throw new Error('stop'); }
            }
            items.push({
              section_name: secKey,
              block_name:   block,
              item_name:    item,
              item_value:   val.item_value || null,
              status:       val.status,
              remark:       val.remark || '',
              action_taken: val.action_taken || '',
              block_remark: blockRemark,
            });
          }
        }
      }
    } catch (err) {
      if (err.message === 'stop') return;
    }

    if (items.length === 0) { toast.error('Please fill at least one check item'); return; }

    setSubmitting(true);
    try {
      await hbmAPI.createBeforeRollingLog({
        log_date:            header.log_date,
        checked_by:          header.checked_by          || null,
        mill_shift_incharge: header.mill_shift_incharge || null,
        mechanical_engineer: header.mechanical_engineer || null,
        sec1_result: sectionResults['SECTION-1'] || null,
        sec2_result: sectionResults['SECTION-2'] || null,
        sec3_result: sectionResults['SECTION-3'] || null,
        sec4_result: sectionResults['SECTION-4'] || null,
        items,
      });
      toast.success('Before Rolling checksheet submitted!');
      navigate('/hbm/before-rolling/history');
    } catch (error) {
      toast.error(error?.message || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  const blockOpenColor = {
    'SECTION-1': 'bg-blue-700 text-white',
    'SECTION-2': 'bg-teal-600 text-white',
    'SECTION-3': 'bg-orange-600 text-white',
    'SECTION-4': 'bg-rose-600 text-white',
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
            <h1 className="text-xl font-bold text-gray-900">HBM Before Rolling Checksheet</h1>
            <p className="text-sm text-gray-500">Pre-rolling inspection — saved to database</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>

          {/* Header Fields */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
            <h2 className="text-base font-bold text-gray-800 mb-4">Sheet Header</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Date <span className="text-red-500">*</span>
                </label>
                <input type="date" value={header.log_date} required
                  max={new Date().toISOString().split('T')[0]}
                  onChange={e => setHeader(p => ({ ...p, log_date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Checked By</label>
                <input type="text" value={header.checked_by}
                  onChange={e => setHeader(p => ({ ...p, checked_by: e.target.value }))}
                  placeholder="Inspector name..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Mill Shift Incharge</label>
                <input type="text" value={header.mill_shift_incharge}
                  onChange={e => setHeader(p => ({ ...p, mill_shift_incharge: e.target.value }))}
                  placeholder="Shift incharge name..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Mechanical Engineer</label>
                <input type="text" value={header.mechanical_engineer}
                  onChange={e => setHeader(p => ({ ...p, mechanical_engineer: e.target.value }))}
                  placeholder="Engineer name..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
            </div>
          </div>

          {/* Sections */}
          {Object.entries(SHEET_CONFIG).map(([secKey, secData]) => (
            <div key={secKey} className="mb-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-px flex-1 bg-gray-200" />
                <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">{secData.label}</span>
                <div className="h-px flex-1 bg-gray-200" />
              </div>

              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="divide-y divide-gray-100">
                  {Object.entries(secData.blocks).map(([block, blockItems]) => {
                    const { total, filled, notOk } = getBlockCount(secKey, block, blockItems);
                    const isOpen = openBlocks[block];
                    const blockKey = `${secKey}__${block}`;
                    return (
                      <div key={block}>
                        <button type="button" onClick={() => toggleBlock(block)}
                          className={`w-full flex items-center justify-between px-5 py-3 transition-colors ${
                            isOpen ? blockOpenColor[secKey] : 'hover:bg-gray-50 text-gray-900'
                          }`}>
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-sm">{block}</span>
                            {filled > 0 && (
                              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                                notOk > 0 ? 'bg-red-100 text-red-700'
                                  : isOpen ? 'bg-white/20 text-white' : 'bg-green-100 text-green-700'
                              }`}>{filled}/{total} {notOk > 0 ? `· ${notOk} NOT OK` : '· OK'}</span>
                            )}
                          </div>
                          <svg className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                            fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        {isOpen && (
                          <>
                            {blockItems.map(item => (
                              <ItemRow
                                key={item}
                                keyStr={`${secKey}__${block}__${item}`}
                                item={item}
                                value={itemValues[`${secKey}__${block}__${item}`]}
                                onChange={handleItemChange}
                              />
                            ))}
                            <BlockRemark
                              blockKey={blockKey}
                              value={blockRemarks[blockKey]}
                              onChange={handleBlockRemark}
                            />
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>

                <SectionResult
                  label={secData.label}
                  value={sectionResults[secKey]}
                  onChange={(val) => setSectionResults(prev => ({ ...prev, [secKey]: val }))}
                />
              </div>
            </div>
          ))}

          {/* Submit */}
          <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 mt-5 shadow-lg rounded-t-xl">
            <button type="submit" disabled={submitting}
              className="w-full py-3 bg-blue-700 text-white rounded-lg font-bold text-base hover:bg-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Submitting...
                </span>
              ) : 'Submit Before Rolling Checksheet'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default BeforeRollingForm;
