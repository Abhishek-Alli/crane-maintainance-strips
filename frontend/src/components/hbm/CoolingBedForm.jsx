import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { hbmAPI } from '../../services/api';
import ChecksheetPreviewModal, { PreviewSection, PreviewGrid } from './ChecksheetPreviewModal';

// ─── SHEET CONFIGURATION ─────────────────────────────────────────────────────

const TWIN_CHANNEL_ITEMS = [
  'FLAPPER CONDITION',
  'REEL ALIGNMENT',
  'CAM BEARING',
  'TWIN CHANNEL CYLINDER LEAKAGES',
  'BEARING GREASING',
];

const SHEET_CONFIG = {
  'SECTION-1': {
    label: 'Section 1 — Twin Channel',
    color: 'bg-emerald-600',
    blocks: {
      'TWIN-CHANNEL-1': TWIN_CHANNEL_ITEMS,
      'TWIN-CHANNEL-2': TWIN_CHANNEL_ITEMS,
    },
  },
  'SECTION-2': {
    label: 'Section 2 — Rake',
    color: 'bg-blue-600',
    blocks: {
      'RAKE': [
        'SHAFT CONDITION',
        'GEAR COUPLING',
        'GEAR COUPLING GREASING',
        'CAM BEARING',
        'GEAR BOX OIL LEVEL',
        'ALL NUT BOLTS',
        'PEDESTAL BEARING',
        'CAM OIL TRAY LEVEL',
      ],
    },
  },
  'SECTION-3': {
    label: 'Section 3 — Aligner Roller',
    color: 'bg-purple-600',
    blocks: {
      'ALIGNER ROLLER': [
        'ROLLER CONDITION',
        'BEARING GREASING',
        'CHAIN SPROCKET',
        'CHAIN CONDITION',
        'PEDESTAL BEARING CONDITION',
        'ALL NUTS & BOLTS',
        'SPROCKET CONDITION',
      ],
    },
  },
  'SECTION-4': {
    label: 'Section 4 — Layer Shifting Tray',
    color: 'bg-orange-600',
    blocks: {
      'LAYER SHIFTING TRAY': [
        'TRAY CONDITION',
        'CHAIN CONDITION',
        'POWER LOCK',
        'PEDESTAL CONDITION',
        'HYDROULIC CYLINDER CONDITION',
        'SHAFT CONDITION',
        'GEAR BOX CONDITION',
        'GEAR COUPLING',
        'GEAR BOX OIL LEVEL',
      ],
    },
  },
  'SECTION-5': {
    label: 'Section 5 — Roller Conveyor',
    color: 'bg-teal-600',
    blocks: {
      'ROLLER CONVEYOR': [
        'ROLLER CONDITION',
        'BEARING CONDITION',
        'WORM GEAR BOX CONDITION',
        'GEAR BOX OIL LEVEL',
        'BELT, NUT & BOLT CONDITION',
        'V-BELTS CONDITION',
      ],
    },
  },
  'SECTION-6': {
    label: 'Section 6 — Cold Shear',
    color: 'bg-rose-600',
    blocks: {
      'COLD SHEAR': [
        'BEARING CONDITION',
        'BLADE CONDITION',
        'BELT CONDITION',
        'GEARS GREASING CONDITION',
        'ALL NUT & BOLTS',
      ],
    },
  },
};

// ─── Item Row ─────────────────────────────────────────────────────────────────
const ItemRow = ({ keyStr, item, value, onChange }) => {
  const isNotOk = value?.status === 'NOT_OK';
  return (
    <div className={`border-b border-gray-100 last:border-0 px-4 py-3 ${isNotOk ? 'bg-red-50' : ''}`}>
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <p className="flex-1 text-sm font-medium text-gray-800">{item}</p>
        <div className="flex gap-2 flex-shrink-0">
          {['OK', 'NOT_OK', 'OFF'].map((s) => (
            <button key={s} type="button"
              onClick={() => onChange(keyStr, { status: s, remark: s === 'NOT_OK' ? (value?.remark || '') : '', action_taken: s === 'NOT_OK' ? (value?.action_taken || '') : '' })}
              className={`px-4 py-1.5 rounded-lg text-sm font-bold border-2 transition-all ${
                value?.status === s
                  ? s === 'OK' ? 'bg-green-500 border-green-500 text-white shadow-sm'
                    : s === 'NOT_OK' ? 'bg-red-500 border-red-500 text-white shadow-sm'
                    : 'bg-gray-500 border-gray-500 text-white shadow-sm'
                  : 'bg-white border-gray-300 text-gray-600 hover:border-gray-400'
              }`}>{s === 'NOT_OK' ? 'NOT OK' : s}</button>
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

// ─── Section Footer ───────────────────────────────────────────────────────────
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
const CoolingBedForm = () => {
  const navigate = useNavigate();

  const [header, setHeader] = useState({
    log_date: new Date().toLocaleDateString('en-CA'),
    log_time: new Date().toTimeString().slice(0, 5),
    shift: 'DAY',
  });

  const [itemValues, setItemValues] = useState({});
  const [openBlocks, setOpenBlocks] = useState({});

  const initFooter = () => ({ remark: '', result: '', checked_by: '' });
  const [footers, setFooters] = useState({
    'SECTION-1': initFooter(),
    'SECTION-2': initFooter(),
    'SECTION-3': initFooter(),
    'SECTION-4': initFooter(),
    'SECTION-5': initFooter(),
    'SECTION-6': initFooter(),
  });

  const [submitting, setSubmitting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const handleItemChange = (key, val) => setItemValues(prev => ({ ...prev, [key]: val }));
  const toggleBlock = (block) => setOpenBlocks(prev => ({ ...prev, [block]: !prev[block] }));

  const getBlockCount = (block, items) => {
    let filled = 0, notOk = 0;
    items.forEach(item => {
      const k = `${block}__${item}`;
      if (itemValues[k]?.status) { filled++; if (itemValues[k].status === 'NOT_OK') notOk++; }
    });
    return { total: items.length, filled, notOk };
  };

  const blockOpenColors = {
    'SECTION-1': 'bg-emerald-600 text-white',
    'SECTION-2': 'bg-blue-600 text-white',
    'SECTION-3': 'bg-purple-600 text-white',
    'SECTION-4': 'bg-orange-600 text-white',
    'SECTION-5': 'bg-teal-600 text-white',
    'SECTION-6': 'bg-rose-600 text-white',
  };

  const buildItems = () => {
    const items = [];
    for (const [secKey, secData] of Object.entries(SHEET_CONFIG)) {
      for (const [block, blockItems] of Object.entries(secData.blocks)) {
        for (const item of blockItems) {
          const k = `${block}__${item}`;
          const val = itemValues[k];
          if (!val?.status) continue;
          if (val.status === 'NOT_OK') {
            if (!val.remark?.trim()) { toast.error(`Remark required: ${item} (${block})`); throw new Error('stop'); }
            if (!val.action_taken?.trim()) { toast.error(`Action Taken required: ${item} (${block})`); throw new Error('stop'); }
          }
          items.push({ section_name: secKey, block_name: block, item_name: item, status: val.status, remark: val.remark || '', action_taken: val.action_taken || '' });
        }
      }
    }
    return items;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!header.log_date || !header.log_time || !header.shift) { toast.error('Date, time and shift are required'); return; }
    try {
      const items = buildItems();
      if (items.length === 0) { toast.error('Please fill at least one check item'); return; }
      setShowPreview(true);
    } catch (err) { if (err.message !== 'stop') throw err; }
  };

  const handleConfirmSubmit = async () => {
    let items;
    try { items = buildItems(); } catch { return; }
    setSubmitting(true);
    try {
      await hbmAPI.createCoolingBedLog({
        log_date: header.log_date, log_time: header.log_time, shift: header.shift,
        sec1_remark: footers['SECTION-1'].remark || null, sec1_result: footers['SECTION-1'].result || null, sec1_checked_by: footers['SECTION-1'].checked_by || null,
        sec2_remark: footers['SECTION-2'].remark || null, sec2_result: footers['SECTION-2'].result || null, sec2_checked_by: footers['SECTION-2'].checked_by || null,
        sec3_remark: footers['SECTION-3'].remark || null, sec3_result: footers['SECTION-3'].result || null, sec3_checked_by: footers['SECTION-3'].checked_by || null,
        sec4_remark: footers['SECTION-4'].remark || null, sec4_result: footers['SECTION-4'].result || null, sec4_checked_by: footers['SECTION-4'].checked_by || null,
        sec5_remark: footers['SECTION-5'].remark || null, sec5_result: footers['SECTION-5'].result || null, sec5_checked_by: footers['SECTION-5'].checked_by || null,
        sec6_remark: footers['SECTION-6'].remark || null, sec6_result: footers['SECTION-6'].result || null, sec6_checked_by: footers['SECTION-6'].checked_by || null,
        items,
      });
      toast.success('Cooling Bed checksheet submitted!');
      navigate('/hbm/dashboard');
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
            <h1 className="text-xl font-bold text-gray-900">Cooling Bed Checksheet</h1>
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
                  max={new Date().toLocaleDateString('en-CA')}
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
                    const { total, filled, notOk } = getBlockCount(block, blockItems);
                    const isOpen = openBlocks[block];
                    return (
                      <div key={block}>
                        <button type="button" onClick={() => toggleBlock(block)}
                          className={`w-full flex items-center justify-between px-5 py-3 transition-colors ${
                            isOpen ? blockOpenColors[secKey] : 'hover:bg-gray-50 text-gray-900'
                          }`}>
                          <div className="flex items-center gap-3">
                            <span className="font-bold">{block}</span>
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
                        {isOpen && blockItems.map(item => (
                          <ItemRow key={item} keyStr={`${block}__${item}`} item={item}
                            value={itemValues[`${block}__${item}`]}
                            onChange={handleItemChange} />
                        ))}
                      </div>
                    );
                  })}
                </div>

                <SectionFooter
                  label={secData.label}
                  data={footers[secKey]}
                  onChange={(val) => setFooters(prev => ({ ...prev, [secKey]: val }))}
                />
              </div>
            </div>
          ))}

          {/* Submit */}
          <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 mt-5 shadow-lg rounded-t-xl">
            <button type="submit"
              className="w-full py-3 bg-emerald-600 text-white rounded-lg font-bold text-base hover:bg-emerald-700 transition-colors">
              Preview & Submit
            </button>
          </div>

        </form>
      </div>
    </div>

    <ChecksheetPreviewModal
      isOpen={showPreview}
      title="Cooling Bed Checksheet"
      onEdit={() => setShowPreview(false)}
      onConfirm={handleConfirmSubmit}
      submitting={submitting}
    >
      <PreviewGrid rows={[['Date', header.log_date], ['Time', header.log_time], ['Shift', header.shift]]} />
      {Object.entries(SHEET_CONFIG).map(([secKey, secData]) => (
        <PreviewSection key={secKey} title={secData.label} color={secData.color}>
          <div className="space-y-2">
            {Object.entries(secData.blocks).map(([block, blockItems]) => {
              const filled = blockItems.filter(item => itemValues[`${block}__${item}`]?.status).length;
              const notOk  = blockItems.filter(item => itemValues[`${block}__${item}`]?.status === 'NOT_OK').length;
              return (
                <div key={block} className={`rounded-lg p-2 border ${notOk > 0 ? 'border-red-200 bg-red-50' : filled > 0 ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-gray-700">{block}</span>
                    <span className="text-xs text-gray-500">{filled}/{blockItems.length}{notOk > 0 ? ` · ${notOk} NOT OK` : ''}</span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-3 pt-3 border-t border-gray-200">
            <PreviewGrid rows={[['Remark', footers[secKey].remark], ['Result', footers[secKey].result], ['Checked By', footers[secKey].checked_by]]} />
          </div>
        </PreviewSection>
      ))}
    </ChecksheetPreviewModal>
    </>
  );
};

export default CoolingBedForm;
