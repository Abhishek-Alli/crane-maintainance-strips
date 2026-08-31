import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { hbmAPI } from '../../services/api';
import ChecksheetPreviewModal, { PreviewSection, PreviewGrid } from './ChecksheetPreviewModal';

// ─── ITEM LISTS ───────────────────────────────────────────────────────────────

const RC_ITEMS = [
  'SPROCKET CONDITION',
  'CHAIN CONDITION',
  'ROLLERS CONDITION',
  'WORM GEAR BOX OIL LEVEL',
  'CAM AND FOLLOWER CONDITION',
  'PEDESTAL BEARING GREASING',
  'BELTS CONDITION',
  'PULLEYS CONDITION',
  'ALL NUT & BOLTS',
];

const KO_ITEMS = [
  'ARM PLATE CONDITION',
  'GEAR BOX 1 CONDITION & OIL LEVEL',
  'GEAR BOX 2 CONDITION & OIL LEVEL',
  'BELTS CONDITION',
  'PULLEYS CONDITION',
  'SHAFT/PIPE CONDITION',
  'PEDESTAL BEARINGS CONDITION',
  'GREASING OF BEARINGS',
  'ALL NUT & BOLTS',
];

const CT_ITEMS = [
  'SHAFT & COUPLINGS CONDITION',
  'PEDESTAL BEARINGS CONDITION',
  'GREASING CONDITION',
  'HYDRAULIC CYLINDER AND OIL',
  'SPROCKET CONDITION',
  'CHAIN CONDITION',
  'WORM GEAR BOX OIL LEVEL',
  'GEAR COUPLING',
  'ALL NUT AND BOLTS',
];

const BM_ITEMS = [
  'FOUNDATION BOLTS',
  'REDUCTION GEAR BOX NOISE',
  'GEAR COUPLING 1 & 2 GREASING',
  'REDUCTION GEAR BOX OIL LEVEL',
  'BENDING GEAR BOX OIL LEVEL',
  'ALL NUT AND BOLTS',
];

// ─── SHEET CONFIGURATION ─────────────────────────────────────────────────────

const SHEET_CONFIG = {
  'SECTION-1': {
    label: 'Section 1 — Roller Conveyor Checksheet',
    color: 'bg-indigo-600',
    blocks: {
      'STOPPER RATE ROLLER CONVEYOR-1': RC_ITEMS,
      'STOPPER RATE ROLLER CONVEYOR-2': RC_ITEMS,
      'STOPPER RATE ROLLER CONVEYOR-3': RC_ITEMS,
    },
  },
  'SECTION-2': {
    label: 'Section 2 — Kick-Off Mechanisms Checksheet',
    color: 'bg-orange-600',
    blocks: {
      'KICK-OFF 1 & 2': KO_ITEMS,
      'KICK-OFF 3':     KO_ITEMS,
      'KICK-OFF 4 & 5': KO_ITEMS,
    },
  },
  'SECTION-3': {
    label: 'Section 3 — Chain Transfer Beds Checksheet',
    color: 'bg-teal-600',
    blocks: {
      'CHAIN TRANSFER-1': CT_ITEMS,
      'CHAIN TRANSFER-2': CT_ITEMS,
    },
  },
  'SECTION-4': {
    label: 'Section 4 — Bending Machine Checksheet',
    color: 'bg-rose-600',
    blocks: {
      'BENDING MACHINE': BM_ITEMS,
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
          {['OK', 'NOT_OK', 'OFF'].map((s) => (
            <button key={s} type="button"
              onClick={() => onChange(keyStr, { status: s, remark: s === 'NOT_OK' ? (value?.remark || '') : '', action_taken: s === 'NOT_OK' ? (value?.action_taken || '') : '' })}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-all ${
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

// ─── Block Remark ─────────────────────────────────────────────────────────────
const BlockRemark = ({ blockKey, value, onChange }) => (
  <div className="bg-gray-50 border-t border-gray-200 px-4 py-3">
    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Remark</label>
    <input type="text" value={value || ''}
      onChange={e => onChange(blockKey, e.target.value)}
      placeholder="Block remark..."
      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
  </div>
);

// ─── Section Result ───────────────────────────────────────────────────────────
const SectionResult = ({ label, value, onChange }) => (
  <div className="bg-gray-100 border-t-2 border-gray-200 px-5 py-3 flex flex-wrap items-center gap-4">
    <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">{label} — Result</p>
    <select value={value} onChange={e => onChange(e.target.value)}
      className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
      <option value="">— Select —</option>
      <option value="OK">OK</option>
      <option value="NOT_OK">NOT OK</option>
    </select>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const BarBundleAreaForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const editData = location.state?.editData;
  const editId = location.state?.editId;
  const isEdit = !!editId;

  const [header, setHeader] = useState({
    log_date: new Date().toLocaleDateString('en-CA'),
    checked_by: '',
  });

  const [itemValues, setItemValues]     = useState({});
  const [blockRemarks, setBlockRemarks] = useState({});
  const [openBlocks, setOpenBlocks]     = useState({});
  const [sectionResults, setSectionResults] = useState(
    Object.fromEntries(Object.keys(SHEET_CONFIG).map(k => [k, '']))
  );
  const [submitting, setSubmitting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (!isEdit || !editData) return;
    setHeader({ log_date: editData.log_date?.slice(0, 10) || new Date().toLocaleDateString('en-CA'), checked_by: editData.checked_by || '' });
    if (editData.items) {
      const vals = {}, remarks = {};
      editData.items.forEach(item => {
        vals[`${item.section_name}__${item.block_name}__${item.item_name}`] = { status: item.status, remark: item.remark || '', action_taken: item.action_taken || '' };
        if (item.block_remark) remarks[`${item.section_name}__${item.block_name}`] = item.block_remark;
      });
      setItemValues(vals); setBlockRemarks(remarks);
    }
    const secRes = {};
    for (let i = 1; i <= 4; i++) { const k = `SECTION-${i}`; secRes[k] = editData[`sec${i}_result`] || ''; }
    setSectionResults(secRes);
  }, []); // eslint-disable-line

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
      const payload = { log_date: header.log_date, checked_by: header.checked_by || null, sec1_result: sectionResults['SECTION-1'] || null, sec2_result: sectionResults['SECTION-2'] || null, sec3_result: sectionResults['SECTION-3'] || null, sec4_result: sectionResults['SECTION-4'] || null, items };
      if (isEdit) { await hbmAPI.updateHbmLog('bar-bundle', editId, payload); } else { await hbmAPI.createBarBundleLog(payload); }
      toast.success(isEdit ? 'Bar Bundle Area checksheet updated!' : 'Bar Bundle Area checksheet submitted!');
      navigate(isEdit ? `/hbm/bar-bundle/${editId}` : '/hbm/bar-bundle/history');
    } catch (error) {
      toast.error(error?.message || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  const blockOpenColor = {
    'SECTION-1': 'bg-indigo-600 text-white',
    'SECTION-2': 'bg-orange-600 text-white',
    'SECTION-3': 'bg-teal-600 text-white',
    'SECTION-4': 'bg-rose-600 text-white',
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
            <h1 className="text-xl font-bold text-gray-900">Bar Bundle Area Checksheet</h1>
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Checked By</label>
                <input type="text" value={header.checked_by}
                  onChange={e => setHeader(p => ({ ...p, checked_by: e.target.value }))}
                  placeholder="Inspector name..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
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
            <button type="submit"
              className="w-full py-3 bg-indigo-600 text-white rounded-lg font-bold text-base hover:bg-indigo-700 transition-colors">
              Preview & Submit
            </button>
          </div>

        </form>
      </div>
    </div>

    <ChecksheetPreviewModal
      isOpen={showPreview}
      title="Bar Bundle Area Checksheet"
      onEdit={() => setShowPreview(false)}
      onConfirm={handleConfirmSubmit}
      submitting={submitting}
    >
      <PreviewGrid rows={[['Date', header.log_date], ['Checked By', header.checked_by]]} />
      {Object.entries(SHEET_CONFIG).map(([secKey, secData]) => (
        <PreviewSection key={secKey} title={secData.label} color={secData.color}>
          <div className="space-y-2">
            {Object.entries(secData.blocks).map(([block, blockItems]) => {
              const { filled, notOk } = getBlockCount(secKey, block, blockItems);
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
          <p className="text-xs text-gray-600 mt-2"><span className="font-semibold">Section Result:</span> {sectionResults[secKey] || '—'}</p>
        </PreviewSection>
      ))}
    </ChecksheetPreviewModal>
    </>
  );
};

export default BarBundleAreaForm;
