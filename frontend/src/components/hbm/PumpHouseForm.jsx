import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { hbmAPI } from '../../services/api';
import ChecksheetPreviewModal, { PreviewSection, PreviewGrid } from './ChecksheetPreviewModal';

// ─── ITEM LISTS ───────────────────────────────────────────────────────────────

const TMT_MILL_ITEMS = [
  'PRESSURE GAUGE CONDITION',
  'PUMP VIBRATION',
  'BASE FRAME BOLT',
  'PUMP LEAKAGE',
  'VALVE CONDITION',
  'PUMP SOUND',
  'COUPLING CONDITION',
  'PIN BUSH CONDITION',
  'OIL LEVEL',
];

const SCALE_PIT_ITEMS = [
  'PRESSURE GAUGE CONDITION',
  'PUMP VIBRATION',
  'BASE FRAME BOLT',
  'PUMP LEAKAGE',
  'VALVE CONDITION',
  'PUMP SOUND',
  'COUPLING CONDITION',
  'PIN BUSH CONDITION',
  'OIL LEVEL/GREASING',
];

const ICW_DCW_ITEMS = [
  'PRESSURE GAUGE CONDITION',
  'PUMP VIBRATION',
  'BASE FRAME BOLT',
  'PUMP LEAKAGE',
  'VALVE CONDITION',
  'PUMP SOUND',
  'COUPLING CONDITION',
  'RUBBER STAR CONDITION',
  'OIL LEVEL',
];

const BEARING_ITEMS = [
  'PRESSURE GAUGE CONDITION',
  'PUMP VIBRATION',
  'BASE FRAME BOLT',
  'PUMP LEAKAGE',
  'VALVE CONDITION',
  'PUMP SOUND',
  'COUPLING CONDITION',
];

const RO_ITEMS = [
  'HIGH PRESSURE PUMP - VIBRATION',
  'HIGH PRESSURE PUMP - MECHANICAL SEAL',
  'PRESSURE GAUGE - LEAK & ACCURACY',
  'MEMBRANE CONDITION',
  'INLET VALVES - GASKET & FITTING',
  'OUTLET VALVES - GASKET & FITTING',
  'SANDFILTER VALVES - LEAKAGE',
  'CARBON FILTER VALVES - LEAKAGE',
  'READING MTR CONDITION',
  'MICRON FILTER CONDITION',
];

const BLOWER_ITEMS = [
  'PRESSURE GAUGE CONDITION',
  'BASE FRAME BOLT',
  'FILTER CONDITION',
  'BELT CONDITION',
  'PULLEY CONDITION',
  'OIL LEVEL',
];

const SANDFILTER_ITEMS = [
  'BASE FRAME BOLT',
  'BACKWASH INLET VALVE',
  'BACKWASH OUTLET VALVE',
  'SCALE PIT INLET VALVE',
  'SCALE PIT OUTLET VALVE',
  'AIR LINE VALVE CONDITION',
  'DRAIN VALVE CONDITION',
];

const OXYGEN_ITEMS = [
  'UPPER FILLING VALVE CONDITION',
  'LOWER FILLING VALVE',
  'STOP VALVE CONDITION',
  'LIQUID LEVEL DETECT VALVE',
  'GAS BLOW VALVE',
  'PRESSURISED',
  'LIQUID DELIVERY',
  'ECONOMIZER ISOLATION',
  'SAFETY VALVE FOR PIPELINE',
  'SAFETY VALVE 1 AND 2',
  'AUXILIARY GAS VALVE',
  'VAPORRIZER CONDITION',
];

const COMPRESSOR_ITEMS = [
  'AIR FILTER',
  'OIL FILTER',
  'PRE FILTER',
  'AIR RECEIVER TANK',
  'HOSE PIPE CONDITION',
  'DRYER CONDITION',
  'PRESSURE GAUGE',
];

const CT_ITEMS = [
  'FRP CONDITION',
  'FAN BLADE CONDITION',
  'NOZZLE CONDITION',
  'PIPE CONDITION',
  'VALVE CONDITION',
  'TANK CONDITION',
  'FILL CONDITION',
];

// ─── SHEET CONFIGURATION ─────────────────────────────────────────────────────

const SHEET_CONFIG = {
  'SECTION-1': {
    label: 'Section 1 — TMT Pump & Mill Water Pump',
    color: 'bg-blue-600',
    blocks: {
      'TMT PUMP-1': TMT_MILL_ITEMS,
      'TMT PUMP-2': TMT_MILL_ITEMS,
      'MILL PUMP-1': TMT_MILL_ITEMS,
      'MILL PUMP-2': TMT_MILL_ITEMS,
    },
  },
  'SECTION-2': {
    label: 'Section 2 — Scale Pit Pump',
    color: 'bg-cyan-600',
    blocks: {
      'SCALE PIT PUMP-1': SCALE_PIT_ITEMS,
      'SCALE PIT PUMP-2': SCALE_PIT_ITEMS,
      'SCALE PIT PUMP-3': SCALE_PIT_ITEMS,
      'SCALE PIT PUMP-4': SCALE_PIT_ITEMS,
      'SCALE PIT PUMP-5': SCALE_PIT_ITEMS,
      'SCALE PIT PUMP-6': SCALE_PIT_ITEMS,
      'SCALE PIT PUMP-7': SCALE_PIT_ITEMS,
      'SCALE PIT PUMP-8': SCALE_PIT_ITEMS,
    },
  },
  'SECTION-3': {
    label: 'Section 3 — ICW Pump',
    color: 'bg-teal-600',
    blocks: {
      'ICW PUMP-1': ICW_DCW_ITEMS,
      'ICW PUMP-2': ICW_DCW_ITEMS,
      'ICW PUMP-3': ICW_DCW_ITEMS,
      'ICW PUMP-4': ICW_DCW_ITEMS,
      'ICW PUMP-5': ICW_DCW_ITEMS,
    },
  },
  'SECTION-4': {
    label: 'Section 4 — DCW Pump',
    color: 'bg-emerald-600',
    blocks: {
      'DCW PUMP-1': ICW_DCW_ITEMS,
      'DCW PUMP-2': ICW_DCW_ITEMS,
      'DCW PUMP-3': ICW_DCW_ITEMS,
      'DCW PUMP-4': ICW_DCW_ITEMS,
      'DCW PUMP-5': ICW_DCW_ITEMS,
    },
  },
  'SECTION-5': {
    label: 'Section 5 — Laminar Hot/Cold/Cross Spray Pump',
    color: 'bg-violet-600',
    blocks: {
      'LAMINAR HOT WELL PUMP-1': ICW_DCW_ITEMS,
      'LAMINAR HOT WELL PUMP-2': ICW_DCW_ITEMS,
      'LAMINAR HOT WELL PUMP-3': ICW_DCW_ITEMS,
      'LAMINAR HOT WELL PUMP-4': ICW_DCW_ITEMS,
      'LAMINAR COLD WELL PUMP-1': ICW_DCW_ITEMS,
      'LAMINAR COLD WELL PUMP-2': ICW_DCW_ITEMS,
      'LAMINAR COLD WELL PUMP-3': ICW_DCW_ITEMS,
      'LAMINAR CROSS SPRAY PUMP-1': ICW_DCW_ITEMS,
      'LAMINAR CROSS SPRAY PUMP-2': ICW_DCW_ITEMS,
    },
  },
  'SECTION-6': {
    label: 'Section 6 — Backwash Pump',
    color: 'bg-orange-600',
    blocks: {
      'BACKWASH PUMP-1': ICW_DCW_ITEMS,
      'BACKWASH PUMP-2': ICW_DCW_ITEMS,
    },
  },
  'SECTION-7': {
    label: 'Section 7 — Bearing Cooling Pump',
    color: 'bg-amber-600',
    blocks: {
      'BEARING COOLING PUMP-1': BEARING_ITEMS,
      'BEARING COOLING PUMP-2': BEARING_ITEMS,
      'BEARING COOLING PUMP-3': BEARING_ITEMS,
      'BEARING COOLING PUMP-4': BEARING_ITEMS,
    },
  },
  'SECTION-8': {
    label: 'Section 8 — Reverse Osmosis',
    color: 'bg-purple-600',
    blocks: {
      'RO-1': RO_ITEMS,
      'RO-2': RO_ITEMS,
      'RO-3': RO_ITEMS,
    },
  },
  'SECTION-9': {
    label: 'Section 9 — Sandfilter Blower & Sandfilter',
    color: 'bg-rose-600',
    blocks: {
      'BLOWER-1': BLOWER_ITEMS,
      'BLOWER-2': BLOWER_ITEMS,
      'BLOWER-3': BLOWER_ITEMS,
      'BLOWER-4': BLOWER_ITEMS,
      'SANDFILTER-1': SANDFILTER_ITEMS,
      'SANDFILTER-2': SANDFILTER_ITEMS,
      'SANDFILTER-3': SANDFILTER_ITEMS,
      'SANDFILTER-4': SANDFILTER_ITEMS,
      'SANDFILTER-5': SANDFILTER_ITEMS,
      'SANDFILTER-6': SANDFILTER_ITEMS,
      'SANDFILTER-7': SANDFILTER_ITEMS,
      'SANDFILTER-8': SANDFILTER_ITEMS,
    },
  },
  'SECTION-10': {
    label: 'Section 10 — Oxygen Plant',
    color: 'bg-indigo-600',
    blocks: {
      'OXYGEN PLANT': OXYGEN_ITEMS,
    },
  },
  'SECTION-11': {
    label: 'Section 11 — Compressor',
    color: 'bg-gray-700',
    blocks: {
      'COMPRESSOR-1': COMPRESSOR_ITEMS,
      'COMPRESSOR-2': COMPRESSOR_ITEMS,
      'COMPRESSOR-3': COMPRESSOR_ITEMS,
      'COMPRESSOR-4': COMPRESSOR_ITEMS,
    },
  },
  'SECTION-12': {
    label: 'Section 12 — Cooling Tower',
    color: 'bg-sky-600',
    blocks: {
      'ICW CT': CT_ITEMS,
      'DCW CT': CT_ITEMS,
      'LAMINAR CT': CT_ITEMS,
      'TMT CT': CT_ITEMS,
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
        <div className="flex gap-1.5 flex-shrink-0">
          <button type="button"
            onClick={() => onChange(keyStr, { status: 'OK', remark: '', action_taken: '' })}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold border-2 transition-all ${
              value?.status === 'OK'
                ? 'bg-green-500 border-green-500 text-white shadow-sm'
                : 'bg-white border-gray-300 text-gray-600 hover:border-green-400 hover:text-green-600'
            }`}>OK</button>
          <button type="button"
            onClick={() => onChange(keyStr, { status: 'NOT_OK', remark: value?.remark || '', action_taken: value?.action_taken || '' })}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-all ${
              value?.status === 'NOT_OK'
                ? 'bg-red-500 border-red-500 text-white shadow-sm'
                : 'bg-white border-gray-300 text-gray-600 hover:border-red-400 hover:text-red-600'
            }`}>NOT OK</button>
          <button type="button"
            onClick={() => onChange(keyStr, { status: 'OFF', remark: '', action_taken: '' })}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold border-2 transition-all ${
              value?.status === 'OFF'
                ? 'bg-gray-500 border-gray-500 text-white shadow-sm'
                : 'bg-white border-gray-300 text-gray-600 hover:border-gray-400 hover:text-gray-700'
            }`}>OFF</button>
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
const PumpHouseForm = () => {
  const navigate = useNavigate();

  const [header, setHeader] = useState({
    log_date: new Date().toLocaleDateString('en-CA'),
    checked_by: '',
  });

  const [itemValues, setItemValues]   = useState({});
  const [blockRemarks, setBlockRemarks] = useState({});
  const [openBlocks, setOpenBlocks]   = useState({});

  const initResult = () => '';
  const [sectionResults, setSectionResults] = useState(
    Object.fromEntries(Object.keys(SHEET_CONFIG).map(k => [k, initResult()]))
  );

  const [submitting, setSubmitting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const handleItemChange = (key, val) =>
    setItemValues(prev => ({ ...prev, [key]: val }));

  const handleBlockRemark = (key, val) =>
    setBlockRemarks(prev => ({ ...prev, [key]: val }));

  const toggleBlock = (block) =>
    setOpenBlocks(prev => ({ ...prev, [block]: !prev[block] }));

  const getBlockCount = (secKey, block, blockItems) => {
    let filled = 0, notOk = 0;
    blockItems.forEach(item => {
      const val = itemValues[`${secKey}__${block}__${item}`];
      if (val?.status) { filled++; if (val.status === 'NOT_OK') notOk++; }
    });
    return { total: blockItems.length, filled, notOk };
  };

  const buildItems = () => {
    const items = [];
    for (const [secKey, secData] of Object.entries(SHEET_CONFIG)) {
      for (const [block, blockItems] of Object.entries(secData.blocks)) {
        const blockRemark = blockRemarks[`${secKey}__${block}`] || null;
        for (const item of blockItems) {
          const k = `${secKey}__${block}__${item}`;
          const val = itemValues[k];
          if (!val?.status) continue;
          if (val.status === 'NOT_OK') {
            if (!val.remark?.trim()) { toast.error(`Remark required: ${item} (${block})`); throw new Error('stop'); }
            if (!val.action_taken?.trim()) { toast.error(`Action Taken required: ${item} (${block})`); throw new Error('stop'); }
          }
          items.push({ section_name: secKey, block_name: block, item_name: item, status: val.status, remark: val.remark || '', action_taken: val.action_taken || '', block_remark: blockRemark });
        }
      }
    }
    return items;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!header.log_date) { toast.error('Date is required'); return; }
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
      await hbmAPI.createPumpHouseLog({
        log_date:     header.log_date,
        checked_by:   header.checked_by || null,
        sec1_result:  sectionResults['SECTION-1']  || null,
        sec2_result:  sectionResults['SECTION-2']  || null,
        sec3_result:  sectionResults['SECTION-3']  || null,
        sec4_result:  sectionResults['SECTION-4']  || null,
        sec5_result:  sectionResults['SECTION-5']  || null,
        sec6_result:  sectionResults['SECTION-6']  || null,
        sec7_result:  sectionResults['SECTION-7']  || null,
        sec8_result:  sectionResults['SECTION-8']  || null,
        sec9_result:  sectionResults['SECTION-9']  || null,
        sec10_result: sectionResults['SECTION-10'] || null,
        sec11_result: sectionResults['SECTION-11'] || null,
        sec12_result: sectionResults['SECTION-12'] || null,
        items,
      });
      toast.success('Pumphouse checksheet submitted!');
      navigate('/hbm/pumphouse/history');
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  const blockOpenColor = {
    'SECTION-1':  'bg-blue-600 text-white',
    'SECTION-2':  'bg-cyan-600 text-white',
    'SECTION-3':  'bg-teal-600 text-white',
    'SECTION-4':  'bg-emerald-600 text-white',
    'SECTION-5':  'bg-violet-600 text-white',
    'SECTION-6':  'bg-orange-600 text-white',
    'SECTION-7':  'bg-amber-600 text-white',
    'SECTION-8':  'bg-purple-600 text-white',
    'SECTION-9':  'bg-rose-600 text-white',
    'SECTION-10': 'bg-indigo-600 text-white',
    'SECTION-11': 'bg-gray-700 text-white',
    'SECTION-12': 'bg-sky-600 text-white',
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
            <h1 className="text-xl font-bold text-gray-900">Pumphouse Checksheet</h1>
            <p className="text-sm text-gray-500">Daily checksheet — saved to database</p>
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
                  max={new Date().toLocaleDateString('en-CA')}
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
            </div>
          </div>

          {/* Sections */}
          {Object.entries(SHEET_CONFIG).map(([secKey, secData]) => (
            <div key={secKey} className="mb-5">
              {/* Section divider */}
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

                {/* Section Result */}
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
            <button type="submit"
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-bold text-base hover:bg-blue-700 transition-colors">
              Preview &amp; Submit
            </button>
          </div>

        </form>
      </div>
    </div>

    <ChecksheetPreviewModal
      isOpen={showPreview}
      title="Pumphouse Checksheet Preview"
      onEdit={() => setShowPreview(false)}
      onConfirm={handleConfirmSubmit}
      submitting={submitting}
    >
      <PreviewSection title="Sheet Header" color="bg-gray-700">
        <PreviewGrid rows={[
          ['Date', header.log_date],
          ['Checked By', header.checked_by || '—'],
        ]} />
      </PreviewSection>

      {Object.entries(SHEET_CONFIG).map(([secKey, secData]) => (
        <PreviewSection key={secKey} title={secData.label} color={secData.color}>
          <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Object.entries(secData.blocks).map(([block, blockItems]) => {
              const { total, filled, notOk } = getBlockCount(secKey, block, blockItems);
              return (
                <div key={block} className="bg-white rounded-lg p-3 border border-gray-200">
                  <p className="text-xs font-bold text-gray-700 mb-1">{block}</p>
                  <p className="text-sm text-gray-600">{filled}/{total} filled</p>
                  {notOk > 0 && <p className="text-xs font-semibold text-red-600">{notOk} NOT OK</p>}
                </div>
              );
            })}
          </div>
          <div className="px-4 pb-3">
            <span className="text-xs font-semibold text-gray-500">Section Result: </span>
            <span className={`text-sm font-bold ${sectionResults[secKey] === 'OK' ? 'text-green-600' : sectionResults[secKey] === 'NOT_OK' ? 'text-red-600' : 'text-gray-400'}`}>
              {sectionResults[secKey] || '—'}
            </span>
          </div>
        </PreviewSection>
      ))}
    </ChecksheetPreviewModal>
    </>
  );
};

export default PumpHouseForm;
