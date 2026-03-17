import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { hbmAPI } from '../../services/api';

// ─── BLOCK CONFIGURATION ───────────────────────────────────────────────────
const blockConfig = {
  'ROUGHING MOTOR': {
    'INTERNAL MOTOR': ['CARBON BRUSH', 'HOLDER', 'STATOR'],
    'CLEANING': ['MOTOR'],
    'CONNECTION': ['STATOR', 'ROTOR', 'JUNCTION BOX'],
  },
  'STAND - C1': {
    'INTERNAL MOTOR': ['CARBON BRUSH', 'HOLDER', 'COMMUTATOR', 'NO. CARBON BUSH', 'CORROSION'],
    'CLEANING': ['MOTOR', 'FILTER PAD', 'BLOWER', 'CARBON CONSUMPTION', 'HOLDER CONSUMPTION'],
    'CONNECTION': ['ARMATURE', 'FIELD', 'BLOWER', 'ENCODER', 'PANEL 24 V DC'],
    'MOUNTING': ['DRIVE SIDE', 'NON DRIVE SIDE', 'FOUNDATION', 'NUT BOLT'],
    'COOLING': ['FRONT COVER', 'BACK COVER', 'DRIVE PANEL'],
  },
  'STAND - C2': null,
  'STAND - C3': null,
  'STAND - C4': null,
  'STAND - C5': null,
  'STAND - C6': null,
  'STAND - C7': null,
  'STAND - C8': null,
  'STAND - C9': null,
  'STAND - C10': null,
  'CCS - 1': {
    'INTERNAL MOTOR': ['CARBON BRUSH', 'HOLDER', 'COMMUTATOR', 'NO. CARBON BUSH', 'CORROSION'],
    'CLEANING': ['MOTOR', 'FILTER PAD', 'BLOWER', 'CARBON CONSUMPTION', 'HOLDER CONSUMPTION'],
    'CONNECTION': ['ARMATURE', 'FIELD', 'BLOWER', 'ENCODER', 'PANEL 24 V DC', 'PROXY'],
    'MOUNTING': ['DRIVE SIDE', 'NON DRIVE SIDE', 'FOUNDATION', 'NUT BOLT'],
    'COOLING': ['FRONT COVER', 'BACK COVER', 'DRIVE PANEL'],
  },
  'CCS - 2': null,
  'PRE PINCH': {
    'INTERNAL MOTOR': ['CARBON BRUSH', 'HOLDER', 'COMMUTATOR', 'NO. CARBON BUSH', 'CORROSION'],
    'CLEANING': ['MOTOR', 'FILTER PAD', 'BLOWER', 'CARBON CONSUMPTION', 'HOLDER CONSUMPTION'],
    'CONNECTION': ['ARMATURE', 'FIELD', 'BLOWER', 'ENCODER', 'PANEL 24 V DC', 'HMD', 'SOLENOID COIL'],
    'MOUNTING': ['DRIVE SIDE', 'NON DRIVE SIDE', 'FOUNDATION', 'NUT BOLT'],
    'COOLING': ['FRONT COVER', 'BACK COVER', 'DRIVE PANEL'],
  },
  'POST PINCH': {
    'INTERNAL MOTOR': ['CARBON BRUSH', 'HOLDER', 'COMMUTATOR', 'NO. CARBON BUSH', 'CORROSION'],
    'CLEANING': ['MOTOR', 'FILTER PAD', 'BLOWER', 'CARBON CONSUMPTION', 'HOLDER CONSUMPTION'],
    'CONNECTION': ['ARMATURE', 'FIELD', 'BLOWER', 'ENCODER', 'PANEL 24 V DC', 'SOLENOID COIL'],
    'MOUNTING': ['DRIVE SIDE', 'NON DRIVE SIDE', 'FOUNDATION', 'NUT BOLT'],
    'COOLING': ['FRONT COVER', 'BACK COVER', 'DRIVE PANEL'],
  },
  'CRANK + FLY SHEAR': null,
  'TB-1 MOTOR': null,
  'TB-2 MOTOR': null,
  'RAKE-1': null,
  'RAKE-2': {
    'INTERNAL MOTOR': ['CARBON BRUSH', 'HOLDER', 'COMMUTATOR', 'NO. CARBON BUSH', 'CORROSION'],
    'CLEANING': ['MOTOR', 'FILTER PAD', 'BLOWER', 'CARBON CONSUMPTION', 'HOLDER CONSUMPTION'],
    'CONNECTION': ['ARMATURE', 'FIELD', 'BLOWER', 'ENCODER', 'PANEL 24 V DC', 'SOLENOID COIL', 'PROXY'],
    'MOUNTING': ['DRIVE SIDE', 'NON DRIVE SIDE', 'FOUNDATION', 'NUT BOLT'],
    'COOLING': ['FRONT COVER', 'BACK COVER', 'DRIVE PANEL'],
  },
};

// Default sections for standard blocks (null blocks inherit this)
const defaultSections = {
  'INTERNAL MOTOR': ['CARBON BRUSH', 'HOLDER', 'COMMUTATOR', 'NO. CARBON BUSH', 'CORROSION'],
  'CLEANING': ['MOTOR', 'FILTER PAD', 'BLOWER', 'CARBON CONSUMPTION', 'HOLDER CONSUMPTION'],
  'CONNECTION': ['ARMATURE', 'FIELD', 'BLOWER', 'ENCODER', 'PANEL 24 V DC'],
  'MOUNTING': ['DRIVE SIDE', 'NON DRIVE SIDE', 'FOUNDATION', 'NUT BOLT'],
  'COOLING': ['FRONT COVER', 'BACK COVER', 'DRIVE PANEL'],
};

const getBlockSections = (block) => blockConfig[block] || defaultSections;

// ─── Single Item Row ───────────────────────────────────────────────────────
const ItemRow = ({ block, section, item, value, onChange }) => {
  const isNotOk = value?.status === 'NOT_OK';
  const key = `${block}__${section}__${item}`;

  return (
    <div className={`border-b border-gray-100 last:border-0 px-4 py-3 ${isNotOk ? 'bg-red-50' : ''}`}>
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <p className="flex-1 text-sm font-medium text-gray-800">{item}</p>
        <div className="flex gap-2 flex-shrink-0">
          <button type="button"
            onClick={() => onChange(key, { status: 'OK', remark: '', action_taken: '' })}
            className={`px-5 py-1.5 rounded-lg text-sm font-bold border-2 transition-all ${
              value?.status === 'OK'
                ? 'bg-green-500 border-green-500 text-white shadow-sm'
                : 'bg-white border-gray-300 text-gray-600 hover:border-green-400 hover:text-green-600'
            }`}>OK</button>
          <button type="button"
            onClick={() => onChange(key, { status: 'NOT_OK', remark: value?.remark || '', action_taken: value?.action_taken || '' })}
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
              onChange={e => onChange(key, { ...value, remark: e.target.value })}
              placeholder="Describe the issue..."
              className="w-full px-3 py-2 border-2 border-red-200 rounded-lg text-sm bg-white focus:outline-none focus:border-red-400" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-orange-700 mb-1">Action Taken <span className="text-red-500">*</span></label>
            <input type="text"
              value={value?.action_taken || ''}
              onChange={e => onChange(key, { ...value, action_taken: e.target.value })}
              placeholder="Action taken to fix..."
              className="w-full px-3 py-2 border-2 border-orange-200 rounded-lg text-sm bg-white focus:outline-none focus:border-orange-400" />
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Main Component ────────────────────────────────────────────────────────
const DcMotorForm = () => {
  const navigate = useNavigate();
  const [header, setHeader] = useState({
    log_date: new Date().toISOString().split('T')[0],
    log_time: new Date().toTimeString().slice(0, 5),
    shift: 'DAY',
    heat_start: '',
    heat_end: '',
    remarks: ''
  });
  const [openBlocks, setOpenBlocks] = useState({});
  const [itemValues, setItemValues] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const toggleBlock = (block) => {
    setOpenBlocks(prev => ({ ...prev, [block]: !prev[block] }));
  };

  const handleItemChange = (key, val) => {
    setItemValues(prev => ({ ...prev, [key]: val }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!header.log_date || !header.log_time || !header.shift) {
      toast.error('Date, time and shift are required');
      return;
    }

    // Collect all filled items
    const items = [];
    for (const [key, val] of Object.entries(itemValues)) {
      if (!val?.status) continue;
      const [block, section, item] = key.split('__');

      if (val.status === 'NOT_OK') {
        if (!val.remark?.trim()) {
          toast.error(`Remark is compulsory for: ${item} (${block} - ${section})`);
          return;
        }
        if (!val.action_taken?.trim()) {
          toast.error(`Action Taken is compulsory for: ${item} (${block} - ${section})`);
          return;
        }
      }

      items.push({
        block_name: block,
        section_name: section,
        item_name: item,
        status: val.status,
        remark: val.remark || '',
        action_taken: val.action_taken || ''
      });
    }

    if (items.length === 0) {
      toast.error('Please fill at least one check item');
      return;
    }

    setSubmitting(true);
    try {
      await hbmAPI.createDcMotorLog({
        log_date: header.log_date,
        log_time: header.log_time,
        shift: header.shift,
        heat_start: header.heat_start || null,
        heat_end: header.heat_end || null,
        remarks: header.remarks || null,
        items
      });
      toast.success('DC Motor checksheet submitted successfully!');
      navigate('/hbm/dashboard');
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  const blockNames = Object.keys(blockConfig);

  // Count filled items per block
  const getBlockCount = (block) => {
    const sections = getBlockSections(block);
    let total = 0, filled = 0, notOk = 0;
    Object.entries(sections).forEach(([section, items]) => {
      items.forEach(item => {
        total++;
        const key = `${block}__${section}__${item}`;
        if (itemValues[key]?.status) { filled++; if (itemValues[key].status === 'NOT_OK') notOk++; }
      });
    });
    return { total, filled, notOk };
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-center space-x-3 mb-6">
          <button onClick={() => navigate('/hbm/dashboard')}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">DC Motor Maintenance</h1>
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
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Heat Over Start Time</label>
                <input type="time" value={header.heat_start}
                  onChange={e => setHeader(p => ({ ...p, heat_start: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Heat Over End Time</label>
                <input type="time" value={header.heat_end}
                  onChange={e => setHeader(p => ({ ...p, heat_end: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Remarks</label>
                <input type="text" value={header.remarks}
                  onChange={e => setHeader(p => ({ ...p, remarks: e.target.value }))}
                  placeholder="General remarks..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent" />
              </div>
            </div>
          </div>

          {/* Motor Blocks */}
          <div className="space-y-3">
            {blockNames.map(block => {
              const sections = getBlockSections(block);
              const isOpen = openBlocks[block];
              const { total, filled, notOk } = getBlockCount(block);

              return (
                <div key={block} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  {/* Block Header */}
                  <button type="button" onClick={() => toggleBlock(block)}
                    className={`w-full flex items-center justify-between px-5 py-4 transition-colors ${
                      isOpen ? 'bg-emerald-600 text-white' : 'bg-gray-50 hover:bg-gray-100 text-gray-900'
                    }`}>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-base">{block}</span>
                      {filled > 0 && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                          notOk > 0
                            ? 'bg-red-100 text-red-700'
                            : isOpen ? 'bg-emerald-700 text-white' : 'bg-green-100 text-green-700'
                        }`}>
                          {filled}/{total} {notOk > 0 ? `· ${notOk} NOT OK` : '· OK'}
                        </span>
                      )}
                    </div>
                    <svg className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Block Sections */}
                  {isOpen && (
                    <div>
                      {Object.entries(sections).map(([section, items]) => (
                        <div key={section}>
                          <div className="px-5 py-2 bg-gray-100 border-b border-gray-200">
                            <h4 className="text-sm font-bold text-gray-700">{section}</h4>
                          </div>
                          {items.map(item => (
                            <ItemRow
                              key={`${block}__${section}__${item}`}
                              block={block} section={section} item={item}
                              value={itemValues[`${block}__${section}__${item}`]}
                              onChange={handleItemChange} />
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
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
              ) : 'Submit DC Motor Checksheet'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default DcMotorForm;
